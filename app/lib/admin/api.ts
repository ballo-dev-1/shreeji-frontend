// Admin API Client for NestJS Backend
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

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add JWT token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_jwt');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = getApiUrl(endpoint);
    const headers = this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - session expired
      if (response.status === 401) {
        // Clear authentication
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_jwt');
          
          // Store current URL to redirect back after login
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/admin/login')) {
            sessionStorage.setItem('adminReturnUrl', currentPath);
          }
          
          // Redirect to admin login
          window.location.href = '/admin/login';
        }
        
        const error: any = new Error('Session expired. Please log in again.');
        error.status = response.status;
        throw error;
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

      const error: any = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  // Products API
  async getProducts(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: Record<string, any>;
    sort?: string;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'brand' && typeof value === 'object' && (value as any).id) {
            searchParams.append('brandId', (value as any).id.toString());
          } else if (key === 'subcategory' && typeof value === 'object' && (value as any).id) {
            searchParams.append('subcategoryId', (value as any).id.toString());
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    if (params?.sort) {
      searchParams.append('sort', params.sort);
    }

    const queryString = searchParams.toString();
    const endpoint = `/admin/products${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  async getProduct(id: string | number) {
    return this.request<{ data: any }>(`/admin/products/${id}`);
  }

  async checkSKUExists(sku: string): Promise<boolean> {
    try {
      const response = await this.getProducts({
        filters: { sku },
        pagination: { page: 1, pageSize: 1 }
      });
      return (response as { data: any[]; meta: any }).data && (response as { data: any[]; meta: any }).data.length > 0;
    } catch (error) {
      // If there's an error, assume it doesn't exist to allow generation
      console.warn('Error checking SKU existence:', error);
      return false;
    }
  }

  async createProduct(data: any) {
    // Transform data to match NestJS DTO format
    const productData = {
      name: data.name,
      slug: data.slug || data.name,
      sku: data.SKU || data.sku,
      category: data.category,
      subcategoryId: data.subcategory ? (typeof data.subcategory === 'object' ? data.subcategory.id : data.subcategory) : undefined,
      brandId: data.brand ? (typeof data.brand === 'object' ? data.brand.id : data.brand) : undefined,
      tagline: data.tagline,
      description: data.description,
      specs: data.specs,
      specialFeature: data.specialFeature,
      images: data.images || [],
      dimensions: data.Dimensions || data.dimensions,
      sellingPrice: parseFloat(data.price || data.sellingPrice || 0),
      basePrice: parseFloat(data.basePrice || data.costPrice || 0),
      discountedPrice: data.discountedPrice !== undefined && data.discountedPrice !== null 
        ? parseFloat(data.discountedPrice) 
        : 0,
      taxRate: data.taxRate ? parseFloat(data.taxRate) : undefined,
      discountPercent: data.discountPercent !== undefined ? parseFloat(data.discountPercent) : undefined,
      weight: data.weight ? parseFloat(data.weight) : undefined,
      color: data.color,
      condition: data.condition,
      warrantyPeriod: data.warrantyPeriod,
      attributes: data.attributes,
      stockQuantity: parseInt(data.stockQuantity || 0),
      minStockLevel: data.minStockLevel ? parseInt(data.minStockLevel) : undefined,
      maxStockLevel: data.maxStockLevel ? parseInt(data.maxStockLevel) : undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    return this.request('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string | number, productData: any) {
    // Transform data to match NestJS DTO format
    const updateData: any = {};

    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.SKU !== undefined || productData.sku !== undefined) updateData.sku = productData.SKU || productData.sku;
    if (productData.slug !== undefined) updateData.slug = productData.slug;
    if (productData.category !== undefined) updateData.category = productData.category;
    // Handle subcategoryId - allow null to clear the relation
    if (productData.subcategory !== undefined) {
      const subcategoryValue =
        typeof productData.subcategory === 'object' && productData.subcategory !== null
          ? productData.subcategory.id
          : productData.subcategory;

      if (subcategoryValue !== undefined && subcategoryValue !== null && subcategoryValue !== '') {
        const numValue = Number(subcategoryValue);
        if (!isNaN(numValue)) {
          updateData.subcategoryId = numValue;
        }
      } else if (productData.subcategory === null || productData.subcategory === '') {
        // Explicitly set to null to clear the relation
        updateData.subcategoryId = null;
      }
    }
    // Handle brandId - allow null to clear the relation
    if (productData.brand !== undefined) {
      const brandValue =
        typeof productData.brand === 'object' && productData.brand !== null
          ? productData.brand.id
          : productData.brand;

      if (brandValue !== undefined && brandValue !== null && brandValue !== '') {
        const numValue = Number(brandValue);
        if (!isNaN(numValue)) {
          updateData.brandId = numValue;
        }
      } else if (productData.brand === null || productData.brand === '') {
        // Explicitly set to null to clear the relation
        updateData.brandId = null;
      }
    }
    if (productData.tagline !== undefined) updateData.tagline = productData.tagline;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.specs !== undefined) updateData.specs = productData.specs;
    if (productData.specialFeature !== undefined) updateData.specialFeature = productData.specialFeature;
    if (productData.images !== undefined) updateData.images = productData.images;
    if (productData.Dimensions !== undefined || productData.dimensions !== undefined) {
      updateData.dimensions = productData.Dimensions || productData.dimensions;
    }
    if (productData.price !== undefined || productData.sellingPrice !== undefined) {
      updateData.sellingPrice = parseFloat(productData.price || productData.sellingPrice);
    }
    if (productData.basePrice !== undefined || productData.costPrice !== undefined) {
      const basePriceValue = parseFloat(productData.basePrice || productData.costPrice);
      if (!isNaN(basePriceValue)) updateData.basePrice = basePriceValue;
    }
    // Always send discountedPrice as a number (including 0) if it's defined
    if (productData.discountedPrice !== undefined) {
      const discountedPriceNum = typeof productData.discountedPrice === 'number' 
        ? productData.discountedPrice 
        : parseFloat(productData.discountedPrice);
      // Explicitly send 0 if the value is 0 or NaN (to allow clearing discount)
      updateData.discountedPrice = isNaN(discountedPriceNum) ? 0 : discountedPriceNum;
    }
    if (productData.taxRate !== undefined) updateData.taxRate = parseFloat(productData.taxRate);
    if (productData.discountPercent !== undefined) updateData.discountPercent = parseFloat(productData.discountPercent);
    if (productData.weight !== undefined) {
      const weightValue = parseFloat(productData.weight);
      if (!isNaN(weightValue)) updateData.weight = weightValue;
    }
    if (productData.color !== undefined) updateData.color = productData.color;
    if (productData.condition !== undefined) updateData.condition = productData.condition;
    if (productData.warrantyPeriod !== undefined) updateData.warrantyPeriod = productData.warrantyPeriod;
    if (productData.attributes !== undefined) updateData.attributes = productData.attributes;
    if (productData.stockQuantity !== undefined) {
      const stockQty = parseInt(String(productData.stockQuantity), 10);
      if (!isNaN(stockQty)) updateData.stockQuantity = stockQty;
    }
    if (productData.minStockLevel !== undefined) {
      const minLevel = parseInt(String(productData.minStockLevel), 10);
      if (!isNaN(minLevel)) updateData.minStockLevel = minLevel;
    }
    if (productData.maxStockLevel !== undefined) {
      const maxLevel = parseInt(String(productData.maxStockLevel), 10);
      if (!isNaN(maxLevel)) updateData.maxStockLevel = maxLevel;
    }
    // stockStatus is calculated automatically by backend based on stockQuantity and minStockLevel
    if (productData.isActive !== undefined) updateData.isActive = productData.isActive;
    // SEO fields
    if (productData.metaTitle !== undefined) updateData.metaTitle = productData.metaTitle;
    if (productData.metaDescription !== undefined) updateData.metaDescription = productData.metaDescription;
    if (productData.metaKeywords !== undefined) updateData.metaKeywords = productData.metaKeywords;
    if (productData.ogImage !== undefined) updateData.ogImage = productData.ogImage;
    if (productData.schemaMarkup !== undefined) updateData.schemaMarkup = productData.schemaMarkup;

    // Debug: Log the update payload
    console.log('[API] Update payload:', JSON.stringify(updateData, null, 2));

    return this.request<{ data: any }>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteProduct(id: string | number) {
    return this.request(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Product Variants API
  async getProductVariants(productId: string | number) {
    const response = await this.request<any>(`/admin/products/${productId}/variants`);
    return {
      data: Array.isArray(response) ? response : ((response as any).data || []),
    };
  }

  async getProductVariant(productId: string | number, variantId: string | number) {
    return this.request<any>(`/admin/products/${productId}/variants/${variantId}`);
  }

  async createProductVariant(productId: string | number, variantData: any) {
    return this.request<any>(`/admin/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variantData),
    });
  }

  async updateProductVariant(productId: string | number, variantId: string | number, variantData: any) {
    return this.request<any>(`/admin/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(variantData),
    });
  }

  async deleteProductVariant(productId: string | number, variantId: string | number) {
    return this.request(`/admin/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
  }

  // Review Management API
  async getFlaggedReviews() {
    const response = await this.request<any>(`/reviews/admin/flagged`);
    return {
      data: Array.isArray(response) ? response : ((response as any).data || []),
    };
  }

  async moderateReview(reviewId: number, action: 'approve' | 'dismiss') {
    return this.request<any>(`/reviews/admin/${reviewId}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }

  // Bulk Product Operations
  async bulkImportProducts(payload: { products: any[] }) {
    return this.request(`/admin/products/bulk/import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async bulkUpdateProducts(payload: { action: 'price' | 'status'; priceUpdates?: any[]; statusUpdates?: any[] }) {
    return this.request(`/admin/products/bulk/update`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getBulkImportTemplate() {
    return this.request(`/admin/products/bulk/template`);
  }

  // Recommendations (admin may not need endpoints; placeholder for future admin analytics)

  // Brand API methods
  async getBrands(params?: {
    pagination?: { page: number; pageSize: number };
    populate?: string[];
  }) {
    return this.request<{ data: any[] }>('/admin/brands');
  }

  async getBrand(id: string | number) {
    return this.request<{ data: any }>(`/admin/brands/${id}`);
  }

  async createBrand(data: { name: string; logo?: number; logoUrl?: string; description?: string; website?: string }) {
    return this.request('/admin/brands', {
      method: 'POST',
      body: JSON.stringify({ name: data.name, logoUrl: data.logoUrl }),
    });
  }

  async updateBrand(id: string | number, data: { name?: string; logo?: number | null; logoUrl?: string; description?: string; website?: string }) {
    return this.request(`/admin/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: data.name, logoUrl: data.logoUrl }),
    });
  }

  async deleteBrand(id: string | number) {
    return this.request(`/admin/brands/${id}`, {
      method: 'DELETE',
    });
  }

  // Subcategory API methods
  async getSubcategories(params?: {
    category?: number;
    pagination?: { page: number; pageSize: number };
    populate?: string[];
  }) {
    const searchParams = new URLSearchParams();
    if (params?.category) {
      searchParams.append('categoryId', params.category.toString());
    }
    const queryString = searchParams.toString();
    return this.request<{ data: any[] }>(`/admin/subcategories${queryString ? `?${queryString}` : ''}`);
  }

  async getSubcategory(id: string | number) {
    return this.request<{ data: any }>(`/admin/subcategories/${id}`);
  }

  async createSubcategory(data: { name: string; category?: number; slug?: string }) {
    return this.request('/admin/subcategories', {
      method: 'POST',
      body: JSON.stringify({ name: data.name, urlPath: data.slug }),
    });
  }

  async updateSubcategory(id: string | number, data: { name?: string; category?: number; slug?: string }) {
    return this.request(`/admin/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: data.name, urlPath: data.slug }),
    });
  }

  async deleteSubcategory(id: string | number) {
    return this.request(`/admin/subcategories/${id}`, {
      method: 'DELETE',
    });
  }

  // Image Upload API - Use Next.js API route for file uploads
  async uploadImage(file: File): Promise<{ id: number; url: string; name: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Get headers with auth token (but don't set Content-Type for FormData)
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_jwt');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Use Next.js API route for file uploads
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: headers, // Include Authorization header
      body: formData, // Don't set Content-Type - browser will set it with boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Image upload failed: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      const error: any = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return {
      id: data.id || Date.now(),
      url: data.url,
      name: data.name || file.name,
    };
  }

  async uploadImages(files: File[]): Promise<Array<{ id: number; url: string; name: string }>> {
    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  // Customers API
  async getCustomers(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: Record<string, any>;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/admin/customers${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[] }>(endpoint);
  }

  async createCustomer(data: any) {
    // Customers are created via checkout, not directly in admin
    throw new Error('Use checkout endpoint to create customers');
  }

  async updateCustomer(id: string, data: any) {
    return this.request<{ data: any }>(`/admin/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Orders API
  async getOrders(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: Record<string, any>;
    populate?: string[];
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/admin/orders${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  async getCustomer(id: string | number) {
    return this.request<{ data: any }>(`/admin/customers/${id}`);
  }

  async getOrder(id: string | number) {
    return this.request<{ data: any }>(`/admin/orders/${id}`);
  }

  async createOrder(data: any) {
    // Orders are created via checkout, not directly in admin
    throw new Error('Use checkout endpoint to create orders');
  }

  async updateOrder(id: string | number, data: any) {
    return this.request<{ data: any }>(`/admin/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelOrder(id: string | number, reason?: string) {
    return this.request<{ success: boolean; message: string }>(`/orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Returns API
  async getReturns(params?: {
    status?: string;
    customerId?: number;
    orderId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.status) {
      searchParams.append('status', params.status);
    }
    if (params?.customerId) {
      searchParams.append('customerId', params.customerId.toString());
    }
    if (params?.orderId) {
      searchParams.append('orderId', params.orderId.toString());
    }
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize) {
      searchParams.append('pageSize', params.pageSize.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/returns${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  async getReturn(id: string | number) {
    return this.request<{ data: any }>(`/returns/${id}`);
  }

  async approveReturn(id: string | number) {
    return this.request<{ success: boolean; message: string; data: any }>(`/returns/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectReturn(id: string | number, rejectionReason: string) {
    return this.request<{ success: boolean; message: string; data: any }>(`/returns/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    });
  }

  // Orders Export API
  async exportOrdersToCSV(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.paymentStatus) searchParams.append('paymentStatus', params.paymentStatus);

    const queryString = searchParams.toString();
    const endpoint = `/orders/admin/export/csv${queryString ? `?${queryString}` : ''}`;
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export orders');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async exportOrdersToPDF(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.paymentStatus) searchParams.append('paymentStatus', params.paymentStatus);

    const queryString = searchParams.toString();
    const endpoint = `/orders/admin/export/pdf${queryString ? `?${queryString}` : ''}`;
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export orders');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Payments Export API
  async exportPaymentsToCSV(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentMethod?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.paymentMethod) searchParams.append('paymentMethod', params.paymentMethod);

    const queryString = searchParams.toString();
    const endpoint = `/admin/payments/export/csv${queryString ? `?${queryString}` : ''}`;
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export payments');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async exportPaymentsToPDF(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentMethod?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.paymentMethod) searchParams.append('paymentMethod', params.paymentMethod);

    const queryString = searchParams.toString();
    const endpoint = `/admin/payments/export/pdf${queryString ? `?${queryString}` : ''}`;
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export payments');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `payments-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async getOrderAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
    groupBy?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.paymentStatus) searchParams.append('paymentStatus', params.paymentStatus);
    if (params?.groupBy) searchParams.append('groupBy', params.groupBy);

    const queryString = searchParams.toString();
    return this.request<{ data: any }>(`/orders/admin/analytics${queryString ? `?${queryString}` : ''}`);
  }

  // Payments API
  async getPayments(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: Record<string, any>;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/admin/payments${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  // Coupons API
  async getCoupons(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: Record<string, any>;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/admin/coupons${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  async getCoupon(id: string | number) {
    return this.request<{ data: any }>(`/admin/coupons/${id}`);
  }

  async createCoupon(data: any) {
    return this.request('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCoupon(id: string | number, data: any) {
    return this.request<{ data: any }>(`/admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCoupon(id: string | number) {
    return this.request(`/admin/coupons/${id}`, {
      method: 'DELETE',
    });
  }

  // Loyalty Program API
  async getLoyaltyRules() {
    return this.request<{ data: any[] }>('/admin/loyalty/rules');
  }

  async createLoyaltyRule(rule: any) {
    return this.request<{ data: any }>('/admin/loyalty/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updateLoyaltyRule(id: number | string, rule: any) {
    return this.request<{ data: any }>(`/admin/loyalty/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deleteLoyaltyRule(id: number | string) {
    return this.request<{ success: boolean }>(`/admin/loyalty/rules/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings API
  async getAllSettings() {
    return this.request<Record<string, any>>('/admin/settings');
  }

  async getSettingsByCategory(category: string) {
    return this.request<Record<string, any>>(`/admin/settings/${category}`);
  }

  async updateSetting(category: string, key: string, value: any, type?: string) {
    return this.request(`/admin/settings/${category}/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, type }),
    });
  }

  async updateSettings(category: string, settings: Record<string, any>) {
    const endpoint = `/admin/settings/${category}`;
    const url = getApiUrl(endpoint);
    
    console.log(`📤 [API] PUT ${url}`);
    console.log(`📤 [API] Request body:`, JSON.stringify(settings, null, 2));
    console.log(`📤 [API] isEnabled value:`, settings.isEnabled, `(type: ${typeof settings.isEnabled})`);
    
    try {
      const response = await this.request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      console.log(`📥 [API] Response for ${category}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ [API] Error for ${category}:`, error);
      throw error;
    }
  }

  async initializeSettings() {
    return this.request('/admin/settings/initialize', {
      method: 'POST',
    });
  }

  // Inventory Management API
  async getWarehouses(filters?: { isActive?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString());
    }
    const queryString = params.toString();
    return this.request(`/inventory/warehouses${queryString ? `?${queryString}` : ''}`);
  }

  async getWarehouse(id: number) {
    return this.request(`/inventory/warehouses/${id}`);
  }

  async createWarehouse(data: any) {
    return this.request('/inventory/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWarehouse(id: number, data: any) {
    return this.request(`/inventory/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWarehouse(id: number) {
    return this.request(`/inventory/warehouses/${id}`, {
      method: 'DELETE',
    });
  }

  async getWarehouseInventory(warehouseId: number, productId?: number) {
    const params = new URLSearchParams();
    if (productId) {
      params.append('productId', productId.toString());
    }
    const queryString = params.toString();
    return this.request(`/inventory/warehouses/${warehouseId}/inventory${queryString ? `?${queryString}` : ''}`);
  }

  async reserveInventory(data: any) {
    return this.request('/inventory/reserve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async releaseReservation(data: { reservationId?: number; orderId?: number }) {
    return this.request('/inventory/release', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmReservation(reservationId: number) {
    return this.request(`/inventory/confirm-reservation/${reservationId}`, {
      method: 'POST',
    });
  }

  async adjustStock(data: any) {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async transferStock(data: any) {
    return this.request('/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInventoryMovements(filters?: {
    productId?: number;
    warehouseId?: number;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.productId) params.append('productId', filters.productId.toString());
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId.toString());
    if (filters?.movementType) params.append('movementType', filters.movementType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return this.request(`/inventory/movements${queryString ? `?${queryString}` : ''}`);
  }

  async getLowStockProducts(warehouseId?: number, threshold?: number) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    if (threshold) params.append('threshold', threshold.toString());
    const queryString = params.toString();
    return this.request(`/inventory/low-stock${queryString ? `?${queryString}` : ''}`);
  }

  async getReorderPoints(warehouseId?: number) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    const queryString = params.toString();
    return this.request(`/inventory/reorder-points${queryString ? `?${queryString}` : ''}`);
  }

  // Inventory Alerts API
  async getAlertSettings() {
    return this.request('/inventory/alerts/settings');
  }

  async updateAlertSettings(data: any) {
    return this.request('/inventory/alerts/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async checkAlerts(warehouseId?: number) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    const queryString = params.toString();
    return this.request(`/inventory/alerts/check${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
    });
  }

  async getAlertHistory(warehouseId?: number, limit?: number) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    if (limit) params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request(`/inventory/alerts/history${queryString ? `?${queryString}` : ''}`);
  }

  // Inventory Reports API
  async getStockLevelReport(warehouseId?: number, format?: 'csv' | 'pdf') {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    if (format) params.append('format', format);
    const queryString = params.toString();
    return this.request(`/inventory/reports/stock-levels${queryString ? `?${queryString}` : ''}`);
  }

  async getValuationReport(warehouseId?: number, format?: 'csv' | 'pdf') {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    if (format) params.append('format', format);
    const queryString = params.toString();
    return this.request(`/inventory/reports/valuation${queryString ? `?${queryString}` : ''}`);
  }

  async getMovementReport(filters?: {
    warehouseId?: number;
    productId?: number;
    dateFrom?: string;
    dateTo?: string;
    format?: 'csv' | 'pdf';
  }) {
    const params = new URLSearchParams();
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId.toString());
    if (filters?.productId) params.append('productId', filters.productId.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.format) params.append('format', filters.format);
    const queryString = params.toString();
    return this.request(`/inventory/reports/movements${queryString ? `?${queryString}` : ''}`);
  }

  async getSlowMovingReport(warehouseId?: number, daysThreshold?: number, format?: 'csv' | 'pdf') {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    if (daysThreshold) params.append('daysThreshold', daysThreshold.toString());
    if (format) params.append('format', format);
    const queryString = params.toString();
    return this.request(`/inventory/reports/slow-moving${queryString ? `?${queryString}` : ''}`);
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<{
    totalProducts: number;
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    inventoryValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  }> {
    return this.request('/admin/dashboard/stats');
  }

  // Admin Users API
  async getAdminUsers(params?: {
    pagination?: { page: number; pageSize: number };
    filters?: { role?: string; isActive?: boolean };
  }) {
    const searchParams = new URLSearchParams();

    if (params?.pagination) {
      searchParams.append('page', params.pagination.page.toString());
      searchParams.append('pageSize', params.pagination.pageSize.toString());
    }

    if (params?.filters) {
      if (params.filters.role) {
        searchParams.append('role', params.filters.role);
      }
      if (params.filters.isActive !== undefined) {
        searchParams.append('isActive', params.filters.isActive.toString());
      }
    }

    const queryString = searchParams.toString();
    const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;

    return this.request<{ data: any[]; meta: any }>(endpoint);
  }

  async getAdminUser(id: string | number) {
    return this.request<{ data: any }>(`/admin/users/${id}`);
  }

  async createAdminUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: 'super_admin' | 'manager' | 'support';
    isActive?: boolean;
  }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(id: string | number, data: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: 'super_admin' | 'manager' | 'support';
    isActive?: boolean;
  }) {
    return this.request<{ data: any }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string | number) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Search Logs API
  async getSearchLogs(params?: {
    page?: number;
    pageSize?: number;
    query?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize) {
      searchParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.query) {
      searchParams.append('query', params.query);
    }
    if (params?.startDate) {
      searchParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      searchParams.append('endDate', params.endDate);
    }

    const queryString = searchParams.toString();
    return this.request<{ data: any[]; meta: any }>(
      `/admin/search-logs${queryString ? `?${queryString}` : ''}`
    );
  }

  async getPopularSearches(limit?: number) {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }
    const queryString = searchParams.toString();
    return this.request<any[]>(
      `/admin/search-logs/popular${queryString ? `?${queryString}` : ''}`
    );
  }

  async getSearchStats(startDate?: string, endDate?: string) {
    const searchParams = new URLSearchParams();
    if (startDate) {
      searchParams.append('startDate', startDate);
    }
    if (endDate) {
      searchParams.append('endDate', endDate);
    }
    const queryString = searchParams.toString();
    return this.request<{
      totalSearches: number;
      uniqueQueries: number;
      zeroResultSearches: number;
      avgResultCount: number;
    }>(`/admin/search-logs/stats${queryString ? `?${queryString}` : ''}`);
  }
}

export const api = new ApiClient();
export default api;
