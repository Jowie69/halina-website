/* ============================================================
   Halina Travels — Ollie the Owl Companion (powered by page-mascot)
   ============================================================ */
(function () {
  'use strict';

  var DIRECTIONS = [
    'up-left', 'up', 'up-right',
    'left', 'center', 'right',
    'down-left', 'down', 'down-right'
  ];

  var REACTIONS = [
    'blink', 'heart', 'sparkle',
    'surprised', 'wink', 'bashful',
    'sleepy', 'dizzy', 'delighted'
  ];

  var CLOCKWISE = [
    'right', 'down-right', 'down', 'down-left',
    'left', 'up-left', 'up', 'up-right'
  ];

  var SECTOR = (Math.PI * 2) / CLOCKWISE.length;
  var HYSTERESIS = 0.12;
  var DEAD_ZONE = 70;
  var PAYOFFS = ['heart', 'sparkle', 'delighted'];
  var BOOP_PAYOFF = 120;
  var BOOP_END = 560;
  var SQUASH_MS = 420;
  var DIZZY_AFTER = 4;
  var DIZZY_WINDOW = 1600;
  var DIZZY_END = 1100;

  var SQUASH = [
    { transform: 'scale(1, 1)', easing: 'ease-in' },
    { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
    { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
    { transform: 'scale(1, 1)' }
  ];

  function getCellPosition(index) {
    var x = (index % 3) * 50;
    var y = Math.floor(index / 3) * 50;
    return x + '% ' + y + '%';
  }

  function wrap(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  /* ---------------------------------------------------------
     Knowledge Base for Halina Travels Owl Assistant
     --------------------------------------------------------- */
  var PHONE = '020 7946 0958';
  var KB = [
    {
      id: 'greeting',
      tags: ['hi', 'hello', 'hey', 'kumusta', 'kamusta', 'musta', 'good morning', 'good afternoon', 'good evening', 'mabuhay', 'halina', 'owl', 'ollie'],
      weight: 0.9,
      answer: 'Hoot hoot! 🦉 I’m Ollie, your Halina Travels owl companion! Ask me about flight fares, Philippine destinations, payment plans, or balikbayan box support — I’m watching over your trip!'
    },
    {
      id: 'thanks',
      tags: ['thanks', 'thank you', 'salamat', 'maraming salamat', 'cheers', 'appreciate'],
      weight: 0.9,
      answer: 'Walang anuman! 🦉 If you need anything else, I’m right here watching. Safe travels!'
    },
    {
      id: 'bye',
      tags: ['bye', 'goodbye', 'paalam', 'see you', 'later'],
      weight: 0.9,
      answer: 'Paalam! Fly back anytime — and tell the team Ollie sent you! 🦉✈️'
    },
    {
      id: 'fares',
      tags: ['price', 'prices', 'fare', 'fares', 'cost', 'how much', 'magkano', 'cheap', 'cheapest', 'deal', 'deals', 'seat sale', 'seat-sale', 'budget', 'rate', 'rates'],
      weight: 1.2,
      answer: 'Here are our top seat-sale fares (return, incl. taxes):<br><br>' +
        '✈️ <b>Manila £479</b> · <b>Cebu £651</b><br>' +
        '🏝️ Boracay £749 · Palawan £799 · Bohol £759<br>' +
        '🏔️ Baguio £899 · Davao £909 · Siargao £956<br><br>' +
        'Travel from September 2026. Use the search box above or call ' + PHONE + ' for a custom quote.'
    },
    {
      id: 'christmas',
      tags: ['christmas', 'xmas', 'pasko', 'holiday season', 'noche buena', 'december', 'festive', 'promo', 'promotion', 'parol', 'homecoming'],
      weight: 1.35,
      answer: 'Our festive seat-sale is live! 🎄<br><br><b>Manila £560 return</b> · <b>Cebu £645 return</b><br><br>' +
        'Valid for travel <b>15 Dec 2026 – 10 Jan 2027</b>. Book early with a deposit before seats fill up!'
    },
    {
      id: 'destinations',
      tags: ['destination', 'destinations', 'where', 'island', 'islands', 'places', 'saan', 'manila', 'cebu', 'boracay', 'palawan', 'bohol', 'siargao', 'davao', 'baguio', 'clark', 'iloilo'],
      weight: 1.1,
      answer: 'We fly to all major Philippine gateways — <b>Manila, Cebu, Clark, Davao, Iloilo</b> and more — plus island hops like <b>Palawan, Boracay, Bohol and Siargao</b>. 🌴'
    },
    {
      id: 'booking',
      tags: ['book', 'booking', 'reserve', 'reservation', 'how do i book', 'paano', 'process', 'quote', 'enquire', 'inquiry', 'enquiry'],
      weight: 1.15,
      answer: 'Three easy ways to book:<br><br>1️⃣ Search your dates in the flight box above<br>2️⃣ Click <b>Get a Quote</b><br>3️⃣ Call or WhatsApp us on <b>' + PHONE + '</b><br><br>' +
        'We confirm your fare, take a deposit, and send tickets same-day! 🎫'
    },
    {
      id: 'payment',
      tags: ['payment', 'pay', 'deposit', 'instalment', 'installment', 'instalments', 'finance', 'plan', 'plans', 'spread', 'hulugan', 'monthly'],
      weight: 1.25,
      answer: 'Yes! We offer <b>flexible payment plans</b>. 💳<br><br>Lock in your flights early with a small deposit and pay off the rest gradually.'
    },
    {
      id: 'protection',
      tags: ['protected', 'protection', 'atol', 'safe', 'secure', 'guarantee', 'refund', 'trust', 'legit', 'scam', 'iata', 'bonded'],
      weight: 1.2,
      answer: 'You’re 100% safe with us. 🛡️<br><br>Your money is <b>fully protected on package bookings</b>, and all flights are booked through trusted <b>IATA-accredited partners</b>.'
    },
    {
      id: 'contact',
      tags: ['contact', 'phone', 'number', 'email', 'call', 'whatsapp', 'address', 'office', 'london', 'where are you', 'location'],
      weight: 1.2,
      answer: '📞 Phone / WhatsApp: <b>' + PHONE + '</b><br>✉️ Email: <b>hello@halinatravels.co.uk</b><br>📍 Office: 12 Stephen Mews, Fitzrovia, London W1T 1AH'
    }
  ];

  function queryKB(q) {
    var query = q.toLowerCase();
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      var score = 0;
      for (var j = 0; j < item.tags.length; j++) {
        var tag = item.tags[j];
        if (query.indexOf(tag) !== -1) {
          score += tag.length * item.weight;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && bestScore > 2) return best.answer;
    return 'Hoot! 🦉 I can help with flight fares, Philippine destinations, deposits, or booking options. What would you like to check?';
  }

  /* ---------------------------------------------------------
     Build Mascot & Chat DOM
     --------------------------------------------------------- */
  function initMascot() {
    if (document.getElementById('mascot-host')) return;

    var host = document.createElement('div');
    host.id = 'mascot-host';

    // Speech bubble
    var bubble = document.createElement('div');
    bubble.className = 'mascot-speech-bubble';
    bubble.textContent = 'Hoot hoot! Need travel help? Tap me 🦉';
    host.appendChild(bubble);

    // Mascot Button & Layers
    var btn = document.createElement('button');
    btn.className = 'mascot-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Boop Ollie the Owl, Halina Travels mascot');

    var badge = document.createElement('span');
    badge.className = 'mascot-badge';
    btn.appendChild(badge);

    var squashSpan = document.createElement('span');
    squashSpan.className = 'mascot-squash';

    var dirLayer = document.createElement('span');
    dirLayer.className = 'mascot-layer directions';
    squashSpan.appendChild(dirLayer);

    var reactLayer = document.createElement('span');
    reactLayer.className = 'mascot-layer reactions';
    reactLayer.style.opacity = '0';
    squashSpan.appendChild(reactLayer);

    btn.appendChild(squashSpan);
    host.appendChild(btn);

    // Chat dialog
    var chat = document.createElement('div');
    chat.className = 'mascot-chat';
    chat.id = 'mascot-chat';
    chat.setAttribute('role', 'dialog');
    chat.setAttribute('aria-label', 'Chat with Ollie the Owl');
    chat.innerHTML =
      '<div class="mascot-chat-head">' +
        '<span class="mascot-chat-avatar">🦉</span>' +
        '<div><div class="mascot-chat-who">Ollie the Owl</div><div class="mascot-chat-sub">Halina Travels companion</div></div>' +
        '<button class="mascot-chat-close" type="button" aria-label="Close chat">×</button>' +
      '</div>' +
      '<div class="mascot-chat-log" role="log" aria-live="polite"></div>' +
      '<div class="mascot-chips"></div>' +
      '<form class="mascot-form" autocomplete="off">' +
        '<input type="text" name="q" placeholder="Ask Ollie about flight deals…" aria-label="Ask Ollie a question">' +
        '<button type="submit" aria-label="Send question">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M2.2 21l19.3-9L2.2 3l.01 7L16 12 2.21 14z"/></svg>' +
        '</button>' +
      '</form>';

    document.body.appendChild(host);
    document.body.appendChild(chat);

    // Show bubble on load, then auto-hide after 5 seconds
    setTimeout(function() {
      bubble.classList.add('show');
      setTimeout(function() { bubble.classList.remove('show'); }, 5000);
    }, 1500);

    /* ---------------------------------------------------------
       Cursor Pointer Direction Tracking & Reaction Logic
       --------------------------------------------------------- */
    var currentDirection = 'center';
    var currentReaction = null;
    var sector = -1;
    var pointer = null;
    var boopTimers = [];
    var boopsCount = 0;
    var lastBoopAt = 0;

    function setDirection(dir) {
      if (currentDirection === dir && !currentReaction) return;
      currentDirection = dir;
      if (!currentReaction) {
        var idx = DIRECTIONS.indexOf(dir);
        if (idx !== -1) dirLayer.style.backgroundPosition = getCellPosition(idx);
      }
    }

    function setReaction(react) {
      currentReaction = react;
      if (react) {
        var idx = REACTIONS.indexOf(react);
        if (idx !== -1) reactLayer.style.backgroundPosition = getCellPosition(idx);
        reactLayer.style.opacity = '1';
        dirLayer.style.opacity = '0';
      } else {
        reactLayer.style.opacity = '0';
        dirLayer.style.opacity = '1';
        setDirection(currentDirection);
      }
    }

    function aim() {
      if (!pointer) return;
      var box = btn.getBoundingClientRect();
      var dx = pointer.x - (box.left + box.width / 2);
      var dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDirection('center');
        return;
      }

      var angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) {
        return;
      }
      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    }

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('pointermove', function(e) {
        pointer = { x: e.clientX, y: e.clientY };
        aim();
      }, { passive: true });
      window.addEventListener('scroll', aim, { passive: true });
    }

    /* ---------------------------------------------------------
       Boop & Chat Toggle
       --------------------------------------------------------- */
    function clearBoopTimers() {
      boopTimers.forEach(window.clearTimeout);
      boopTimers = [];
    }

    function later(ms, fn) {
      boopTimers.push(setTimeout(fn, ms));
    }

    function boop() {
      clearBoopTimers();
      var now = Date.now();
      boopsCount = (now - lastBoopAt < DIZZY_WINDOW) ? boopsCount + 1 : 1;
      lastBoopAt = now;

      if (boopsCount >= DIZZY_AFTER) {
        boopsCount = 0;
        setReaction('dizzy');
        later(DIZZY_END, function() { setReaction(null); });
      } else {
        setReaction('blink');
        var pay = PAYOFFS[(boopsCount - 1) % PAYOFFS.length];
        later(BOOP_PAYOFF, function() { setReaction(pay); });
        later(BOOP_END, function() { setReaction(null); });
      }

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && squashSpan.animate) {
        squashSpan.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' });
      }

      // Toggle Chat Dialog
      chat.classList.toggle('open');
      if (chat.classList.contains('open')) {
        badge.style.display = 'none';
        if (chatLog.children.length === 0) {
          addBotMsg('Hoot! 🦉 Welcome to Halina Travels. I’m Ollie! How can I help with your Philippines homecoming or island getaway today?');
          renderChips(['Flight Fares', 'Christmas Sale', 'Payment Plans', 'Destinations']);
        }
      }
    }

    btn.addEventListener('click', boop);

    // Chat functionality
    var chatLog = chat.querySelector('.mascot-chat-log');
    var chatForm = chat.querySelector('.mascot-form');
    var chatInput = chatForm.querySelector('input');
    var chatChips = chat.querySelector('.mascot-chips');
    var chatClose = chat.querySelector('.mascot-chat-close');

    chatClose.addEventListener('click', function() { chat.classList.remove('open'); });

    function addBotMsg(html) {
      var msg = document.createElement('div');
      msg.className = 'mascot-msg bot';
      msg.innerHTML = html;
      chatLog.appendChild(msg);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function addUserMsg(text) {
      var msg = document.createElement('div');
      msg.className = 'mascot-msg user';
      msg.textContent = text;
      chatLog.appendChild(msg);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function renderChips(list) {
      chatChips.innerHTML = '';
      list.forEach(function(label) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'mascot-chip';
        chip.textContent = label;
        chip.addEventListener('click', function() {
          addUserMsg(label);
          setTimeout(function() {
            addBotMsg(queryKB(label));
          }, 300);
        });
        chatChips.appendChild(chip);
      });
    }

    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var q = chatInput.value.trim();
      if (!q) return;
      addUserMsg(q);
      chatInput.value = '';
      setTimeout(function() {
        addBotMsg(queryKB(q));
      }, 350);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMascot);
  } else {
    initMascot();
  }
})();
