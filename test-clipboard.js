// Test file to demonstrate smart clipboard functionality
const { insertText, copyToClipboard, getActiveAppName } = require('./src/smartClipboard');

async function testSmartClipboard() {
  console.log('Testing Smart Clipboard Functionality...\n');
  
  // Wait for modules to load
  console.log('Waiting for modules to load...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 1: Normal copy (should show "Copied" notification)
  console.log('1. Testing normal copy...');
  await copyToClipboard('This is a normal copy operation');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Get active app name
  console.log('2. Getting active app name...');
  const activeApp = await getActiveAppName();
  console.log(`Active app: ${activeApp}\n`);
  
  // Test 3: Insert text (should show "Text inserted into <app>" notification)
  console.log('3. Testing text insertion...');
  await insertText('This text was inserted by AuraText AI assistant!');
  
  console.log('\nTest completed! Check for notifications.');
}

// Run test if called directly
if (require.main === module) {
  testSmartClipboard().catch(console.error);
}

module.exports = { testSmartClipboard };