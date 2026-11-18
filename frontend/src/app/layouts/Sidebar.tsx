import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ScanSearch,
  GitCompare,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Scanner', to: '/', icon: ScanSearch },
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
        'hidden md:flex flex-col bg-[#0D101A] text-slate-400 border-r border-white/[0.08] transition-all duration-200 select-none shrink-0 relative z-30',
        isCollapsed ? 'w-[74px]' : 'w-64',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs shadow-indigo-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-heading font-bold text-white text-sm tracking-tight leading-tight">
                TrustSphere
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Shopping Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav aria-label="Main Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-500/20'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
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
      <div className="p-3 border-t border-white/[0.08] bg-[#090C14]">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl transition-colors',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-[#181D2E] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.fullName || (isAuthenticated ? 'Consumer' : 'Guest')}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium truncate font-mono">
                  {user?.role || 'Visitor'}
                </span>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <button
              onClick={() => logout()}
              className={cn(
                'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500',
                isCollapsed && 'mt-2'
              )}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
