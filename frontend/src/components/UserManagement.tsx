import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { useAuthStore } from '../lib/store';
import { PageHeader } from './ui/PageHeader';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import type { UserRecord } from '../types/inventory';

function UserForm({ user, onClose }: { user?: UserRecord; onClose: () => void }) {
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role ?? 'viewer');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: Partial<UserRecord> & { password?: string }) =>
      inventoryApi.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.users() });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: Partial<UserRecord> }) =>
      inventoryApi.users.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.users() });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: (data: { id: number; role: string }) =>
      inventoryApi.users.setRole(data.id, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.users() });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending || roleMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (user) {
      updateMutation.mutate({ id: user.id, payload: { username, email } });
      if (role !== user.role) {
        roleMutation.mutate({ id: user.id, role });
      }
    } else {
      createMutation.mutate({ username, email, password, role });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="rounded-xl border bg-card p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{user ? 'Edit User' : 'Create User'}</h3>
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required autoFocus />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {!user && (
            <div>
              <label className="block mb-1 text-sm font-medium">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
          )}
          <div>
            <label className="block mb-1 text-sm font-medium">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'viewer')} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-muted active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const { data, isLoading, error } = useQuery({
    queryKey: [...INVENTORY_KEYS.users(), { page_size: 5000 }],
    queryFn: () => inventoryApi.users.list({ page_size: 5000 }),
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.users.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.users() }),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const users = data?.results ?? [];

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading users...</div>;
  if (error) return <div className="p-6 text-destructive">Error loading users</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their roles"
        actions={isAdmin ? (
          <button onClick={() => { setEditingUser(undefined); setShowForm(true); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            + New User
          </button>
        ) : undefined}
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-[#F7F7F7]">
              <th className="text-left py-3 px-4 text-sm font-semibold">Username</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Role</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
              {isAdmin && <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4}><EmptyState title="No users found" description="No user accounts have been created yet." /></td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-muted/50 transition-colors duration-150">
                <td className="py-3 px-4 font-medium">{u.username}</td>
                <td className="py-3 px-4 text-muted-foreground">{u.email || '-'}</td>
                <td className="py-3 px-4">
                  <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'default' : 'outline'}>
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={u.is_active ? 'success' : 'danger'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => { setEditingUser(u); setShowForm(true); }}
                      className="text-primary hover:text-primary/80 text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(u.id)}
                      className="text-destructive hover:text-destructive/80 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-muted-foreground p-4 border-t">{data?.count ?? 0} users</p>
      </div>

      {showForm && <UserForm user={editingUser} onClose={() => { setShowForm(false); setEditingUser(undefined); }} />}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="rounded-xl border bg-card p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="text-sm text-muted-foreground mb-4">Are you sure you want to delete this user? This cannot be undone.</p>
            {deleteMutation.isError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {deleteMutation.error?.message}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Cancel</button>
              <button
                onClick={() => {
                  deleteMutation.mutate(confirmDelete, {
                    onSuccess: () => setConfirmDelete(null),
                  });
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
