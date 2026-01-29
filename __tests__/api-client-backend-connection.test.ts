/**
 * TDD Tests for Frontend-Backend Connection
 * 
 * These tests verify that the frontend correctly connects to the backend
 * by testing API client configuration, URL construction, and error handling.
 */

// Mock fetch globally
global.fetch = jest.fn();

describe('API Client Backend Connection', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ECOM_API_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
    // Reset environment variable
    delete process.env.NEXT_PUBLIC_ECOM_API_URL;
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv) {
      process.env.NEXT_PUBLIC_ECOM_API_URL = originalEnv;
    }
  });

  describe('Environment Variable Configuration', () => {
    it('should use NEXT_PUBLIC_ECOM_API_URL when set', async () => {
      // Arrange: Set production URL
      process.env.NEXT_PUBLIC_ECOM_API_URL = 'https://api.example.com';
      
      // Clear module cache to reload with new env var
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Make API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert: Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/cart',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should fallback to localhost:4000 when NEXT_PUBLIC_ECOM_API_URL is not set', async () => {
      // Arrange: Explicitly set to undefined (Next.js env vars can be tricky in tests)
      // We need to ensure the module sees it as truly undefined
      const originalEnv = process.env.NEXT_PUBLIC_ECOM_API_URL;
      delete process.env.NEXT_PUBLIC_ECOM_API_URL;
      
      // Clear module cache to reload with undefined env var
      jest.resetModules();
      
      // Mock process.env to ensure it's undefined
      const originalProcessEnv = process.env;
      process.env = { ...originalProcessEnv };
      delete process.env.NEXT_PUBLIC_ECOM_API_URL;
      
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Make API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert: Verify fetch was called with localhost fallback
      // The API client uses: process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000'
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:4000/cart');
      expect(fetchCall[1]).toMatchObject({
        method: 'POST',
      });
      
      // Restore
      process.env = originalProcessEnv;
      if (originalEnv) {
        process.env.NEXT_PUBLIC_ECOM_API_URL = originalEnv;
      }
    });

    it('should handle trailing slash in NEXT_PUBLIC_ECOM_API_URL', async () => {
      // Arrange: Set URL with trailing slash
      process.env.NEXT_PUBLIC_ECOM_API_URL = 'https://api.example.com/';
      
      // Clear module cache
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Make API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert: Verify trailing slash was removed
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/cart', // No double slash
        expect.anything()
      );
    });

    it('should use Digital Ocean production URL when configured', async () => {
      // Arrange: Set Digital Ocean URL
      const digitalOceanUrl = 'https://your-backend-app.ondigitalocean.app';
      process.env.NEXT_PUBLIC_ECOM_API_URL = digitalOceanUrl;
      
      // Clear module cache
      jest.resetModules();
      const { getCart } = await import('@/app/lib/ecommerce/api');

      // Act: Make API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await getCart('cart-123');

      // Assert: Verify Digital Ocean URL was used
      expect(global.fetch).toHaveBeenCalledWith(
        `${digitalOceanUrl}/cart/cart-123`,
        expect.anything()
      );
    });
  });

  describe('URL Construction', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ECOM_API_URL = 'https://api.example.com';
    });

    it('should construct correct URL for catalog endpoints', async () => {
      // Arrange
      jest.resetModules();
      const clientApi = await import('@/app/lib/client/api');
      const api = clientApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      });

      await api.getProducts();

      // Assert: Verify catalog endpoint URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/catalog/products',
        expect.anything()
      );
    });

    it('should construct correct URL for cart endpoints', async () => {
      // Arrange
      jest.resetModules();
      const { addCartItem } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await addCartItem('cart-123', 1, 2);

      // Assert: Verify cart endpoint URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/cart/cart-123/items',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should construct correct URL for admin endpoints', async () => {
      // Arrange
      jest.resetModules();
      const adminApi = await import('@/app/lib/admin/api');
      const api = adminApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      });

      await api.getProducts();

      // Assert: Verify admin endpoint URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/admin/products',
        expect.anything()
      );
    });

    it('should construct correct URL for checkout endpoint', async () => {
      // Arrange
      jest.resetModules();
      const { checkoutCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderNumber: 'ORD-123',
          orderId: 1,
          paymentStatus: 'pending',
          totals: { totalAmount: 100, currency: 'ZMW' },
        }),
      });

      await checkoutCart({
        cartId: 'cart-123',
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '123 Main St',
          city: 'Lusaka',
          postalCode: '10101',
          country: 'Zambia',
        },
        paymentMethod: 'card',
      });

      // Assert: Verify checkout endpoint URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/checkout',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ECOM_API_URL = 'https://api.example.com';
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Simulate network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      // Assert: Should throw user-friendly error
      await expect(createCart()).rejects.toThrow(
        'Unable to connect to the server. Please ensure the backend is running.'
      );
    });

    it('should handle 404 errors with descriptive message', async () => {
      // Arrange
      jest.resetModules();
      const { getCart } = await import('@/app/lib/ecommerce/api');

      // Act: Simulate 404 error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Cart not found' }),
      });

      // Assert: Should throw error with status code
      await expect(getCart('invalid-cart-id')).rejects.toThrow(/404/);
    });

    it('should handle 500 errors with descriptive message', async () => {
      // Arrange
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Simulate 500 error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Internal server error' }),
      });

      // Assert: Should throw error with status code
      await expect(createCart()).rejects.toThrow(/500/);
    });

    it('should handle CORS errors gracefully', async () => {
      // Arrange
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Simulate CORS error (network error in browser)
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      // Assert: Should provide helpful error message
      await expect(createCart()).rejects.toThrow(
        'Unable to connect to the server'
      );
    });

    it('should include status code in error message', async () => {
      // Arrange
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act: Simulate 401 error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Unauthorized' }),
      });

      // Assert: Error should include status code
      try {
        await createCart();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('401');
      }
    });
  });

  describe('Request Configuration', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ECOM_API_URL = 'https://api.example.com';
    });

    it('should set Content-Type header to application/json', async () => {
      // Arrange
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert: Verify Content-Type header
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should set cache to no-store', async () => {
      // Arrange
      jest.resetModules();
      const { getCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await getCart('cart-123');

      // Assert: Verify cache setting
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });

    it('should include Authorization header when token is present (client API)', async () => {
      // Arrange
      jest.resetModules();
      
      // Mock localStorage
      const mockToken = 'test-jwt-token';
      Storage.prototype.getItem = jest.fn((key: string) => {
        if (key === 'client_jwt') return mockToken;
        return null;
      });

      const clientApi = await import('@/app/lib/client/api');
      const api = clientApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await api.getAddresses();

      // Assert: Verify Authorization header
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should include Authorization header when token is present (admin API)', async () => {
      // Arrange
      jest.resetModules();
      
      // Mock localStorage
      const mockToken = 'admin-jwt-token';
      Storage.prototype.getItem = jest.fn((key: string) => {
        if (key === 'admin_jwt') return mockToken;
        return null;
      });

      const adminApi = await import('@/app/lib/admin/api');
      const api = adminApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await api.getProducts();

      // Assert: Verify Authorization header
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });
  });

  describe('Production vs Development', () => {
    it('should use production URL when NEXT_PUBLIC_ECOM_API_URL points to production', async () => {
      // Arrange: Set production URL
      const productionUrl = 'https://api.production.com';
      process.env.NEXT_PUBLIC_ECOM_API_URL = productionUrl;
      
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert: Should use production URL, not localhost
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(productionUrl),
        expect.anything()
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('localhost'),
        expect.anything()
      );
    });

    it('should use localhost when NEXT_PUBLIC_ECOM_API_URL is not set (development)', async () => {
      // Arrange: Explicitly ensure env var is undefined
      const originalEnv = process.env.NEXT_PUBLIC_ECOM_API_URL;
      delete process.env.NEXT_PUBLIC_ECOM_API_URL;
      
      jest.resetModules();
      
      // Ensure process.env doesn't have the variable
      const originalProcessEnv = process.env;
      process.env = { ...originalProcessEnv };
      delete process.env.NEXT_PUBLIC_ECOM_API_URL;
      
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert: Should use localhost fallback
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('localhost:4000');
      
      // Restore
      process.env = originalProcessEnv;
      if (originalEnv) {
        process.env.NEXT_PUBLIC_ECOM_API_URL = originalEnv;
      }
    });

    it('should handle Digital Ocean URL format correctly', async () => {
      // Arrange: Digital Ocean URL
      const doUrl = 'https://your-backend-app.ondigitalocean.app';
      process.env.NEXT_PUBLIC_ECOM_API_URL = doUrl;
      
      jest.resetModules();
      const { getCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await getCart('cart-123');

      // Assert: Should use Digital Ocean URL
      expect(global.fetch).toHaveBeenCalledWith(
        `${doUrl}/cart/cart-123`,
        expect.anything()
      );
    });
  });

  describe('All API Clients', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ECOM_API_URL = 'https://api.example.com';
    });

    it('should use same base URL for ecommerce API', async () => {
      // Arrange
      jest.resetModules();
      const { createCart } = await import('@/app/lib/ecommerce/api');

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cart-123', items: [], total: 0 }),
      });

      await createCart();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/cart',
        expect.anything()
      );
    });

    it('should use same base URL for client API', async () => {
      // Arrange
      jest.resetModules();
      const clientApi = await import('@/app/lib/client/api');
      const api = clientApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      });

      await api.getProducts();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com'),
        expect.anything()
      );
    });

    it('should use same base URL for admin API', async () => {
      // Arrange
      jest.resetModules();
      const adminApi = await import('@/app/lib/admin/api');
      const api = adminApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      });

      await api.getProducts();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com'),
        expect.anything()
      );
    });

    it('should use same base URL for notifications API', async () => {
      // Arrange
      jest.resetModules();
      
      // Mock localStorage for auth
      Storage.prototype.getItem = jest.fn(() => null);
      
      const notificationsApi = await import('@/app/lib/notifications/api');
      const api = notificationsApi.default;

      // Act
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      });

      await api.getNotifications();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com'),
        expect.anything()
      );
    });
  });
});

