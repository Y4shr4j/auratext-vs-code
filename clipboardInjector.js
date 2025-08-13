const robot = require("robotjs");
const clipboardy = require("clipboardy");

// Copy text to clipboard for manual pasting
function copyToClipboard(text) {
    try {
        clipboardy.writeSync(text);
        return true;
    } catch (error) {
        console.error('Clipboard copy failed:', error);
        return false;
    }
}

// Inject text directly into active application
function injectText(text) {
    try {
        const originalClipboard = clipboardy.readSync();
        clipboardy.writeSync(text);
        
        setTimeout(() => {
            robot.keyTap('v', 'control');
            setTimeout(() => {
                clipboardy.writeSync(originalClipboard);
            }, 1000);
        }, 300);
        
        return true;
    } catch (error) {
        console.error('Text injection failed:', error);
        return false;
    }
}

// Copy with delay for automatic mode
function copyToClipboardWithDelay(text, delayMs = 3000) {
    setTimeout(() => {
        copyToClipboard(text);
    }, delayMs);
}

// Inject with delay
function injectTextWithDelay(text, delayMs = 2000) {
    setTimeout(() => {
        injectText(text);
    }, delayMs);
}

module.exports = { copyToClipboard, copyToClipboardWithDelay, injectText, injectTextWithDelay };