import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ReceiveInventoryForm } from './InventoryForm';
import { DispatchForm } from './DispatchForm';
import { AdjustForm } from './AdjustForm';
import { TransferForm } from './TransferForm';
import { useStockList, useMovementsList, useAuditLogsList } from '../hooks/useInventoryQueries';
import { Badge } from './ui/Badge';

type Tab = 'Stock View' | 'Receive' | 'Dispatch' | 'Adjust' | 'Transfer' | 'Movements' | 'Audit Logs';

const tabs: Tab[] = ['Stock View', 'Receive', 'Dispatch', 'Adjust', 'Transfer', 'Movements', 'Audit Logs'];

const tabForPath: Record<string, Tab> = {
  '/inventory': 'Stock View',
  '/batches': 'Stock View',
  '/movements': 'Movements',
  '/audit-logs': 'Audit Logs',
};

const movementBadgeVariant: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  RECEIVING: 'success',
  DISPATCH: 'danger',
  ADJUSTMENT: 'warning',
};

function StockView() {
  const { data, isLoading, error } = useStockList();

  if (isLoading) return <div className="text-muted-foreground">Loading stock...</div>;
  if (error) return <div className="text-destructive">Error loading stock</div>;

  const items = data?.results ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Tile SKU</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Batch</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Location</th>
            <th className="text-right py-2 text-sm font-medium text-muted-foreground">Cartons</th>
            <th className="text-right py-2 text-sm font-medium text-muted-foreground">Loose</th>
            <th className="text-right py-2 text-sm font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No stock records found</td></tr>
          ) : items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-muted/50">
              <td className="py-2 text-sm font-medium">{item.tile_sku}</td>
              <td className="py-2 text-sm">{item.batch_number}</td>
              <td className="py-2 text-sm">{item.location}</td>
              <td className="py-2 text-sm text-right">{item.cartons}</td>
              <td className="py-2 text-sm text-right">{item.loose_pieces}</td>
              <td className="py-2 text-sm text-right font-semibold">{item.total_pieces}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground mt-2">{data?.count ?? 0} records</p>
    </div>
  );
}

function MovementsView() {
  const { data, isLoading, error } = useMovementsList();

  if (isLoading) return <div className="text-muted-foreground">Loading movements...</div>;
  if (error) return <div className="text-destructive">Error loading movements</div>;

  const items = data?.results ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Tile</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Type</th>
            <th className="text-right py-2 text-sm font-medium text-muted-foreground">Cartons</th>
            <th className="text-right py-2 text-sm font-medium text-muted-foreground">Loose</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Reference</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">By</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No movements recorded yet</td></tr>
          ) : items.map((m) => (
            <tr key={m.id} className="border-b hover:bg-muted/50">
              <td className="py-2 text-sm">{m.tile_sku}</td>
              <td className="py-2">
                <Badge variant={movementBadgeVariant[m.movement_type] ?? 'default'}>{m.movement_type}</Badge>
              </td>
              <td className="py-2 text-sm text-right">{m.cartons_change}</td>
              <td className="py-2 text-sm text-right">{m.loose_pieces_change}</td>
              <td className="py-2 text-sm text-muted-foreground">{m.reference || '-'}</td>
              <td className="py-2 text-sm">{m.performed_by_username}</td>
              <td className="py-2 text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground mt-2">{data?.count ?? 0} records</p>
    </div>
  );
}

function AuditLogsView() {
  const { data, isLoading, error } = useAuditLogsList();

  if (isLoading) return <div className="text-muted-foreground">Loading audit logs...</div>;
  if (error) return <div className="text-destructive">Error loading audit logs</div>;

  const items = data?.results ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Action</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Type</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">By</th>
            <th className="text-left py-2 text-sm font-medium text-muted-foreground">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No audit logs yet</td></tr>
          ) : items.map((log) => (
            <tr key={log.id} className="border-b hover:bg-muted/50">
              <td className="py-2 text-sm font-medium">{log.action}</td>
              <td className="py-2 text-sm"><Badge>{log.movement_type}</Badge></td>
              <td className="py-2 text-sm">{log.changed_by_username}</td>
              <td className="py-2 text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground mt-2">{data?.count ?? 0} records</p>
    </div>
  );
}

const tabComponents: Record<Tab, React.ReactNode> = {
  'Stock View': <StockView />,
  'Receive': <ReceiveInventoryForm />,
  'Dispatch': <DispatchForm />,
  'Adjust': <AdjustForm />,
  'Transfer': <TransferForm />,
  'Movements': <MovementsView />,
  'Audit Logs': <AuditLogsView />,
};

export function InventoryPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(
    () => tabForPath[location.pathname] ?? 'Stock View'
  );

  useEffect(() => {
    const tab = tabForPath[location.pathname];
    if (tab) setActiveTab(tab);
  }, [location.pathname]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Inventory</h1>
      <div className="border-b mb-6 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab
                ? 'bg-card border-l border-t border-r text-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6">
        {tabComponents[activeTab]}
      </div>
    </div>
  );
}
