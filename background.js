chrome.action.onClicked.addListener((tab) => {
  toggleExtension(tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        toggleExtension(tabs[0]);
      }
    });
  }
});

async function toggleExtension(tab) {
  if (!tab.id) return;
  
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" });
  } catch (err) {
    console.info("Content script not responding. Attempting to inject...", err);
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content.css"]
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      // Retry sending message after injection
      await chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" });
    } catch (injectErr) {
      console.error("Failed to inject content script or send message:", injectErr);
    }
  }
}
