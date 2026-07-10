import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransferInventory } from '../hooks/useInventoryQueries';

const transferSchema = z.object({
  tile_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  from_location: z.string().min(1),
  to_location: z.string().min(1),
  cartons: z.number().int().min(0),
  loose_pieces: z.number().int().min(0),
  reference: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

export function TransferForm() {
  const transferMutation = useTransferInventory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  });

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
        <label className="block mb-1">From Location</label>
        <input {...register('from_location')} className="w-full border rounded px-3 py-2" />
        {errors.from_location && <span className="text-red-500">{errors.from_location.message}</span>}
      </div>

      <div>
        <label className="block mb-1">To Location</label>
        <input {...register('to_location')} className="w-full border rounded px-3 py-2" />
        {errors.to_location && <span className="text-red-500">{errors.to_location.message}</span>}
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
        <label className="block mb-1">Reference (Optional)</label>
        <input {...register('reference')} className="w-full border rounded px-3 py-2" />
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
