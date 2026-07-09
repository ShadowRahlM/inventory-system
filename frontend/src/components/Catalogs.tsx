import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { useAuthStore } from '../lib/store';
import type { TileCatalog, CatalogProcessResult, TileProduct } from '../types/inventory';

function cleanCatalogJson(raw: string): { cleaned: string; error?: string } {
  const stripped = raw.replace(/^\uFEFF/, '').trim()
  if (!stripped) return { cleaned: '', error: 'No JSON data' }

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return { cleaned: raw, error: 'Invalid JSON' }
  }

  if (Array.isArray(parsed)) {
    return { cleaned: JSON.stringify(parsed, null, 2) }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    const mappings = obj.image_to_sku_mappings
    if (Array.isArray(mappings)) {
      const items: Record<string, unknown>[] = []
      for (const mapping of mappings) {
        for (const entry of (mapping as any).items ?? []) {
          items.push({
            sku: entry.sku_code ?? '',
            name: entry.name ?? entry.sku_code ?? '',
            dimensions: entry.size ?? entry.dimensions ?? '30x30cm',
            category: entry.category ?? 'Wall',
            pieces_per_carton: entry.pieces_per_carton ?? 10,
            brand: entry.brand ?? 'other',
            series: entry.series ?? '',
            tier: entry.tier ?? 'standard',
            tile_type: entry.tile_type ?? '',
            finish: entry.finish ?? '',
            thickness: entry.thickness ?? '',
            coverage_per_box: entry.coverage_per_box ?? '',
            use_case: entry.use_case ?? '',
            description: entry.description ?? '',
          })
        }
      }
      return { cleaned: JSON.stringify(items, null, 2) }
    }
    return { cleaned: raw, error: 'Unrecognised JSON format — expected a flat array or {"image_to_sku_mappings": [...]}' }
  }

  return { cleaned: raw, error: 'Expected a JSON array of tile objects' }
}

