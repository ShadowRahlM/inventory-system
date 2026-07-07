import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import type { TileProduct } from '../types/inventory';

const BRANDS = [
  { value: 'goodwill', label: 'Goodwill' },
  { value: 'crown_crane', label: 'Crown Crane' },
  { value: 'other', label: 'Other' },
];

const TIERS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

const GOODWILL_SERIES = ['Cosmos', 'Galaxy', 'Noble', 'Glaze', 'Mosaic', 'Classic'];
const CROWN_CRANE_SERIES = ['Noble', 'Glaze', 'Premier', 'Elite', 'Royal', 'Grand'];

const TYPES = ['Ceramic Floor Tile', 'Ceramic Wall Tile', 'Porcelain Floor Tile', 'Porcelain Wall Tile', 'Mosaic Tile', 'Glazed Tile'];
const FINISHES = ['Matt', 'Gloss', 'Matt or Gloss available', 'Satin', 'Textured'];
const USE_CASES = ['Living rooms', 'Bedrooms', 'Kitchen', 'Bathroom', 'Outdoor', 'Commercial', 'Lobby', 'Hallway'];

export function NewTile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sku, setSku] = useState('');
  const [debouncedSku, setDebouncedSku] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSku(sku), 800);
    return () => clearTimeout(timer);
  }, [sku]);

  const { data: skuCheck } = useQuery({
    queryKey: [...INVENTORY_KEYS.all, 'sku-check', debouncedSku],
    queryFn: () =>
      api.get<{ exists: boolean; tile: TileProduct | null }>(
        '/inventory/tiles/check_sku/', { params: { sku: debouncedSku } }
      ).then(r => r.data),
    enabled: debouncedSku.length >= 4,
  });

  const [form, setForm] = useState({
    sku: '',
    name: '',
    brand: 'goodwill' as string,
    series: '',
    tier: 'standard' as string,
    dimensions: '',
    pieces_per_carton: 10,
    category: '',
    tile_type: '',
    finish: '',
    thickness: '',
    coverage_per_box: '',
    use_case: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const createMutation = useMutation<TileProduct, Error, FormData>({
    mutationFn: (formData) =>
      api.post<TileProduct>('/inventory/tiles/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.tiles() });
      navigate('/tiles');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('sku', form.sku);
    fd.append('name', form.name);
    fd.append('brand', form.brand);
    fd.append('series', form.series);
    fd.append('tier', form.tier);
    fd.append('dimensions', form.dimensions);
    fd.append('pieces_per_carton', String(form.pieces_per_carton));
    fd.append('category', form.category);
    fd.append('tile_type', form.tile_type);
    fd.append('finish', form.finish);
    fd.append('thickness', form.thickness);
    fd.append('coverage_per_box', form.coverage_per_box);
    fd.append('use_case', form.use_case);
    fd.append('description', form.description);
    if (imageFile) fd.append('image', imageFile);
    createMutation.mutate(fd);
  };

  const update = (fields: Partial<typeof form>) => setForm((f) => ({ ...f, ...fields }));

  const suggestedSeries = form.brand === 'goodwill'
    ? GOODWILL_SERIES
    : form.brand === 'crown_crane'
      ? CROWN_CRANE_SERIES
      : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">New Tile</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-5">
        {createMutation.isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {createMutation.error?.message ?? 'Failed to create tile'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <input type="text" value={sku} required onChange={(e) => { setSku(e.target.value); update({ sku: e.target.value }); }} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. GW-COS-3006" />
            {skuCheck?.exists && sku === debouncedSku && (
              <div className="mt-2 flex items-center gap-2 bg-yellow-50 border border-yellow-300 text-yellow-800 px-3 py-2 rounded text-sm">
                <span>⚠️</span>
                <span>
                  Tile "<strong>{skuCheck.tile!.name}</strong>" already exists —{' '}
                  <Link to={`/tiles?edit=${skuCheck.tile!.id}`} className="text-blue-600 underline hover:text-blue-800">View Tile</Link>
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" value={form.name} required onChange={(e) => update({ name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Cosmos White 30x60" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <select value={form.brand} onChange={(e) => update({ brand: e.target.value, series: '' })} className="w-full border rounded px-3 py-2 text-sm">
              {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Series</label>
            <input type="text" value={form.series} onChange={(e) => update({ series: e.target.value })} list={form.brand !== 'other' ? 'series-suggestions' : undefined} className="w-full border rounded px-3 py-2 text-sm" placeholder="Collection name" />
            <datalist id="series-suggestions">
              {suggestedSeries.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tier</label>
            <select value={form.tier} onChange={(e) => update({ tier: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
              {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Dimensions *</label>
            <input type="text" value={form.dimensions} required onChange={(e) => update({ dimensions: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. 30x60cm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pieces/Carton *</label>
            <input type="number" value={form.pieces_per_carton} required min={1} onChange={(e) => update({ pieces_per_carton: Number(e.target.value) })} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input type="text" value={form.category} onChange={(e) => update({ category: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Wall, Floor" list="category-suggestions" />
            <datalist id="category-suggestions">
              {['Wall', 'Floor', 'Mosaic', 'Wood', 'Stone', 'Bathroom', 'Kitchen', 'Outdoor'].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <fieldset className="border rounded p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Specifications</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <input type="text" value={form.tile_type} onChange={(e) => update({ tile_type: e.target.value })} list="type-suggestions" className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Ceramic Floor Tile" />
              <datalist id="type-suggestions">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Finish</label>
              <input type="text" value={form.finish} onChange={(e) => update({ finish: e.target.value })} list="finish-suggestions" className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Matt, Gloss" />
              <datalist id="finish-suggestions">{FINISHES.map((f) => <option key={f} value={f} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thickness</label>
              <input type="text" value={form.thickness} onChange={(e) => update({ thickness: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. 8-10mm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coverage/Box</label>
              <input type="text" value={form.coverage_per_box} onChange={(e) => update({ coverage_per_box: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. 1.92 sqm per box" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Use Case</label>
              <input type="text" value={form.use_case} onChange={(e) => update({ use_case: e.target.value })} list="usecase-suggestions" className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Living rooms, bedrooms" />
              <datalist id="usecase-suggestions">{USE_CASES.map((u) => <option key={u} value={u} />)}</datalist>
            </div>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Additional notes..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product Image</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {createMutation.isPending ? 'Saving...' : 'Save Tile'}
          </button>
          <button type="button" onClick={() => navigate('/tiles')} className="px-6 py-2 border rounded hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
