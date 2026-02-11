// Client Authentication utilities - NestJS Backend
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

export interface ClientUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  confirmed?: boolean;
  blocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientAuthResponse {
  access_token: string;
  user: ClientUser;
}

export interface ClientLoginCredentials {
  email: string;
  password: string;
}

export interface ClientRegisterCredentials {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

class ClientAuth {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  // Login with email and password using NestJS backend
  async login(credentials: ClientLoginCredentials): Promise<ClientAuthResponse> {
    try {
      const url = getApiUrl('/auth/login');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // Store JWT in localStorage with client-specific key
      if (typeof window !== 'undefined') {
        localStorage.setItem('client_jwt', data.access_token);
        localStorage.setItem('client_user', JSON.stringify(data.user));
      }

      return {
        access_token: data.access_token,
        user: data.user,
      };
    } catch (error: any) {
      console.error('Client login error:', error);
      throw new Error(error.message || 'Client login failed');
    }
  }

  // Register new user with NestJS backend
  async register(credentials: ClientRegisterCredentials): Promise<ClientAuthResponse> {
    try {
      const url = getApiUrl('/auth/register');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();

      // Store JWT in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('client_jwt', data.access_token);
        localStorage.setItem('client_user', JSON.stringify(data.user));
      }

      return {
        access_token: data.access_token,
        user: data.user,
      };
    } catch (error: any) {
      console.error('Client registration error:', error);
      throw new Error(error.message || 'Client registration failed');
    }
  }

  // Get current user from stored JWT
  async getCurrentUser(): Promise<ClientUser | null> {
    try {
      const jwt = this.getStoredToken();
      if (!jwt) return null;

      const url = getApiUrl('/auth/me');
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        this.logout(); // Clear invalid token
        return null;
      }

      const user = await response.json();
      // Update stored user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('client_user', JSON.stringify(user));
      }
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      this.logout(); // Clear invalid token
      return null;
    }
  }

  // Validate stored token
  async validateToken(): Promise<boolean> {
    try {
      const jwt = this.getStoredToken();
      if (!jwt) return false;

      const url = getApiUrl('/auth/me');
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get stored JWT token
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('client_jwt');
  }

  // Get stored user data
  getStoredUser(): ClientUser | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('client_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Logout user
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('client_jwt');
      localStorage.removeItem('client_user');
      // Dispatch event to notify context and other components
      window.dispatchEvent(new CustomEvent('client-auth-changed'));
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  // Get authorization header for API requests
  getAuthHeaders(): Record<string, string> {
    const token = this.getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

// Create singleton instance
const clientAuth = new ClientAuth();

export default clientAuth;

