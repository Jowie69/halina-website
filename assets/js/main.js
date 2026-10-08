/* ============================================================
   Halina Travels — 3D bootstrap

   Two jobs:
     1. the cinematic float-plane intro (every full page load)
     2. the ambient hero / promo 3D layer

   three.js only loads when it is actually worth it:
     • desktop-class viewport
     • WebGL present
     • not a low-power device
     • motion not disabled
   Any failure is silent — the Phase 1 CSS/JS layer is the fallback.
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;

  function motionOff() {
    return (
      body.getAttribute('data-motion') === 'off' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  function lowPower() {
    var cores = navigator.hardwareConcurrency || 4;
    var mem = navigator.deviceMemory || 4;
    return cores <= 2 || mem <= 2;
  }

  function capable() {
    return !motionOff() && !lowPower() && hasWebGL();
  }

  /* ---------------- ambient hero / promo layer ---------------- */
  function bootAmbient() {
    /* The cinematic intro now owns the guaranteed 3D experience and is
       fully local. Keep the lighter Phase 1 motion layer after it rather
       than making a second, CDN-dependent WebGL request. */
    body.setAttribute('data-fx', '2d');
  }

  function whenIdle(fn) {
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 900);
  }

  function afterLoad(fn) {
    if (document.readyState === 'complete') whenIdle(fn);
    else window.addEventListener('load', function () { whenIdle(fn); });
  }

  /* ---------------- intro ----------------
     Preloader runs ONLY on first load of session or when manually replayed.
     In-between tab changes bypass the preloader completely for instant loading. */
  function bootIntro(overrideOpts) {
    var opts = Object.assign({
      force: false,
      isFast: true
    }, overrideOpts || {});

    // The first view should be useful immediately; the full animation remains
    // available from the explicit “Replay Intro” control.
    if (opts.skip) {
      document.documentElement.classList.remove('intro-lock');
      var skippedIntro = document.getElementById('intro');
      if (skippedIntro) skippedIntro.remove();
      body.setAttribute('data-intro', 'done');
      afterLoad(bootAmbient);
      return Promise.resolve();
    }

    var alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem('halina_intro_played') === 'true';
    } catch (e) {}

    if ((alreadyPlayed && !opts.force) || !capable()) {
      document.documentElement.classList.remove('intro-lock');
      var old = document.getElementById('intro');
      if (old) old.remove();
      body.setAttribute('data-intro', 'done');
      afterLoad(bootAmbient);
      return Promise.resolve();
    }

    body.setAttribute('data-intro', 'running');

    var existing = document.getElementById('intro');
    if (existing) existing.remove();

    return import('./three/intro.js')
      .then(function (mod) {
        return mod.runIntro(opts);
      })
      .catch(function (err) {
        if (window.console && console.info) {
          console.info('[Halina] Intro skipped.', err && err.message);
        }
        document.documentElement.classList.remove('intro-lock');
        var el = document.getElementById('intro');
        if (el) el.remove();
      })
      .then(function () {
        try {
          sessionStorage.setItem('halina_intro_played', 'true');
        } catch (e) {}
        body.setAttribute('data-intro', 'done');
        afterLoad(bootAmbient);
      });
  }

  window.replayIntro = function () {
    return bootIntro({ force: true, isFast: false });
  };
  window.runIntro = bootIntro;

  bootIntro({ skip: true });
})();

/* ============================================================
   Halina Travels — Background Music Manager
   • Plays bgmusic.mp3 seamlessly on loop across all pages
   • Persists currentTime and mute preference in localStorage
   • Floating glassmorphism Mute / Unmute control button
   ============================================================ */
