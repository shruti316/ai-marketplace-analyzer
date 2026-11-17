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
      {/* Standalone Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Main Application Layout */}
      <Route element={<AppLayout />}>
        {/* Open Consumer Hub & Intelligence Experiences */}
        <Route path="/" element={<InvestigationWorkspacePage />} />
        <Route path="/investigate" element={<InvestigationWorkspacePage />} />
        <Route path="/investigate/:id" element={<InvestigationDetailPage />} />
        <Route path="/products" element={<ProductIntelligencePage />} />
        <Route path="/comparisons" element={<ComparisonsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/evidence" element={<EvidenceExplorerPage />} />

        {/* Authenticated User & Analyst Routes */}
        <Route element={<ProtectedRoute />}>
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
