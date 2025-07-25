class PomodoroTimer {
    constructor() {
        this.focusTime = 25 * 60;
        this.breakTime = 5 * 60;
        this.currentTime = this.focusTime;
        this.totalTime = this.focusTime;
        this.isRunning = false;
        this.isFocusMode = true;
        this.sessionCount = 1;
        this.timer = null;
        
        this.initElements();
        this.bindEvents();
        this.loadState();
        this.updateDisplay();
    }
    
    initElements() {
        // Cache all the DOM elements we'll need
        this.display = document.getElementById('timerDisplay');
        this.label = document.getElementById('timerLabel');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.progressFill = document.getElementById('progressFill');
        this.sessionCounter = document.getElementById('sessionCount');
    }
    
    bindEvents() {
        // Wire up button clicks to timer actions
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
    }
    
    async loadState() {
        // Restore timer state from Chrome storage 
        try {
            const result = await chrome.storage.local.get(['timerState']);
            if (result.timerState) {
                const state = result.timerState;
                this.currentTime = state.currentTime || this.focusTime;
                this.isFocusMode = state.isFocusMode !== undefined ? state.isFocusMode : true;
                this.sessionCount = state.sessionCount || 1;
                this.totalTime = this.isFocusMode ? this.focusTime : this.breakTime;
                this.updateLabel();
                this.sessionCounter.textContent = this.sessionCount;
            }
        } catch (error) {
            console.log('Could not load state:', error);
        }
    }
    
    async saveState() {
        // Save timer state to Chrome storage
        try {
            await chrome.storage.local.set({
                timerState: {
                    currentTime: this.currentTime,
                    isFocusMode: this.isFocusMode,
                    sessionCount: this.sessionCount
                }
            });
        } catch (error) {
            console.log('Could not save state:', error);
        }
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.timer = setInterval(() => this.tick(), 1000);
            this.startBtn.textContent = 'RUNNING';
            this.startBtn.style.opacity = '0.6';
            
            // Tell the background script to start its timer too
            chrome.runtime.sendMessage({
                action: 'startTimer',
                currentTime: this.currentTime,
                isFocusMode: this.isFocusMode
            });
        }
    }
    
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timer);
            this.startBtn.textContent = 'START';
            this.startBtn.style.opacity = '1';
            
            chrome.runtime.sendMessage({action: 'pauseTimer'});
        }
    }
    
    reset() {
        this.pause();
        this.currentTime = this.isFocusMode ? this.focusTime : this.breakTime;
        this.totalTime = this.currentTime;
        this.updateDisplay();
        this.updateProgress();
        this.saveState();
        
        chrome.runtime.sendMessage({action: 'resetTimer'});
    }
    
    tick() {
        this.currentTime--;
        this.updateDisplay();
        this.updateProgress();
        this.saveState();
        
        if (this.currentTime <= 0) {
            this.pause();
            this.switchMode();
        }
    }
    
    switchMode() {
        // Toggle between focus and break mode, update session count if needed
        this.isFocusMode = !this.isFocusMode;
        
        if (this.isFocusMode) {
            this.sessionCount++;
            this.sessionCounter.textContent = this.sessionCount;
            this.currentTime = this.focusTime;
            this.totalTime = this.focusTime;
        } else {
            this.currentTime = this.breakTime;
            this.totalTime = this.breakTime;
        }
        
        this.updateLabel();
        this.updateDisplay();
        this.updateProgress();
        this.saveState();
        
        // Notify the user when switching modes
        chrome.runtime.sendMessage({
            action: 'notify',
            title: this.isFocusMode ? 'Break Over!' : 'Focus Time Complete!',
            message: this.isFocusMode ? 'Time to focus!' : 'Take a break!'
        });
        
        // Flash the border for a visual cue
        document.querySelector('.timer-container').style.animation = 'borderGlow 0.5s ease-in-out 3';
        
        // Automatically start the next session after a short pause
        setTimeout(() => {
            this.start();
        }, 1000);
    }
    
    updateLabel() {
        this.label.textContent = this.isFocusMode ? 'FOCUS TIME' : 'BREAK TIME';
    }
    
    updateDisplay() {
        // Format time as MM:SS
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateProgress() {
        // Update the progress bar width based on time left
        const progress = (this.currentTime / this.totalTime) * 100;
        this.progressFill.style.width = `${progress}%`;
    }
}

// Start the timer logic when the popup loads
// (This ensures the timer is always ready when the popup opens)
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});