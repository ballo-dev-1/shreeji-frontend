export interface ProductImage {
  id?: number;
  url: string;
  alt?: string;
  isMain?: boolean;
}

export interface CartItemSnapshot {
  id: number;
  name: string;
  sku: string;
  slug: string;
  price: number;
  discountedPrice?: number | null;
  taxRate?: number | null;
  isDigital: boolean;
  images?: ProductImage[];
  variantAttributes?: Record<string, string>;
}

export interface CartItem {
  id: string;
  productId: number;
  variantId?: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate?: number;
  productSnapshot: CartItemSnapshot;
}

export interface Cart {
  id: string;
  currency: string;
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  updatedAt: string;
}

export interface CheckoutCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CheckoutAddressInput {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CheckoutCardDetails {
  cardId?: string; // For saved cards
  number?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  cardholderName?: string;
  saveCard?: boolean; // Save card for future purchases
}

export interface CheckoutMobileMoneyDetails {
  provider: 'mtn' | 'airtel' | 'zamtel' | 'orange';
  phoneNumber: string;
}

export interface CheckoutPickupDetails {
  preferredPickupDate: string;
  preferredPickupTime: string;
  collectingPersonName?: string;
  collectingPersonPhone?: string;
  collectingPersonRelationship?: string;
  vehicleInfo?: string;
  idType: 'nrc' | 'passport' | 'drivers_license' | 'other';
  idNumber: string;
  specialInstructions?: string;
}

export interface CheckoutRequest {
  cartId: string;
  customer: CheckoutCustomerInput;
  shippingAddress: CheckoutAddressInput;
  billingAddress?: CheckoutAddressInput;
  paymentMethod: string;
  cardDetails?: CheckoutCardDetails;
  mobileMoneyDetails?: CheckoutMobileMoneyDetails;
  pickupDetails?: CheckoutPickupDetails;
  notes?: string;
  couponCode?: string;
}

export interface CheckoutResponse {
  orderNumber: string;
  orderId: number;
  paymentStatus: string;
  redirectUrl?: string;
  requiresAction?: boolean;
  totals: {
    subtotal: number;
    taxAmount: number;
    shippingAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    currency: string;
  };
}

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  
  // Removed warning - default URL is expected in development

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      let message = 'Something went wrong'
      let errorData: any = null
      try {
        errorData = await response.json()
        message = errorData.message || errorData.error?.message || errorData.error || message
      } catch {
        try {
          message = await response.text()
        } catch {
          message = `Request failed: ${response.status} ${response.statusText}`
        }
      }
      
      // Don't log 404s for product lookups (they're handled gracefully)
      // Also include status code in error message for better error detection
      const errorMessage = message || `Request failed: ${response.status} ${response.statusText}`
      const fullErrorMessage = `${errorMessage} (${response.status})`
      
      if (response.status !== 404 || !url.includes('/products/')) {
        console.error(`API request failed: ${response.status} ${response.statusText}`, { url, message: errorMessage })
      }
      
      throw new Error(fullErrorMessage)
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error - is the backend running?', { url, API_URL })
      throw new Error('Unable to connect to the server. Please ensure the backend is running.')
    }
    throw error
  }
}

export async function createCart(currency = 'ZMW'): Promise<Cart> {
  return request<Cart>('/cart', {
    method: 'POST',
    body: JSON.stringify({ currency }),
  });
}

export async function getCart(cartId: string): Promise<Cart> {
  return request<Cart>(`/cart/${cartId}`);
}

export async function addCartItem(
  cartId: string, 
  productId: number | string, 
  quantity: number,
  variantId?: number
): Promise<Cart> {
  return request<Cart>(`/cart/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, variantId }),
  });
}

export async function updateCartItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
  return request<Cart>(`/cart/${cartId}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(cartId: string, itemId: string): Promise<Cart> {
  // Ensure itemId is properly formatted
  if (!itemId || typeof itemId !== 'string') {
    throw new Error('Invalid item ID');
  }
  
  // Don't validate UUID format here - let the backend handle it
  // This allows for backward compatibility and proper error handling
  return await request<Cart>(`/cart/${cartId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearCart(cartId: string): Promise<Cart> {
  return request<Cart>(`/cart/${cartId}`, {
    method: 'DELETE',
  });
}

export async function checkoutCart(payload: CheckoutRequest): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  swiftCode?: string;
  iban?: string;
  deadlineHours: number;
}

export async function getBankDetails(): Promise<BankDetails> {
  return request<BankDetails>('/payments/bank-details');
}

export interface EnabledPaymentMethods {
  enabledMethods: string[];
}

export async function getEnabledPaymentMethods(): Promise<EnabledPaymentMethods> {
  return request<EnabledPaymentMethods>('/payments/enabled-methods');
}
