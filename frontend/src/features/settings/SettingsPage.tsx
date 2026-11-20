import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, UserCheck, Key, Server, Bell, Lock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl pb-12 animate-fadeIn">
      <div className="pb-2 border-b border-[var(--line)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#16131F] font-heading">
          Platform Settings
        </h1>
        <p className="text-xs text-[var(--text-3)] mt-1">
          Analyst profile, security controls, and backend connection configurations
        </p>
      </div>

      <div className="space-y-5">
        {/* User Profile Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
            <UserCheck className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[#16131F] font-heading">Analyst Profile</h3>
              <p className="text-xs text-[var(--text-3)]">Currently active session and identity details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[var(--text-3)] font-medium">Full Name</label>
              <p className="font-semibold text-[#16131F] mt-0.5">{user?.fullName || 'Active Analyst'}</p>
            </div>
            <div>
              <label className="text-[var(--text-3)] font-medium">Email Address</label>
              <p className="font-semibold text-[#16131F] mt-0.5">{user?.email || 'analyst@trustsphere.internal'}</p>
            </div>
            <div>
              <label className="text-[var(--text-3)] font-medium">Role Assignment</label>
              <p className="font-semibold text-[var(--accent)] mt-0.5">{user?.role || 'ANALYST'}</p>
            </div>
            <div>
              <label className="text-[var(--text-3)] font-medium">Account Identifier</label>
              <p className="font-mono text-[11px] text-[var(--text-3)] mt-0.5 truncate">{user?.id || 'Local-Session'}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="danger" size="sm" onClick={() => logout()}>
              Log Out Session
            </Button>
          </div>
        </Card>

        {/* Security & Authentication Info */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-semibold text-[#16131F] font-heading">Security & Token Policies</h3>
              <p className="text-xs text-[var(--text-3)]">JWT lifecycle and credential isolation</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#4A3F4B] leading-relaxed font-mono">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Session tokens are signed with HMAC-SHA256 and expire in 24 hours.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Passwords hashed with memory-hard Argon2id (64MB memory, 3 iterations).</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Strict separation between application runtime credentials and schema migration roles.</span>
            </div>
          </div>
        </Card>

        {/* System Notifications Configuration */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
            <Bell className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[#16131F] font-heading">Notification Preferences</h3>
              <p className="text-xs text-[var(--text-3)]">Configure real-time alerts for elevated anomalies</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded bg-[var(--canvas)] border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]" />
              <span className="text-[#4A3F4B]">Alert on Tier 3 Elevated Multimodal Anomalies</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded bg-[var(--canvas)] border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]" />
              <span className="text-[#4A3F4B]">Flag cross-platform pricing discrepancies exceeding 35%</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded bg-[var(--canvas)] border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]" />
              <span className="text-[#4A3F4B]">Daily anomaly digest summary</span>
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
};
