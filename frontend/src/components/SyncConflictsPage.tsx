import { useSyncConflictsList, useResolveSyncConflict } from '../hooks/useInventoryQueries';
import type { SyncConflict } from '../types/inventory';

const modelLabels: Record<string, string> = {
  Tile: 'Tile',
  Batch: 'Batch',
  Inventory: 'Stock Record',
  Movement: 'Movement',
  Customer: 'Customer',
  Supplier: 'Supplier',
  SalesOrder: 'Sales Order',
  PurchaseOrder: 'Purchase Order',
  Notification: 'Notification',
};

function ConflictCard({ conflict }: { conflict: SyncConflict }) {
  const { mutate: resolve, isPending } = useResolveSyncConflict();

  const localKeys = Object.keys(conflict.local_data).filter(k => !['id', 'created_at', 'updated_at'].includes(k));
  const remoteKeys = Object.keys(conflict.remote_data).filter(k => !['id', 'created_at', 'updated_at'].includes(k));
  const allKeys = [...new Set([...localKeys, ...remoteKeys])];

  return (
    <div className="bg-white rounded-lg shadow border p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">
            {modelLabels[conflict.model_name] || conflict.model_name} Conflict
          </h3>
          <p className="text-sm text-gray-500">
            Record: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{conflict.record_id}</code>
          </p>
          <p className="text-sm text-gray-500">
            Peer: <span className="font-mono text-xs">{conflict.peer_url}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(conflict.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <h4 className="text-sm font-semibold text-red-700 mb-2">Local (this laptop)</h4>
          <table className="w-full text-xs">
            <tbody>
              {allKeys.map(key => (
                <tr key={key} className="border-b border-red-100">
                  <td className="py-1 pr-2 font-medium text-gray-600 w-1/3">{key}</td>
                  <td className="py-1 text-gray-800 font-mono break-all">
                    {String(conflict.local_data[key] ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="text-sm font-semibold text-blue-700 mb-2">Remote (peer)</h4>
          <table className="w-full text-xs">
            <tbody>
              {allKeys.map(key => (
                <tr key={key} className="border-b border-blue-100">
                  <td className="py-1 pr-2 font-medium text-gray-600 w-1/3">{key}</td>
                  <td className="py-1 text-gray-800 font-mono break-all">
                    {String(conflict.remote_data[key] ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!conflict.resolved ? (
        <div className="flex gap-2">
          <button
            onClick={() => resolve({ id: conflict.id, resolution: 'local' })}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Keep Local
          </button>
          <button
            onClick={() => resolve({ id: conflict.id, resolution: 'remote' })}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Use Remote
          </button>
        </div>
      ) : (
        <div className="text-sm text-green-600 font-medium">
          Resolved — kept {conflict.resolution === 'local' ? 'local' : 'remote'} version
        </div>
      )}
    </div>
  );
}

export function SyncConflictsPage() {
  const { data, isLoading, isError } = useSyncConflictsList();
  const conflicts = data?.results ?? [];
  const unresolved = conflicts.filter(c => !c.resolved);

  if (isLoading) return <div className="p-6 text-gray-500">Loading sync conflicts...</div>;
  if (isError) return <div className="p-6 text-red-500">Failed to load sync conflicts</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sync Conflicts</h1>
        {unresolved.length > 0 && (
          <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded">
            {unresolved.length} unresolved
          </span>
        )}
      </div>
      {conflicts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No sync conflicts</div>
      ) : (
        <div className="space-y-4">
          {conflicts.map(c => <ConflictCard key={c.id} conflict={c} />)}
        </div>
      )}
    </div>
  );
}
