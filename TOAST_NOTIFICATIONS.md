# Toast Notification System

**Status**: ✅ Complete  
**Completion Date**: October 23, 2025  
**Feature #**: 10

## Overview

A professional, non-intrusive toast notification system that provides visual feedback for user actions throughout the application. Toasts appear in the top-right corner with smooth animations, auto-dismiss functionality, and support for multiple simultaneous notifications.

## Features

### Core Functionality
- ✅ **4 Toast Types**: Success (green), Error (red), Warning (orange), Info (blue)
- ✅ **Auto-dismiss**: Configurable duration (default 3 seconds)
- ✅ **Manual Dismiss**: Click anywhere on toast to close
- ✅ **Smooth Animations**: Slide-in from right, slide-out on dismiss
- ✅ **Multiple Toasts**: Stack vertically with proper spacing
- ✅ **Theme Aware**: Works perfectly in both light and dark modes
- ✅ **Loading State**: Special loading indicator with spin animation
- ✅ **Progress Bar**: Optional progress indicator for long operations
- ✅ **Action Buttons**: Add clickable actions to toasts

### Visual Design
- **Position**: Top-right corner (20px from top and right)
- **Size**: Min 280px, Max 420px width
- **Spacing**: 8px vertical gap between toasts
- **Z-Index**: 10000 (appears above all other content)
- **Colors**:
  - Success: `#22c55e` (green)
  - Error: `#ef4444` (red)
  - Warning: `#f59e0b` (orange)
  - Info: `#3b82f6` (blue)
  - Loading: `#8b5cf6` (purple)

### Animation Details
```css
@keyframes slideIn {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(400px); opacity: 0; }
}
```

## Implementation

### Core Functions

#### `showToast(message, type, duration, options)`
Main function to display a toast notification.

**Parameters**:
- `message` (string): The text to display
- `type` (string): 'success', 'error', 'warning', 'info', or 'loading' (default: 'info')
- `duration` (number): Auto-dismiss time in milliseconds (default: 3000, set to 0 or negative for persistent)
- `options` (object): Optional configuration
  - `id`: Unique identifier for updating the toast
  - `progress`: Number 0-100 to show progress bar
  - `actions`: Array of action buttons `[{ id, label, onClick }]`

**Returns**: Toast DOM element with `__id` property

**Examples**:
```javascript
// Simple success message
window.__toast('Data saved successfully!', 'success');

// Warning with custom duration
window.__toast('Connection unstable', 'warning', 5000);

// Loading toast with progress
const toastId = Date.now();
window.__toast('Processing...', 'loading', 0, { 
  id: toastId, 
  progress: 0 
});

// Toast with action buttons
window.__toast('Export failed', 'error', 0, {
  actions: [
    { id: 'retry', label: 'Retry', onClick: () => retryExport() },
    { id: 'cancel', label: 'Cancel', onClick: () => cancelExport() }
  ]
});
```

#### `updateToast(toastId, updates)`
Update an existing toast (useful for progress updates).

**Parameters**:
- `toastId`: The ID of the toast to update
- `updates` (object):
  - `message`: New message text
  - `progress`: New progress value (0-100)
  - `type`: Change toast type/color

**Example**:
```javascript
const toastId = Date.now();
window.__toast('Uploading...', 'loading', 0, { id: toastId, progress: 0 });

// Update progress
window.__updateToast(toastId, { progress: 50 });

// Complete
window.__updateToast(toastId, { 
  message: 'Upload complete!', 
  type: 'success',
  progress: 100 
});
```

#### `removeToast(toast)`
Manually dismiss a toast.

**Parameters**:
- `toast`: The toast DOM element to remove

**Example**:
```javascript
const toast = window.__toast('Persistent message', 'info', 0);
// Later...
window.__removeToast(toast);
```

## Integration Points

The toast system is already integrated throughout the application:

### 1. **Dashboard Widgets**
- ✅ Widget added/shown: Success toast
- ✅ Widget hidden: Info toast  
- ✅ Widget order changed: Success toast on drag end

