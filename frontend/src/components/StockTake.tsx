import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueries } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { useTilesList } from '../hooks/useInventoryQueries';
import { SearchableSelect } from './SearchableSelect';
import { PageHeader } from './ui/PageHeader';
import type { StockTakeResult } from '../types/inventory';

type Tab = 'Manual Entry' | 'JSON Import';

interface ManualEntry {
  tileId: string;
  sku: string;
  name: string;
  cartons: number;
  loosePieces: number;
  currentCartons: number;
  currentLoose: number;
}

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

function computeWarnings(
  preview: PreviewEntry[],
  existingMap: Record<string, object> | null,
  stockMap: Record<string, StockInfo>,
): Array<{ type: string; sku: string; message: string }> {
  const warnings: Array<{ type: string; sku: string; message: string }> = [];
  const seen = new Map<string, string[]>();
  for (const e of preview) {
    const list = seen.get(e.sku) ?? [];
    list.push(e.imageKey);
    seen.set(e.sku, list);
  }
  for (const [sku, images] of seen) {
    if (images.length > 1) {
      warnings.push({ type: 'duplicate', sku, message: `Appears in ${images.length} images: ${images.join(', ')}` });
    }
  }
  for (const e of preview) {
    if (e.quantity > 500) {
      warnings.push({ type: 'high_qty', sku: e.sku, message: `Quantity ${e.quantity} is unusually high` });
    }
    const exists = existingMap?.[e.sku] != null;
    const stock = stockMap[e.sku];
    if (exists && stock) {
      warnings.push({ type: 'existing_stock', sku: e.sku, message: `Currently has ${stock.total_cartons} cartons, ${stock.total_loose_pieces} loose in stock` });
    } else if (exists) {
      warnings.push({ type: 'existing_tile', sku: e.sku, message: 'Tile record exists but no stock on hand' });
    } else {
      warnings.push({ type: 'new', sku: e.sku, message: 'New tile — will be created' });
    }
  }
  return warnings;
}

function ManualEntryMode({ onStart }: { onStart: () => void }) {
  const { data: tiles } = useTilesList();
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [selectedTileId, setSelectedTileId] = useState('');
  const [cartons, setCartons] = useState('');
  const [loosePieces, setLoosePieces] = useState('');

  const tileOptions = (tiles?.results ?? []).map((t: any) => ({
    value: t.id,
    label: `${t.sku} — ${t.name} (${t.category})`,
  }));

  const selectedTile = (tiles?.results ?? []).find((t: any) => t.id === selectedTileId);
  const alreadyAdded = entries.some(e => e.tileId === selectedTileId);

  const { data: stockInfo } = useQuery({
    queryKey: ['manual-stock-info', selectedTileId],
    queryFn: () => inventoryApi.stock.available(selectedTileId),
    enabled: !!selectedTileId,
  });

  const handleAdd = () => {
    if (!selectedTile || !cartons || parseInt(cartons) <= 0) return;
    setEntries(prev => [...prev, {
      tileId: selectedTile.id,
      sku: selectedTile.sku,
      name: selectedTile.name,
      cartons: parseInt(cartons),
      loosePieces: parseInt(loosePieces || '0'),
      currentCartons: stockInfo?.total_cartons ?? 0,
      currentLoose: stockInfo?.total_loose_pieces ?? 0,
    }]);
    setSelectedTileId('');
    setCartons('');
    setLoosePieces('');
  };

  const handleRemove = (idx: number) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    setEntries([]);
  };

  const mutation = useMutation({
    mutationFn: (data: unknown) => inventoryApi.operations.stockTake({ data }),
    onSuccess: () => {
      setEntries([]);
      onStart();
    },
  });

  const handleSubmit = () => {
    const data = entries.map(e => ({
      sku_code: e.sku,
      boxes: e.cartons,
      pcs_per_box: (tiles?.results ?? []).find((t: any) => t.id === e.tileId)?.pieces_per_carton ?? 10,
    }));
    mutation.mutate(data);
  };

  const totalCartons = entries.reduce((s, e) => s + e.cartons, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Add Item</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <SearchableSelect
              label="Tile"
              options={tileOptions}
              value={selectedTileId}
              onChange={setSelectedTileId}
              placeholder="Search tile by SKU or name..."
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Cartons</label>
            <input
              type="number" min="1" value={cartons}
              onChange={e => setCartons(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Loose Pieces</label>
            <input
              type="number" min="0" value={loosePieces}
              onChange={e => setLoosePieces(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </div>
          <div>
            <button
              onClick={handleAdd}
              disabled={!selectedTile || !cartons || parseInt(cartons) <= 0 || alreadyAdded}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>

        {selectedTile && stockInfo && (
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            <span>Pcs/carton: <strong>{selectedTile.pieces_per_carton}</strong></span>
            <span>Current stock: <strong>{stockInfo.total_cartons} ctns / {stockInfo.total_loose_pieces} loose</strong></span>
            <span>{selectedTile.category} — {selectedTile.dimensions}</span>
          </div>
        )}
        {alreadyAdded && (
          <p className="mt-2 text-sm text-amber-600">This tile is already in the list.</p>
        )}
      </div>

      {entries.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30">
            <h3 className="font-semibold text-sm">Items to Import ({entries.length})</h3>
            <button onClick={handleClear} className="text-sm text-muted-foreground hover:text-destructive transition-colors">Clear All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Loose</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Current Stock</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm">{e.sku}</td>
                    <td className="py-3 px-4 text-sm">{e.name}</td>
                    <td className="py-3 px-4 text-right font-medium text-sm">{e.cartons}</td>
                    <td className="py-3 px-4 text-right text-sm">{e.loosePieces}</td>
                    <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                      {e.currentCartons} ctns / {e.currentLoose} loose
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleRemove(i)} className="text-destructive hover:text-destructive/80 text-sm transition-colors">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total: <strong>{totalCartons}</strong> cartons</span>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Importing...' : `Submit Stock Take (${entries.length} items)`}
            </button>
          </div>
        </div>
      )}

      {mutation.isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {mutation.error instanceof Error ? mutation.error.message : 'Import failed'}
        </div>
      )}
    </div>
  );
}

