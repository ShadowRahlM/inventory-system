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
          <button
            onClick={() => confirmMutation.mutate(order.id)}
            disabled={confirmMutation.isPending}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmMutation.isPending ? '...' : 'Confirm'}
          </button>
          <button
            onClick={() => cancelMutation.mutate(order.id)}
            disabled={cancelMutation.isPending}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelMutation.isPending ? '...' : 'Cancel'}
          </button>
        </>
      )}
      {order.status === 'CONFIRMED' && (
        <>
          <button
            onClick={() => shipMutation.mutate(order.id)}
            disabled={shipMutation.isPending}
            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-accent/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shipMutation.isPending ? '...' : 'Ship'}
          </button>
          <button
            onClick={() => cancelMutation.mutate(order.id)}
            disabled={cancelMutation.isPending}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
        <button
          onClick={() => confirmMutation.mutate(order.id)}
          disabled={confirmMutation.isPending}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirmMutation.isPending ? '...' : 'Confirm'}
        </button>
      )}
      {order.status === 'CONFIRMED' && (
        <button
          onClick={() => receiveMutation.mutate(order.id)}
          disabled={receiveMutation.isPending}
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-600 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {receiveMutation.isPending ? '...' : 'Receive'}
        </button>
      )}
    </div>
  );
}

