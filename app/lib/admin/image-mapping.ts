// Image mapping utility for mapping Strapi products to local images
import imageMapping from '@/data/product-image-mapping.json';

export interface ImageMapping {
  generatedAt: string;
  totalProducts: number;
  mappings: Record<string, string[]>;
}

// Convert @/public path to proper static asset path for Next.js (removes /public prefix)
function convertImagePath(path: string): string {
  if (!path) return '';
  // Replace "@/public" prefix with "" so resulting path starts with "/products/..."
  return path.replace(/^@\/public/, '');
}

// Get images for a product by name
export function getProductImages(productName: string): string[] {
  const mappedImages = imageMapping.mappings[productName];
  if (mappedImages && mappedImages.length > 0) {
    return mappedImages.map(convertImagePath);
  }
  return [];
}

// Get the main (first) image for a product
export function getMainProductImage(productName: string): string {
  const images = getProductImages(productName);
  return images.length > 0 ? images[0] : '/public/products/placeholder.png';
}

// Check if a product has mapped images
export function hasProductImages(productName: string): boolean {
  return imageMapping.mappings[productName] && imageMapping.mappings[productName].length > 0;
}

// Get all available product names with images
export function getAvailableProducts(): string[] {
  return Object.keys(imageMapping.mappings);
}

const BACKEND_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ECOM_API_URL?.replace?.(/\/$/, '')) ||
  '';

// Extract MinIO object name from path part of legacy URLs
function extractObjectName(pathPart: string): string {
  let s = pathPart.replace(/^\//, '');
  if (s.includes('api/images/shreeji-uploads/uploads/')) {
    return 'uploads/' + s.split('api/images/shreeji-uploads/uploads/')[1];
  }
  if (s.startsWith('shreeji-uploads/uploads/')) {
    return 'uploads/' + s.slice('shreeji-uploads/uploads/'.length);
  }
  if (s.startsWith('shreeji-uploads/')) {
    return s.slice('shreeji-uploads/'.length);
  }
  return s;
}

/**
 * Normalize image URLs: rewrite legacy MinIO :9000 URLs to backend proxy,
 * and old IP:9000 to /api/images proxy. Use for any img src from the API.
 */
export function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  const u = url.trim();

  // Already our backend proxy URL
  if (u.includes('/files/serve?')) return u;

  // Legacy backend MinIO URL (https or http) with :9000 -> backend /files/serve
  if (u.includes(':9000') && BACKEND_BASE) {
    try {
      const baseHost = new URL(BACKEND_BASE).hostname;
      if (u.includes(baseHost + ':9000')) {
        const pathPart = u.replace(/^https?:\/\/[^/]+/, '');
        const objectName = extractObjectName(pathPart);
        if (objectName) {
          return `${BACKEND_BASE}/files/serve?path=${encodeURIComponent(objectName)}`;
        }
      }
    } catch {
      // ignore
    }
  }

  // Old MinIO IP:9000 -> Next.js /api/images proxy
  if (u.startsWith('http://164.92.249.220:9000/')) {
    return `/api/images/${u.replace('http://164.92.249.220:9000/', '')}`;
  }

  // Convert HTTP to HTTPS for mixed content
  if (u.startsWith('http://')) {
    return u.replace('http://', 'https://');
  }
  return u;
}

// Convert HTTP URLs to HTTPS for mixed content security
// For servers that don't support HTTPS, proxy through Next.js
function ensureHttps(url: string): string {
  return normalizeImageUrl(url);
}

// Enhanced image processing that prioritizes uploaded images from backend
export function processProductImages(product: any): Array<{ url: string; alt: string; isMain?: boolean }> {
  const productName = product.name;
  
  // PRIORITY 1: Uploaded images from backend (product.images)
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const uploadedImages = product.images
      .map((img: any, index: number) => {
        let url: string | null = null;
        let alt: string = productName;

        if (typeof img === 'string') {
          url = img;
        } else if (img && typeof img === 'object') {
          url = img.url || img.src || null;
          alt = img.alt || productName;
        }

        if (url && typeof url === 'string' && url.trim()) {
          return {
            url: ensureHttps(url.trim()),
            alt,
            isMain: index === 0 || img.isMain === true,
          };
        }
        return null;
      })
      .filter((img: any): img is { url: string; alt: string; isMain?: boolean } => img !== null);

    if (uploadedImages.length > 0) {
      return uploadedImages;
    }
  }

  // PRIORITY 2: Single image field
  if (product.image && typeof product.image === 'string' && product.image.trim()) {
    return [{ url: ensureHttps(product.image.trim()), alt: productName, isMain: true }];
  }

  // PRIORITY 3: Media field (e.g., Strapi)
  if (product.media) {
    let mediaImages: Array<{ url: string; alt: string; isMain?: boolean }> = [];
    if (Array.isArray(product.media)) {
      mediaImages = product.media
        .map((media: any, index: number) => {
          const url = media?.url || media?.attributes?.url || media;
          if (url && typeof url === 'string' && url.trim()) {
            return {
              url: ensureHttps(url.trim()),
              alt: media?.alt || productName,
              isMain: index === 0,
            };
          }
          return null;
        })
        .filter((img: any): img is { url: string; alt: string; isMain?: boolean } => img !== null);
    } else if (typeof product.media === 'object' && product.media.url) {
      mediaImages = [{ url: ensureHttps(product.media.url.trim()), alt: productName, isMain: true }];
    } else if (typeof product.media === 'string' && product.media.trim()) {
      mediaImages = [{ url: ensureHttps(product.media.trim()), alt: productName, isMain: true }];
    }

    if (mediaImages.length > 0) {
      return mediaImages;
    }
  }

  // PRIORITY 4: Local mapped images as fallback
  const localImages = getProductImages(productName);
  if (localImages.length > 0) {
    return localImages.map((imagePath, index) => ({
      url: imagePath,
      alt: productName,
      isMain: index === 0,
    }));
  }

  // PRIORITY 5: Placeholder
  return [{ url: '/products/placeholder.png', alt: productName, isMain: true }];
}

export default imageMapping;
