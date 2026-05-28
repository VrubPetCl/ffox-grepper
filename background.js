chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(err => {
      console.log("Could not send message to tab, maybe it's not injected yet.", err);
    });
  }
});
