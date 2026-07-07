import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { useAuthStore } from '../lib/store';
import type { TileProduct } from '../types/inventory';

export function TileList() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const [editingTile, setEditingTile] = useState<TileProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteId, setBulkDeleteId] = useState<Set<string> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editId = searchParams.get('edit');

  useEffect(() => {
    if (editId) {
      inventoryApi.tiles.get(editId).then((tile) => setEditingTile(tile));
    }
  }, [editId]);

  const { data: tiles, isLoading, error } = useQuery({
    queryKey: INVENTORY_KEYS.tiles(),
    queryFn: () => inventoryApi.tiles.list(),
  });

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

  const allIds = useMemo(() => tiles?.results?.map((t) => t.id) ?? [], [tiles]);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

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

  if (isLoading) return <div>Loading tiles...</div>;
  if (error) return <div>Error loading tiles</div>;

  return (
    <div>
      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm text-blue-800 font-medium">
            {selectedIds.size} tile{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => { setBulkDeleteId(selectedIds); setDeleteError(null); }}
            className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700"
          >
            Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-800 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {isAdmin && (
                <th className="px-4 py-2 border-b w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
                </th>
              )}
              <th className="px-4 py-2 border-b">Image</th>
              <th className="px-4 py-2 border-b">SKU</th>
              <th className="px-4 py-2 border-b">Name</th>
              <th className="px-4 py-2 border-b">Brand</th>
              <th className="px-4 py-2 border-b">Series</th>
              <th className="px-4 py-2 border-b">Tier</th>
              <th className="px-4 py-2 border-b">Dimensions</th>
              <th className="px-4 py-2 border-b">Pcs/Ctn</th>
              <th className="px-4 py-2 border-b">Category</th>
              <th className="px-4 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiles?.results?.map((tile: TileProduct) => (
              <tr key={tile.id} className={`hover:bg-gray-50 ${selectedIds.has(tile.id) ? 'bg-blue-50' : ''}`}>
                {isAdmin && (
                  <td className="px-4 py-2 border-b">
                    <input type="checkbox" checked={selectedIds.has(tile.id)} onChange={() => toggleSelect(tile.id)} className="cursor-pointer" />
                  </td>
                )}
                <td className="px-4 py-2 border-b">
                  {tile.image ? (
                    <img src={tile.image} alt={tile.sku} className="w-12 h-12 object-cover rounded" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">—</div>
                  )}
                </td>
                <td className="px-4 py-2 border-b">
                  <div className="flex items-center gap-1">
                    {tile.sku}
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(tile.sku + ' tile')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 text-xs" title="Search on Google">🔍</a>
                  </div>
                </td>
                <td className="px-4 py-2 border-b">{tile.name}</td>
                <td className="px-4 py-2 border-b text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tile.brand === 'crown_crane' ? 'bg-yellow-100 text-yellow-800' : tile.brand === 'goodwill' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {tile.brand === 'crown_crane' ? 'Crown Crane' : tile.brand === 'goodwill' ? 'Goodwill' : tile.brand}
                  </span>
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">{tile.series || '—'}</td>
                <td className="px-4 py-2 border-b">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tile.tier === 'premium' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {tile.tier === 'premium' ? 'Premium' : 'Standard'}
                  </span>
                </td>
                <td className="px-4 py-2 border-b">{tile.dimensions}</td>
                <td className="px-4 py-2 border-b">{tile.pieces_per_carton}</td>
                <td className="px-4 py-2 border-b">{tile.category}</td>
                <td className="px-4 py-2 border-b">
                  <button onClick={() => setEditingTile(tile)} className="text-blue-600 hover:text-blue-800 mr-2 text-sm">Edit</button>
                  {isAdmin && <button onClick={() => { setDeleteId(tile.id); setDeleteError(null); }} className="text-red-600 hover:text-red-800 text-sm">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-lg p-6 shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Tile</h3>
            <p className="text-gray-600 mb-4">Are you sure? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteId(null); setDeleteError(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setBulkDeleteId(null); setDeleteError(null); }}>
          <div className="bg-white rounded-lg p-6 shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete {bulkDeleteId.size} Tiles</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to delete {bulkDeleteId.size} tile{bulkDeleteId.size !== 1 ? 's' : ''}? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setBulkDeleteId(null); setDeleteError(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={() => bulkDeleteMutation.mutate([...bulkDeleteId])} disabled={bulkDeleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
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
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Edit Tile</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value as TileProduct['brand'] })} className="w-full border rounded px-3 py-2 text-sm">
                  <option value="goodwill">Goodwill</option>
                  <option value="crown_crane">Crown Crane</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Series</label>
                <input type="text" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tier</label>
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as TileProduct['tier'] })} className="w-full border rounded px-3 py-2 text-sm">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Dimensions</label>
                <input type="text" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pieces/Carton</label>
                <input type="number" value={form.pieces_per_carton} onChange={(e) => setForm({ ...form, pieces_per_carton: Number(e.target.value) })} className="w-full border rounded px-3 py-2 text-sm" min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <fieldset className="border rounded p-3 space-y-2">
              <legend className="text-xs font-semibold px-1">Specifications</legend>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <input type="text" value={form.tile_type} onChange={(e) => setForm({ ...form, tile_type: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Finish</label>
                  <input type="text" value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Thickness</label>
                  <input type="text" value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Coverage/Box</label>
                  <input type="text" value={form.coverage_per_box} onChange={(e) => setForm({ ...form, coverage_per_box: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Use Case</label>
                  <input type="text" value={form.use_case} onChange={(e) => setForm({ ...form, use_case: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
            </fieldset>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
