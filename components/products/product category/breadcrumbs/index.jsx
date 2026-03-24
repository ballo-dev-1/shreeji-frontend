import Link from "next/link";
import React from "react";

const Breadcrumbs = ({ breadcrumbs }) => {
  return (
    <div className="bg-[var(--shreeji-primary)] text-xl font-medium mt-1 p-5 [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] px-10 rounded-[20px]">
      <Link
        href="/products"
        className="font-medium text-white cursor-pointer"
      >
        {"Products > "}
      </Link>

      {breadcrumbs.map((word, index) => {
        if (index === 0 && breadcrumbs.length > 1) {             
          return (
            <Link
              key={index}
              href={`/products/${encodeURIComponent(breadcrumbs[0])}`}
              className="font-medium  text-white cursor-pointer"
            >
              {word}
              {index < breadcrumbs.length - 1 && " > "}
            </Link>
          );        
        }

        if (index === 1 && breadcrumbs.length > 2) {
          return (
            <Link
              key={index}
              href={`/products/${encodeURIComponent(breadcrumbs[0])}/${encodeURIComponent(breadcrumbs[1])}`}
              className="font-medium text-white cursor-pointer"
            >
              {word}
              {index < breadcrumbs.length - 1 && " > "}
            </Link>
          );
        } else {
          <span>{decodeURIComponent(word)}</span>
        }

        return (
          <span key={index} className="text-white">
            {decodeURIComponent(word)}
            {index < breadcrumbs.length - 1 && " > "}
          </span>
        );
      })}
    </div>
  );
};

export default Breadcrumbs;
