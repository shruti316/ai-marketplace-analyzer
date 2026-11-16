import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AppLayout } from '../app/layouts/AppLayout';
import { QueryProvider } from '../app/providers/QueryProvider';
import { AuthProvider } from '../app/providers/AuthProvider';

function renderAppLayout() {
  return render(
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

describe('AppLayout Shell', () => {
  it('renders all required 7 enterprise navigation sections', () => {
    renderAppLayout();

    // Verify all 7 navigation items from section 4 of the specification:
    // 1. Overview, 2. Product Intelligence, 3. Evidence Explorer, 4. Comparisons,
    // 5. Annotation Studio, 6. Model Insights, 7. Settings
    expect(screen.getAllByText('Overview')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Product Intelligence')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Evidence Explorer')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Comparisons')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Annotation Studio')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Model Insights')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
  });

  it('toggles sidebar collapse state on button click', async () => {
    const user = userEvent.setup();
    renderAppLayout();

    const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(collapseButton).toBeInTheDocument();

    await user.click(collapseButton);
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
