import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '../lib/store';
import { NotificationBell } from './NotificationBell';
import { useSyncConflictsList } from '../hooks/useInventoryQueries';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Tiles', href: '/tiles', icon: '🧱' },
  { name: 'New Tile', href: '/tiles/new', icon: '➕' },
  { name: 'Batches', href: '/batches', icon: '📦' },
  { name: 'Inventory', href: '/inventory', icon: '📋' },
  { name: 'Movements', href: '/movements', icon: '🔄' },
  { name: 'Catalogs', href: '/catalogs', icon: '📕' },
  { name: 'Audit Logs', href: '/audit-logs', icon: '📝' },
  { name: 'Orders', href: '/orders', icon: '📋' },
  { name: 'Customers/Suppliers', href: '/customers-suppliers', icon: '🏢' },
  { name: 'Reports', href: '/reports', icon: '📊' },
  { name: 'Low Stock', href: '/low-stock', icon: '⚠️' },
  { name: 'Users', href: '/users', icon: '👥' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { data: conflictsData } = useSyncConflictsList();
  const unresolvedConflicts = conflictsData?.results?.filter(c => !c.resolved).length ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {sidebarOpen && <span className="text-xl font-bold">Inventory System</span>}
        <div className="flex items-center gap-1">
          {sidebarOpen && <NotificationBell />}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </div>
      <nav className="mt-4 flex-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center px-4 py-3 hover:bg-gray-700 transition-colors ${
              location.pathname === item.href ? 'bg-gray-700 border-r-4 border-blue-500' : ''
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {sidebarOpen && <span className="ml-3">{item.name}</span>}
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/sync-conflicts"
            className={`flex items-center px-4 py-3 hover:bg-gray-700 transition-colors ${
              location.pathname === '/sync-conflicts' ? 'bg-gray-700 border-r-4 border-blue-500' : ''
            }`}
          >
            <span className="text-xl">🔀</span>
            {sidebarOpen && (
              <span className="ml-3 flex items-center gap-2">
                Sync Conflicts
                {unresolvedConflicts > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-5 text-center">
                    {unresolvedConflicts > 9 ? '9+' : unresolvedConflicts}
                  </span>
                )}
              </span>
            )}
          </Link>
        )}
      </nav>
      <div className={`border-t border-gray-700 ${sidebarOpen ? 'p-4' : 'p-2 flex justify-center'}`}>
        {sidebarOpen && (
          <div className="mb-2">
            <div className="text-sm text-gray-400 truncate">
              {user?.username ?? 'User'}
            </div>
            {user?.role && (
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded mt-1 ${
                user.role === 'admin' ? 'bg-red-800 text-red-200' :
                user.role === 'manager' ? 'bg-blue-800 text-blue-200' :
                'bg-gray-700 text-gray-300'
              }`}>
                {user.role}
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-2 py-2 text-sm text-red-300 hover:bg-gray-700 hover:text-red-200 rounded transition-colors"
          title="Sign out"
        >
          <span className="text-xl">🚪</span>
          {sidebarOpen && <span className="ml-3">Sign out</span>}
        </button>
      </div>
    </div>
  );
}