"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeImageUrl } from "@/app/lib/admin/image-mapping";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ProductImage = {
  url: string;
  alt?: string;
  isMain?: boolean;
};

interface Product {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  category: string | number; // Can be category ID (number) or legacy string
  subcategory?: string | number | null; // Can be subcategory ID (number) or legacy string, optional
  brand: string | number; // Can be brand ID (number) or legacy string
  price: string;
  discountedPrice?: string;
  tagline?: string;
  description?: string;
  specs?: Record<string, unknown>;
  images: ProductImage[];
  isActive: boolean;
  SKU?: string;
  stockQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  stockStatus?: string;
  basePrice?: number;
  taxRate?: number;
  discountPercent?: number;
  weight?: number;
  Dimensions?: { length: number; width: number; height: number; unit: string } | any;
}

interface ViewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: (product: Product) => void;
}

const formatStockStatus = (value?: string) => {
  if (!value) return "Not set";
  return value
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const stockBadgeClass = (value?: string) => {
  switch (value) {
    case "in-stock":
      return "bg-emerald-100 text-emerald-700";
    case "low-stock":
      return "bg-amber-100 text-amber-700";
    case "out-of-stock":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

export default function ViewProductModal({
  isOpen,
  onClose,
  product,
  onEdit,
}: ViewProductModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = useMemo<ProductImage[]>(() => {
    if (!product?.images?.length) return [];
    return product.images;
  }, [product?.images]);

  useEffect(() => {
    if (!product) return;
    if (!images.length) {
      setSelectedImageIndex(0);
      return;
    }
    const mainIndex = images.findIndex((image) => image.isMain);
    setSelectedImageIndex(mainIndex >= 0 ? mainIndex : 0);
  }, [product, images]);

  if (!isOpen || !product) {
    return null;
  }

  const selectedImage = images[selectedImageIndex] ?? images[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div className="fixed inset-0" onClick={onClose} />

        <div className="relative inline-block w-full overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all sm:max-w-6xl">
          <header className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Product details</p>
              <h3 className="text-2xl font-semibold text-gray-900">{product.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit product
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                  {selectedImage ? (
                    <div className="relative">
                      <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                        <img
                          src={normalizeImageUrl(selectedImage.url)}
                          alt={selectedImage.alt || product.name}
                          className="h-80 w-full object-contain"
                          onError={(event) => {
                            event.currentTarget.src =
                              "https://via.placeholder.com/400x400?text=Image+not+available";
                          }}
                        />
                      </div>
                      {selectedImage.isMain && (
                        <span className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                          Main image
                        </span>
                      )}
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedImageIndex((index) =>
                                index > 0 ? index - 1 : images.length - 1,
                              )
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-900 shadow-md transition hover:bg-white"
                            aria-label="Previous image"
                          >
                            <ChevronLeftIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedImageIndex((index) =>
                                index < images.length - 1 ? index + 1 : 0,
                              )
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-900 shadow-md transition hover:bg-white"
                            aria-label="Next image"
                          >
                            <ChevronRightIcon className="h-5 w-5" />
                          </button>
                          <div className="absolute inset-x-0 bottom-3 flex justify-center">
                            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                              {selectedImageIndex + 1} / {images.length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                      No image available
                    </div>
                  )}

                  {images.length > 1 && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-medium text-gray-600">
                        Gallery ({images.length})
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        {images.map((image, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedImageIndex(index)}
                            className={`relative overflow-hidden rounded-xl border-2 transition ${
                              index === selectedImageIndex
                                ? "border-primary-500 shadow-sm"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <img
                              src={normalizeImageUrl(image.url)}
                              alt={image.alt || `${product.name} ${index + 1}`}
                              className="h-20 w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src =
                                  "https://via.placeholder.com/100x100?text=Image";
                              }}
                            />
                            {image.isMain && (
                              <span className="absolute left-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                Main
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500">Category</dt>
                      <dd className="font-medium text-gray-900">{product.category}</dd>
                    </div>
                    {product.subcategory && (
                      <div className="flex items-center justify-between">
                        <dt className="text-gray-500">Subcategory</dt>
                        <dd className="font-medium text-gray-900">{product.subcategory}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500">Brand</dt>
                      <dd className="font-medium text-gray-900">{product.brand}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500">SKU</dt>
                      <dd className="font-medium text-gray-900">{product.SKU ?? "Not set"}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900">Basic information</h4>
                  <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-sm text-gray-500">Product name</dt>
                      <dd className="mt-1 text-base font-medium text-gray-900">{product.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Slug</dt>
                      <dd className="mt-1 text-base font-medium text-gray-900">{product.slug}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900">Pricing</h4>
                  <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <dt className="text-sm text-gray-500">Price</dt>
                      <dd className="mt-1 text-xl font-semibold text-gray-900">{product.price}</dd>
                    </div>
                    {product.discountedPrice && (
                      <div>
                        <dt className="text-sm text-gray-500">Discounted price</dt>
                        <dd className="mt-1 text-xl font-semibold text-primary-600">
                          {product.discountedPrice}
                        </dd>
                      </div>
                    )}
                    {product.basePrice !== undefined && product.basePrice !== null && (
                      <div>
                        <dt className="text-sm text-gray-500">Base price</dt>
                        <dd className="mt-1 text-base font-medium text-gray-900">
                          {product.basePrice}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900">Inventory</h4>
                  <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-sm text-gray-500">Stock quantity</dt>
                      <dd className="mt-1 text-base font-semibold text-gray-900">
                        {product.stockQuantity ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Stock status</dt>
                      <dd className="mt-1">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${stockBadgeClass(
                            product.stockStatus,
                          )}`}
                        >
                          {formatStockStatus(product.stockStatus)}
                        </span>
                      </dd>
                    </div>
                    {product.minStockLevel !== undefined && (
                      <div>
                        <dt className="text-sm text-gray-500">Min stock level</dt>
                        <dd className="mt-1 text-base text-gray-900">{product.minStockLevel}</dd>
                      </div>
                    )}
                    {product.maxStockLevel !== undefined && (
                      <div>
                        <dt className="text-sm text-gray-500">Max stock level</dt>
                        <dd className="mt-1 text-base text-gray-900">{product.maxStockLevel}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {product.tagline && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900">Tagline</h4>
                    <p className="mt-2 text-gray-700">{product.tagline}</p>
                  </section>
                )}

                {product.description && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900">Description</h4>
                    <p className="mt-2 whitespace-pre-wrap text-gray-700">{product.description}</p>
                  </section>
                )}

                {product.specs && Object.keys(product.specs).length > 0 && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900">Specifications</h4>
                    <dl className="mt-4 space-y-3 text-sm">
                      {Object.entries(product.specs).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-start justify-between border-b border-gray-100 pb-2"
                        >
                          <dt className="font-medium text-gray-600">{key}</dt>
                          <dd className="text-gray-900">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                {(product.weight !== undefined || product.Dimensions) && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900">Physical attributes</h4>
                    <dl className="mt-4 space-y-3 text-sm">
                      {product.weight !== undefined && product.weight !== null && (
                        <div className="flex items-center justify-between">
                          <dt className="text-gray-600">Weight</dt>
                          <dd className="font-medium text-gray-900">{product.weight} kg</dd>
                        </div>
                      )}
                      {product.Dimensions && (
                        <div className="flex items-center justify-between">
                          <dt className="text-gray-600">Dimensions</dt>
                          <dd className="font-medium text-gray-900">
                            {product.Dimensions.length} × {product.Dimensions.width} × {product.Dimensions.height}{" "}
                            {product.Dimensions.unit || "cm"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </section>
                )}
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Close
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
