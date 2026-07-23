import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS, useCustomersList, useSuppliersList } from '../hooks/useInventoryQueries';
import { PageHeader } from './ui/PageHeader';
import { EmptyState } from './ui/EmptyState';
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
  if (isLoading) return <div className="text-muted-foreground">Loading customers...</div>;
  if (error) return <div className="text-destructive">Failed to load customers. Please try again.</div>;
  const items = data?.results ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead><tr className="border-b bg-[#F7F7F7]">
          <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Address</th>
        </tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={4}><EmptyState title="No customers" description="No customers have been added yet." /></td></tr>
          ) : items.map((c: Customer) => (
            <tr key={c.id} className="border-b hover:bg-muted/50 transition-colors duration-150">
              <td className="py-3 px-4 font-medium">{c.name}</td>
              <td className="py-3 px-4 text-sm">{c.email || '-'}</td>
              <td className="py-3 px-4 text-sm">{c.phone || '-'}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-[250px]">{c.address || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuppliersView() {
  const { data, isLoading, error } = useSuppliersList();
  if (isLoading) return <div className="text-muted-foreground">Loading suppliers...</div>;
  if (error) return <div className="text-destructive">Failed to load suppliers. Please try again.</div>;
  const items = data?.results ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead><tr className="border-b bg-[#F7F7F7]">
          <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Lead Time</th>
          <th className="text-left py-3 px-4 text-sm font-semibold">Address</th>
        </tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={5}><EmptyState title="No suppliers" description="No suppliers have been added yet." /></td></tr>
          ) : items.map((s: Supplier) => (
            <tr key={s.id} className="border-b hover:bg-muted/50 transition-colors duration-150">
              <td className="py-3 px-4 font-medium">{s.name}</td>
              <td className="py-3 px-4 text-sm">{s.email || '-'}</td>
              <td className="py-3 px-4 text-sm">{s.phone || '-'}</td>
              <td className="py-3 px-4 text-sm">{s.lead_time_days} days</td>
              <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-[200px]">{s.address || '-'}</td>
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
      {mutation.isSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md text-sm">Customer created!</div>}
      {mutation.isError && <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">{mutation.error?.message ?? 'Failed to create customer'}</div>}
      <div>
        <label className="block mb-1 text-sm font-medium">Name *</label>
        <input {...register('name')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        {errors.name && <span className="text-destructive text-sm">{errors.name.message as string}</span>}
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Email</label>
        <input {...register('email')} type="email" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Phone</label>
        <input {...register('phone')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Address</label>
        <textarea {...register('address')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
      </div>
      <button type="submit" disabled={mutation.isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
      {mutation.isSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md text-sm">Supplier created!</div>}
      {mutation.isError && <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">{mutation.error?.message ?? 'Failed to create supplier'}</div>}
      <div>
        <label className="block mb-1 text-sm font-medium">Name *</label>
        <input {...register('name')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        {errors.name && <span className="text-destructive text-sm">{errors.name.message as string}</span>}
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Email</label>
        <input {...register('email')} type="email" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Phone</label>
        <input {...register('phone')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Lead Time (days)</label>
        <input {...register('lead_time_days')} type="number" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Address</label>
        <textarea {...register('address')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
      </div>
      <button type="submit" disabled={mutation.isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
      <PageHeader
        title="Customers & Suppliers"
        description="Manage your customers and suppliers"
      />
      <div className="flex flex-wrap gap-1 mb-6">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {tabComponents[activeTab]}
      </div>
    </div>
  );
}
