const { spawn } = require('child_process');
const os = require('os');

class InputDetector {
  constructor(callback) {
    this.callback = callback;
    this.isMonitoring = false;
    this.interval = null;
  }

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    console.log('Starting input detection...');
    
    if (os.platform() === 'win32') {
      this.startWindowsInputDetection();
    } else {
      // Fallback test mode for other platforms
      this.startTestMode();
    }
  }
  
  startTestMode() {
    this.interval = setInterval(() => {
      if (this.isMonitoring) {
        const x = Math.random() * 800 + 100;
        const y = Math.random() * 600 + 100;
        const width = 200;
        const height = 30;
        console.log('Test mode: Triggering overlay at:', x, y);
        this.callback({ x, y, width, height, hasInput: true });
      }
    }, 5000);
  }
  
  startWindowsInputDetection() {
    // PowerShell script to detect focused text inputs
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      Add-Type -AssemblyName UIAutomationTypes
      
      while ($true) {
        try {
          $automation = [System.Windows.Automation.AutomationElement]::RootElement
          $focusedElement = [System.Windows.Automation.AutomationElement]::FocusedElement
          
          if ($focusedElement -ne $null) {
            $controlType = $focusedElement.Current.ControlType
            $isTextInput = ($controlType.Id -eq 50004) -or ($controlType.Id -eq 50033)
            
            if ($isTextInput) {
              $rect = $focusedElement.Current.BoundingRectangle
              $x = [int]($rect.Left)
              $y = [int]($rect.Top)
              $w = [int]($rect.Width)
              $h = [int]($rect.Height)
              Write-Output "INPUT:$x,$y,$w,$h"
            }
          }
        } catch {}
        Start-Sleep -Milliseconds 2000
      }
    `;
    
    const ps = spawn('powershell', ['-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    
    ps.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.startsWith('INPUT:')) {
        const parts = output.substring(6).split(',');
        const x = parseInt(parts[0]);
        const y = parseInt(parts[1]);
        const width = parseInt(parts[2]);
        const height = parseInt(parts[3]);
        
        if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
          console.log('Text input detected:', { x, y, width, height });
          this.callback({ x, y, width, height, hasInput: true });
        }
      }
    });
    
    this.process = ps;
  }

  stop() {
    console.log('Stopping input detection...');
    this.isMonitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  startWindowsMonitoring() {
    // Use PowerShell to monitor active window and caret position
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        using System.Drawing;
        
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          
          [DllImport("user32.dll")]
          public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
          
          [DllImport("user32.dll")]
          public static extern bool GetCaretPos(out Point lpPoint);
          
          [DllImport("user32.dll")]
          public static extern IntPtr GetFocus();
          
          [StructLayout(LayoutKind.Sequential)]
          public struct RECT {
            public int Left, Top, Right, Bottom;
          }
        }
"@
      
      while ($true) {
        try {
          $hwnd = [Win32]::GetForegroundWindow()
          $rect = New-Object Win32+RECT
          [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
          
          $focusHwnd = [Win32]::GetFocus()
          if ($focusHwnd -ne [IntPtr]::Zero) {
            $caretPos = New-Object System.Drawing.Point
            if ([Win32]::GetCaretPos([ref]$caretPos)) {
              $x = $rect.Left + $caretPos.X + 10
              $y = $rect.Top + $caretPos.Y + 25
              Write-Output "CARET:$x,$y"
            }
          }
        } catch {}
        Start-Sleep -Milliseconds 200
      }
    `;

    const ps = spawn('powershell', ['-Command', script], { 
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    ps.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.startsWith('CARET:')) {
        const coords = output.substring(6).split(',');
        const x = parseInt(coords[0]);
        const y = parseInt(coords[1]);
        
        if (!isNaN(x) && !isNaN(y)) {
          this.callback({ x, y, hasInput: true });
        }
      }
    });
  }

  startMacMonitoring() {
    // Use AppleScript to monitor active elements
    const script = `
      tell application "System Events"
        repeat
          try
            set frontApp to name of first application process whose frontmost is true
            set focusedElement to focused UI element of frontApp
            if focusedElement is not missing value then
              set elementRole to role of focusedElement
              if elementRole is "AXTextField" or elementRole is "AXTextArea" then
                set elementPosition to position of focusedElement
                set elementSize to size of focusedElement
                set x to (item 1 of elementPosition) + (item 1 of elementSize) + 10
                set y to (item 2 of elementPosition) + 10
                return "CARET:" & x & "," & y
              end if
            end if
          end try
          delay 0.2
        end repeat
      end tell
    `;

    const osascript = spawn('osascript', ['-e', script], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    osascript.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.startsWith('CARET:')) {
        const coords = output.substring(6).split(',');
        const x = parseInt(coords[0]);
        const y = parseInt(coords[1]);
        
        if (!isNaN(x) && !isNaN(y)) {
          this.callback({ x, y, hasInput: true });
        }
      }
    });
  }
}

module.exports = InputDetector;


