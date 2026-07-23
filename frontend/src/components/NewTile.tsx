import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { PageHeader } from './ui/PageHeader';
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
    is_mix: false,
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
    fd.append('is_mix', form.is_mix ? 'true' : 'false');
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
    <div className="p-6 space-y-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <PageHeader title="New Product" description="Register a new tile or SKU in the inventory system" />

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-sm space-y-5 max-w-3xl">
        {createMutation.isError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded text-sm">
            {createMutation.error?.message ?? 'Failed to create tile'}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <input type="text" value={sku} required onChange={(e) => { setSku(e.target.value); update({ sku: e.target.value }); }} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. GW-COS-3006" />
            {skuCheck?.exists && sku === debouncedSku && (
              <div className="mt-2 flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3 py-2 rounded text-sm">
                <span>⚠️</span>
                <span>
                  Tile "<strong>{skuCheck.tile!.name}</strong>" already exists —{' '}
                  <Link to={`/tiles?edit=${skuCheck.tile!.id}`} className="text-primary underline hover:text-primary/80">View Tile</Link>
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" value={form.name} required onChange={(e) => update({ name: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Cosmos White 30x60" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <select value={form.brand} onChange={(e) => update({ brand: e.target.value, series: '' })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Series</label>
            <input type="text" value={form.series} onChange={(e) => update({ series: e.target.value })} list={form.brand !== 'other' ? 'series-suggestions' : undefined} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Collection name" />
            <datalist id="series-suggestions">
              {suggestedSeries.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tier</label>
            <select value={form.tier} onChange={(e) => update({ tier: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Dimensions *</label>
            <input type="text" value={form.dimensions} required onChange={(e) => update({ dimensions: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. 30x60cm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pieces/Carton *</label>
            <input type="number" value={form.pieces_per_carton} required min={1} onChange={(e) => update({ pieces_per_carton: Number(e.target.value) })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input type="text" value={form.category} onChange={(e) => update({ category: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Wall, Floor" list="category-suggestions" />
            <datalist id="category-suggestions">
              {['Wall', 'Floor', 'Mosaic', 'Wood', 'Stone', 'Bathroom', 'Kitchen', 'Outdoor'].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_mix"
            checked={form.is_mix}
            onChange={(e) => update({ is_mix: e.target.checked })}
            className="rounded border-input"
          />
          <label htmlFor="is_mix" className="text-sm font-medium">Mixed/Temporary Bin</label>
        </div>

        <fieldset className="border rounded-xl p-5 space-y-4 bg-[#F7F7F7] dark:bg-muted/30">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">Specifications</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <input type="text" value={form.tile_type} onChange={(e) => update({ tile_type: e.target.value })} list="type-suggestions" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Ceramic Floor Tile" />
              <datalist id="type-suggestions">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Finish</label>
              <input type="text" value={form.finish} onChange={(e) => update({ finish: e.target.value })} list="finish-suggestions" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Matt, Gloss" />
              <datalist id="finish-suggestions">{FINISHES.map((f) => <option key={f} value={f} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thickness</label>
              <input type="text" value={form.thickness} onChange={(e) => update({ thickness: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. 8-10mm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coverage/Box</label>
              <input type="text" value={form.coverage_per_box} onChange={(e) => update({ coverage_per_box: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. 1.92 sqm per box" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Use Case</label>
              <input type="text" value={form.use_case} onChange={(e) => update({ use_case: e.target.value })} list="usecase-suggestions" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Living rooms, bedrooms" />
              <datalist id="usecase-suggestions">{USE_CASES.map((u) => <option key={u} value={u} />)}</datalist>
            </div>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Additional notes..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product Image</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-muted-foreground" />
        </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {createMutation.isPending ? 'Saving...' : 'Save Tile'}
            </button>
            <button type="button" onClick={() => navigate('/tiles')} className="rounded-md border bg-background px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          </div>
      </form>
    </div>
  );
}
