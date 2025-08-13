// Simple test for robotjs functionality
const robot = require('robotjs');

console.log('Testing robotjs...');
console.log('Open Notepad and click in the text area, then press Enter to continue...');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', async () => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  
  console.log('Testing in 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test typing
    console.log('Typing test text...');
    robot.typeString('Hello from robotjs!');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test Enter key
    console.log('Pressing Enter...');
    robot.keyTap('enter');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test Ctrl+V
    console.log('Testing Ctrl+V...');
    robot.keyToggle('control', 'down');
    robot.keyTap('v');
    robot.keyToggle('control', 'up');
    
    console.log('Test completed!');
  } catch (error) {
    console.error('Robot test failed:', error);
  }
  
  process.exit(0);
});