import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
} from '../hooks/useInventoryQueries';
import type { SalesOrder, OrderStatus } from '../types/inventory';

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
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm
          </button>
          <button
            onClick={() => cancelMutation.mutate(order.id)}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel
          </button>
        </>
      )}
      {order.status === 'CONFIRMED' && (
        <>
          <button
            onClick={() => shipMutation.mutate(order.id)}
            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Ship
          </button>
          <button
            onClick={() => cancelMutation.mutate(order.id)}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

function SalesOrdersView() {
  const { data, isLoading } = useSalesOrdersList();
  if (isLoading) return <div className="text-gray-500">Loading sales orders...</div>;
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
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{order.order_number}</td>
              <td className="py-2">{order.customer_name}</td>
              <td className="py-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="py-2 text-sm text-gray-500">{new Date(order.order_date).toLocaleDateString()}</td>
              <td className="py-2 text-right font-semibold">${Number(order.total_amount).toFixed(2)}</td>
              <td className="py-2"><SalesOrderActions order={order} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseOrdersView() {
  const { data, isLoading } = usePurchaseOrdersList();
  if (isLoading) return <div className="text-gray-500">Loading purchase orders...</div>;
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
            <th className="text-left py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-8 text-gray-400">No purchase orders</td></tr>
          ) : orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
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
              <td className="py-2 text-sm text-gray-500 truncate max-w-[200px]">{order.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const createSalesOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  tile_id: z.string().min(1, 'Tile is required'),
  cartons: z.coerce.number().int().min(0).default(0),
  loose_pieces: z.coerce.number().int().min(0).default(0),
  unit_price: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

function NewSalesOrderForm() {
  const { data: customers } = useCustomersList();
  const { data: tiles } = useTilesList();
  const createMutation = useCreateSalesOrder();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createSalesOrderSchema),
  });

  const onSubmit = (data: any) => {
    createMutation.mutate({
      customer_id: data.customer_id,
      notes: data.notes,
      items: [{ tile_id: data.tile_id, cartons: data.cartons, loose_pieces: data.loose_pieces, unit_price: data.unit_price }],
    }, { onSuccess: () => reset() });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
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
      <div>
        <label className="block mb-1">Customer</label>
        <select {...register('customer_id')} className="w-full border rounded px-3 py-2">
          <option value="">Select customer...</option>
          {customers?.results?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.customer_id && <span className="text-red-500 text-sm">{errors.customer_id.message as string}</span>}
      </div>
      <div>
        <label className="block mb-1">Tile</label>
        <select {...register('tile_id')} className="w-full border rounded px-3 py-2">
          <option value="">Select tile...</option>
          {tiles?.results?.map((t: any) => (
            <option key={t.id} value={t.id}>{t.sku} - {t.name}</option>
          ))}
        </select>
        {errors.tile_id && <span className="text-red-500 text-sm">{errors.tile_id.message as string}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Cartons</label>
          <input {...register('cartons')} type="number" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Loose Pieces</label>
          <input {...register('loose_pieces')} type="number" className="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block mb-1">Unit Price ($)</label>
        <input {...register('unit_price')} type="number" step="0.01" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Notes</label>
        <textarea {...register('notes')} className="w-full border rounded px-3 py-2" rows={2} />
      </div>
      <button type="submit" disabled={createMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {createMutation.isPending ? 'Creating...' : 'Create Sales Order'}
      </button>
    </form>
  );
}

const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  tile_id: z.string().min(1, 'Tile is required'),
  cartons: z.coerce.number().int().min(0).default(0),
  loose_pieces: z.coerce.number().int().min(0).default(0),
  unit_price: z.coerce.number().min(0).default(0),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
});

function NewPurchaseOrderForm() {
  const { data: suppliers } = useSuppliersList();
  const { data: tiles } = useTilesList();
  const createMutation = useCreatePurchaseOrder();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createPurchaseOrderSchema),
  });

  const onSubmit = (data: any) => {
    createMutation.mutate({
      supplier_id: data.supplier_id,
      expected_date: data.expected_date || undefined,
      notes: data.notes,
      items: [{ tile_id: data.tile_id, cartons: data.cartons, loose_pieces: data.loose_pieces, unit_price: data.unit_price }],
    }, { onSuccess: () => reset() });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
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
      <div>
        <label className="block mb-1">Supplier</label>
        <select {...register('supplier_id')} className="w-full border rounded px-3 py-2">
          <option value="">Select supplier...</option>
          {suppliers?.results?.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {errors.supplier_id && <span className="text-red-500 text-sm">{errors.supplier_id.message as string}</span>}
      </div>
      <div>
        <label className="block mb-1">Tile</label>
        <select {...register('tile_id')} className="w-full border rounded px-3 py-2">
          <option value="">Select tile...</option>
          {tiles?.results?.map((t: any) => (
            <option key={t.id} value={t.id}>{t.sku} - {t.name}</option>
          ))}
        </select>
        {errors.tile_id && <span className="text-red-500 text-sm">{errors.tile_id.message as string}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Cartons</label>
          <input {...register('cartons')} type="number" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1">Loose Pieces</label>
          <input {...register('loose_pieces')} type="number" className="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block mb-1">Unit Price ($)</label>
        <input {...register('unit_price')} type="number" step="0.01" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Expected Date</label>
        <input {...register('expected_date')} type="date" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Notes</label>
        <textarea {...register('notes')} className="w-full border rounded px-3 py-2" rows={2} />
      </div>
      <button type="submit" disabled={createMutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
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
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
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
