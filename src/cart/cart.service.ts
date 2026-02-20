import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { CatalogService } from '../catalog/catalog.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart, CartItem } from './interfaces/cart.interface';

@Injectable()
export class CartService {
  private readonly carts = new Map<string, Cart>();

  private readonly apiUrl: string;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('ECOM_API_URL') || 'http://localhost:4000';
  }

  async createCart(currency = 'USD'): Promise<Cart> {
    const id = uuid();
    const cart: Cart = {
      id,
      currency,
      items: [],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      updatedAt: new Date().toISOString(),
    };
    this.carts.set(id, cart);
    return cart;
  }

  getCart(cartId: string): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }
    return cart;
  }

  async addItem(cartId: string, payload: AddCartItemDto): Promise<Cart> {
    const cart = this.getCart(cartId);
    const product = await this.catalogService.getProductById(payload.productId);

    // If variantId is provided, fetch variant details
    let variant = null;
    let variantPrice = product.price;
    let variantAttributes: Record<string, string> = {};
    let variantSku = product.sku;
    
    if (payload.variantId) {
      try {
        // Fetch variant from API
        const variantResponse = await firstValueFrom(
          this.httpService.get(`${this.apiUrl}/products/${payload.productId}/variants/${payload.variantId}`)
        );
        variant = variantResponse.data?.data || variantResponse.data;
        
        if (variant) {
          variantPrice = (variant.discountedPrice && variant.discountedPrice > 0)
            ? variant.discountedPrice
            : (variant.price || product.price);
          variantAttributes = variant.attributes || variant.specs || {};
          variantSku = variant.sku || product.sku;
        }
      } catch (error) {
        console.error('Failed to fetch variant:', error);
        // Continue with product price if variant fetch fails
      }
    }

    // Check stock - use variant stock if variant exists
    const stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
    if (stockQuantity < payload.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Find existing item - check both productId AND variantId
    // Variants should be separate cart items
    const existingItem = cart.items.find((item) => 
      item.productId === product.id && 
      (item.variantId === payload.variantId || (!item.variantId && !payload.variantId))
    );

    if (existingItem) {
      existingItem.quantity += payload.quantity;
      existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
    } else {
      // Use variant price if variant exists, otherwise use product price
      const unitPrice = variantPrice;
      
      const cartItem: CartItem = {
        id: uuid(),
        productId: product.id,
        variantId: payload.variantId,
        quantity: payload.quantity,
        unitPrice,
        taxRate: product.taxRate ?? undefined,
        subtotal: unitPrice * payload.quantity,
        productSnapshot: {
          id: product.id,
          name: product.name,
          sku: variantSku,
          slug: product.slug,
          price: product.price,
          discountedPrice: variant?.discountedPrice || product.discountedPrice,
          taxRate: product.taxRate,
          isDigital: product.isDigital,
          variantAttributes: Object.keys(variantAttributes).length > 0 ? variantAttributes : undefined,
        },
      };
      cart.items.push(cartItem);
    }

    this.recalculate(cart);
    return cart;
  }

  updateItem(cartId: string, itemId: string, payload: UpdateCartItemDto): Cart {
    const cart = this.getCart(cartId);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found in cart`);
    }

    item.quantity = payload.quantity;
    item.subtotal = item.quantity * item.unitPrice;
    this.recalculate(cart);
    return cart;
  }

  removeItem(cartId: string, itemId: string): Cart {
    const cart = this.getCart(cartId);
    cart.items = cart.items.filter((item) => item.id !== itemId);
    this.recalculate(cart);
    return cart;
  }

  clearCart(cartId: string): Cart {
    const cart = this.getCart(cartId);
    cart.items = [];
    this.recalculate(cart);
    return cart;
  }

  private recalculate(cart: Cart) {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    // Product prices are VAT-inclusive; do not add tax on top
    cart.taxTotal = 0;
    cart.total = cart.subtotal;
    cart.updatedAt = new Date().toISOString();
  }
}

