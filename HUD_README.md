# Poker HUD Overlay System

## Overview

This is a real-time Heads-Up Display (HUD) system for poker tables that overlays player statistics directly on the poker client interface. It's designed to compete with Hand2Note and other poker HUDs.

## Features

### ✅ Implemented
- **Transparent Overlay Windows**: Always-on-top transparent windows that overlay poker tables
- **Real-time Statistics**: VPIP, PFR, 3Bet, WTSD, WWSF, AFq, and more
- **Player Detection**: Automatic detection of poker tables and players
- **Statistics Database**: Integration with existing SQLite database
- **HUD Controls**: Toggle HUD on/off from main application
- **Position-based Stats**: Different statistics for different table positions
- **Color-coded Stats**: Visual indicators for tight/loose/aggressive players

### 🚧 In Development
- **Advanced Table Detection**: Image recognition for better table detection
- **Custom HUD Layouts**: User-configurable HUD positioning and styling
- **Popup Statistics**: Detailed popups on hover/click
- **Multi-table Support**: Handle multiple poker tables simultaneously

## Architecture

### Core Components

1. **HUDOverlay Class** (`hud-overlay.js`)
   - Manages overlay windows
   - Handles table detection
   - Updates player statistics
   - Controls HUD lifecycle

2. **HUD Window** (`hud-window.html`)
   - Transparent overlay interface
   - Player statistics display
   - Real-time updates via IPC

3. **Main Process Integration** (`electron-main.cjs`)
   - IPC handlers for HUD control
   - Database integration
   - Window management

4. **UI Controls** (`renderer/index.html`, `renderer/renderer_umd.js`)
   - HUD toggle button
   - Status indicators
   - User interface integration

### Data Flow

```
Poker Table → Table Detection → HUD Overlay → Player Stats → Database Query → Statistics Display
```

## Usage

### Starting the HUD

1. **From Main Application**:
   - Click the "HUD: OFF" button in the header
   - Button will change to "HUD: ON" when active
   - Overlay windows will appear on detected poker tables

2. **Programmatically**:
   ```javascript
   const hud = new HUDOverlay();
   await hud.startHUD();
   ```

### HUD Controls

- **Toggle**: Click the HUD button to turn on/off
- **Hide**: Use the hide button on overlay windows
- **Position**: HUDs are positioned around the table based on seat numbers

### Statistics Displayed

- **VPIP**: Voluntarily Put Money In Pot
- **PFR**: Pre-Flop Raise percentage
- **3Bet**: Three-bet percentage
- **WTSD**: Went to Showdown
- **WWSF**: Won When Saw Flop
- **AFq**: Aggression Factor

## Configuration

### Table Detection

Currently uses mock detection for development. Real implementation would include:

- Window title detection
- Image recognition
- Screen capture analysis
- Process monitoring

### Player Statistics

Statistics are calculated from the existing database using the `metrics_core.js` module:

- Real-time calculation from hand histories
- Position-based statistics
- Confidence levels based on sample size
- Hero vs opponent tracking

## Development

### Testing

Run the test script:
```bash
node test-hud.js
```

### Adding New Statistics

1. Add to `createCounterStruct()` in `lib/metrics_core.js`
2. Update the HUD display in `hud-window.html`
3. Add calculation logic in `aggregatePlayers()`

### Customizing HUD Appearance

Edit the CSS in `hud-window.html`:
- Player HUD positioning
- Color schemes
- Font sizes
- Border styles

## Future Enhancements

### Phase 2: Advanced Features
- **Custom HUD Editor**: Drag-and-drop HUD designer
- **Advanced Statistics**: ICM, tournament stats, range analysis
- **Popup System**: Detailed statistics on hover
- **Export/Import**: Save and share HUD configurations

### Phase 3: Competitive Features
- **Multi-site Support**: PokerStars, GG Poker, etc.
- **Real-time Updates**: Live hand processing
- **Session Tracking**: Win/loss tracking
- **Leak Detection**: Identify playing mistakes

## Technical Notes

### Dependencies
- `screenshot-desktop`: Screen capture for table detection
- `robotjs`: Desktop automation (optional)
- `better-sqlite3`: Database integration
- `electron`: Desktop application framework

### Performance Considerations
- Overlay windows are lightweight and transparent
- Statistics are cached and updated incrementally
- Screen capture is optimized for minimal CPU usage
- Database queries are indexed for fast retrieval

### Security
- No data is sent to external servers
- All statistics are calculated locally
- Hand histories are processed in real-time
- No network communication required

## Troubleshooting

### Common Issues

1. **HUD Not Appearing**
   - Check if poker client is running
   - Verify table detection is working
   - Check console for errors

2. **Statistics Not Updating**
   - Ensure database has recent hand data
   - Check IPC communication between processes
   - Verify player name matching

3. **Performance Issues**
   - Reduce table detection frequency
   - Optimize database queries
   - Check for memory leaks

### Debug Mode

Enable debug logging:
```javascript
const hud = new HUDOverlay();
hud.debug = true;
```

## License

This HUD system is part of the poker parser project and follows the same licensing terms.