function SalesOrdersView() {
  const { data, isLoading, isError, error } = useSalesOrdersList();
  if (isLoading) return <div className="text-gray-500">Loading sales orders...</div>;
  if (isError) return <div className="text-red-500">Failed to load sales orders: {error?.message}</div>;
  const orders = data?.results ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Order #</th>
            <th className="text-left py-2">Customer</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">Date</th>
            <th className="text-right py-2">Total</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-8 text-gray-400">No sales orders</td></tr>
          ) : orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors duration-150">
              <td className="py-2 font-medium">{order.order_number}</td>
              <td className="py-2">{order.customer_name}</td>
              <td className="py-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="py-2 text-sm text-gray-500">{new Date(order.order_date).toLocaleDateString()}</td>
              <td className="py-2 text-right font-semibold">UGX {Number(order.total_amount).toLocaleString()}</td>
              <td className="py-2"><SalesOrderActions order={order} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseOrdersView() {
  const { data, isLoading, isError, error } = usePurchaseOrdersList();
  if (isLoading) return <div className="text-gray-500">Loading purchase orders...</div>;
  if (isError) return <div className="text-red-500">Failed to load purchase orders: {error?.message}</div>;
  const orders = data?.results ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Order #</th>
            <th className="text-left py-2">Supplier</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">Order Date</th>
            <th className="text-left py-2">Expected</th>
            <th className="text-right py-2">Total</th>
            <th className="text-left py-2">Notes</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr><td colSpan={8} className="text-center py-8 text-gray-400">No purchase orders</td></tr>
          ) : orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors duration-150">
              <td className="py-2 font-medium">{order.order_number}</td>
              <td className="py-2">{order.supplier_name}</td>
              <td className="py-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="py-2 text-sm text-gray-500">{new Date(order.order_date).toLocaleDateString()}</td>
              <td className="py-2 text-sm text-gray-500">
                {order.expected_date ? new Date(order.expected_date).toLocaleDateString() : '-'}
              </td>
              <td className="py-2 text-right font-semibold">UGX {Number(order.total_amount).toLocaleString()}</td>
              <td className="py-2 text-sm text-gray-500 truncate max-w-[200px]">{order.notes || '-'}</td>
              <td className="py-2"><PurchaseOrderActions order={order} /></td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <Controller
          name={`items.${index}.tile_id`}
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label=""
              options={tileOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Tile..."
            />
          )}
        />
      </div>
      <Controller name={`items.${index}.cartons`} control={control} render={({ field }) => (
        <input value={field.value as number} onChange={field.onChange} type="number" className="w-16 border rounded px-2 py-2 text-sm" placeholder="Ctns" />
      )} />
      <Controller name={`items.${index}.loose_pieces`} control={control} render={({ field }) => (
        <input value={field.value as number} onChange={field.onChange} type="number" className="w-16 border rounded px-2 py-2 text-sm" placeholder="Lse" />
      )} />
      <Controller name={`items.${index}.unit_price`} control={control} render={({ field }) => (
        <input value={field.value as number} onChange={field.onChange} type="number" step="1" className="w-24 border rounded px-2 py-2 text-sm" placeholder="Price" />
      )} />
      {!isOnly && (
        <button type="button" onClick={remove} className="px-2 py-2 text-red-500 hover:text-red-700 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-lg">&times;</button>
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
        tile_id: item.tile_id,
        cartons: item.cartons,
        loose_pieces: item.loose_pieces,
        unit_price: item.unit_price,
      })),
    }, { onSuccess: () => reset() });
  }, [createMutation, reset]);

  const customerOptions = (customers?.results ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  const tileOptions = (tiles?.results ?? []).map((t: any) => ({ value: t.id, label: `${t.sku} — ${t.name}` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Create Sales Order</h2>
      {createMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {createMutation.error?.message ?? 'Error creating order'}
        </div>
      )}
      {createMutation.isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Sales order created!
        </div>
      )}
      <Controller
        name="customer_id"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label="Customer"
            options={customerOptions}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Search customer..."
            error={errors.customer_id?.message as string}
          />
        )}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Items</label>
          <button type="button" onClick={() => append({ tile_id: '', cartons: 0, loose_pieces: 0, unit_price: 0 })}
            className="text-sm text-blue-600 hover:text-blue-800 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">+ Add Item</button>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 text-xs text-gray-500 px-2">
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
        {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items.message ?? errors.items.root?.message}</p>}
      </div>

      <div className="text-right text-lg font-bold">Total: UGX {total.toLocaleString()}</div>

      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
        <Controller name="notes" control={control} render={({ field }) => (
          <textarea value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} className="w-full border rounded px-3 py-2 text-sm" rows={2} />
        )} />
      </div>
      <button type="submit" disabled={createMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
        tile_id: item.tile_id,
        cartons: item.cartons,
        loose_pieces: item.loose_pieces,
        unit_price: item.unit_price,
      })),
    }, { onSuccess: () => reset() });
  }, [createMutation, reset]);

  const supplierOptions = (suppliers?.results ?? []).map((s: any) => ({ value: s.id, label: s.name }));
  const tileOptions = (tiles?.results ?? []).map((t: any) => ({ value: t.id, label: `${t.sku} — ${t.name}` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
      {createMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {createMutation.error?.message ?? 'Error creating order'}
        </div>
      )}
      {createMutation.isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Purchase order created!
        </div>
      )}
      <Controller
        name="supplier_id"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label="Supplier"
            options={supplierOptions}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Search supplier..."
            error={errors.supplier_id?.message as string}
          />
        )}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Items</label>
          <button type="button" onClick={() => append({ tile_id: '', cartons: 0, loose_pieces: 0, unit_price: 0 })}
            className="text-sm text-blue-600 hover:text-blue-800 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">+ Add Item</button>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 text-xs text-gray-500 px-2">
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
        {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items.message ?? errors.items.root?.message}</p>}
      </div>

      <div className="text-right text-lg font-bold">Total: UGX {total.toLocaleString()}</div>

      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700">Expected Date</label>
        <Controller name="expected_date" control={control} render={({ field }) => (
          <input value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} type="date" className="w-full border rounded px-3 py-2 text-sm" />
        )} />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
        <Controller name="notes" control={control} render={({ field }) => (
          <textarea value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} className="w-full border rounded px-3 py-2 text-sm" rows={2} />
        )} />
      </div>
      <button type="submit" disabled={createMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>
      <div className="border-b mb-6 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeTab === tab
                ? 'bg-white border-l border-t border-r border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow border p-6">
        {tabComponents[activeTab]}
      </div>
    </div>
  );
}
