// Адаптированная версия popup.js для работы в веб-приложении (без Chrome Extension API)

let isRunning = false;

// Замена chrome.storage на localStorage
const storage = {
  async get(keys) {
    try {
      const data = JSON.parse(localStorage.getItem('redditBotSettings') || '{}');
      return keys ? { [keys]: data[keys] } : data;
    } catch (e) {
      return {};
    }
  },
  async set(data) {
    try {
      const current = JSON.parse(localStorage.getItem('redditBotSettings') || '{}');
      localStorage.setItem('redditBotSettings', JSON.stringify({ ...current, ...data }));
    } catch (e) {
      console.error('Ошибка сохранения настроек:', e);
    }
  }
};

// Замена chrome.runtime.sendMessage на fetch к API
async function sendMessageToBackground(type, data) {
  try {
    const response = await fetch('/api/extension/ollama-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, ...data }),
    });
    return await response.json();
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return { success: false, error: error.message };
  }
}

// Загрузка настроек при открытии popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkRedditPage();
  await updateStatus();
  
  // Установка обработчиков событий
  document.getElementById('startBtn').addEventListener('click', startBot);
  document.getElementById('stopBtn').addEventListener('click', stopBot);
  document.getElementById('testOllamaBtn').addEventListener('click', testOllamaConnection);
  document.getElementById('refreshModelsBtn').addEventListener('click', loadModelsFromOllama);
  
  // Сохранение настроек при изменении
  document.getElementById('ollamaUrl').addEventListener('change', () => {
    saveSettings();
    loadModelsFromOllama();
  });
  document.getElementById('model').addEventListener('change', saveSettings);
  document.getElementById('likePosts').addEventListener('change', saveSettings);
  document.getElementById('replyToComments').addEventListener('change', saveSettings);
  document.getElementById('joinCommunities').addEventListener('change', saveSettings);
  document.getElementById('delay').addEventListener('change', saveSettings);
  document.getElementById('maxReplies').addEventListener('change', saveSettings);
  document.getElementById('enableSubreddit').addEventListener('change', saveSettings);
  document.getElementById('subredditUrl').addEventListener('change', saveSettings);
  document.getElementById('subredditUrl').addEventListener('input', saveSettings);
  
  // Обработка чекбокса условий завершения сессии
  const enableSessionGoals = document.getElementById('enableSessionGoals');
  const sessionGoalsSettings = document.getElementById('sessionGoalsSettings');
  
  enableSessionGoals.addEventListener('change', function() {
    sessionGoalsSettings.style.display = this.checked ? 'block' : 'none';
    saveSettings();
  });
  
  // Сохранение настроек целей и интервалов
  document.getElementById('enableGoalLikes').addEventListener('change', saveSettings);
  document.getElementById('enableGoalComments').addEventListener('change', saveSettings);
  document.getElementById('enableGoalPosts').addEventListener('change', saveSettings);
  document.getElementById('enableGoalJoins').addEventListener('change', saveSettings);
  document.getElementById('goalLikes').addEventListener('change', saveSettings);
  document.getElementById('goalComments').addEventListener('change', saveSettings);
  document.getElementById('goalPosts').addEventListener('change', saveSettings);
  document.getElementById('goalJoins').addEventListener('change', saveSettings);
  document.getElementById('intervalBetweenComments').addEventListener('change', saveSettings);
  document.getElementById('intervalBetweenPosts').addEventListener('change', saveSettings);
});

// Обновление прогресса в интерфейсе
function updateProgress(progress) {
  const statusText = document.getElementById('statusText');
  if (statusText && progress) {
    const progressParts = [];
    if (progress.likes !== undefined) progressParts.push(`Лайки: ${progress.likes}`);
    if (progress.comments !== undefined) progressParts.push(`Комментарии: ${progress.comments}`);
    if (progress.posts !== undefined) progressParts.push(`Посты: ${progress.posts}`);
    if (progress.joins !== undefined) progressParts.push(`Вступления: ${progress.joins}`);
    const progressText = progressParts.join(', ');
    statusText.textContent = `Работает (${progressText})`;
  }
}

