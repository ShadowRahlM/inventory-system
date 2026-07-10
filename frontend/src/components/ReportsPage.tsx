import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';

export function ReportsPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');

  const { data: stockSummary, isLoading: stockLoading, isError: stockError } = useQuery({
    queryKey: ['reports', 'stock-summary'],
    queryFn: () => inventoryApi.reports.stockSummary(),
  });

  const { data: movementSummary, isLoading: movementLoading, isError: movementError } = useQuery({
    queryKey: ['reports', 'movement-summary', period],
    queryFn: () => inventoryApi.reports.movementSummary(period),
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      {/* Stock Summary Cards */}
      <h2 className="text-xl font-semibold mb-3">Stock Overview</h2>
      {stockLoading ? (
        <p className="text-gray-500 mb-6">Loading stock data...</p>
      ) : stockError ? (
        <p className="text-red-500 mb-6">Failed to load stock data</p>
      ) : stockSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Total Tiles</p>
            <p className="text-2xl font-bold">{stockSummary.total_tiles}</p>
          </div>
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Total Pieces</p>
            <p className="text-2xl font-bold">{stockSummary.total_pieces.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Total Cartons</p>
            <p className="text-2xl font-bold">{stockSummary.total_cartons.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Loose Pieces</p>
            <p className="text-2xl font-bold">{stockSummary.total_loose_pieces.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Locations</p>
            <p className="text-2xl font-bold">{stockSummary.location_count}</p>
          </div>
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-gray-500">Batches</p>
            <p className="text-2xl font-bold">{stockSummary.total_batches}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow border border-red-200 p-4">
            <p className="text-sm text-red-600">Low Stock Items</p>
            <p className="text-2xl font-bold text-red-600">{stockSummary.low_stock_count}</p>
          </div>
        </div>
      ) : null}

      {/* Movement Summary */}
      <h2 className="text-xl font-semibold mb-3">Movement Trends</h2>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-500">Period:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="day">Last 7 days</option>
          <option value="week">Last 30 days</option>
          <option value="month">Last 365 days</option>
        </select>
      </div>

      {movementLoading ? (
        <p className="text-gray-500">Loading movements...</p>
      ) : movementError ? (
        <p className="text-red-500">Failed to load movement data</p>
      ) : movementSummary ? (
        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          {movementSummary.by_type.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b">
              {movementSummary.by_type.map((item) => (
                <div key={item.movement_type} className="text-center">
                  <p className="text-sm text-gray-500 capitalize">{item.movement_type}</p>
                  <p className="text-xl font-bold">{item.count}</p>
                  <p className="text-xs text-gray-400">{item.total_pieces} pieces</p>
                </div>
              ))}
            </div>
          )}

          {movementSummary.movements.length > 0 ? (
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Period</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Count</th>
                </tr>
              </thead>
              <tbody>
                {movementSummary.movements.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50 transition-colors duration-150">
                    <td className="py-3 px-4">{m.period?.slice(0, 10) ?? 'N/A'}</td>
                    <td className="py-3 px-4 capitalize">{m.movement_type}</td>
                    <td className="py-3 px-4 text-right">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-gray-500 text-sm">No movements in this period.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
