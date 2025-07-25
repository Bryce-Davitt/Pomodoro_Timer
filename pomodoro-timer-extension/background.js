let timerInterval = null;
let currentTime = 0;
let isFocusMode = true;
let popupWindowId = null;

// When the extension icon is clicked, either focus the existing popup or create a new one
chrome.action.onClicked.addListener(() => {
  if (popupWindowId) {
    chrome.windows.get(popupWindowId, (window) => {
      if (chrome.runtime.lastError || !window) {
        createPopupWindow();
      } else {
        chrome.windows.update(popupWindowId, { focused: true });
      }
    });
  } else {
    createPopupWindow();
  }
});

function createPopupWindow() {
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 320,
    height: 380,
    top: 100,
    left: 100,
    focused: true
  }, (window) => {
    popupWindowId = window.id; // Save the popup's window ID for later reference
  });
}

// If the popup window is closed, clear the stored ID so a new one can be created next time
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

// Listen for messages from the popup 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startTimer':
            startBackgroundTimer(request.currentTime, request.isFocusMode);
            break;
        case 'pauseTimer':
            pauseBackgroundTimer();
            break;
        case 'resetTimer':
            resetBackgroundTimer();
            break;
        case 'notify':
            showNotification(request.title, request.message);
            break;
    }
});

function startBackgroundTimer(time, focusMode) {
    currentTime = time;
    isFocusMode = focusMode;
    
    if (timerInterval) {
        clearInterval(timerInterval); // Prevent multiple intervals from running
    }
    
    timerInterval = setInterval(() => {
        currentTime--;
        updateBadge();
        
        if (currentTime <= 0) {
            clearInterval(timerInterval);
            const title = isFocusMode ? 'Focus Time Complete!' : 'Break Over!';
            const message = isFocusMode ? 'Take a break!' : 'Time to focus!';
            showNotification(title, message);
            
            // Switch between focus and break automatically
            isFocusMode = !isFocusMode;
            const nextTime = isFocusMode ? 25 * 60 : 5 * 60; // 25 min focus, 5 min break
            
            // Start the next session after a short pause
            setTimeout(() => {
                startBackgroundTimer(nextTime, isFocusMode);
            }, 1000);
        }
    }, 1000);
}

function pauseBackgroundTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    chrome.action.setBadgeText({text: ''}); // Remove badge when paused
}

function resetBackgroundTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    chrome.action.setBadgeText({text: ''}); // Remove badge when reset
}

function updateBadge() {
    const minutes = Math.floor(currentTime / 60);
    const badgeText = minutes > 0 ? minutes.toString() : '!'; // Show '!' if less than 1 minute left
    chrome.action.setBadgeText({text: badgeText});
    chrome.action.setBadgeBackgroundColor({color: '#ff3333'});
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        title: title,
        message: message,
        priority: 2
    });
}