// Проверка, открыта ли страница Reddit
async function checkRedditPage() {
  try {
    // В веб-контексте проверяем родительское окно
    if (window.parent && window.parent !== window) {
      try {
        const parentUrl = window.parent.location.href;
        if (parentUrl.includes('reddit.com')) {
          return true;
        }
      } catch (e) {
        // Cross-origin error - это нормально
      }
    }
    
    // Проверяем, есть ли открытая вкладка Reddit
    addLog('Откройте страницу Reddit для работы бота', 'error');
    return false;
  } catch (error) {
    addLog('Откройте страницу Reddit для работы бота', 'error');
    return false;
  }
}

// Загрузка моделей из Ollama
async function loadModelsFromOllama() {
  const modelSelect = document.getElementById('model');
  const refreshBtn = document.getElementById('refreshModelsBtn');
  
  const currentValue = modelSelect.value;
  
  modelSelect.innerHTML = '<option value="">Загрузка моделей...</option>';
  refreshBtn.disabled = true;
  refreshBtn.textContent = '⏳';
  
  try {
    const ollamaUrl = document.getElementById('ollamaUrl').value;
    
    const response = await sendMessageToBackground('checkOllama', { ollamaUrl });
    
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄';
    
    if (response && response.success && response.available && response.models) {
      const models = response.models;
      
      if (models.length === 0) {
        modelSelect.innerHTML = '<option value="">Нет установленных моделей</option>';
        addLog('В Ollama не установлено ни одной модели', 'error');
      } else {
        modelSelect.innerHTML = '';
        
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          option.textContent = model.name;
          modelSelect.appendChild(option);
        });
        
        if (currentValue) {
          const exactMatch = models.find(m => m.name === currentValue);
          if (exactMatch) {
            modelSelect.value = exactMatch.name;
          } else {
            const currentBase = currentValue.split(':')[0].toLowerCase();
            const baseMatch = models.find(m => {
              const mBase = m.name.split(':')[0].toLowerCase();
              return mBase === currentBase;
            });
            if (baseMatch) {
              modelSelect.value = baseMatch.name;
            } else if (models.length > 0) {
              modelSelect.value = models[0].name;
            }
          }
        } else if (models.length > 0) {
          const llama32 = models.find(m => {
            const mBase = m.name.split(':')[0].toLowerCase();
            return mBase === 'llama3.2';
          });
          if (llama32) {
            modelSelect.value = 'llama3.2';
          } else {
            modelSelect.value = models[0].name;
          }
        }
        
        saveSettings();
        addLog(`Загружено моделей: ${models.length}`, 'success');
      }
    } else {
      modelSelect.innerHTML = '<option value="">Ollama недоступен</option>';
      addLog('Ollama недоступен. Убедитесь, что Ollama запущен.', 'error');
    }
  } catch (error) {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄';
    modelSelect.innerHTML = '<option value="">Ошибка</option>';
    addLog('Ошибка при загрузке моделей: ' + error.message, 'error');
  }
}

// Загрузка настроек
async function loadSettings() {
  try {
    const result = await storage.get('settings');
    if (result.settings) {
      const settings = result.settings;
      document.getElementById('ollamaUrl').value = settings.ollamaUrl || 'http://127.0.0.1:11434';
      document.getElementById('likePosts').checked = settings.likePosts !== false;
      document.getElementById('replyToComments').checked = settings.replyToComments !== false;
      document.getElementById('joinCommunities').checked = settings.joinCommunities !== false;
      document.getElementById('delay').value = settings.delayBetweenActions || 2000;
      document.getElementById('maxReplies').value = settings.maxRepliesPerPage || 10;
      
      const enableSessionGoals = document.getElementById('enableSessionGoals');
      const sessionGoalsSettings = document.getElementById('sessionGoalsSettings');
      enableSessionGoals.checked = settings.enableSessionGoals === true;
      sessionGoalsSettings.style.display = enableSessionGoals.checked ? 'block' : 'none';
      document.getElementById('enableGoalLikes').checked = settings.enableGoalLikes !== false;
      document.getElementById('enableGoalComments').checked = settings.enableGoalComments !== false;
      document.getElementById('enableGoalPosts').checked = settings.enableGoalPosts !== false;
      document.getElementById('enableGoalJoins').checked = settings.enableGoalJoins !== false;
      document.getElementById('goalLikes').value = settings.goalLikes || 0;
      document.getElementById('goalComments').value = settings.goalComments || 0;
      document.getElementById('goalPosts').value = settings.goalPosts || 0;
      document.getElementById('goalJoins').value = settings.goalJoins || 0;
      document.getElementById('intervalBetweenComments').value = settings.intervalBetweenComments || 0;
      document.getElementById('intervalBetweenPosts').value = settings.intervalBetweenPosts || 0;
      
      document.getElementById('enableSubreddit').checked = settings.enableSubreddit === true;
      document.getElementById('subredditUrl').value = settings.subredditUrl || '';
      
      await loadModelsFromOllama();
    } else {
      await loadModelsFromOllama();
    }
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error);
    await loadModelsFromOllama();
  }
}