```javascript
window.__toast('✓ Widget added', 'success', 1500);
```

### 2. **Theme Toggle**
- ✅ Dark mode activated: "🌙 Dark mode activated"
- ✅ Light mode activated: "☀️ Light mode activated"

```javascript
window.__toast(`${icon} ${label} mode activated`, 'info', 2000);
```

### 3. **Session Management**
- ✅ Tag added: Success toast with tag name
- ✅ Tag removed: Info toast with tag name

```javascript
window.__toast(`Tag ${action}: ${tag}`, action === 'added' ? 'success' : 'info', 2000);
```

### 4. **Filter Presets**
- ✅ Preset saved: "✓ Saved preset: [name]"
- ✅ Preset deleted: "Deleted preset: [name]"
- ✅ Preset applied: "Applied: [name]"
- ⚠️ Validation warning: "Please enter a preset name"

```javascript
window.__toast(`✓ Saved preset: ${newPreset.name}`, 'success', 3000);
```

### 5. **Graph Export**
- ✅ PNG export success: "✓ Graph exported as PNG"

```javascript
showToast('✓ Graph exported as PNG', 'success', 2000);
```

### 6. **Reports**
- ✅ Report generated: "Report generated successfully"
- ✅ Report saved: "Report '[name]' saved!"
- ✅ Report loaded: "Loaded '[name]'"
- ✅ Report deleted: "Report deleted"
- ⚠️ CSV export success/fail

### 7. **Stats Table**
- ✅ Copy to clipboard: "Stats copied to clipboard!"
- ❌ Copy failed: "Failed to copy stats"

### 8. **Panel Collapsing**
- ✅ All collapsed: "📦 All panels collapsed"
- ✅ All expanded: "📂 All panels expanded"

### 9. **Player Notes**
- ✅ Notes saved: "Notes saved"
- ❌ Save failed: "Failed to save notes"

### 10. **Error Handling**
- ❌ Global errors: Custom error message with retry action

```javascript
window.__toast(errorMessage, 'error', 5000, {
  actions: [
    { id: 'retry', label: 'Retry', onClick: () => window.location.reload() }
  ]
});
```

## Technical Implementation

### File Structure
All toast functionality is in `renderer/renderer_umd.js`:

1. **Lines 5-130**: Core toast functions
   - `showToast()` - Main display function
   - `removeToast()` - Dismiss function
   - `updateToast()` - Update function
   - Icon and color mappings

2. **Lines 200-255**: Toast container setup
   - `createToastContainer()` - DOM setup
   - CSS animation definitions
   - Global function exposure

3. **Lines 256-258**: Global API
   ```javascript
   window.__toast = showToast;
   window.__updateToast = updateToast;
   window.__removeToast = removeToast;
   ```

### Container Structure
```html
<div id="toast-container" style="position: fixed; top: 20px; right: 20px; z-index: 10000;">
  <div class="toast toast-success" style="...">
    <span>✓</span>
    <span>Widget added</span>
  </div>
  <div class="toast toast-info" style="...">
    <span>ℹ</span>
    <span>Theme changed</span>
  </div>
</div>
```

## Usage Guidelines

### Best Practices

1. **Keep Messages Concise**
   - ✅ "Filter saved"
   - ❌ "Your custom filter has been successfully saved to the database"

2. **Use Appropriate Types**
   - Success: Confirmations of completed actions
   - Error: Failed operations requiring attention
   - Warning: Cautions, validation messages
   - Info: FYI messages, state changes
   - Loading: Long-running operations

3. **Set Appropriate Durations**
   - Success: 1500-2000ms (quick confirmation)
   - Info: 2000-3000ms (standard)
   - Warning: 3000-4000ms (needs attention)
   - Error: 4000-5000ms (critical, or 0 for persistent)
   - Loading: 0 (persistent until complete)

4. **Use Action Buttons Sparingly**
   - Only for errors that have clear recovery actions
   - Keep button labels short (1-2 words)
   - Max 2 action buttons per toast

