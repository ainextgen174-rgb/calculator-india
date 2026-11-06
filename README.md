const STORAGE_KEYS = {
  theme: 'calculator-india-theme',
  history: 'calculator-india-history',
  settings: 'calculator-india-settings',
  memory: 'calculator-india-memory',
};

const state = {
  expression: '0',
  result: '0',
  theme: localStorage.getItem(STORAGE_KEYS.theme) || 'dark',
  history: JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]'),
  settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{"historyLimit":20,"useGrouping":true,"soundEnabled":false}'),
  memory: Number(localStorage.getItem(STORAGE_KEYS.memory) || 0),
};

const expressionDisplay = document.getElementById('expressionDisplay');
const resultDisplay = document.getElementById('resultDisplay');
const scienceExpression = document.getElementById('scienceExpression');
const scienceResult = document.getElementById('scienceResult');
const historyList = document.getElementById('historyList');
const memoryValueEl = document.getElementById('memoryValue');
const themeToggle = document.getElementById('themeToggle');
const themeSelect = document.getElementById('themeSelect');
const groupingToggle = document.getElementById('groupingToggle');
const soundToggle = document.getElementById('soundToggle');
const historyLimit = document.getElementById('historyLimit');
const historyLimitLabel = document.getElementById('historyLimitLabel');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const copyCurrentBtn = document.getElementById('copyCurrentBtn');
const pasteBtn = document.getElementById('pasteBtn');

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const primaryButtons = document.querySelectorAll('[data-value]');
const actionButtons = document.querySelectorAll('[data-action]');

function saveToStorage() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  localStorage.setItem(STORAGE_KEYS.memory, String(state.memory));
}

function playClickSound() {
  if (!state.settings.soundEnabled) return;
  // Minimal browser sound fallback without external asset
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 540;
    gainNode.gain.value = 0.02;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.03);
  } catch (error) {
    // Ignore playback issues silently.
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Error';

  if (!state.settings.useGrouping) {
    return num.toString();
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 12,
  });

  return formatter.format(num);
}

function updateTheme() {
  document.body.classList.toggle('light-theme', state.theme === 'light');
  themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  themeSelect.value = state.theme;
}

function updateMemoryDisplay() {
  memoryValueEl.textContent = `M: ${formatNumber(state.memory)}`;
}

function updateHistoryLimitDisplay() {
  historyLimitLabel.textContent = `${state.settings.historyLimit} entries`;
  historyLimit.value = state.settings.historyLimit;
}

function updateDisplay() {
  const mainExpression = state.expression === '' ? '0' : state.expression;
  const mainResult = state.result === '' ? '0' : state.result;

  expressionDisplay.textContent = mainExpression;
  resultDisplay.textContent = formatNumber(mainResult);
  scienceExpression.textContent = mainExpression;
  scienceResult.textContent = formatNumber(mainResult);
}

function appendToExpression(value) {
  if (state.expression === '0' && !/[+\-×÷.^]/.test(value)) {
    state.expression = value;
    return;
  }

  if (value === '.' && /\d*\.\d*$/.test(state.expression) === false && !/\d$/.test(state.expression)) {
    state.expression += '0.';
    return;
  }

  if (/[0-9]/.test(value) && state.expression === '0') {
    state.expression = value;
    return;
  }

  if (/[+\-×÷]/.test(value)) {
    const lastChar = state.expression.slice(-1);
    if (/[+\-×÷]/.test(lastChar)) {
      state.expression = state.expression.slice(0, -1) + value;
      return;
    }
  }

  if (value === '%' && state.expression !== '0') {
    applyPercentage();
    return;
  }

  state.expression += value;
}

function applyPercentage() {
  const current = getCurrentNumber();
  const value = Number(current || 0) / 100;
  state.expression = String(value);
  state.result = String(value);
  updateDisplay();
}

function getCurrentNumber() {
  const raw = state.expression.replace(/×/g, '*').replace(/÷/g, '/');
  if (!raw || raw === '0') return 0;
  return raw;
}

