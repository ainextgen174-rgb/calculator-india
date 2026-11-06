(() => {
  'use strict';

  const KEYS = {
    theme: 'calculator-india-theme',
    history: 'calculator-india-history',
    settings: 'calculator-india-settings',
    memory: 'calculator-india-memory',
  };
  const DEFAULT_SETTINGS = { historyLimit: 20, useGrouping: true, soundEnabled: false, angle: 'deg' };
  const $ = (id) => document.getElementById(id);
  const readStorage = (key, fallback, json = false) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : (json ? JSON.parse(value) : value);
    } catch {
      return fallback;
    }
  };
  const storedSettings = readStorage(KEYS.settings, {}, true);
  const storedHistory = readStorage(KEYS.history, [], true);
  const state = {
    expression: '',
    result: 0,
    justEvaluated: false,
    theme: readStorage(KEYS.theme, 'dark') === 'light' ? 'light' : 'dark',
    history: Array.isArray(storedHistory) ? storedHistory : [],
    settings: { ...DEFAULT_SETTINGS, ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}) },
    memory: Number(readStorage(KEYS.memory, '0')) || 0,
  };
  let toastTimer;
  let audioContext;

  function persist() {
    try {
      localStorage.setItem(KEYS.theme, state.theme);
      localStorage.setItem(KEYS.history, JSON.stringify(state.history));
      localStorage.setItem(KEYS.settings, JSON.stringify(state.settings));
      localStorage.setItem(KEYS.memory, String(state.memory));
    } catch {
      notify('Browser storage is unavailable.');
    }
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 'Error';
    if (!state.settings.useGrouping) return String(Number(number.toPrecision(12)));
    return new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 12 }).format(number);
  }

  function notify(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function playSound() {
    if (!state.settings.soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 520;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.035);
    } catch { /* Optional enhancement; unsupported audio is harmless. */ }
  }

  function updateDisplay() {
    const expressionText = state.expression || (state.justEvaluated ? '' : 'Ready');
    const resultText = formatNumber(state.result);
    ['expressionDisplay', 'scienceExpression'].forEach((id) => { if ($(id)) $(id).textContent = expressionText; });
    ['resultDisplay', 'scienceResult'].forEach((id) => { if ($(id)) $(id).textContent = resultText; });
    $('memoryValue').textContent = `M: ${formatNumber(state.memory)}`;
  }

  function updateTheme() {
    document.body.classList.toggle('light-theme', state.theme === 'light');
    $('themeSelect').value = state.theme;
    $('themeToggle').textContent = state.theme === 'dark' ? '☀' : '☾';
    $('themeToggle').setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function activateTab(id) {
    document.querySelectorAll('.tab').forEach((tab) => {
      const selected = tab.dataset.target === id;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    document.querySelectorAll('.panel').forEach((panel) => {
      const selected = panel.id === id;
      panel.hidden = !selected;
      panel.classList.toggle('active', selected);
    });
  }

  // Tokenizer and recursive-descent parser: calculator input is never evaluated as JavaScript.
  function calculate(source) {
    const input = source.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−]/g, '-').replace(/π/g, 'pi');
    const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z]+|[()+\-*/^%]/g) || [];
    if (!tokens.length || tokens.join('') !== input.replace(/\s+/g, '')) throw new Error('Check the expression');

    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];
    const requireToken = (expected) => { if (take() !== expected) throw new Error('Check the parentheses'); };
    const finite = (value) => {
      if (!Number.isFinite(value)) throw new Error('Result is outside the valid range');
      return value;
    };
    const applyFunction = (name, value) => {
      const angle = state.settings.angle === 'deg' ? value * Math.PI / 180 : value;
      switch (name) {
        case 'sin': return Math.sin(angle);
        case 'cos': return Math.cos(angle);
        case 'tan': return Math.tan(angle);
        case 'sqrt': if (value < 0) throw new Error('Square root needs a non-negative number'); return Math.sqrt(value);
        case 'log': if (value <= 0) throw new Error('Logarithm needs a positive number'); return Math.log10(value);
        case 'ln': if (value <= 0) throw new Error('Logarithm needs a positive number'); return Math.log(value);
        default: throw new Error(`Unknown function: ${name}`);
      }
    };
    function expression() {
      let value = term();
      while (peek() === '+' || peek() === '-') {
        const operator = take();
        const right = term();
        value = operator === '+' ? value + right : value - right;
      }
      return finite(value);
    }
    const startsPrimary = (token) => token !== undefined && (token === '(' || /^[A-Za-z]+$/.test(token) || /^(?:\d|\.)/.test(token));
    function term() {
      let value = unary();
      while (true) {
        if (peek() === '*' || peek() === '/') {
          const operator = take();
          const right = unary();
          if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
          value = operator === '*' ? value * right : value / right;
        } else if (startsPrimary(peek())) {
          value *= unary(); // Implicit multiplication: 2π, 3(1 + 2), 2sin(30).
        } else break;
      }
      return finite(value);
    }
    function unary() {
      if (peek() === '+') { take(); return unary(); }
      if (peek() === '-') { take(); return -unary(); }
      return power();
    }
    function power() {
      let value = postfix();
      if (peek() === '^') { take(); value = Math.pow(value, unary()); }
      return finite(value);
    }
    function postfix() {
      let value = primary();
      while (peek() === '%') { take(); value /= 100; }
      return value;
    }
    function primary() {
      const token = take();
      if (token === undefined) throw new Error('Enter a complete expression');
      if (token === '(') {
        const value = expression();
        requireToken(')');
        return value;
      }
      if (/^(?:\d|\.)/.test(token)) return finite(Number(token));
      if (/^[A-Za-z]+$/.test(token)) {
        const name = token.toLowerCase();
        if (name === 'pi') return Math.PI;
        if (name === 'e') return Math.E;
        if (['sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(name)) {
          let argument;
          if (peek() === '(') { take(); argument = expression(); requireToken(')'); }
          else argument = unary();
          return finite(applyFunction(name, argument));
        }
        throw new Error(`Unknown value: ${token}`);
      }
      throw new Error('Check the expression');
    }

    const answer = expression();
    if (index !== tokens.length) throw new Error('Check the expression');
    return finite(answer);
  }

  function prepareForEntry(value) {
    if (state.justEvaluated) {
      if (/^\d$/.test(value) || value === '.' || value === '(' || /^[A-Za-z]/.test(value) || value === 'π') {
        state.expression = '';
        state.result = 0;
      } else {
        state.expression = String(state.result);
      }
      state.justEvaluated = false;
    }
  }

  function preview() {
    if (!state.expression) {
      state.result = 0;
      updateDisplay();
      return;
    }
    try { state.result = calculate(state.expression); } catch { /* Keep the last valid preview while input is incomplete. */ }
    updateDisplay();
  }

  function appendValue(value) {
    prepareForEntry(value);
    if (/^\d$/.test(value)) {
      const tail = state.expression.split(/[+\-×÷*/^(]/).pop();
      if (tail === '0' && /(?:^|[+\-×÷*/^(])0$/.test(state.expression)) state.expression = state.expression.slice(0, -1) + value;
      else state.expression += value;
    } else if (value === '.') {
      const tail = state.expression.split(/[+\-×÷*/^()%]/).pop();
      if (tail.includes('.')) return;
      if (!tail || /[+\-×÷*/^(]$/.test(state.expression)) state.expression += '0.';
      else state.expression += '.';
    } else if (['+', '-', '×', '÷', '^'].includes(value)) {
      if (!state.expression && value !== '-') state.expression = String(state.result);
      if (/[+×÷^\-]$/.test(state.expression) && state.expression !== '-') state.expression = state.expression.slice(0, -1) + value;
      else state.expression += value;
    } else if (value === ')') {
      const opens = (state.expression.match(/\(/g) || []).length;
      const closes = (state.expression.match(/\)/g) || []).length;
      if (opens > closes && !/[+\-×÷^(]$/.test(state.expression)) state.expression += ')';
    } else if (value === '(') {
      if (state.expression && /[\dπe)]$/.test(state.expression)) state.expression += '×';
      state.expression += '(';
    } else if (value === '%') {
      if (/[\dπe)]$/.test(state.expression)) state.expression += '%';
    }
    preview();
  }

  function clearAll() {
    state.expression = '';
    state.result = 0;
    state.justEvaluated = false;
    updateDisplay();
  }

  function backspace() {
    if (state.justEvaluated) {
      state.expression = '';
      state.result = 0;
      state.justEvaluated = false;
    } else state.expression = state.expression.slice(0, -1);
    preview();
  }

  function toggleSign() {
    prepareForEntry('-');
    if (!state.expression) state.expression = state.result ? `-${state.result}` : '-';
    else {
      const match = state.expression.match(/(\d*\.?\d+(?:[eE][+-]?\d+)?|π|e)$/);
      if (match) {
        const start = match.index;
        if (state.expression[start - 1] === '-') state.expression = state.expression.slice(0, start - 1) + state.expression.slice(start);
        else state.expression = `${state.expression.slice(0, start)}-${state.expression.slice(start)}`;
      } else state.expression = `-(${state.expression})`;
    }
    preview();
  }

  function applyFunction(name) {
    const isConstant = name === 'pi' || name === 'e';
    prepareForEntry(isConstant ? 'π' : 'function');
    if (isConstant) {
      const constant = name === 'pi' ? 'π' : 'e';
      if (state.expression && /[\dπe)]$/.test(state.expression)) state.expression += '×';
      state.expression += constant;
    } else if (name === 'square') {
      const value = state.expression || String(state.result);
      state.expression = `(${value})^2`;
    } else if (name === 'inverse') {
      const value = state.expression || String(state.result);
      state.expression = `1/(${value})`;
    } else if (name === 'power') {
      if (!state.expression) state.expression = String(state.result);
      state.expression += '^';
    } else if (name === 'exp') {
      if (state.expression && /[\dπe)]$/.test(state.expression)) state.expression += '×';
      state.expression += '10^';
    } else {
      const functionName = name === 'sqrt' ? 'sqrt' : name;
      if (state.expression && /[\dπe)]$/.test(state.expression)) {
        // Scientific functions act on the current expression instead of being duplicated or appended after it.
        state.expression = `${functionName}(${state.expression})`;
      } else state.expression += `${functionName}(`;
    }
    preview();
  }

  function closeOpenParentheses(expression) {
    let depth = 0;
    for (const character of expression) {
      if (character === '(') depth++;
      if (character === ')') depth--;
      if (depth < 0) throw new Error('Check the parentheses');
    }
    return expression + ')'.repeat(depth);
  }

  function renderHistory() {
    const container = $('historyList');
    container.replaceChildren();
    if (!state.history.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No calculations yet. Your results will appear here.';
      container.append(empty);
      return;
    }
    state.history.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-item';
      const date = document.createElement('span');
      date.className = 'history-date';
      const parsedDate = new Date(item.created);
      date.textContent = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      const expression = document.createElement('span');
      expression.className = 'history-expression';
      expression.textContent = item.expression;
      const result = document.createElement('span');
      result.className = 'history-result';
      result.textContent = `= ${formatNumber(item.result)}`;
      button.append(date, expression, result);
      button.addEventListener('click', () => {
        state.expression = String(item.result);
        state.result = Number(item.result);
        state.justEvaluated = false;
        updateDisplay();
        activateTab('basic');
      });
      container.append(button);
    });
  }

  function addHistory(expression, result) {
    state.history.unshift({ expression, result, created: new Date().toISOString() });
    state.history = state.history.slice(0, Number(state.settings.historyLimit) || 20);
    persist();
    renderHistory();
  }

  function evaluate() {
    if (!state.expression) return;
    try {
      const expression = closeOpenParentheses(state.expression);
      const result = calculate(expression);
      state.expression = expression;
      state.result = result;
      state.justEvaluated = true;
      addHistory(expression, result);
      updateDisplay();
    } catch (error) {
      notify(error.message || 'Unable to calculate this expression.');
    }
  }

  function currentValue() {
    try { return state.expression ? calculate(closeOpenParentheses(state.expression)) : Number(state.result) || 0; }
    catch { return Number(state.result) || 0; }
  }

  function memoryAction(action) {
    const value = currentValue();
    if (action === 'memory-clear') state.memory = 0;
    if (action === 'memory-recall') {
      state.expression = String(state.memory);
      state.result = state.memory;
      state.justEvaluated = false;
    }
    if (action === 'memory-add') state.memory += value;
    if (action === 'memory-subtract') state.memory -= value;
    if (action === 'memory-store') state.memory = value;
    persist();
    updateDisplay();
  }

  async function copyResult() {
    const text = String(currentValue());
    try {
      await navigator.clipboard.writeText(text);
      notify('Result copied.');
    } catch {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      notify(copied ? 'Result copied.' : `Result: ${text}`);
    }
  }

  async function pasteValue() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error('Clipboard is empty.');
      state.expression = text.trim();
      state.justEvaluated = false;
      state.result = calculate(closeOpenParentheses(state.expression));
      updateDisplay();
      activateTab('basic');
      notify('Value pasted.');
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        const text = window.prompt('Paste a number or expression:');
        if (text !== null && text.trim()) {
          try {
            state.expression = text.trim();
            state.justEvaluated = false;
            state.result = calculate(closeOpenParentheses(state.expression));
            updateDisplay();
            activateTab('basic');
          } catch (pasteError) { notify(pasteError.message); }
        }
      } else notify(error.message || 'Clipboard access is unavailable.');
    }
  }

  function handleAction(action) {
    playSound();
    if (action === 'clear') clearAll();
    else if (action === 'delete') backspace();
    else if (action === 'toggle-sign') toggleSign();
    else if (action === 'equals') evaluate();
    else if (action === 'percentage') appendValue('%');
    else if (action.startsWith('memory-')) memoryAction(action);
  }

  function onKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    if (/^\d$/.test(event.key)) { appendValue(event.key); event.preventDefault(); }
    else if (event.key === '.') { appendValue('.'); event.preventDefault(); }
    else if (['+', '-', '*', '/', '^', '(', ')', '%'].includes(event.key)) {
      appendValue(({ '*': '×', '/': '÷' })[event.key] || event.key);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === '=') { evaluate(); event.preventDefault(); }
    else if (event.key === 'Backspace') { backspace(); event.preventDefault(); }
    else if (event.key === 'Escape') { clearAll(); event.preventDefault(); }
  }

  function init() {
    document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.target)));

    // One delegated listener handles every calculator key. In particular, scientific
    // buttons are not also bound by a second data-action listener.
    document.querySelector('.tab-panels').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value], button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'function') {
        playSound();
        applyFunction(button.dataset.value);
      } else if (button.dataset.action) handleAction(button.dataset.action);
      else if (button.dataset.value !== undefined) {
        playSound();
        appendValue(button.dataset.value);
      }
    });

    $('themeToggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      updateTheme();
      persist();
    });
    $('themeSelect').addEventListener('change', (event) => {
      state.theme = event.target.value;
      updateTheme();
      persist();
    });
    $('groupingToggle').checked = Boolean(state.settings.useGrouping);
    $('groupingToggle').addEventListener('change', (event) => {
      state.settings.useGrouping = event.target.checked;
      persist();
      updateDisplay();
      renderHistory();
    });
    $('angleSelect').value = state.settings.angle === 'rad' ? 'rad' : 'deg';
    $('angleSelect').addEventListener('change', (event) => {
      state.settings.angle = event.target.value;
      persist();
      if (state.expression) preview();
    });
    $('soundToggle').checked = Boolean(state.settings.soundEnabled);
    $('soundToggle').addEventListener('change', (event) => {
      state.settings.soundEnabled = event.target.checked;
      persist();
    });
    const limitInput = $('historyLimit');
    limitInput.value = Math.max(5, Math.min(100, Number(state.settings.historyLimit) || 20));
    const updateLimit = () => {
      state.settings.historyLimit = Number(limitInput.value);
      $('historyLimitLabel').textContent = `${limitInput.value} entries`;
      state.history = state.history.slice(0, state.settings.historyLimit);
      persist();
      renderHistory();
    };
    $('historyLimitLabel').textContent = `${limitInput.value} entries`;
    limitInput.addEventListener('input', updateLimit);
    $('clearHistoryBtn').addEventListener('click', () => {
      state.history = [];
      persist();
      renderHistory();
      notify('History cleared.');
    });
    $('copyCurrentBtn').addEventListener('click', copyResult);
    $('pasteBtn').addEventListener('click', pasteValue);
    document.addEventListener('keydown', onKeydown);

    updateTheme();
    renderHistory();
    updateDisplay();
  }

  init();
})();
