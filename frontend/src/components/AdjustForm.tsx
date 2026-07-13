import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdjustInventory, useTilesList, useBatchesList } from '../hooks/useInventoryQueries';
import { SearchableSelect } from './SearchableSelect';

const adjustSchema = z.object({
  tile_id: z.string().uuid('Select a valid tile'),
  batch_id: z.string().uuid('Select a valid batch'),
  location: z.string().min(1),
  new_cartons: z.number().int().min(0),
  new_loose_pieces: z.number().int().min(0),
  reason: z.string().min(1),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

export function AdjustForm() {
  const adjustMutation = useAdjustInventory();
  const { data: tiles } = useTilesList();
  const { data: batches } = useBatchesList();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      tile_id: '',
      batch_id: '',
      location: '',
      new_cartons: 0,
      new_loose_pieces: 0,
      reason: '',
    },
  });

  const tileOptions = useMemo(
    () => (tiles?.results ?? []).map((t: any) => ({ value: t.id, label: `${t.sku} — ${t.name}` })),
    [tiles],
  );

  const selectedTileId = watch('tile_id');

  const batchOptions = useMemo(
    () => (batches?.results ?? [])
      .filter((b: any) => b.tile === selectedTileId && b.is_active)
      .map((b: any) => ({ value: b.id, label: `${b.batch_number} — ${b.supplier} (${b.tile_sku})` })),
    [batches, selectedTileId],
  );

  const onSubmit = (data: AdjustFormData) => {
    adjustMutation.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Adjust Inventory</h2>

      {adjustMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {adjustMutation.error?.message ?? 'Error adjusting inventory'}
        </div>
      )}

      {adjustMutation.isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Inventory adjusted successfully!
        </div>
      )}

      <Controller
        name="tile_id"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label="Tile"
            options={tileOptions}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Search tile..."
            error={errors.tile_id?.message}
          />
        )}
      />

      <Controller
        name="batch_id"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label="Batch"
            options={batchOptions}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={selectedTileId ? 'Search batch...' : 'Select a tile first'}
            error={errors.batch_id?.message}
            disabled={!selectedTileId}
          />
        )}
      />

      <div>
        <label className="block mb-1">Location</label>
        <Controller name="location" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2" />
        )} />
        {errors.location && <span className="text-red-500">{errors.location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">New Cartons</label>
        <Controller name="new_cartons" control={control} render={({ field }) => (
          <input value={field.value as number} onChange={field.onChange} type="number" className="w-full border rounded px-3 py-2" />
        )} />
        {errors.new_cartons && <span className="text-red-500">{errors.new_cartons.message}</span>}
      </div>

      <div>
        <label className="block mb-1">New Loose Pieces</label>
        <Controller name="new_loose_pieces" control={control} render={({ field }) => (
          <input value={field.value as number} onChange={field.onChange} type="number" className="w-full border rounded px-3 py-2" />
        )} />
        {errors.new_loose_pieces && <span className="text-red-500">{errors.new_loose_pieces.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Reason</label>
        <Controller name="reason" control={control} render={({ field }) => (
          <textarea value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2" rows={3} />
        )} />
        {errors.reason && <span className="text-red-500">{errors.reason.message}</span>}
      </div>

      <button
        type="submit"
        disabled={adjustMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Inventory'}
      </button>
    </form>
  );
}
