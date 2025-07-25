// Only inject the overlay once per page load
if (!window.__pomodoroInjected) {
  window.__pomodoroInjected = true;
  // Dynamically load timer.js (for future modular logic)
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('timer.js');
  document.body.appendChild(script);

  // Build the overlay UI
  const overlay = document.createElement('div');
  overlay.id = 'pomodoro-overlay';
  overlay.innerHTML = `
    <div id="pomodoro-header">⏱️ Quick Focus</div>
    <div id="pomodoro-timer">25:00</div>
    <div id="pomodoro-controls">
      <button id="pomodoro-start">Start</button>
      <button id="pomodoro-stop">Stop</button>
      <button id="pomodoro-reset">Reset</button>
    </div>
    <audio id="pomodoro-sound" src="" preload="auto"></audio>
  `;
  document.body.appendChild(overlay);

  // Dragtomove logic for the overlay
  let isDragging = false, offsetX = 0, offsetY = 0;
  const header = overlay.querySelector('#pomodoro-header');
  header.style.cursor = 'move';
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - overlay.offsetLeft;
    offsetY = e.clientY - overlay.offsetTop;
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
  });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      overlay.style.left = `${e.clientX - offsetX}px`;
      overlay.style.top = `${e.clientY - offsetY}px`;
    }
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  // Timer logic
  let timer = null, timeLeft = 1500, running = false;
  const timerDisplay = overlay.querySelector('#pomodoro-timer');
  const startBtn = overlay.querySelector('#pomodoro-start');
  const stopBtn = overlay.querySelector('#pomodoro-stop');
  const resetBtn = overlay.querySelector('#pomodoro-reset');
  const sound = overlay.querySelector('#pomodoro-sound');

  function updateDisplay() {
    // Show time in MM:SS format
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
  }

  function playSound() {
    // Play a short beep 
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = 0.1;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 400);
  }

  function startTimer() {
    if (running) return; // Don't start if already running
    running = true;
    timer = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateDisplay();
      } else {
        clearInterval(timer);
        running = false;
        playSound();
      }
    }, 1000);
  }
  function stopTimer() {
    running = false;
    clearInterval(timer);
  }
  function resetTimer() {
    stopTimer();
    timeLeft = 1500;
    updateDisplay();
  }

  // Button event handlers
  startBtn.onclick = startTimer;
  stopBtn.onclick = stopTimer;
  resetBtn.onclick = resetTimer;
  updateDisplay();

  // Set initial overlay position and stacking
  overlay.style.position = 'fixed';
  overlay.style.top = '80px';
  overlay.style.left = '80px';
  overlay.style.zIndex = 999999;
} 