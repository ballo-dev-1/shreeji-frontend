import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F6FA] dark:bg-[#131313]">
      <div className="bg-white dark:bg-[#1A1C1E] rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-8 max-w-md w-full mx-4 text-center">
        <p className="text-6xl font-bold text-[var(--shreeji-primary)] mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Page not found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          We couldn&apos;t find the page you were looking for. It may have been moved or no longer exists.
        </p>
        <Link
          href="/"
          className="inline-block w-full px-4 py-3 bg-[var(--shreeji-primary)] text-white rounded-2xl hover:opacity-90 transition-opacity font-medium"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
