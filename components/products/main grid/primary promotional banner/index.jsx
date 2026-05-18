import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const PrimaryPromotionalBanner = ({promoProduct}) => {
  if (!promoProduct || !promoProduct.images || promoProduct.images.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--shreeji-primary)] h-fit relative">
      <div className='flex'>
        <div className="flex flex-col md:w-[60%] justify-center items-center gap-10 py-10 md:py-24 px-5 md:px-10 text-center z-[1] relative">
          <h2 className="text-4xl font-bold md:font-extralight [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] md:line-clamp-2">{promoProduct['tagline']}</h2>
          <div className='flex md:hidden relative flex-1'>
            {promoProduct.images.length > 1 ?
              (<Image src={promoProduct.images[1]} alt={promoProduct.name} width={600} height={400} className="object-cover overflow-visible z-0 w-full h-auto -mt-5 product-shadow" unoptimized={typeof promoProduct.images[1] === 'string' && (promoProduct.images[1].startsWith('http') || promoProduct.images[1].startsWith('/api/'))} />):
              (<Image src={promoProduct.images[0]} alt={promoProduct.name} width={600} height={400} className="object-cover overflow-visible z-0 w-[100%] h-auto -mt-5 product-shadow" unoptimized={typeof promoProduct.images[0] === 'string' && (promoProduct.images[0].startsWith('http') || promoProduct.images[0].startsWith('/api/'))} />)
            }
          </div>
          <h2 className="text-xl md:text-4xl font-extralight md:font-bold [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] md:line-clamp-3">{promoProduct['description']}</h2>
          <Link
            href={
              promoProduct["subcategory"]
                ? `/products/${encodeURIComponent(promoProduct.category)}/${encodeURIComponent(promoProduct["subcategory"])}/${encodeURIComponent(promoProduct.name)}`
                : `/products/${encodeURIComponent(promoProduct.category)}/${encodeURIComponent(promoProduct.name)}`
            }
            className="border-4 border-white py-1 px-5 rounded-full uppercase cursor-pointer"
          >
            Shop Now
          </Link>
        </div>

        <div className='hidden md:flex relative flex-1'>
          {promoProduct.images.length > 1 ?
            (<Image src={promoProduct.images[1]} alt={promoProduct.name} width={600} height={400} className="object-cover overflow-visible z-0 h-[80%] w-auto absolute top-[50%] left-[35%] -translate-x-1/2 -translate-y-1/2 product-shadow" unoptimized={typeof promoProduct.images[1] === 'string' && (promoProduct.images[1].startsWith('http') || promoProduct.images[1].startsWith('/api/'))} />):
            (<Image src={promoProduct.images[0]} alt={promoProduct.name} width={600} height={400} className="object-cover overflow-visible z-0 h-[52%] w-auto absolute top-[45%] -right-[15%] -translate-x-1/2 -translate-y-1/2 product-shadow" unoptimized={typeof promoProduct.images[0] === 'string' && (promoProduct.images[0].startsWith('http') || promoProduct.images[0].startsWith('/api/'))} />)
          }
        </div>   
      </div> 

      <div className="bg-[#605432] flex justify-around text-center rounded-2xl py-5 px-5 space-x-4 md:space-x-0 font-medium">
        <div>
          <h3 className="text-xl md:text-2xl font-semibold">Money Back</h3>
          <p className="text-base font-extralight">30 Days Money Back Guarantee</p>
        </div>

        <div>
          <h3 className="text-xl md:text-2xl">Free Delivery</h3>
          <p className="text-base font-extralight">Delivery on orders</p>
        </div>

        <div>
          <h3 className="text-xl md:text-2xl">Special Sale</h3>
          <p className="text-base font-extralight">Discounts on selected items</p>
        </div>
      </div>
    </div>
  )
}

export default PrimaryPromotionalBanner