import { useSyncConflictsList, useResolveSyncConflict } from '../hooks/useInventoryQueries';
import { PageHeader } from './ui/PageHeader';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
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
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">
            {modelLabels[conflict.model_name] || conflict.model_name} Conflict
          </h3>
          <p className="text-sm text-muted-foreground">
            Record: <code className="text-xs bg-muted px-1 py-0.5 rounded">{conflict.record_id}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Peer: <span className="font-mono text-xs">{conflict.peer_url}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(conflict.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-red-700 mb-2">Local (this laptop)</h4>
          <table className="w-full text-xs">
            <tbody>
              {allKeys.map(key => (
                <tr key={key} className="border-b border-red-100">
                  <td className="py-1 pr-2 font-medium text-muted-foreground w-1/3">{key}</td>
                  <td className="py-1 text-foreground font-mono break-all">
                    {String(conflict.local_data[key] ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-blue-700 mb-2">Remote (peer)</h4>
          <table className="w-full text-xs">
            <tbody>
              {allKeys.map(key => (
                <tr key={key} className="border-b border-blue-100">
                  <td className="py-1 pr-2 font-medium text-muted-foreground w-1/3">{key}</td>
                  <td className="py-1 text-foreground font-mono break-all">
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
            className="rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            Keep Local
          </button>
          <button
            onClick={() => resolve({ id: conflict.id, resolution: 'remote' })}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            Use Remote
          </button>
        </div>
      ) : (
        <Badge variant="success">Resolved — kept {conflict.resolution === 'local' ? 'local' : 'remote'} version</Badge>
      )}
    </div>
  );
}

export function SyncConflictsPage() {
  const { data, isLoading, isError } = useSyncConflictsList();
  const conflicts = data?.results ?? [];
  const unresolved = conflicts.filter(c => !c.resolved);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading sync conflicts...</div>;
  if (isError) return <div className="p-6 text-destructive">Failed to load sync conflicts</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Sync Conflicts"
        description="Resolve data conflicts between synchronized devices"
        actions={unresolved.length > 0 ? (
          <Badge variant="danger">{unresolved.length} unresolved</Badge>
        ) : undefined}
      />
      {conflicts.length === 0 ? (
        <EmptyState title="No sync conflicts" description="All devices are in sync." />
      ) : (
        <div className="space-y-4">
          {conflicts.map(c => <ConflictCard key={c.id} conflict={c} />)}
        </div>
      )}
    </div>
  );
}
