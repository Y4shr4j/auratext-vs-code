// Test specifically with Notepad
const { insertText, getActiveAppName } = require('./src/smartClipboard');

async function testWithNotepad() {
  console.log('Testing with Notepad...');
  console.log('Please open Notepad and click in the text area, then press Enter to continue...');
  
  // Wait for user input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    
    // Wait for modules to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get active app
    const activeApp = await getActiveAppName();
    console.log(`Active app detected: ${activeApp}`);
    
    // Insert test text
    console.log('Inserting text in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const testText = 'Hello from AuraText! This text was automatically inserted.';
    const result = await insertText(testText);
    
    console.log(`Insert result: ${result}`);
    console.log('Check Notepad to see if text was inserted.');
    
    process.exit(0);
  });
}

testWithNotepad().catch(console.error);