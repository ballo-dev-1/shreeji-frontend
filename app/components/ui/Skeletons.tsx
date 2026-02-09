'use client'

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
        <div className="w-full h-48 bg-gray-300"></div>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-300 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

// Product Grid Skeleton
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </td>
      ))}
    </tr>
  )
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Dashboard Card Skeleton
export function DashboardCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-20"></div>
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] animate-pulse">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="h-6 bg-gray-300 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-300 rounded w-40"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-5 bg-gray-300 rounded w-24 ml-auto"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20 ml-auto"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recently Viewed Section */}
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-square w-full bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Portal Layout Skeleton (with sidebar and header)
export function PortalLayoutSkeleton() {
  return (
    <div className="flex h-screen bg-[whitesmoke] dark:bg-[#131313]">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:block w-64 bg-white dark:bg-[#1A1C1E] border-r border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center h-16 px-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl m-2 ml-0">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-[whitesmoke]">
          {/* Header Skeleton */}
          <header className="shadow-sm">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 animate-pulse">
              <div className="flex items-center">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </header>
          
          {/* Content Skeleton */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}

// Portal Loading Skeleton (for route transitions)
export function PortalLoadingSkeleton() {
  return <PortalLayoutSkeleton />;
}

// Order Card Skeleton
export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-300 rounded w-32"></div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="mt-4 h-10 bg-gray-200 rounded"></div>
    </div>
  )
}

// Product Details Skeleton
export function ProductDetailsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-300 rounded-lg"></div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        {/* Details Section */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-300 rounded w-32"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="h-12 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Wishlist Item Skeleton
export function WishlistItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-square w-full bg-gray-300"></div>
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-300 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

// Checkout Step Skeleton
export function CheckoutStepSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

// Admin Stats Skeleton
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-32"></div>
        </div>
      ))}
    </div>
  )
}

// Product List Item Skeleton (for category pages)
// Matches ProductPreview component structure with proper dimensions and shimmer effect
export function ProductListItemSkeleton({ additionalClass = '' }: { additionalClass?: string }) {
  return (
    <div className={`products-page-product md:mr-2 px-5 flex flex-col gap-2 items-center py-4 cursor-pointer relative ${additionalClass}`}>
      {/* Background element matching ::before pseudo-element from ProductPreview SCSS */}
      <div 
        className="absolute bottom-[10%] left-0 bg-[#605432] w-full h-[55%] rounded-lg -z-10 skeleton-shimmer"
        style={{ borderRadius: '8px' }}
      />
      
      {/* Image wrapper div - matches ProductPreview structure */}
      <div className="">
        {/* Image skeleton - matches products-page-product__image dimensions (15rem height) */}
        <div 
          className="products-page-product__image w-auto h-[15rem] max-h-[15rem] min-h-[15rem] mx-auto mt-[-5px] mb-0 relative z-[1] bg-white/20 rounded-lg skeleton-shimmer"
        />
      </div>
      
      {/* Title and tagline container - matches flex-center gap-4 pb-14 from ProductPreview */}
      <div className="flex-center gap-4 pb-14 relative z-[1]">
        {/* Title skeleton - matches text-2xl font-semibold line-clamp-2 */}
        <div className="h-7 bg-white/30 rounded w-3/4 max-w-[20rem] skeleton-shimmer" />
        {/* Tagline skeleton - matches text-center text-base */}
        <div className="h-5 bg-white/20 rounded w-1/2 max-w-[15rem] skeleton-shimmer" />
      </div>
    </div>
  )
}

// Category List Item Skeleton (for sidebar categories)
export function CategoryListItemSkeleton() {
  return (
    <li className="mr-2 px-5 flex flex-col gap-2 items-start border-b py-4 last:border-none">
      <div className="flex gap-5 items-center w-full">
        {/* CircleDot icon skeleton */}
        <div className="w-8 h-8 bg-white/20 rounded-full skeleton-shimmer" />
        {/* Category name skeleton */}
        <div className="h-5 bg-white/30 rounded w-32 skeleton-shimmer flex-1" />
        {/* ChevronDown icon skeleton */}
        <div className="w-5 h-5 bg-white/20 rounded skeleton-shimmer" />
      </div>
    </li>
  )
}

// Category List Skeleton (for sidebar)
export function CategoryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="min-h-[70vh]">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryListItemSkeleton key={i} />
      ))}
    </ul>
  )
}

// Search Input Skeleton (for sidebar search)
export function SearchInputSkeleton() {
  return (
    <div className="w-full mb-5">
      <div className="relative">
        <div className="w-full h-12 bg-white/20 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  )
}

