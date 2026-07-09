import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { useSalesOrdersList, usePurchaseOrdersList } from '../hooks/useInventoryQueries';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import type { TileProduct } from '../types/inventory';
import { LowStockAlerts } from './LowStockAlerts';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [search, setSearch] = useState('');

  const { data: tiles, isLoading: tilesLoading } = useQuery({
    queryKey: INVENTORY_KEYS.tiles(),
    queryFn: () => inventoryApi.tiles.list(),
  });

  const { data: searchResults } = useQuery({
    queryKey: [...INVENTORY_KEYS.tiles(), 'search', search],
    queryFn: () => inventoryApi.tiles.list({ search }),
    enabled: search.trim().length > 0,
  });

  const { data: stockSummary, isLoading: stockLoading, isError: stockError } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'summary'],
    queryFn: () => inventoryApi.reports.stockSummary(),
  });

  const { data: inventory } = useQuery({
    queryKey: INVENTORY_KEYS.stock(),
    queryFn: () => inventoryApi.stock.list(),
  });

  const { data: salesOrders, isLoading: salesLoading } = useSalesOrdersList();
  const { data: purchaseOrders, isLoading: poLoading } = usePurchaseOrdersList();

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
      <div className="bg-white p-8 rounded-xl shadow border">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        {isLoading ? (
          <div className="h-10 w-24 bg-gray-200 animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-red-500">Failed to load</p>
        ) : (
          <p className={`text-4xl font-bold ${color}`}>{value}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <SummaryCard
          title="Total Tiles"
          value={totalTiles}
          color="text-blue-600"
          isLoading={tilesLoading}
        />
        <SummaryCard
          title="Total Stock Items"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <Link to="/orders" className="block">
          <div className="bg-white p-8 rounded-xl shadow border hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-3">Pending Sales Orders</h3>
            {salesLoading ? (
              <div className="h-10 w-16 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className={`text-4xl font-bold ${pendingSales > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {pendingSales}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">DRAFT + CONFIRMED</p>
          </div>
        </Link>
        <Link to="/orders" className="block">
          <div className="bg-white p-8 rounded-xl shadow border hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-3">Pending Purchase Orders</h3>
            {poLoading ? (
              <div className="h-10 w-16 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className={`text-4xl font-bold ${pendingPOs > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {pendingPOs}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">DRAFT + CONFIRMED</p>
          </div>
        </Link>
      </div>

      <div className="mb-10">
        <LowStockAlerts compact />
      </div>

      <div className="bg-white p-8 rounded-xl shadow border mb-10">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">Search Tiles</h2>
          <input
            type="text"
            placeholder="Search by SKU, name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {search.trim() && (
          <div>
            {filteredTiles.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No tiles match your search</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredTiles.map((tile: TileProduct) => (
                  <div key={tile.id} className="border rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow">
                    {tile.image ? (
                      <img
                        src={tile.image}
                        alt={tile.sku}
                        className="w-full h-28 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-28 bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                    <div className="p-2">
                      <div className="text-xs font-bold text-blue-700 truncate flex items-center gap-1">
                        {tile.sku}
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(tile.sku + ' tile')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-600"
                          title="Search on Google"
                        >
                          🔍
                        </a>
                      </div>
                      <div className="text-xs text-gray-600 truncate">{tile.name}</div>
                      <div className="text-xs text-gray-400">{tile.dimensions} · {tile.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-6">Recent Inventory Items</h2>
        {stockLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : stockError ? (
          <p className="text-red-500 text-sm py-4 text-center">Failed to load inventory data</p>
        ) : !inventory?.results?.length ? (
          <p className="text-gray-500 text-sm py-4 text-center">No inventory data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Tile</th>
                  <th className="text-left py-2">Batch</th>
                  <th className="text-left py-2">Location</th>
                  <th className="text-left py-2">Cartons</th>
                  <th className="text-left py-2">Loose Pieces</th>
                  <th className="text-left py-2">Total Pieces</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.results?.slice(0, 5).map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{item.tile_sku}</td>
                    <td className="py-2">{item.batch_number}</td>
                    <td className="py-2">{item.location}</td>
                    <td className="py-2">{item.cartons}</td>
                    <td className="py-2">{item.loose_pieces}</td>
                    <td className="py-2 font-medium">{item.total_pieces}</td>
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
