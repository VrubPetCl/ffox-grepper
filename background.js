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

function toggleExtension(tab) {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(err => {
      console.log("Could not send message to tab, maybe it's not injected yet.", err);
    });
  }
}
