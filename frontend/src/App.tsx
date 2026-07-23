import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { useAuthStore, useUIStore } from './lib/store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TileList } from './components/TileList';
import { NewTile } from './components/NewTile';
import { InventoryPage } from './components/InventoryPage';
import { UserManagement } from './components/UserManagement';
import { LowStockAlerts } from './components/LowStockAlerts';
import { ReportsPage } from './components/ReportsPage';
import { ProductDetail } from './components/ProductDetail';
import { Catalogs } from './components/Catalogs';
import { OrdersPage } from './components/OrdersPage';
import { CustomerSupplierPage } from './components/CustomerSupplierPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SyncConflictsPage } from './components/SyncConflictsPage';
import { AdminExport } from './components/AdminExport';
import { AdminImport } from './components/AdminImport';
import { StockTake } from './components/StockTake';
import { Register } from './components/Register';
import { Login } from './components/Login';
import { useSessionTimeout } from './lib/useSessionTimeout';
import { useWebSocket } from './hooks/useWebSocket';

function ProtectedRoute({ children, adminOnly, managerPlus }: { children: React.ReactNode; adminOnly?: boolean; managerPlus?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" />;
  if (managerPlus && user?.role !== 'admin' && user?.role !== 'manager') return <Navigate to="/" />;
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
                    <TileList />
                  </ProtectedRoute>
                } />
                <Route path="/tiles/:id" element={
                  <ProtectedRoute>
                    <ProductDetail />
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
                  <ProtectedRoute managerPlus>
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