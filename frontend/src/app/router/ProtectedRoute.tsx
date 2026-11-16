import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-[#0D1B2A]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#3D7584] text-white flex items-center justify-center shadow-md animate-pulse">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3D7584]" />
            <span>Verifying session security...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