(function initBackgroundMusic() {
  if (window.__halinaBgMusicInitialized) return;
  window.__halinaBgMusicInitialized = true;

  // Resolve audio path relative to script location
  var audioSrc = 'assets/audio/bgmusic.mp3';
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    if (src.indexOf('assets/js/main.js') !== -1) {
      audioSrc = src.replace('assets/js/main.js', 'assets/audio/bgmusic.mp3');
      break;
    }
  }

  var audio = new Audio(audioSrc);
  audio.loop = true;
  audio.preload = 'none';

  // Restore saved state from localStorage
  var STORAGE_KEY_TIME = 'halina_bgmusic_time';
  var STORAGE_KEY_MUTED = 'halina_bgmusic_muted';

  var savedTime = localStorage.getItem(STORAGE_KEY_TIME);
  if (savedTime && !isNaN(savedTime)) {
    audio.currentTime = parseFloat(savedTime);
  }

  var isMuted = localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
  audio.muted = isMuted;

  function saveAudioState() {
    try {
      if (!isNaN(audio.currentTime)) {
        localStorage.setItem(STORAGE_KEY_TIME, audio.currentTime.toString());
      }
      localStorage.setItem(STORAGE_KEY_MUTED, audio.muted ? 'true' : 'false');
    } catch (e) {}
  }

  audio.addEventListener('timeupdate', function () {
    if (Math.floor(audio.currentTime) % 2 === 0) {
      saveAudioState();
    }
  });

  window.addEventListener('beforeunload', saveAudioState);
  window.addEventListener('pagehide', saveAudioState);

  // Inject Styles for Floating Controls (Round Facebook Chat Button & Round Music Button)
  var style = document.createElement('style');
  style.textContent = `
    .halina-chat-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #ffffff;
      color: #0084FF;
      border: 1px solid rgba(245, 158, 11, 0.25);
      box-shadow: 0 6px 22px rgba(122, 12, 30, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      outline: none;
      text-decoration: none;
    }
    .halina-chat-toggle:hover {
      transform: translateY(-3px) scale(1.08);
      box-shadow: 0 10px 28px rgba(122, 12, 30, 0.38), 0 0 18px rgba(245, 158, 11, 0.4);
      background: #ffffff;
    }
    .halina-chat-toggle:active {
      transform: translateY(0) scale(0.95);
    }
    .halina-chat-icon {
      width: 28px;
      height: 28px;
      fill: #0084FF;
    }

    .bg-music-toggle {
      position: fixed;
      bottom: 86px;
      right: 26px;
      z-index: 999999;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: rgba(122, 12, 30, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(245, 158, 11, 0.6);
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(122, 12, 30, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      user-select: none;
      outline: none;
    }
    .bg-music-toggle:hover {
      transform: translateY(-2px) scale(1.08);
      background: rgba(200, 16, 46, 0.95);
      border-color: rgba(245, 158, 11, 0.9);
      box-shadow: 0 8px 22px rgba(122, 12, 30, 0.5), 0 0 14px rgba(245, 158, 11, 0.35);
    }
    .bg-music-toggle:active {
      transform: translateY(0) scale(0.95);
    }
    .bg-music-toggle .bg-music-label {
      display: none !important;
    }
    .bg-music-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
    .bg-music-bars {
      display: inline-flex;
      align-items: flex-end;
      gap: 2.5px;
      height: 14px;
    }
    .bg-music-bar {
      width: 2.5px;
      background-color: #F59E0B;
      border-radius: 2px;
      animation: soundwave 1.2s ease-in-out infinite alternate;
    }
    .bg-music-bar:nth-child(1) { height: 45%; animation-delay: 0.1s; }
    .bg-music-bar:nth-child(2) { height: 100%; animation-delay: 0.35s; }
    .bg-music-bar:nth-child(3) { height: 65%; animation-delay: 0.2s; }
    .bg-music-toggle.muted .bg-music-bar {
      animation: none !important;
      height: 2px !important;
      background-color: #D6A874 !important;
    }
    .bg-music-muted-icon {
      display: none;
      width: 18px;
      height: 18px;
      fill: #F59E0B;
    }
    .bg-music-toggle.muted .bg-music-muted-icon {
      display: block;
      fill: #D6A874;
    }
    .bg-music-toggle.muted .bg-music-bars {
      display: none;
    }
    @keyframes soundwave {
      0% { height: 25%; }
      100% { height: 100%; }
    }
    @media (max-width: 600px) {
      .halina-chat-toggle {
        bottom: 14px;
        right: 14px;
        width: 50px;
        height: 50px;
      }
      .halina-chat-icon {
        width: 25px;
        height: 25px;
      }
      .bg-music-toggle {
        bottom: 72px;
        right: 19px;
        width: 40px;
        height: 40px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create Control Button
  var btn = document.createElement('button');
  btn.className = 'bg-music-toggle' + (audio.muted ? ' muted' : '');
  btn.setAttribute('aria-label', 'Toggle background music');
  btn.setAttribute('title', 'Toggle background music');
  btn.setAttribute('type', 'button');

  btn.innerHTML = `
    <div class="bg-music-icon-wrapper">
      <div class="bg-music-bars">
        <span class="bg-music-bar"></span>
        <span class="bg-music-bar"></span>
        <span class="bg-music-bar"></span>
      </div>
      <svg class="bg-music-muted-icon" viewBox="0 0 24 24">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      </svg>
    </div>
    <span class="bg-music-label" id="bgMusicLabel">${audio.muted ? 'Music Muted' : 'Music Playing'}</span>
  `;

  function updateUI() {
    var isActuallyMuted = audio.muted || audio.paused;
    if (isActuallyMuted) {
      btn.classList.add('muted');
      var label = document.getElementById('bgMusicLabel');
      if (label) label.textContent = audio.muted ? 'Music Muted' : 'Play Music';
    } else {
      btn.classList.remove('muted');
      var label = document.getElementById('bgMusicLabel');
      if (label) label.textContent = 'Music Playing';
    }
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (audio.paused) {
      audio.muted = false;
      audio.play().then(function () {
        updateUI();
        saveAudioState();
      }).catch(function (err) {
        console.warn('Audio play failed:', err);
        updateUI();
      });
    } else {
      audio.muted = !audio.muted;
      updateUI();
      saveAudioState();
    }
  });

  // Create Round Floating Facebook Chat Link
  var chatBtn = document.createElement('a');
  chatBtn.id = 'halinaChatBtn';
  chatBtn.className = 'halina-chat-toggle';
  chatBtn.href = 'https://www.facebook.com/';
  chatBtn.target = '_blank';
  chatBtn.rel = 'noopener noreferrer';
  chatBtn.setAttribute('aria-label', 'Chat with us on Facebook');
  chatBtn.setAttribute('title', 'Chat with us on Facebook');
  chatBtn.innerHTML = `
    <svg class="halina-chat-icon" viewBox="0 0 24 24">
      <path fill="#0084FF" d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.513 3.734 7.224V22l3.432-1.884c.915.253 1.885.39 2.834.39 5.523 0 10-4.145 10-9.248C22 6.145 17.523 2 12 2zm1.042 12.433l-2.584-2.756-5.042 2.756 5.542-5.889 2.646 2.756 4.98-2.756-5.542 5.889z"/>
    </svg>
  `;

  function appendFloatingControls() {
    if (!document.getElementById('bgMusicBtn')) {
      btn.id = 'bgMusicBtn';
      document.body.appendChild(btn);
    }
    if (!document.getElementById('halinaChatBtn')) {
      document.body.appendChild(chatBtn);
    }
    ensureNavbarIconButtons();
  }

  function ensureNavbarIconButtons() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    if (!nav.querySelector('.nav-call-btn')) {
      var callBtn = document.createElement('a');
      callBtn.className = 'nav-icon-btn nav-call-btn';
      callBtn.href = 'tel:02079460958';
      callBtn.title = 'Call 020 7946 0958';
      callBtn.setAttribute('aria-label', 'Call Us');
      callBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>';
      
      var quoteBtn = nav.querySelector('.btn') || nav.querySelector('.hamburger');
      if (quoteBtn) nav.insertBefore(callBtn, quoteBtn);
      else nav.appendChild(callBtn);
    }
    if (!nav.querySelector('.nav-email-btn')) {
      var emailBtn = document.createElement('a');
      emailBtn.className = 'nav-icon-btn nav-email-btn';
      emailBtn.href = 'mailto:hello@halinatravels.co.uk';
      emailBtn.title = 'Email hello@halinatravels.co.uk';
      emailBtn.setAttribute('aria-label', 'Email Us');
      emailBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>';

      var quoteBtn = nav.querySelector('.btn') || nav.querySelector('.hamburger');
      if (quoteBtn) nav.insertBefore(emailBtn, quoteBtn);
      else nav.appendChild(emailBtn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendFloatingControls);
  } else {
    appendFloatingControls();
  }

  // Autoplay attempt
  function tryAutoplay() {
    var playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(function () {
        updateUI();
      }).catch(function () {
        // Autoplay policy prevented playback without gesture
        updateUI();
        var unlockEvents = ['click', 'touchstart', 'keydown', 'scroll', 'pointerdown'];
        function onUserInteraction() {
          if (audio.paused && !audio.muted) {
            audio.play().then(function () {
              updateUI();
            }).catch(function () {});
          }
          unlockEvents.forEach(function (evt) {
            window.removeEventListener(evt, onUserInteraction, true);
          });
        }
        unlockEvents.forEach(function (evt) {
          window.addEventListener(evt, onUserInteraction, { once: true, capture: true });
        });
      });
    }
  }

  tryAutoplay();
})();
