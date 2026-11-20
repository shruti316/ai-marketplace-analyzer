import React, { useState, useEffect } from 'react';
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
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { MarketplaceNetworkVisual } from './MarketplaceNetworkVisual';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters in length'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login, register: registerUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect already authenticated users away from the login page
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate, from]);

  // Form for Sign In
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  // Form for Registration
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Invalid email or password') {
          setServerError('Invalid email or password. Please verify your credentials or create a new account.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Authentication failed. Please check your credentials or backend server status.');
      }
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        rememberMe: data.rememberMe,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('already exists')) {
          setServerError('An account with this email already exists. Please sign in instead.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Registration failed. Please check your details and try again.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0B0D14] text-slate-100 overflow-x-hidden relative font-sans">
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />

      {/* =========================================================================
          LEFT VISUAL PANEL (Desktop: 48% width)
         ========================================================================= */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#0D101A] backdrop-blur-xl p-10 xl:p-12 flex-col justify-between relative overflow-hidden select-none border-r border-white/[0.08]">
        {/* Top Header & Brand Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--ink)] text-white flex items-center justify-center shadow-md border border-[var(--accent)]/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100 leading-tight font-heading">TrustSphere</h1>
              <p className="text-[11px] text-[var(--heather)] font-medium tracking-wide">
                Shop Smarter • Buy With Confidence
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-400">
            Shopping Intelligence
          </span>
        </div>

        {/* Center: Hero Headline & Topology */}
        <div className="relative z-10 space-y-6 my-auto py-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--heather)]/20 border border-[var(--line)] text-xs font-medium text-[var(--heather)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-hi)]" />
              <span>Consumer Shopping Protection</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-100 leading-tight font-heading">
              Spot suspicious deals before you pay.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-normal">
              Deep multimodal intelligence analyzing price anomalies, review patterns, and seller risks across Indian marketplaces.
            </p>
          </div>

          {/* Animated Marketplace Topology */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111522] backdrop-blur-md p-4">
            <MarketplaceNetworkVisual />
          </div>
        </div>

        {/* Bottom Footer Metadata */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/[0.08] pt-4 font-mono">
          <span className="text-[11px] text-slate-500">Amazon India • Flipkart • Myntra</span>
          <span className="text-[11px] text-[var(--heather)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Surveillance Active
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT AUTHENTICATION PANEL (Desktop: 52% width)
         ========================================================================= */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-10 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-3 pb-3 border-b border-white/[0.08]">
            <div className="h-9 w-9 rounded-xl bg-[var(--ink)] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-heading">TrustSphere</h2>
              <p className="text-[11px] text-[var(--heather)] font-medium">Shop Smarter. Buy with confidence.</p>
            </div>
          </div>

          {/* Form Header with Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-100 font-heading">
                  {mode === 'signin' ? 'Sign in' : 'Create an account'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {mode === 'signin'
                    ? 'Enter your credentials to access your saved investigations & advisor.'
                    : 'Join TrustSphere to check suspicious marketplace deals and save comparisons.'}
                </p>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div role="tablist" className="grid grid-cols-2 p-1 rounded-xl bg-[#111522] border border-white/[0.08] text-xs font-semibold">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                onClick={() => {
                  setMode('signin');
                  setServerError(null);
                }}
                className={`py-2 px-3 rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setServerError(null);
                }}
                className={`py-2 px-3 rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <Alert variant="danger" title={mode === 'signin' ? 'Authentication Error' : 'Registration Error'}>
              {serverError}
            </Alert>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} noValidate className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@organization.com"
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                error={loginForm.formState.errors.email?.message}
                disabled={loginForm.formState.isSubmitting}
                className="bg-[#181D2E] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:border-[var(--accent)]"
                {...loginForm.register('email')}
              />

              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 focus:outline-none p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={loginForm.formState.errors.password?.message}
                  disabled={loginForm.formState.isSubmitting}
                  className="bg-[#181D2E] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:border-[var(--accent)]"
                  {...loginForm.register('password')}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-white/[0.08] bg-[#181D2E] text-[var(--accent)] focus:ring-[var(--accent)] w-4 h-4"
                    disabled={loginForm.formState.isSubmitting}
                    {...loginForm.register('rememberMe')}
                  />
                  <span>Remember session (30 days)</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 py-2.5 font-semibold text-sm"
                isLoading={loginForm.formState.isSubmitting}
                disabled={loginForm.formState.isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} noValidate className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                leftIcon={<UserIcon className="w-4 h-4 text-slate-500" />}
                error={registerForm.formState.errors.fullName?.message}
                disabled={registerForm.formState.isSubmitting}
                className="bg-[#181D2E] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:border-[var(--accent)]"
                {...registerForm.register('fullName')}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@organization.com"
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                error={registerForm.formState.errors.email?.message}
                disabled={registerForm.formState.isSubmitting}
                className="bg-[#181D2E] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:border-[var(--accent)]"
                {...registerForm.register('email')}
              />

              <div className="space-y-1.5">
                <Input
                  label="Password (min 8 chars)"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 focus:outline-none p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={registerForm.formState.errors.password?.message}
                  disabled={registerForm.formState.isSubmitting}
                  className="bg-[#181D2E] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:border-[var(--accent)]"
                  {...registerForm.register('password')}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-white/[0.08] bg-[#181D2E] text-[var(--accent)] focus:ring-[var(--accent)] w-4 h-4"
                    disabled={registerForm.formState.isSubmitting}
                    {...registerForm.register('rememberMe')}
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 py-2.5 font-semibold text-sm"
                isLoading={registerForm.formState.isSubmitting}
                disabled={registerForm.formState.isSubmitting}
                rightIcon={<ShoppingBag className="w-4 h-4" />}
              >
                Create Account & Get Started
              </Button>
            </form>
          )}

          {/* Quick Notice */}
          <div className="p-4 rounded-xl bg-[#111522] border border-white/[0.08] text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--heather)] font-heading">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-hi)] shrink-0" />
              <span>Independent Shopping Intelligence</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              TrustSphere analyzes listings against multi-source evidence. We never claim guaranteed authenticity — we surface empirical signals so you can shop with confidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
