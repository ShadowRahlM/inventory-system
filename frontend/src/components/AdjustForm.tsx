import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdjustInventory } from '../hooks/useInventoryQueries';

const adjustSchema = z.object({
  tile_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  location: z.string().min(1),
  new_cartons: z.number().int().min(0),
  new_loose_pieces: z.number().int().min(0),
  reason: z.string().min(1),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

export function AdjustForm() {
  const adjustMutation = useAdjustInventory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
  });

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
        <label className="block mb-1">Location</label>
        <input {...register('location')} className="w-full border rounded px-3 py-2" />
        {errors.location && <span className="text-red-500">{errors.location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">New Cartons</label>
        <input {...register('new_cartons', { valueAsNumber: true })} type="number" className="w-full border rounded px-3 py-2" />
        {errors.new_cartons && <span className="text-red-500">{errors.new_cartons.message}</span>}
      </div>

      <div>
        <label className="block mb-1">New Loose Pieces</label>
        <input {...register('new_loose_pieces', { valueAsNumber: true })} type="number" className="w-full border rounded px-3 py-2" />
        {errors.new_loose_pieces && <span className="text-red-500">{errors.new_loose_pieces.message}</span>}
      </div>

      <div>
        <label className="block mb-1">Reason</label>
        <textarea {...register('reason')} className="w-full border rounded px-3 py-2" rows={3} />
        {errors.reason && <span className="text-red-500">{errors.reason.message}</span>}
      </div>

      <button
        type="submit"
        disabled={adjustMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Inventory'}
      </button>
    </form>
  );
}
