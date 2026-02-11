'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  EyeIcon, 
  EyeSlashIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useClientAuth } from '@/app/contexts/ClientAuthContext';
import { PortalLayoutSkeleton } from '@/app/components/ui/Skeletons';
import logo2 from '@/public/logos/Shreeji icon.png';
import '@/components/home/HeroSection/style.scss';

type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  defaultMode?: AuthMode;
}

export default function AuthPage({ defaultMode = 'login' }: AuthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [formData, setFormData] = useState({
    email: searchParams?.get('email') || '',
    password: '',
    confirmPassword: '',
    firstName: searchParams?.get('firstName') || '',
    lastName: searchParams?.get('lastName') || '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const { isAuthenticated, login, register, setUser: setContextUser } = useClientAuth();
  const tokenProcessedRef = useRef<string | null>(null);
  
  // Update form data when search params change (for guest checkout pre-fill)
  useEffect(() => {
    if (searchParams) {
      const email = searchParams.get('email');
      const firstName = searchParams.get('firstName');
      const lastName = searchParams.get('lastName');
      
      if (email || firstName || lastName) {
        setFormData(prev => ({
          ...prev,
          email: email || prev.email,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
        }));
        // Switch to signup mode if guest data is provided
        if (defaultMode === 'signup' || (email && !mode)) {
          setMode('signup');
        }
      }
    }
  }, [searchParams, defaultMode, mode]);

  // Handle Google OAuth callback token
  useEffect(() => {
    const token = searchParams?.get('token');
    if (token && typeof window !== 'undefined') {
      // Prevent multiple executions (React Strict Mode)
      if (tokenProcessedRef.current === token) {
        return;
      }
      tokenProcessedRef.current = token;
      
      // Show loading state immediately
      setOauthProcessing(true);

      // Store token from Google OAuth callback
      localStorage.setItem('client_jwt', token);
      
      // Get user data and update context
      const API_URL = process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
      const shouldUseProxy = window.location.protocol === 'https:' && API_URL.startsWith('http://');
      const apiUrl = shouldUseProxy ? `/api/backend/auth/me` : `${API_URL}/auth/me`;
      
      fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Failed to get user data');
        })
        .then((user) => {
          localStorage.setItem('client_user', JSON.stringify(user));
          
          // Update the context state directly to avoid race condition
          // This ensures the user is set before navigation
          if (setContextUser) {
            setContextUser(user);
          }
          
          // Small delay to ensure state is set before redirect
          setTimeout(() => {
            // Check for returnUrl in localStorage (from modal authentication)
            const returnUrl = typeof window !== 'undefined' ? localStorage.getItem('authReturnUrl') : null;
            const shouldRedirect = typeof window !== 'undefined' ? localStorage.getItem('shouldRedirectAfterAuth') === 'true' : false;
            
            if (shouldRedirect && returnUrl && !returnUrl.startsWith('/portal/')) {
              // Clear flags and redirect to stored URL
              if (typeof window !== 'undefined') {
                localStorage.removeItem('shouldRedirectAfterAuth');
                localStorage.removeItem('authReturnUrl');
              }
              router.replace(returnUrl);
            } else {
              // Use router.replace instead of window.location.href to avoid full page reload
              // Remove token from URL to clean it up
              router.replace('/portal/dashboard');
            }
          }, 100);
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          setError('Failed to complete Google login');
          setOauthProcessing(false);
        });
    }
  }, [searchParams, router, setContextUser]);

  useEffect(() => {
    if (isAuthenticated) {
      // Check for return URL in query params first, then localStorage (from modal), then sessionStorage
      const returnUrlParam = searchParams?.get('returnUrl');
      const returnUrlFromLocalStorage = typeof window !== 'undefined' 
        ? localStorage.getItem('authReturnUrl') 
        : null;
      const shouldRedirectFromModal = typeof window !== 'undefined' 
        ? localStorage.getItem('shouldRedirectAfterAuth') === 'true'
        : false;
      const returnUrlFromSession = typeof window !== 'undefined' 
        ? sessionStorage.getItem('returnUrl') 
        : null;
      
      const returnUrl = returnUrlParam || 
                       (shouldRedirectFromModal && returnUrlFromLocalStorage ? returnUrlFromLocalStorage : null) ||
                       returnUrlFromSession;
      
      // Clear the return URLs
      if (typeof window !== 'undefined') {
        if (!returnUrlParam && returnUrlFromSession) {
          sessionStorage.removeItem('returnUrl');
        }
        if (shouldRedirectFromModal && returnUrlFromLocalStorage) {
          localStorage.removeItem('shouldRedirectAfterAuth');
          localStorage.removeItem('authReturnUrl');
        }
      }
      
      // Only redirect to dashboard if no returnUrl exists
      // If returnUrl exists and is not a portal page, redirect there
      // Otherwise, if returnUrl is a portal page, stay there
      if (returnUrl && !returnUrl.startsWith('/portal/')) {
        router.replace(returnUrl);
      } else if (!returnUrl) {
        router.replace('/portal/dashboard');
      }
      // If returnUrl is a portal page, don't redirect (user is already there)
    }
  }, [isAuthenticated, router, searchParams]);

  // Show full-screen loading overlay during OAuth processing
  if (oauthProcessing) {
    return (
      <div className="fixed inset-0 z-50 bg-[whitesmoke] dark:bg-[#131313] overflow-hidden">
        <PortalLayoutSkeleton />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials.email, credentials.password);
    } catch (error: any) {
      setError(error.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.phone
      );
      // Registration successful, user will be redirected by useEffect
    } catch (error: any) {
      setError(error.message || 'Registration failed');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Get backend API URL
    const API_URL = process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
    
    // Check if we should use proxy (when frontend is HTTPS and backend is HTTP)
    const shouldUseProxy = typeof window !== 'undefined' && 
      window.location.protocol === 'https:' && 
      API_URL.startsWith('http://');
    
    const googleAuthUrl = shouldUseProxy 
      ? `/api/backend/auth/google`
      : `${API_URL}/auth/google`;
    
    // Redirect immediately to backend Google OAuth endpoint
    // Use setTimeout with 0 delay to ensure it runs after current execution stack
    setTimeout(() => {
      try {
        window.location.replace(googleAuthUrl);
      } catch (redirectError: any) {
        console.error('Redirect error:', redirectError);
        // Fallback to href if replace fails
        window.location.href = googleAuthUrl;
      }
    }, 0);
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--shreeji-primary)' }}>
        <div className="text-center space-y-4 animate-pulse">
          <div className="h-12 w-12 bg-white/20 rounded-full mx-auto"></div>
          <p className="text-sm text-white">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--shreeji-primary)] items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-white rounded-3xl relative md:h-[85vh] h-full shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero Video Section */}
        <div className="hidden lg:flex lg:w-1/2 relative h-full text-white hero-text rounded-l-3xl overflow-hidden">
          <video
            className="absolute left-0 top-0 w-full h-full object-cover z-0"
            muted
            loop
            autoPlay
            playsInline
            src="/videos/black-bg.mp4"
          />
          <Link href="/products" className="w-full text-xl px-10 pt-8 z-[1] flex-center justify-center bg-[rgba(0,0,0,0.85)]">
            <Image
              src={logo2}
              alt="Logo"
              quality={100}
              className="h-auto w-[50%] hero-logo"
            />
            <div className="content">
              <h1 className="title flex-center h-32">
                Shreeji
                <div className="aurora">
                  <div className="aurora__item"></div>
                  <div className="aurora__item"></div>
                  <div className="aurora__item"></div>
                  <div className="aurora__item"></div>
                </div>
              </h1>
              <div className="subtitle flex gap-2 font-semibold text-3xl">
                <div>Tried,</div>
                <div>Trusted &</div>
                <div>Tested</div>
              </div>
            </div>
          </Link>
        </div>        

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col bg-white dark:bg-[#1A1C1E] overflow-y-auto scrollbar-hover">
          {/* Tab Switcher */}
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-full font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-full font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            {mode === 'login' ? 'Welcome' : 'Create Account'} 
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
            {mode === 'login' 
              ? 'Sign in to access your account' 
              : 'Sign up to access your client portal'}
          </p>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleGoogleLogin();
            }}
            className="w-full mb-6 py-3 px-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {mode === 'login' ? 'Log In with Google' : 'Sign Up with Google'}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <label htmlFor="login-email" className="sr-only">
                  Email address
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Email address"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-12 pr-12 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-full bg-red-50 border border-red-200 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center animate-pulse">
                    <div className="h-4 bg-white/30 rounded w-24"></div>
                  </div>
                ) : (
                  'Log In'
                )}
              </button>

              {/* Footer Links */}
              <div className="text-center space-y-2 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <Link href="/portal/forgot-password" className="font-medium text-primary-600 hover:text-primary-700">
                    Forgot your password?
                  </Link>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="firstName" className="sr-only">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <label htmlFor="lastName" className="sr-only">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="relative">
                <label htmlFor="signup-email" className="sr-only">
                  Email address
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Phone Input */}
              <div className="relative">
                <label htmlFor="phone" className="sr-only">
                  Phone (Optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-4 py-3 rounded-full border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Phone (Optional)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <label htmlFor="signup-password" className="sr-only">
                  Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Password (min. 6 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Confirm Password Input */}
              <div className="relative">
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-full bg-red-50 border border-red-200 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center animate-pulse">
                    <div className="h-4 bg-white/30 rounded w-32"></div>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Footer Links */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

