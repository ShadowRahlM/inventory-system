import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import { useAuthStore } from '../lib/store';
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{user ? 'Edit User' : 'Create User'}</h3>
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required autoFocus />
          </div>
          <div>
            <label className="block mb-1 text-sm">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          {!user && (
            <div>
              <label className="block mb-1 text-sm">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          )}
          <div>
            <label className="block mb-1 text-sm">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'viewer')} className="w-full border rounded px-3 py-2 text-sm">
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
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

  if (isLoading) return <div className="p-6 text-gray-500">Loading users...</div>;
  if (error) return <div className="p-6 text-red-500">Error loading users</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        {isAdmin && (
          <button onClick={() => { setEditingUser(undefined); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            + New User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-semibold">Username</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Role</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
              {isAdmin && <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-gray-400">No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{u.username}</td>
                <td className="py-3 px-4 text-gray-600">{u.email || '-'}</td>
                <td className="py-3 px-4">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                    u.role === 'admin' ? 'bg-red-100 text-red-800' :
                    u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => { setEditingUser(u); setShowForm(true); }}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(u.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 p-4 border-t">{data?.count ?? 0} users</p>
      </div>

      {showForm && <UserForm user={editingUser} onClose={() => { setShowForm(false); setEditingUser(undefined); }} />}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this user? This cannot be undone.</p>
            {deleteMutation.isError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {deleteMutation.error?.message}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => {
                  deleteMutation.mutate(confirmDelete, {
                    onSuccess: () => setConfirmDelete(null),
                  });
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
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
