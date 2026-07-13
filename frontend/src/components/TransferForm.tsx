import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransferInventory, useTilesList, useBatchesList } from '../hooks/useInventoryQueries';
import { SearchableSelect } from './SearchableSelect';

const transferSchema = z.object({
  tile_id: z.string().uuid('Select a valid tile'),
  batch_id: z.string().uuid('Select a valid batch'),
  from_location: z.string().min(1),
  to_location: z.string().min(1),
  cartons: z.number().int().min(0),
  loose_pieces: z.number().int().min(0),
  reference: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

export function TransferForm() {
  const transferMutation = useTransferInventory();
  const { data: tiles } = useTilesList();
  const { data: batches } = useBatchesList();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      tile_id: '',
      batch_id: '',
      from_location: '',
      to_location: '',
      cartons: 0,
      loose_pieces: 0,
      reference: '',
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

  const onSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Transfer Inventory</h2>

      {transferMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {transferMutation.error?.message ?? 'Error transferring inventory'}
        </div>
      )}

      {transferMutation.isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Inventory transferred successfully!
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
        <label className="block mb-1">From Location</label>
        <Controller name="from_location" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2" />
        )} />
        {errors.from_location && <span className="text-red-500">{errors.from_location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">To Location</label>
        <Controller name="to_location" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2" />
        )} />
        {errors.to_location && <span className="text-red-500">{errors.to_location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Cartons</label>
        <Controller name="cartons" control={control} render={({ field }) => (
          <input value={field.value as number} onChange={field.onChange} type="number" className="w-full border rounded px-3 py-2" />
        )} />
        {errors.cartons && <span className="text-red-500">{errors.cartons.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Loose Pieces</label>
        <Controller name="loose_pieces" control={control} render={({ field }) => (
          <input value={field.value as number} onChange={field.onChange} type="number" className="w-full border rounded px-3 py-2" />
        )} />
        {errors.loose_pieces && <span className="text-red-500">{errors.loose_pieces.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Reference (Optional)</label>
        <Controller name="reference" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2" />
        )} />
      </div>

      <button
        type="submit"
        disabled={transferMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {transferMutation.isPending ? 'Transferring...' : 'Transfer Inventory'}
      </button>
    </form>
  );
}
