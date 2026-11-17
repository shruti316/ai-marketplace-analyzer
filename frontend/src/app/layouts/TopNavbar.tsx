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
    <header className="h-16 bg-[#080713]/85 backdrop-blur-md border-b border-purple-900/40 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-[#A39CB8] hover:text-white hover:bg-purple-950/40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9875F5]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>

        {/* Mobile brand text */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#9875F5] to-[#6D7CFF] text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-white">TrustSphere</span>
        </div>
      </div>

      {/* Center / Right: System Status, Search, User Auth */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Health Status Indicator */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#100D20] border border-purple-900/40 text-xs"
          title={`Backend: ${healthData?.status || 'checking'}, MySQL: ${healthData?.database?.status || 'probing'}`}
        >
          <StatusIndicator status={dbStatus} />
          <span className="text-[11px] font-medium text-[#A39CB8]">
            {dbStatus === 'healthy' ? 'Engine Live' : dbStatus === 'degraded' ? 'Degraded' : 'Offline'}
          </span>
        </div>

        {/* Quick Check Action */}
        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] hover:from-[#8964e8] hover:to-[#5e6deb] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <ScanSearch className="w-3.5 h-3.5" />
          <span>Check a Product</span>
        </Link>

        {/* User state / Auth action */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-purple-900/40">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-800 to-indigo-900 text-white flex items-center justify-center text-xs font-bold border border-purple-500/30">
              {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">
                {user.fullName || 'Consumer'}
              </span>
              <span className="text-[10px] text-[#A39CB8] capitalize">
                {user.role?.toLowerCase() || 'Viewer'}
              </span>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="p-1.5 text-[#A39CB8] hover:text-white hover:bg-purple-950/40 rounded-lg transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pl-2 border-l border-purple-900/40">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171329] hover:bg-purple-900/30 border border-purple-900/40 text-xs font-semibold text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[#9875F5]" />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
