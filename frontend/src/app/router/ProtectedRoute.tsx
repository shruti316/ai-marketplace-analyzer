import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F8EDF2] text-[#16131F]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#16131F] text-[#F0D9E4] flex items-center justify-center shadow-md border border-[rgba(193,160,172,0.35)] animate-pulse">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6F5B68]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6B2D5C]" />
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
