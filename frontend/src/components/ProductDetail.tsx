import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { PageHeader } from './ui/PageHeader';
import { UpdateQuantityModal } from './UpdateQuantityModal';
import type { MovementRecord, AvailableStockResponse } from '../types/inventory';

const movementTypeStyles: Record<string, string> = {
  RECEIVING: 'bg-green-100 text-green-700',
  DISPATCH: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-amber-100 text-amber-700',
  TRANSFER: 'bg-indigo-100 text-indigo-700',
};

function InfoRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

function StockLocationCard({ loc }: { loc: AvailableStockResponse['locations'][number] }) {
  const pct = 100; // full bar, just show relative
  return (
    <div className="bg-[#F7F7F7] dark:bg-muted/30 rounded-xl p-4 border hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-semibold">{loc.location}</span>
        <span className="text-xs text-muted-foreground">{loc.batch}</span>
      </div>
      <div className="space-y-1 mb-2">
        <div className="flex justify-between text-xs">
          <span>Total</span>
          <span className="font-semibold">{loc.total_pieces} pcs</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cartons</span>
          <span>{loc.cartons}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Loose</span>
          <span>{loc.loose_pieces}</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MovementRow({ m }: { m: MovementRecord }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${movementTypeStyles[m.movement_type] ?? 'bg-gray-100 text-gray-700'}`}>
          {m.movement_type}
        </span>
        <div>
          <p className="text-sm font-medium">{m.reference || `${m.movement_type} #${m.id.slice(0, 8)}`}</p>
          <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${m.cartons_change > 0 ? 'text-green-600' : m.cartons_change < 0 ? 'text-red-500' : ''}`}>
          {m.cartons_change > 0 ? '+' : ''}{m.cartons_change} cartons
        </p>
        <p className={`text-xs ${m.loose_pieces_change > 0 ? 'text-green-600' : m.loose_pieces_change < 0 ? 'text-red-500' : ''}`}>
          {m.loose_pieces_change > 0 ? '+' : ''}{m.loose_pieces_change} loose
        </p>
      </div>
    </div>
  );
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { data: tile, isLoading: tileLoading, error: tileError } = useQuery({
    queryKey: [...INVENTORY_KEYS.tiles(), id],
    queryFn: () => inventoryApi.tiles.get(id!),
    enabled: !!id,
  });

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.stock(), 'available', id],
    queryFn: () => inventoryApi.stock.available(id!),
    enabled: !!id,
  });

  const { data: movements, isLoading: mvLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.movements(), 'for-tile', id],
    queryFn: () => inventoryApi.movements.list({ tile: id, page_size: 10 }),
    enabled: !!id,
  });

  if (tileLoading) {
    return (
      <div className="p-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (tileError || !tile) {
    return (
      <div className="p-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
        <PageHeader title="Product not found" description="The requested tile does not exist." />
        <Link to="/tiles" className="text-sm text-primary hover:underline mt-4 inline-block">← Back to Tiles</Link>
      </div>
    );
  }

  const stockData = stock;
  const movementsData = movements?.results ?? [];
  const isLowStock = stockData && stockData.total_pieces <= 50;

  return (
    <div className="p-6 space-y-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
        ← Back
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageHeader title={tile.name} description={`SKU: ${tile.sku}`} />
          {isLowStock && (
            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full mt-1">
              Low Stock
            </span>
          )}
        </div>
        <button
          onClick={() => setShowUpdateModal(true)}
          className="bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          Update Quantity
        </button>
      </div>

      {/* Row: Info card + Stock summary */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Basic Info */}
        <div className="md:col-span-1 rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Basic Information</h3>
          <div className="w-full h-32 bg-muted rounded-xl mb-4 flex items-center justify-center text-muted-foreground text-xs">
            {tile.dimensions || tile.name}
          </div>
          <div className="space-y-0">
            <InfoRow label="SKU" value={tile.sku} />
            <InfoRow label="Brand" value={tile.brand} />
            <InfoRow label="Series" value={tile.series} />
            <InfoRow label="Tier" value={tile.tier} />
            <InfoRow label="Category" value={tile.category} />
            <InfoRow label="Dimensions" value={tile.dimensions} />
            <InfoRow label="Pieces / Carton" value={tile.pieces_per_carton} />
            <InfoRow label="Tile Type" value={tile.tile_type} />
            <InfoRow label="Finish" value={tile.finish} />
            <InfoRow label="Thickness" value={tile.thickness} />
            <InfoRow label="Use Case" value={tile.use_case} />
          </div>
        </div>

        {/* Stock Summary */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Stock Overview</h3>
            {stockLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
              </div>
            ) : stockData ? (
              <>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-4xl font-bold">{stockData.total_pieces}</span>
                  <span className="text-sm text-muted-foreground">total pieces</span>
                </div>
                <div className="flex gap-6 text-sm mb-4">
                  <div><span className="font-semibold">{stockData.total_cartons}</span> <span className="text-muted-foreground">cartons</span></div>
                  <div><span className="font-semibold">{stockData.total_loose_pieces}</span> <span className="text-muted-foreground">loose</span></div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No stock data available.</p>
            )}
          </div>

          {/* Per Location */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Stock by Location</h3>
            {stockLoading ? (
              <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
              </div>
            ) : stockData && stockData.locations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stockData.locations.map(loc => (
                  <StockLocationCard key={`${loc.location}-${loc.batch}`} loc={loc} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No stock recorded at any location.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Movements</h3>
          <Link to={`/movements?tile=${id}`} className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {mvLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        ) : movementsData.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {movementsData.map(m => <MovementRow key={m.id} m={m} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No movements recorded for this product.</p>
        )}
      </div>

      {showUpdateModal && (
        <UpdateQuantityModal
          tile={tile}
          stock={stockData ?? null}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
}
