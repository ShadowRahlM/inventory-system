import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';

interface Props {
  compact?: boolean;
}

export function LowStockAlerts({ compact }: Props) {
  const [threshold, setThreshold] = useState(50);

  const { data, isLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'low-stock', threshold],
    queryFn: () => inventoryApi.stock.lowStock(threshold),
  });

  const items = data?.results ?? [];
  const count = data?.count ?? 0;

  if (compact) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            ⚠️ Low Stock Alerts
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Threshold:</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 50))}
              className="border rounded px-2 py-1 w-16 text-sm"
            />
          </div>
        </div>
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : count === 0 ? (
          <p className="text-green-600 text-sm">All stock levels are above {threshold} pieces ✓</p>
        ) : (
          <div>
            <p className="text-red-600 text-sm font-medium mb-2">
              {count} item{count !== 1 ? 's' : ''} at or below {threshold} pieces
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm border-b pb-1">
                  <div>
                    <span className="font-medium">{item.tile_sku}</span>
                    <span className="text-gray-500 ml-2">{item.location}</span>
                  </div>
                  <span className={`font-semibold ${item.total_pieces <= 10 ? 'text-red-600' : 'text-orange-500'}`}>
                    {item.total_pieces} pcs
                  </span>
                </div>
              ))}
            </div>
            {items.length > 5 && (
              <p className="text-xs text-gray-400 mt-2">+ {items.length - 5} more items</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Low Stock Alerts</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Threshold (pieces):</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 50))}
            className="border rounded px-3 py-2 w-20 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : count === 0 ? (
        <div className="bg-white rounded-lg shadow border p-8 text-center">
          <p className="text-green-600 text-lg font-medium">All stock levels are above {threshold} pieces ✓</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold">Tile SKU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Batch</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Location</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Loose Pieces</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Total Pieces</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={`border-b hover:bg-gray-50 ${item.total_pieces <= 10 ? 'bg-red-50' : 'bg-orange-50'}`}>
                  <td className="py-3 px-4 font-medium">{item.tile_sku}</td>
                  <td className="py-3 px-4">{item.batch_number}</td>
                  <td className="py-3 px-4">{item.location}</td>
                  <td className="py-3 px-4 text-right">{item.cartons}</td>
                  <td className="py-3 px-4 text-right">{item.loose_pieces}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-bold ${item.total_pieces <= 10 ? 'text-red-600' : 'text-orange-500'}`}>
                      {item.total_pieces}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-gray-500 p-4 border-t">{count} item{count !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}
