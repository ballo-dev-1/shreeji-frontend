// Client-side product fetching and transformation utilities
// Replaces productsData.js functions with NestJS API calls

import clientApi from './api';
import { processProductImages } from '@/app/lib/admin/image-mapping';

// Transform NestJS product format to match local productsData.js format
function transformProduct(nestProduct: any): any {
  if (!nestProduct) return null;

  // NestJS returns product directly (not wrapped in attributes)
  const productData = nestProduct;
  const productId = productData.id;

  // Debug: Log specs and specialFeature for first product
  if (productId === 1) {
    console.log(`[DEBUG] Product ${productId} raw specs:`, productData.specs, typeof productData.specs);
    console.log(`[DEBUG] Product ${productId} raw specialFeature:`, productData.specialFeature, typeof productData.specialFeature);
    console.log(`[DEBUG] Product ${productId} specs keys:`, productData.specs ? Object.keys(productData.specs) : 'null/undefined');
  }

  // Process images using existing utility (handles local mapping and backend images)
  const processedImages = processProductImages(productData);
  
  // Convert images array format: [{url, alt, isMain}] to [url, url, ...] for compatibility
  // Ensure URLs are absolute or properly formatted for Next.js Image component
  const imageUrls = processedImages && Array.isArray(processedImages) && processedImages.length > 0
    ? processedImages
        .map(img => {
          if (!img || typeof img !== 'object') {
            return null;
          }
          
          let url = img?.url;
          
          // Ensure url is a string
          if (!url || typeof url !== 'string') {
            return null;
          }
          
          // Convert HTTP to HTTPS for mixed content security
          if (url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
          }
          
          // If URL is relative and starts with /, it should work with Next.js
          // If it's from backend/Imghippo, it should already be absolute
          // Convert @/public paths if present
          if (url.startsWith('@/public')) {
            url = url.replace('@/public', '');
          }
          // Ensure absolute URLs from backend work (they should already be absolute)
          return url;
        })
        .filter((url): url is string => url !== null && url !== undefined) // Remove any null/undefined values
    : []; // Fallback to empty array if no images

  // Format date-added from dateAdded or createdAt
  const dateAdded = productData.dateAdded 
    ? new Date(productData.dateAdded).toISOString().split('T')[0] // YYYY-MM-DD format
    : productData.createdAt
    ? new Date(productData.createdAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

      // Extract brand information from relation
      let brandName = '';
      let brandLogo: string | null = null;
      
      if (productData.brand) {
        // NestJS returns brand as object directly
        brandName = productData.brand.name || '';
        brandLogo = productData.brand.logoUrl || null;
      }

      // Extract category - handle both string and object cases
      let categoryName = '';
      if (productData.category) {
        if (typeof productData.category === 'object') {
          categoryName = productData.category.name || productData.category || '';
        } else {
          categoryName = String(productData.category).trim();
        }
      }
      

      // Extract subcategory - handle both string and object cases
      let subcategoryName = '';
      if (productData.subcategory) {
        if (typeof productData.subcategory === 'object' && productData.subcategory !== null) {
          // Handle object with name property (from relation)
          subcategoryName = productData.subcategory.name || '';
        } else {
          // Handle string
          subcategoryName = String(productData.subcategory);
        }
      }

      return {
        id: productId,
        documentId: productData.documentId || String(productId),
        name: productData.name || '',
        category: categoryName,
        subcategory: subcategoryName,
        images: imageUrls, // Array of image URLs for compatibility
        brand: brandName,
        'brand logo': brandLogo,
        price: String(productData.price || productData.sellingPrice || ''),
        'discounted price': productData.discountedPrice ? String(productData.discountedPrice) : '',
        tagline: productData.tagline || '',
        description: productData.description || '',
        specs: (() => {
          const specs = productData.specs;
          if (!specs || typeof specs !== 'object') return null;
          const keys = Object.keys(specs);
          if (keys.length === 0) return null;
          // Debug for first product
          if (productId === 1) {
            console.log(`[DEBUG] Product ${productId} specs transformed:`, specs, `(${keys.length} keys)`);
          }
          return specs;
        })(),
        'special feature': (() => {
          const sf = productData.specialFeature;
          if (!sf || typeof sf !== 'object') return null;
          const keys = Object.keys(sf);
          if (keys.length === 0) return null;
          // Debug for first product
          if (productId === 1) {
            console.log(`[DEBUG] Product ${productId} specialFeature transformed:`, sf, `(${keys.length} keys)`);
          }
          return sf;
        })(),
        'date-added': dateAdded,
        slug: productData.slug || '',
        isActive: productData.isActive !== false,
        SKU: productData.sku || '',
        stockQuantity: productData.stockQuantity || 0,
        // Keep images array format for components that need it
        backendImages: processedImages,
      };
}

// Transform array of backend products
function transformProducts(backendProducts: any[]): any[] {
  const transformed = backendProducts
    .map(product => transformProduct(product))
    .filter(product => product !== null && product.isActive !== false); // Only active products
  
  // Debug: Log specs and specialFeature for first transformed product
  if (transformed.length > 0) {
    const firstProduct = transformed[0];
    console.log('[DEBUG] First product specs (final):', firstProduct?.specs);
    console.log('[DEBUG] First product specialFeature (final):', firstProduct?.['special feature']);
    console.log('[DEBUG] First product has specs?', !!firstProduct?.specs);
    console.log('[DEBUG] First product specs type:', typeof firstProduct?.specs);
    if (firstProduct?.specs) {
      console.log('[DEBUG] First product specs keys:', Object.keys(firstProduct.specs));
      console.log('[DEBUG] First product specs entries:', Object.entries(firstProduct.specs).slice(0, 3));
    }
  }
  
  return transformed;
}

// Cache for all products to avoid multiple API calls
let productsCache: any[] | null = null;
let productsCacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all products (with caching and pagination)
async function getAllProducts(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  
  // Return cached products if still valid and not forcing refresh
  if (!forceRefresh && productsCache && (now - productsCacheTimestamp) < CACHE_DURATION) {
    return productsCache;
  }

  try {
    let allProducts: any[] = [];
    let page = 1;
    const pageSize = 100; // Backend default max is usually 100
    let hasMore = true;

    // Fetch all pages of products
    while (hasMore) {
      const response = await clientApi.getProducts({
        pagination: { page, pageSize },
      });

      const products = response.data || [];
      allProducts = [...allProducts, ...products];

      // Check if there are more pages
      const total = response.meta?.pagination?.total ?? products.length;
      const inferredTotal = response.meta?.pagination?.total ?? products.length;
      const pageCount =
        response.meta?.pagination?.pageCount ??
        Math.max(1, Math.ceil(inferredTotal / pageSize));
      hasMore = page < pageCount;

      console.log(`Fetched page ${page}/${pageCount}: ${products.length} products (total: ${allProducts.length}/${total})`);

      if (hasMore) {
        page++;
      }
    }

    console.log(`Total products fetched: ${allProducts.length}`);
    
    // Debug: Log raw specs and specialFeature from backend for first product
    if (allProducts.length > 0) {
      const firstProduct = allProducts[0];
      console.log('[DEBUG] Raw backend product[0] specs:', firstProduct?.specs, typeof firstProduct?.specs);
      console.log('[DEBUG] Raw backend product[0] specialFeature:', firstProduct?.specialFeature, typeof firstProduct?.specialFeature);
      console.log('[DEBUG] Raw backend product[0] all keys:', Object.keys(firstProduct || {}));
    }

    const transformed = transformProducts(allProducts);
    console.log(`Total products after transformation: ${transformed.length}`);
    
    productsCache = transformed;
    productsCacheTimestamp = now;
    return transformed;
  } catch (error) {
    console.error('Error fetching products from backend:', error);
    // Return cached products if available, even if expired
    if (productsCache) {
      console.log('Returning cached products due to error');
      return productsCache;
    }
    return [];
  }
}

// Replace filterProducts() from productsData.js
export async function filterProducts(
  filterBy: string, // 'category' or 'subcategory'
  filter: string,   // name of category or subcategory
  count?: number    // specific number of items to be returned
): Promise<any[]> {
  try {
    const allProducts = await getAllProducts();
    const normalizedFilterBy = typeof filterBy === 'string' ? filterBy.trim() : '';
    const normalizedFilter = typeof filter === 'string' ? filter.trim() : '';
    
    // If no filter provided, return all products (optionally limited by count)
    if (!normalizedFilterBy || !normalizedFilter) {
      if (count && count > 0) {
        return allProducts.slice(0, count);
      }
      return allProducts;
    }
    
    console.log(`Filtering products by ${filterBy}="${filter}" from ${allProducts.length} total products`);
    
    let filtered = allProducts.filter(product => {
      const value = product[normalizedFilterBy];
      // Handle both string and ensure case-insensitive comparison
      const productValue = value ? String(value).trim().toLowerCase() : '';
      const filterValue = normalizedFilter.trim().toLowerCase();
      const matches = productValue === filterValue;
      
      if (!matches && value) {
        // Debug: log products that don't match (for troubleshooting)
        console.log(`Product "${product.name}" has ${filterBy}="${value}" (expected "${filter}")`);
      }
      return matches;
    });

    console.log(`Found ${filtered.length} products matching ${filterBy}="${filter}"`);

    // Sort by date-added (newest first)
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a['date-added'] || 0).getTime();
      const dateB = new Date(b['date-added'] || 0).getTime();
      return dateB - dateA;
    });

    // If count is 1, return random product (for banner items)
    if (count === 1 && filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      return [filtered[randomIndex]];
    }

    // If count is specified, return slice
    if (count && count > 0) {
      return filtered.slice(0, count);
    }

    return filtered;
  } catch (error) {
    console.error('Error filtering products:', error);
    return [];
  }
}

