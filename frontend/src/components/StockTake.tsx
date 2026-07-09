import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueries } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import type { StockTakeResult } from '../types/inventory';

interface PreviewEntry {
  sku: string;
  quantity: number;
  isMix: boolean;
  imageKey: string;
  pcsPerBox?: number | null;
}

interface StockInfo {
  total_cartons: number;
  total_loose_pieces: number;
  total_pieces: number;
}

function normalizeQuotes(s: string): string {
  return s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
}

function fixupJson(s: string): string {
  return s.replace(/(:\s*)(\d+)"(\s*[}\]])/g, '$1$2$3');
}

function parseAndPreview(raw: string): { entries: PreviewEntry[]; error?: string } {
  const stripped = fixupJson(normalizeQuotes(raw)).replace(/^\uFEFF/, '').trim();
  if (!stripped) return { entries: [], error: 'No JSON data' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    return { entries: [], error: `Invalid JSON: ${(e as Error).message}` };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { entries: [], error: 'Expected a JSON object or array' };
  }

  const entries: PreviewEntry[] = [];

  if (Array.isArray(parsed)) {
    const seen = new Map<string, { qty: number; ppc?: number | null }>();
    for (const item of parsed) {
      const rawSku = String(item.sku_code ?? '').trim().replace(/\s+/g, '').toUpperCase();
      if (!rawSku) continue;
      const boxes = safeEval(String(item.boxes ?? 0));
      if (isNaN(boxes) || boxes <= 0) continue;
      const existing = seen.get(rawSku);
      const qty = (existing?.qty ?? 0) + boxes;
      const ppc = existing?.ppc ?? item.pcs_per_box;
      seen.set(rawSku, { qty, ppc });
    }
    for (const [sku, info] of seen) {
      entries.push({ sku, quantity: info.qty, isMix: looksLikeMix(sku), imageKey: 'flat', pcsPerBox: info.ppc });
    }
    return { entries };
  }

  for (const [imageKey, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) {
      for (const [sku, qty] of Object.entries(value as Record<string, unknown>)) {
        const num = typeof qty === 'string' ? safeEval(qty) : Number(qty);
        if (!isNaN(num) && num > 0) {
          entries.push({ sku: sku.trim().toUpperCase(), quantity: num, isMix: looksLikeMix(sku), imageKey });
        }
      }
    }
  }

  return { entries };
}

function safeEval(raw: string): number {
  const cleaned = raw.replace(/[^0-9+\-*/().]/g, '');
  try {
    return Function('"use strict"; return (' + cleaned + ')')();
  } catch {
    return NaN;
  }
}

function looksLikeMix(sku: string): boolean {
  const lower = sku.toLowerCase();
  return lower === 'mix' || lower.includes('mix');
}

interface Warning {
  type: 'duplicate' | 'high_qty' | 'new' | 'existing_tile' | 'existing_stock';
  sku: string;
  message: string;
  quantity?: number;
  stockInfo?: StockInfo;
}

function computeWarnings(
  preview: PreviewEntry[],
  existingMap: Record<string, object> | null,
  stockMap: Record<string, StockInfo>,
): Warning[] {
  const warnings: Warning[] = [];

  const seen = new Map<string, string[]>();
  for (const e of preview) {
    const list = seen.get(e.sku) ?? [];
    list.push(e.imageKey);
    seen.set(e.sku, list);
  }

  for (const [sku, images] of seen) {
    if (images.length > 1) {
      warnings.push({
        type: 'duplicate',
        sku,
        message: `Appears in ${images.length} images: ${images.join(', ')}`,
      });
    }
  }

  for (const e of preview) {
    if (e.quantity > 500) {
      warnings.push({
        type: 'high_qty',
        sku: e.sku,
        message: `Quantity ${e.quantity} is unusually high`,
        quantity: e.quantity,
      });
    }

    const exists = existingMap?.[e.sku] != null;
    const stock = stockMap[e.sku];

    if (exists && stock) {
      warnings.push({
        type: 'existing_stock',
        sku: e.sku,
        message: `Currently has ${stock.total_cartons} cartons, ${stock.total_loose_pieces} loose in stock`,
        stockInfo: stock,
      });
    } else if (exists) {
      warnings.push({
        type: 'existing_tile',
        sku: e.sku,
        message: 'Tile record exists but no stock on hand',
      });
    } else {
      warnings.push({
        type: 'new',
        sku: e.sku,
        message: 'New tile — will be created',
      });
    }
  }

  return warnings;
}

export function StockTake() {
  const [rawJson, setRawJson] = useState('');
  const [result, setResult] = useState<StockTakeResult | null>(null);

  const parseResult = useMemo(
    () => rawJson.trim() ? parseAndPreview(rawJson) : { entries: [] as PreviewEntry[], error: undefined as string | undefined },
    [rawJson],
  );
  const preview = parseResult.entries;
  const parseError = parseResult.error;

  const skus = useMemo(
    () => [...new Set(preview.map(e => e.sku))].sort(),
    [preview],
  );

  const checkQuery = useQuery({
    queryKey: ['stock-take-check', skus],
    queryFn: () => inventoryApi.tiles.checkSkus(skus),
    enabled: skus.length > 0,
    staleTime: 0,
  });

  const existingTileSkus: string[] = useMemo(
    () => checkQuery.data
      ? Object.keys(checkQuery.data.existing).sort()
      : [],
    [checkQuery.data],
  );

  const stockQueries = useQueries({
    queries: existingTileSkus.map(sku => ({
      queryKey: ['stock-take-stock', sku],
      queryFn: async () => {
        const tile = checkQuery.data!.existing[sku];
        const res = await inventoryApi.stock.available(tile.id);
        return { sku, data: res };
      },
      enabled: existingTileSkus.length > 0,
      staleTime: 0,
    })),
  });

  const stockMap = useMemo(() => {
    const map: Record<string, StockInfo> = {};
    for (const q of stockQueries) {
      if (q.data) {
        map[q.data.sku] = {
          total_cartons: q.data.data.total_cartons,
          total_loose_pieces: q.data.data.total_loose_pieces,
          total_pieces: q.data.data.total_pieces,
        };
      }
    }
    return map;
  }, [stockQueries]);

  const warnings = useMemo(
    () => computeWarnings(preview, checkQuery.data?.existing ?? null, stockMap),
    [preview, checkQuery.data, stockMap],
  );

  const isChecking = checkQuery.isFetching || stockQueries.some(q => q.isFetching);
  const hasExistingStock = warnings.some(w => w.type === 'existing_stock');
  const hasWarnings = warnings.length > 0;

  const totalQuantity = useMemo(
    () => preview.reduce((s, e) => s + e.quantity, 0),
    [preview],
  );

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.operations.stockTake({ data }),
    onSuccess: (res: StockTakeResult) => {
      setResult(res);
    },
  });

  const handleImport = useCallback(() => {
    const parsed = JSON.parse(fixupJson(normalizeQuotes(rawJson)).replace(/^\uFEFF/, '').trim());
    mutation.mutate(parsed);
  }, [rawJson, mutation]);

  const uniqueSkus = useMemo(() => [...new Set(preview.map(e => e.sku))], [preview]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Stock Take Import</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste stock take JSON
        </label>
        <textarea
          value={rawJson}
          onChange={(e) => { setRawJson(e.target.value); setResult(null); }}
          className="w-full h-48 border rounded px-3 py-2 font-mono text-sm"
          placeholder='[{"sku_code": "TILE-001", "boxes": 10}, {"sku_code": "TILE-002", "boxes": "36 + 72", "pcs_per_box": 10}]'
        />
        {parseError && (
          <div className="mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
            {parseError}
          </div>
        )}
        {rawJson.trim() && preview.length === 0 && !parseError && (
          <div className="mt-2 bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm">
            No valid items found. Check that each item has a non-empty <code>sku_code</code> and <code>boxes</code> &gt; 0.
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Preview — {preview.length} entries ({uniqueSkus.length} unique SKUs, {totalQuantity} total cartons)
          </h2>

          {hasWarnings && (
            <div className="mb-4 space-y-2">
              {warnings.filter(w => w.type === 'duplicate').map(w => (
                <div key={`dup-${w.sku}`} className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm">
                  ⚠️ {w.sku}: {w.message}
                </div>
              ))}
              {warnings.filter(w => w.type === 'high_qty').map(w => (
                <div key={`high-${w.sku}`} className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm">
                  ⚠️ {w.sku}: {w.message}
                </div>
              ))}
            </div>
          )}

          {isChecking && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm">
              🔍 Checking existing stock records against {uniqueSkus.length} SKUs…
            </div>
          )}

          <div className="overflow-x-auto border rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border">SKU</th>
                  <th className="text-right px-3 py-2 border">Cartons</th>
                  <th className="text-center px-3 py-2 border">Pcs/Box</th>
                  <th className="text-center px-3 py-2 border">Status</th>
                  <th className="text-center px-3 py-2 border">Mix</th>
                  <th className="text-left px-3 py-2 border">Image</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((entry, idx) => {
                  const existInfo = checkQuery.data?.existing?.[entry.sku];
                  const stock = stockMap[entry.sku];
                  const isHigh = entry.quantity > 500;
                  const isDup = preview.filter(e => e.sku === entry.sku).length > 1;

                  let statusBadge: React.ReactNode;
                  if (stock) {
                    statusBadge = (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded" title={`${stock.total_cartons} cartons, ${stock.total_loose_pieces} loose`}>
                        Stock: {stock.total_pieces}pcs
                      </span>
                    );
                  } else if (existInfo) {
                    statusBadge = (
                      <span className="inline-block bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded">
                        Existing tile
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                        New
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={`${entry.sku}-${idx}`}
                      className={`hover:bg-gray-50 ${isHigh ? 'bg-yellow-50' : ''} ${isDup ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-3 py-2 border font-mono">{entry.sku}</td>
                      <td className={`px-3 py-2 border text-right font-mono ${isHigh ? 'text-yellow-700 font-bold' : ''}`}>
                        {entry.quantity}
                      </td>
                      <td className="px-3 py-2 border text-center font-mono text-xs text-gray-600">
                        {entry.pcsPerBox ?? '?'}
                      </td>
                      <td className="px-3 py-2 border text-center">{statusBadge}</td>
                      <td className="px-3 py-2 border text-center">
                        {entry.isMix ? <span className="text-yellow-600 font-bold">MIX</span> : '—'}
                      </td>
                      <td className="px-3 py-2 border text-xs text-gray-500">{entry.imageKey}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasExistingStock && (
            <div className="mt-3 bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm">
              ⚠️ {warnings.filter(w => w.type === 'existing_stock').length} SKU(s) already have stock. Importing will <strong>add</strong> cartons to existing quantity.
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={mutation.isPending || isChecking}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending
              ? 'Importing...'
              : isChecking
                ? 'Checking SKUs…'
                : `Import ${uniqueSkus.length} SKUs`}
          </button>
        </div>
      )}

      {mutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {mutation.error instanceof Error ? mutation.error.message : 'Import failed'}
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>Import complete</strong>
          <ul className="mt-1 list-disc list-inside">
            <li>{result.tiles_created} tiles created</li>
            <li>{result.stock_created} stock entries created</li>
            <li>{result.stock_updated} stock entries updated</li>
            <li>{result.total_entries} total entries processed</li>
          </ul>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <strong>Errors ({result.errors.length}):</strong>
              <ul className="list-disc list-inside text-red-600">
                {result.errors.map((e) => (
                  <li key={e.sku}>{e.sku}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
