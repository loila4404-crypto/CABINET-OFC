// Popup script для расширения Reddit Cabinet

console.log('🚀 Popup script загружен');

let parsedData = null;
const API_URL = 'http://localhost:3000'; // Измените на ваш URL в продакшене

// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM загружен');
  initExtension();
});

function initExtension() {
  // Элементы DOM
  const parseBtn = document.getElementById('parse-btn');
  const copyBtn = document.getElementById('copy-btn');
  const statusDiv = document.getElementById('status');
  const dataDisplay = document.getElementById('data-display');

  // Проверяем, что элементы найдены
  console.log('✅ Элементы DOM:', {
    parseBtn: !!parseBtn,
    copyBtn: !!copyBtn,
    statusDiv: !!statusDiv,
    dataDisplay: !!dataDisplay
  });

  if (!parseBtn) {
    console.error('❌ Кнопка parse-btn не найдена!');
    return;
  }

  if (!statusDiv) {
    console.error('❌ Элемент status не найден!');
    return;
  }

  // Кнопка извлечения данных
  parseBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔘 Кнопка нажата!');
    
    try {
      parseBtn.disabled = true;
      parseBtn.textContent = '⏳ Извлечение...';
      statusDiv.style.display = 'none';

      // Получаем активную вкладку
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📑 Активная вкладка:', tab.url);
      
      if (!tab.url.includes('reddit.com/user/')) {
        showStatus('Откройте страницу профиля Reddit (reddit.com/user/username)', 'error');
        parseBtn.disabled = false;
        parseBtn.textContent = '🔍 Извлечь и отправить данные';
        return;
      }

      // Используем chrome.tabs.sendMessage вместо chrome.scripting.executeScript (как в расширении для Tinder)
      let parsedData;
      try {
        console.log('🔍 Отправляем сообщение в content script...');
        
        // Отправляем сообщение в content script
        const response = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, { action: 'fetchData' }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('⚠️ Content script не отвечает, пытаемся загрузить его...');
              // Если content script не загружен, загружаем его
              chrome.scripting.executeScript({
          target: { tabId: tab.id },
                files: ['content.js']
              }).then(() => {
                // Ждем немного для загрузки
                setTimeout(() => {
                  // Пробуем снова
                  chrome.tabs.sendMessage(tab.id, { action: 'fetchData' }, (retryResponse) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error('Не удалось связаться с content script: ' + chrome.runtime.lastError.message));
                    } else {
                      resolve(retryResponse);
                    }
                  });
                }, 500);
              }).catch(reject);
            } else {
              resolve(response);
            }
          });
        });
        
        console.log('📊 Ответ от content script:', response);
        
        if (response && response.success && response.data) {
          parsedData = response.data;
          
          // ВСЕГДА пытаемся получить cookies через chrome.cookies API (это более надежный способ)
          // document.cookie может не содержать HttpOnly cookies
          try {
            console.log('🍪 Получение cookies через chrome.cookies API...');
            
            // Получаем cookies со всех доменов Reddit (www.reddit.com, reddit.com, old.reddit.com)
            const allCookies = await chrome.cookies.getAll({ domain: '.reddit.com' });
            console.log('🍪 Всего cookies найдено через chrome.cookies API для .reddit.com:', allCookies.length);
            
            // Также пробуем получить cookies для конкретных доменов
            const wwwCookies = await chrome.cookies.getAll({ domain: 'www.reddit.com' });
            const redditCookies = await chrome.cookies.getAll({ domain: 'reddit.com' });
            console.log('🍪 Cookies для www.reddit.com:', wwwCookies.length);
            console.log('🍪 Cookies для reddit.com:', redditCookies.length);
            
            // Объединяем все cookies (убираем дубликаты)
            const cookiesMap = new Map();
            [...allCookies, ...wwwCookies, ...redditCookies].forEach(cookie => {
              const key = `${cookie.domain}:${cookie.name}`;
              if (!cookiesMap.has(key)) {
                cookiesMap.set(key, cookie);
              }
            });
            const cookies = Array.from(cookiesMap.values());
            console.log('🍪 Всего уникальных cookies после объединения:', cookies.length);
            
            // Логируем ВСЕ найденные cookies для диагностики
            console.log('🍪 Список всех найденных cookies:');
            cookies.forEach(cookie => {
              console.log(`   - ${cookie.name} (${cookie.domain}${cookie.path})`, cookie.value.substring(0, 30) + '...');
            });
            
            // Пробуем получить reddit_session напрямую из текущей вкладки
            // Это может помочь, если cookie HttpOnly или находится на конкретном пути
            try {
              console.log('🔍 Попытка получить reddit_session напрямую из текущей вкладки...');
              const tabUrl = tab.url;
              const urlObj = new URL(tabUrl);
              
              // Пробуем разные варианты получения reddit_session
              const sessionCookie1 = await chrome.cookies.get({
                url: tabUrl,
                name: 'reddit_session'
              }).catch(() => null);
              
              const sessionCookie2 = await chrome.cookies.get({
                url: `https://${urlObj.hostname}`,
                name: 'reddit_session'
              }).catch(() => null);
              
              const sessionCookie3 = await chrome.cookies.get({
                url: `https://www.reddit.com`,
                name: 'reddit_session'
              }).catch(() => null);
              
              const sessionCookie4 = await chrome.cookies.get({
                url: `https://reddit.com`,
                name: 'reddit_session'
              }).catch(() => null);
              
              // Используем первый найденный reddit_session
              const sessionCookie = sessionCookie1 || sessionCookie2 || sessionCookie3 || sessionCookie4;
              
              if (sessionCookie && sessionCookie.value && sessionCookie.value.length > 20) {
                console.log('✅ reddit_session найден напрямую через chrome.cookies.get()!');
                console.log(`   Длина токена: ${sessionCookie.value.length} символов`);
                console.log(`   Домен: ${sessionCookie.domain}`);
                console.log(`   Путь: ${sessionCookie.path}`);
                
                // Добавляем reddit_session в allCookies, если его там нет
                if (!parsedData.tokens.allCookies['reddit_session']) {
                  parsedData.tokens.allCookies['reddit_session'] = sessionCookie.value;
                  parsedData.tokens.sessionCookie = sessionCookie.value;
                  parsedData.tokens.fullToken = sessionCookie.value;
                  console.log('✅ reddit_session добавлен в allCookies');
                }
              } else {
                console.warn('⚠️ reddit_session не найден через chrome.cookies.get()');
              }
            } catch (directError) {
              console.warn('⚠️ Ошибка при прямом получении reddit_session:', directError);
            }
            
            // Список важных cookies для Reddit
            const importantCookieNames = [
              'reddit_session', // Основной токен сессии
              'csrf_token', // CSRF токен
              'session_tracker', // Трекер сессии
              'reddit_lo', // Reddit login cookie
              'edgebucket', // Edge bucket
              'loid', // Reddit loid
              'loidcreated', // Reddit loid created
            ];
            
            // Инициализируем tokens, если их нет
            if (!parsedData.tokens) {
              parsedData.tokens = {
                allCookies: {},
                cookieString: null,
                fullToken: null,
                sessionCookie: null,
              };
            }
            
            // Если allCookies не инициализирован, создаем его
            if (!parsedData.tokens.allCookies) {
              parsedData.tokens.allCookies = {};
            }
            
            // Собираем все важные cookies
            let foundSessionCookie = false;
            for (const cookie of cookies) {
              const cookieName = cookie.name.toLowerCase();
              
              // Сохраняем все важные cookies
              if (importantCookieNames.includes(cookie.name.toLowerCase()) || 
                  cookieName.includes('session') || 
                  cookieName.includes('token') ||
                  cookieName.includes('csrf')) {
                
                parsedData.tokens.allCookies[cookie.name] = cookie.value;
                console.log(`🍪 Найден важный cookie через chrome.cookies API: ${cookie.name}`, cookie.value.substring(0, 50) + '...');
                
                // reddit_session - основной токен
                if (cookie.name === 'reddit_session' && cookie.value && cookie.value.length > 20) {
                  parsedData.tokens.sessionCookie = cookie.value;
                  parsedData.tokens.fullToken = cookie.value;
                  foundSessionCookie = true;
                  console.log(`✅ Найден основной session cookie через chrome.cookies API: ${cookie.name}`, cookie.value.substring(0, 50) + '...');
                  console.log(`   Длина токена: ${cookie.value.length} символов`);
                  console.log(`   Домен: ${cookie.domain}`);
                  console.log(`   Путь: ${cookie.path}`);
                }
              }
            }
            
            // Если reddit_session не найден, ищем альтернативные варианты
            if (!foundSessionCookie) {
              console.warn('⚠️ reddit_session не найден, ищем альтернативные варианты...');
              for (const cookie of cookies) {
                const cookieName = cookie.name.toLowerCase();
                // Ищем любые cookies, содержащие "session" или "auth"
                if ((cookieName.includes('session') || cookieName.includes('auth')) && cookie.value && cookie.value.length > 20) {
                  console.log(`🔍 Найден потенциальный session cookie: ${cookie.name}`, cookie.value.substring(0, 50) + '...');
                  if (!parsedData.tokens.sessionCookie) {
                    parsedData.tokens.sessionCookie = cookie.value;
                    parsedData.tokens.fullToken = cookie.value;
                    console.log(`⚠️ Используем альтернативный session cookie: ${cookie.name}`);
                  }
                }
              }
            }
            
            // Формируем полную строку cookies для использования в запросах
            // ВАЖНО: reddit_session должен быть первым в строке для правильной аутентификации
            if (Object.keys(parsedData.tokens.allCookies).length > 0) {
              const cookiesArray = Object.entries(parsedData.tokens.allCookies);
              
              // Сортируем cookies: reddit_session должен быть первым
              cookiesArray.sort(([name1], [name2]) => {
                if (name1 === 'reddit_session') return -1;
                if (name2 === 'reddit_session') return 1;
                return 0;
              });
              
              parsedData.tokens.cookieString = cookiesArray
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
              
              console.log('✅ Сформирована полная строка cookies через chrome.cookies API');
              console.log('   Длина cookieString:', parsedData.tokens.cookieString.length);
              console.log('   Первые 100 символов:', parsedData.tokens.cookieString.substring(0, 100));
              console.log('   Содержит reddit_session:', parsedData.tokens.cookieString.includes('reddit_session'));
              
              // Если reddit_session все еще отсутствует, предупреждаем
              if (!parsedData.tokens.cookieString.includes('reddit_session')) {
                console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: cookieString не содержит reddit_session!');
                console.error('   Это приведет к ошибке "Доступ запрещен"');
                console.error('   Попробуйте:');
                console.error('   1. Перезагрузить страницу Reddit');
                console.error('   2. Выйти и войти заново в Reddit');
                console.error('   3. Проверить, что вы залогинены на правильном аккаунте');
                console.error('   4. Открыть DevTools (F12) → Application → Cookies → найти reddit_session вручную');
              }
            }
            
            // Если не нашли reddit_session через chrome.cookies, но есть через document.cookie, используем его
            if (!foundSessionCookie && parsedData.tokens.fullToken && parsedData.tokens.fullToken.length > 20) {
              console.log('⚠️ reddit_session не найден через chrome.cookies, но есть через document.cookie');
              console.log('   Используем токен из document.cookie, длина:', parsedData.tokens.fullToken.length);
            } else if (!foundSessionCookie) {
              console.error('❌ reddit_session НЕ НАЙДЕН ни через chrome.cookies, ни через document.cookie!');
              console.error('   Убедитесь, что вы залогинены в Reddit на этой вкладке');
              console.error('   Найденные cookies:', Object.keys(parsedData.tokens.allCookies || {}).join(', '));
              
              // Если есть другие cookies, все равно формируем строку, но предупреждаем
              if (Object.keys(parsedData.tokens.allCookies || {}).length > 0) {
                console.warn('⚠️ ВНИМАНИЕ: reddit_session отсутствует, но есть другие cookies');
                console.warn('   Это может привести к ошибке "Доступ запрещен" при использовании токена');
                console.warn('   Попробуйте:');
                console.warn('   1. Перезагрузить страницу Reddit');
                console.warn('   2. Выйти и войти заново в Reddit');
                console.warn('   3. Проверить, что вы залогинены на правильном аккаунте');
              }
            }
            
            // Проверяем, что cookieString содержит reddit_session
            if (parsedData.tokens.cookieString && !parsedData.tokens.cookieString.includes('reddit_session')) {
              console.error('❌ ВНИМАНИЕ: cookieString не содержит reddit_session!');
              console.error('   Это может привести к ошибке "Доступ запрещен"');
              console.error('   Текущая cookieString:', parsedData.tokens.cookieString.substring(0, 200));
            }
            
          } catch (cookieError) {
            console.error('❌ Ошибка получения cookies через chrome.cookies API:', cookieError);
            console.error('   Попробуйте перезагрузить страницу Reddit и попробовать снова');
          }
          
          // Проверяем, что fullToken установлен
          if (parsedData.tokens?.fullToken) {
            console.log('✅ Полный токен установлен, длина:', parsedData.tokens.fullToken.length);
            console.log('🍪 Первые 50 символов:', parsedData.tokens.fullToken.substring(0, 50));
            console.log('🍪 Последние 50 символов:', parsedData.tokens.fullToken.substring(Math.max(0, parsedData.tokens.fullToken.length - 50)));
            console.log('🔑 Токен будет использован для удаленного входа в аккаунт Reddit');
            
            // Проверяем также cookieString
            if (parsedData.tokens.cookieString) {
              console.log('✅ Полная строка cookies установлена, длина:', parsedData.tokens.cookieString.length);
              console.log('🍪 Содержит reddit_session:', parsedData.tokens.cookieString.includes('reddit_session'));
              console.log('🍪 Содержит csrf_token:', parsedData.tokens.cookieString.includes('csrf_token'));
            }
          } else {
            console.error('❌ Полный токен НЕ установлен!');
            console.error('   Возможные причины:');
            console.error('   1. Вы не залогинены в Reddit на этой вкладке');
            console.error('   2. Cookies заблокированы браузером');
            console.error('   3. Расширение не имеет прав на доступ к cookies');
            console.error('   Попробуйте:');
            console.error('   - Перезагрузить страницу Reddit');
            console.error('   - Убедиться, что вы залогинены');
            console.error('   - Проверить права расширения в chrome://extensions');
          }
        } else {
          throw new Error('Content script вернул ошибку: ' + (response?.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('❌ Ошибка получения данных:', error);
        throw new Error('Не удалось получить данные: ' + error.message);
      }

      if (parsedData) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ ДАННЫЕ ИЗВЛЕЧЕНЫ ИЗ REDDIT');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Username:', parsedData.username);
        console.log('Followers:', parsedData.followers);
        console.log('Karma:', parsedData.karma);
        console.log('Account Age:', parsedData.accountAge, 'дней');
        console.log('Contributions:', parsedData.contributions);
        console.log('Comments:', parsedData.comments);
        console.log('Posts:', parsedData.posts);
        console.log('Gold Earned:', parsedData.goldEarned);
        console.log('Active In:', parsedData.activeIn);
        console.log('Reddit URL:', parsedData.redditUrl);
        console.log('Есть токен:', !!parsedData.tokens?.fullToken);
        console.log('═══════════════════════════════════════════════════════');
        displayData(parsedData);
        if (copyBtn) {
          copyBtn.disabled = false;
          copyBtn.style.display = 'block';
        }
        
        // Автоматически отправляем данные на сайт
        parseBtn.textContent = '⏳ Отправка...';
        console.log('📤 Начинаем отправку данных на сайт...');
        
        // Добавляем флаг, чтобы избежать двойной отправки
        if (!parsedData._sending) {
          parsedData._sending = true;
          try {
            await sendDataToCabinet(parsedData);
          } finally {
            parsedData._sending = false;
          }
        } else {
          console.log('⚠️ Данные уже отправляются, пропускаем...');
        }
        
        parseBtn.textContent = '✅ Готово!';
      } else {
        console.error('❌ Не удалось извлечь данные, results:', results);
        showStatus('❌ Не удалось извлечь данные. Убедитесь, что вы на странице профиля Reddit.', 'error');
      }
    } catch (error) {
      console.error('❌ Ошибка извлечения данных:', error);
      showStatus('❌ Ошибка: ' + error.message, 'error');
    } finally {
      parseBtn.disabled = false;
      if (parseBtn.textContent !== '✅ Готово!') {
        parseBtn.textContent = '🔍 Извлечь и отправить данные';
      }
    }
  });

  // Кнопка копирования данных
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!parsedData) {
        showStatus('❌ Сначала извлеките данные', 'error');
        return;
      }

      const dataText = JSON.stringify(parsedData, null, 2);
      navigator.clipboard.writeText(dataText).then(() => {
        showStatus('✅ Данные скопированы в буфер обмена!', 'success');
      }).catch(err => {
        showStatus('❌ Ошибка копирования: ' + err.message, 'error');
      });
    });
  }

  // Функция отображения данных
  function displayData(data) {
    if (!dataDisplay) return;
    
    document.getElementById('username-display').textContent = data.username || '-';
    document.getElementById('followers-display').textContent = data.followers || 0;
    document.getElementById('karma-display').textContent = data.karma || 0;
    document.getElementById('age-display').textContent = data.accountAge ? `${data.accountAge} дн.` : '-';
    document.getElementById('contributions-display').textContent = data.contributions || 0;
    
    // Отображаем Gold Earned и Active In
    const goldEarnedDisplay = document.getElementById('gold-earned-display');
    if (goldEarnedDisplay) {
      goldEarnedDisplay.textContent = data.goldEarned !== undefined ? data.goldEarned : 0;
    }
    
    const activeInDisplay = document.getElementById('active-in-display');
    if (activeInDisplay) {
      if (data.activeIn && data.activeIn > 0) {
        activeInDisplay.textContent = data.activeIn > 5 ? '> 5' : data.activeIn;
      } else {
        activeInDisplay.textContent = '0';
      }
    }
    
    // Отображаем токен, если он найден
    if (data.tokens) {
      const tokenDisplay = document.getElementById('token-display');
      const tokenValue = document.getElementById('token-value');
      const copyTokenBtn = document.getElementById('copy-token-btn');
      
      if (tokenDisplay && tokenValue) {
        // Приоритет: cookieString (полная строка cookies) > fullToken > sessionCookie > другие
        let foundToken = null;
        let tokenType = '';
        
        if (data.tokens.cookieString && data.tokens.cookieString.length > 50) {
          foundToken = data.tokens.cookieString;
          tokenType = 'Полная строка cookies';
        } else if (data.tokens.fullToken && data.tokens.fullToken.length > 20) {
          foundToken = data.tokens.fullToken;
          tokenType = 'Полный токен';
        } else if (data.tokens.sessionCookie && data.tokens.sessionCookie.length > 20) {
          foundToken = data.tokens.sessionCookie;
          tokenType = 'Session cookie';
        } else if (data.tokens.accessToken && data.tokens.accessToken.length > 20) {
          foundToken = data.tokens.accessToken;
          tokenType = 'Access token';
        } else if (data.tokens.localStorageToken && data.tokens.localStorageToken.length > 20) {
          foundToken = data.tokens.localStorageToken;
          tokenType = 'LocalStorage token';
        }
        
        if (foundToken) {
          tokenDisplay.style.display = 'block';
          console.log(`🔑 Токен для отображения (${tokenType}), длина:`, foundToken.length);
          console.log('🔑 Первые 50 символов:', foundToken.substring(0, 50));
          console.log('🔑 Последние 50 символов:', foundToken.substring(Math.max(0, foundToken.length - 50)));
          
          // Показываем полный токен (можно скрыть часть для безопасности)
          const displayToken = foundToken.length > 100 
            ? foundToken.substring(0, 50) + '...' + foundToken.substring(foundToken.length - 20)
            : foundToken;
          tokenValue.textContent = displayToken;
          tokenValue.title = `${tokenType} (${foundToken.length} символов): ${foundToken}`; // Полный токен в tooltip
          
          // Сохраняем полный токен в data-атрибут для копирования
          tokenValue.setAttribute('data-full-token', foundToken);
          console.log(`✅ Токен (${tokenType}) сохранен в data-атрибут, длина:`, foundToken.length);
          
          // Добавляем обработчик кнопки копирования токена
          if (copyTokenBtn) {
            copyTokenBtn.onclick = () => {
              // Используем cookieString, если доступен (это полная строка cookies)
              // Иначе используем сохраненный токен
              const tokenToCopy = data.tokens.cookieString && data.tokens.cookieString.length > 50
                ? data.tokens.cookieString
                : (tokenValue.getAttribute('data-full-token') || foundToken);
              
              console.log(`📋 Копирование токена (${tokenToCopy === data.tokens.cookieString ? 'полная строка cookies' : tokenType}), длина:`, tokenToCopy.length);
              console.log('📋 Первые 50 символов:', tokenToCopy.substring(0, 50));
              console.log('📋 Последние 50 символов:', tokenToCopy.substring(Math.max(0, tokenToCopy.length - 50)));
              
              if (tokenToCopy.length < 50) {
                console.warn('⚠️ ВНИМАНИЕ: Токен очень короткий! Возможно, он обрезан.');
              }
              
              navigator.clipboard.writeText(tokenToCopy).then(() => {
                console.log('✅ Токен успешно скопирован в буфер обмена, длина:', tokenToCopy.length);
                copyTokenBtn.textContent = '✅ Скопировано!';
                setTimeout(() => {
                  copyTokenBtn.textContent = '📋 Копировать';
                }, 2000);
              }).catch(err => {
                console.error('❌ Ошибка копирования токена:', err);
                copyTokenBtn.textContent = '❌ Ошибка';
                setTimeout(() => {
                  copyTokenBtn.textContent = '📋 Копировать';
                }, 2000);
              });
            };
          }
        } else {
          tokenDisplay.style.display = 'none';
        }
      }
    }
    
    dataDisplay.style.display = 'block';
  }

  // Функция показа статуса
  function showStatus(message, type) {
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }

  // Глобальный флаг для предотвращения двойной отправки
  let isSendingData = false;
  
  // Функция отправки данных на сайт Reddit Cabinet
  async function sendDataToCabinet(data) {
    // Проверяем, не отправляются ли данные уже
    if (isSendingData) {
      console.log('⚠️ Данные уже отправляются (глобальный флаг), пропускаем...');
      return;
    }
    
    if (data._sending) {
      console.log('⚠️ Данные уже отправляются (флаг _sending), пропускаем...');
      return;
    }
    
    try {
      isSendingData = true; // Устанавливаем глобальный флаг
      data._sending = true; // Устанавливаем флаг на объекте
      console.log('📤 Отправка данных на сайт...', data);
      showStatus('⏳ Отправка данных на сайт...', 'success');
      
      // Получаем токен авторизации с сайта Reddit Cabinet
      console.log('🔑 Получение токена авторизации...');
      const token = await getAuthTokenFromCabinet();
      console.log('Токен получен:', token ? '✓' : '✗');
      
      if (!token) {
        console.warn('⚠️ Токен не найден');
        showStatus('⚠️ Вы не авторизованы. Откройте Reddit Cabinet в другой вкладке и войдите, затем попробуйте снова.', 'error');
        // Не открываем новую вкладку автоматически
        isSendingData = false;
        if (data) {
          data._sending = false;
        }
        return;
      }

      // Используем полную строку cookies (если доступна) или fullToken
      // Reddit требует несколько cookies для полной аутентификации
      let redditToken = null;
      
      // Приоритет 1: Полная строка cookies (содержит все необходимые cookies)
      if (data.tokens?.cookieString && data.tokens.cookieString.length > 50) {
        redditToken = data.tokens.cookieString;
        console.log('✅ Используется полная строка cookies (несколько cookies)');
        console.log('   Длина:', redditToken.length);
        console.log('   Первые 100 символов:', redditToken.substring(0, 100));
        console.log('   Содержит reddit_session:', redditToken.includes('reddit_session'));
        console.log('   Содержит csrf_token:', redditToken.includes('csrf_token'));
        
        // Проверяем наличие reddit_session
        if (!redditToken.includes('reddit_session')) {
          console.error('❌ ВНИМАНИЕ: cookieString не содержит reddit_session!');
          console.error('   Это может привести к ошибке "Доступ запрещен"');
          console.error('   Попробуйте перезагрузить страницу Reddit и извлечь токен заново');
          showStatus('⚠️ ВНИМАНИЕ: Токен не содержит reddit_session. Это может привести к ошибке. Попробуйте перезагрузить страницу Reddit и извлечь токен заново.', 'error');
        }
      }
      // Приоритет 2: fullToken (основной токен)
      else if (data.tokens?.fullToken && data.tokens.fullToken.length > 50) {
        redditToken = data.tokens.fullToken;
        console.log('✅ Используется fullToken');
      }
      // Приоритет 3: sessionCookie
      else if (data.tokens?.sessionCookie && data.tokens.sessionCookie.length > 50) {
        redditToken = data.tokens.sessionCookie;
        console.log('✅ Используется sessionCookie');
      }
      // Приоритет 4: Другие токены
      else {
        redditToken = data.tokens?.accessToken || data.tokens?.localStorageToken;
        console.log('⚠️ Используется альтернативный токен');
      }
      
      console.log('Reddit токен:', redditToken ? `✓ Найден (длина: ${redditToken.length})` : '✗ Не найден');
      if (redditToken) {
        console.log('   Первые 50 символов:', redditToken.substring(0, 50));
        console.log('   Последние 50 символов:', redditToken.substring(Math.max(0, redditToken.length - 50)));
        
        // Если токен слишком короткий, предупреждаем
        if (redditToken.length < 50) {
          console.warn('⚠️ ВНИМАНИЕ: Токен очень короткий! Возможно, он обрезан.');
        }
      } else {
        console.error('❌ Токен не найден! Проверьте, что вы залогинены в Reddit.');
      }

      const payload = {
        username: data.username,
        redditUrl: data.redditUrl,
        token: redditToken,
        stats: {
          followers: data.followers || 0,
          karma: data.karma || 0,
          accountAge: data.accountAge || 0,
          contributions: data.contributions || 0,
          comments: data.comments || 0,
          posts: data.posts || 0,
          goldEarned: data.goldEarned || 0,
          activeIn: data.activeIn || 0,
          avatarUrl: data.avatarUrl || null, // Добавляем URL аватара
        }
      };

      console.log('═══════════════════════════════════════════════════════');
      console.log('📦 ОТПРАВЛЯЕМ ДАННЫЕ НА СЕРВЕР');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Username:', payload.username);
      console.log('Reddit URL:', payload.redditUrl);
      console.log('Есть токен:', !!payload.token);
      console.log('Статистика:');
      console.log('   Followers:', payload.stats.followers);
      console.log('   Karma:', payload.stats.karma);
      console.log('   Account Age:', payload.stats.accountAge);
      console.log('   Contributions:', payload.stats.contributions);
      console.log('   Comments:', payload.stats.comments);
      console.log('   Posts:', payload.stats.posts);
      console.log('   Gold Earned:', payload.stats.goldEarned);
      console.log('   Active In:', payload.stats.activeIn);
      console.log('   Avatar URL:', payload.stats.avatarUrl || 'не найден');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📦 Полный payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/api/accounts/from-extension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Ответ получен, статус:', response.status);

      const responseData = await response.json();
      console.log('📥 Данные ответа:', responseData);

      if (response.ok) {
        // Сохраняем токен для будущих запросов
        try {
          await chrome.storage.local.set({ redditCabinetToken: token });
          console.log('✅ Токен сохранен в storage');
        } catch (storageError) {
          console.warn('⚠️ Не удалось сохранить токен в storage:', storageError);
        }
        
        showStatus('✅ Аккаунт успешно добавлен в кабинет!', 'success');
        // Не открываем дашборд автоматически - пользователь может открыть сам
        // Показываем сообщение, что данные добавлены
        setTimeout(() => {
          showStatus('✅ Данные добавлены! Откройте Reddit Cabinet чтобы увидеть аккаунт.', 'success');
        }, 2000);
      } else {
        console.error('❌ Ошибка ответа:', responseData);
        showStatus('❌ Ошибка: ' + (responseData.error || responseData.details || 'Неизвестная ошибка'), 'error');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки данных:', error);
      showStatus('❌ Ошибка отправки: ' + error.message, 'error');
    } finally {
      // Снимаем флаги отправки
      isSendingData = false;
      if (data) {
        data._sending = false;
      }
      console.log('✅ Флаги отправки сброшены');
    }
  }

  // Функция получения токена авторизации с сайта Reddit Cabinet
  async function getAuthTokenFromCabinet() {
    try {
      // Сначала проверяем storage расширения (быстрее и надежнее)
      try {
        const stored = await chrome.storage.local.get(['redditCabinetToken']);
        if (stored.redditCabinetToken) {
          console.log('✅ Токен из storage расширения:', '✓ Найден');
          return stored.redditCabinetToken;
        }
      } catch (storageError) {
        console.warn('⚠️ Не удалось получить токен из storage:', storageError);
      }
      
      console.log('🔍 Поиск открытых вкладок с Reddit Cabinet...');
      // Ищем открытую вкладку с сайтом Reddit Cabinet
      const tabs = await chrome.tabs.query({ url: `${API_URL}/*` });
      console.log('Найдено вкладок:', tabs.length);
      
      if (tabs.length > 0) {
        const tab = tabs[0];
        console.log('Получаем токен из вкладки:', tab.id);
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              return localStorage.getItem('token');
            }
          });
          const token = results[0]?.result || null;
          console.log('Токен из localStorage:', token ? '✓ Найден' : '✗ Не найден');
          
          // Сохраняем токен в storage для будущих запросов
          if (token) {
            await chrome.storage.local.set({ redditCabinetToken: token });
            console.log('✅ Токен сохранен в storage расширения');
          }
          
          return token;
        } catch (scriptError) {
          console.error('❌ Ошибка выполнения скрипта:', scriptError);
          return null;
        }
      }
      
      console.log('⚠️ Вкладка с Reddit Cabinet не найдена и токен не сохранен');
      return null;
    } catch (error) {
      console.error('❌ Ошибка получения токена:', error);
      return null;
    }
  }

  // Слушаем сообщения от content script
  // ВАЖНО: Не отправляем данные автоматически здесь, так как они уже отправляются при нажатии кнопки
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REDDIT_DATA') {
      parsedData = message.data;
      displayData(parsedData);
      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.style.display = 'block';
      }
      // НЕ отправляем данные здесь - они уже отправляются при нажатии кнопки в popup
      // Это предотвращает двойную отправку данных
      console.log('📥 Получены данные от content script, но не отправляем автоматически (отправка происходит при нажатии кнопки)');
      sendResponse({ success: true });
    }
    return true;
  });

  console.log('✅ Расширение инициализировано');
}

// Если DOM уже загружен, инициализируем сразу
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен через событие');
    initExtension();
  });
} else {
  console.log('📄 DOM уже загружен');
  initExtension();
}
