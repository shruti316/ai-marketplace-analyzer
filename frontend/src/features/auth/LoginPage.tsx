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
  ArrowRight,
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

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect already authenticated users away from the login page
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
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
          setServerError('Invalid email or password. Please verify your administrator email or reset credentials using npm run admin.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Authentication failed. Please check your credentials or backend server status.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FAF7F2] overflow-x-hidden">
      {/* =========================================================================
          PART A: REDESIGNED LEFT VISUAL PANEL (Desktop: 48% width)
          Soft Modern Enterprise - Midnight Navy with Dynamic Marketplace Graph
         ========================================================================= */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#0D1B2A] text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden select-none border-r border-slate-800">
        {/* Top Header & Brand Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#3D7584] text-white flex items-center justify-center shadow-md border border-[#89BBBE]/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">TrustSphere</h1>
              <p className="text-[11px] text-[#89BBBE] font-medium tracking-wide">
                Marketplace Trust Intelligence
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
            Enterprise v1.0
          </span>
        </div>

        {/* Center: Concise Headline & Animated Marketplace Network Visualization */}
        <div className="relative z-10 space-y-6 my-auto py-6">
          <div className="space-y-2">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#FAF7F2] leading-tight">
              See beyond the listing.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Marketplace intelligence through multimodal evidence.
            </p>
            <p className="text-xs text-[#89BBBE] font-medium">
              Cross-marketplace anomaly detection across Amazon India, Flipkart & Myntra.
            </p>
          </div>

          {/* Animated Marketplace Relationship Topology */}
          <MarketplaceNetworkVisual />
        </div>

        {/* Bottom Footer Metadata */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <span className="text-[11px] text-slate-400">Targeting Amazon India, Flipkart & Myntra</span>
          <span className="text-[11px] text-slate-500 font-mono">Continuous Surveillance Active</span>
        </div>
      </div>

      {/* =========================================================================
          AUTHENTICATION PANEL (Desktop: 52% width, Mobile: 100% full width)
         ========================================================================= */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only compact brand header */}
          <div className="lg:hidden flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="h-9 w-9 rounded-xl bg-[#3D7584] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0D1B2A]">TrustSphere</h2>
              <p className="text-[11px] text-[#3D7584] font-medium">Marketplace Trust Intelligence</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5">
            <h3 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">Sign in</h3>
            <p className="text-xs text-slate-500">
              Enter your credentials to access the analyst workspace.
            </p>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <Alert
              variant="danger"
              title={
                serverError.toLowerCase().includes('connect') ||
                serverError.toLowerCase().includes('backend')
                  ? 'Connection Error'
                  : 'Authentication Error'
              }
            >
              {serverError}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="name@organization.com"
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              disabled={isSubmitting}
              {...register('email')}
            />

            <div className="space-y-1.5">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.password?.message}
                disabled={isSubmitting}
                {...register('password')}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  className="rounded border-[#DCE5E7] text-[#3D7584] focus:ring-[#3D7584] w-4 h-4"
                  disabled={isSubmitting}
                  {...register('rememberMe')}
                />
                <span>Remember session</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Enterprise Security & Access Notice */}
          <div className="p-4 rounded-xl bg-[#EBF2F4] border border-[#D0E2E5] text-xs text-[#1E3E47] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#3D7584]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Restricted Analyst Access</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Access is restricted to authorized operators and trust analysts. All authentication attempts and investigation workflows are audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
