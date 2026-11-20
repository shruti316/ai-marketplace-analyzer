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
  const { user, logout, isAuthenticated } = useAuth();

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
        className="fixed inset-0 bg-[#16131F]/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative w-4/5 max-w-xs bg-white text-[#4A3F4B] flex flex-col h-full shadow-2xl z-10 animate-slideRight border-r border-[rgba(193,160,172,0.35)]">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[rgba(193,160,172,0.35)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#16131F] text-[#F0D9E4] shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-[#16131F] text-sm">TrustSphere</span>
              <span className="text-[10px] text-[#806C79] tracking-wider uppercase font-semibold">
                Shopping Intelligence
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#806C79] hover:text-[#16131F] rounded-lg focus-visible:outline-none"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-[#F0D9E4] text-[#16131F] shadow-xs font-semibold border border-[rgba(193,160,172,0.40)]'
                      : 'text-[#4A3F4B] hover:bg-[#F8EDF2] hover:text-[#16131F]'
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
        <div className="p-4 border-t border-[rgba(193,160,172,0.35)] bg-[#FDFBFC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-9 w-9 rounded-full bg-[#F0D9E4] border border-[#C1A0AC]/40 flex items-center justify-center text-xs font-bold text-[#16131F] shrink-0">
                {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-[#16131F] truncate">
                  {user?.fullName || (isAuthenticated ? 'Consumer' : 'Guest')}
                </span>
                <span className="text-[10px] text-[#806C79] uppercase tracking-wider font-mono">
                  {user?.role || 'Visitor'}
                </span>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => logout()}
                className="text-[#806C79] hover:text-rose-600 p-2 rounded-lg transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
