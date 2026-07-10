import { useNotificationsList } from '../hooks/useInventoryQueries';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const { data } = useNotificationsList();
  const unreadCount = data?.results?.filter(n => !n.is_read).length ?? 0;

  return (
    <Link to="/notifications" className="relative p-2 hover:bg-gray-700/70 rounded transition-colors duration-150">
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
