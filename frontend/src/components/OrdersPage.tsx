import { useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useSalesOrdersList,
  usePurchaseOrdersList,
  useCustomersList,
  useSuppliersList,
  useTilesList,
  useCreateSalesOrder,
  useCreatePurchaseOrder,
  useConfirmSalesOrder,
  useShipSalesOrder,
  useCancelSalesOrder,
  useConfirmPurchaseOrder,
  useReceivePurchaseOrder,
} from '../hooks/useInventoryQueries';
import type { SalesOrder, PurchaseOrder as PurchaseOrderType, OrderStatus } from '../types/inventory';
import { SearchableSelect } from './SearchableSelect';
import { PageHeader } from './ui/PageHeader';

type Tab = 'Sales Orders' | 'Purchase Orders' | 'New Sales Order' | 'New Purchase Order';
const tabs: Tab[] = ['Sales Orders', 'Purchase Orders', 'New Sales Order', 'New Purchase Order'];

const statusColors: Record<OrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function SalesOrderActions({ order }: { order: SalesOrder }) {
  const confirmMutation = useConfirmSalesOrder();
  const shipMutation = useShipSalesOrder();
  const cancelMutation = useCancelSalesOrder();

  return (
    <div className="flex gap-1">
      {order.status === 'DRAFT' && (
        <>
          <button onClick={() => confirmMutation.mutate(order.id)} disabled={confirmMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {confirmMutation.isPending ? '...' : 'Confirm'}
          </button>
          <button onClick={() => cancelMutation.mutate(order.id)} disabled={cancelMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {cancelMutation.isPending ? '...' : 'Cancel'}
          </button>
        </>
      )}
      {order.status === 'CONFIRMED' && (
        <>
          <button onClick={() => shipMutation.mutate(order.id)} disabled={shipMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {shipMutation.isPending ? '...' : 'Ship'}
          </button>
          <button onClick={() => cancelMutation.mutate(order.id)} disabled={cancelMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {cancelMutation.isPending ? '...' : 'Cancel'}
          </button>
        </>
      )}
    </div>
  );
}

function PurchaseOrderActions({ order }: { order: PurchaseOrderType }) {
  const confirmMutation = useConfirmPurchaseOrder();
  const receiveMutation = useReceivePurchaseOrder();

  return (
    <div className="flex gap-1">
      {order.status === 'DRAFT' && (
        <button onClick={() => confirmMutation.mutate(order.id)} disabled={confirmMutation.isPending}
          className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {confirmMutation.isPending ? '...' : 'Confirm'}
        </button>
      )}
      {order.status === 'CONFIRMED' && (
        <button onClick={() => receiveMutation.mutate(order.id)} disabled={receiveMutation.isPending}
          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {receiveMutation.isPending ? '...' : 'Receive'}
        </button>
      )}
    </div>
  );
}

function SalesOrdersView() {
  const { data, isLoading, isError, error } = useSalesOrdersList();
  const orders = data?.results ?? [];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) { counts[o.status] = (counts[o.status] ?? 0) + 1; }
    return counts;
  }, [orders]);

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Loading sales orders...</div>;
  if (isError) return <div className="text-destructive text-center py-8">Failed: {error?.message}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        {(['DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map(s => (
          <div key={s} className={`rounded-xl p-4 border shadow-sm ${s === 'CANCELLED' ? 'bg-red-50' : 'bg-[#F7F7F7] dark:bg-muted/30'}`}>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusColors[s]}`}>{s}</span>
            <p className="text-xl font-bold mt-2">{statusCounts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Sales Orders</h3>
          <span className="text-xs text-muted-foreground">{orders.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                <th className="text-left py-3 px-4 text-sm font-semibold">Order #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No sales orders</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium">{order.order_number}</td>
                  <td className="py-3 px-4 text-sm">{order.customer_name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(order.order_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">UGX {Number(order.total_amount).toLocaleString()}</td>
                  <td className="py-3 px-4"><SalesOrderActions order={order} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PurchaseOrdersView() {
  const { data, isLoading, isError, error } = usePurchaseOrdersList();
  const orders = data?.results ?? [];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) { counts[o.status] = (counts[o.status] ?? 0) + 1; }
    return counts;
  }, [orders]);

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Loading purchase orders...</div>;
  if (isError) return <div className="text-destructive text-center py-8">Failed: {error?.message}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        {(['DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map(s => (
          <div key={s} className={`rounded-xl p-4 border shadow-sm ${s === 'CANCELLED' ? 'bg-red-50' : 'bg-[#F7F7F7] dark:bg-muted/30'}`}>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusColors[s]}`}>{s}</span>
            <p className="text-xl font-bold mt-2">{statusCounts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Purchase Orders</h3>
          <span className="text-xs text-muted-foreground">{orders.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-[#F7F7F7] dark:bg-muted/30">
                <th className="text-left py-3 px-4 text-sm font-semibold">Order #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Supplier</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Order Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Expected</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No purchase orders</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium">{order.order_number}</td>
                  <td className="py-3 px-4 text-sm">{order.supplier_name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(order.order_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {order.expected_date ? new Date(order.expected_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">UGX {Number(order.total_amount).toLocaleString()}</td>
                  <td className="py-3 px-4"><PurchaseOrderActions order={order} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const itemSchema = z.object({
  tile_id: z.string().min(1, 'Tile is required'),
  cartons: z.coerce.number().int().min(0).default(0),
  loose_pieces: z.coerce.number().int().min(0).default(0),
  unit_price: z.coerce.number().int().min(0).default(0),
});

const createSalesOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

function SalesOrderLineItemRow({ index, control, tileOptions, remove, isOnly }: {
  index: number;
  control: any;
  tileOptions: { value: string; label: string }[];
  remove: () => void;
  isOnly: boolean;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 min-w-0">
        <Controller name={`items.${index}.tile_id`} control={control}
          render={({ field }) => (
            <SearchableSelect label="" options={tileOptions} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Tile..." />
          )} />
      </div>
      <Controller name={`items.${index}.cartons`} control={control} render={({ field }) => (
        <input value={field.value as number} onChange={field.onChange} type="number" className="w-16 rounded-md border bg-background px-2 py-2 text-sm" placeholder="Ctns" />
      )} />
      <Controller name={`items.${index}.loose_pieces`} control={control} render={({ field }) => (
        <input value={field.value as number} onChange={field.onChange} type="number" className="w-16 rounded-md border bg-background px-2 py-2 text-sm" placeholder="Lse" />
      )} />
      <Controller name={`items.${index}.unit_price`} control={control} render={({ field }) => (
        <input value={field.value as number} onChange={field.onChange} type="number" step="1" className="w-24 rounded-md border bg-background px-2 py-2 text-sm" placeholder="Price" />
      )} />
      {!isOnly && (
        <button type="button" onClick={remove} className="px-2 py-2 text-destructive hover:text-destructive/80 text-lg">&times;</button>
      )}
    </div>
  );
}

function NewSalesOrderForm() {
  const { data: customers } = useCustomersList();
  const { data: tiles } = useTilesList();
  const createMutation = useCreateSalesOrder();
  const { control, handleSubmit, reset, formState: { errors }, watch } = useForm({
    resolver: zodResolver(createSalesOrderSchema),
    defaultValues: { customer_id: '', items: [{ tile_id: '', cartons: 0, loose_pieces: 0, unit_price: 0 }], notes: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const total = useMemo(() => {
    const pcsMap = new Map((tiles?.results ?? []).map((t: any) => [t.id, t.pieces_per_carton]));
    return (watchedItems ?? []).reduce((sum: number, item: any) => {
      const pcs = pcsMap.get(item.tile_id) ?? 1;
      return sum + ((item.cartons ?? 0) * pcs + (item.loose_pieces ?? 0)) * (item.unit_price ?? 0);
    }, 0);
  }, [watchedItems, tiles]);

  const onSubmit = useCallback((data: any) => {
    createMutation.mutate({
      customer_id: data.customer_id,
      notes: data.notes,
      items: data.items.map((item: any) => ({
        tile_id: item.tile_id, cartons: item.cartons, loose_pieces: item.loose_pieces, unit_price: item.unit_price,
      })),
    }, { onSuccess: () => reset() });
  }, [createMutation, reset]);

  const customerOptions = (customers?.results ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  const tileOptions = (tiles?.results ?? []).map((t: any) => ({ value: t.id, label: `${t.sku} — ${t.name}` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Create Sales Order</h3>
      {createMutation.isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">{createMutation.error?.message ?? 'Error'}</div>
      )}
      {createMutation.isSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">Sales order created!</div>
      )}
      <Controller name="customer_id" control={control} render={({ field }) => (
        <SearchableSelect label="Customer" options={customerOptions} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Search customer..." error={errors.customer_id?.message as string} />
      )} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Items</label>
          <button type="button" onClick={() => append({ tile_id: '', cartons: 0, loose_pieces: 0, unit_price: 0 })}
            className="text-sm text-primary hover:underline">+ Add Item</button>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 text-xs text-muted-foreground px-2">
            <div className="flex-1">Tile</div>
            <div className="w-16 text-center">Ctns</div>
            <div className="w-16 text-center">Lse</div>
            <div className="w-24 text-center">Price</div>
            <div className="w-8" />
          </div>
          {fields.map((field, index) => (
            <SalesOrderLineItemRow key={field.id} index={index} control={control} tileOptions={tileOptions} remove={() => remove(index)} isOnly={fields.length === 1} />
          ))}
        </div>
        {errors.items && <p className="text-xs text-destructive mt-1">{errors.items.message ?? errors.items.root?.message}</p>}
      </div>

      <div className="text-right text-lg font-bold">Total: UGX {total.toLocaleString()}</div>

      <div>
        <label className="block mb-1 text-sm font-medium">Notes</label>
        <Controller name="notes" control={control} render={({ field }) => (
          <textarea value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} />
        )} />
      </div>
      <button type="submit" disabled={createMutation.isPending}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {createMutation.isPending ? 'Creating...' : 'Create Sales Order'}
      </button>
    </form>
  );
}

const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
});

function NewPurchaseOrderForm() {
  const { data: suppliers } = useSuppliersList();
  const { data: tiles } = useTilesList();
  const createMutation = useCreatePurchaseOrder();
  const { control, handleSubmit, reset, formState: { errors }, watch } = useForm({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: { supplier_id: '', items: [{ tile_id: '', cartons: 0, loose_pieces: 0, unit_price: 0 }], expected_date: '', notes: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const total = useMemo(() => {
    const pcsMap = new Map((tiles?.results ?? []).map((t: any) => [t.id, t.pieces_per_carton]));
    return (watchedItems ?? []).reduce((sum: number, item: any) => {
      const pcs = pcsMap.get(item.tile_id) ?? 1;
      return sum + ((item.cartons ?? 0) * pcs + (item.loose_pieces ?? 0)) * (item.unit_price ?? 0);
    }, 0);
  }, [watchedItems, tiles]);

  const onSubmit = useCallback((data: any) => {
    createMutation.mutate({
      supplier_id: data.supplier_id,
      expected_date: data.expected_date || undefined,
      notes: data.notes,
      items: data.items.map((item: any) => ({
        tile_id: item.tile_id, cartons: item.cartons, loose_pieces: item.loose_pieces, unit_price: item.unit_price,
      })),
    }, { onSuccess: () => reset() });
  }, [createMutation, reset]);

  const supplierOptions = (suppliers?.results ?? []).map((s: any) => ({ value: s.id, label: s.name }));
  const tileOptions = (tiles?.results ?? []).map((t: any) => ({ value: t.id, label: `${t.sku} — ${t.name}` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Create Purchase Order</h3>
      {createMutation.isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">{createMutation.error?.message ?? 'Error'}</div>
      )}
      {createMutation.isSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">Purchase order created!</div>
      )}
      <Controller name="supplier_id" control={control} render={({ field }) => (
        <SearchableSelect label="Supplier" options={supplierOptions} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Search supplier..." error={errors.supplier_id?.message as string} />
      )} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Items</label>
          <button type="button" onClick={() => append({ tile_id: '', cartons: 0, loose_pieces: 0, unit_price: 0 })}
            className="text-sm text-primary hover:underline">+ Add Item</button>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 text-xs text-muted-foreground px-2">
            <div className="flex-1">Tile</div>
            <div className="w-16 text-center">Ctns</div>
            <div className="w-16 text-center">Lse</div>
            <div className="w-24 text-center">Price</div>
            <div className="w-8" />
          </div>
          {fields.map((field, index) => (
            <SalesOrderLineItemRow key={field.id} index={index} control={control} tileOptions={tileOptions} remove={() => remove(index)} isOnly={fields.length === 1} />
          ))}
        </div>
        {errors.items && <p className="text-xs text-destructive mt-1">{errors.items.message ?? errors.items.root?.message}</p>}
      </div>

      <div className="text-right text-lg font-bold">Total: UGX {total.toLocaleString()}</div>

      <div>
        <label className="block mb-1 text-sm font-medium">Expected Date</label>
        <Controller name="expected_date" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        )} />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Notes</label>
        <Controller name="notes" control={control} render={({ field }) => (
          <textarea value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} />
        )} />
      </div>
      <button type="submit" disabled={createMutation.isPending}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
      </button>
    </form>
  );
}

const tabComponents: Record<Tab, React.ReactNode> = {
  'Sales Orders': <SalesOrdersView />,
  'Purchase Orders': <PurchaseOrdersView />,
  'New Sales Order': <NewSalesOrderForm />,
  'New Purchase Order': <NewPurchaseOrderForm />,
};

export function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Sales Orders');

  return (
    <div className="p-6 space-y-6 bg-[#FAFAFA] dark:bg-background min-h-screen">
      <PageHeader title="Orders" description="Manage sales orders and purchase orders" />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-[#F7F7F7] dark:bg-muted/30 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tabComponents[activeTab]}
        </div>
      </div>
    </div>
  );
}
