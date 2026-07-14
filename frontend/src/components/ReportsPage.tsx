import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded h-4 overflow-hidden">
      <div className={`h-full rounded transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ChangeBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-gray-400">—</span>;
  const isUp = pct > 0;
  return (
    <span className={`text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
      {isUp ? '+' : ''}{pct}%
    </span>
  );
}

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

  const { data: byCategory } = useQuery({
    queryKey: ['reports', 'by-category'],
    queryFn: () => inventoryApi.reports.stockByCategory(),
  });

  const { data: byLocation } = useQuery({
    queryKey: ['reports', 'by-location'],
    queryFn: () => inventoryApi.reports.stockByLocation(),
  });

  const { data: fastMovers } = useQuery({
    queryKey: ['reports', 'fast-movers'],
    queryFn: () => inventoryApi.reports.fastMovers(15),
  });

  const { data: lowStockDetail } = useQuery({
    queryKey: ['reports', 'low-stock-detail'],
    queryFn: () => inventoryApi.reports.lowStockDetail(50),
  });

  const { data: comparison } = useQuery({
    queryKey: ['reports', 'comparison', period],
    queryFn: () => inventoryApi.reports.periodComparison(period),
  });

  const maxCategory = Math.max(...(byCategory ?? []).map(c => c.total_pieces), 1);
  const maxLocation = Math.max(...(byLocation ?? []).map(l => l.total_pieces), 1);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Reports</h1>

      {/* Stock Overview Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Stock Overview</h2>
        {stockLoading ? (
          <p className="text-gray-500">Loading stock data...</p>
        ) : stockError ? (
          <p className="text-red-500">Failed to load stock data</p>
        ) : stockSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </section>

      {/* Stock by Category */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Stock by Category</h2>
        {!byCategory ? (
          <p className="text-gray-500">Loading...</p>
        ) : byCategory.length === 0 ? (
          <p className="text-gray-400">No data</p>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Tiles</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Loose</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total Pieces</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {byCategory.map(c => (
                  <tr key={c.tile__category} className="border-b hover:bg-muted/50 transition-colors duration-150">
                    <td className="py-3 px-4 font-medium">{c.tile__category || 'Uncategorized'}</td>
                    <td className="py-3 px-4 text-right">{c.tile_count}</td>
                    <td className="py-3 px-4 text-right">{c.total_cartons.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{c.total_loose.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">{c.total_pieces.toLocaleString()}</td>
                    <td className="py-3 px-4 w-48">
                      <Bar value={c.total_pieces} max={maxCategory} color="bg-blue-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock by Location */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Stock by Location</h2>
        {!byLocation ? (
          <p className="text-gray-500">Loading...</p>
        ) : byLocation.length === 0 ? (
          <p className="text-gray-400">No data</p>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Location</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Items</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Loose</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total Pieces</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {byLocation.map(l => (
                  <tr key={l.location} className="border-b hover:bg-muted/50 transition-colors duration-150">
                    <td className="py-3 px-4 font-medium">{l.location}</td>
                    <td className="py-3 px-4 text-right">{l.item_count}</td>
                    <td className="py-3 px-4 text-right">{l.total_cartons.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{l.total_loose.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">{l.total_pieces.toLocaleString()}</td>
                    <td className="py-3 px-4 w-48">
                      <Bar value={l.total_pieces} max={maxLocation} color="bg-emerald-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Period Comparison */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Period Comparison</h2>
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-500">Compare:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="day">Last 7 vs previous 7 days</option>
            <option value="week">Last 30 vs previous 30 days</option>
            <option value="month">Last 365 vs previous 365 days</option>
          </select>
        </div>
        {!comparison ? (
          <p className="text-gray-500">Loading...</p>
        ) : comparison.comparison.length === 0 ? (
          <p className="text-gray-400">No movement data for comparison</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {comparison.comparison.map(c => (
              <div key={c.movement_type} className="bg-white rounded-lg shadow border p-4">
                <p className="text-sm text-gray-500 capitalize">{c.movement_type}</p>
                <p className="text-2xl font-bold">{c.current_count}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">Previous: {c.previous_count}</span>
                  <ChangeBadge pct={c.change_pct} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fast Movers */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Top Moving Tiles (Last 365 days)</h2>
        {!fastMovers ? (
          <p className="text-gray-500">Loading...</p>
        ) : fastMovers.length === 0 ? (
          <p className="text-gray-400">No movement data</p>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Movements</th>
                </tr>
              </thead>
              <tbody>
                {fastMovers.map((m, i) => (
                  <tr key={m.tile_id} className="border-b hover:bg-muted/50 transition-colors duration-150">
                    <td className="py-3 px-4 text-gray-400 text-sm">{i + 1}</td>
                    <td className="py-3 px-4 font-mono text-sm">{m.tile__sku}</td>
                    <td className="py-3 px-4">{m.tile__name}</td>
                    <td className="py-3 px-4 text-right font-medium">{m.movement_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Movement Trends */}
      <section>
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
      </section>

      {/* Low Stock Detail */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Low Stock Items (≤ 50 pieces)</h2>
        {!lowStockDetail ? (
          <p className="text-gray-500">Loading...</p>
        ) : lowStockDetail.count === 0 ? (
          <p className="text-gray-400">No low stock items</p>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-red-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Batch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Location</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Loose</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {lowStockDetail.results.map(item => (
                  <tr key={item.id} className="border-b hover:bg-red-50/50 transition-colors duration-150">
                    <td className="py-3 px-4 font-mono text-sm">{item.sku}</td>
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.category}</td>
                    <td className="py-3 px-4 text-sm">{item.batch_number}</td>
                    <td className="py-3 px-4 text-sm">{item.location}</td>
                    <td className="py-3 px-4 text-right">{item.cartons}</td>
                    <td className="py-3 px-4 text-right">{item.loose_pieces}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">{item.total_pieces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Export Buttons */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Exports</h2>
        <div className="flex gap-3">
          <button
            onClick={() => inventoryApi.reports.exportPdf()}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 active:scale-[0.97] transition-all duration-150"
          >
            Download Stock Summary PDF
          </button>
        </div>
      </section>
    </div>
  );
}
