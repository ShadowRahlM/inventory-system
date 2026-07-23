import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { PageHeader } from './ui/PageHeader';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ChangeBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const isUp = pct > 0;
  return (
    <span className={`text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
      {isUp ? '↑ +' : '↓ '}{Math.abs(pct)}%
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
    <div className="p-6 space-y-8 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <PageHeader title="Reports" description="Stock overview, movement trends, and performance analytics" />

      {/* Stock Overview Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Stock Overview</h2>
        {stockLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : stockError ? (
          <p className="text-muted-foreground">Failed to load stock data</p>
        ) : stockSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Tiles</p>
              <p className="text-2xl font-bold mt-1">{stockSummary.total_tiles}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Pieces</p>
              <p className="text-2xl font-bold mt-1">{stockSummary.total_pieces.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cartons</p>
              <p className="text-2xl font-bold mt-1">{stockSummary.total_cartons.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Loose Pieces</p>
              <p className="text-2xl font-bold mt-1">{stockSummary.total_loose_pieces.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Locations</p>
              <p className="text-2xl font-bold mt-1">{stockSummary.location_count}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Batches</p>
              <p className="text-2xl font-bold mt-1">{stockSummary.total_batches}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Low Stock Items</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{stockSummary.low_stock_count}</p>
            </div>
          </div>
        ) : null}
      </section>

      {/* Stock by Category + Location */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30">
            <h3 className="font-semibold text-sm">Stock by Category</h3>
          </div>
          {!byCategory ? (
            <p className="text-muted-foreground text-sm p-5">Loading...</p>
          ) : byCategory.length === 0 ? (
            <p className="text-muted-foreground text-sm p-5">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Category</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Tiles</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Pieces</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map(c => (
                    <tr key={c.tile__category} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">{c.tile__category || 'Uncategorized'}</td>
                      <td className="py-3 px-4 text-sm text-right">{c.tile_count}</td>
                      <td className="py-3 px-4 text-sm text-right">{c.total_cartons.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium">{c.total_pieces.toLocaleString()}</td>
                      <td className="py-3 px-4 w-32">
                        <Bar value={c.total_pieces} max={maxCategory} color="bg-blue-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30">
            <h3 className="font-semibold text-sm">Stock by Location</h3>
          </div>
          {!byLocation ? (
            <p className="text-muted-foreground text-sm p-5">Loading...</p>
          ) : byLocation.length === 0 ? (
            <p className="text-muted-foreground text-sm p-5">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Location</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Items</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Cartons</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Pieces</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {byLocation.map(l => (
                    <tr key={l.location} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">{l.location}</td>
                      <td className="py-3 px-4 text-sm text-right">{l.item_count}</td>
                      <td className="py-3 px-4 text-sm text-right">{l.total_cartons.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium">{l.total_pieces.toLocaleString()}</td>
                      <td className="py-3 px-4 w-32">
                        <Bar value={l.total_pieces} max={maxLocation} color="bg-emerald-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Period Comparison + Movement Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Period Comparison</h3>
              <select value={period} onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
                className="rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="day">Last 7 vs prev 7 days</option>
                <option value="week">Last 30 vs prev 30 days</option>
                <option value="month">Last 365 vs prev 365 days</option>
              </select>
            </div>
          </div>
          {!comparison ? (
            <p className="text-muted-foreground text-sm p-5">Loading...</p>
          ) : comparison.comparison.length === 0 ? (
            <p className="text-muted-foreground text-sm p-5">No movement data for comparison</p>
          ) : (
            <div className="p-4 grid grid-cols-2 gap-4">
              {comparison.comparison.map(c => (
                <div key={c.movement_type} className="rounded-xl bg-[#F7F7F7] dark:bg-muted/30 p-4 border">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.movement_type}</p>
                  <p className="text-2xl font-bold mt-1">{c.current_count}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Prev: {c.previous_count}</span>
                    <ChangeBadge pct={c.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30">
            <h3 className="font-semibold text-sm">Movement Trends</h3>
          </div>
          {movementLoading ? (
            <p className="text-muted-foreground text-sm p-5">Loading...</p>
          ) : movementError ? (
            <p className="text-destructive text-sm p-5">Failed to load</p>
          ) : movementSummary ? (
            <div>
              {movementSummary.by_type.length > 0 && (
                <div className="grid grid-cols-2 gap-4 p-4 border-b">
                  {movementSummary.by_type.map((item) => (
                    <div key={item.movement_type} className="text-center bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-3 border">
                      <p className="text-xs text-muted-foreground capitalize font-medium">{item.movement_type}</p>
                      <p className="text-xl font-bold">{item.count}</p>
                      <p className="text-xs text-muted-foreground">{item.total_pieces} pieces</p>
                    </div>
                  ))}
                </div>
              )}
              {movementSummary.movements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                        <th className="text-left py-3 px-4 text-sm font-semibold">Period</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementSummary.movements.map((m, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 text-sm">{m.period?.slice(0, 10) ?? 'N/A'}</td>
                          <td className="py-3 px-4 text-sm capitalize">{m.movement_type}</td>
                          <td className="py-3 px-4 text-sm text-right">{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-4 text-muted-foreground text-sm">No movements in this period.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* Fast Movers */}
      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30">
          <h3 className="font-semibold text-sm">Top Moving Tiles (Last 365 days)</h3>
        </div>
        {!fastMovers ? (
          <p className="text-muted-foreground text-sm p-5">Loading...</p>
        ) : fastMovers.length === 0 ? (
          <p className="text-muted-foreground text-sm p-5">No movement data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold w-12">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Movements</th>
                </tr>
              </thead>
              <tbody>
                {fastMovers.map((m, i) => (
                  <tr key={m.tile_id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4 font-mono text-sm">{m.tile__sku}</td>
                    <td className="py-3 px-4 text-sm">{m.tile__name}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold">{m.movement_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Low Stock Detail */}
      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-red-50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-red-700">Low Stock Items (≤ 50 pieces)</h3>
          <span className="text-xs text-red-600 font-medium">{lowStockDetail?.count ?? 0} items</span>
        </div>
        {!lowStockDetail ? (
          <p className="text-muted-foreground text-sm p-5">Loading...</p>
        ) : lowStockDetail.count === 0 ? (
          <p className="text-muted-foreground text-sm p-5">No low stock items</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-red-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-red-700">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-red-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-red-700">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-red-700">Batch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-red-700">Location</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-700">Cartons</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-700">Loose</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {lowStockDetail.results.map(item => (
                  <tr key={item.id} className="border-b hover:bg-red-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm">{item.sku}</td>
                    <td className="py-3 px-4 text-sm">{item.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.category}</td>
                    <td className="py-3 px-4 text-sm">{item.batch_number}</td>
                    <td className="py-3 px-4 text-sm">{item.location}</td>
                    <td className="py-3 px-4 text-sm text-right">{item.cartons}</td>
                    <td className="py-3 px-4 text-sm text-right">{item.loose_pieces}</td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-red-600">{item.total_pieces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Export */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Exports</h3>
        <div className="flex gap-3">
          <button onClick={() => inventoryApi.reports.exportPdf()}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            Download Stock Summary PDF
          </button>
        </div>
      </section>
    </div>
  );
}
