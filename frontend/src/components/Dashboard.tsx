import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { useSalesOrdersList, usePurchaseOrdersList } from '../hooks/useInventoryQueries';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { Link } from 'react-router-dom';
import { PageHeader } from './ui/PageHeader';
import type { FastMover, StockByLocation } from '../types/inventory';

function SummaryCard({ title, value, subtitle, linkTo, linkLabel, color, isLoading }: {
  title: string; value: string | number; subtitle?: string; linkTo?: string; linkLabel?: string; color: string; isLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      {isLoading ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      ) : (
        <>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {linkTo && linkLabel && (
            <Link to={linkTo} className="text-xs text-primary hover:underline mt-2 inline-block">{linkLabel} →</Link>
          )}
        </>
      )}
    </div>
  );
}

function TopSellingCard({ item }: { item: FastMover }) {
  return (
    <Link to={`/tiles/${item.tile_id}`} className="block bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-4 border hover:shadow-sm transition-shadow">
      <div className="w-full h-20 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground text-xs">
        {item.tile__dimensions || 'Tile'}
      </div>
      <p className="text-sm font-semibold truncate">{item.tile__name}</p>
      <p className="text-xs text-muted-foreground">{item.tile__sku}</p>
      <p className="text-sm font-bold text-primary mt-2">{item.movement_count} movements</p>
    </Link>
  );
}

function WarehouseBar({ locations }: { locations: StockByLocation[] }) {
  if (!locations.length) return <p className="text-sm text-muted-foreground py-4 text-center">No location data</p>;
  const max = Math.max(...locations.map(l => l.total_pieces));
  return (
    <div className="space-y-4">
      {locations.map(loc => {
        const pct = max > 0 ? (loc.total_pieces / max) * 100 : 0;
        return (
          <div key={loc.location}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{loc.location}</span>
              <span className="text-muted-foreground">{loc.total_pieces} items ({loc.item_count} products)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const { data: stockSummary, isLoading: stockLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'summary'],
    queryFn: () => inventoryApi.reports.stockSummary(),
  });

  const { data: fastMovers, isLoading: moversLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.movements(), 'fast-movers', 8],
    queryFn: () => inventoryApi.reports.fastMovers(8),
  });

  const { data: locations, isLoading: locLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'by-location'],
    queryFn: () => inventoryApi.reports.stockByLocation(),
  });

  const { data: movementSummary, isLoading: mvLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.movements(), 'summary', 'week'],
    queryFn: () => inventoryApi.reports.movementSummary('week'),
  });

  const { data: salesOrders, isLoading: salesLoading } = useSalesOrdersList();
  const { data: purchaseOrders, isLoading: poLoading } = usePurchaseOrdersList();

  const toBeDelivered = (salesOrders?.results ?? []).filter(
    o => o.status === 'CONFIRMED' || o.status === 'DRAFT'
  ).length;
  const toBeOrdered = (purchaseOrders?.results ?? []).filter(
    o => o.status === 'CONFIRMED' || o.status === 'DRAFT'
  ).length;

  const topSelling = (fastMovers ?? []).slice(0, 4);
  const locationsData = locations ?? [];

  const totalReceived = movementSummary?.by_type?.find(t => t.movement_type === 'receive')?.total_pieces ?? 0;
  const totalDispatched = movementSummary?.by_type?.find(t => t.movement_type === 'dispatch')?.total_pieces ?? 0;

  return (
    <div className="p-6 space-y-8 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <PageHeader title="Dashboard" description="Overview of your inventory system" />

      {/* Row 1: Summary Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Items"
          value={stockSummary?.total_pieces ?? '-'}
          subtitle={`${stockSummary?.total_tiles ?? 0} tile types`}
          linkTo="/tiles"
          linkLabel="View detail"
          color="text-primary"
          isLoading={stockLoading}
        />
        <SummaryCard
          title="Low-Stock Alerts"
          value={stockSummary?.low_stock_count ?? '-'}
          subtitle="Items ≤ 50 pieces"
          linkTo="/low-stock"
          linkLabel="View detail"
          color="text-red-500"
          isLoading={stockLoading}
        />
        <SummaryCard
          title="To be Delivered"
          value={toBeDelivered}
          subtitle="Pending sales orders"
          linkTo="/orders"
          linkLabel="View detail"
          color="text-amber-500"
          isLoading={salesLoading}
        />
        <SummaryCard
          title="To be Ordered"
          value={toBeOrdered}
          subtitle="Pending purchase orders"
          linkTo="/orders"
          linkLabel="View detail"
          color="text-emerald-500"
          isLoading={poLoading}
        />
      </div>

      {/* Row 2: Top Selling Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Top Selling Products</h2>
          <Link to="/reports" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {moversLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-[140px] bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : topSelling.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No movement data yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topSelling.map(item => (
              <TopSellingCard key={item.tile_id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Warehouse Detail + Sales Activities */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Warehouse Detail</h2>
            <Link to="/inventory" className="text-sm text-primary hover:underline">View detail →</Link>
          </div>
          {locLoading ? (
            <div className="space-y-4">
              {[1,2].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : (
            <WarehouseBar locations={locationsData} />
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Sales Activities</h2>
            <Link to="/movements" className="text-sm text-primary hover:underline">View detail →</Link>
          </div>
          {mvLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Received</span>
                <span className="text-sm text-emerald-600 font-semibold">{totalReceived} pieces</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Dispatched</span>
                <span className="text-sm text-red-500 font-semibold">{totalDispatched} pieces</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Total Movements</span>
                <span className="text-sm text-primary font-semibold">{movementSummary?.movements?.length ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Period</span>
                <span className="text-sm text-muted-foreground">Last 7 days</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Low-Stock Items + Todo */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Low-Stock Items</h2>
            <Link to="/low-stock" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {stockSummary?.low_stock_count ?? 0} items with 50 pieces or fewer
          </p>
          <Link to="/low-stock" className="inline-flex items-center gap-1 text-sm text-red-500 hover:underline font-medium">
            Check low-stock alerts →
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="space-y-3">
            <Link to="/stock-take" className="block p-3 bg-[#F7F7F7] dark:bg-muted/30 rounded-lg hover:shadow-sm transition-shadow">
              <p className="text-sm font-medium">New Stock Take</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start counting inventory</p>
            </Link>
            <Link to="/tiles/new" className="block p-3 bg-[#F7F7F7] dark:bg-muted/30 rounded-lg hover:shadow-sm transition-shadow">
              <p className="text-sm font-medium">Add New Product</p>
              <p className="text-xs text-muted-foreground mt-0.5">Register a new tile/SKU</p>
            </Link>
            <Link to="/orders" className="block p-3 bg-[#F7F7F7] dark:bg-muted/30 rounded-lg hover:shadow-sm transition-shadow">
              <p className="text-sm font-medium">Manage Orders</p>
              <p className="text-xs text-muted-foreground mt-0.5">View sales & purchase orders</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
