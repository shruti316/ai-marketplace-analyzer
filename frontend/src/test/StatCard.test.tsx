import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../components/common/StatCard';

describe('StatCard Component', () => {
  it('renders title, value, and subtitle correctly', () => {
    render(
      <StatCard
        title="Products In Catalog"
        value="2,657"
        subtitle="Canonical catalog baselines"
        badge={{ text: 'Historical', variant: 'teal' }}
      />
    );

    expect(screen.getByText('Products In Catalog')).toBeInTheDocument();
    expect(screen.getByText('2,657')).toBeInTheDocument();
    expect(screen.getByText('Canonical catalog baselines')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
  });

  it('renders skeleton placeholders when isLoading is true', () => {
    const { container } = render(
      <StatCard
        title="Elevated Anomalies"
        value="7.2%"
        isLoading={true}
      />
    );

    expect(screen.getByText('Elevated Anomalies')).toBeInTheDocument();
    expect(screen.queryByText('7.2%')).not.toBeInTheDocument();
    // Verify pulse/shimmer skeleton element is present
    expect(container.querySelector('.animate-pulse, .animate-shimmer')).toBeInTheDocument();
  });
});
