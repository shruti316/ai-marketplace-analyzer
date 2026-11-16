import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, UserCheck, Key, Server, Bell, Lock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A]">
          Platform Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Analyst profile, security controls, and backend connection configurations
        </p>
      </div>

      <div className="space-y-5">
        {/* User Profile Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <UserCheck className="w-5 h-5 text-[#3D7584]" />
            <div>
              <h3 className="text-sm font-semibold text-[#0D1B2A]">Analyst Profile</h3>
              <p className="text-xs text-slate-500">Currently active session and identity details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-500 font-medium">Full Name</label>
              <p className="font-semibold text-slate-800 mt-0.5">{user?.fullName || 'Active Analyst'}</p>
            </div>
            <div>
              <label className="text-slate-500 font-medium">Email Address</label>
              <p className="font-semibold text-slate-800 mt-0.5">{user?.email || 'analyst@trustsphere.internal'}</p>
            </div>
            <div>
              <label className="text-slate-500 font-medium">Role Assignment</label>
              <p className="font-semibold text-[#3D7584] mt-0.5">{user?.role || 'ANALYST'}</p>
            </div>
            <div>
              <label className="text-slate-500 font-medium">Account Identifier</label>
              <p className="font-mono text-[11px] text-slate-500 mt-0.5 truncate">{user?.id || 'Local-Session'}</p>
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
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-[#4D7C5B]" />
            <div>
              <h3 className="text-sm font-semibold text-[#0D1B2A]">Security & Token Policies</h3>
              <p className="text-xs text-slate-500">JWT lifecycle and credential isolation</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#89BBBE]" />
              <span>Session tokens are signed with HMAC-SHA256 and expire in 24 hours.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C67D3B]" />
              <span>Passwords hashed with memory-hard Argon2id (64MB memory, 3 iterations).</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#3D7584]" />
              <span>Strict separation between application runtime credentials and schema migration roles.</span>
            </div>
          </div>
        </Card>

        {/* System Notifications Configuration */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-[#B8B2D8]" />
            <div>
              <h3 className="text-sm font-semibold text-[#0D1B2A]">Notification Preferences</h3>
              <p className="text-xs text-slate-500">Configure real-time alerts for elevated anomalies</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#3D7584] focus:ring-[#3D7584]" />
              <span className="text-slate-700">Alert on Tier 3 Elevated Multimodal Anomalies</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#3D7584] focus:ring-[#3D7584]" />
              <span className="text-slate-700">Flag cross-platform pricing discrepancies exceeding 35%</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-[#3D7584] focus:ring-[#3D7584]" />
              <span className="text-slate-700">Daily anomaly digest summary</span>
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
};
