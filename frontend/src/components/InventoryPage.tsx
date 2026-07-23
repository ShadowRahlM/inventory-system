import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ReceiveInventoryForm } from './InventoryForm';
import { DispatchForm } from './DispatchForm';
import { AdjustForm } from './AdjustForm';
import { TransferForm } from './TransferForm';
import { useStockList, useMovementsList, useAuditLogsList } from '../hooks/useInventoryQueries';
import { Badge } from './ui/Badge';
import { PageHeader } from './ui/PageHeader';
import { inventoryApi } from '../api/inventoryApi';

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
  TRANSFER: 'default',
};

function StockView() {
  const { data, isLoading, error } = useStockList();
  const { data: stockSummary } = useQuery({
    queryKey: ['inventory-page-summary'],
    queryFn: () => inventoryApi.reports.stockSummary(),
  });

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Loading stock...</div>;
  if (error) return <div className="text-destructive text-center py-8">Error loading stock</div>;

  const items = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Mini summary */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-4 border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Items</p>
          <p className="text-xl font-bold mt-1">{stockSummary?.total_pieces ?? data?.count ?? 0}</p>
        </div>
        <div className="bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-4 border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cartons</p>
          <p className="text-xl font-bold mt-1">{stockSummary?.total_cartons ?? 0}</p>
        </div>
        <div className="bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-4 border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Loose Pieces</p>
          <p className="text-xl font-bold mt-1">{stockSummary?.total_loose_pieces ?? 0}</p>
        </div>
        <div className="bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-4 border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Batches</p>
          <p className="text-xl font-bold mt-1">{stockSummary?.total_batches ?? 0}</p>
        </div>
      </div>

      {/* Stock table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Stock Records</h3>
          <span className="text-xs text-muted-foreground">{data?.count ?? 0} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                <th className="text-left py-3 px-4 text-sm font-semibold">Tile SKU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Batch</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Location</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Loose</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No stock records found</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium">{item.tile_sku}</td>
                  <td className="py-3 px-4 text-sm">{item.batch_number}</td>
                  <td className="py-3 px-4 text-sm">
                    <Badge variant="outline">{item.location}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">{item.cartons}</td>
                  <td className="py-3 px-4 text-sm text-right">{item.loose_pieces}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">{item.total_pieces}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MovementsView() {
  const { data, isLoading, error } = useMovementsList();

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Loading movements...</div>;
  if (error) return <div className="text-destructive text-center py-8">Error loading movements</div>;

  const items = data?.results ?? [];

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Movement History</h3>
        <span className="text-xs text-muted-foreground">{data?.count ?? 0} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
              <th className="text-left py-3 px-4 text-sm font-semibold">Tile</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">Loose</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Reference</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">By</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No movements recorded yet</td></tr>
            ) : items.map((m) => (
              <tr key={m.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 text-sm">{m.tile_sku}</td>
                <td className="py-3 px-4">
                  <Badge variant={movementBadgeVariant[m.movement_type] ?? 'default'}>{m.movement_type}</Badge>
                </td>
                <td className="py-3 px-4 text-sm text-right">{m.cartons_change}</td>
                <td className="py-3 px-4 text-sm text-right">{m.loose_pieces_change}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{m.reference || '—'}</td>
                <td className="py-3 px-4 text-sm">{m.performed_by_username}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogsView() {
  const { data, isLoading, error } = useAuditLogsList();

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Loading audit logs...</div>;
  if (error) return <div className="text-destructive text-center py-8">Error loading audit logs</div>;

  const items = data?.results ?? [];

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Audit Trail</h3>
        <span className="text-xs text-muted-foreground">{data?.count ?? 0} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
              <th className="text-left py-3 px-4 text-sm font-semibold">Action</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">By</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No audit logs yet</td></tr>
            ) : items.map((log) => (
              <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 text-sm font-medium">{log.action}</td>
                <td className="py-3 px-4"><Badge>{log.movement_type}</Badge></td>
                <td className="py-3 px-4 text-sm">{log.changed_by_username}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  const isOperation = ['Receive', 'Dispatch', 'Adjust', 'Transfer'].includes(activeTab);

  return (
    <div className="p-6 space-y-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <PageHeader
        title="Inventory"
        description="Manage stock levels, track movements, and perform inventory operations"
      />

      {/* Tab bar */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className={isOperation ? 'p-5' : ''}>
          {tabComponents[activeTab]}
        </div>
      </div>
    </div>
  );
}
