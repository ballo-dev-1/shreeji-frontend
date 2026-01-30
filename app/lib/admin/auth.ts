// NestJS Backend Authentication utilities
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

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: AdminUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

class AdminAuth {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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

      // Store JWT in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_jwt', data.access_token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
      }

      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  // Get current user from stored JWT
  async getCurrentUser(): Promise<AdminUser | null> {
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
    return localStorage.getItem('admin_jwt');
  }

  // Get stored user data
  getStoredUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Logout user
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_jwt');
      localStorage.removeItem('admin_user');
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
const adminAuth = new AdminAuth();

export default adminAuth;
