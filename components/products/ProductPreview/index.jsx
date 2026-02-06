import Link from "next/link";
import "./style.scss";
import Image from "next/image";

const ProductPreview = ({product, index, additionalClass}) => {
  if (!product || !product.images || product.images.length === 0) {
    return null;
  } 

  // Derive price and discounted price similar to other components
  const rawPrice = product["discounted price"] || product.discountedPrice || product.price;
  const originalPrice = product["discounted price"]
    ? product.price
    : product.discountedPrice && product.discountedPrice > 0
      ? product.price
      : null;

  // Helper to ensure prices are always prefixed with currency "K"
  const formatPriceWithCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") {
      return `K ${value.toLocaleString()}`;
    }
    const str = String(value).trim();
    // Avoid double-prefixing if backend already includes "K"
    return str.startsWith("K") ? str : `K ${str}`;
  };

  return (    
    <Link 
      href={
        product["subcategory"]
          ? `/products/${encodeURIComponent(product.category)}/${encodeURIComponent(product["subcategory"])}/${encodeURIComponent(product.name)}`
          : `/products/${encodeURIComponent(product.category)}/${encodeURIComponent(product.name)}`
      }
      className={`products-page-product md:mr-2 px-5 flex flex-col gap-2 items-center py-4 cursor-pointer ${additionalClass}`}
    >
      <div className="">
        {product.images && product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name || 'Product image'}
            width={300}
            height={300}
            className="products-page-product__image object-cover overflow-visible product-shadow"
            unoptimized={product.images[0]?.startsWith('http')}
          />
        )}
      </div>
      <div className="flex-center gap-4 pb-14">
        {product.name && (<h1 className="products-page-product__title text-2xl font-semibold line-clamp-2">{product.name}</h1>)}
        <div className="flex flex-col items-center gap-1">
          {rawPrice && (
            <div className="text-xl font-semibold text-[#fef3c7]">
              {formatPriceWithCurrency(rawPrice)}
            </div>
          )}
          {originalPrice && (
            <div className="text-sm text-[#e5e7eb] line-through">
              {formatPriceWithCurrency(originalPrice)}
            </div>
          )}
          {product.tagline && (
            <div className="text-center text-base">
              {product.tagline}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductPreview;
