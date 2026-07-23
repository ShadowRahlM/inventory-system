import { useNotificationsList, useMarkNotificationsRead, useMarkAllNotificationsRead, useClearReadNotifications } from '../hooks/useInventoryQueries';
import { PageHeader } from './ui/PageHeader';
import { EmptyState } from './ui/EmptyState';
import type { NotificationRecord } from '../types/inventory';

function NotificationRow({ notification }: { notification: NotificationRecord }) {
  const { mutate: markRead, isError: isMarkError } = useMarkNotificationsRead();
  return (
    <div className={`border-b p-4 hover:bg-muted/50 transition-colors duration-150 ${!notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium">{notification.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{new Date(notification.created_at).toLocaleString()}</p>
          </div>
        </div>
        {!notification.is_read && (
          <button
            onClick={() => markRead([notification.id])}
            className="text-xs text-primary hover:text-primary/80 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
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

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading notifications...</div>;
  if (isError) return <div className="p-6 text-destructive">Failed to load notifications: {error?.message}</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Notifications"
        description={notifications.length > 0 ? `${unreadCount} unread, ${readCount} read` : undefined}
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Mark all as read ({unreadCount})
              </button>
            )}
            {readCount > 0 && (
              <button
                onClick={() => { if (window.confirm(`Delete ${readCount} read notification${readCount === 1 ? '' : 's'}?`)) clearRead(); }}
                disabled={isClearing}
                className="rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : `Clear read (${readCount})`}
              </button>
            )}
          </div>
        }
      />

      {(isMarkAllError || isClearError) && (
        <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">
          {isMarkAllError && <p>Failed to mark all as read: {markAllError?.message}</p>}
          {isClearError && <p>Failed to clear read notifications: {clearError?.message}</p>}
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm">
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" description="You're all caught up." />
        ) : (
          notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
        )}
      </div>
    </div>
  );
}
