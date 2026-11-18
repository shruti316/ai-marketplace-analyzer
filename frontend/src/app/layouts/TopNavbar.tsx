import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ShieldCheck, ScanSearch, LogIn, LogOut } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { useQuery } from '@tanstack/react-query';
import { healthService } from '../../services/healthService';
import { useAuth } from '../../hooks/useAuth';

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
    <header className="h-16 bg-[#0B0D14]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>

        {/* Mobile brand text */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-heading font-bold text-sm text-white">TrustSphere</span>
        </div>
      </div>

      {/* Center / Right: System Status, Search, User Auth */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Health Status Indicator */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121624] border border-white/[0.08] text-xs"
          title={`Backend: ${healthData?.status || 'checking'}, MySQL: ${healthData?.database?.status || 'probing'}`}
        >
          <StatusIndicator status={dbStatus} />
          <span className="text-[11px] font-medium text-slate-400">
            {dbStatus === 'healthy' ? 'Engine Live' : dbStatus === 'degraded' ? 'Degraded' : 'Offline'}
          </span>
        </div>

        {/* Quick Check Action */}
        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs shadow-indigo-500/20 transition-all hover:translate-y-[-1px]"
        >
          <ScanSearch className="w-3.5 h-3.5" />
          <span>Check a Product</span>
        </Link>

        {/* User state / Auth action */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <div className="h-8 w-8 rounded-full bg-[#181D2E] text-indigo-400 flex items-center justify-center text-xs font-bold border border-white/[0.08]">
              {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">
                {user.fullName || 'Consumer'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {user.role?.toLowerCase() || 'Viewer'}
              </span>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pl-2 border-l border-white/[0.08]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121624] hover:bg-[#181D2E] border border-white/[0.08] text-xs font-semibold text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