// Сохранение настроек
async function saveSettings() {
  const settings = {
    ollamaUrl: document.getElementById('ollamaUrl').value,
    model: document.getElementById('model').value,
    likePosts: document.getElementById('likePosts').checked,
    replyToComments: document.getElementById('replyToComments').checked,
    joinCommunities: document.getElementById('joinCommunities').checked,
    delayBetweenActions: parseInt(document.getElementById('delay').value) || 2000,
    maxRepliesPerPage: parseInt(document.getElementById('maxReplies').value) || 10,
    enableSessionGoals: document.getElementById('enableSessionGoals').checked,
    enableGoalLikes: document.getElementById('enableGoalLikes').checked,
    enableGoalComments: document.getElementById('enableGoalComments').checked,
    enableGoalPosts: document.getElementById('enableGoalPosts').checked,
    enableGoalJoins: document.getElementById('enableGoalJoins').checked,
    goalLikes: parseInt(document.getElementById('goalLikes').value) || 0,
    goalComments: parseInt(document.getElementById('goalComments').value) || 0,
    goalPosts: parseInt(document.getElementById('goalPosts').value) || 0,
    goalJoins: parseInt(document.getElementById('goalJoins').value) || 0,
    intervalBetweenComments: parseInt(document.getElementById('intervalBetweenComments').value) || 0,
    intervalBetweenPosts: parseInt(document.getElementById('intervalBetweenPosts').value) || 0,
    enableSubreddit: document.getElementById('enableSubreddit').checked,
    subredditUrl: document.getElementById('subredditUrl').value || ''
  };
  
  await storage.set({ settings });
}

// Запуск бота
async function startBot() {
  try {
    await saveSettings();
    
    // Открываем Reddit в новой вкладке, если еще не открыт
    const redditUrl = window.parent?.location?.href?.includes('reddit.com') 
      ? window.parent.location.href 
      : 'https://www.reddit.com';
    
    // Отправляем сообщение родительскому окну для открытия Reddit
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'openReddit', url: redditUrl }, '*');
    }
    
    addLog('Откройте страницу Reddit для работы бота', 'info');
    addLog('Установите расширение ADS REDDIT в Chrome для автоматической работы', 'info');
    
    isRunning = true;
    updateStatus();
  } catch (error) {
    addLog('Ошибка запуска бота: ' + error.message, 'error');
  }
}

// Остановка бота
function stopBot() {
  isRunning = false;
  updateStatus();
  addLog('Бот остановлен', 'info');
}

// Обновление статуса
function updateStatus() {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  if (isRunning) {
    statusIndicator.className = 'status-indicator running';
    statusText.textContent = 'Работает';
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusIndicator.className = 'status-indicator stopped';
    statusText.textContent = 'Остановлен';
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// Тест подключения к Ollama
async function testOllamaConnection() {
  const ollamaUrl = document.getElementById('ollamaUrl').value;
  addLog('Проверка подключения к Ollama...', 'info');
  
  try {
    const response = await sendMessageToBackground('checkOllama', { ollamaUrl });
    
    if (response && response.success && response.available) {
      addLog('✓ Ollama доступен', 'success');
      if (response.models && response.models.length > 0) {
        addLog(`Доступно моделей: ${response.models.length}`, 'success');
      }
    } else {
      addLog('✗ Ollama недоступен: ' + (response.error || 'неизвестная ошибка'), 'error');
    }
  } catch (error) {
    addLog('Ошибка проверки подключения: ' + error.message, 'error');
  }
}

// Добавление записи в лог
function addLog(message, type = 'info') {
  const log = document.getElementById('log');
  if (!log) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${timestamp}] ${message}`;
  
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  
  // Ограничиваем количество записей
  while (log.children.length > 100) {
    log.removeChild(log.firstChild);
  }
}






