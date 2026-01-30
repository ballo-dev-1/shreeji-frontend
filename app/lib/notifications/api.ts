import clientAuth from '../client/auth';

const API_URL = process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// Determine if we should use proxy (when frontend is HTTPS and backend is HTTP)
function shouldUseProxy(): boolean {
  if (typeof window === 'undefined') return false; // Server-side, no proxy needed
  const isHttps = window.location.protocol === 'https:';
  const backendIsHttp = API_URL.startsWith('http://');
  return isHttps && backendIsHttp;
}

function getApiUrl(path: string): string {
  if (shouldUseProxy()) {
    // Use Next.js API proxy route
    return `/api/backend${path}`;
  }
  // Direct backend URL
  return `${API_URL}${path}`;
}

export interface Notification {
  id: number;
  userId: number;
  adminId?: number;
  type: string;
  target: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  type: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

class NotificationsApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = clientAuth.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = getApiUrl(endpoint);
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error?.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getNotifications(page = 1, pageSize = 20): Promise<{ data: Notification[]; total: number }> {
    const response = await this.request<{ data: Notification[]; total: number }>(
      `/notifications?page=${page}&pageSize=${pageSize}`,
    );
    return response;
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.request<{ count: number }>('/notifications/unread');
    return response.count;
  }

  async markAsRead(id: number): Promise<Notification> {
    return this.request<Notification>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead(): Promise<void> {
    await this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async getPreferences(): Promise<{ data: NotificationPreferences[] }> {
    return this.request<{ data: NotificationPreferences[] }>('/notifications/preferences');
  }

  async updatePreference(
    type: string,
    emailEnabled: boolean,
    inAppEnabled: boolean,
  ): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences', {
      method: 'POST',
      body: JSON.stringify({ type, emailEnabled, inAppEnabled }),
    });
  }
}

export const notificationsApi = new NotificationsApiClient();
export default notificationsApi;

