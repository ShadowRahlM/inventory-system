import { useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useReceiveInventory, useTilesList } from '../hooks/useInventoryQueries';
import { SearchableSelect } from './SearchableSelect';
import type { ReceivePayload } from '../types/inventory';

const receiveSchema = z.object({
  tile_id: z.string().min(1, 'Tile is required'),
  batch_number: z.string().optional(),
  production_date: z.string().optional(),
  supplier: z.string().optional(),
  cartons: z.coerce.number().int().min(0).default(0),
  loose_pieces: z.coerce.number().int().min(0).default(0),
  location: z.string().min(1, 'Location is required'),
  reference: z.string().optional(),
});

export function ReceiveInventoryForm() {
  const { data: tiles } = useTilesList();
  const receiveMutation = useReceiveInventory();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      tile_id: '',
      batch_number: '',
      production_date: new Date().toISOString().split('T')[0],
      supplier: 'stock-receive',
      cartons: 0,
      loose_pieces: 0,
      location: 'STOCKROOM',
      reference: '',
    },
  });

  const tileOptions = useMemo(
    () => (tiles?.results ?? []).map((t: any) => ({ value: t.id, label: `${t.sku} — ${t.name}` })),
    [tiles],
  );

  const tileIdToSku = useMemo(
    () => new Map((tiles?.results ?? []).map((t: any) => [t.id, t.sku])),
    [tiles],
  );

  const selectedTileId = watch('tile_id');
  const selectedSku = selectedTileId ? tileIdToSku.get(selectedTileId) : '';

  const onSubmit = useCallback((data: any) => {
    const today = new Date().toISOString().split('T')[0];
    const payload: ReceivePayload = {
      tile_id: data.tile_id,
      batch_number: data.batch_number || `STOCK-${selectedSku}`,
      production_date: data.production_date || today,
      supplier: data.supplier || 'stock-receive',
      cartons: data.cartons,
      loose_pieces: data.loose_pieces,
      location: data.location,
      reference: data.reference || '',
    };
    receiveMutation.mutate(payload, {
      onSuccess: () => reset(),
    });
  }, [receiveMutation, reset, selectedSku]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <h2 className="text-2xl font-bold mb-4">Receive Inventory</h2>

      {receiveMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {receiveMutation.error?.message ?? 'Error receiving inventory'}
        </div>
      )}

      {receiveMutation.isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Inventory received successfully!
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
            error={errors.tile_id?.message as string}
          />
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Cartons</label>
          <Controller name="cartons" control={control} render={({ field }) => (
            <input value={field.value as number} onChange={field.onChange} type="number" className="w-full border rounded px-3 py-2 text-sm" />
          )} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Loose Pieces</label>
          <Controller name="loose_pieces" control={control} render={({ field }) => (
            <input value={field.value as number} onChange={field.onChange} type="number" className="w-full border rounded px-3 py-2 text-sm" />
          )} />
        </div>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700">Location</label>
        <Controller name="location" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2 text-sm" />
        )} />
        {errors.location && <span className="text-red-500 text-xs">{errors.location.message}</span>}
      </div>

      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer font-medium">Advanced options (batch, supplier, date)</summary>
        <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-200">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Batch Number <span className="text-gray-400 font-normal">— defaults to SKU-based</span>
            </label>
            <Controller name="batch_number" control={control} render={({ field }) => (
              <input value={field.value as string} onChange={field.onChange} placeholder={`STOCK-${selectedSku || 'SKU'}`} className="w-full border rounded px-3 py-2 text-sm" />
            )} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Production Date</label>
            <Controller name="production_date" control={control} render={({ field }) => (
              <input value={field.value as string} onChange={field.onChange} type="date" className="w-full border rounded px-3 py-2 text-sm" />
            )} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Supplier</label>
            <Controller name="supplier" control={control} render={({ field }) => (
              <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2 text-sm" />
            )} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Reference</label>
            <Controller name="reference" control={control} render={({ field }) => (
              <input value={field.value as string} onChange={field.onChange} className="w-full border rounded px-3 py-2 text-sm" />
            )} />
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={receiveMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {receiveMutation.isPending ? 'Receiving...' : 'Receive Inventory'}
      </button>
    </form>
  );
}