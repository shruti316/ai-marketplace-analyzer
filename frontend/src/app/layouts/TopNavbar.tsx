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
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-[#ECE8F2] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-[#806C79] hover:text-[#16131F] hover:bg-[#F6F5FA] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5DFA] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>

        {/* Mobile brand text */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#7C5DFA] text-white flex items-center justify-center shadow-xs">
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
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : dbStatus === 'degraded'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
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
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7C5DFA] hover:bg-[#6A49F2] text-white text-xs font-semibold shadow-xs transition-all hover:translate-y-[-1px]"
        >
          <ScanSearch className="w-3.5 h-3.5" />
          <span>Check a Product</span>
        </Link>

        {/* User state / Auth action */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[#ECE8F2]">
            <div className="h-8 w-8 rounded-full bg-[#EDE9FE] text-[#7C5DFA] flex items-center justify-center text-xs font-bold border border-[#ECE8F2]">
              {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#16131F] leading-tight">
                {user.fullName || 'Consumer'}
              </span>
              <span className="text-[10px] text-[#806C79] capitalize">
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
