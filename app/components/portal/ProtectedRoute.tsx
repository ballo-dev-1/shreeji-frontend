'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useClientAuth } from '@/app/contexts/ClientAuthContext';
import { getLoginUrl } from '@/app/lib/client/redirectToLogin';
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
      router.push(getLoginUrl(pathname || undefined));
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
