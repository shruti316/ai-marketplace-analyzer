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
  it('renders all required 4 core navigation sections', () => {
    renderAppLayout();

    // Verify all 4 navigation items:
    // 1. Scanner, 2. Comparisons, 3. AI Assistant, 4. Settings
    expect(screen.getAllByText('Scanner')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Comparisons')[0]).toBeInTheDocument();
    expect(screen.getAllByText('AI Assistant')[0]).toBeInTheDocument();
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
