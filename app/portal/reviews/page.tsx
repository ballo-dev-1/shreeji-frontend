'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'
import clientApi from '@/app/lib/client/api'
import ReviewCard from '@/app/components/products/ReviewCard'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Review {
  id: number
  productId: number
  product: {
    id: number
    name: string
    slug: string
    images?: string[]
  }
  rating: number
  title?: string
  comment?: string
  status: string
  helpfulCount: number
  createdAt: string
}

export default function ReviewsPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(getLoginUrl())
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadReviews()
    }
  }, [isAuthenticated])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getCustomerReviews()
      setReviews(response.data || [])
    } catch (error: any) {
      console.error('Failed to load reviews:', error)
      toast.error(error.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return
    }

    try {
      await clientApi.deleteReview(reviewId)
      toast.success('Review deleted successfully')
      loadReviews()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your product reviews
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-12 text-center">
          <p className="text-gray-500">You haven't written any reviews yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-[var(--shreeji-primary)] hover:underline"
          >
            Browse products to write a review
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <Link
                  href={`/products/${review.product.slug || review.productId}`}
                  className="flex-1 hover:text-[var(--shreeji-primary)] transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {review.product.name}
                  </h3>
                </Link>
                <div className="flex items-center space-x-2">
                  {review.status === 'pending' && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Pending Approval
                    </span>
                  )}
                  {review.status === 'approved' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Published
                    </span>
                  )}
                  {review.status === 'rejected' && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      Rejected
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ReviewCard review={review} showHelpful={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