function clearAll() {
  state.expression = '0';
  state.result = '0';
  updateDisplay();
}

function backspace() {
  if (state.expression.length <= 1) {
    state.expression = '0';
  } else {
    state.expression = state.expression.slice(0, -1);
  }
  state.result = state.expression;
  updateDisplay();
}

function toggleSign() {
  if (state.expression === '0') return;
  if (state.expression.startsWith('-')) {
    state.expression = state.expression.slice(1);
  } else {
    state.expression = '-' + state.expression;
  }
  state.result = state.expression;
  updateDisplay();
}

function evaluateExpression() {
  let rawExpression = state.expression.trim();

  if (!rawExpression || rawExpression === '0') {
    state.result = '0';
    updateDisplay();
    return;
  }

  rawExpression = rawExpression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'Math.PI')
    .replace(/e/g, 'Math.E')
    .replace(/%/g, '/100')
    .replace(/√/g, 'Math.sqrt')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/\^/g, '**');

  try {
    const guarded = rawExpression
      .replace(/[^0-9+\-*/().,\s*MathPIE^%]/g, '');

    const evaluator = new Function(`"use strict"; return (${guarded});`);
    const result = evaluator();

    if (!Number.isFinite(result)) {
      throw new Error('Invalid mathematics');
    }

    const cleanResult = Number(result);
    state.result = String(cleanResult);
    state.expression = String(cleanResult);
    addHistoryEntry(rawExpression, cleanResult);
  } catch (error) {
    state.result = 'Error';
    state.expression = 'Error';
  }

  updateDisplay();
}

