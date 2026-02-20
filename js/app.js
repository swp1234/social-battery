/* Social Battery Test - Main Application */
;(() => {
  'use strict';

  try {

  // ===== Constants =====
  const TOTAL_QUESTIONS = 10;
  const POINTS_PER_QUESTION = 4; // max score per question
  const MAX_SCORE = TOTAL_QUESTIONS * POINTS_PER_QUESTION; // 40

  // Question keys map to locale: questions.q1.text, questions.q1.options.a/b/c/d
  // Option scores: a=4, b=3, c=2, d=1 (high energy to low energy)
  const OPTION_SCORES = { a: 4, b: 3, c: 2, d: 1 };

  // Type definitions based on battery percentage ranges
  const TYPES = [
    { key: 'solarPanel',   min: 76, max: 100, level: 'high',     emoji: '☀️' },
    { key: 'rechargeable', min: 51, max: 75,  level: 'medium',   emoji: '🔋' },
    { key: 'energySaver',  min: 26, max: 50,  level: 'low',      emoji: '🔌' },
    { key: 'emergency',    min: 0,  max: 25,  level: 'critical',  emoji: '🪫' },
  ];

  // ===== State =====
  let answers = new Array(TOTAL_QUESTIONS).fill(null); // stores 'a','b','c','d' or null
  let currentIdx = 0;
  let isDark = true;

  // ===== DOM Helpers =====
  const $ = id => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    quiz: $('screen-quiz'),
    charging: $('screen-charging'),
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
      // Re-render current screen content
      if (screens.quiz.classList.contains('active')) renderQuestion(currentIdx);
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

  // ===== Quiz Rendering =====
  function renderQuestion(idx) {
    const qNum = idx + 1;

    // Progress
    $('progress-label').textContent = `${qNum} / ${TOTAL_QUESTIONS}`;
    $('progress-fill').style.width = `${(qNum / TOTAL_QUESTIONS) * 100}%`;

    // Energy indicator - shows partial battery based on progress
    const energyEmojis = ['🪫', '🪫', '🪫', '🔌', '🔌', '🔋', '🔋', '🔋', '☀️', '☀️'];
    $('energy-indicator').textContent = energyEmojis[idx] || '🔋';

    // Question number and text
    $('q-number').textContent = `Q${qNum}`;
    $('q-text').textContent = i18n.t(`questions.q${qNum}.text`);

    // Options
    const wrap = $('options-wrap');
    wrap.innerHTML = '';
    const letters = ['a', 'b', 'c', 'd'];
    letters.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (answers[idx] === letter) btn.classList.add('selected');
      btn.dataset.option = letter;
      btn.innerHTML = `
        <span class="option-letter">${letter.toUpperCase()}</span>
        <span class="option-text">${i18n.t(`questions.q${qNum}.options.${letter}`)}</span>
      `;
      btn.addEventListener('click', () => selectOption(letter));
      wrap.appendChild(btn);
    });

    // Nav buttons
    $('btn-prev').disabled = idx === 0;
    const nextText = idx === TOTAL_QUESTIONS - 1
      ? i18n.t('quiz.finish')
      : i18n.t('quiz.next');
    $('btn-next').textContent = nextText;
  }

  function selectOption(letter) {
    answers[currentIdx] = letter;
    // Update visual selection
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.option === letter);
    });
    // Auto-advance after short delay
    if (currentIdx < TOTAL_QUESTIONS - 1) {
      setTimeout(() => {
        currentIdx++;
        renderQuestion(currentIdx);
      }, 350);
    }
  }

  // Nav buttons
  $('btn-prev').addEventListener('click', () => {
    if (currentIdx > 0) {
      currentIdx--;
      renderQuestion(currentIdx);
    }
  });

  $('btn-next').addEventListener('click', () => {
    if (answers[currentIdx] === null) {
      // Shake the question card to indicate selection needed
      const card = document.querySelector('.question-card');
      card.style.animation = 'none';
      card.offsetHeight; // force reflow
      card.style.animation = 'fadeInUp 0.3s ease';
      return;
    }
    if (currentIdx < TOTAL_QUESTIONS - 1) {
      currentIdx++;
      renderQuestion(currentIdx);
    } else {
      showChargingAnimation();
    }
  });

  // ===== Score Calculation =====
  function calcScore() {
    let totalPoints = 0;
    answers.forEach(answer => {
      if (answer) totalPoints += OPTION_SCORES[answer];
    });
    // Convert to percentage (0-100)
    return Math.round((totalPoints / MAX_SCORE) * 100);
  }

  function getType(percent) {
    return TYPES.find(t => percent >= t.min && percent <= t.max) || TYPES[TYPES.length - 1];
  }

  // ===== Charging Animation =====
  function showChargingAnimation() {
    showScreen('charging');
    const fill = $('charging-fill');
    fill.style.height = '0%';

    // Animate charging fill
    requestAnimationFrame(() => {
      fill.style.height = '100%';
    });

    // Show result after animation
    setTimeout(() => {
      showResult();
    }, 2200);
  }

  // ===== Result Rendering =====
  function showResult() {
    const percent = calcScore();
    const type = getType(percent);
    const levelClass = `level-${type.level}`;

    showScreen('result');

    // Battery visualization
    const batteryFill = $('battery-fill');
    const batteryBody = $('battery-body');
    const batteryCap = $('battery-cap');
    const batteryPercent = $('battery-percent');

    // Reset
    batteryFill.style.height = '0%';
    batteryFill.className = 'battery-fill-area';
    batteryBody.className = 'battery-body';
    batteryCap.className = 'battery-cap';

    // Animate battery fill
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        batteryFill.classList.add(levelClass, 'charging');
        batteryFill.style.height = `${percent}%`;
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
      batteryPercent.textContent = `${current}%`;
      if (progress < 1) requestAnimationFrame(animatePercent);
    }
    requestAnimationFrame(animatePercent);

    // Battery bolt visibility
    $('battery-bolt').style.display = percent > 50 ? 'block' : 'none';

    // Type badge
    const typeBadge = $('type-badge');
    typeBadge.className = `type-badge ${levelClass}`;
    typeBadge.textContent = `${type.emoji} ${i18n.t(`types.${type.key}.name`)}`;

    // Type description
    $('type-desc').textContent = i18n.t(`types.${type.key}.desc`);

    // Detail cards
    const detailCards = $('detail-cards');
    detailCards.innerHTML = '';

    // Battery level card
    const levelCard = createDetailCard(
      '🔋',
      i18n.t('result.batteryLevel'),
      `${percent}%`
    );
    detailCards.appendChild(levelCard);

    // Social ratio card
    const ratioCard = createDetailCard(
      '⚖️',
      i18n.t('result.socialRatio'),
      i18n.t(`types.${type.key}.ratio`)
    );
    detailCards.appendChild(ratioCard);

    // Recharge method card
    const rechargeCard = createDetailCard(
      '🔌',
      i18n.t('result.rechargeMethod'),
      i18n.t(`types.${type.key}.recharge`)
    );
    detailCards.appendChild(rechargeCard);

    // Compatible types
    const compatCards = $('compatible-cards');
    compatCards.innerHTML = '';
    const compatCard = document.createElement('div');
    compatCard.className = 'detail-card';

    const compatKeys = i18n.t(`types.${type.key}.compatible`);
    let compatHTML = `
      <div class="detail-card-header">
        <span class="detail-card-icon">💕</span>
        <span class="detail-card-label">${i18n.t('result.compatibleTypes')}</span>
      </div>
      <div class="compatible-tags">
    `;

    if (typeof compatKeys === 'string') {
      // Fallback: if compatible is a comma-separated string
      compatKeys.split(',').forEach(name => {
        compatHTML += `<span class="compatible-tag">${name.trim()}</span>`;
      });
    } else if (Array.isArray(compatKeys)) {
      compatKeys.forEach(name => {
        compatHTML += `<span class="compatible-tag">${name}</span>`;
      });
    }

    compatHTML += '</div>';
    compatCard.innerHTML = compatHTML;
    compatCards.appendChild(compatCard);

    // GA4 event
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
    card.innerHTML = `
      <div class="detail-card-header">
        <span class="detail-card-icon">${icon}</span>
        <span class="detail-card-label">${label}</span>
      </div>
      <div class="detail-card-value">${value}</div>
    `;
    return card;
  }

  // ===== Share =====
  $('btn-twitter').addEventListener('click', () => {
    const percent = calcScore();
    const type = getType(percent);
    const typeName = i18n.t(`types.${type.key}.name`);
    const text = i18n.t('share.twitterText')
      .replace('{percent}', percent)
      .replace('{type}', typeName);
    const url = 'https://dopabrain.com/social-battery/';
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + ' ' + url)}`,
      '_blank'
    );
    if (typeof gtag !== 'undefined') gtag('event', 'share', { method: 'twitter' });
  });

  $('btn-copy').addEventListener('click', function() {
    const url = 'https://dopabrain.com/social-battery/';
    navigator.clipboard.writeText(url).then(() => {
      this.innerHTML = `<span>✅ ${i18n.t('share.copied')}</span>`;
      setTimeout(() => {
        this.innerHTML = `<span>${i18n.t('share.copyUrl')}</span>`;
      }, 2000);
    });
    if (typeof gtag !== 'undefined') gtag('event', 'share', { method: 'url_copy' });
  });

  // ===== Navigation =====
  $('btn-start').addEventListener('click', () => {
    answers = new Array(TOTAL_QUESTIONS).fill(null);
    currentIdx = 0;
    showScreen('quiz');
    renderQuestion(0);
    if (typeof gtag !== 'undefined') gtag('event', 'social_battery_start');
  });

  $('btn-retake').addEventListener('click', () => {
    answers = new Array(TOTAL_QUESTIONS).fill(null);
    currentIdx = 0;
    showScreen('start');
    if (typeof gtag !== 'undefined') gtag('event', 'social_battery_retake');
  });

  // ===== Init =====
  initTheme();
  updateLangHighlight();

  // i18n init
  (async () => {
    try {
      await i18n.loadTranslations(i18n.currentLang);
      i18n.updateUI();
      updateLangHighlight();
    } catch (e) {
      // Fallback: app still works with data-i18n default text
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
    // IIFE try-catch: prevent loader from getting stuck
    console.error('App init error:', e);
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.add('hidden');
  }
})();
