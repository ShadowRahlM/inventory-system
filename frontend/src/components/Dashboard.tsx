import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import type { TileProduct } from '../types/inventory';
import { LowStockAlerts } from './LowStockAlerts';

export function Dashboard() {
  const [search, setSearch] = useState('');

  const { data: tiles } = useQuery({
    queryKey: INVENTORY_KEYS.tiles(),
    queryFn: () => inventoryApi.tiles.list(),
  });

  const { data: searchResults } = useQuery({
    queryKey: [...INVENTORY_KEYS.tiles(), 'search', search],
    queryFn: () => inventoryApi.tiles.list({ search }),
    enabled: search.trim().length > 0,
  });

  const { data: inventory } = useQuery({
    queryKey: INVENTORY_KEYS.stock(),
    queryFn: () => inventoryApi.stock.list(),
  });

  const filteredTiles = searchResults?.results ?? [];

  const totalTiles = tiles?.count ?? 0;
  const totalInventoryItems = inventory?.count ?? 0;
  const totalPieces = inventory?.results?.reduce(
    (sum: number, item: any) => sum + item.total_pieces, 0
  ) ?? 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-2">Total Tiles</h3>
          <p className="text-4xl font-bold text-blue-600">{totalTiles}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-2">Inventory Items</h3>
          <p className="text-4xl font-bold text-green-600">{totalInventoryItems}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-2">Total Pieces</h3>
          <p className="text-4xl font-bold text-purple-600">{totalPieces}</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="mb-8">
        <LowStockAlerts compact />
      </div>

      {/* Tile Search */}
      <div className="bg-white p-6 rounded-lg shadow border mb-8">
        <div className="flex items-center gap-4 mb-4">
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
                  <div key={tile.id} className="border rounded overflow-hidden bg-gray-50 hover:shadow-md transition-shadow">
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

      {/* Recent Inventory */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Recent Inventory Items</h2>
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
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.tile_sku}</td>
                  <td className="py-2">{item.batch_number}</td>
                  <td className="py-2">{item.location}</td>
                  <td className="py-2">{item.cartons}</td>
                  <td className="py-2">{item.loose_pieces}</td>
                  <td className="py-2">{item.total_pieces}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