function JSONImportMode() {
  const [rawJson, setRawJson] = useState('');
  const [result, setResult] = useState<StockTakeResult | null>(null);

  const parseResult = useMemo(
    () => rawJson.trim() ? parseAndPreview(rawJson) : { entries: [] as PreviewEntry[], error: undefined as string | undefined },
    [rawJson],
  );
  const preview = parseResult.entries;
  const parseError = parseResult.error;

  const skus = useMemo(() => [...new Set(preview.map(e => e.sku))].sort(), [preview]);

  const checkQuery = useQuery({
    queryKey: ['stock-take-check', skus],
    queryFn: () => inventoryApi.tiles.checkSkus(skus),
    enabled: skus.length > 0,
    staleTime: 0,
  });

  const existingTileSkus: string[] = useMemo(
    () => checkQuery.data ? Object.keys(checkQuery.data.existing).sort() : [],
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
  const totalQuantity = useMemo(() => preview.reduce((s, e) => s + e.quantity, 0), [preview]);

  const mutation = useMutation({
    mutationFn: (data: unknown) => inventoryApi.operations.stockTake({ data }),
    onSuccess: (res: StockTakeResult) => setResult(res),
  });

  const handleImport = useCallback(() => {
    const parsed = JSON.parse(fixupJson(normalizeQuotes(rawJson)).replace(/^\uFEFF/, '').trim());
    mutation.mutate(parsed);
  }, [rawJson, mutation]);

  const uniqueSkus = useMemo(() => [...new Set(preview.map(e => e.sku))], [preview]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <label className="block text-sm font-medium mb-2">Paste stock take JSON</label>
        <textarea
          value={rawJson}
          onChange={e => { setRawJson(e.target.value); setResult(null); }}
          className="w-full h-48 rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder='[{"sku_code": "TILE-001", "boxes": 10}, {"sku_code": "TILE-002", "boxes": "36 + 72", "pcs_per_box": 10}]'
        />
        {parseError && (
          <div className="mt-2 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-2 rounded-lg text-sm">{parseError}</div>
        )}
        {rawJson.trim() && preview.length === 0 && !parseError && (
          <div className="mt-2 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-sm">
            No valid items found. Check each item has <code>sku_code</code> and <code>boxes</code> &gt; 0.
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Preview — {preview.length} entries ({uniqueSkus.length} unique SKUs, {totalQuantity} total cartons)</h3>
          </div>

          {warnings.length > 0 && (
            <div className="p-4 space-y-2 border-b">
              {warnings.map((w, i) => (
                <div key={i} className={`px-4 py-2 rounded-lg text-sm ${
                  w.type === 'duplicate' || w.type === 'high_qty'
                    ? 'bg-amber-50 border border-amber-300 text-amber-800'
                    : w.type === 'new'
                      ? 'bg-green-50 border border-green-300 text-green-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  {w.sku}: {w.message}
                </div>
              ))}
            </div>
          )}

          {isChecking && (
            <div className="px-4 py-2 bg-blue-50 border-b text-blue-700 text-sm">Checking existing stock records…</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                  <th className="text-left px-3 py-2 border text-sm font-semibold">SKU</th>
                  <th className="text-right px-3 py-2 border text-sm font-semibold">Cartons</th>
                  <th className="text-center px-3 py-2 border text-sm font-semibold">Pcs/Box</th>
                  <th className="text-center px-3 py-2 border text-sm font-semibold">Status</th>
                  <th className="text-center px-3 py-2 border text-sm font-semibold">Mix</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((entry, idx) => {
                  const existInfo = checkQuery.data?.existing?.[entry.sku];
                  const stock = stockMap[entry.sku];

                  let statusBadge: React.ReactNode;
                  if (stock) {
                    statusBadge = (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded" title={`${stock.total_cartons} cartons, ${stock.total_loose_pieces} loose`}>
                        Stock: {stock.total_pieces}pcs
                      </span>
                    );
                  } else if (existInfo) {
                    statusBadge = (
                      <span className="inline-block bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded">Existing tile</span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">New</span>
                    );
                  }

                  return (
                    <tr key={`${entry.sku}-${idx}`} className={`hover:bg-muted/50 ${entry.quantity > 500 ? 'bg-amber-50' : ''}`}>
                      <td className="px-3 py-2 border font-mono text-sm">{entry.sku}</td>
                      <td className="px-3 py-2 border text-right font-mono text-sm">{entry.quantity}</td>
                      <td className="px-3 py-2 border text-center font-mono text-xs text-muted-foreground">
                        {entry.pcsPerBox ?? existInfo?.pieces_per_carton ?? '?'}
                      </td>
                      <td className="px-3 py-2 border text-center">{statusBadge}</td>
                      <td className="px-3 py-2 border text-center">
                        {entry.isMix ? <span className="text-amber-600 font-bold text-xs">MIX</span> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {warnings.filter(w => w.type === 'existing_stock').length} SKU(s) have existing stock — import will <strong>add</strong> cartons
            </span>
            <button
              onClick={handleImport}
              disabled={mutation.isPending || isChecking}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Importing...' : isChecking ? 'Checking SKUs…' : `Import ${uniqueSkus.length} SKUs`}
            </button>
          </div>
        </div>
      )}

      {mutation.isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {mutation.error instanceof Error ? mutation.error.message : 'Import failed'}
        </div>
      )}

      {result && (
        <div className="rounded-xl border bg-green-50 p-5 shadow-sm">
          <h3 className="font-semibold text-sm text-green-800 mb-2">Import Complete</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 border text-center">
              <p className="text-2xl font-bold text-green-700">{result.tiles_created}</p>
              <p className="text-xs text-muted-foreground">Tiles Created</p>
            </div>
            <div className="bg-white rounded-lg p-3 border text-center">
              <p className="text-2xl font-bold text-green-700">{result.stock_created}</p>
              <p className="text-xs text-muted-foreground">Stock Entries Created</p>
            </div>
            <div className="bg-white rounded-lg p-3 border text-center">
              <p className="text-2xl font-bold text-green-700">{result.stock_updated}</p>
              <p className="text-xs text-muted-foreground">Stock Entries Updated</p>
            </div>
            <div className="bg-white rounded-lg p-3 border text-center">
              <p className="text-2xl font-bold text-green-700">{result.total_entries}</p>
              <p className="text-xs text-muted-foreground">Total Processed</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-700 mb-1">Errors ({result.errors.length}):</p>
              <ul className="list-disc list-inside text-sm text-red-600">
                {result.errors.map(e => <li key={e.sku}>{e.sku}: {e.error}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StockTake() {
  const [activeTab, setActiveTab] = useState<Tab>('Manual Entry');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: stockSummary } = useQuery({
    queryKey: ['stock-summary-mini'],
    queryFn: () => inventoryApi.reports.stockSummary(),
  });

  const tabs: Tab[] = ['Manual Entry', 'JSON Import'];

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="p-6 space-y-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <PageHeader title="Inventory Plans" description="Create and manage stock take plans to reconcile inventory" />

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Plans</p>
          <p className="text-2xl font-bold mt-1">—</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Tiles</p>
          <p className="text-2xl font-bold mt-1">{stockSummary?.total_tiles ?? '—'}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Stock</p>
          <p className="text-2xl font-bold mt-1">{stockSummary?.total_pieces ?? '—'}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Low Stock</p>
          <p className="text-2xl font-bold mt-1 text-red-500">{stockSummary?.low_stock_count ?? '—'}</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center gap-4">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'Manual Entry' && <ManualEntryMode onStart={() => handleSuccess('Stock take imported successfully!')} />}
          {activeTab === 'JSON Import' && <JSONImportMode />}
        </div>
      </div>
    </div>
  );
}
