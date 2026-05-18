"use client";

import "./style.scss";
import LatestProductsByCategory from "@/components/products/main grid/latest products category";

const DiscountedProducts = () => {
  return (
    <div className="discounted-product-container relative w-screen scroll-smooth pb-10 md:pb-28 pt-5 md:pt-32 text-white">
      <LatestProductsByCategory category="Computers" count={5} heading="Discounted Products" />
    </div>
  );
};

export default DiscountedProducts;
