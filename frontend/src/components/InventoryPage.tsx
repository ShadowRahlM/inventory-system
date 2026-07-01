import { useState } from 'react';
import { ReceiveInventoryForm } from './InventoryForm';
import { DispatchForm } from './DispatchForm';
import { AdjustForm } from './AdjustForm';
import { TransferForm } from './TransferForm';
import { useStockList, useMovementsList, useAuditLogsList } from '../hooks/useInventoryQueries';

type Tab = 'Stock View' | 'Receive' | 'Dispatch' | 'Adjust' | 'Transfer' | 'Movements' | 'Audit Logs';

const tabs: Tab[] = ['Stock View', 'Receive', 'Dispatch', 'Adjust', 'Transfer', 'Movements', 'Audit Logs'];

function StockView() {
  const { data, isLoading, error } = useStockList();

  if (isLoading) return <div className="text-gray-500">Loading stock...</div>;
  if (error) return <div className="text-red-500">Error loading stock</div>;

  const items = data?.results ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Tile SKU</th>
            <th className="text-left py-2">Batch</th>
            <th className="text-left py-2">Location</th>
            <th className="text-right py-2">Cartons</th>
            <th className="text-right py-2">Loose Pieces</th>
            <th className="text-right py-2">Total Pieces</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-8 text-gray-400">No stock records found</td></tr>
          ) : items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{item.tile_sku}</td>
              <td className="py-2">{item.batch_number}</td>
              <td className="py-2">{item.location}</td>
              <td className="py-2 text-right">{item.cartons}</td>
              <td className="py-2 text-right">{item.loose_pieces}</td>
              <td className="py-2 text-right font-semibold">{item.total_pieces}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-500 mt-2">{data?.count ?? 0} records</p>
    </div>
  );
}

function MovementsView() {
  const { data, isLoading, error } = useMovementsList();

  if (isLoading) return <div className="text-gray-500">Loading movements...</div>;
  if (error) return <div className="text-red-500">Error loading movements</div>;

  const items = data?.results ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Tile</th>
            <th className="text-left py-2">Type</th>
            <th className="text-right py-2">Cartons</th>
            <th className="text-right py-2">Loose</th>
            <th className="text-left py-2">Reference</th>
            <th className="text-left py-2">By</th>
            <th className="text-left py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-8 text-gray-400">No movements recorded yet</td></tr>
          ) : items.map((m) => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{m.tile_sku}</td>
              <td className="py-2">
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                  m.movement_type === 'RECEIVING' ? 'bg-green-100 text-green-800' :
                  m.movement_type === 'DISPATCH' ? 'bg-red-100 text-red-800' :
                  m.movement_type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {m.movement_type}
                </span>
              </td>
              <td className="py-2 text-right">{m.cartons_change}</td>
              <td className="py-2 text-right">{m.loose_pieces_change}</td>
              <td className="py-2 text-gray-500 text-sm">{m.reference || '-'}</td>
              <td className="py-2 text-sm">{m.performed_by_username}</td>
              <td className="py-2 text-sm text-gray-500">{new Date(m.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-500 mt-2">{data?.count ?? 0} records</p>
    </div>
  );
}

function AuditLogsView() {
  const { data, isLoading, error } = useAuditLogsList();

  if (isLoading) return <div className="text-gray-500">Loading audit logs...</div>;
  if (error) return <div className="text-red-500">Error loading audit logs</div>;

  const items = data?.results ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Action</th>
            <th className="text-left py-2">Type</th>
            <th className="text-left py-2">By</th>
            <th className="text-left py-2">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-8 text-gray-400">No audit logs yet</td></tr>
          ) : items.map((log) => (
            <tr key={log.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{log.action}</td>
              <td className="py-2">{log.movement_type}</td>
              <td className="py-2 text-sm">{log.changed_by_username}</td>
              <td className="py-2 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-500 mt-2">{data?.count ?? 0} records</p>
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
  const [activeTab, setActiveTab] = useState<Tab>('Stock View');

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Inventory</h1>
      <div className="border-b mb-6 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab
                ? 'bg-white border-l border-t border-r border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow border p-6">
        {tabComponents[activeTab]}
      </div>
    </div>
  );
}
