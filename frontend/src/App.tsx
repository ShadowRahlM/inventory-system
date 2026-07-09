import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { useAuthStore, useUIStore } from './lib/store';
import { authAPI } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TileList } from './components/TileList';
import { NewTile } from './components/NewTile';
import { InventoryPage } from './components/InventoryPage';
import { UserManagement } from './components/UserManagement';
import { LowStockAlerts } from './components/LowStockAlerts';
import { ReportsPage } from './components/ReportsPage';
import { Catalogs } from './components/Catalogs';
import { OrdersPage } from './components/OrdersPage';
import { CustomerSupplierPage } from './components/CustomerSupplierPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SyncConflictsPage } from './components/SyncConflictsPage';
import { AdminExport } from './components/AdminExport';
import { AdminImport } from './components/AdminImport';
import { StockTake } from './components/StockTake';
import { Register } from './components/Register';
import { useSessionTimeout, initSession, getRedirectPath, clearRedirectPath } from './lib/useSessionTimeout';
import { useWebSocket } from './hooks/useWebSocket';

function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await authAPI.login(username, password);
      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      initSession();
      try {
        const userInfo = await authAPI.me();
        setAuth(true, userInfo);
      } catch {
        setAuth(true, { username, role: 'viewer' });
      }
      const redirect = getRedirectPath()
      clearRedirectPath()
      navigate(redirect || '/', { replace: true })
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded px-3 py-2"
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 underline hover:text-blue-800">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}

function App() {
  const { sidebarOpen } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  useSessionTimeout();
  useWebSocket();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {!isAuthenticated ? (
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Login />} />
          </Routes>
        ) : (
          <div className="flex">
            <Sidebar />
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/tiles/new" element={
                  <ProtectedRoute>
                    <NewTile />
                  </ProtectedRoute>
                } />
                <Route path="/tiles" element={
                  <ProtectedRoute>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold mb-6">Tiles</h1>
                      <TileList />
                    </div>
                  </ProtectedRoute>
                } />
                <Route path="/batches" element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                } />
                <Route path="/movements" element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                } />
                <Route path="/audit-logs" element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                } />
                <Route path="/stock-take" element={
                  <ProtectedRoute adminOnly>
                    <StockTake />
                  </ProtectedRoute>
                } />
                <Route path="/catalogs" element={
                  <ProtectedRoute adminOnly>
                    <Catalogs />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/low-stock" element={
                  <ProtectedRoute>
                    <LowStockAlerts />
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                } />
                <Route path="/customers-suppliers" element={
                  <ProtectedRoute>
                    <CustomerSupplierPage />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />
                <Route path="/sync-conflicts" element={
                  <ProtectedRoute adminOnly>
                    <SyncConflictsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin-export" element={
                  <ProtectedRoute adminOnly>
                    <AdminExport />
                  </ProtectedRoute>
                } />
                <Route path="/admin-import" element={
                  <ProtectedRoute adminOnly>
                    <AdminImport />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
          </div>
        )}
      </Router>
    </QueryClientProvider>
  );
}

export default App;