// tests/frontend/LoadingSpinner.test.jsx
/**
 * @vitest-environment jsdom
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../../renderer/src/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  test('renders spinner', () => {
    render(<LoadingSpinner />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
  
  test('renders with message', () => {
    render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });
  
  test('renders without message by default', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });
  
  test('applies size prop', () => {
    const { container } = render(<LoadingSpinner size="small" />);
    // Get the actual spinner (second div child)
    const spinner = container.querySelector('[data-testid="loading-spinner"] > div');
    // Check that style attribute contains size values
    const style = spinner.getAttribute('style');
    expect(style).toContain('width: 20px');
    expect(style).toContain('height: 20px');
  });
  
  test('applies custom color', () => {
    const { container } = render(<LoadingSpinner color="#ff0000" />);
    // Get the actual spinner (second div child)
    const spinner = container.querySelector('[data-testid="loading-spinner"] > div');
    // Check that style attribute contains the red color
    const style = spinner.getAttribute('style');
    expect(style).toContain('rgb(255, 0, 0)');
  });
});
