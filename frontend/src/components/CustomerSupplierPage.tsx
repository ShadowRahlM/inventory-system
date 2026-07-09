import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS, useCustomersList, useSuppliersList } from '../hooks/useInventoryQueries';
import type { Customer, Supplier } from '../types/inventory';

type Tab = 'Customers' | 'Suppliers' | 'New Customer' | 'New Supplier';
const tabs: Tab[] = ['Customers', 'Suppliers', 'New Customer', 'New Supplier'];

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  lead_time_days: z.coerce.number().int().min(0).default(0),
});

function CustomersView() {
  const { data, isLoading, error } = useCustomersList();
  if (isLoading) return <div className="text-gray-500">Loading customers...</div>;
  if (error) return <div className="text-red-500">Failed to load customers. Please try again.</div>;
  const items = data?.results ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead><tr className="border-b">
          <th className="text-left py-2">Name</th>
          <th className="text-left py-2">Email</th>
          <th className="text-left py-2">Phone</th>
          <th className="text-left py-2">Address</th>
        </tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-8 text-gray-400">No customers</td></tr>
          ) : items.map((c: Customer) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{c.name}</td>
              <td className="py-2 text-sm">{c.email || '-'}</td>
              <td className="py-2 text-sm">{c.phone || '-'}</td>
              <td className="py-2 text-sm text-gray-500 truncate max-w-[250px]">{c.address || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuppliersView() {
  const { data, isLoading, error } = useSuppliersList();
  if (isLoading) return <div className="text-gray-500">Loading suppliers...</div>;
  if (error) return <div className="text-red-500">Failed to load suppliers. Please try again.</div>;
  const items = data?.results ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead><tr className="border-b">
          <th className="text-left py-2">Name</th>
          <th className="text-left py-2">Email</th>
          <th className="text-left py-2">Phone</th>
          <th className="text-left py-2">Lead Time</th>
          <th className="text-left py-2">Address</th>
        </tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-8 text-gray-400">No suppliers</td></tr>
          ) : items.map((s: Supplier) => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{s.name}</td>
              <td className="py-2 text-sm">{s.email || '-'}</td>
              <td className="py-2 text-sm">{s.phone || '-'}</td>
              <td className="py-2 text-sm">{s.lead_time_days} days</td>
              <td className="py-2 text-sm text-gray-500 truncate max-w-[200px]">{s.address || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewCustomerForm() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: any) => inventoryApi.customers.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.customers() }),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(customerSchema) });
  const onSubmit = (data: any) => mutation.mutate(data, { onSuccess: () => reset() });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">New Customer</h2>
      {mutation.isSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">Customer created!</div>}
      {mutation.isError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{mutation.error?.message ?? 'Failed to create customer'}</div>}
      <div>
        <label className="block mb-1">Name *</label>
        <input {...register('name')} className="w-full border rounded px-3 py-2" />
        {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
      </div>
      <div>
        <label className="block mb-1">Email</label>
        <input {...register('email')} type="email" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Phone</label>
        <input {...register('phone')} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Address</label>
        <textarea {...register('address')} className="w-full border rounded px-3 py-2" rows={2} />
      </div>
      <button type="submit" disabled={mutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {mutation.isPending ? 'Creating...' : 'Create Customer'}
      </button>
    </form>
  );
}

function NewSupplierForm() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: any) => inventoryApi.suppliers.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.suppliers() }),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(supplierSchema) });
  const onSubmit = (data: any) => mutation.mutate(data, { onSuccess: () => reset() });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <h2 className="text-xl font-bold mb-4">New Supplier</h2>
      {mutation.isSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">Supplier created!</div>}
      {mutation.isError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{mutation.error?.message ?? 'Failed to create supplier'}</div>}
      <div>
        <label className="block mb-1">Name *</label>
        <input {...register('name')} className="w-full border rounded px-3 py-2" />
        {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
      </div>
      <div>
        <label className="block mb-1">Email</label>
        <input {...register('email')} type="email" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Phone</label>
        <input {...register('phone')} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Lead Time (days)</label>
        <input {...register('lead_time_days')} type="number" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">Address</label>
        <textarea {...register('address')} className="w-full border rounded px-3 py-2" rows={2} />
      </div>
      <button type="submit" disabled={mutation.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {mutation.isPending ? 'Creating...' : 'Create Supplier'}
      </button>
    </form>
  );
}

const tabComponents: Record<Tab, React.ReactNode> = {
  'Customers': <CustomersView />,
  'Suppliers': <SuppliersView />,
  'New Customer': <NewCustomerForm />,
  'New Supplier': <NewSupplierForm />,
};

export function CustomerSupplierPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Customers');
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Customers & Suppliers</h1>
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