// Search products by query string
export async function searchProducts(
  searchQuery: string,
  page: number = 1,
  pageSize: number = 12,
  filters?: {
    category?: string;
    subcategory?: string;
    brandId?: number;
    minPrice?: number;
    maxPrice?: number;
    inStockOnly?: boolean;
  }
): Promise<{ data: any[]; meta: any }> {
  try {
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      return { data: [], meta: { pagination: { page, pageSize, pageCount: 0, total: 0 } } };
    }

    // Build filters object for API
    const apiFilters: Record<string, any> = {};
    if (filters?.category) {
      apiFilters.category = filters.category;
    }
    if (filters?.subcategory) {
      apiFilters.subcategory = filters.subcategory;
    }
    if (filters?.brandId) {
      apiFilters.brandId = filters.brandId;
    }
    if (filters?.minPrice !== undefined && filters.minPrice !== null) {
      apiFilters.minPrice = filters.minPrice;
    }
    if (filters?.maxPrice !== undefined && filters.maxPrice !== null) {
      apiFilters.maxPrice = filters.maxPrice;
    }
    if (filters?.inStockOnly) {
      apiFilters.inStockOnly = filters.inStockOnly;
    }

    const response = await clientApi.getProducts({
      search: searchQuery.trim(),
      pagination: { page, pageSize },
      filters: Object.keys(apiFilters).length > 0 ? apiFilters : undefined,
    });

    // Transform the products using existing transform function
    const transformedProducts = transformProducts(response.data || []);

    return {
      data: transformedProducts,
      meta: response.meta || {
        pagination: {
          page,
          pageSize,
          pageCount: 0,
          total: 0,
        },
      },
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return { data: [], meta: { pagination: { page, pageSize, pageCount: 0, total: 0 } } };
  }
}

