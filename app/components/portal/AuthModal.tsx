'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { 
  EyeIcon, 
  EyeSlashIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useClientAuth } from '@/app/contexts/ClientAuthContext';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
  onSuccess?: () => void;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  defaultMode = 'login',
  onSuccess 
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, login, register } = useClientAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCredentials({ email: '', password: '' });
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: ''
      });
      setError('');
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  // Store current URL as returnUrl when modal opens (Hypothesis A, C, E)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:82',message:'Modal opened - storing returnUrl',data:{currentUrl,isOpen},timestamp:Date.now(),runId:'debug1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      sessionStorage.setItem('returnUrl', currentUrl);
    }
  }, [isOpen]);

  // Close modal and call onSuccess when authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:95',message:'User authenticated in modal',data:{isAuthenticated,isOpen,hasOnSuccess:!!onSuccess},timestamp:Date.now(),runId:'debug1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('returnUrl') : null;
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:100',message:'Checking returnUrl before closing modal',data:{returnUrl,currentPath:typeof window !== 'undefined' ? window.location.pathname : null},timestamp:Date.now(),runId:'debug1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      onClose();
      if (onSuccess) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:107',message:'Calling onSuccess callback',data:{},timestamp:Date.now(),runId:'debug1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        onSuccess();
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:113',message:'Modal closing - checking if redirect will happen',data:{returnUrl},timestamp:Date.now(),runId:'debug1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
  }, [isAuthenticated, isOpen, onClose, onSuccess]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted || typeof window === 'undefined') return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:120',message:'Login attempt started',data:{currentPath:typeof window !== 'undefined' ? window.location.pathname : null},timestamp:Date.now(),runId:'debug1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      await login(credentials.email, credentials.password);
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthModal.tsx:125',message:'Login successful - waiting for isAuthenticated to update',data:{},timestamp:Date.now(),runId:'debug1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Modal will close automatically via useEffect when isAuthenticated becomes true
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
      // Modal will close automatically via useEffect when isAuthenticated becomes true
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-[#1A1C1E] rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tab Switcher */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-full font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-full font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Heading */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            {mode === 'login' ? 'Welcome' : 'Create Account'} 
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center text-sm">
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
            disabled={loading}
            className="w-full mb-6 py-3 px-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-[#1A1C1E] text-gray-500">or</span>
            </div>
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <label htmlFor="modal-login-email" className="sr-only">
                  Email address
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="modal-login-email"
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
                <label htmlFor="modal-login-password" className="sr-only">
                  Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="modal-login-password"
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
                <div className="rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Log In'
                )}
              </button>

              {/* Footer Links */}
              <div className="text-center space-y-2 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Don't have an account? Sign Up
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="modal-firstName" className="sr-only">
                    First Name
                  </label>
                  <input
                    id="modal-firstName"
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
                  <label htmlFor="modal-lastName" className="sr-only">
                    Last Name
                  </label>
                  <input
                    id="modal-lastName"
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
                <label htmlFor="modal-signup-email" className="sr-only">
                  Email address
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="modal-signup-email"
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
                <label htmlFor="modal-phone" className="sr-only">
                  Phone (Optional)
                </label>
                <input
                  id="modal-phone"
                  name="phone"
                  type="tel"
                  className="w-full px-4 py-3 rounded-full border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Phone (Optional)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <label htmlFor="modal-signup-password" className="sr-only">
                  Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="modal-signup-password"
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
                <label htmlFor="modal-confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="modal-confirmPassword"
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
                <div className="rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
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

  // Render modal using portal to document.body to avoid stacking context issues
  return createPortal(modalContent, document.body);
}
