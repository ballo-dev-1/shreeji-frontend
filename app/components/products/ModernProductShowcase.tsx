"use client";

interface ProductShowcaseProps {
  product: any;
  breadcrumbs?: string[];
  className?: string;
}

const fallbackImage = "https://via.placeholder.com/600x400?text=Product+Image";

export default function ModernProductShowcase({
  product,
  breadcrumbs = [],
  className = "",
}: ProductShowcaseProps) {
  if (!product) {
    return (
      <div className="rounded-3xl bg-white/5 p-8 text-center text-sm text-white/70">
        Product information is unavailable.
      </div>
    );
  }

  const heroImage =
    product.images?.find((img: any) => img.isMain)?.url ||
    product.images?.[0]?.url ||
    fallbackImage;

  const galleryImages = (product.images || []).slice(0, 3);
  const specEntries = Object.entries(product.specs || {});
  const breadcrumbText = breadcrumbs.filter(Boolean).join(" > ") || product.name || "Product";

  const priceLabel = product.price
    ? typeof product.price === "number"
      ? `K ${product.price.toLocaleString()}`
      : product.price
    : "Contact for price";

  // Only show promo label if discountedPrice is a valid positive number and different from price
  const promoLabel =
    (product.discountedPrice && product.discountedPrice > 0 && product.discountedPrice !== product.price)
      ? product.discountedPrice
      : null;

  const highlightedSpecs = [
    { label: "Processor", value: product.specs?.Processor || product.specs?.processor },
    { label: "RAM", value: product.specs?.RAM || product.specs?.ram },
    { label: "Storage", value: product.specs?.Storage || product.specs?.storage },
    { label: "Display", value: product.specs?.Display || product.specs?.display },
    { label: "Ports", value: product.specs?.Ports || product.specs?.ports },
    {
      label: "Operating System",
      value: product.specs?.["Operating System"] || product.specs?.os,
    },
  ].filter((entry) => entry.value);

  const brandMonogram =
    (typeof product.brand === "object" ? product.brand?.name : product.brand) || "HP";

  return (
    <div
      className={`mx-auto mt-2 w-full rounded-[36px] bg-gradient-to-b from-[#fbf3db] via-[#fdfcf6] to-[#f7f3e4] shadow-2xl ${className}`}
    >
      <div className="rounded-t-[36px] bg-[#6f5531] px-8 py-4 text-xs font-semibold uppercase tracking-wide text-white md:text-sm">
        {breadcrumbText}
      </div>

      <div className="grid gap-12 px-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12">
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#cda35c] to-[#9b7a3c] text-white shadow-xl">
              <span className="text-3xl font-bold">1</span>
              <span className="text-xs font-medium uppercase tracking-wide">Year</span>
              <span className="text-[10px] uppercase">Warranty</span>
            </div>
            <p className="max-w-xs text-sm text-[#4b3a24]/90">
              {product.tagline ||
                "Ideal for professionals needing portability without sacrificing performance."}
            </p>
          </div>

          <div className="relative rounded-[30px] bg-white/70 p-8 shadow-inner">
            <div className="absolute -left-8 top-1/2 hidden -translate-y-1/2 rounded-full bg-gradient-to-b from-[#cda35c] to-[#9b7a3c] px-4 py-6 text-center text-white shadow lg:block">
              <p className="text-xs uppercase tracking-wide">Compact</p>
              <p className="text-sm font-bold leading-none">Design</p>
            </div>
            <img
              src={heroImage}
              alt={product.name}
              className="mx-auto h-72 w-full max-w-lg object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.12)]"
            />
          </div>

          {galleryImages.length > 0 && (
            <div className="flex gap-4">
              {galleryImages.map((image: any, index: number) => (
                <div
                  key={index}
                  className={`flex h-24 w-28 items-center justify-center rounded-2xl border ${
                    index === 0 ? "border-primary-500 bg-white" : "border-transparent bg-white/70"
                  } shadow`}
                >
                  <img
                    src={image.url}
                    alt={image.alt || product.name}
                    className="h-18 w-24 object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-light tracking-[0.6rem] text-[#4b3a24]">
                {brandMonogram?.slice(0, 2)?.toUpperCase()}
              </div>
              <div className="h-10 w-px bg-[#c8b89a]" />
              <p className="text-xs font-semibold uppercase tracking-[0.3rem] text-[#b08b51]">
                Premium Series
              </p>
            </div>
            <h1 className="text-4xl font-bold text-[#4b3a24] md:text-5xl">{product.name}</h1>
            <p className="text-2xl font-semibold text-[#4b3a24]">
              {priceLabel}
            </p>
            <p className="text-base text-[#7c6a4c]">
              {product.shortDescription ||
                "Ideal for professionals needing portability without sacrificing performance."}
            </p>
          </div>

          <div className="rounded-3xl bg-white/70 p-6 shadow-inner">
            <dl className="space-y-3 text-sm text-gray-700">
              <div className="flex justify-between border-b border-gray-200 pb-2 text-base">
                <dt className="font-semibold text-gray-900">Price</dt>
                <dd>{priceLabel}</dd>
              </div>
              {promoLabel && (
                <div className="flex justify-between border-b border-gray-200 pb-2 text-base">
                  <dt className="font-semibold text-gray-900">Promo Price</dt>
                  <dd className="text-primary-600">{promoLabel}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-semibold text-gray-900">Category</dt>
                <dd>{product.category || breadcrumbs[0] || "—"}</dd>
              </div>
              {product.subcategory && (
                <div className="flex justify-between">
                  <dt className="font-semibold text-gray-900">Subcategory</dt>
                  <dd>{product.subcategory}</dd>
                </div>
              )}
              {product.brand && (
                <div className="flex justify-between">
                  <dt className="font-semibold text-gray-900">Brand</dt>
                  <dd>{product.brand?.name || product.brand}</dd>
                </div>
              )}
              {product.SKU && (
                <div className="flex justify-between">
                  <dt className="font-semibold text-gray-900">SKU</dt>
                  <dd>{product.SKU}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#4b3a24]">Key Specifications</h3>
            {highlightedSpecs.length > 0 ? (
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                {highlightedSpecs.map(({ label, value }) => (
                  <div key={label} className="flex">
                    <dt className="w-36 font-semibold text-gray-900">{label}:</dt>
                    <dd className="flex-1">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : specEntries.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {specEntries.map(([key, value]) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="font-semibold text-gray-900">{key}:</span>
                    <span>{String(value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No specifications added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

