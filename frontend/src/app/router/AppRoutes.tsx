import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../../features/auth/LoginPage';
import { InvestigationWorkspacePage } from '../../features/investigation/InvestigationWorkspacePage';
import { InvestigationDetailPage } from '../../features/investigation/InvestigationDetailPage';
import { InvestigationsHistoryPage } from '../../features/investigation/InvestigationsHistoryPage';
import { OverviewPage } from '../../features/dashboard/OverviewPage';
import { ProductIntelligencePage } from '../../features/products/ProductIntelligencePage';
import { EvidenceExplorerPage } from '../../features/evidence/EvidenceExplorerPage';
import { ComparisonsPage } from '../../features/comparisons/ComparisonsPage';
import { AnnotationStudioPage } from '../../features/annotations/AnnotationStudioPage';
import { ModelInsightsPage } from '../../features/model-insights/ModelInsightsPage';
import { AssistantPage } from '../../features/assistant/AssistantPage';
import { SettingsPage } from '../../features/settings/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Enterprise Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Primary Investigation Entry Point */}
          <Route path="/" element={<InvestigationWorkspacePage />} />
          <Route path="/investigate/:id" element={<InvestigationDetailPage />} />
          <Route path="/investigations" element={<InvestigationsHistoryPage />} />

          {/* Core Product & Intelligence Workflows */}
          <Route path="/products" element={<ProductIntelligencePage />} />
          <Route path="/evidence" element={<EvidenceExplorerPage />} />
          <Route path="/comparisons" element={<ComparisonsPage />} />

          {/* TrustSphere AI Assistant */}
          <Route path="/assistant" element={<AssistantPage />} />

          {/* Model Insights & Human Annotation Studio */}
          <Route path="/model-insights" element={<ModelInsightsPage />} />
          <Route path="/annotations" element={<AnnotationStudioPage />} />

          {/* Platform Overview (Secondary) & Settings */}
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
