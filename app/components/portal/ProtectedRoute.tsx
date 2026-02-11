'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClientAuth } from '@/app/contexts/ClientAuthContext';
import { FullPageLoadingSkeleton } from '@/app/components/ui/Skeletons';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useClientAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Store the current path to redirect back after login
      if (pathname && !pathname.includes('/portal/login')) {
        sessionStorage.setItem('returnUrl', pathname);
      }
      router.push('/portal/login');
    }
  }, [isAuthenticated, loading, router, pathname]);

  // Show loading skeleton while checking authentication
  if (loading) {
    return <FullPageLoadingSkeleton />;
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
