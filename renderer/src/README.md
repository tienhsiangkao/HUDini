# Frontend Source Structure

This directory contains the modular React application source code.

## Directory Structure

```
renderer/src/
├── main.jsx              # Entry point (future)
├── components/           # React components
│   └── LoadingSpinner.jsx  # Example extracted component
├── hooks/                # Custom React hooks
└── utils/                # Utility functions
```

## Development

**Start development server:**
```bash
npm run dev
```
Server runs at http://localhost:3000 with hot module replacement.

**Build for production:**
```bash
npm run build
```
Outputs UMD bundle to `renderer/renderer_umd.js` (Electron-compatible).

**Run frontend tests:**
```bash
npm run test:frontend
```

**Run all tests:**
```bash
npm test
```

## Migration Status

🚧 **Infrastructure Setup Complete** ✅
- ✅ Vite build system configured
- ✅ Vitest testing framework configured
- ✅ React Testing Library installed
- ✅ Directory structure created
- ✅ Example component + test created

📦 **Extraction Progress: 0%**
- ⏳ Main monolith: `renderer/renderer_umd.js` (15,614 lines)
- ✅ Example extracted: `LoadingSpinner.jsx` (56 lines)
- 🎯 Goal: Extract all components, hooks, and utilities

## Next Steps

1. **Extract utilities** (Phase 1)
   - Toast functions → `utils/toast.js`
   - CSV formatter → `utils/csv.js`
   - Overlay functions → `utils/overlay.js`

2. **Extract UI components** (Phase 2)
   - LoadingSpinner ✅
   - ProgressBar
   - SkeletonLoader
   - SuccessCheckmark
   - Button, Input, Modal, etc.

3. **Extract custom hooks** (Phase 3)
   - usePanelTransition
   - useFilters
   - useHandData
   - useStats

4. **Extract business logic components** (Phase 4)
   - Dashboard
   - HandsList
   - PlayerStats
   - Import
   - Settings

5. **Complete migration** (Phase 5)
   - Remove old `renderer_umd.js`
   - Update `index.html` to use new build
   - Verify all functionality

## Component Guidelines

**File naming:**
- PascalCase for components: `LoadingSpinner.jsx`
- camelCase for utilities: `formatCsv.js`
- camelCase for hooks: `usePanelTransition.js`

**Component structure:**
```jsx
// Component description
import React from 'react';

/**
 * Component documentation
 * @param {Object} props
 * @param {string} props.example - Prop description
 */
export function MyComponent({ example }) {
  // Component implementation
  return <div>{example}</div>;
}

export default MyComponent;
```

**Test structure:**
```jsx
/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../path/to/MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent example="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## Path Aliases

Use path aliases for cleaner imports:

```jsx
import MyComponent from '@components/MyComponent';
import useMyHook from '@hooks/useMyHook';
import { formatData } from '@utils/formatters';
```

Available aliases:
- `@` → `renderer/src/`
- `@components` → `renderer/src/components/`
- `@hooks` → `renderer/src/hooks/`
- `@utils` → `renderer/src/utils/`

## Testing

**Frontend tests use jsdom environment:**
```jsx
/**
 * @vitest-environment jsdom
 */
```

**Backend tests use Node environment** (default).

**Run specific test file:**
```bash
npm test -- LoadingSpinner.test.jsx
```

**Run with coverage:**
```bash
npm run test:coverage
```

## Build Process

**Development:**
- Vite dev server with HMR
- Fast refresh for React components
- Source maps enabled

**Production:**
- UMD bundle for Electron compatibility
- Externalizes React (loaded from vendor/)
- Source maps for debugging
- No minification (Electron internal use)

## Electron Integration

The build outputs a UMD bundle that:
- Exposes `RendererApp` global
- Uses external React from `vendor/react.production.min.js`
- Maintains compatibility with existing `index.html`
- Works with Electron IPC system

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [React Documentation](https://react.dev/)
