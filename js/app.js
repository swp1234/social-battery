/* Social Battery Test - Real-Time Dashboard */
;(() => {
  'use strict';

  try {

  // ===== Constants =====
  const TOTAL_SCENARIOS = 12;
  const CHANGE_PER_CHOICE = 5; // battery % change per choice
  const START_PERCENT = 50;

  const TYPES = [
    { key: 'solarPanel',   min: 76, max: 100, level: 'high',     emoji: '☀️' },
    { key: 'rechargeable', min: 51, max: 75,  level: 'medium',   emoji: '🔋' },
    { key: 'energySaver',  min: 26, max: 50,  level: 'low',      emoji: '🔌' },
    { key: 'emergency',    min: 0,  max: 25,  level: 'critical',  emoji: '🪫' },
  ];

  // ===== State =====
  let currentScenario = 0;
  let batteryPercent = START_PERCENT;
  let isAnimating = false;
  let isDark = true;

  // ===== DOM Helpers =====
  const $ = id => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    dashboard: $('screen-dashboard'),
    result: $('screen-result'),
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== Theme =====
  function initTheme() {
    const saved = localStorage.getItem('social-battery-theme');
    isDark = saved ? saved === 'dark' : true;
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    $('theme-btn').textContent = isDark ? '☀️' : '🌙';
  }

  $('theme-btn').addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('social-battery-theme', isDark ? 'dark' : 'light');
    applyTheme();
  });

  // ===== Language Menu =====
  const langBtn = $('lang-btn');
  const langMenu = $('lang-menu');

  langBtn.addEventListener('click', e => {
    e.stopPropagation();
    langMenu.classList.toggle('hidden');
  });

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await i18n.setLanguage(btn.dataset.lang);
      langMenu.classList.add('hidden');
      updateLangHighlight();
      if (screens.dashboard.classList.contains('active')) renderScenario(currentScenario);
      if (screens.result.classList.contains('active')) showResult();
    });
  });

  document.addEventListener('click', () => langMenu.classList.add('hidden'));

  function updateLangHighlight() {
    const current = i18n.getCurrentLanguage();
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === current);
    });
  }

  // ===== Battery Level Helpers =====
  function getLevelClass(percent) {
    if (percent >= 76) return 'level-high';
    if (percent >= 51) return 'level-medium';
    if (percent >= 26) return 'level-low';
    return 'level-critical';
  }

  function updateDashBattery(percent, animate) {
    const fill = $('dash-fill');
    const body = document.querySelector('.dash-battery-body');
    const cap = document.querySelector('.dash-battery-cap');
    const percentEl = $('dash-percent');

    const clamped = Math.max(0, Math.min(100, percent));
    const levelClass = getLevelClass(clamped);

    // Update fill height
    fill.style.height = clamped + '%';

    // Update colors
    fill.className = 'dash-battery-fill ' + levelClass;
    body.className = 'dash-battery-body ' + levelClass;
    cap.className = 'dash-battery-cap ' + levelClass;

    // Update percent text
    percentEl.textContent = clamped + '%';

    // Pulse animation
    if (animate) {
      body.classList.remove('pulse-charge', 'pulse-drain');
      void body.offsetHeight; // force reflow
      body.classList.add(animate === 'charge' ? 'pulse-charge' : 'pulse-drain');
    }
  }

  // ===== Floating Text =====
  function showFloatingText(type) {
    const container = $('float-container');
    const el = document.createElement('div');
    el.className = 'float-text ' + type;
    el.textContent = type === 'charge' ? '+' + CHANGE_PER_CHOICE + '%' : '-' + CHANGE_PER_CHOICE + '%';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ===== Scenario Rendering =====
  function renderScenario(idx) {
    const num = idx + 1;
    $('dash-counter').textContent = num + ' / ' + TOTAL_SCENARIOS;

    const emoji = i18n.t('scenarios.s' + num + '.emoji');
    const title = i18n.t('scenarios.s' + num + '.title');
    const desc = i18n.t('scenarios.s' + num + '.desc');

    $('scenario-emoji').textContent = emoji;
    $('scenario-title').textContent = title;
    $('scenario-desc').textContent = desc;

    // Card slide animation
    const card = $('scenario-card');
    card.classList.remove('entering');
    void card.offsetHeight;
    card.classList.add('entering');

    // Enable buttons
    $('btn-charge').disabled = false;
    $('btn-drain').disabled = false;
  }

  // ===== Choice Handler =====
  function handleChoice(type) {
    if (isAnimating) return;
    isAnimating = true;

    // Disable buttons
    $('btn-charge').disabled = true;
    $('btn-drain').disabled = true;

    // Update battery
    if (type === 'charge') {
      batteryPercent = Math.min(100, batteryPercent + CHANGE_PER_CHOICE);
    } else {
      batteryPercent = Math.max(0, batteryPercent - CHANGE_PER_CHOICE);
    }

    // Visual feedback
    updateDashBattery(batteryPercent, type);
    showFloatingText(type);

    // Next scenario or result
    setTimeout(() => {
      if (currentScenario < TOTAL_SCENARIOS - 1) {
        currentScenario++;
        renderScenario(currentScenario);
        isAnimating = false;
      } else {
        // Show result
        setTimeout(() => {
          showResult();
          isAnimating = false;
        }, 300);
      }
    }, 600);
  }

  $('btn-charge').addEventListener('click', () => handleChoice('charge'));
  $('btn-drain').addEventListener('click', () => handleChoice('drain'));

  // ===== Score / Type =====
  function getType(percent) {
    return TYPES.find(t => percent >= t.min && percent <= t.max) || TYPES[TYPES.length - 1];
  }

  // ===== Result =====
  function showResult() {
    const percent = Math.max(0, Math.min(100, batteryPercent));
    const type = getType(percent);
    const levelClass = 'level-' + type.level;

    showScreen('result');

    // Battery visualization
    const batteryFill = $('battery-fill');
    const batteryBody = $('battery-body');
    const batteryCap = $('battery-cap');
    const batteryPercentEl = $('battery-percent');

    batteryFill.style.height = '0%';
    batteryFill.className = 'battery-fill-area';
    batteryBody.className = 'battery-body';
    batteryCap.className = 'battery-cap';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        batteryFill.classList.add(levelClass, 'charging');
        batteryFill.style.height = percent + '%';
        batteryBody.classList.add(levelClass);
        batteryCap.classList.add(levelClass);
      });
    });

    // Animate percentage counter
    let current = 0;
    const duration = 1800;
    const startTime = performance.now();
    function animatePercent(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(eased * percent);
      batteryPercentEl.textContent = current + '%';
      if (progress < 1) requestAnimationFrame(animatePercent);
    }
    requestAnimationFrame(animatePercent);

    $('battery-bolt').style.display = percent > 50 ? 'block' : 'none';

    // Type badge
    const typeBadge = $('type-badge');
    typeBadge.className = 'type-badge ' + levelClass;
    typeBadge.textContent = i18n.t('types.' + type.key + '.name');

    $('type-desc').textContent = i18n.t('types.' + type.key + '.desc');

    // Detail cards
    const detailCards = $('detail-cards');
    detailCards.innerHTML = '';

    detailCards.appendChild(createDetailCard('🔋', i18n.t('result.batteryLevel'), percent + '%'));
    detailCards.appendChild(createDetailCard('⚖️', i18n.t('result.socialRatio'), i18n.t('types.' + type.key + '.ratio')));
    detailCards.appendChild(createDetailCard('🔌', i18n.t('result.rechargeMethod'), i18n.t('types.' + type.key + '.recharge')));

    // Compatible types
    const compatCards = $('compatible-cards');
    compatCards.innerHTML = '';
    const compatCard = document.createElement('div');
    compatCard.className = 'detail-card';
    const compatKeys = i18n.t('types.' + type.key + '.compatible');
    let compatHTML = '<div class="detail-card-header"><span class="detail-card-icon">💕</span><span class="detail-card-label">' + i18n.t('result.compatibleTypes') + '</span></div><div class="compatible-tags">';
    if (Array.isArray(compatKeys)) {
      compatKeys.forEach(name => { compatHTML += '<span class="compatible-tag">' + name + '</span>'; });
    }
    compatHTML += '</div>';
    compatCard.innerHTML = compatHTML;
    compatCards.appendChild(compatCard);

    // Percentile stat
    const pStat = document.getElementById('percentile-stat');
    if (pStat) {
        const pct = 8 + Math.floor(Math.random() * 20);
        const template = i18n?.t('result.percentileStat') || 'Only <strong>{percent}%</strong> share your social battery level';
        pStat.innerHTML = template.replace('{percent}', pct);
    }

    // GA4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'social_battery_complete', {
        battery_percent: percent,
        battery_type: type.key,
      });
    }
  }

  function createDetailCard(icon, label, value) {
    const card = document.createElement('div');
    card.className = 'detail-card';
    card.innerHTML = '<div class="detail-card-header"><span class="detail-card-icon">' + icon + '</span><span class="detail-card-label">' + label + '</span></div><div class="detail-card-value">' + value + '</div>';
    return card;
  }

  // ===== Share =====
  $('btn-twitter').addEventListener('click', () => {
    const percent = Math.max(0, Math.min(100, batteryPercent));
    const type = getType(percent);
    const typeName = i18n.t('types.' + type.key + '.name');
    const text = i18n.t('share.twitterText')
      .replace('{percent}', percent)
      .replace('{type}', typeName);
    const url = 'https://dopabrain.com/social-battery/';
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text + ' ' + url), '_blank');
    if (typeof gtag !== 'undefined') gtag('event', 'share', { method: 'twitter' });
  });

  $('btn-copy').addEventListener('click', function() {
    const url = 'https://dopabrain.com/social-battery/';
    navigator.clipboard.writeText(url).then(() => {
      this.innerHTML = '<span>✅ ' + i18n.t('share.copied') + '</span>';
      setTimeout(() => {
        this.innerHTML = '<span>' + i18n.t('share.copyUrl') + '</span>';
      }, 2000);
    });
    if (typeof gtag !== 'undefined') gtag('event', 'share', { method: 'url_copy' });
  });

  // ===== Navigation =====
  $('btn-start').addEventListener('click', () => {
    currentScenario = 0;
    batteryPercent = START_PERCENT;
    showScreen('dashboard');
    updateDashBattery(START_PERCENT, null);
    renderScenario(0);
    if (typeof gtag !== 'undefined') gtag('event', 'social_battery_start');
  });

  $('btn-retake').addEventListener('click', () => {
    currentScenario = 0;
    batteryPercent = START_PERCENT;
    showScreen('start');
    if (typeof gtag !== 'undefined') gtag('event', 'social_battery_retake');
  });

  // ===== Init =====
  initTheme();
  updateLangHighlight();

  (async () => {
    try {
      await i18n.loadTranslations(i18n.currentLang);
      i18n.updateUI();
      updateLangHighlight();
    } catch (e) {
      // Fallback
    }
  })();

  // Hide loader
  window.addEventListener('load', () => {
    setTimeout(() => {
      $('app-loader').classList.add('hidden');
    }, 300);
  });

  // AdSense
  try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}

  } catch (e) {
    console.error('App init error:', e);
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.add('hidden');
  }
})();
