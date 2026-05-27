'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F6FA] dark:bg-[#131313]">
      <div className="bg-white dark:bg-[#1A1C1E] rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Something went wrong!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Something went wrong while loading this page. This is usually temporary — please try again.
        </p>
        <button
          onClick={() => reset()}
          className="w-full px-4 py-3 bg-[var(--shreeji-primary)] text-white rounded-2xl hover:opacity-90 transition-opacity font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