export function Catalogs() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [processResult, setProcessResult] = useState<Record<string, CatalogProcessResult>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [existingSkus, setExistingSkus] = useState<Record<string, TileProduct>>({});
  const [dedupPending, setDedupPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.all, 'catalogs', { page_size: 5000 }],
    queryFn: () => inventoryApi.catalogs.list({ page_size: 5000 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; json_data: Record<string, unknown> }) =>
      inventoryApi.catalogs.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'catalogs'] });
      setName('');
      setDescription('');
      setJsonInput('');
      setJsonError(null);
    },
    onError: (err: Error) => setJsonError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.catalogs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'catalogs'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => inventoryApi.catalogs.batchDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'catalogs'] });
      setSelectedIds(new Set());
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.catalogs.process(id),
    onSuccess: (result, id) => {
      setProcessResult((prev) => ({ ...prev, [id]: result }));
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.tiles() });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    const raw = jsonInput.replace(/^\uFEFF/, '').trim();
    if (!raw) {
      setJsonError('JSON data is empty');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setJsonError('Invalid JSON');
      return;
    }
    if (!name.trim()) {
      setJsonError('Name is required');
      return;
    }
    createMutation.mutate({ name: name.trim(), description, json_data: parsed as Record<string, unknown> });
  };

  useEffect(() => {
    if (!jsonInput.trim()) { setJsonError(null); setExistingSkus({}); setDedupPending(false); return; }
    setDedupPending(true);
    const timer = setTimeout(async () => {
      const { cleaned, error } = cleanCatalogJson(jsonInput);
      setJsonError(error ?? null);
      if (error) { setDedupPending(false); return; }
      let parsed: unknown;
      try { parsed = JSON.parse(cleaned); } catch { setDedupPending(false); return; }
      if (!Array.isArray(parsed) || parsed.length === 0) { setDedupPending(false); return; }
      const skus = parsed.map((i: any) => i.sku).filter(Boolean) as string[];
      if (skus.length === 0) { setDedupPending(false); return; }
      try {
        const result = await inventoryApi.tiles.checkSkus(skus);
        setExistingSkus(result.existing);
      } catch { return; }
      finally { setDedupPending(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [jsonInput]);

  const handleCleanJson = async () => {
    const { cleaned, error } = cleanCatalogJson(jsonInput);
    if (error && !cleaned) {
      setJsonError(error);
      return;
    }
    setJsonError(error ?? null);
    setJsonInput(cleaned);
    setExistingSkus({});

    let parsed: unknown;
    try { parsed = JSON.parse(cleaned); } catch { return; }
    if (!Array.isArray(parsed)) return;

    const skus = parsed.map((i: any) => i.sku).filter(Boolean) as string[];
    if (skus.length === 0) return;

    setDedupPending(true);
    try {
      const result = await inventoryApi.tiles.checkSkus(skus);
      setExistingSkus(result.existing);
    } catch {
      // non-blocking — user can still save
    } finally {
      setDedupPending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonError(null);
    setExistingSkus({});
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== 'string') return;
      const { cleaned, error } = cleanCatalogJson(text);
      setJsonError(error ?? null);
      setJsonInput(cleaned);
    };
    reader.onerror = () => setJsonError('Failed to read file');
    reader.readAsText(file);
  };

  const allIds = useMemo(() => data?.results?.map((c) => c.id) ?? [], [data]);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  const existingSkusCount = Object.keys(existingSkus).length;
  const newSkusCount = useMemo(() => {
    if (existingSkusCount === 0) return 0;
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) return 0;
      return parsed.filter((i: any) => i.sku && !existingSkus[i.sku]).length;
    } catch {
      return 0;
    }
  }, [jsonInput, existingSkus, existingSkusCount]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [allSelected, allIds]);

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setDeleteError(null);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate([...selectedIds]);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Tile Catalogs</h1>

      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm text-blue-800 font-medium">
            {selectedIds.size} catalog{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => { setDeleteError(null); handleBulkDelete(); }}
            disabled={bulkDeleteMutation.isPending}
            className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-800 ml-auto">
            Clear selection
          </button>
          {deleteError && (
            <span className="text-sm text-red-600 ml-2">{deleteError}</span>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center mb-4">
          {data?.results && data.results.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>Select all {data.results.length} catalogs</span>
            </label>
          )}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow border mb-8 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">New Catalog (JSON)</h2>

        {(jsonError || createMutation.isError) && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {jsonError ?? (createMutation.error instanceof Error ? createMutation.error.message : 'Failed')}
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-1 font-medium">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Catalog name" />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">
            JSON Data
            <span className="text-xs text-gray-400 font-normal ml-2">Upload a .json file or paste directly</span>
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFileUpload} className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {jsonInput.trim() && (
              <>
                <button type="button" onClick={handleCleanJson} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2.5 py-1.5 rounded font-medium">Clean JSON</button>
                <button type="button" onClick={() => { setJsonInput(''); if (fileRef.current) fileRef.current.value = ''; setJsonError(null); }} className="text-xs text-red-500 hover:text-red-700">Clear</button>
              </>
            )}
          </div>
          <textarea ref={textareaRef} value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setJsonError(null); }} className="w-full border rounded px-3 py-2 font-mono text-sm" rows={10} placeholder='[{"sku": "TILE-001", "name": "Sample Tile", "dimensions": "30x30cm", "pieces_per_carton": 10, "category": "Wall", "brand": "goodwill"}]' />
        </div>

        {existingSkusCount > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-yellow-800 mb-1">
              <span>⚠️</span>
              <span>{existingSkusCount} tile{existingSkusCount !== 1 ? 's' : ''} already exist{existingSkusCount !== 1 ? '' : 's'} in the database</span>
            </div>
            <details className="text-xs text-yellow-700">
              <summary className="cursor-pointer">Show details</summary>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {Object.entries(existingSkus).map(([sku, tile]) => (
                  <li key={sku}><strong>{sku}</strong> — {tile.name}</li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {newSkusCount > 0 && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
            <span className="font-medium text-green-800">{newSkusCount} new tile{newSkusCount !== 1 ? 's' : ''} ready to import</span>
          </div>
        )}

        {dedupPending && (
          <div className="mb-4 text-sm text-gray-500 italic">Checking for duplicates...</div>
        )}

        <button type="submit" disabled={!jsonInput.trim() || createMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {createMutation.isPending ? 'Saving...' : 'Save Catalog'}
        </button>
      </form>

      {isLoading ? (
        <div>Loading catalogs...</div>
      ) : (
        <div className="grid gap-4">
          {data?.results?.map((catalog: TileCatalog) => {
            const procResult = processResult[catalog.id];
            const isSelected = selectedIds.has(catalog.id);
            return (
              <div key={catalog.id} className={`bg-white p-4 rounded-lg shadow border ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isAdmin && <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(catalog.id)} className="cursor-pointer" />}
                    <div>
                      <h3 className="font-semibold">{catalog.name}</h3>
                      {catalog.description && <p className="text-gray-600 text-sm">{catalog.description}</p>}
                      <p className="text-gray-500 text-xs mt-1">
                        Uploaded {new Date(catalog.uploaded_at).toLocaleDateString()}
                        {catalog.uploaded_by_username ? ` by ${catalog.uploaded_by_username}` : ''}
                        {catalog.processed && <span className="ml-2 text-green-600 font-medium">Processed</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && <button onClick={() => handleDelete(catalog.id)} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm">Delete</button>}
                    {!catalog.processed && isAdmin && (
                      <button
                        onClick={() => processMutation.mutate(catalog.id)}
                        disabled={processMutation.isPending && processMutation.variables === catalog.id}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm disabled:opacity-50"
                      >
                        {processMutation.isPending && processMutation.variables === catalog.id ? 'Processing...' : 'Process'}
                      </button>
                    )}
                  </div>
                </div>

                {procResult && (
                  <div className={`mt-3 text-sm rounded px-3 py-2 ${
                    procResult.created > 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}>
                    Created {procResult.created} tile{procResult.created !== 1 ? 's' : ''}
                    {procResult.skipped > 0 && <> · {procResult.skipped} skipped</>}
                    {procResult.errors.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-red-600 cursor-pointer">
                          {procResult.errors.length} error{procResult.errors.length !== 1 ? 's' : ''}
                        </summary>
                        <ul className="list-disc pl-4 mt-1 text-xs text-red-600">
                          {procResult.errors.map((e, i) => (
                            <li key={i}>Item {e.index}: {e.error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {processMutation.isError && processMutation.variables === catalog.id && (
                  <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">
                    {processMutation.error?.message ?? 'Processing failed'}
                  </div>
                )}
              </div>
            );
          })}
          {data?.results?.length === 0 && <p className="text-gray-500">No catalogs yet.</p>}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
          <div className="bg-white rounded-lg p-6 shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Catalog</h3>
            <p className="text-gray-600 mb-4">Are you sure? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget)} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
