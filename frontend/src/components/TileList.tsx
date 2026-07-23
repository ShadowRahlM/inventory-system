import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { useAuthStore } from '../lib/store';
import type { TileProduct, StockLevel } from '../types/inventory';

interface LocationGroup {
  location: string;
  products: Array<{ tile: TileProduct; stock?: StockLevel }>;
  totalItems: number;
}

export function TileList() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [editingTile, setEditingTile] = useState<TileProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteId, setBulkDeleteId] = useState<Set<string> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const editId = searchParams.get('edit');

  useEffect(() => {
    if (editId) {
      inventoryApi.tiles.get(editId).then((tile) => setEditingTile(tile)).catch(() => setEditingTile(null));
    }
  }, [editId]);

  const { data: tiles, isLoading, error } = useQuery({
    queryKey: [...INVENTORY_KEYS.tiles(), 'list', search],
    queryFn: () => inventoryApi.tiles.list(search ? { search, page_size: 5000 } : { page_size: 5000 }),
  });

  const { data: allStock } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'all'],
    queryFn: () => inventoryApi.stock.list({ page_size: 5000 }),
  });

  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const stockByTile = useMemo(() => {
    const map = new Map<string, StockLevel[]>();
    for (const s of allStock?.results ?? []) {
      const existing = map.get(s.tile) ?? [];
      existing.push(s);
      map.set(s.tile, existing);
    }
    return map;
  }, [allStock]);

  const locationGroups = useMemo(() => {
    const tileList = (tiles?.results ?? []) as TileProduct[];
    const matched = tileList.map(tile => ({ tile, stocks: stockByTile.get(tile.id) ?? [] }));

    const groups = new Map<string, LocationGroup>();
    for (const { tile, stocks } of matched) {
      if (stocks.length === 0) {
        const g = groups.get('Unstocked') ?? { location: 'Unstocked', products: [], totalItems: 0 };
        g.products.push({ tile });
        groups.set('Unstocked', g);
      } else {
        for (const s of stocks) {
          const loc = s.location || 'Unknown';
          const g = groups.get(loc) ?? { location: loc, products: [], totalItems: 0 };
          if (!g.products.some(p => p.tile.id === tile.id)) {
            g.products.push({ tile, stock: s });
          }
          g.totalItems += s.total_pieces;
        }
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.location.localeCompare(b.location));
  }, [tiles, stockByTile]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.tiles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.tiles() });
      setDeleteId(null);
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => inventoryApi.tiles.batchDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.tiles() });
      setSelectedIds(new Set());
      setBulkDeleteId(null);
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TileProduct> }) =>
      inventoryApi.tiles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.tiles() });
      setEditingTile(null);
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return locationGroups;
    return locationGroups
      .map(g => ({
        ...g,
        products: g.products.filter(p =>
          p.tile.sku.toLowerCase().includes(search.toLowerCase()) ||
          p.tile.name.toLowerCase().includes(search.toLowerCase()) ||
          p.tile.brand?.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter(g => g.products.length > 0);
  }, [locationGroups, search]);

  const totalTiles = tiles?.count ?? 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by SKU, name, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">{totalTiles} tiles</span>
        {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          Error loading tiles. Please try again.
        </div>
      )}

      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <span className="text-sm text-primary font-medium">
            {selectedIds.size} tile{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => { setBulkDeleteId(selectedIds); setDeleteError(null); }}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-muted-foreground hover:text-foreground ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {!error && (!tiles?.results || tiles.results.length === 0) && !isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No tiles found</p>
          <p className="text-sm mt-1">Create a new tile to get started</p>
        </div>
      ) : !error && filteredGroups.length === 0 && !isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No tiles match your search</p>
        </div>
      ) : !error ? (
        <div className="space-y-8">
          {filteredGroups.map(group => {
            const isCollapsed = collapsedGroups.has(group.location);
            return (
              <div key={group.location}>
                <button
                  onClick={() => toggleGroup(group.location)}
                  className="w-full flex items-center justify-between p-4 bg-[#F7F7F7] dark:bg-muted/30 rounded-xl border hover:shadow-sm transition-shadow mb-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm transition-transform" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    <h2 className="text-lg font-semibold">{group.location}</h2>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {group.products.length} products
                    </span>
                    {group.location !== 'Unstocked' && (
                      <span className="text-xs text-muted-foreground">{group.totalItems} items</span>
                    )}
                  </div>
                  {group.products.some(p => (p.stock?.total_pieces ?? 0) <= 50 && (p.stock?.total_pieces ?? 0) > 0) && (
                    <span className="text-xs text-red-500 font-medium">⚠ Low stock</span>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {group.products.map(({ tile, stock }) => {
                      const onHand = stock?.total_pieces ?? 0;
                      const isLowStock = onHand > 0 && onHand <= 50;
                      return (
                        <div
                          key={tile.id}
                          className={`bg-[#F7F7F7] dark:bg-muted/30 rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${selectedIds.has(tile.id) ? 'ring-2 ring-primary' : ''}`}
                        >
                          {isAdmin && (
                            <div className="absolute p-1">
                              <input type="checkbox" checked={selectedIds.has(tile.id)} onChange={() => toggleSelect(tile.id)} className="cursor-pointer" />
                            </div>
                          )}
                          <div className="w-full h-24 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            {tile.image ? (
                              <img src={tile.image} alt={tile.sku} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              tile.dimensions || 'No image'
                            )}
                          </div>
                          <div className="p-3 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-primary truncate">{tile.sku}</span>
                              <a href={`https://www.google.com/search?q=${encodeURIComponent(tile.sku + ' tile')}`} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary shrink-0" title="Search on Google">🔍</a>
                            </div>
                            <Link to={`/tiles/${tile.id}`} className="text-sm font-medium truncate hover:text-primary transition-colors">{tile.name}</Link>
                            <div className="flex items-center gap-1 flex-wrap">
                              {tile.brand && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tile.brand === 'crown_crane' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : tile.brand === 'goodwill' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                                  {tile.brand === 'crown_crane' ? 'Crown Crane' : tile.brand === 'goodwill' ? 'Goodwill' : tile.brand}
                                </span>
                              )}
                              {tile.tier && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tile.tier === 'premium' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                  {tile.tier === 'premium' ? 'Premium' : 'Standard'}
                                </span>
                              )}
                              {tile.is_mix && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Mix</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className={`text-xs font-semibold ${isLowStock ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {group.location !== 'Unstocked' ? `${onHand} on hand` : 'No stock'}
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingTile(tile)} className="text-xs text-primary hover:underline">Edit</button>
                                {isAdmin && <button onClick={() => { setDeleteId(tile.id); setDeleteError(null); }} className="text-xs text-destructive hover:underline">Delete</button>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="rounded-lg border bg-card p-6 shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Tile</h3>
            <p className="text-muted-foreground mb-4">Are you sure? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 rounded text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteId(null); setDeleteError(null); }} className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setBulkDeleteId(null); setDeleteError(null); }}>
          <div className="rounded-lg border bg-card p-6 shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete {bulkDeleteId.size} Tiles</h3>
            <p className="text-muted-foreground mb-4">Are you sure you want to delete {bulkDeleteId.size} tile{bulkDeleteId.size !== 1 ? 's' : ''}? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 rounded text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setBulkDeleteId(null); setDeleteError(null); }} className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => bulkDeleteMutation.mutate([...bulkDeleteId])} disabled={bulkDeleteMutation.isPending} className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${bulkDeleteId.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTile && (
        <EditTileModal
          tile={editingTile}
          onSave={(data) => updateMutation.mutate({ id: editingTile.id, data })}
          onClose={() => setEditingTile(null)}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditTileModal({
  tile,
  onSave,
  onClose,
  saving,
}: {
  tile: TileProduct;
  onSave: (data: Partial<TileProduct>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    sku: tile.sku,
    name: tile.name,
    brand: tile.brand,
    series: tile.series,
    tier: tile.tier,
    dimensions: tile.dimensions,
    pieces_per_carton: tile.pieces_per_carton,
    category: tile.category,
    tile_type: tile.tile_type || '',
    finish: tile.finish || '',
    thickness: tile.thickness || '',
    coverage_per_box: tile.coverage_per_box || '',
    use_case: tile.use_case || '',
    description: tile.description || '',
    is_mix: tile.is_mix,
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="rounded-lg border bg-card p-6 shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Edit Tile</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value as TileProduct['brand'] })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="goodwill">Goodwill</option>
                  <option value="crown_crane">Crown Crane</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Series</label>
                <input type="text" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tier</label>
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as TileProduct['tier'] })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Dimensions</label>
                <input type="text" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pieces/Carton</label>
                <input type="number" value={form.pieces_per_carton} onChange={(e) => setForm({ ...form, pieces_per_carton: Number(e.target.value) })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_mix"
                checked={form.is_mix}
                onChange={(e) => setForm({ ...form, is_mix: e.target.checked })}
                className="rounded border-input"
              />
              <label htmlFor="is_mix" className="text-sm font-medium">Mixed/Temporary Bin</label>
            </div>
            <fieldset className="border rounded p-3 space-y-2">
              <legend className="text-xs font-semibold px-1">Specifications</legend>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <input type="text" value={form.tile_type} onChange={(e) => setForm({ ...form, tile_type: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Finish</label>
                  <input type="text" value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Thickness</label>
                  <input type="text" value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Coverage/Box</label>
                  <input type="text" value={form.coverage_per_box} onChange={(e) => setForm({ ...form, coverage_per_box: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Use Case</label>
                  <input type="text" value={form.use_case} onChange={(e) => setForm({ ...form, use_case: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </fieldset>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <button type="button" onClick={onClose} className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
