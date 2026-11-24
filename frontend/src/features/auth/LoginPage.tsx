import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { MarketplaceNetworkVisual } from './MarketplaceNetworkVisual';
import { extractApiError } from '../../services/errorExtractor';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters in length'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    rememberMe: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export interface LoginPageProps {
  defaultMode?: 'signin' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({ defaultMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'register'>(defaultMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);
  const [isSlowResponse, setIsSlowResponse] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const { login, register: registerUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const from = (rawFrom && rawFrom !== '/login' && rawFrom !== '/register' && rawFrom !== '/signup' && rawFrom !== '/')
    ? rawFrom
    : '/dashboard';

  // Automatically redirect authenticated users to /dashboard
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate, from]);

  // Sync mode with route if navigating between /login and /register
  useEffect(() => {
    if (location.pathname === '/register' || location.pathname === '/signup') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('signin');
    }
  }, [location.pathname]);

  // Form for Sign In
  const {
    register: registerLoginField,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    reset: resetLoginForm,
    setValue: setLoginValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  // Form for Registration
  const {
    register: registerRegisterField,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors, isSubmitting: isRegisterSubmitting },
    reset: resetRegisterForm,
    getValues: getRegisterValues,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      rememberMe: true,
    },
  });

  const isSubmitting = isLoginSubmitting || isRegisterSubmitting;

  // Track slow responses to alert user of Render cold starts gracefully with active seconds counter
  useEffect(() => {
    if (isSubmitting) {
      setElapsedSeconds(0);
      slowTimerRef.current = setTimeout(() => {
        setIsSlowResponse(true);
      }, 3500);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsSlowResponse(false);
      setElapsedSeconds(0);
    }
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSubmitting]);

  const formatAuthError = (err: unknown, defaultMsg: string): string => {
    const extracted = extractApiError(err, defaultMsg);
    setServerErrorCode(extracted.code || null);
    return extracted.message;
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe !== false,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setServerError(formatAuthError(err, 'Authentication failed. Please check your credentials and try again.'));
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        rememberMe: data.rememberMe !== false,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setServerError(formatAuthError(err, 'Registration failed. Please check your details and try again.'));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center bg-[var(--canvas)] text-[#16131F] relative font-sans overflow-x-hidden selection:bg-[#F0D9E4] selection:text-[#16131F]">
      {/* Background ambient radial gradients matching Dashboard */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[100px] -left-[100px] w-[800px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(142,63,122,0.12)_0%,transparent_70%)]" />
        <div className="absolute top-[20%] right-[-150px] w-[700px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(106,99,224,0.08)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[200px] left-[25%] w-[900px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(240,217,228,0.30)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* =========================================================================
              LEFT VISUAL PANEL (Desktop: 6 columns, Light Plum Hero)
             ========================================================================= */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-6 select-none pr-4">
            {/* Top Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#16131F] text-[#F0D9E4] flex items-center justify-center shadow-md border border-[rgba(193,160,172,0.35)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#16131F] font-heading">TrustSphere</h1>
                  <p className="text-xs text-[#6F5B68] font-medium tracking-wide">Shop Smarter • Buy With Confidence</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/80 border border-[rgba(193,160,172,0.35)] text-[#4A3F4B] font-semibold shadow-2xs">
                Shopping Intelligence
              </span>
            </div>

            {/* Hero Copy & Value Proposition */}
            <div className="space-y-4 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0D9E4]/60 border border-[rgba(193,160,172,0.40)] text-xs font-semibold text-[#6B2D5C]">
                <Sparkles className="w-3.5 h-3.5 text-[#8E3F7A]" />
                <span>Consumer Shopping Protection</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#16131F] leading-tight font-heading">
                Spot suspicious deals before you pay.
              </h2>
              <p className="text-sm text-[#4A3F4B] leading-relaxed font-normal">
                Deep multimodal intelligence analyzing price anomalies, review patterns, and merchant governance across
                Amazon India, Flipkart, and Myntra.
              </p>
            </div>

            {/* Interactive Light Plum Visual Topology */}
            <div className="w-full">
              <MarketplaceNetworkVisual />
            </div>

            {/* Bottom Platform Metadata */}
            <div className="flex items-center justify-between text-xs text-[#6F5B68] border-t border-[rgba(193,160,172,0.35)] pt-4 font-mono">
              <span className="text-[11px] font-medium text-[#4A3F4B]">Multi-Marketplace Surveillance Active</span>
              <span className="text-[11px] text-[#065F46] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Live Protection
              </span>
            </div>
          </div>

          {/* =========================================================================
              RIGHT AUTHENTICATION CARD (Desktop: 6 columns, Light Plum Form Card)
             ========================================================================= */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            {/* Mobile Brand Identity */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-[#16131F] text-[#F0D9E4] flex items-center justify-center shadow-md border border-[rgba(193,160,172,0.35)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#16131F] font-heading">TrustSphere</h2>
                <p className="text-xs text-[#6F5B68] font-medium">Shop Smarter • Buy With Confidence</p>
              </div>
            </div>

            {/* Main Auth Card Container */}
            <div className="bg-white/85 backdrop-blur-xl border border-[rgba(193,160,172,0.40)] rounded-[24px] shadow-[0_12px_40px_rgba(22,19,31,0.06)] p-6 sm:p-8 space-y-6">
              {/* Segmented Mode Switcher */}
              <div className="grid grid-cols-2 p-1 bg-[#F8EDF2] rounded-xl border border-[rgba(193,160,172,0.35)]" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  aria-label="Switch to sign in mode"
                  onClick={() => {
                    setMode('signin');
                    setServerError(null);
                    setServerErrorCode(null);
                    resetLoginForm();
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-[#16131F] text-white shadow-xs'
                      : 'text-[#6F5B68] hover:text-[#16131F]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  aria-label="Switch to registration mode"
                  onClick={() => {
                    setMode('register');
                    setServerError(null);
                    setServerErrorCode(null);
                    resetRegisterForm();
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-[#16131F] text-white shadow-xs'
                      : 'text-[#6F5B68] hover:text-[#16131F]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form Title & Subtitle */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#16131F] font-heading">
                  {mode === 'signin' ? 'Sign In' : 'Create an Account'}
                </h2>
                <p className="text-xs text-[#6F5B68]">
                  {mode === 'signin'
                    ? 'Enter your credentials to access your saved investigations & advisor.'
                    : 'Join TrustSphere to check suspicious marketplace deals and save comparisons.'}
                </p>
              </div>

              {/* Server / Network Error Alert */}
              {serverError && (
                <div className="p-3.5 rounded-xl bg-[#FDE4E4] border border-[#FECDD3] text-[#8C1D2B] text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-[#D63B4B] shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{mode === 'signin' ? 'Sign In Error' : 'Registration Error'}</p>
                      {serverErrorCode && (
                        <span className="font-mono text-[10px] tracking-wider uppercase bg-[#FECDD3] text-[#8C1D2B] px-1.5 py-0.5 rounded font-semibold select-all">
                          {serverErrorCode}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed">{serverError}</p>
                    {mode === 'register' && (serverError.includes('already exists') || serverErrorCode === 'EMAIL_ALREADY_EXISTS') && (
                      <button
                        type="button"
                        onClick={() => {
                          const typedEmail = getRegisterValues('email');
                          setMode('signin');
                          setServerError(null);
                          setServerErrorCode(null);
                          if (typedEmail) {
                            setLoginValue('email', typedEmail);
                          }
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#8C1D2B] underline hover:text-[#5C0D1B] cursor-pointer"
                      >
                        Switch to Sign In Tab →
                      </button>
                    )}
                    {(serverError.includes('initializing') || serverError.includes('retry') || serverError.includes('moment') || serverError.includes('timed out') || serverError.includes('cold sleep') || serverError.includes('waking up') || serverErrorCode === 'TIMEOUT' || serverErrorCode === 'GATEWAY_TIMEOUT') && (
                      <button
                        type="button"
                        onClick={() => {
                          setServerError(null);
                          setServerErrorCode(null);
                          if (mode === 'signin') {
                            handleLoginSubmit(onLoginSubmit)();
                          } else {
                            handleRegisterSubmit(onRegisterSubmit)();
                          }
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#8C1D2B] underline hover:text-[#5C0D1B] cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry Submission Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cloud Container In-Flight Wake-Up Timer */}
              {isSlowResponse && isSubmitting && (
                <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center gap-2.5 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-[#E09A12] shrink-0 animate-spin" />
                  <span className="leading-snug">
                    Connecting to TrustSphere cloud engine ({elapsedSeconds}s elapsed)... Container instances wake on demand (~30–45s). Your request will process automatically.
                  </span>
                </div>
              )}

              {/* ===============================================================
                  SIGN IN FORM
                 =============================================================== */}
              {mode === 'signin' ? (
                <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#16131F]">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F5B68]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="name@organization.com"
                        {...registerLoginField('email')}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#16131F] placeholder:text-[#6F5B68]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(107,45,92,0.18)] ${
                          loginErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-[rgba(193,160,172,0.40)] focus:border-[#6B2D5C]'
                        }`}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-[11px] text-rose-600 font-medium">{loginErrors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#16131F]">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F5B68]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        {...registerLoginField('password')}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border text-xs text-[#16131F] placeholder:text-[#6F5B68]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(107,45,92,0.18)] ${
                          loginErrors.password ? 'border-rose-400 focus:border-rose-500' : 'border-[rgba(193,160,172,0.40)] focus:border-[#6B2D5C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6F5B68] hover:text-[#16131F] focus:outline-none cursor-pointer"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-[11px] text-rose-600 font-medium">{loginErrors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...registerLoginField('rememberMe')}
                        className="rounded border-[rgba(193,160,172,0.45)] text-[#6B2D5C] focus:ring-[rgba(107,45,92,0.20)]"
                      />
                      <span className="text-[#4A3F4B] text-[11px] font-medium">Remember session (30 days)</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#16131F] hover:bg-[#4A3F4B] text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F0D9E4]" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#F0D9E4]" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ===============================================================
                   CREATE ACCOUNT FORM
                   =============================================================== */
                <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-3.5" noValidate>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#16131F]">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F5B68]">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder="Shruti Joshi"
                        {...registerRegisterField('fullName')}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#16131F] placeholder:text-[#6F5B68]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(107,45,92,0.18)] ${
                          registerErrors.fullName ? 'border-rose-400 focus:border-rose-500' : 'border-[rgba(193,160,172,0.40)] focus:border-[#6B2D5C]'
                        }`}
                      />
                    </div>
                    {registerErrors.fullName && (
                      <p className="text-[11px] text-rose-600 font-medium">{registerErrors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#16131F]">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F5B68]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="name@organization.com"
                        {...registerRegisterField('email')}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#16131F] placeholder:text-[#6F5B68]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(107,45,92,0.18)] ${
                          registerErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-[rgba(193,160,172,0.40)] focus:border-[#6B2D5C]'
                        }`}
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="text-[11px] text-rose-600 font-medium">{registerErrors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#16131F]">Password (min 8 chars)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F5B68]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                        {...registerRegisterField('password')}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border text-xs text-[#16131F] placeholder:text-[#6F5B68]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(107,45,92,0.18)] ${
                          registerErrors.password ? 'border-rose-400 focus:border-rose-500' : 'border-[rgba(193,160,172,0.40)] focus:border-[#6B2D5C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6F5B68] hover:text-[#16131F] focus:outline-none cursor-pointer"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerErrors.password && (
                      <p className="text-[11px] text-rose-600 font-medium">{registerErrors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#16131F]">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F5B68]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                        {...registerRegisterField('confirmPassword')}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border text-xs text-[#16131F] placeholder:text-[#6F5B68]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(107,45,92,0.18)] ${
                          registerErrors.confirmPassword ? 'border-rose-400 focus:border-rose-500' : 'border-[rgba(193,160,172,0.40)] focus:border-[#6B2D5C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6F5B68] hover:text-[#16131F] focus:outline-none cursor-pointer"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerErrors.confirmPassword && (
                      <p className="text-[11px] text-rose-600 font-medium">{registerErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...registerRegisterField('rememberMe')}
                        className="rounded border-[rgba(193,160,172,0.45)] text-[#6B2D5C] focus:ring-[rgba(107,45,92,0.20)]"
                      />
                      <span className="text-[#4A3F4B] text-[11px] font-medium">Keep me signed in</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#16131F] hover:bg-[#4A3F4B] text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F0D9E4]" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account & Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#F0D9E4]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Informational Footer Note */}
              <div className="pt-3 border-t border-[rgba(193,160,172,0.30)] text-[11px] text-[#6F5B68] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8E3F7A] shrink-0 mt-0.5" />
                <span>
                  <strong>Independent Shopping Intelligence</strong>: TrustSphere analyzes listings against multi-source
                  evidence. Credentials are authenticated directly via TiDB Cloud with Argon2id protection.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
