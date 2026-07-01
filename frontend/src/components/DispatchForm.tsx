import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatchInventory } from '../hooks/useInventoryQueries';

const dispatchSchema = z.object({
  tile_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  cartons: z.number().int().min(0),
  loose_pieces: z.number().int().min(0),
  location: z.string().min(1),
  reference: z.string().optional(),
});

type DispatchFormData = z.infer<typeof dispatchSchema>;

export function DispatchForm() {
  const dispatchMutation = useDispatchInventory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchSchema),
  });

  const onSubmit = (data: DispatchFormData) => {
    dispatchMutation.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Dispatch Inventory</h2>

      {dispatchMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {dispatchMutation.error?.message ?? 'Error dispatching inventory'}
        </div>
      )}

      {dispatchMutation.isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Inventory dispatched successfully!
        </div>
      )}

      <div>
        <label className="block mb-1">Tile ID</label>
        <input {...register('tile_id')} className="w-full border rounded px-3 py-2" placeholder="UUID" />
        {errors.tile_id && <span className="text-red-500">{errors.tile_id.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Batch ID</label>
        <input {...register('batch_id')} className="w-full border rounded px-3 py-2" placeholder="UUID" />
        {errors.batch_id && <span className="text-red-500">{errors.batch_id.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Cartons</label>
        <input {...register('cartons', { valueAsNumber: true })} type="number" className="w-full border rounded px-3 py-2" />
        {errors.cartons && <span className="text-red-500">{errors.cartons.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Loose Pieces</label>
        <input {...register('loose_pieces', { valueAsNumber: true })} type="number" className="w-full border rounded px-3 py-2" />
        {errors.loose_pieces && <span className="text-red-500">{errors.loose_pieces.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Location</label>
        <input {...register('location')} className="w-full border rounded px-3 py-2" />
        {errors.location && <span className="text-red-500">{errors.location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Reference (Optional)</label>
        <input {...register('reference')} className="w-full border rounded px-3 py-2" />
      </div>

      <button
        type="submit"
        disabled={dispatchMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Inventory'}
      </button>
    </form>
  );
}
