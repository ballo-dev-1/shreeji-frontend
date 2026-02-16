'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { notificationsApi, Notification } from '../lib/notifications/api';
import { useClientAuth } from './ClientAuthContext';
import { useAuth } from './AuthContext';
import clientAuth from '../lib/client/auth';
import adminAuth from '../lib/admin/auth';

type NotificationRole = 'customer' | 'admin' | null;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  getUnreadCount: () => Promise<void>;
  // Pagination for modal
  allNotifications: Notification[];
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalNotifications: number;
  loadMoreNotifications: () => Promise<void>;
  loadAllNotifications: () => Promise<void>;
  // SSE connection status
  sseConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

// ─── SSE Reconnection Config ──────────────────────────────────
const SSE_INITIAL_RETRY_MS = 1000;
const SSE_MAX_RETRY_MS = 30000;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth contexts — detect which role is active
  const { isAuthenticated: isCustomerAuth } = useClientAuth();
  const { isAuthenticated: isAdminAuth } = useAuth();

  // Determine which role is active
  const role: NotificationRole = isAdminAuth
    ? 'admin'
    : isCustomerAuth
      ? 'customer'
      : null;

  const isAuthenticated = role !== null;

  // ─── State ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Pagination state for modal
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const pageSize = 20;

  // Refs for SSE lifecycle
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(SSE_INITIAL_RETRY_MS);
  const roleRef = useRef<NotificationRole>(role);

  // Keep roleRef in sync
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // ─── API Helpers (role-aware) ─────────────────────────────────

  const fetchNotifications = useCallback(
    async (page = 1, size = 20) => {
      if (role === 'admin') {
        return notificationsApi.getAdminNotifications(page, size);
      }
      return notificationsApi.getNotifications(page, size);
    },
    [role],
  );

  const fetchUnreadCount = useCallback(async () => {
    if (role === 'admin') {
      return notificationsApi.getAdminUnreadCount();
    }
    return notificationsApi.getUnreadCount();
  }, [role]);

  const apiMarkAsRead = useCallback(
    async (id: number) => {
      if (role === 'admin') {
        return notificationsApi.markAdminAsRead(id);
      }
      return notificationsApi.markAsRead(id);
    },
    [role],
  );

  const apiMarkAllAsRead = useCallback(async () => {
    if (role === 'admin') {
      return notificationsApi.markAllAdminAsRead();
    }
    return notificationsApi.markAllAsRead();
  }, [role]);

  // ─── Load Notifications (initial) ────────────────────────────

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [notificationsData, count] = await Promise.all([
        fetchNotifications(1, 20),
        fetchUnreadCount(),
      ]);
      setNotifications(notificationsData.data);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // ─── Mark As Read ─────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: number) => {
      try {
        await apiMarkAsRead(id);
        const updatedNotification = {
          read: true,
          readAt: new Date().toISOString(),
        };
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, ...updatedNotification } : n,
          ),
        );
        setAllNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, ...updatedNotification } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        console.error('Failed to mark notification as read:', err);
        throw err;
      }
    },
    [apiMarkAsRead],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await apiMarkAllAsRead();
      const updatedNotification = {
        read: true,
        readAt: new Date().toISOString(),
      };
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, ...updatedNotification })),
      );
      setAllNotifications((prev) =>
        prev.map((n) => ({ ...n, ...updatedNotification })),
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      throw err;
    }
  }, [apiMarkAllAsRead]);

  const getUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to get unread count:', err);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  // ─── Pagination (modal) ──────────────────────────────────────

  const loadAllNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setAllNotifications([]);
      setCurrentPage(1);
      setTotalNotifications(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetchNotifications(1, pageSize);
      setAllNotifications(response.data);
      setTotalNotifications(response.total);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to load all notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchNotifications]);

  const hasMore = allNotifications.length < totalNotifications;

  const loadMoreNotifications = useCallback(async () => {
    const canLoadMore = allNotifications.length < totalNotifications;
    if (!isAuthenticated || loadingMore || !canLoadMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await fetchNotifications(nextPage, pageSize);

      setAllNotifications((prev) => [...prev, ...response.data]);
      setTotalNotifications(response.total);
      setCurrentPage(nextPage);
    } catch (err: any) {
      console.error('Failed to load more notifications:', err);
      setError(err.message || 'Failed to load more notifications');
    } finally {
      setLoadingMore(false);
    }
  }, [
    isAuthenticated,
    loadingMore,
    currentPage,
    totalNotifications,
    pageSize,
    allNotifications.length,
    fetchNotifications,
  ]);

  // ─── SSE Connection ──────────────────────────────────────────

  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setSseConnected(false);
    retryDelayRef.current = SSE_INITIAL_RETRY_MS;
  }, []);

  const connectSSE = useCallback(() => {
    // Clean up any existing connection
    closeSSE();

    const currentRole = roleRef.current;
    if (!currentRole) return;

    // Get the appropriate token
    const token =
      currentRole === 'admin'
        ? adminAuth.getStoredToken()
        : clientAuth.getStoredToken();

    if (!token) return;

    const url = notificationsApi.getSSEUrl(token);

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        retryDelayRef.current = SSE_INITIAL_RETRY_MS; // Reset backoff on success
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'notification.created' && data.notification) {
            const newNotification: Notification = data.notification;

            // Prepend to recent notifications list
            setNotifications((prev) => {
              // Avoid duplicates
              if (prev.some((n) => n.id === newNotification.id)) return prev;
              return [newNotification, ...prev].slice(0, 20); // Keep max 20 recent
            });

            // Also prepend to all-notifications if the modal has been loaded
            setAllNotifications((prev) => {
              if (prev.length === 0) return prev; // Modal not loaded yet
              if (prev.some((n) => n.id === newNotification.id)) return prev;
              return [newNotification, ...prev];
            });

            // Increment unread count if not read
            if (!newNotification.read) {
              setUnreadCount((prev) => prev + 1);
            }

            // Update total count
            setTotalNotifications((prev) => prev + 1);
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Only reconnect if still authenticated
        const activeRole = roleRef.current;
        if (!activeRole) return;

        const activeToken =
          activeRole === 'admin'
            ? adminAuth.getStoredToken()
            : clientAuth.getStoredToken();

        if (!activeToken) return; // Token gone, don't reconnect

        // Exponential backoff reconnect
        const delay = retryDelayRef.current;
        retryTimeoutRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(
            delay * 2,
            SSE_MAX_RETRY_MS,
          );
          connectSSE();
        }, delay);
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
    }
  }, [closeSSE]);

  // ─── Effects ──────────────────────────────────────────────────

  // Load notifications on auth change
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    } else {
      // Clear state on logout
      setNotifications([]);
      setAllNotifications([]);
      setUnreadCount(0);
      setTotalNotifications(0);
      setCurrentPage(1);
      setError(null);
    }
  }, [isAuthenticated, loadNotifications]);

  // Manage SSE connection lifecycle
  useEffect(() => {
    if (isAuthenticated) {
      connectSSE();
    } else {
      closeSSE();
    }

    return () => {
      closeSSE();
    };
  }, [isAuthenticated, role, connectSSE, closeSSE]);

  // Fallback polling: if SSE is not connected, poll every 30s
  useEffect(() => {
    if (!isAuthenticated || sseConnected) return;

    const interval = setInterval(() => {
      getUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sseConnected, getUnreadCount]);

  // ─── Provider ─────────────────────────────────────────────────

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        getUnreadCount,
        // Pagination
        allNotifications,
        loadingMore,
        hasMore,
        currentPage,
        totalNotifications,
        loadMoreNotifications,
        loadAllNotifications,
        // SSE
        sseConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
}
