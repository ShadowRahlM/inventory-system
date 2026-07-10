import { useNotificationsList, useMarkNotificationsRead, useMarkAllNotificationsRead, useClearReadNotifications } from '../hooks/useInventoryQueries';
import type { NotificationRecord } from '../types/inventory';

const typeIcons: Record<string, string> = {
  LOW_STOCK: '⚠️',
  MOVEMENT: '🔄',
  ORDER_STATUS: '📋',
  SYSTEM: '⚙️',
};

function NotificationRow({ notification }: { notification: NotificationRecord }) {
  const { mutate: markRead, isError: isMarkError } = useMarkNotificationsRead();
  return (
    <div className={`border-b p-4 hover:bg-muted/50 transition-colors duration-150 transition-colors ${!notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
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
            className="text-xs text-blue-600 hover:text-blue-800 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
          >
            {isMarkError ? 'Failed!' : 'Mark read'}
          </button>
        )}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { data, isLoading, isError, error } = useNotificationsList();
  const { mutate: markAllRead, isError: isMarkAllError, error: markAllError } = useMarkAllNotificationsRead();
  const { mutate: clearRead, isPending: isClearing, isError: isClearError, error: clearError } = useClearReadNotifications();
  const notifications = data?.results ?? [];
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.length - unreadCount;

  if (isLoading) return <div className="p-6 text-gray-500">Loading notifications...</div>;
  if (isError) return <div className="p-6 text-red-500">Failed to load notifications: {error?.message}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Mark all as read ({unreadCount})
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={() => { if (window.confirm(`Delete ${readCount} read notification${readCount === 1 ? '' : 's'}?`)) clearRead(); }}
              disabled={isClearing}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isClearing ? 'Clearing...' : `Clear read (${readCount})`}
            </button>
          )}
        </div>
      </div>

      {(isMarkAllError || isClearError) && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {isMarkAllError && <p>Failed to mark all as read: {markAllError?.message}</p>}
          {isClearError && <p>Failed to clear read notifications: {clearError?.message}</p>}
        </div>
      )}

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