// Helper functions to extract available filter options from products
export function getAvailableCategories(products: any[]): string[] {
  const categories = new Set<string>();
  products.forEach((product) => {
    if (product.category && typeof product.category === 'string') {
      categories.add(product.category.trim());
    }
  });
  return Array.from(categories).sort();
}

export function getAvailableSubcategories(
  products: any[],
  category?: string
): string[] {
  const subcategories = new Set<string>();
  products.forEach((product) => {
    if (category && product.category !== category) {
      return; // Skip if category filter is applied and doesn't match
    }
    if (product.subcategory) {
      const subcategoryName =
        typeof product.subcategory === 'object' && product.subcategory.name
          ? product.subcategory.name
          : String(product.subcategory);
      if (subcategoryName && subcategoryName.trim()) {
        subcategories.add(subcategoryName.trim());
      }
    }
  });
  return Array.from(subcategories).sort();
}

export function getAvailableBrands(products: any[]): Array<{ id: number; name: string }> {
  const brandsMap = new Map<number, string>();
  products.forEach((product) => {
    if (product.brand) {
      const brandId =
        typeof product.brand === 'object' && product.brand.id
          ? product.brand.id
          : null;
      const brandName =
        typeof product.brand === 'object' && product.brand.name
          ? product.brand.name
          : typeof product.brand === 'string'
          ? product.brand
          : null;

      if (brandId && brandName) {
        brandsMap.set(brandId, brandName);
      }
    }
  });
  return Array.from(brandsMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getPriceRange(products: any[]): { min: number; max: number } {
  if (products.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  products.forEach((product) => {
    const price = product.price || product['discounted price'] || 0;
    const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : Number(price);
    
    if (!isNaN(numericPrice) && numericPrice > 0) {
      min = Math.min(min, numericPrice);
      max = Math.max(max, numericPrice);
    }
  });

  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  };
}

// Replace getProductByName() from productsData.js
export async function getProductByName(name: string): Promise<any | null> {
  try {
    const allProducts = await getAllProducts();
    return allProducts.find(
      product => product.name.toLowerCase() === name.toLowerCase()
    ) || null;
  } catch (error) {
    console.error('Error getting product by name:', error);
    return null;
  }
}

// Replace getProductBySlug() - new function for slug-based lookup
export async function getProductBySlug(slug: string): Promise<any | null> {
  try {
    const response = await clientApi.getProduct(slug);
    // NestJS returns product directly or wrapped in data
    const product = response?.data || response;
    if (product) {
      return transformProduct(product);
    }
    return null;
  } catch (error: any) {
    // Don't throw error for missing products, just return null silently
    // This allows the fallback to getProductByName to work
    if (error.message?.includes('not found') || 
        error.message?.includes('404') || 
        error.message?.includes('Product') && error.message?.includes('not found')) {
      // Silently return null - let getProductByName try as fallback
      return null;
    }
    // Only log non-404 errors
    console.error('Error getting product by slug:', error);
    return null;
  }
}

// Replace randomProduct() from productsData.js
export async function randomProduct(
  filterBy: string,
  filter: string,
  count?: number
): Promise<any | null> {
  try {
    const normalizedFilterBy = typeof filterBy === 'string' ? filterBy.trim() : '';
    const normalizedFilter = typeof filter === 'string' ? filter.trim() : '';

    let pool: any[] = [];

    if (!normalizedFilterBy || !normalizedFilter) {
      pool = await getAllProducts();
    } else {
      const productCount = count || 10;
      pool = await filterProducts(normalizedFilterBy, normalizedFilter, productCount);
    }

    if (pool.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  } catch (error) {
    console.error('Error getting random product:', error);
    return null;
  }
}

// Replace subcategoryExists() from productsData.js
export async function subcategoryExists(subcategory: string): Promise<boolean> {
  try {
    const allProducts = await getAllProducts();
    return allProducts.some(
      product => product.subcategory && 
      product.subcategory.toLowerCase() === subcategory.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking subcategory existence:', error);
    return false;
  }
}

// Get all products (for components that need the full list)
export async function getAllProductsList(): Promise<any[]> {
  return getAllProducts();
}

// Clear cache (useful after product updates)
export function clearProductsCache(): void {
  productsCache = null;
  productsCacheTimestamp = 0;
}

// Export transform function for use in other modules
export { transformProduct };

