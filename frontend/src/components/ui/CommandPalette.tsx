import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  ScanSearch,
  GitCompare,
  Sparkles,
  Settings,
  Search,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#16131F]/30 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white/95 backdrop-blur-2xl border border-[var(--line)] rounded-2xl shadow-[0_24px_64px_rgba(22,19,31,0.18)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Global Command Palette"
      >
        <Command label="TrustSphere Command Menu" className="w-full">
          {/* Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-[#ECE8F2] gap-3">
            <Search className="w-4 h-4 text-[var(--text-3)] shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Type a command, route, or quick action..."
              className="w-full bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--text-3)] outline-none border-none font-medium"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-[#F8EDF2] border border-[var(--line)] text-[10px] font-mono text-[var(--text-3)] font-semibold">
              ESC
            </kbd>
          </div>

          {/* Scrollable Command List */}
          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="p-6 text-center text-xs text-[var(--text-3)]">
              No matching commands or destinations found.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-3)]"
            >
              <Command.Item
                onSelect={() => handleSelect(() => navigate('/dashboard'))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)] font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[var(--heather)] text-[var(--accent)] flex items-center justify-center">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                  </div>
                  <span>Executive Dashboard</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-3)]">/dashboard</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => navigate('/scanner'))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)] font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[var(--heather)] text-[var(--accent)] flex items-center justify-center">
                    <ScanSearch className="w-3.5 h-3.5" />
                  </div>
                  <span>Single Product Scanner</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-3)]">/scanner</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => navigate('/comparisons'))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)] font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[var(--heather)] text-[var(--accent)] flex items-center justify-center">
                    <GitCompare className="w-3.5 h-3.5" />
                  </div>
                  <span>Comparison Studio</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-3)]">/comparisons</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => navigate('/assistant'))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)] font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[var(--heather)] text-[var(--accent)] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  </div>
                  <span>AI Shopping Assistant</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-3)]">/assistant</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => navigate('/settings'))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)] font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[var(--heather)] text-[var(--accent)] flex items-center justify-center">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <span>System Settings & API Keys</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-3)]">/settings</span>
              </Command.Item>
            </Command.Group>

            {/* Quick Actions Group */}
            <Command.Group
              heading="Quick Presets & Actions"
              className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-3)] mt-2"
            >
              <Command.Item
                onSelect={() => handleSelect(() => navigate('/comparisons?preset=jackets'))}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)]"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-3.5 h-3.5 text-[#12A36B]" />
                  <span>Compare Jackets: Kotty vs Tokyo Talkies</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[var(--text-3)]" />
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => navigate('/comparisons?preset=skincare'))}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)]"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-3.5 h-3.5 text-[#12A36B]" />
                  <span>Compare Skincare: Plum vs Cetaphil Face Wash</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[var(--text-3)]" />
              </Command.Item>

              <Command.Item
                onSelect={() =>
                  handleSelect(() =>
                    navigate(
                      '/scanner?url=https%3A%2F%2Fwww.flipkart.com%2Fkotty-full-sleeve-solid-women-jacket%2Fp%2Fitm12345'
                    )
                  )
                }
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[var(--ink)] cursor-pointer hover:bg-[var(--heather)]/40 transition-colors aria-selected:bg-[var(--heather)]/60 aria-selected:text-[var(--ink)]"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Inspect Sample Flipkart Listing (Kotty Jacket)</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[var(--text-3)]" />
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Guide */}
          <div className="px-4 py-2.5 bg-[#FDFCFE] border-t border-[#ECE8F2] flex items-center justify-between text-[11px] text-[var(--text-3)] font-mono">
            <span>Navigation shortcut</span>
            <div className="flex items-center gap-2">
              <span>↑↓ to navigate</span>
              <span>•</span>
              <span>↵ to open</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
};
