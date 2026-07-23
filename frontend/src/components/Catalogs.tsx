import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { useAuthStore } from '../lib/store';
import { PageHeader } from './ui/PageHeader';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import type { TileCatalog, CatalogProcessResult, TileProduct } from '../types/inventory';

function normalizeQuotes(s: string): string {
  return s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
}

function fixupJson(s: string): string {
  return s.replace(/(:\s*)(\d+)"(\s*[}\]])/g, '$1$2$3');
}

function cleanCatalogJson(raw: string): { cleaned: string; error?: string } {
  const stripped = fixupJson(normalizeQuotes(raw)).replace(/^\uFEFF/, '').trim()
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
    const raw = fixupJson(normalizeQuotes(jsonInput)).replace(/^\uFEFF/, '').trim();
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
      const parsed = JSON.parse(fixupJson(normalizeQuotes(jsonInput)));
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
      <PageHeader
        title="Tile Catalogs"
        description="Import and manage tile product catalogs"
      />

      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm text-blue-800 font-medium">
            {selectedIds.size} catalog{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => { setDeleteError(null); handleBulkDelete(); }}
            disabled={bulkDeleteMutation.isPending}
            className="bg-destructive text-destructive-foreground px-4 py-1.5 rounded-md text-sm hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ml-auto">
            Clear selection
          </button>
          {deleteError && (
            <span className="text-sm text-destructive ml-2">{deleteError}</span>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center mb-4">
          {data?.results && data.results.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>Select all {data.results.length} catalogs</span>
            </label>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="rounded-xl border bg-card p-6 shadow-sm mb-8 max-w-2xl">
          <form onSubmit={handleCreate}>
            <h2 className="text-lg font-semibold mb-4">New Catalog (JSON)</h2>

            {(jsonError || createMutation.isError) && (
              <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">
                {jsonError ?? (createMutation.error instanceof Error ? createMutation.error.message : 'Failed')}
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Catalog name" />
            </div>

            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
            </div>

            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">
                JSON Data
                <span className="text-xs text-muted-foreground font-normal ml-2">Upload a .json file or paste directly</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFileUpload} className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                {jsonInput.trim() && (
                  <>
                    <button type="button" onClick={handleCleanJson} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-2.5 py-1.5 rounded-md font-medium">Clean JSON</button>
                    <button type="button" onClick={() => { setJsonInput(''); if (fileRef.current) fileRef.current.value = ''; setJsonError(null); }} className="text-xs text-destructive hover:text-destructive/80 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Clear</button>
                  </>
                )}
              </div>
              <textarea ref={textareaRef} value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setJsonError(null); }} className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={10} placeholder='[{"sku": "TILE-001", "name": "Sample Tile", "dimensions": "30x30cm", "pieces_per_carton": 10, "category": "Wall", "brand": "goodwill"}]' />
            </div>

            {existingSkusCount > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-800 mb-1">
                  <span>{existingSkusCount} tile{existingSkusCount !== 1 ? 's' : ''} already exist{existingSkusCount !== 1 ? '' : 's'} in the database</span>
                </div>
                <details className="text-xs text-amber-700">
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
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
                <span className="font-medium text-green-800">{newSkusCount} new tile{newSkusCount !== 1 ? 's' : ''} ready to import</span>
              </div>
            )}

            {dedupPending && (
              <div className="mb-4 text-sm text-muted-foreground italic">Checking for duplicates...</div>
            )}

            <button type="submit" disabled={!jsonInput.trim() || createMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {createMutation.isPending ? 'Saving...' : 'Save Catalog'}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">Loading catalogs...</div>
      ) : (
        <div className="grid gap-4">
          {data?.results?.map((catalog: TileCatalog) => {
            const procResult = processResult[catalog.id];
            const isSelected = selectedIds.has(catalog.id);
            return (
              <div key={catalog.id} className={`rounded-xl border bg-card p-5 shadow-sm ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isAdmin && <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(catalog.id)} className="cursor-pointer" />}
                    <div>
                      <h3 className="font-semibold">{catalog.name}</h3>
                      {catalog.description && <p className="text-muted-foreground text-sm">{catalog.description}</p>}
                      <p className="text-muted-foreground text-xs mt-1">
                        Uploaded {new Date(catalog.uploaded_at).toLocaleDateString()}
                        {catalog.uploaded_by_username ? ` by ${catalog.uploaded_by_username}` : ''}
                        {catalog.processed && <Badge variant="success" className="ml-2">Processed</Badge>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && <button onClick={() => handleDelete(catalog.id)} className="rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Delete</button>}
                    {!catalog.processed && isAdmin && (
                      <button
                        onClick={() => processMutation.mutate(catalog.id)}
                        disabled={processMutation.isPending && processMutation.variables === catalog.id}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processMutation.isPending && processMutation.variables === catalog.id ? 'Processing...' : 'Process'}
                      </button>
                    )}
                  </div>
                </div>

                {procResult && (
                  <div className={`mt-3 text-sm rounded-md px-3 py-2 ${
                    procResult.created > 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    Created {procResult.created} tile{procResult.created !== 1 ? 's' : ''}
                    {procResult.skipped > 0 && <> &middot; {procResult.skipped} skipped</>}
                    {procResult.errors.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-destructive cursor-pointer">
                          {procResult.errors.length} error{procResult.errors.length !== 1 ? 's' : ''}
                        </summary>
                        <ul className="list-disc pl-4 mt-1 text-xs text-destructive">
                          {procResult.errors.map((e, i) => (
                            <li key={i}>Item {e.index}: {e.error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {processMutation.isError && processMutation.variables === catalog.id && (
                  <div className="mt-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-md px-3 py-2 text-sm">
                    {processMutation.error?.message ?? 'Processing failed'}
                  </div>
                )}
              </div>
            );
          })}
          {data?.results?.length === 0 && <EmptyState title="No catalogs" description="Import your first tile catalog using the form above." />}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
          <div className="rounded-xl border bg-card p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Catalog</h3>
            <p className="text-muted-foreground mb-4">Are you sure? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 rounded-md text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} className="px-4 py-2 border rounded-md hover:bg-muted active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget)} disabled={deleteMutation.isPending} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
