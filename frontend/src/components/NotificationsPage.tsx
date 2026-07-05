import { useNotificationsList, useMarkNotificationsRead, useMarkAllNotificationsRead } from '../hooks/useInventoryQueries';
import type { NotificationRecord } from '../types/inventory';

const typeIcons: Record<string, string> = {
  LOW_STOCK: '⚠️',
  MOVEMENT: '🔄',
  ORDER_STATUS: '📋',
  SYSTEM: '⚙️',
};

function NotificationRow({ notification }: { notification: NotificationRecord }) {
  const { mutate: markRead } = useMarkNotificationsRead();
  return (
    <div className={`border-b p-4 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[notification.notification_type] || '🔔'}</span>
          <div>
            <p className="font-medium">{notification.title}</p>
            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
          </div>
        </div>
        {!notification.is_read && (
          <button
            onClick={() => markRead([notification.id])}
            className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { data, isLoading } = useNotificationsList();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const notifications = data?.results ?? [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) return <div className="p-6 text-gray-500">Loading notifications...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow border">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No notifications</div>
        ) : (
          notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
        )}
      </div>
    </div>
  );
}
