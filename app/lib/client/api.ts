// Client API - Connects to NestJS backend for orders, profile, and addresses
import clientAuth from './auth';

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

class ClientApiClient {
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
      // Handle 401 Unauthorized - session expired
      if (response.status === 401) {
        // Clear authentication
        clientAuth.logout();
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          // Store current URL to redirect back after login
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/portal/login')) {
            sessionStorage.setItem('returnUrl', currentPath);
          }
          
          // Redirect to login
          window.location.href = '/portal/login';
        }
        
        throw new Error('Session expired. Please log in again.');
      }
      
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

  // Products API - Public access (only active products)
  async getProducts(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: Record<string, any>;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    if (params?.search) {
      searchParams.append('search', params.search);
    }

    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // For boolean values, convert to string
          // For numbers, ensure they're properly formatted
          if (typeof value === 'boolean') {
            searchParams.append(key, value ? 'true' : 'false');
          } else if (typeof value === 'number') {
            // Ensure numbers are properly formatted (handle 0 case)
            searchParams.append(key, value.toString());
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/catalog/products${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  async getProduct(slug: string) {
    // Get product by slug - handle URL encoding
    const encodedSlug = encodeURIComponent(slug);
    try {
      const response = await this.request<any>(`/catalog/products/${encodedSlug}`);
      // NestJS may return product directly or wrapped in data
      return response.data || response;
    } catch (error: any) {
      // If 404, try without encoding (some backends handle it automatically)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        try {
          const response = await this.request<any>(`/catalog/products/${slug}`);
          return response.data || response;
        } catch {
          throw error; // Re-throw original error
        }
      }
      throw error;
    }
  }

  async getProductById(id: string | number) {
    return this.request<{ data: any }>(`/catalog/products/${id}`);
  }

  // Client orders - Get orders for authenticated user
  async getOrders(params?: {
    pagination?: { page: number; pageSize: number };
    populate?: string[];
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      return { data: [], meta: { pagination: { total: 0, page: 1, pageSize: 10 } } };
    }

    const searchParams = new URLSearchParams();
    
    // Add pagination
    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    } else {
      searchParams.append('page', '1');
      searchParams.append('pageSize', '10');
    }

    // Get orders for current user (backend should filter by authenticated user)
    const response = await this.request<{
      data: any[];
      meta?: { pagination?: { page: number; pageSize: number; total: number } };
    }>(`/orders/me${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);

    // Transform response to match expected format
    // Handle both array response and object with data property
    const dataArray = Array.isArray(response) 
      ? response 
      : (response.data || []);
    
    return {
      data: dataArray.map((item: any) => ({
        id: item.id,
        orderNumber: item.orderNumber || item.order_number,
        orderStatus: item.status || item.orderStatus || 'pending',
        paymentStatus: item.paymentStatus || item.payment_status || 'pending',
        totalAmount: item.totalAmount || item.total_amount || 0,
        subtotal: item.subtotal || 0,
        taxAmount: item.taxAmount || item.tax_amount || 0,
        shippingAmount: item.shippingAmount || item.shipping_amount || 0,
        discountAmount: item.discountAmount || item.discount_amount || 0,
        currency: item.currency || 'ZMW',
        notes: item.notes,
        trackingNumber: item.trackingNumber || item.tracking_number,
        estimatedDelivery: item.estimatedDelivery || item.estimated_delivery,
        shippedAt: item.shippedAt || item.shipped_at,
        deliveredAt: item.deliveredAt || item.delivered_at,
        createdAt: item.createdAt || item.created_at,
        updatedAt: item.updatedAt || item.updated_at,
        orderItems: item.orderItems || item.order_items || [],
        shippingAddress: item.shippingAddress || item.shipping_address,
        billingAddress: item.billingAddress || item.billing_address,
        // Add pickup details
        preferredPickupDate: item.preferredPickupDate || item.preferred_pickup_date,
        preferredPickupTime: item.preferredPickupTime || item.preferred_pickup_time,
        collectingPersonName: item.collectingPersonName || item.collecting_person_name,
        collectingPersonPhone: item.collectingPersonPhone || item.collecting_person_phone,
        collectingPersonRelationship: item.collectingPersonRelationship || item.collecting_person_relationship,
        vehicleInfo: item.vehicleInfo || item.vehicle_info,
        idType: item.idType || item.id_type,
        idNumber: item.idNumber || item.id_number,
        pickupSpecialInstructions: item.pickupSpecialInstructions || item.pickup_special_instructions,
        // Add payment method to identify cash on pickup orders
        paymentMethod: item.payments?.[0]?.paymentMethod || item.payment_method || item.payments?.[0]?.payment_method,
      })),
      meta: response.meta || { pagination: { total: response.data?.length || 0, page: 1, pageSize: 10 } },
    };
  }

  async getOrder(id: string) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>(`/orders/${id}`);

    // Backend should verify order belongs to user, but we can double-check
    return {
      data: {
        id: response.id || response.data?.id,
        orderNumber: response.orderNumber || response.order_number || response.data?.orderNumber,
        orderStatus: response.status || response.orderStatus || response.data?.status || 'pending',
        paymentStatus: response.paymentStatus || response.payment_status || response.data?.paymentStatus || 'pending',
        totalAmount: response.totalAmount || response.total_amount || response.data?.totalAmount || 0,
        subtotal: response.subtotal || response.data?.subtotal || 0,
        taxAmount: response.taxAmount || response.tax_amount || response.data?.taxAmount || 0,
        shippingAmount: response.shippingAmount || response.shipping_amount || response.data?.shippingAmount || 0,
        discountAmount: response.discountAmount || response.discount_amount || response.data?.discountAmount || 0,
        currency: response.currency || response.data?.currency || 'ZMW',
        notes: response.notes || response.data?.notes,
        trackingNumber: response.trackingNumber || response.tracking_number || response.data?.trackingNumber,
        estimatedDelivery: response.estimatedDelivery || response.estimated_delivery || response.data?.estimatedDelivery,
        shippedAt: response.shippedAt || response.shipped_at || response.data?.shippedAt,
        deliveredAt: response.deliveredAt || response.delivered_at || response.data?.deliveredAt,
        createdAt: response.createdAt || response.created_at || response.data?.createdAt,
        updatedAt: response.updatedAt || response.updated_at || response.data?.updatedAt,
        orderItems: response.orderItems || response.order_items || response.data?.orderItems || [],
        shippingAddress: response.shippingAddress || response.shipping_address || response.data?.shippingAddress,
        billingAddress: response.billingAddress || response.billing_address || response.data?.billingAddress,
        customer: response.customer || response.data?.customer,
        // Add pickup details
        preferredPickupDate: response.preferredPickupDate || response.preferred_pickup_date || response.data?.preferredPickupDate,
        preferredPickupTime: response.preferredPickupTime || response.preferred_pickup_time || response.data?.preferredPickupTime,
        collectingPersonName: response.collectingPersonName || response.collecting_person_name || response.data?.collectingPersonName,
        collectingPersonPhone: response.collectingPersonPhone || response.collecting_person_phone || response.data?.collectingPersonPhone,
        collectingPersonRelationship: response.collectingPersonRelationship || response.collecting_person_relationship || response.data?.collectingPersonRelationship,
        vehicleInfo: response.vehicleInfo || response.vehicle_info || response.data?.vehicleInfo,
        idType: response.idType || response.id_type || response.data?.idType,
        idNumber: response.idNumber || response.id_number || response.data?.idNumber,
        pickupSpecialInstructions: response.pickupSpecialInstructions || response.pickup_special_instructions || response.data?.pickupSpecialInstructions,
        // Add payment data mapping
        payments: (response.payments || response.data?.payments || []).map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency || 'ZMW',
          paymentStatus: payment.paymentStatus || payment.payment_status,
          paymentMethod: payment.paymentMethod || payment.payment_method,
          transactionId: payment.transactionId || payment.transaction_id,
          processedAt: payment.processedAt || payment.processed_at,
          createdAt: payment.createdAt || payment.created_at,
        })),
      },
    };
  }

  async cancelOrder(orderId: string | number, reason?: string) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ success: boolean; message: string }>(`/orders/${orderId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });

    return response;
  }

  // Return requests
  async createReturnRequest(data: {
    orderId: number;
    reason: string;
    reasonDetails?: string;
    items: Array<{ orderItemId: number; quantity: number }>;
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ success: boolean; message: string; data: any }>('/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response;
  }

  async getReturnRequest(id: string | number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ data: any }>(`/returns/${id}`);
    return response;
  }

  async getReturnsByOrder(orderId: string | number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ data: any[] }>(`/returns/order/${orderId}`);
    return response;
  }

  // Loyalty
  async getLoyaltyPoints() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.request<{ data: { points: number } }>('/loyalty/points');
  }

  async getLoyaltyHistory() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.request<{ data: any[] }>('/loyalty/history');
  }

  // Client profile - Get and update user profile
  async getProfile() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get customer/profile data from backend
    try {
      const customerResponse = await this.request<any>('/customers/me');
      
      return {
        data: {
          id: user.id,
          email: user.email,
          firstName: customerResponse.firstName || customerResponse.first_name || user.firstName || '',
          lastName: customerResponse.lastName || customerResponse.last_name || user.lastName || '',
          phone: customerResponse.phone || '',
          username: user.username,
          confirmed: user.confirmed,
          blocked: user.blocked,
          addresses: customerResponse.addresses || [],
        },
      };
    } catch (error) {
      // If customer endpoint doesn't exist, return user data
      return {
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          username: user.username,
          confirmed: user.confirmed,
          blocked: user.blocked,
        },
      };
    }
  }

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update profile via backend
    await this.request('/customers/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return { success: true };
  }

  // Change password
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Change password via backend
    await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return { success: true };
  }

  // Password reset
  async forgotPassword(email: string) {
    const response = await this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return response;
  }

  async verifyResetToken(token: string) {
    const response = await this.request<{ valid: boolean }>(`/auth/verify-reset-token/${token}`);
    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });

    return response;
  }

  // Client addresses - Manage addresses
  async getAddresses() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      return { data: [] };
    }

    try {
      const response = await this.request<any[] | { data: any[] }>('/addresses/me');
      
      const addresses = Array.isArray(response) ? response : (response.data || []);
      
      return {
        data: addresses.map((item: any) => ({
          id: item.id,
          type: item.type,
          firstName: item.firstName || item.first_name,
          lastName: item.lastName || item.last_name,
          company: item.company,
          addressLine1: item.addressLine1 || item.address_line1,
          addressLine2: item.addressLine2 || item.address_line2,
          city: item.city,
          state: item.state,
          postalCode: item.postalCode || item.postal_code,
          country: item.country,
          phone: item.phone,
          isDefault: item.isDefault || item.is_default || false,
        })),
      };
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      return { data: [] };
    }
  }

  async createAddress(data: {
    type: 'shipping' | 'billing' | 'both';
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
    isDefault?: boolean;
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      const addresses = await this.getAddresses();
      for (const addr of addresses.data) {
        if (addr.isDefault) {
          await this.updateAddress(addr.id.toString(), { isDefault: false });
        }
      }
    }

    const response = await this.request<{ id: number }>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return { data: { id: response.id, ...data } };
  }

  async updateAddress(id: string, data: Partial<{
    type: 'shipping' | 'billing' | 'both';
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
    isDefault?: boolean;
  }>) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      const addresses = await this.getAddresses();
      for (const addr of addresses.data) {
        if (addr.id.toString() !== id && addr.isDefault) {
          await this.updateAddress(addr.id.toString(), { isDefault: false });
        }
      }
    }

    await this.request(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return { success: true };
  }

  async deleteAddress(id: string) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request(`/addresses/${id}`, {
      method: 'DELETE',
    });

    return { success: true };
  }

  // Coupon validation
  async validateCoupon(code: string, orderAmount: number, productIds?: number[]) {
    return this.request<{ valid: boolean; coupon?: any; discount?: number; error?: string }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount, productIds }),
    });
  }

  // Get available coupons (public endpoint)
  async getCoupons(params?: { isActive?: boolean; page?: number; pageSize?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) {
      searchParams.append('isActive', params.isActive.toString());
    }
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize) {
      searchParams.append('pageSize', params.pageSize.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/coupons${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<any>(endpoint);
    return {
      data: Array.isArray(response) ? response : (response.data || []),
      meta: response.meta,
    };
  }

  // Wishlist API
  async getWishlist() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>('/wishlist');
    const items = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: items.map((item: any) => ({
        id: item.id,
        productId: item.productId || item.product?.id,
        product: item.product,
        createdAt: item.createdAt || item.created_at,
      })),
    };
  }

  async addToWishlist(productId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>(`/wishlist/${productId}`, {
      method: 'POST',
    });

    return { success: true, data: response };
  }

  async removeFromWishlist(productId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request(`/wishlist/${productId}`, {
      method: 'DELETE',
    });

    return { success: true };
  }

  async checkInWishlist(productId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      return { inWishlist: false };
    }

    try {
      const response = await this.request<{ inWishlist: boolean }>(`/wishlist/check/${productId}`);
      return response;
    } catch (error) {
      return { inWishlist: false };
    }
  }

  // Recently Viewed API
  async getRecentlyViewed() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>('/recently-viewed');
    const items = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: items.map((item: any) => ({
        id: item.id,
        productId: item.productId || item.product?.id,
        product: item.product,
        viewedAt: item.viewedAt || item.viewed_at,
      })),
    };
  }

  async trackProductView(productId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      return; // Silently fail if not authenticated
    }

    try {
      await this.request(`/recently-viewed/${productId}`, {
        method: 'POST',
      });
    } catch (error) {
      // Silently fail - this is not critical
      console.error('Failed to track product view:', error);
    }
  }

  // Marketing Preferences API
  async getMarketingSubscription() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ subscribed: boolean; email: string }>('/marketing/subscription');
    return response;
  }

  async subscribeToMarketing() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ success: boolean }>('/marketing/subscribe', {
      method: 'POST',
    });

    return response;
  }

  async unsubscribeFromMarketing() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ success: boolean }>('/marketing/unsubscribe-customer', {
      method: 'POST',
    });

    return response;
  }

  // Reviews API
  async getProductReviews(productId: number) {
    const response = await this.request<any>(`/reviews/product/${productId}`);
    const reviews = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: reviews.map((review: any) => ({
        id: review.id,
        productId: review.productId || review.product?.id,
        customerId: review.customerId || review.customer?.id,
        customer: review.customer,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: review.status,
        helpfulCount: review.helpfulCount || 0,
        isVerifiedPurchase: review.isVerifiedPurchase || false,
        createdAt: review.createdAt || review.created_at,
      })),
    };
  }

  async getProductRecommendations(productId: number) {
    const [alsoBought, youMayLike, related] = await Promise.all([
      this.request<any[]>(`/products/${productId}/recommendations/customers-also-bought`),
      this.request<any[]>(`/products/${productId}/recommendations/you-may-like`),
      this.request<any[]>(`/products/${productId}/recommendations/related`),
    ]);

    return {
      customersAlsoBought: Array.isArray(alsoBought) ? alsoBought : (alsoBought as any)?.data || [],
      youMayLike: Array.isArray(youMayLike) ? youMayLike : (youMayLike as any)?.data || [],
      related: Array.isArray(related) ? related : (related as any)?.data || [],
    };
  }

  async getPersonalizedRecommendations() {
    const response = await this.request<any[]>(`/recommendations/personalized`);
    return { data: Array.isArray(response) ? response : (response as any)?.data || [] };
  }

  async getProductRatingStats(productId: number) {
    const response = await this.request<{
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<number, number>;
    }>(`/reviews/product/${productId}/stats`);
    return response;
  }

  async createReview(data: {
    productId: number;
    orderId?: number;
    rating: number;
    title?: string;
    comment?: string;
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return { success: true, data: response };
  }

  async getCustomerReviews() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>('/reviews/me');
    const reviews = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: reviews.map((review: any) => ({
        id: review.id,
        productId: review.productId || review.product?.id,
        product: review.product,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: review.status,
        helpfulCount: review.helpfulCount || 0,
        createdAt: review.createdAt || review.created_at,
      })),
    };
  }

  async updateReview(reviewId: number, data: {
    rating?: number;
    title?: string;
    comment?: string;
  }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return { success: true, data: response };
  }

  async deleteReview(reviewId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });

    return { success: true };
  }

  async reportReview(reviewId: number, data: { reason: string; comment?: string }) {
    return this.request(`/reviews/${reviewId}/report`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markReviewHelpful(reviewId: number) {
    const response = await this.request<any>(`/reviews/${reviewId}/helpful`, {
      method: 'POST',
    });

    return response;
  }

  // Sessions API
  async getActiveSessions() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>('/auth/sessions');
    const sessions = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: sessions.map((session: any) => ({
        id: session.id,
        device: session.device || 'Unknown',
        location: session.location || 'Unknown',
        ipAddress: session.ipAddress || 'Unknown',
        lastActivityAt: session.lastActivityAt || session.last_activity_at,
        createdAt: session.createdAt || session.created_at,
        isActive: session.isActive !== false,
      })),
    };
  }

  async revokeSession(sessionId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    return { success: true };
  }

  async revokeAllOtherSessions() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request('/auth/sessions/others', {
      method: 'DELETE',
    });

    return { success: true };
  }

  // Login History API
  async getLoginHistory() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>('/auth/login-history');
    const history = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: history.map((entry: any) => ({
        id: entry.id,
        status: entry.status,
        ipAddress: entry.ipAddress || 'Unknown',
        location: entry.location || 'Unknown',
        device: entry.device || 'Unknown',
        failureReason: entry.failureReason,
        createdAt: entry.createdAt || entry.created_at,
      })),
    };
  }

  // Account Activity API
  async getAccountActivities(params?: { limit?: number; type?: string }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const searchParams = new URLSearchParams();
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.type) {
      searchParams.append('type', params.type);
    }

    const queryString = searchParams.toString();
    const endpoint = `/account-activity${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<any>(endpoint);
    const activities = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: activities.map((activity: any) => ({
        id: activity.id,
        activityType: activity.activityType,
        description: activity.description,
        metadata: activity.metadata || {},
        ipAddress: activity.ipAddress,
        createdAt: activity.createdAt || activity.created_at,
      })),
    };
  }

  // Communication History API
  async getCommunicationHistory(params?: { limit?: number; type?: string }) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const searchParams = new URLSearchParams();
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.type) {
      searchParams.append('type', params.type);
    }

    const queryString = searchParams.toString();
    const endpoint = `/communication-history${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<any>(endpoint);
    const communications = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: communications.map((comm: any) => ({
        id: comm.id,
        communicationType: comm.communicationType,
        status: comm.status,
        subject: comm.subject,
        content: comm.content,
        metadata: comm.metadata || {},
        sentAt: comm.sentAt || comm.sent_at,
        deliveredAt: comm.deliveredAt || comm.delivered_at,
        openedAt: comm.openedAt || comm.opened_at,
        clickedAt: comm.clickedAt || comm.clicked_at,
        createdAt: comm.createdAt || comm.created_at,
      })),
    };
  }

  // Notification Preferences API
  async getNotificationPreferences() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ data: any[] }>('/notifications/preferences');
    return response.data || [];
  }

  async updateNotificationPreference(
    type: string,
    emailEnabled: boolean,
    inAppEnabled: boolean,
    smsEnabled?: boolean,
  ) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const body: any = {
      type,
      emailEnabled,
      inAppEnabled,
    };

    if (smsEnabled !== undefined) {
      body.smsEnabled = smsEnabled;
    }

    return this.request('/notifications/preferences', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Two-Factor Authentication API
  async get2FAStatus() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{
      isEnabled: boolean;
      isVerified: boolean;
      enabledAt: string | null;
    }>('/two-factor/status');
    return response;
  }

  async generate2FASecret() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{
      secret: string;
      qrCodeUrl: string;
      manualEntryKey: string;
    }>('/two-factor/generate', {
      method: 'POST',
    });

    return response;
  }

  async enable2FA(code: string) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{
      success: boolean;
      backupCodes: string[];
    }>('/two-factor/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });

    return response;
  }

  async verify2FACode(code: string) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ valid: boolean }>('/two-factor/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });

    return response;
  }

  async disable2FA() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request('/two-factor/disable', {
      method: 'DELETE',
    });

    return { success: true };
  }

  async regenerate2FABackupCodes() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<{ backupCodes: string[] }>('/two-factor/regenerate-backup-codes', {
      method: 'POST',
    });

    return response;
  }

  // Product Variants API
  async getProductVariants(productId: number) {
    const response = await this.request<any>(`/products/${productId}/variants`);
    return {
      data: Array.isArray(response) ? response : (response.data || []),
    };
  }

  async getProductVariant(productId: number, variantId: number) {
    return this.request<any>(`/products/${productId}/variants/${variantId}`);
  }

  // Saved Cards API
  async getSavedCards() {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>(`/customers/${user.id}/cards`);
    const cards = Array.isArray(response) ? response : (response.data || []);
    
    return {
      data: cards.map((card: any) => ({
        id: card.id,
        last4: card.last4,
        cardType: card.cardType || card.card_type,
        expiryMonth: card.expiryMonth || card.expiry_month,
        expiryYear: card.expiryYear || card.expiry_year,
        cardholderName: card.cardholderName || card.cardholder_name,
        isDefault: card.isDefault || card.is_default || false,
        createdAt: card.createdAt || card.created_at,
      })),
    };
  }

  async getSavedCard(cardId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>(`/customers/${user.id}/cards/${cardId}`);
    return {
      data: {
        id: response.id,
        last4: response.last4,
        cardType: response.cardType || response.card_type,
        expiryMonth: response.expiryMonth || response.expiry_month,
        expiryYear: response.expiryYear || response.expiry_year,
        cardholderName: response.cardholderName || response.cardholder_name,
        isDefault: response.isDefault || response.is_default || false,
      },
    };
  }

  async setDefaultCard(cardId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await this.request<any>(`/customers/${user.id}/cards/${cardId}/default`, {
      method: 'PUT',
    });

    return { success: true, data: response };
  }

  async deleteSavedCard(cardId: number) {
    const user = await clientAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    await this.request(`/customers/${user.id}/cards/${cardId}`, {
      method: 'DELETE',
    });

    return { success: true };
  }
}

export const clientApi = new ClientApiClient();
export default clientApi;
