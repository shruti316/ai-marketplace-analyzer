import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanSearch,
  GitCompare,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

export interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Scanner', to: '/scanner', icon: ScanSearch },
  { name: 'Comparisons', to: '/comparisons', icon: GitCompare },
  { name: 'AI Assistant', to: '/assistant', icon: Sparkles },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  className,
}) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col m-4 mr-0 mb-4 rounded-[24px] bg-white text-[#4A3F4B] border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] transition-all duration-200 select-none shrink-0 relative z-30 overflow-hidden h-[calc(100vh-32px)]',
        isCollapsed ? 'w-[76px]' : 'w-[240px]',
        className
      )}
    >
      {/* Brand Header - Unclipped logo & centered controls */}
      <div
        className={cn(
          'flex border-b border-[rgba(193,160,172,0.35)] transition-all duration-200',
          isCollapsed
            ? 'flex-col items-center justify-center py-4 gap-2.5 px-2'
            : 'items-center justify-between h-16 px-4'
        )}
      >
        <div className={cn('flex items-center gap-3 overflow-visible', isCollapsed && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#16131F] text-[#F0D9E4] shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-heading font-bold text-[#16131F] text-sm tracking-tight leading-tight">
                TrustSphere
              </span>
              <span className="text-[10px] text-[var(--text-3)] tracking-wider uppercase font-semibold">
                Shopping Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            'p-1.5 rounded-lg text-[var(--text-3)] hover:text-[#16131F] hover:bg-[#F8EDF2] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#16131F] cursor-pointer',
            isCollapsed && 'mt-0.5'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--text-3)]" /> : <ChevronLeft className="w-4 h-4 text-[var(--text-3)]" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav aria-label="Main Navigation" className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] text-xs font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-[#F0D9E4] text-[#16131F] font-semibold border border-[rgba(193,160,172,0.40)] shadow-xs'
                    : 'text-[#4A3F4B] hover:bg-[#F8EDF2] hover:text-[#16131F]',
                  isCollapsed && 'justify-center px-2'
                )
              }
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              {isCollapsed && (
                <span className="sr-only">{item.name}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Account Area */}
      <div className="p-3 border-t border-[rgba(193,160,172,0.35)] bg-[#FDFBFC]">
        {isAuthenticated && user ? (
          <div
            className={cn(
              'flex items-center gap-2.5 p-2 rounded-[16px] bg-[#F8EDF2] border border-[rgba(193,160,172,0.35)] transition-colors',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <Link to="/settings" className="flex items-center gap-2.5 overflow-hidden group">
              <div className="h-8 w-8 rounded-full bg-[#F0D9E4] text-[#16131F] border border-[#C1A0AC]/40 flex items-center justify-center text-xs font-bold shrink-0 group-hover:scale-105 transition-transform">
                {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-[#16131F] truncate group-hover:text-[var(--accent)] transition-colors">
                    {user.fullName || user.email}
                  </span>
                  <span className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-medium truncate font-mono">
                    {user.role}
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={() => logout()}
              className={cn(
                'text-[var(--text-3)] hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 cursor-pointer',
                isCollapsed && 'mt-2'
              )}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className={cn(
              'flex items-center gap-2.5 p-2 rounded-[16px] bg-[#F8EDF2] hover:bg-[#F0D9E4] border border-[rgba(193,160,172,0.35)] text-xs font-semibold text-[#16131F] transition-all',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
            title="Sign In to access all features"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[#16131F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                <LogIn className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span>Sign In</span>}
            </div>
            {!isCollapsed && <span className="text-[10px] text-[var(--text-3)] font-mono">Guest</span>}
          </Link>
        )}
      </div>
    </aside>
  );
};
