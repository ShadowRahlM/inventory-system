import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { useSalesOrdersList, usePurchaseOrdersList } from '../hooks/useInventoryQueries';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import type { TileProduct } from '../types/inventory';
import { LowStockAlerts } from './LowStockAlerts';
import { Link } from 'react-router-dom';
import { PageHeader } from './ui/PageHeader';

export function Dashboard() {
  const [search, setSearch] = useState('');

  const { data: tiles, isLoading: tilesLoading, isError: tilesError } = useQuery({
    queryKey: INVENTORY_KEYS.tiles(),
    queryFn: () => inventoryApi.tiles.list(),
  });

  const { data: searchResults, isError: searchError } = useQuery({
    queryKey: [...INVENTORY_KEYS.tiles(), 'search', search],
    queryFn: () => inventoryApi.tiles.list({ search }),
    enabled: search.trim().length > 0,
  });

  const { data: stockSummary, isLoading: stockLoading, isError: stockError } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'summary'],
    queryFn: () => inventoryApi.reports.stockSummary(),
  });

  const { data: inventory, isError: inventoryError } = useQuery({
    queryKey: INVENTORY_KEYS.stock(),
    queryFn: () => inventoryApi.stock.list(),
  });

  const { data: salesOrders, isLoading: salesLoading, isError: salesError } = useSalesOrdersList();
  const { data: purchaseOrders, isLoading: poLoading, isError: poError } = usePurchaseOrdersList();

  const filteredTiles = searchResults?.results ?? [];
  const totalTiles = stockSummary?.total_tiles ?? tiles?.count ?? 0;
  const totalPieces = stockSummary?.total_pieces ?? 0;

  const pendingSales = (salesOrders?.results ?? []).filter(
    (o) => o.status === 'DRAFT' || o.status === 'CONFIRMED'
  ).length;
  const pendingPOs = (purchaseOrders?.results ?? []).filter(
    (o) => o.status === 'DRAFT' || o.status === 'CONFIRMED'
  ).length;

  function SummaryCard({ title, value, color, isLoading, error }: {
    title: string; value: string | number; color: string; isLoading?: boolean; error?: boolean;
  }) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
        {isLoading ? (
          <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load</p>
        ) : (
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" description="Overview of your inventory system" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <SummaryCard
          title="Total Tiles"
          value={totalTiles}
          color="text-primary"
          isLoading={tilesLoading}
        />
        <SummaryCard
          title="Stock Items"
          value={stockSummary?.total_batches ?? '-'}
          color="text-green-600"
          isLoading={stockLoading}
          error={stockError}
        />
        <SummaryCard
          title="Total Pieces"
          value={totalPieces}
          color="text-purple-600"
          isLoading={stockLoading}
          error={stockError}
        />
        <SummaryCard
          title="Pending Orders"
          value={pendingSales + pendingPOs}
          color="text-amber-600"
          isLoading={salesLoading || poLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Link to="/orders" className="block">
          <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending Sales Orders</h3>
            {salesLoading ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : salesError ? (
              <p className="text-sm text-destructive">Failed to load</p>
            ) : (
              <p className={`text-3xl font-bold ${pendingSales > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {pendingSales}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">DRAFT + CONFIRMED</p>
          </div>
        </Link>
        <Link to="/orders" className="block">
          <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending Purchase Orders</h3>
            {poLoading ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            ) : poError ? (
              <p className="text-sm text-destructive">Failed to load</p>
            ) : (
              <p className={`text-3xl font-bold ${pendingPOs > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {pendingPOs}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">DRAFT + CONFIRMED</p>
          </div>
        </Link>
      </div>

      <div className="mb-8">
        <LowStockAlerts compact />
      </div>

      <div className="rounded-lg border bg-card p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-lg font-semibold">Search Tiles</h2>
          <input
            type="text"
            placeholder="Search by SKU, name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>

        {tilesError && !search.trim() && (
          <p className="text-destructive text-sm py-2">Failed to load tiles</p>
        )}

        {searchError && (
          <p className="text-destructive text-sm py-2">Search failed — try again</p>
        )}

        {search.trim() && !searchError && (
          <div>
            {filteredTiles.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No tiles match your search</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredTiles.map((tile: TileProduct) => (
                  <div key={tile.id} className="border rounded-lg overflow-hidden bg-muted/30 hover:shadow-md transition-shadow">
                    {tile.image ? (
                      <img
                        src={tile.image}
                        alt={tile.sku}
                        className="w-full h-28 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-28 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                    <div className="p-2">
                      <div className="text-xs font-bold text-primary truncate flex items-center gap-1">
                        {tile.sku}
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(tile.sku + ' tile')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          title="Search on Google"
                        >
                          🔍
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{tile.name}</div>
                      <div className="text-xs text-muted-foreground/60">{tile.dimensions} · {tile.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-6">Recent Inventory Items</h2>
        {stockLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
          </div>
        ) : inventoryError ? (
          <p className="text-destructive text-sm py-4 text-center">Failed to load inventory data</p>
        ) : !inventory?.results?.length ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No inventory data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Tile</th>
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Batch</th>
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Cartons</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Loose</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.results?.slice(0, 5).map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 text-sm">{item.tile_sku}</td>
                    <td className="py-2 text-sm">{item.batch_number}</td>
                    <td className="py-2 text-sm">{item.location}</td>
                    <td className="py-2 text-sm text-right">{item.cartons}</td>
                    <td className="py-2 text-sm text-right">{item.loose_pieces}</td>
                    <td className="py-2 text-sm font-medium text-right">{item.total_pieces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
