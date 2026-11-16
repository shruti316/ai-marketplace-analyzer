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
  const { user, logout } = useAuth();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-[#0D1B2A] text-slate-300 border-r border-slate-800/80 transition-all duration-200 select-none shrink-0 relative z-30',
        isCollapsed ? 'w-[74px]' : 'w-64',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3D7584] text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-sm tracking-tight leading-tight">
                TrustSphere
              </span>
              <span className="text-[10px] text-[#89BBBE] tracking-wider uppercase font-medium">
                Enterprise Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3D7584]"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
                    ? 'bg-[#3D7584] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
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
      <div className="p-3 border-t border-slate-800/90 bg-[#091420]/60">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl transition-colors',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-[#3D7584]/30 border border-[#89BBBE]/40 flex items-center justify-center text-xs font-bold text-[#89BBBE] shrink-0">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.fullName || 'Analyst'}
                </span>
                <span className="text-[10px] text-[#A3B18A] uppercase tracking-wider font-medium truncate">
                  {user?.role || 'Guest'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => logout()}
            className={cn(
              'text-slate-400 hover:text-[#B84A4A] hover:bg-slate-800/80 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B84A4A]',
              isCollapsed && 'mt-2'
            )}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
