/* ============================================================
   Halina Travels — Phase 1 motion layer (no dependencies)
   Runs on every device. Also acts as the fallback experience
   when WebGL / three.js is unavailable.
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;
  var reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    body.getAttribute('data-motion') === 'off';

  body.setAttribute('data-motion-ready', '1');
  if (reduced) {
    body.setAttribute('data-motion', 'off');
    return; // hard kill switch — the site renders exactly as before
  }

  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------------------------------------------------
     1. Single rAF scroll loop -> CSS custom properties
     --------------------------------------------------------- */
  var parallaxItems = [];
  var ticking = false;

  function collectParallax() {
    parallaxItems = [].slice.call(document.querySelectorAll('[data-parallax]')).map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.12, y: 0 };
    });
  }

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    body.style.setProperty('--scroll-y', document.documentElement.scrollTop + 'px');

    for (var i = 0; i < parallaxItems.length; i++) {
      var it = parallaxItems[i];
      var r = it.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var progress = (r.top + r.height / 2 - vh / 2) / vh; // -1 .. 1
      var target = -progress * it.speed * 100;
      it.y = lerp(it.y, target, 0.18);
      it.el.style.setProperty('--py', it.y.toFixed(2) + 'px');
    }
  }

  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', function () { collectParallax(); requestFrame(); }, { passive: true });

  /* ---------------------------------------------------------
     2. Tag content for staggered reveals
        (runs BEFORE the page's own IntersectionObserver, so the
         existing .reveal/.show machinery picks these up)
     --------------------------------------------------------- */
  function stagger(selector, step, base) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
      el.style.transitionDelay = ((base || 0) + i * step).toFixed(3) + 's';
    }
  }

  stagger('#offers .grid > *', 0.09);
  stagger('.dest .track > *', 0.07);
  stagger('.why .grid > *', 0.08);
  stagger('.reviews .grid > *', 0.09);
  stagger('#faq .qa', 0.05);

  /* Heading underline sweep */
  var heads = document.querySelectorAll('.sec-title h2, .sec-head h2');
  for (var h = 0; h < heads.length; h++) heads[h].classList.add('fx-underline');

  /* ---------------------------------------------------------
     3. Depth / parallax targets
     --------------------------------------------------------- */
  function mark(selector, attr, value) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute(attr, value);
  }

  mark('.about .photo', 'data-parallax', '0.10');
  mark('.xmas .poster .bgimg', 'data-parallax', '0.14');

  var reviewCards = document.querySelectorAll('.reviews .grid > *');
  for (var r = 0; r < reviewCards.length; r++) {
    reviewCards[r].classList.add('fx-depth');
    reviewCards[r].style.setProperty('--depth', (r % 3 === 1 ? 26 : 0) + 'px');
  }

  collectParallax();
  requestFrame();

  /* ---------------------------------------------------------
     4. Magnetic buttons (desktop pointer only)
     --------------------------------------------------------- */
  if (fine) {
    var magnets = document.querySelectorAll('.btn, .votebtn, .dcard .vf');
    for (var m = 0; m < magnets.length; m++) {
      (function (el) {
        el.classList.add('fx-magnet');
        var raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
        function run() {
          cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2);
          el.style.setProperty('--mx', cx.toFixed(2) + 'px');
          el.style.setProperty('--my', cy.toFixed(2) + 'px');
          if (Math.abs(cx - tx) > 0.1 || Math.abs(cy - ty) > 0.1) raf = requestAnimationFrame(run);
          else raf = 0;
        }
        el.addEventListener('pointermove', function (e) {
          var b = el.getBoundingClientRect();
          tx = clamp((e.clientX - (b.left + b.width / 2)) * 0.28, -14, 14);
          ty = clamp((e.clientY - (b.top + b.height / 2)) * 0.42, -10, 10);
          if (!raf) raf = requestAnimationFrame(run);
        });
        el.addEventListener('pointerleave', function () {
          tx = 0; ty = 0;
          if (!raf) raf = requestAnimationFrame(run);
        });
      })(magnets[m]);
    }
  }

  /* ---------------------------------------------------------
     5. 3D card tilt
     --------------------------------------------------------- */
  if (fine) {
    var tiltables = document.querySelectorAll('.dcard, #offers .grid > *, .why .grid > *, .reviews .grid > *, .farecard');
    for (var t = 0; t < tiltables.length; t++) {
      (function (el) {
        el.classList.add('fx-tilt');
        var raf = 0, trx = 0, tryy = 0, crx = 0, cry = 0, hovering = false;
        function run() {
          crx = lerp(crx, trx, 0.14); cry = lerp(cry, tryy, 0.14);
          el.style.setProperty('--rx', crx.toFixed(2) + 'deg');
          el.style.setProperty('--ry', cry.toFixed(2) + 'deg');
          if (hovering || Math.abs(crx) > 0.05 || Math.abs(cry) > 0.05) raf = requestAnimationFrame(run);
          else raf = 0;
        }
        el.addEventListener('pointerenter', function () { hovering = true; if (!raf) raf = requestAnimationFrame(run); });
        el.addEventListener('pointermove', function (e) {
          var b = el.getBoundingClientRect();
          var px = (e.clientX - b.left) / b.width - 0.5;
          var py = (e.clientY - b.top) / b.height - 0.5;
          trx = clamp(-py * 11, -8, 8);
          tryy = clamp(px * 13, -9, 9);
          el.style.setProperty('--gx', (px * 100 + 50).toFixed(1) + '%');
          el.style.setProperty('--gy', (py * 100 + 50).toFixed(1) + '%');
        });
        el.addEventListener('pointerleave', function () {
          hovering = false; trx = 0; tryy = 0;
          if (!raf) raf = requestAnimationFrame(run);
        });
      })(tiltables[t]);
    }
  }

  /* ---------------------------------------------------------
     6. Destination cards: 3D map-pin pop on hover
     --------------------------------------------------------- */
  var dcards = document.querySelectorAll('.dcard');
  for (var d = 0; d < dcards.length; d++) {
    if (dcards[d].querySelector('.fx-pin')) continue;
    var pin = document.createElement('span');
    pin.className = 'fx-pin';
    pin.setAttribute('aria-hidden', 'true');
    pin.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>';
    dcards[d].appendChild(pin);
  }

  /* ---------------------------------------------------------
     7. Airlines marquee -> 3D ring perspective
     --------------------------------------------------------- */
  var airWrap = document.querySelector('.airlines .marquee');
  if (airWrap) {
    var stage = airWrap.parentNode;
    if (stage && stage.classList) stage.classList.add('fx-ring-stage');
    airWrap.classList.add('fx-ring');
  }



  /* ---------------------------------------------------------
     9. Tiny API for the 3D layer
     --------------------------------------------------------- */
  window.HalinaMotion = {
    reduced: reduced,
    fine: fine,
    refresh: function () { collectParallax(); requestFrame(); }
  };
})();
