import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ScanSearch,
  History,
  PackageSearch,
  SearchCode,
  GitCompare,
  Sparkles,
  Tag,
  BrainCircuit,
  LayoutDashboard,
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
  { name: 'Investigation Workspace', to: '/', icon: ScanSearch, badge: 'Primary' },
  { name: 'Investigations History', to: '/investigations', icon: History },
  { name: 'Product Intelligence', to: '/products', icon: PackageSearch },
  { name: 'Evidence Explorer', to: '/evidence', icon: SearchCode },
  { name: 'Comparisons', to: '/comparisons', icon: GitCompare },
  { name: 'AI Assistant', to: '/assistant', icon: Sparkles },
  { name: 'Model Insights', to: '/model-insights', icon: BrainCircuit },
  { name: 'Annotation Studio', to: '/annotations', icon: Tag },
  { name: 'Overview', to: '/overview', icon: LayoutDashboard },
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
        'hidden md:flex flex-col bg-[#080713] text-[#A39CB8] border-r border-purple-900/40 transition-all duration-200 select-none shrink-0 relative z-30',
        isCollapsed ? 'w-[74px]' : 'w-64',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-purple-900/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#9875F5] to-[#6D7CFF] text-white shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-sm tracking-tight leading-tight">
                TrustSphere
              </span>
              <span className="text-[10px] text-[#C6B5FF] tracking-wider uppercase font-medium">
                Shopping Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#A39CB8] hover:text-white hover:bg-purple-950/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9875F5]"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 text-[#A39CB8]" />}
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
                    ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-md'
                    : 'text-[#A39CB8] hover:bg-purple-950/30 hover:text-white',
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
      <div className="p-3 border-t border-purple-900/40 bg-[#100D20]/60">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl transition-colors',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-[#C6B5FF] shrink-0">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.fullName || (isAuthenticated ? 'Consumer' : 'Guest')}
                </span>
                <span className="text-[10px] text-[#A39CB8] uppercase tracking-wider font-medium truncate">
                  {user?.role || 'Visitor'}
                </span>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <button
              onClick={() => logout()}
              className={cn(
                'text-[#A39CB8] hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500',
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
