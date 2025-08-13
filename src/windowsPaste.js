// Windows-specific paste functionality
const { spawn } = require('child_process');

// Send Ctrl+V using PowerShell
const sendCtrlV = () => {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
    ], { windowsHide: true });
    
    ps.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell exit code: ${code}`));
      }
    });
    
    ps.on('error', reject);
  });
};

module.exports = { sendCtrlV };