5. **Progress Bars for Long Operations**
   ```javascript
   const toastId = Date.now();
   window.__toast('Importing hands...', 'loading', 0, { id: toastId, progress: 0 });
   
   // Update as operation progresses
   window.__updateToast(toastId, { progress: 25 });
   window.__updateToast(toastId, { progress: 50 });
   window.__updateToast(toastId, { progress: 75 });
   
   // Complete
   window.__updateToast(toastId, { 
     message: 'Import complete!', 
     type: 'success',
     progress: 100 
   });
   
   // Auto-dismiss after 2 seconds
   setTimeout(() => window.__removeToast(toast), 2000);
   ```

## Testing

### Manual Testing Checklist
- ✅ Theme toggle shows appropriate toast in both modes
- ✅ Dashboard widget add/remove/reorder shows toasts
- ✅ Session tag add/remove shows toasts
- ✅ Filter preset save/delete/apply shows toasts
- ✅ Report save/load/delete shows toasts
- ✅ Graph export shows success toast
- ✅ CSV export shows success/error toasts
- ✅ Stats copy shows success/error toasts
- ✅ Panel collapse/expand shows toasts
- ✅ Multiple toasts stack properly
- ✅ Toasts auto-dismiss after specified duration
- ✅ Clicking toast dismisses it manually
- ✅ Toasts work in both light and dark themes
- ✅ Long messages wrap properly
- ✅ Icons display correctly for each type

### Testing in Console
```javascript
// Test each type
window.__toast('Success message', 'success');
window.__toast('Error message', 'error');
window.__toast('Warning message', 'warning');
window.__toast('Info message', 'info');
window.__toast('Loading...', 'loading');

// Test multiple toasts
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    window.__toast(`Toast ${i + 1}`, 'info', 2000);
  }, i * 200);
}

// Test progress update
const id = Date.now();
window.__toast('Processing...', 'loading', 0, { id, progress: 0 });
let progress = 0;
const interval = setInterval(() => {
  progress += 10;
  window.__updateToast(id, { progress });
  if (progress >= 100) {
    clearInterval(interval);
    window.__updateToast(id, { message: 'Complete!', type: 'success' });
  }
}, 500);

// Test action buttons
window.__toast('Action required', 'warning', 0, {
  actions: [
    { id: 'ok', label: 'OK', onClick: () => console.log('OK clicked') },
    { id: 'cancel', label: 'Cancel', onClick: () => console.log('Cancel clicked') }
  ]
});
```

## Future Enhancements

Potential improvements for future versions:

1. **Sound Effects**: Optional audio cues for different toast types
2. **Position Options**: Allow top-left, bottom-right, bottom-left positioning
3. **Custom Icons**: Support for custom emoji or SVG icons
4. **Grouping**: Collapse multiple similar toasts into one with a count
5. **Undo Actions**: Built-in undo functionality for reversible operations
6. **Rich Content**: Support for HTML content, images, or formatting
7. **Priority System**: Important toasts stay on top
8. **Persistence**: Remember dismissed toasts in session
9. **Rate Limiting**: Prevent toast spam by queuing or merging

## Summary

The Toast Notification System is a complete, production-ready feature that enhances user experience across the entire application. It provides:

- **Professional UX**: Smooth animations, appropriate colors, clear messaging
- **Developer-Friendly API**: Simple `window.__toast()` function, flexible options
- **Comprehensive Coverage**: 20+ integration points across all major features
- **Theme Support**: Works seamlessly in both light and dark modes
- **Performance**: Lightweight, no external dependencies, minimal DOM impact

**Lines of Code**: ~250 lines (toast system + animations)  
**Integration Points**: 20+ throughout the application  
**Toast Types**: 5 (success, error, warning, info, loading)  
**Animation Types**: 7 (slideIn, slideOut, fadeIn, chipSlide, pulse, cardFlip, cardDeal, chipToPot)

The system is now being used to provide feedback for theme changes, widget customization, session tagging, and all other user actions, creating a cohesive and polished user experience.
