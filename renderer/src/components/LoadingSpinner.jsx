// renderer/src/components/LoadingSpinner.jsx
// Example component extracted as template for future extractions

import React from 'react';

/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner with customizable size and color.
 * This serves as an example of how components should be extracted
 * from the monolithic renderer_umd.js file.
 * 
 * @param {Object} props - Component props
 * @param {'small'|'medium'|'large'} props.size - Spinner size
 * @param {string} props.color - Spinner color (hex or CSS color)
 * @param {string} props.message - Optional loading message
 */
export function LoadingSpinner({ 
  size = 'medium', 
  color = '#3b82f6', 
  message = '' 
}) {
  const sizes = {
    small: { width: 20, height: 20, border: 2 },
    medium: { width: 40, height: 40, border: 3 },
    large: { width: 60, height: 60, border: 4 }
  };
  
  const { width, height, border } = sizes[size] || sizes.medium;
  
  const spinnerStyle = {
    width: `${width}px`,
    height: `${height}px`,
    border: `${border}px solid rgba(0, 0, 0, 0.1)`,
    borderTop: `${border}px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };
  
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  };
  
  return (
    <div style={containerStyle} data-testid="loading-spinner">
      <div style={spinnerStyle} />
      {message && (
        <div style={{ fontSize: '14px', color: '#666' }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default LoadingSpinner;
