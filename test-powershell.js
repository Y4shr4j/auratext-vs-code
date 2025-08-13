// Test PowerShell paste directly
const { spawn } = require('child_process');
const { clipboard } = require('electron');

const sendCtrlV = () => {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
    ], { windowsHide: true });
    
    ps.on('close', (code) => {
      console.log(`PowerShell exit code: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell exit code: ${code}`));
      }
    });
    
    ps.on('error', (error) => {
      console.error('PowerShell error:', error);
      reject(error);
    });
  });
};

async function testPowerShellPaste() {
  console.log('Testing PowerShell paste...');
  console.log('Open Notepad and click in the text area, then press Enter to continue...');
  
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    
    try {
      // Set clipboard content
      const testText = 'Hello from PowerShell test!';
      
      // Use Node.js clipboard (for testing without Electron)
      const clipboardy = await import('clipboardy');
      await clipboardy.default.write(testText);
      console.log('Text written to clipboard:', testText);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Execute paste
      console.log('Executing PowerShell paste in 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await sendCtrlV();
      console.log('PowerShell paste completed!');
      
    } catch (error) {
      console.error('Test failed:', error);
    }
    
    process.exit(0);
  });
}

testPowerShellPaste();