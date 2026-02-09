'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useState } from 'react';
import NotificationDropdown from './NotificationDropdown';
import AllNotificationsModal from './AllNotificationsModal';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--primary)] hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {isOpen && (
          <NotificationDropdown
            onClose={() => setIsOpen(false)}
            onShowAll={() => {
              setIsOpen(false);
              setShowAllModal(true);
            }}
          />
        )}
      </div>
      {showAllModal && (
        <AllNotificationsModal
          isOpen={showAllModal}
          onClose={() => setShowAllModal(false)}
        />
      )}
    </>
  );
}

