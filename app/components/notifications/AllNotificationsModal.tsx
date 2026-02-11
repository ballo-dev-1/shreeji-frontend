'use client';

import { useNotifications } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import { X, CheckCheck, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AllNotificationsModal({ isOpen, onClose }: AllNotificationsModalProps) {
  const {
    allNotifications,
    loading,
    loadingMore,
    hasMore,
    error,
    loadAllNotifications,
    loadMoreNotifications,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();
  
  const [refreshing, setRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load notifications when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllNotifications();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, loadAllNotifications]);

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreNotifications();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel && hasMore) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [isOpen, hasMore, loadingMore, loadMoreNotifications]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
      await loadAllNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">All Notifications</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing || loading ? 'animate-spin' : ''}`} />
            </button>
            {allNotifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto flex-1 min-h-0"
        >
          {loading && allNotifications.length === 0 ? (
            <div className="p-12 text-center space-y-2 animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto"></div>
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : error && allNotifications.length === 0 ? (
            <div className="p-12 text-center text-red-500">
              <p className="font-medium">Error loading notifications</p>
              <p className="text-sm mt-2">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {allNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm animate-pulse">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <span>Loading more...</span>
                  </div>
                )}
                {!hasMore && allNotifications.length > 0 && (
                  <p className="text-sm text-gray-400 py-4">No more notifications</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

