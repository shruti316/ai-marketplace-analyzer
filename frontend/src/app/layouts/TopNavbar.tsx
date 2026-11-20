import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ShieldCheck, ScanSearch, LogOut } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { useQuery } from '@tanstack/react-query';
import { healthService } from '../../services/healthService';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export interface TopNavbarProps {
  onOpenMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Query live health endpoint
  const { data: healthData, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => healthService.getHealth(),
    refetchInterval: 30000,
    retry: 1,
  });

  const dbStatus = isError
    ? 'disconnected'
    : healthData?.database?.status === 'connected'
    ? 'healthy'
    : 'degraded';

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[rgba(193,160,172,0.35)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-[#806C79] hover:text-[#16131F] hover:bg-[#F8EDF2] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16131F] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>

        {/* Mobile brand text */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#16131F] text-[#F0D9E4] flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-heading font-bold text-sm text-[#16131F]">TrustSphere</span>
        </div>
      </div>

      {/* Center / Right: System Status, Search, User Auth */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Health Status Indicator */}
        <div
          className={cn(
            'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium',
            dbStatus === 'healthy'
              ? 'bg-[#E6F4EA] text-[#065F46] border-[#A7F3D0]'
              : dbStatus === 'degraded'
              ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
              : 'bg-[#FCE7F3] text-[#9F1239] border-[#FECDD3]'
          )}
          title={`Backend: ${healthData?.status || 'checking'}, MySQL: ${healthData?.database?.status || 'probing'}`}
        >
          <StatusIndicator status={dbStatus} />
          <span className="text-[11px] font-semibold">
            {dbStatus === 'healthy' ? 'Engine Live' : dbStatus === 'degraded' ? 'Degraded' : 'Offline'}
          </span>
        </div>

        {/* Quick Check Action */}
        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16131F] hover:bg-[#4A3F4B] text-white text-xs font-semibold shadow-xs transition-all hover:translate-y-[-1px]"
        >
          <ScanSearch className="w-3.5 h-3.5 text-[#F0D9E4]" />
          <span>Check a Product</span>
        </Link>

        {/* User state / Auth action */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[rgba(193,160,172,0.35)]">
            <div className="h-8 w-8 rounded-full bg-[#F0D9E4] text-[#16131F] flex items-center justify-center text-xs font-bold border border-[#C1A0AC]/40">
              {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#16131F] leading-tight">
                {user.fullName || 'Shruti'}
              </span>
              <span className="text-[10px] text-[#806C79] capitalize font-mono">
                {user.role?.toLowerCase() || 'Viewer'}
              </span>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="p-1.5 text-[#806C79] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-[#ECE8F2]">
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4A3F4B] hover:text-[#16131F] hover:bg-[#F6F5FA] border border-[#ECE8F2] transition-colors"
            >
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
