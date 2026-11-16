import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, ShieldCheck, ScanSearch } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { StatusIndicator } from '../../components/common/StatusIndicator';
import { useQuery } from '@tanstack/react-query';
import { healthService } from '../../services/healthService';
import { useAuth } from '../../hooks/useAuth';

export interface TopNavbarProps {
  onOpenMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();

  // Query live health endpoint
  const { data: healthData, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => healthService.getHealth(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });

  const dbStatus = isError
    ? 'disconnected'
    : healthData?.database?.status === 'connected'
    ? 'healthy'
    : 'degraded';

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-[#DCE5E7] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D7584]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>

        {/* Mobile brand text */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#3D7584] text-white flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-[#0D1B2A]">TrustSphere</span>
        </div>
      </div>

      {/* Center / Right: Search, System Status, User Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search bar placeholder */}
        <div className="hidden lg:flex items-center relative w-64 xl:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            readOnly
            placeholder="Search products, brands, sellers..."
            className="w-full bg-[#FAF7F2] text-xs text-slate-800 placeholder:text-slate-400 rounded-xl pl-9 pr-12 py-2 border border-[#DCE5E7] cursor-pointer hover:border-[#89BBBE] transition-colors focus:outline-none"
          />
          <kbd className="absolute right-2.5 top-2 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>

        {/* System Health Status Indicator */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#DCE5E7] text-xs"
          title={`Backend status: ${healthData?.status || 'checking'}, Database: ${healthData?.database?.status || 'probing'}`}
        >
          <StatusIndicator status={dbStatus} />
          <span className="text-[11px] font-medium text-slate-600">
            {dbStatus === 'healthy' ? 'Engine Live' : dbStatus === 'degraded' ? 'Degraded' : 'Offline'}
          </span>
        </div>

        {/* Quick New Investigation Action */}
        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D1B2A] text-white hover:bg-[#1C324D] text-xs font-semibold shadow-xs transition-colors"
        >
          <ScanSearch className="w-3.5 h-3.5 text-[#89BBBE]" />
          <span>New Investigation</span>
        </Link>

        {/* User initials bubble on desktop */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-[#0D1B2A] text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#0D1B2A] leading-tight">
              {user?.fullName || 'Analyst'}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">
              {user?.role?.toLowerCase() || 'Viewer'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
