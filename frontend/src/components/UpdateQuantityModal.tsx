import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import type { TileProduct, AvailableStockResponse } from '../types/inventory';

type OpType = 'receive' | 'dispatch' | 'adjust' | 'transfer';

const tabs: { key: OpType; label: string }[] = [
  { key: 'receive', label: 'Receive' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'adjust', label: 'Adjust' },
  { key: 'transfer', label: 'Transfer' },
];

const locations = ['WH-A', 'WH-B', 'WH-C', 'RECEIVING'];

export function UpdateQuantityModal({
  tile,
  stock,
  onClose,
}: {
  tile: TileProduct;
  stock: AvailableStockResponse | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OpType>('receive');
  const [error, setError] = useState<string | null>(null);

  // Receive form
  const [batchNumber, setBatchNumber] = useState('');
  const [prodDate, setProdDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [rcvCartons, setRcvCartons] = useState(0);
  const [rcvLoose, setRcvLoose] = useState(0);
  const [rcvLocation, setRcvLocation] = useState('RECEIVING');
  const [rcvRef, setRcvRef] = useState('');

  // Dispatch form
  const [dispatchBatch, setDispatchBatch] = useState('');
  const [dispCartons, setDispCartons] = useState(0);
  const [dispLoose, setDispLoose] = useState(0);
  const [dispLocation, setDispLocation] = useState('');
  const [dispRef, setDispRef] = useState('');

  // Adjust form
  const [adjBatch, setAdjBatch] = useState('');
  const [adjLocation, setAdjLocation] = useState('');
  const [adjCartons, setAdjCartons] = useState(0);
  const [adjLoose, setAdjLoose] = useState(0);
  const [adjReason, setAdjReason] = useState('');

  // Transfer form
  const [trBatch, setTrBatch] = useState('');
  const [trFrom, setTrFrom] = useState('');
  const [trTo, setTrTo] = useState('');
  const [trCartons, setTrCartons] = useState(0);
  const [trLoose, setTrLoose] = useState(0);
  const [trRef, setTrRef] = useState('');

  const { data: batchesData } = useQuery({
    queryKey: [...INVENTORY_KEYS.batches(), 'for-tile', tile.id],
    queryFn: () => inventoryApi.batches.list(),
  });
  const tileBatches = (batchesData?.results ?? []).filter(b => b.tile === tile.id && b.is_active);

  const receiveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryApi.operations.receive>[0]) =>
      inventoryApi.operations.receive(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.stock(), 'available', tile.id] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const dispatchMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryApi.operations.dispatch>[0]) =>
      inventoryApi.operations.dispatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.stock(), 'available', tile.id] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryApi.operations.adjust>[0]) =>
      inventoryApi.operations.adjust(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.stock(), 'available', tile.id] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const transferMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryApi.operations.transfer>[0]) =>
      inventoryApi.operations.transfer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.stock(), 'available', tile.id] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isSaving = receiveMutation.isPending || dispatchMutation.isPending || adjustMutation.isPending || transferMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    switch (tab) {
      case 'receive':
        if (!batchNumber || !prodDate || !supplier) { setError('Batch number, production date, and supplier are required.'); return; }
        if (rcvCartons <= 0 && rcvLoose <= 0) { setError('At least one carton or loose piece required.'); return; }
        receiveMutation.mutate({
          tile_id: tile.id,
          batch_number: batchNumber,
          production_date: prodDate,
          supplier,
          cartons: rcvCartons,
          loose_pieces: rcvLoose,
          location: rcvLocation,
          reference: rcvRef || undefined,
        });
        break;
      case 'dispatch':
        if (!dispatchBatch) { setError('Select a batch.'); return; }
        if (dispCartons <= 0 && dispLoose <= 0) { setError('At least one carton or loose piece required.'); return; }
        dispatchMutation.mutate({
          tile_id: tile.id,
          batch_id: dispatchBatch,
          cartons: dispCartons,
          loose_pieces: dispLoose,
          location: dispLocation,
          reference: dispRef || undefined,
        });
        break;
      case 'adjust':
        if (!adjBatch) { setError('Select a batch.'); return; }
        if (adjCartons < 0 || adjLoose < 0) { setError('Cartons and loose pieces cannot be negative.'); return; }
        if (!adjReason) { setError('Reason is required for adjustment.'); return; }
        adjustMutation.mutate({
          tile_id: tile.id,
          batch_id: adjBatch,
          location: adjLocation,
          new_cartons: adjCartons,
          new_loose_pieces: adjLoose,
          reason: adjReason,
        });
        break;
      case 'transfer':
        if (!trBatch) { setError('Select a batch.'); return; }
        if (!trFrom || !trTo) { setError('Select both source and destination locations.'); return; }
        if (trFrom === trTo) { setError('Source and destination must be different.'); return; }
        if (trCartons <= 0 && trLoose <= 0) { setError('At least one carton or loose piece required.'); return; }
        transferMutation.mutate({
          tile_id: tile.id,
          batch_id: trBatch,
          from_location: trFrom,
          to_location: trTo,
          cartons: trCartons,
          loose_pieces: trLoose,
          reference: trRef || undefined,
        });
        break;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="rounded-xl border bg-card p-6 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Update Quantity</h3>
          <span className="text-sm text-muted-foreground">{tile.sku}</span>
        </div>

        {/* Current stock summary */}
        {stock && (
          <div className="bg-[#F7F7F7] dark:bg-muted/30 rounded-lg p-3 mb-4 flex gap-4 text-sm">
            <span>On hand: <strong>{stock.total_pieces}</strong></span>
            <span>Cartons: <strong>{stock.total_cartons}</strong></span>
            <span>Loose: <strong>{stock.total_loose_pieces}</strong></span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Receive form */}
          {tab === 'receive' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Batch Number</label>
                  <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Production Date</label>
                  <input type="date" value={prodDate} onChange={e => setProdDate(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Supplier</label>
                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Cartons</label>
                  <input type="number" min={0} value={rcvCartons} onChange={e => setRcvCartons(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Loose Pieces</label>
                  <input type="number" min={0} value={rcvLoose} onChange={e => setRcvLoose(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Location</label>
                <select value={rcvLocation} onChange={e => setRcvLocation(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reference (optional)</label>
                <input type="text" value={rcvRef} onChange={e => setRcvRef(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>
          )}

          {/* Dispatch form */}
          {tab === 'dispatch' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Batch</label>
                <select value={dispatchBatch} onChange={e => setDispatchBatch(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select batch</option>
                  {tileBatches.map(b => <option key={b.id} value={b.id}>{b.batch_number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Cartons</label>
                  <input type="number" min={0} value={dispCartons} onChange={e => setDispCartons(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Loose Pieces</label>
                  <input type="number" min={0} value={dispLoose} onChange={e => setDispLoose(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Location</label>
                <select value={dispLocation} onChange={e => setDispLocation(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select location</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reference (optional)</label>
                <input type="text" value={dispRef} onChange={e => setDispRef(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>
          )}

          {/* Adjust form */}
          {tab === 'adjust' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Batch</label>
                <select value={adjBatch} onChange={e => setAdjBatch(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select batch</option>
                  {tileBatches.map(b => <option key={b.id} value={b.id}>{b.batch_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Location</label>
                <select value={adjLocation} onChange={e => setAdjLocation(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select location</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">New Cartons</label>
                  <input type="number" min={0} value={adjCartons} onChange={e => setAdjCartons(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">New Loose Pieces</label>
                  <input type="number" min={0} value={adjLoose} onChange={e => setAdjLoose(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reason</label>
                <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
            </>
          )}

          {/* Transfer form */}
          {tab === 'transfer' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Batch</label>
                <select value={trBatch} onChange={e => setTrBatch(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select batch</option>
                  {tileBatches.map(b => <option key={b.id} value={b.id}>{b.batch_number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">From</label>
                  <select value={trFrom} onChange={e => setTrFrom(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                    <option value="">Select source</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">To</label>
                  <select value={trTo} onChange={e => setTrTo(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                    <option value="">Select destination</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Cartons</label>
                  <input type="number" min={0} value={trCartons} onChange={e => setTrCartons(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Loose Pieces</label>
                  <input type="number" min={0} value={trLoose} onChange={e => setTrLoose(Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reference (optional)</label>
                <input type="text" value={trRef} onChange={e => setTrRef(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t mt-4">
            <button type="button" onClick={onClose} className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? 'Processing...' : tab === 'receive' ? 'Receive' : tab === 'dispatch' ? 'Dispatch' : tab === 'adjust' ? 'Adjust' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
