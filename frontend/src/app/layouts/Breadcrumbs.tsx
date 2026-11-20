import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Scanner',
  dashboard: 'Dashboard',
  scanner: 'Scanner',
  products: 'Product Intelligence',
  evidence: 'Evidence Explorer',
  comparisons: 'Comparisons',
  annotations: 'Annotation Studio',
  'model-insights': 'Model Insights',
  settings: 'Settings',
  investigate: 'Investigation Report',
  assistant: 'AI Assistant',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[var(--text-3)]">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:underline"
      >
        <Home className="w-3.5 h-3.5 text-[var(--text-3)]" />
        <span className="sr-only">Home</span>
      </Link>

      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[segment] || segment;

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-[#C1A0AC] shrink-0" />
            {isLast ? (
              <span className="font-semibold text-[#16131F] truncate max-w-[200px]" aria-current="page">
                {label}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-[var(--accent)] transition-colors truncate max-w-[150px] focus-visible:outline-none focus-visible:underline"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
