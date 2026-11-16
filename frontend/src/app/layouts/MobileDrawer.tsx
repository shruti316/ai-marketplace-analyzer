import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, ShieldCheck, LogOut } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Close drawer automatically whenever route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0D1B2A]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative w-4/5 max-w-xs bg-[#0D1B2A] text-slate-300 flex flex-col h-full shadow-2xl z-10 animate-slideRight">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3D7584] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">TrustSphere</span>
              <span className="text-[10px] text-[#89BBBE] tracking-wider uppercase font-medium">
                Enterprise Intelligence
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg focus-visible:outline-none"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-[#3D7584] text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer with User info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-[#091420]/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-9 w-9 rounded-full bg-[#3D7584]/30 border border-[#89BBBE]/40 flex items-center justify-center text-xs font-bold text-[#89BBBE] shrink-0">
                {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.fullName || 'Analyst'}
                </span>
                <span className="text-[10px] text-[#A3B18A] uppercase font-medium">
                  {user?.role || 'Guest'}
                </span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-[#B84A4A] rounded-lg transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
