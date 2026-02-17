'use client';

import { Notification } from '../../lib/notifications/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationRole } from '../../contexts/NotificationContext';
import { useRouter, usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Circle } from 'lucide-react';

function getNotificationPath(
  notification: Notification,
  role: NotificationRole,
): string | null {
  const data = notification.data ?? {};
  const orderId = data.orderId ?? data.order_id ?? data.order?.id;
  const customerId = data.customerId ?? data.customer_id;
  const type = notification.type ?? '';
  const target = notification.target ?? '';

  const ORDER_TYPES = [
    'order_placed',
    'order_status_changed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'payment_received',
    'payment_failed',
  ];

  if (role === 'admin') {
    if (orderId != null && (ORDER_TYPES.includes(type) || type === 'admin_alert')) {
      return `/admin/orders/${orderId}`;
    }
    if (type === 'low_inventory') {
      return '/admin/inventory/alerts';
    }
    if (type === 'new_customer' && customerId != null) {
      return `/admin/customers/${customerId}`;
    }
    if (orderId != null) {
      return `/admin/orders/${orderId}`;
    }
    return null;
  }

  if (role === 'customer') {
    if (orderId != null && ORDER_TYPES.includes(type)) {
      return `/portal/orders/${orderId}`;
    }
    if (type === 'welcome') {
      return '/portal/dashboard';
    }
    if (orderId != null) {
      return `/portal/orders/${orderId}`;
    }
    return null;
  }

  return null;
}

interface NotificationItemProps {
  notification: Notification;
  onNavigate?: () => void;
}

export default function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const { markAsRead, role } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  // Use current page context to determine navigation target:
  // if on /admin/* pages, use admin routes; otherwise use customer routes.
  const effectiveRole: NotificationRole =
    pathname?.startsWith('/admin') ? 'admin' : role === 'admin' ? 'customer' : role;

  const handleClick = async () => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    const path = getNotificationPath(notification, effectiveRole);
    if (path) {
      onNavigate?.();
      router.push(path);
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'order_placed':
      case 'order_status_changed':
      case 'order_shipped':
      case 'order_delivered':
        return '📦';
      case 'payment_received':
      case 'payment_failed':
        return '💳';
      case 'password_reset':
      case 'password_changed':
        return '🔒';
      case 'welcome':
        return '👋';
      default:
        return '🔔';
    }
  };

  const path = getNotificationPath(notification, effectiveRole);

  return (
    <div
      onClick={handleClick}
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">{getNotificationIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'} ${path ? 'hover:underline' : ''}`}>
              {notification.title}
            </p>
            {notification.read ? (
              <Circle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}
