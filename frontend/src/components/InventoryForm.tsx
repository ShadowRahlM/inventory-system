import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useReceiveInventory } from '../hooks/useInventoryQueries';
import type { ReceivePayload } from '../types/inventory';

const receiveSchema = z.object({
  tile_id: z.string().uuid(),
  batch_number: z.string().min(1),
  production_date: z.string(),
  supplier: z.string().min(1),
  cartons: z.number().int().min(0),
  loose_pieces: z.number().int().min(0),
  location: z.string().min(1),
  reference: z.string().optional(),
});

type ReceiveFormData = z.infer<typeof receiveSchema>;

export function ReceiveInventoryForm() {
  const receiveMutation = useReceiveInventory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiveFormData>({
    resolver: zodResolver(receiveSchema),
  });

  const onSubmit = (data: ReceiveFormData) => {
    receiveMutation.mutate(data as ReceivePayload, {
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
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
      
      <div>
        <label className="block mb-1">Tile ID</label>
        <input
          {...register('tile_id')}
          className="w-full border rounded px-3 py-2"
          placeholder="UUID"
        />
        {errors.tile_id && <span className="text-red-500">{errors.tile_id.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Batch Number</label>
        <input
          {...register('batch_number')}
          className="w-full border rounded px-3 py-2"
        />
        {errors.batch_number && <span className="text-red-500">{errors.batch_number.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Production Date</label>
        <input
          {...register('production_date')}
          type="date"
          className="w-full border rounded px-3 py-2"
        />
        {errors.production_date && <span className="text-red-500">{errors.production_date.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Supplier</label>
        <input
          {...register('supplier')}
          className="w-full border rounded px-3 py-2"
        />
        {errors.supplier && <span className="text-red-500">{errors.supplier.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Cartons</label>
        <input
          {...register('cartons', { valueAsNumber: true })}
          type="number"
          className="w-full border rounded px-3 py-2"
        />
        {errors.cartons && <span className="text-red-500">{errors.cartons.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Loose Pieces</label>
        <input
          {...register('loose_pieces', { valueAsNumber: true })}
          type="number"
          className="w-full border rounded px-3 py-2"
        />
        {errors.loose_pieces && <span className="text-red-500">{errors.loose_pieces.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Location</label>
        <input
          {...register('location')}
          className="w-full border rounded px-3 py-2"
        />
        {errors.location && <span className="text-red-500">{errors.location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Reference (Optional)</label>
        <input
          {...register('reference')}
          className="w-full border rounded px-3 py-2"
        />
      </div>

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