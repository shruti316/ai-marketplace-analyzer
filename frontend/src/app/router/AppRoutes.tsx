import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../../features/auth/LoginPage';
import { InvestigationWorkspacePage } from '../../features/investigation/InvestigationWorkspacePage';
import { InvestigationDetailPage } from '../../features/investigation/InvestigationDetailPage';
import { InvestigationsHistoryPage } from '../../features/investigation/InvestigationsHistoryPage';
import { OverviewPage } from '../../features/dashboard/OverviewPage';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { ProductIntelligencePage } from '../../features/products/ProductIntelligencePage';
import { EvidenceExplorerPage } from '../../features/evidence/EvidenceExplorerPage';
import { ComparisonsPage } from '../../features/comparisons/ComparisonsPage';
import { AnnotationStudioPage } from '../../features/annotations/AnnotationStudioPage';
import { ModelInsightsPage } from '../../features/model-insights/ModelInsightsPage';
import { AssistantPage } from '../../features/assistant/AssistantPage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

const RootIndexRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F8EDF2]">
        <Loader2 className="w-6 h-6 animate-spin text-[#6B2D5C]" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Entry Point: Authenticated -> /dashboard, Unauthenticated -> /login */}
      <Route path="/" element={<RootIndexRedirect />} />

      {/* Standalone Authentication Routes */}
      <Route path="/login" element={<LoginPage defaultMode="signin" />} />
      <Route path="/register" element={<LoginPage defaultMode="register" />} />
      <Route path="/signup" element={<LoginPage defaultMode="register" />} />

      {/* Protected Main Application Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/scanner" element={<InvestigationWorkspacePage />} />
          <Route path="/investigate" element={<InvestigationWorkspacePage />} />
          <Route path="/investigate/:id" element={<InvestigationDetailPage />} />
          <Route path="/products" element={<ProductIntelligencePage />} />
          <Route path="/comparisons" element={<ComparisonsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/evidence" element={<EvidenceExplorerPage />} />
          <Route path="/investigations" element={<InvestigationsHistoryPage />} />
          <Route path="/model-insights" element={<ModelInsightsPage />} />
          <Route path="/annotations" element={<AnnotationStudioPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
