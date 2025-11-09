// screen_scraper.cjs - Screen capture and OCR for GGPoker tables
const { desktopCapturer, screen } = require('electron');
const { execSync } = require('child_process');

class ScreenScraper {
  constructor() {
    this.captureInterval = null;
    this.captureFrequency = 1000; // Capture every 1 second
    this.trackedTables = new Map(); // tableId -> window info
    this.onTableDataCallback = null;
  }

  /**
   * Start monitoring GGPoker table windows
   */
  async start() {
    console.log('[Screen Scraper] Starting table monitoring...');
    
    // Initial detection
    await this.detectAndCaptureTables();
    
    // Periodic capture
    this.captureInterval = setInterval(async () => {
      await this.detectAndCaptureTables();
    }, this.captureFrequency);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    console.log('[Screen Scraper] Stopped table monitoring');
  }

  /**
   * Set callback for when table data is extracted
   */
  setCallback(callback) {
    this.onTableDataCallback = callback;
  }

  /**
   * Detect GGPoker table windows using PowerShell
   */
  async detectPokerWindows() {
    try {
      const psCommand = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
              public int Left;
              public int Top;
              public int Right;
              public int Bottom;
            }
          }
"@

        Get-Process | Where-Object {
          $_.MainWindowTitle -ne '' -and
          ($_.MainWindowTitle -match 'Rush & Cash|Hold''?em|\\$[\\d.]+\\s*\\/\\s*\\$[\\d.]+|GGPoker')
        } | ForEach-Object {
          $rect = New-Object Win32+RECT
          $handle = $_.MainWindowHandle
          $visible = [Win32]::IsWindowVisible($handle)
          [Win32]::GetWindowRect($handle, [ref]$rect) | Out-Null
          
          [PSCustomObject]@{
            Title = $_.MainWindowTitle
            Handle = $handle.ToInt64()
            ProcessName = $_.ProcessName
            X = $rect.Left
            Y = $rect.Top
            Width = $rect.Right - $rect.Left
            Height = $rect.Bottom - $rect.Top
            Visible = $visible
          }
        } | ConvertTo-Json -Compress
      `.replace(/\n/g, ' ');

      const output = execSync(`powershell -Command "${psCommand}"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      }).trim();

      if (!output) return [];

      // Parse JSON output (could be single object or array)
      let windows = [];
      try {
        const parsed = JSON.parse(output);
        windows = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error('[Screen Scraper] Failed to parse window data:', e.message);
        return [];
      }

      // Filter for valid poker windows
      return windows.filter(w => 
        w.Visible && 
        w.Width > 400 && 
        w.Height > 300 &&
        w.Title
      );

    } catch (error) {
      console.error('[Screen Scraper] Error detecting windows:', error.message);
      return [];
    }
  }

  /**
   * Detect tables and capture their screens
   */
  async detectAndCaptureTables() {
    try {
      const windows = await this.detectPokerWindows();
      
      if (windows.length === 0) {
        // Clear tracked tables if no windows found
        if (this.trackedTables.size > 0) {
          this.trackedTables.clear();
          console.log('[Screen Scraper] No poker windows found');
        }
        return;
      }

      for (const window of windows) {
        const tableId = `table_${window.Handle}`;
        
        // Update or add table info
        this.trackedTables.set(tableId, {
          title: window.Title,
          handle: window.Handle,
          bounds: {
            x: window.X,
            y: window.Y,
            width: window.Width,
            height: window.Height
          },
          lastCapture: Date.now()
        });

        // Capture the window
        await this.captureTable(tableId, window);
      }

      // Remove stale tables (not seen in 5 seconds)
      const now = Date.now();
      for (const [tableId, info] of this.trackedTables.entries()) {
        if (now - info.lastCapture > 5000) {
          this.trackedTables.delete(tableId);
          console.log(`[Screen Scraper] Removed stale table: ${tableId}`);
        }
      }

    } catch (error) {
      console.error('[Screen Scraper] Error in detectAndCaptureTables:', error);
    }
  }

  /**
   * Capture a specific table window
   */
  async captureTable(tableId, windowInfo) {
    try {
      // Get all desktop sources
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: {
          width: windowInfo.Width,
          height: windowInfo.Height
        }
      });

      // Find matching source by window title
      const source = sources.find(s => 
        s.name === windowInfo.Title ||
        s.name.includes(windowInfo.Title.substring(0, 20))
      );

      if (!source) {
        // console.log(`[Screen Scraper] Source not found for: ${windowInfo.Title}`);
        return;
      }

      // Get thumbnail as data URL
      const thumbnail = source.thumbnail;
      const imageDataURL = thumbnail.toDataURL();

      // Extract table data from image
      await this.extractTableData(tableId, imageDataURL, windowInfo);

    } catch (error) {
      console.error(`[Screen Scraper] Error capturing table ${tableId}:`, error.message);
    }
  }

  /**
   * Extract poker table data from captured image
   * This is where OCR and image analysis happens
   */
  async extractTableData(tableId, imageDataURL, windowInfo) {
    try {
      // TODO: Implement OCR and pattern recognition
      // For now, we'll create the structure for extracted data
      
      const tableData = {
        tableId,
        timestamp: Date.now(),
        windowTitle: windowInfo.Title,
        bounds: windowInfo.bounds,
        
        // Table info (to be extracted)
        tableName: this.extractTableNameFromTitle(windowInfo.Title),
        stakes: this.extractStakesFromTitle(windowInfo.Title),
        gameType: this.extractGameType(windowInfo.Title),
        
        // Player data (to be extracted via OCR)
        players: [], // Will contain: { seat, name, stack, position, isHero }
        
        // Action data (to be extracted)
        currentAction: null, // { player, action, amount }
        pot: null,
        board: [],
        
        // Raw image for debugging
        imageDataURL: imageDataURL.substring(0, 100) + '...' // Truncate for logging
      };

      // Log captured data
      console.log(`[Screen Scraper] Captured ${tableId}: ${tableData.tableName} (${tableData.stakes})`);

      // Call callback if set
      if (this.onTableDataCallback) {
        this.onTableDataCallback(tableData);
      }

      return tableData;

    } catch (error) {
      console.error(`[Screen Scraper] Error extracting data from ${tableId}:`, error.message);
    }
  }

  /**
   * Extract table name from window title
   */
  extractTableNameFromTitle(title) {
    // Examples: "Rush & Cash - $0.01 / $0.02", "Hold'em Table #123"
    const match = title.match(/^([^-$]+)/);
    return match ? match[1].trim() : 'Unknown Table';
  }

  /**
   * Extract stakes from window title
   */
  extractStakesFromTitle(title) {
    // Match patterns like "$0.01 / $0.02" or "$1/$2"
    const match = title.match(/\$?([\d.]+)\s*\/\s*\$?([\d.]+)/);
    if (match) {
      return {
        sb: parseFloat(match[1]),
        bb: parseFloat(match[2])
      };
    }
    return { sb: 0, bb: 0 };
  }

  /**
   * Extract game type from window title
   */
  extractGameType(title) {
    if (/rush\s*&\s*cash/i.test(title)) return 'Rush & Cash';
    if (/hold'?em/i.test(title)) return "Hold'em";
    if (/omaha/i.test(title)) return 'Omaha';
    return 'Unknown';
  }

  /**
   * Set capture frequency in milliseconds
   */
  setCaptureFrequency(ms) {
    this.captureFrequency = Math.max(500, ms); // Minimum 500ms
    
    // Restart if already running
    if (this.captureInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current tracked tables
   */
  getTrackedTables() {
    return Array.from(this.trackedTables.values());
  }
}

module.exports = { ScreenScraper };
