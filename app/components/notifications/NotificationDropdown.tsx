'use client';

import { useNotifications } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import { X, CheckCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface NotificationDropdownProps {
  onClose: () => void;
  onShowAll?: () => void;
}

export default function NotificationDropdown({ onClose, onShowAll }: NotificationDropdownProps) {
  const { notifications, loading, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No notifications</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onNavigate={onClose} />
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => {
              if (onShowAll) {
                onShowAll();
              } else {
                onClose();
              }
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

