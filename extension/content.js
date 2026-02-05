// Content script для парсинга данных Reddit профиля

(function() {
  'use strict';

  console.log('🔍 Reddit Cabinet: Content script загружен');

  // Функция для извлечения токена Reddit (улучшенная версия - извлекает ВСЕ важные cookies)
  function extractRedditToken() {
    const tokens = {
      sessionCookie: null,
      localStorageToken: null,
      accessToken: null,
      fullToken: null, // Полный токен для использования в API
      allCookies: {}, // Все важные cookies для полной аутентификации
      cookieString: null, // Полная строка cookies для использования в запросах
    };

    try {
      // 1. Пытаемся получить ВСЕ cookies из document.cookie (как в расширении для Tinder)
      try {
        const cookies = document.cookie.split(';');
        const importantCookieNames = [
          'reddit_session', // Основной токен сессии
          'csrf_token', // CSRF токен (важен для безопасности)
          'session_tracker', // Трекер сессии
          'reddit_lo', // Reddit login cookie
          'edgebucket', // Edge bucket
          'loid', // Reddit loid
          'loidcreated', // Reddit loid created
        ];
        
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            // Сохраняем все важные cookies
            if (importantCookieNames.includes(name.toLowerCase()) || 
                name.toLowerCase().includes('session') || 
                name.toLowerCase().includes('token') ||
                name.toLowerCase().includes('csrf')) {
              tokens.allCookies[name] = value;
              console.log(`🍪 Найден важный cookie: ${name}`, value.substring(0, 50) + '...');
              
              // reddit_session - основной токен
              if (name === 'reddit_session') {
                tokens.sessionCookie = value;
                tokens.fullToken = value; // Используем session cookie как основной токен
                console.log(`✅ Найден основной session cookie: ${name}`, value.substring(0, 50) + '...');
              }
            }
          }
        }
        
        // Формируем полную строку cookies для использования в запросах
        if (Object.keys(tokens.allCookies).length > 0) {
          tokens.cookieString = Object.entries(tokens.allCookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
          console.log('✅ Сформирована строка cookies для запросов:', tokens.cookieString.substring(0, 100) + '...');
        }
      } catch (cookieError) {
        console.warn('Не удалось получить cookies:', cookieError);
      }

      // 2. Пытаемся получить токен из localStorage (резервный вариант)
      const localStorageKeys = [
        'token', 
        'access_token', 
        'reddit_token', 
        'reddit_access_token',
        'reddit_session',
        'oauth_token',
        'bearer_token'
      ];
      for (const key of localStorageKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value && value.length > 20) {
            tokens.localStorageToken = value;
            if (!tokens.fullToken) {
              tokens.fullToken = value;
            }
            console.log(`Найден токен в localStorage[${key}]:`, value.substring(0, 50) + '...');
          }
        } catch (e) {
          // Игнорируем ошибки доступа к localStorage
        }
      }

      // 3. Пытаемся получить токен из sessionStorage (резервный вариант)
      for (const key of localStorageKeys) {
        try {
          const value = sessionStorage.getItem(key);
          if (value && value.length > 20) {
            tokens.accessToken = value;
            if (!tokens.fullToken) {
              tokens.fullToken = value;
            }
            console.log(`Найден токен в sessionStorage[${key}]:`, value.substring(0, 50) + '...');
          }
        } catch (e) {
          // Игнорируем ошибки доступа к sessionStorage
        }
      }

      // 4. Пытаемся найти токен в window объектах Reddit (резервный вариант)
      try {
        if (window.__r && window.__r.user && window.__r.user.token) {
          tokens.accessToken = window.__r.user.token;
          if (!tokens.fullToken) {
            tokens.fullToken = window.__r.user.token;
          }
          console.log('Найден токен в window.__r.user.token');
        }
        
        if (window.__r && window.__r.config && window.__r.config.accessToken) {
          tokens.accessToken = window.__r.config.accessToken;
          if (!tokens.fullToken) {
            tokens.fullToken = window.__r.config.accessToken;
          }
          console.log('Найден токен в window.__r.config.accessToken');
        }
      } catch (e) {
        console.warn('Ошибка доступа к window.__r:', e);
      }

      // 5. Ищем токен в глобальных переменных (резервный вариант)
      try {
        if (window.redditToken) {
          tokens.accessToken = window.redditToken;
          if (!tokens.fullToken) {
            tokens.fullToken = window.redditToken;
          }
          console.log('Найден токен в window.redditToken');
        }
      } catch (e) {
        // Игнорируем
      }

      // 6. Пытаемся найти токен в мета-тегах (резервный вариант)
      try {
        const metaToken = document.querySelector('meta[name="reddit-token"]');
        if (metaToken && metaToken.content) {
          tokens.fullToken = metaToken.content;
          console.log('Найден токен в meta-теге');
        }
      } catch (e) {
        // Игнорируем
      }

      // Итоговая проверка и логирование
      console.log('🔑 Итоговые токены:');
      console.log('   fullToken:', tokens.fullToken ? `✓ (${tokens.fullToken.length} символов)` : '✗');
      console.log('   sessionCookie:', tokens.sessionCookie ? `✓ (${tokens.sessionCookie.length} символов)` : '✗');
      console.log('   Всего важных cookies:', Object.keys(tokens.allCookies || {}).length);
      console.log('   cookieString:', tokens.cookieString ? `✓ (${tokens.cookieString.length} символов)` : '✗');
      
      // Если fullToken не установлен, но есть sessionCookie, используем его
      if (!tokens.fullToken && tokens.sessionCookie) {
        tokens.fullToken = tokens.sessionCookie;
        console.log('✅ Установлен fullToken из sessionCookie');
      }
      
      return tokens;
    } catch (error) {
      console.error('❌ Ошибка извлечения токена:', error);
      return tokens;
    }
  }

  // Функция для парсинга данных профиля
  function parseRedditProfile() {
    const data = {
      username: null,
      followers: 0,
      karma: 0,
      accountAge: 0,
      contributions: 0,
      comments: 0,
      posts: 0,
      goldEarned: 0,
      activeIn: 0, // Количество активных сообществ
      avatarUrl: null, // URL аватара Reddit
      redditUrl: window.location.href,
      tokens: null, // Добавляем поле для токенов
    };

    try {
      // Извлекаем username из URL
      const urlMatch = window.location.href.match(/\/user\/([^\/\?]+)/);
      if (urlMatch) {
        data.username = urlMatch[1];
      }

      // Парсим аватар Reddit
      try {
        console.log('🔍 Поиск аватара Reddit...');
        
        // Ищем аватар по различным селекторам
        const avatarSelectors = [
          '#profile-icon',
          'img[id="profile-icon"]',
          'img[alt*="Avatar"]',
          'img[alt*="avatar"]',
          'img[alt*="Ok_Asparagus"]',
          'img[alt*="Felicity"]',
          'img[alt*="Elationqy"]',
          'img[src*="snoovatar"]',
          'img[src*="redd.it/snoovatar"]',
          'img[src*="i.redd.it/snoovatar"]',
          '[class*="avatar"] img',
          '[class*="Avatar"] img',
          '[class*="profile-icon"] img',
          '[class*="ProfileIcon"] img',
          '[class*="Profile"] img',
        ];
        
        for (const selector of avatarSelectors) {
          try {
            const avatarImg = document.querySelector(selector);
            if (avatarImg && avatarImg.src) {
              console.log(`🔍 Проверяем селектор "${selector}":`, avatarImg.src.substring(0, 100));
              // Проверяем, что это действительно аватар Reddit
              if (avatarImg.src.includes('redd.it') || 
                  avatarImg.src.includes('snoovatar') || 
                  avatarImg.src.includes('redditstatic.com') ||
                  avatarImg.src.includes('reddit.com')) {
                data.avatarUrl = avatarImg.src;
                console.log('✅ Найден аватар Reddit через селектор:', selector);
                console.log('   URL:', data.avatarUrl);
                break;
              }
            }
          } catch (selectorError) {
            console.warn(`Ошибка при проверке селектора "${selector}":`, selectorError);
          }
        }
        
        // Если не нашли через селекторы, ищем все изображения
        if (!data.avatarUrl) {
          console.log('🔍 Поиск аватара среди всех изображений...');
          const allImages = document.querySelectorAll('img');
          console.log(`   Найдено изображений: ${allImages.length}`);
          
          for (const img of allImages) {
            if (img.src) {
              // Проверяем различные паттерны URL аватаров Reddit
              if (img.src.includes('snoovatar') || 
                  img.src.includes('redd.it/snoovatar') ||
                  img.src.includes('i.redd.it/snoovatar') ||
                  (img.src.includes('redd.it') && img.src.includes('avatar')) ||
                  (img.alt && (img.alt.includes('Avatar') || img.alt.includes('avatar')))) {
                data.avatarUrl = img.src;
                console.log('✅ Найден аватар Reddit через поиск всех изображений');
                console.log('   URL:', data.avatarUrl);
                console.log('   Alt:', img.alt);
                break;
              }
            }
          }
        }
        
        if (!data.avatarUrl) {
          console.warn('⚠️ Аватар не найден. Попробуем найти через другие методы...');
          
          // Пробуем найти через data-атрибуты или другие способы
          const profileSection = document.querySelector('[class*="Profile"]') || 
                                document.querySelector('[id*="profile"]') ||
                                document.querySelector('header') ||
                                document.querySelector('[class*="Header"]');
          
          if (profileSection) {
            const profileImages = profileSection.querySelectorAll('img');
            for (const img of profileImages) {
              if (img.src && (img.src.includes('redd.it') || img.src.includes('snoovatar'))) {
                data.avatarUrl = img.src;
                console.log('✅ Найден аватар в секции профиля:', data.avatarUrl);
                break;
              }
            }
          }
        }
        
        if (data.avatarUrl) {
          console.log('✅ Аватар успешно найден:', data.avatarUrl);
        } else {
          console.warn('⚠️ Аватар не найден. Возможно, профиль использует дефолтный аватар или он еще не загрузился.');
        }
      } catch (e) {
        console.error('❌ Ошибка парсинга аватара:', e);
      }

      // Парсим данные из секции "About" - ищем все возможные селекторы
      const selectors = [
        'section',
        '[data-testid="about-section"]',
        '.Sidebar',
        'aside',
        '[role="complementary"]',
        '.ProfileHeader',
        '[id*="profile"]',
        '[class*="About"]',
      ];
      
      let aboutSection = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const elText = el.textContent || '';
          // Ищем секцию, которая содержит "About" и статистику
          if (elText.includes('About') && (elText.includes('followers') || elText.includes('Karma') || elText.includes('Reddit Age'))) {
            aboutSection = el;
            console.log('Найдена секция About:', selector);
            break;
          }
        }
        if (aboutSection) break;
      }
      
      // Если не нашли секцию, парсим весь документ
      const text = aboutSection 
        ? (aboutSection.textContent || aboutSection.innerText || '')
        : (document.body.textContent || document.body.innerText || '');
      
      console.log('Парсим текст:', text.substring(0, 500));
      
      // Получаем все элементы для точного парсинга
      const allElements = document.querySelectorAll('*');
      
      // Парсим followers - используем data-testid или ищем в DOM
      try {
        // Пробуем найти через data-testid (если Reddit добавит такой атрибут)
        const followersSelectors = [
          '[data-testid="follower-count"]',
          '[data-testid="followers"]',
          '[data-testid*="follower"]',
          '[data-testid*="Follower"]',
        ];
        
        for (const selector of followersSelectors) {
          const followersEl = document.querySelector(selector);
          if (followersEl) {
            const followersText = followersEl.textContent || '';
            const match = followersText.match(/(\d+[\d,]*)/);
            if (match) {
              data.followers = parseInt(match[1].replace(/,/g, '')) || 0;
              console.log('✅ Найдено followers через data-testid:', data.followers, 'селектор:', selector);
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Ошибка парсинга followers через data-testid:', e);
      }
      
      // Если не нашли через data-testid, ищем в DOM напрямую
      if (data.followers === 0) {
        for (const el of allElements) {
          const elText = el.textContent || '';
          // Ищем точное совпадение "1 follower" или "X followers"
          const followersMatch = elText.match(/(\d+)\s*(followers?|подписчиков?)/i);
          if (followersMatch && elText.length < 100) { // Ограничиваем длину текста для точности
            data.followers = parseInt(followersMatch[1]) || 0;
            console.log('Найдено followers из DOM:', data.followers, 'текст:', elText.substring(0, 50));
            break;
          }
        }
      }
      
      // Если не нашли в DOM, пробуем через паттерны в тексте
      if (data.followers === 0) {
        const followersPatterns = [
          /(\d+[\d,]*)\s*(followers|подписчиков)/i,
          /followers[:\s]*(\d+[\d,]*)/i,
        ];
        for (const pattern of followersPatterns) {
          const match = text.match(pattern);
          if (match) {
            data.followers = parseInt(match[1].replace(/,/g, '')) || 0;
            console.log('Найдено followers через паттерн:', data.followers);
            break;
          }
        }
      }

      // Парсим karma - используем data-testid="karma-number" (как показано в DevTools)
      try {
        // Пробуем разные варианты data-testid
        const karmaSelectors = [
          '[data-testid="karma-number"]',
          '[data-testid*="karma"]',
          '[data-testid*="Karma"]',
        ];
        
        for (const selector of karmaSelectors) {
          const karmaEl = document.querySelector(selector);
          if (karmaEl) {
            const karmaText = karmaEl.textContent || '';
            // Парсим числа с возможными разделителями (90, 1.2K, 1.5M)
            const match = karmaText.match(/(\d+[\d,.]*)\s*(karma|Karma)?/i) || karmaText.match(/(\d+[\d,.]*)/);
            if (match) {
              let karmaValue = match[1].replace(/,/g, '');
              // Обрабатываем сокращения типа "1.2K" или "1.5M"
              if (karmaValue.includes('K') || karmaValue.toLowerCase().includes('k')) {
                karmaValue = parseFloat(karmaValue) * 1000;
              } else if (karmaValue.includes('M') || karmaValue.toLowerCase().includes('m')) {
                karmaValue = parseFloat(karmaValue) * 1000000;
              }
              data.karma = parseInt(karmaValue) || 0;
              console.log('✅ Найдено karma через data-testid:', data.karma, 'селектор:', selector);
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Ошибка парсинга karma через data-testid:', e);
      }
      
      // Если не нашли через data-testid, ищем в DOM напрямую
      if (data.karma === 0) {
        for (const el of allElements) {
          const elText = el.textContent || '';
          // Ищем точное совпадение "89 Karma" или "X Karma"
          const karmaMatch = elText.match(/(\d+[\d,]*)\s*(karma|карма)/i);
          if (karmaMatch && elText.length < 100) { // Ограничиваем длину текста для точности
            data.karma = parseInt(karmaMatch[1].replace(/,/g, '')) || 0;
            console.log('Найдено karma из DOM:', data.karma, 'текст:', elText.substring(0, 50));
            break;
          }
        }
      }
      
      // Если не нашли в DOM, пробуем через паттерны в тексте
      if (data.karma === 0) {
        const karmaPatterns = [
          /(\d+[\d,]*)\s*(karma|карма)/i,
          /karma[:\s]*(\d+[\d,]*)/i,
        ];
        for (const pattern of karmaPatterns) {
          const match = text.match(pattern);
          if (match) {
            data.karma = parseInt(match[1].replace(/,/g, '')) || 0;
            console.log('Найдено karma через паттерн:', data.karma);
            break;
          }
        }
      }

      // Парсим Reddit Age - используем data-testid="cake-day" (как показано в DevTools)
      try {
        const ageEl = document.querySelector('[data-testid="cake-day"]');
        if (ageEl) {
          const ageText = ageEl.textContent || '';
          console.log('Найден элемент cake-day, текст:', ageText);
          
          // Парсим формат "1 m", "30 d", "1 y" и т.д.
          const ageMatch = ageText.match(/(\d+)\s*(m|d|y|мес|дн|г|month|day|year)/i);
          if (ageMatch) {
            const value = parseInt(ageMatch[1]) || 0;
            const unit = (ageMatch[2] || '').toLowerCase();
            
            // Конвертируем в дни
            if (unit === 'm' || unit === 'мес' || unit.includes('month')) {
              data.accountAge = value * 30; // 1 месяц = 30 дней
              console.log('✅ Найдено accountAge (месяцы) через data-testid:', value, 'мес =', data.accountAge, 'дней');
            } else if (unit === 'y' || unit === 'г' || unit.includes('year')) {
              data.accountAge = value * 365; // 1 год = 365 дней
              console.log('✅ Найдено accountAge (годы) через data-testid:', value, 'лет =', data.accountAge, 'дней');
            } else {
              data.accountAge = value; // Дни
              console.log('✅ Найдено accountAge (дни) через data-testid:', data.accountAge);
            }
          }
        }
      } catch (e) {
        console.warn('Ошибка парсинга accountAge через data-testid:', e);
      }
      
      // Если не нашли через data-testid, пробуем через паттерны
      if (data.accountAge === 0) {
        const agePatterns = [
          // Месяцы: "1 m Reddit Age" или "1 m"
          /(\d+)\s*(m|мес|month|months|месяц|месяцев)\s*(reddit\s*age|возраст|reddit)?/i,
          /reddit\s*age[:\s]*(\d+)\s*(m|мес|month|months)/i,
          // Дни: "1 d Reddit Age" или "1 d"
          /(\d+)\s*(d|дн|day|days|день|дней)\s*(reddit\s*age|возраст|reddit)?/i,
          /reddit\s*age[:\s]*(\d+)\s*(d|дн|day|days)/i,
          // Годы: "1 y Reddit Age" или "1 y"
          /(\d+)\s*(y|г|year|years|год|лет)\s*(reddit\s*age|возраст|reddit)?/i,
          /reddit\s*age[:\s]*(\d+)\s*(y|г|year|years)/i,
        ];
        
        for (const pattern of agePatterns) {
          const match = text.match(pattern);
          if (match) {
            const value = parseInt(match[1]) || 0;
            const unit = (match[2] || '').toLowerCase();
            
            // Конвертируем в дни
            if (unit === 'm' || unit === 'мес' || unit.includes('month')) {
              data.accountAge = value * 30; // 1 месяц = 30 дней
              console.log('Найдено accountAge (месяцы):', value, 'мес =', data.accountAge, 'дней');
            } else if (unit === 'y' || unit === 'г' || unit.includes('year')) {
              data.accountAge = value * 365; // 1 год = 365 дней
              console.log('Найдено accountAge (годы):', value, 'лет =', data.accountAge, 'дней');
            } else {
              data.accountAge = value; // Дни
              console.log('Найдено accountAge (дни):', data.accountAge);
            }
            break;
          }
        }
      }
      
      // Если не нашли через паттерны, ищем в DOM напрямую
      if (data.accountAge === 0) {
        const ageElements = document.querySelectorAll('*');
        for (const el of ageElements) {
          const elText = el.textContent || '';
          if (elText.includes('Reddit Age') || elText.includes('reddit age')) {
            // Пробуем найти месяцы
            const monthMatch = elText.match(/(\d+)\s*(m|мес|month)/i);
            if (monthMatch) {
              data.accountAge = parseInt(monthMatch[1]) * 30;
              console.log('Найдено accountAge из DOM (месяцы):', data.accountAge);
              break;
            }
            // Пробуем найти дни
            const dayMatch = elText.match(/(\d+)\s*(d|дн|day)/i);
            if (dayMatch) {
              data.accountAge = parseInt(dayMatch[1]);
              console.log('Найдено accountAge из DOM (дни):', data.accountAge);
              break;
            }
          }
        }
      }

      // Парсим Contributions - используем data-testid="contribution-count" (как показано в DevTools)
      console.log('🔍 Начинаем парсинг Contributions...');
      try {
        // Приоритет 1: Ищем через data-testid="contribution-count" (точное совпадение)
        const contributionCountEl = document.querySelector('[data-testid="contribution-count"]');
        console.log('🔍 Поиск через data-testid="contribution-count":', contributionCountEl ? '✓ Найден' : '✗ Не найден');
        
        if (contributionCountEl) {
          const contributionsText = contributionCountEl.textContent || contributionCountEl.innerText || '';
          console.log('   Текст элемента:', contributionsText.trim());
          const match = contributionsText.trim().match(/(\d+[\d,]*)/);
          if (match) {
            data.contributions = parseInt(match[1].replace(/,/g, '')) || 0;
            console.log('✅ Найдено contributions через data-testid="contribution-count":', data.contributions);
          } else {
            console.warn('⚠️ Элемент найден, но число не извлечено. Текст:', contributionsText);
          }
        }
        
        // Приоритет 2: Если не нашли, ищем через другие селекторы
        if (data.contributions === 0) {
          console.log('🔍 Поиск через другие селекторы...');
          const contributionsSelectors = [
            '[data-testid*="contribution"]',
            '[data-testid*="Contribution"]',
          ];
          
          for (const selector of contributionsSelectors) {
            const contributionsEl = document.querySelector(selector);
            if (contributionsEl) {
              console.log('   Найден элемент через селектор:', selector);
              const contributionsText = contributionsEl.textContent || '';
              const match = contributionsText.match(/(\d+[\d,]*)/);
              if (match) {
                data.contributions = parseInt(match[1].replace(/,/g, '')) || 0;
                console.log('✅ Найдено contributions через data-testid:', data.contributions, 'селектор:', selector);
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('❌ Ошибка парсинга contributions через data-testid:', e);
      }
      
      // Если не нашли через data-testid, ищем в DOM напрямую
      if (data.contributions === 0) {
        for (const el of allElements) {
          const elText = el.textContent || '';
          // Ищем точное совпадение "29 Contributions" или "X Contributions"
          const contributionsMatch = elText.match(/(\d+[\d,]*)\s*(contributions|вклады)/i);
          if (contributionsMatch && elText.length < 100) { // Ограничиваем длину текста для точности
            data.contributions = parseInt(contributionsMatch[1].replace(/,/g, '')) || 0;
            console.log('✅ Найдено contributions из DOM:', data.contributions, 'текст:', elText.substring(0, 50));
            break;
          }
        }
      }
      
      // Если не нашли в DOM, пробуем через паттерны в тексте
      if (data.contributions === 0) {
        const contributionsPatterns = [
          /(\d+[\d,]*)\s*(contributions|вклады)/i,
          /contributions[:\s]*(\d+[\d,]*)/i,
        ];
        for (const pattern of contributionsPatterns) {
          const match = text.match(pattern);
          if (match) {
            data.contributions = parseInt(match[1].replace(/,/g, '')) || 0;
            console.log('Найдено contributions через паттерн:', data.contributions);
            break;
          }
        }
      }

      // Парсим Gold earned - используем data-testid если доступен
      try {
        // Ищем элемент с data-testid="gold-earned" или похожим
        const goldEl = document.querySelector('[data-testid*="gold"]') || 
                      document.querySelector('[data-testid*="Gold"]');
        if (goldEl) {
          const goldText = goldEl.textContent || '';
          const goldMatch = goldText.match(/(\d+[\d,]*)/);
          if (goldMatch) {
            data.goldEarned = parseInt(goldMatch[1].replace(/,/g, '')) || 0;
            console.log('✅ Найдено goldEarned через data-testid:', data.goldEarned);
          }
        }
      } catch (e) {
        console.warn('Ошибка парсинга goldEarned через data-testid:', e);
      }
      
      // Если не нашли через data-testid, ищем в DOM напрямую
      if (data.goldEarned === 0) {
        for (const el of allElements) {
          const elText = el.textContent || '';
          // Ищем точное совпадение "0 Gold earned" или "X Gold earned"
          const goldMatch = elText.match(/(\d+[\d,]*)\s*(gold\s*earned|золото\s*заработано)/i);
          if (goldMatch && elText.length < 100) { // Ограничиваем длину текста для точности
            data.goldEarned = parseInt(goldMatch[1].replace(/,/g, '')) || 0;
            console.log('✅ Найдено goldEarned из DOM:', data.goldEarned, 'текст:', elText.substring(0, 50));
            break;
          }
        }
      }
      
      // Если не нашли в DOM, пробуем через паттерны в тексте
      if (data.goldEarned === 0) {
        const goldPatterns = [
          /(\d+[\d,]*)\s*(gold\s*earned|золото\s*заработано)/i,
          /gold\s*earned[:\s]*(\d+[\d,]*)/i,
        ];
        for (const pattern of goldPatterns) {
          const match = text.match(pattern);
          if (match) {
            data.goldEarned = parseInt(match[1].replace(/,/g, '')) || 0;
            console.log('Найдено goldEarned через паттерн:', data.goldEarned);
            break;
          }
        }
      }

      // Парсим Active in (количество активных сообществ) - ищем "Active in > X" или "Active in X"
      console.log('🔍 Начинаем парсинг Active In...');
      try {
        // Приоритет 1: Ищем элемент с текстом "Active in" и число рядом с ним
        // Структура может быть: <span>5</span> <p>Active in ></p> или наоборот
        const activeInElements = document.querySelectorAll('*');
        console.log('🔍 Всего элементов для проверки:', activeInElements.length);
        
        let foundActiveInElement = false;
        for (const el of activeInElements) {
          const elText = el.textContent || '';
          const elHTML = el.innerHTML || '';
          
          // Проверяем, содержит ли элемент "Active in"
          if (elText.includes('Active in') && elText.length < 200) {
            foundActiveInElement = true;
            console.log('🔍 Найден элемент с "Active in":', elText.substring(0, 100));
            console.log('   HTML:', elHTML.substring(0, 200));
            // Ищем число в том же элементе или в соседних элементах
            // Вариант 1: Число в том же элементе
            const activeMatch = elText.match(/active\s+in\s*[>]?\s*(\d+)/i) || 
                               elText.match(/(\d+)\s*active\s+in/i);
            
            if (activeMatch) {
              data.activeIn = parseInt(activeMatch[1]) || 0;
              console.log('✅ Найдено activeIn из DOM (в том же элементе):', data.activeIn, 'текст:', elText.substring(0, 80));
              break;
            }
            
            // Вариант 2: Ищем число в родительском элементе или соседних элементах
            const parent = el.parentElement;
            if (parent) {
              const parentText = parent.textContent || '';
              // Ищем паттерн: число перед или после "Active in"
              const parentMatch = parentText.match(/(\d+)\s*active\s+in/i) ||
                                 parentText.match(/active\s+in\s*[>]?\s*(\d+)/i);
              if (parentMatch) {
                data.activeIn = parseInt(parentMatch[1]) || 0;
                console.log('✅ Найдено activeIn из DOM (в родительском элементе):', data.activeIn, 'текст:', parentText.substring(0, 80));
                break;
              }
            }
            
            // Вариант 3: Ищем число в предыдущем или следующем sibling элементе
            const prevSibling = el.previousElementSibling;
            const nextSibling = el.nextElementSibling;
            
            console.log('   Проверка соседних элементов...');
            console.log('   Предыдущий sibling:', prevSibling ? prevSibling.tagName + ' ' + (prevSibling.textContent || '').substring(0, 50) : 'нет');
            console.log('   Следующий sibling:', nextSibling ? nextSibling.tagName + ' ' + (nextSibling.textContent || '').substring(0, 50) : 'нет');
            
            if (prevSibling) {
              const prevText = prevSibling.textContent || '';
              const prevMatch = prevText.match(/(\d+)/);
              console.log('   Предыдущий sibling текст:', prevText.substring(0, 50), 'Длина:', prevText.length);
              if (prevMatch && prevText.length < 20) { // Если это короткий элемент с числом
                data.activeIn = parseInt(prevMatch[1]) || 0;
                console.log('✅ Найдено activeIn из DOM (в предыдущем sibling):', data.activeIn);
                break;
              }
            }
            
            if (nextSibling) {
              const nextText = nextSibling.textContent || '';
              const nextMatch = nextText.match(/(\d+)/);
              console.log('   Следующий sibling текст:', nextText.substring(0, 50), 'Длина:', nextText.length);
              if (nextMatch && nextText.length < 20) { // Если это короткий элемент с числом
                data.activeIn = parseInt(nextMatch[1]) || 0;
                console.log('✅ Найдено activeIn из DOM (в следующем sibling):', data.activeIn);
                break;
              }
            }
            
            // Вариант 4: Ищем все числа в родительском элементе и берем то, что рядом с "Active in"
            if (parent && !data.activeIn) {
              const parentChildren = parent.children;
              console.log('   Проверка дочерних элементов родителя (всего:', parentChildren.length, ')');
              for (let i = 0; i < parentChildren.length; i++) {
                const child = parentChildren[i];
                const childText = child.textContent || '';
                console.log(`   Дочерний элемент ${i}:`, child.tagName, childText.substring(0, 50));
                
                // Если это элемент с "Active in", проверяем соседние
                if (childText.includes('Active in')) {
                  // Проверяем предыдущий и следующий элементы
                  if (i > 0) {
                    const prevChild = parentChildren[i - 1];
                    const prevChildText = prevChild.textContent || '';
                    const prevChildMatch = prevChildText.trim().match(/^(\d+)$/);
                    if (prevChildMatch) {
                      data.activeIn = parseInt(prevChildMatch[1]) || 0;
                      console.log('✅ Найдено activeIn в предыдущем дочернем элементе:', data.activeIn);
                      break;
                    }
                  }
                  if (i < parentChildren.length - 1) {
                    const nextChild = parentChildren[i + 1];
                    const nextChildText = nextChild.textContent || '';
                    const nextChildMatch = nextChildText.trim().match(/^(\d+)$/);
                    if (nextChildMatch) {
                      data.activeIn = parseInt(nextChildMatch[1]) || 0;
                      console.log('✅ Найдено activeIn в следующем дочернем элементе:', data.activeIn);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
        
        if (!foundActiveInElement) {
          console.warn('⚠️ Элемент с текстом "Active in" не найден на странице');
        }
      } catch (e) {
        console.error('❌ Ошибка парсинга activeIn:', e);
      }
      
      // Если не нашли в DOM, пробуем через паттерны в тексте
      if (!data.activeIn || data.activeIn === 0) {
        const activePatterns = [
          /active\s+in\s*[>]?\s*(\d+)/i,
          /active\s+in[:\s]*(\d+)/i,
          /(\d+)\s*active\s+in/i,
        ];
        for (const pattern of activePatterns) {
          const match = text.match(pattern);
          if (match) {
            data.activeIn = parseInt(match[1]) || 0;
            console.log('Найдено activeIn через паттерн:', data.activeIn);
            break;
          }
        }
      }
      
      // Дополнительная проверка: ищем через структуру ProfileActiveSubreddit (как на скриншоте)
      if (!data.activeIn || data.activeIn === 0) {
        try {
          // Ищем все элементы, которые содержат "Active in"
          const activeInContainers = [];
          for (const el of allElements) {
            const elText = el.textContent || '';
            if (elText.includes('Active in') || elText.includes('Active in >')) {
              activeInContainers.push(el);
            }
          }
          
          // Для каждого контейнера ищем число в нем или в соседних элементах
          for (const container of activeInContainers) {
            // Ищем число в самом контейнере
            const containerText = container.textContent || '';
            const containerMatch = containerText.match(/(\d+)/);
            if (containerMatch) {
              const number = parseInt(containerMatch[1]);
              // Проверяем, что число разумное (обычно от 1 до 100)
              if (number > 0 && number <= 100) {
                data.activeIn = number;
                console.log('✅ Найдено activeIn в контейнере:', data.activeIn);
                break;
              }
            }
            
            // Ищем число в родительском элементе
            if (container.parentElement) {
              const parentText = container.parentElement.textContent || '';
              const parentMatch = parentText.match(/(\d+)/);
              if (parentMatch) {
                const number = parseInt(parentMatch[1]);
                if (number > 0 && number <= 100) {
                  data.activeIn = number;
                  console.log('✅ Найдено activeIn в родительском элементе:', data.activeIn);
                  break;
                }
              }
            }
            
            // Ищем число в соседних элементах (предыдущий и следующий sibling)
            const siblings = [
              container.previousElementSibling,
              container.nextElementSibling,
              container.previousElementSibling?.previousElementSibling,
              container.nextElementSibling?.nextElementSibling,
            ].filter(Boolean);
            
            for (const sibling of siblings) {
              const siblingText = sibling.textContent || '';
              // Если это короткий элемент с числом (вероятно, это число)
              if (siblingText.length < 10 && siblingText.trim().match(/^\d+$/)) {
                const number = parseInt(siblingText.trim());
                if (number > 0 && number <= 100) {
                  data.activeIn = number;
                  console.log('✅ Найдено activeIn в соседнем элементе:', data.activeIn);
                  break;
                }
              }
            }
            
            if (data.activeIn > 0) break;
          }
        } catch (e) {
          console.warn('Ошибка парсинга activeIn через ProfileActive:', e);
        }
      }

      // Парсим данные из Reddit API (если доступен)
      try {
        // Пытаемся найти данные в window.__r или других глобальных переменных Reddit
        if (window.__r && window.__r.data) {
          const redditData = window.__r.data;
          if (redditData.children && redditData.children[0] && redditData.children[0].data) {
            const userData = redditData.children[0].data;
            data.karma = userData.total_karma || data.karma;
            data.comments = userData.comment_karma || 0;
            data.posts = userData.link_karma || 0;
            
            if (userData.created_utc) {
              const accountAge = Math.floor(
                (Date.now() / 1000 - userData.created_utc) / (60 * 60 * 24)
              );
              data.accountAge = accountAge || data.accountAge;
            }
          }
        }
      } catch (e) {
        console.warn('Не удалось получить данные из Reddit API:', e);
      }

      // Альтернативный способ - парсим весь документ
      const bodyText = document.body.textContent || document.body.innerText || '';
      
      // Если не нашли через секцию About, ищем в тексте страницы
      if (data.followers === 0) {
        const followersMatch = bodyText.match(/(\d+)\s*(followers|подписчиков)/i);
        if (followersMatch) {
          data.followers = parseInt(followersMatch[1]) || 0;
        }
      }

      if (data.contributions === 0) {
        const contributionsMatch = bodyText.match(/(\d+)\s*(contributions|вклады)/i);
        if (contributionsMatch) {
          data.contributions = parseInt(contributionsMatch[1]) || 0;
        }
      }

      if (data.goldEarned === 0) {
        const goldMatch = bodyText.match(/(\d+)\s*(gold\s*earned|золото\s*заработано)/i);
        if (goldMatch) {
          data.goldEarned = parseInt(goldMatch[1]) || 0;
        }
      }

      // Извлекаем токены
      data.tokens = extractRedditToken();
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ ПАРСИНГ ЗАВЕРШЕН');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Username:', data.username);
      console.log('Followers:', data.followers);
      console.log('Karma:', data.karma);
      console.log('Account Age:', data.accountAge, 'дней');
      console.log('Contributions:', data.contributions, data.contributions === 0 ? '⚠️ НЕ НАЙДЕНО!' : '✅');
      console.log('Comments:', data.comments);
      console.log('Posts:', data.posts);
      console.log('Gold Earned:', data.goldEarned, data.goldEarned === 0 ? '(может быть 0)' : '✅');
      console.log('Active In:', data.activeIn, data.activeIn === 0 ? '⚠️ НЕ НАЙДЕНО!' : '✅');
      
      // Дополнительная диагностика
      if (data.contributions === 0) {
        console.warn('⚠️ Contributions не найдено! Проверьте структуру страницы.');
      }
      if (data.activeIn === 0) {
        console.warn('⚠️ Active In не найдено! Проверьте структуру страницы.');
      }
      console.log('Reddit URL:', data.redditUrl);
      console.log('Есть токен:', !!data.tokens?.fullToken);
      console.log('═══════════════════════════════════════════════════════');
      return data;
    } catch (error) {
      console.error('❌ Ошибка парсинга профиля:', error);
      return null;
    }
  }

  // Сохраняем функцию парсинга в глобальную область для доступа из popup
  window.parseRedditProfile = parseRedditProfile;

  // Слушаем сообщения от popup (как в расширении для Tinder)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Получено сообщение от popup:', request);
    
    if (request.action === 'fetchData') {
      // Выполняем парсинг асинхронно
      (async () => {
        try {
          const data = parseRedditProfile();
          
          // Токены уже извлечены в parseRedditProfile через extractRedditToken()
          // Дополнительно проверяем, что все cookies извлечены правильно
          if (data.tokens) {
            console.log('🔑 Проверка извлеченных токенов:');
            console.log('   fullToken:', data.tokens.fullToken ? `✓ (${data.tokens.fullToken.length} символов)` : '✗');
            console.log('   sessionCookie:', data.tokens.sessionCookie ? `✓ (${data.tokens.sessionCookie.length} символов)` : '✗');
            console.log('   allCookies:', Object.keys(data.tokens.allCookies || {}).length, 'cookies');
            console.log('   cookieString:', data.tokens.cookieString ? `✓ (${data.tokens.cookieString.length} символов)` : '✗');
            
            // Если fullToken не установлен, но есть sessionCookie, используем его
            if (!data.tokens.fullToken && data.tokens.sessionCookie) {
              data.tokens.fullToken = data.tokens.sessionCookie;
              console.log('✅ Установлен fullToken из sessionCookie');
            }
            
            // Если cookieString не установлен, но есть allCookies, формируем его
            if (!data.tokens.cookieString && data.tokens.allCookies && Object.keys(data.tokens.allCookies).length > 0) {
              data.tokens.cookieString = Object.entries(data.tokens.allCookies)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
              console.log('✅ Сформирована cookieString из allCookies');
            }
          }
          
          // Логируем avatarUrl для отладки
          console.log('🖼️ Avatar URL:', data.avatarUrl || 'не найден');
          
          // Отправляем ответ
          sendResponse({ success: true, data: data });
        } catch (error) {
          console.error('❌ Ошибка при парсинге:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      
      // Возвращаем true для асинхронного ответа
      return true;
    }
  });

  // Добавляем кнопку на страницу Reddit для быстрого экспорта
  function addExportButton() {
    // Проверяем, не добавлена ли уже кнопка
    if (document.getElementById('reddit-cabinet-export-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'reddit-cabinet-export-btn';
    button.textContent = '📊 Экспорт в Reddit Cabinet';
    button.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      padding: 10px 15px;
      background: #FF4500;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    `;

    button.addEventListener('click', () => {
      const data = parseRedditProfile();
      if (data) {
        // Отправляем сообщение в popup
        chrome.runtime.sendMessage({
          type: 'REDDIT_DATA',
          data: data
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Ошибка отправки данных:', chrome.runtime.lastError);
            alert('Откройте расширение Reddit Cabinet для отправки данных');
          } else {
            alert('Данные отправлены в Reddit Cabinet!');
          }
        });
      }
    });

    document.body.appendChild(button);
  }

  // Добавляем кнопку после загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExportButton);
  } else {
    addExportButton();
  }

  // Также добавляем кнопку при изменении URL (SPA навигация)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(addExportButton, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();

