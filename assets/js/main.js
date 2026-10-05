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
    return !motionOff() && hasWebGL();
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
     Runs immediately (not on idle) so the visitor never sees a
     flash of the site before the overlay appears. If anything at
     all goes wrong we just skip straight to the site.          */
  function bootIntro(overrideOpts) {
    if (!capable()) {
      afterLoad(bootAmbient);
      return Promise.resolve();
    }

    body.setAttribute('data-intro', 'running');

    var existing = document.getElementById('intro');
    if (existing) existing.remove();

    var opts = Object.assign({
      isFast: true,
      rate: 4.8
    }, overrideOpts || {});

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
        body.setAttribute('data-intro', 'done');
        afterLoad(bootAmbient);
      });
  }

  window.replayIntro = bootIntro;
  window.runIntro = bootIntro;

  bootIntro();
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
  var audioSrc = 'bgmusic.mp3';
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    if (src.indexOf('assets/js/main.js') !== -1) {
      audioSrc = src.replace('assets/js/main.js', 'bgmusic.mp3');
      break;
    }
  }

  var audio = new Audio(audioSrc);
  audio.loop = true;
  audio.preload = 'auto';

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

  // Inject Styles for Mute/Unmute Floating Button
  var style = document.createElement('style');
  style.textContent = `
    .bg-music-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      background: rgba(60, 14, 56, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(242, 179, 61, 0.5);
      border-radius: 50px;
      color: #ffffff;
      font-family: "Nunito", "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(60, 14, 56, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      user-select: none;
      outline: none;
    }
    .bg-music-toggle:hover {
      transform: translateY(-2px) scale(1.04);
      background: rgba(90, 22, 80, 0.95);
      border-color: rgba(242, 179, 61, 0.9);
      box-shadow: 0 12px 32px rgba(60, 14, 56, 0.5), 0 0 18px rgba(242, 179, 61, 0.35);
    }
    .bg-music-toggle:active {
      transform: translateY(0) scale(0.97);
    }
    .bg-music-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: rgba(242, 179, 61, 0.2);
      border-radius: 50%;
      color: #F2B33D;
      transition: background 0.3s, color 0.3s;
    }
    .bg-music-toggle.muted .bg-music-icon-wrapper {
      background: rgba(255, 255, 255, 0.12);
      color: #A0939C;
    }
    .bg-music-bars {
      display: inline-flex;
      align-items: flex-end;
      gap: 2.5px;
      height: 14px;
      width: 14px;
    }
    .bg-music-bar {
      width: 3px;
      background-color: #F2B33D;
      border-radius: 2px;
      animation: soundwave 1.2s ease-in-out infinite alternate;
    }
    .bg-music-bar:nth-child(1) { height: 45%; animation-delay: 0.1s; }
    .bg-music-bar:nth-child(2) { height: 100%; animation-delay: 0.35s; }
    .bg-music-bar:nth-child(3) { height: 65%; animation-delay: 0.2s; }
    .bg-music-toggle.muted .bg-music-bar {
      animation: none !important;
      height: 2px !important;
      background-color: #A0939C !important;
    }
    .bg-music-toggle.muted .bg-music-bars {
      align-items: center;
    }
    .bg-music-muted-icon {
      display: none;
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .bg-music-toggle.muted .bg-music-muted-icon {
      display: block;
    }
    .bg-music-toggle.muted .bg-music-bars {
      display: none;
    }
    @keyframes soundwave {
      0% { height: 25%; }
      100% { height: 100%; }
    }
    @media (max-width: 600px) {
      .bg-music-toggle {
        bottom: 16px;
        right: 16px;
        padding: 8px 14px;
        font-size: 12px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create Control Button
  var btn = document.createElement('button');
  btn.className = 'bg-music-toggle' + (audio.muted ? ' muted' : '');
  btn.setAttribute('aria-label', 'Toggle background music');
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

  function appendButton() {
    if (!document.getElementById('bgMusicBtn')) {
      btn.id = 'bgMusicBtn';
      document.body.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendButton);
  } else {
    appendButton();
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