function addHistoryEntry(expression, result) {
  const entry = {
    expression: expression
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/Math\.PI/g, 'π')
      .replace(/Math\.E/g, 'e')
      .replace(/Math\.sin\(/g, 'sin(')
      .replace(/Math\.cos\(/g, 'cos(')
      .replace(/Math\.tan\(/g, 'tan(')
      .replace(/Math\.log10\(/g, 'log(')
      .replace(/Math\.log\(/g, 'ln(')
      .replace(/Math\.sqrt\(/g, 'sqrt(')
      .replace(/\*\*/g, '^')
      .replace(/\s+/g, ''),
    result: result,
    created: new Date().toISOString(),
  };

  state.history.unshift(entry);
  if (state.history.length > state.settings.historyLimit) {
    state.history = state.history.slice(0, state.settings.historyLimit);
  }

  renderHistory();
  saveToStorage();
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<div class="history-item"><strong>No history yet</strong><span>Start calculating to build your list.</span></div>';
    return;
  }

  historyList.innerHTML = state.history
    .map(
      (item) => `
        <button class="history-item" data-history-expression="${escapeHtml(item.expression)}" data-history-result="${escapeHtml(String(item.result))}">
          <strong>${new Date(item.created).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
          <span>${escapeHtml(item.expression)}</span>
          <small>= ${escapeHtml(formatNumber(item.result))}</small>
        </button>
      `,
    )
    .join('');

  historyList.querySelectorAll('.history-item').forEach((button) => {
    button.addEventListener('click', () => {
      const expr = button.dataset.historyExpression || '0';
      const res = button.dataset.historyResult || '0';
      state.expression = expr;
      state.result = res;
      updateDisplay();
      tabs.forEach((tab) => tab.classList.remove('active'));
      document.querySelector('.tab[data-target="basic"]').classList.add('active');
      panels.forEach((panel) => panel.classList.remove('active'));
      document.getElementById('basic').classList.add('active');
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function insertScientificFunction(name) {
  const fnMap = {
    sin: 'sin(',
    cos: 'cos(',
    tan: 'tan(',
    log: 'log(',
    ln: 'ln(',
    sqrt: 'sqrt(',
    square: '^(2)',
    inverse: '^(−1)',
    pi: 'π',
    e: 'e',
    exp: '10^',
    power: '^',
  };

  if (state.expression === '0' || state.expression === 'Error') {
    state.expression = '';
  }

  const value = fnMap[name];

  if (name === 'square') {
    state.expression += '^2';
    state.result = state.expression;
    updateDisplay();
    return;
  }

  if (name === 'inverse') {
    state.expression += '^(-1)';
    state.result = state.expression;
    updateDisplay();
    return;
  }

  if (name === 'exp') {
    state.expression += '10^';
    updateDisplay();
    return;
  }

  if (value) {
    state.expression += value;
    state.result = state.expression;
    updateDisplay();
  }
}

function handleNumberClick(value) {
  playClickSound();
  appendToExpression(value);
  state.result = state.expression;
  updateDisplay();
}

function handleOperatorClick(value) {
  playClickSound();
  appendToExpression(value);
  state.result = state.expression;
  updateDisplay();
}

function handleAction(action) {
  playClickSound();
  switch (action) {
    case 'clear':
      clearAll();
      break;
    case 'delete':
      backspace();
      break;
    case 'toggle-sign':
      toggleSign();
      break;
    case 'equals':
      evaluateExpression();
      break;
    case 'percentage':
      applyPercentage();
      break;
    default:
      break;
  }
}

function handleMemory(action) {
  playClickSound();
  const current = Number(state.result || 0);

  switch (action) {
    case 'memory-clear':
      state.memory = 0;
      break;
    case 'memory-recall':
      state.expression = String(state.memory);
      state.result = String(state.memory);
      break;
    case 'memory-add':
      state.memory += current;
      break;
    case 'memory-subtract':
      state.memory -= current;
      break;
    case 'memory-store':
      state.memory = current;
      break;
    default:
      break;
  }

  updateMemoryDisplay();
  saveToStorage();
  updateDisplay();
}

function onThemeChange(nextTheme) {
  state.theme = nextTheme;
  updateTheme();
  saveToStorage();
}

function bindUI() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === target));
    });
  });

  document.querySelectorAll('.num-btn').forEach((button) => {
    button.addEventListener('click', () => handleNumberClick(button.dataset.value));
  });

  document.querySelectorAll('.operator-btn').forEach((button) => {
    button.addEventListener('click', () => handleOperatorClick(button.dataset.value));
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action.startsWith('memory-')) {
        handleMemory(action);
        return;
      }
      if (action === 'function') {
        const fn = button.dataset.value;
        insertScientificFunction(fn);
        return;
      }
      handleAction(action);
    });
  });

  clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    renderHistory();
    saveToStorage();
  });

  themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    onThemeChange(state.theme);
  });

  themeSelect.addEventListener('change', (event) => {
    onThemeChange(event.target.value);
  });

  groupingToggle.addEventListener('change', (event) => {
    state.settings.useGrouping = event.target.checked;
    saveToStorage();
    updateDisplay();
  });

  soundToggle.addEventListener('change', (event) => {
    state.settings.soundEnabled = event.target.checked;
    saveToStorage();
  });

  historyLimit.addEventListener('input', (event) => {
    state.settings.historyLimit = Number(event.target.value);
    updateHistoryLimitDisplay();
    state.history = state.history.slice(0, state.settings.historyLimit);
    renderHistory();
    saveToStorage();
  });

  copyCurrentBtn.addEventListener('click', async () => {
    const text = String(state.result || state.expression || '0');
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      window.prompt('Copy this value:', text);
    }
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      state.expression = text.trim() || '0';
      state.result = text.trim() || '0';
      updateDisplay();
    } catch (error) {
      // gracefully ignore if clipboard permissions are denied.
    }
  });
}

function init() {
  updateTheme();
  updateHistoryLimitDisplay();
  groupingToggle.checked = state.settings.useGrouping;
  soundToggle.checked = state.settings.soundEnabled;
  updateMemoryDisplay();
  renderHistory();
  updateDisplay();
  bindUI();
}

init();
