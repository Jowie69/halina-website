/* ============================================================
   Halina Travels — "Buddy" the companion

   A sprite-animated dog that lives in the corner, reacts to
   scrolling, and answers visitor questions from a preset
   knowledge base drawn from this site's own content.

   Anything outside that knowledge base gets a polite
   "I can only help with Halina Travels" reply — the companion
   never invents an answer.
   ============================================================ */
(function () {
  'use strict';

  var PHONE = '020 7946 0958';
  var EMAIL = 'hello@halinatravels.co.uk';

  /* ---------------------------------------------------------
     Knowledge base.
     `tags` are matched against the visitor's words; `weight`
     breaks ties so specific topics beat generic ones.
     --------------------------------------------------------- */
  var KB = [
    {
      id: 'greeting',
      tags: ['hi', 'hello', 'hey', 'kumusta', 'kamusta', 'musta', 'good morning', 'good afternoon', 'good evening', 'mabuhay', 'halina'],
      weight: 0.9,
      answer: 'Kumusta! 🐾 I’m Buddy, the Halina Travels pup. Ask me about fares, destinations, payment plans, balikbayan boxes or how to book — I’ll fetch the answer!'
    },
    {
      id: 'thanks',
      tags: ['thanks', 'thank you', 'salamat', 'maraming salamat', 'cheers', 'appreciate'],
      weight: 0.9,
      answer: 'Walang anuman! 🐕 If you need anything else, I’m right here. Safe travels!'
    },
    {
      id: 'bye',
      tags: ['bye', 'goodbye', 'paalam', 'see you', 'later'],
      weight: 0.9,
      answer: 'Paalam! Come back anytime — and tell the team Buddy sent you. 🐾'
    },
    {
      id: 'fares',
      tags: ['price', 'prices', 'fare', 'fares', 'cost', 'how much', 'magkano', 'cheap', 'cheapest', 'deal', 'deals', 'seat sale', 'seat-sale', 'budget', 'rate', 'rates'],
      weight: 1.2,
      answer: 'Here are our current seat-sale fares (return, incl. taxes):<br><br>' +
        '✈️ <b>Manila £479</b> · <b>Cebu £651</b><br>' +
        '🏝️ Boracay £749 · Palawan £799 · Bohol £759<br>' +
        '🏔️ Baguio £899 · Davao £909 · Siargao £956<br><br>' +
        'Travel from September 2026. Use the search box above for live dates, or call ' + PHONE + ' for a tailored quote.'
    },
    {
      id: 'christmas',
      tags: ['christmas', 'xmas', 'pasko', 'holiday season', 'noche buena', 'december', 'festive', 'promo', 'promotion', 'parol', 'homecoming'],
      weight: 1.35,
      answer: 'Our festive seat-sale is live! 🎄<br><br><b>Manila £560 return</b> · <b>Cebu £645 return</b><br><br>' +
        'Valid for travel <b>15 Dec 2026 – 10 Jan 2027</b>, subject to availability. Book early with a small deposit — Christmas seats to the Philippines go fast, so mas maaga, mas mura!'
    },
    {
      id: 'destinations',
      tags: ['destination', 'destinations', 'where', 'island', 'islands', 'places', 'saan', 'manila', 'cebu', 'boracay', 'palawan', 'bohol', 'siargao', 'davao', 'baguio', 'clark', 'iloilo', 'el nido', 'coron'],
      weight: 1.1,
      answer: 'We fly to all major Philippine gateways — <b>Manila, Cebu, Clark, Davao, Iloilo</b> and more — plus onward islands like <b>Palawan, Boracay, Bohol and Siargao</b>.<br><br>We can also build in stopovers in Hong Kong, Singapore or Dubai to break up the journey. 🌴'
    },
    {
      id: 'booking',
      tags: ['book', 'booking', 'reserve', 'reservation', 'how do i book', 'paano', 'process', 'quote', 'enquire', 'inquiry', 'enquiry'],
      weight: 1.15,
      answer: 'Three easy ways to book:<br><br>1️⃣ Search your dates in the flight box above<br>2️⃣ Hit <b>Get a Quote</b> and we’ll come back to you<br>3️⃣ Call or WhatsApp us on <b>' + PHONE + '</b><br><br>' +
        'We’ll confirm your fare, take a deposit, and email your tickets the same day. 🎫'
    },
    {
      id: 'payment',
      tags: ['payment', 'pay', 'deposit', 'instalment', 'installment', 'instalments', 'finance', 'plan', 'plans', 'spread', 'hulugan', 'monthly', 'afford'],
      weight: 1.25,
      answer: 'Yes — we offer <b>flexible payment plans</b>. 💳<br><br>Secure most fares with a small deposit and spread the balance over easy instalments. It’s the most popular way to lock in a Christmas homecoming early while paying it off gradually.'
    },
    {
      id: 'protection',
      tags: ['protected', 'protection', 'atol', 'safe', 'secure', 'guarantee', 'refund', 'trust', 'legit', 'scam', 'iata', 'bonded', 'financial'],
      weight: 1.2,
      answer: 'You’re in safe hands. 🛡️<br><br>Your money is <b>fully protected on package bookings</b>, and all flights are booked through trusted <b>IATA-accredited partners</b>. We’ve been looking after Filipino travellers from London since 2011.'
    },
    {
      id: 'why',
      tags: ['why', 'why book', 'why choose', 'better', 'benefit', 'benefits', 'advantage', 'different', 'reason'],
      weight: 1.0,
      answer: 'Because we combine exclusive agency fares with genuine Filipino hospitality. 🧡<br><br>Our specialists compare <b>24+ airlines</b>, can hold seats while you decide, and support you before, during and after your trip — in English, Tagalog or Bisaya.'
    },
    {
      id: 'airlines',
      tags: ['airline', 'airlines', 'carrier', 'fly with', 'emirates', 'qatar', 'etihad', 'cathay', 'singapore airlines', 'turkish', 'direct', 'stopover', 'layover'],
      weight: 1.15,
      answer: 'We partner with the world’s best carriers to Manila and Cebu:<br><br>' +
        '• Cathay Pacific — via Hong Kong<br>• Emirates — via Dubai<br>• Qatar Airways — via Doha<br>' +
        '• Etihad Airways — via Abu Dhabi<br>• Singapore Airlines — via Singapore<br>• Turkish Airlines — via Istanbul<br><br>' +
        'We’ll find you the smartest routing, whether that’s fastest or cheapest.'
    },
    {
      id: 'balikbayan',
      tags: ['balikbayan', 'box', 'boxes', 'padala', 'cargo', 'shipping', 'send', 'parcel', 'pasalubong'],
      weight: 1.3,
      answer: 'Yes, we handle <b>balikbayan boxes</b>! 📦<br><br>It’s one of our core services alongside flights — perfect for sending pasalubong home to the family. Ring the team on <b>' + PHONE + '</b> for current box sizes and rates.'
    },
    {
      id: 'services',
      tags: ['service', 'services', 'offer', 'package', 'packages', 'holiday', 'holidays', 'tour', 'tours', 'island hopping', 'beach', 'honeymoon', 'reunion', 'group', 'groups'],
      weight: 1.05,
      answer: 'Beyond flights we arrange:<br><br>🏖️ Beach escapes<br>👪 Family reunions<br>⛵ Island hopping<br>📦 Balikbayan boxes<br>🧳 Group bookings<br><br>Tell us what you have in mind and we’ll build it around your budget.'
    },
    {
      id: 'contact',
      tags: ['contact', 'phone', 'call', 'number', 'whatsapp', 'email', 'reach', 'speak', 'talk', 'message', 'get in touch', 'customer service', 'support'],
      weight: 1.2,
      answer: 'Here’s how to reach the team: 📞<br><br>' +
        '<b>Phone / WhatsApp:</b> ' + PHONE + '<br>' +
        '<b>Email:</b> <a href="mailto:' + EMAIL + '">' + EMAIL + '</a><br><br>' +
        'Or scroll down to the contact section and we’ll call you back.'
    },
    {
      id: 'location',
      tags: ['where are you', 'address', 'office', 'location', 'located', 'visit', 'branch', 'london', 'shop', 'walk in'],
      weight: 1.2,
      answer: 'You’ll find us in central London: 📍<br><br><b>12 Stephen Mews, Fitzrovia, London W1T 1AH</b><br><br>Pop in for a chat, or call ahead on ' + PHONE + ' so we can have your options ready.'
    },
    {
      id: 'language',
      tags: ['tagalog', 'bisaya', 'filipino', 'language', 'speak tagalog', 'english', 'cebuano', 'salita'],
      weight: 1.2,
      answer: 'Oo naman! 🇵🇭 Our team speaks <b>English, Tagalog and Bisaya</b>.<br><br>You can explain exactly what you need in whichever language feels most natural — sa puso at sa Tagalog.'
    },
    {
      id: 'about',
      tags: ['who are you', 'about', 'company', 'halina travels', 'agency', 'history', 'story', 'established', 'since'],
      weight: 1.0,
      answer: 'Halina Travels is <b>London’s Filipino travel studio</b> — flights home, island packages and balikbayan support, crafted with puso since 2011. 🧡<br><br>“Halina” means “come, let’s go” — and that’s exactly the welcome you’ll get from our team.'
    },
    {
      id: 'reviews',
      tags: ['review', 'reviews', 'rating', 'trustpilot', 'testimonial', 'feedback', 'award', 'awards', 'reputation'],
      weight: 1.1,
      answer: 'We’re rated <b>4.9 out of 5</b> on Trustpilot from <b>2,300+ verified reviews</b>. ⭐ Safe, protected, and trusted by the UK Filipino community!'
    },
    {
      id: 'buddy',
      tags: ['who are you dog', 'your name', 'what are you', 'buddy', 'dog', 'puppy', 'aso', 'pet', 'cute'],
      weight: 1.0,
      answer: 'Aw aw! 🐕 I’m <b>Buddy</b>, the Halina Travels companion. I can’t carry your luggage, but I can answer questions about fares, destinations, bookings and payment plans. Try me!'
    }
  ];

  var FALLBACK =
    'Aww, pasensya na — I don’t have an answer for that one. 🐶<br><br>' +
    'I can only answer questions related to <b>Halina Travels</b>: flights and fares, destinations, ' +
    'booking and payment plans, balikbayan boxes, our airlines, or how to contact the team.<br><br>' +
    'For anything else, our human team will gladly help on <b>' + PHONE + '</b>.';

  var CHIPS = [
    { label: 'How much to Manila?', q: 'How much is a flight to Manila?' },
    { label: 'Christmas promo', q: 'Tell me about the Christmas promo' },
    { label: 'Payment plans', q: 'Do you offer payment plans?' },
    { label: 'How do I book?', q: 'How do I book?' },
    { label: 'Balikbayan boxes', q: 'Do you do balikbayan boxes?' },
    { label: 'Talk to a human', q: 'How do I contact you?' }
  ];

  /* ---------------------------------------------------------
     Matching
     --------------------------------------------------------- */
  var STOP = ['the', 'a', 'an', 'is', 'are', 'do', 'does', 'can', 'i', 'you', 'to', 'for', 'of', 'me', 'my', 'we', 'it', 'and', 'in', 'on', 'with', 'what', 'how', 'about', 'please', 'your'];

  function normalise(s) {
    return ' ' + String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }

  function findAnswer(input) {
    var text = normalise(input);
    if (text.trim().length < 2) return null;

    var words = text.trim().split(' ').filter(function (w) {
      return w.length > 2 && STOP.indexOf(w) === -1;
    });

    var best = null;
    var bestScore = 0;

    for (var i = 0; i < KB.length; i++) {
      var entry = KB[i];
      var score = 0;

      for (var t = 0; t < entry.tags.length; t++) {
        var tag = entry.tags[t];
        if (tag.indexOf(' ') > -1) {
          // multi-word tags are strong signals
          if (text.indexOf(' ' + tag + ' ') > -1 || text.indexOf(tag) > -1) score += 3.2;
        } else if (text.indexOf(' ' + tag + ' ') > -1) {
          score += 2.2;
        } else {
          // allow simple plural / partial stems
          for (var w = 0; w < words.length; w++) {
            if (words[w] === tag) { score += 2.2; break; }
            if (words[w].length > 3 && tag.length > 3 &&
                (words[w].indexOf(tag) === 0 || tag.indexOf(words[w]) === 0)) {
              score += 1.1;
              break;
            }
          }
        }
      }

      score *= entry.weight || 1;
      if (score > bestScore) { bestScore = score; best = entry; }
    }

    return bestScore >= 2 ? best : null;
  }

  /* ---------------------------------------------------------
     Build the UI
     --------------------------------------------------------- */
  function build() {
    if (document.getElementById('buddy')) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var host = document.createElement('div');
    host.id = 'buddy';
    host.innerHTML =
      '<button class="buddy-dog is-idle" type="button" aria-label="Chat with Buddy, the Halina Travels companion" aria-expanded="false" aria-controls="buddy-chat">' +
      '<span class="buddy-badge"></span></button>' +
      '<div class="buddy-bubble" aria-hidden="true">Aw aw! May tanong ka? Tap me 🐾</div>';

    var chat = document.createElement('div');
    chat.className = 'buddy-chat';
    chat.id = 'buddy-chat';
    chat.setAttribute('role', 'dialog');
    chat.setAttribute('aria-label', 'Chat with Buddy');
    chat.setAttribute('aria-modal', 'false');
    chat.innerHTML =
      '<div class="buddy-head">' +
        '<span class="paw" aria-hidden="true">🐶</span>' +
        '<div><div class="who">Buddy</div><div class="sub">Halina Travels companion</div></div>' +
        '<button class="buddy-close" type="button" aria-label="Close chat">×</button>' +
      '</div>' +
      '<div class="buddy-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
      '<div class="buddy-chips"></div>' +
      '<form class="buddy-form" autocomplete="off">' +
        '<input type="text" name="q" placeholder="Ask me about Halina Travels…" aria-label="Ask Buddy a question">' +
        '<button class="buddy-send" type="submit" aria-label="Send question">' +
          '<svg viewBox="0 0 24 24"><path d="M2.2 21l19.3-9L2.2 3l.01 7L16 12 2.21 14z"/></svg>' +
        '</button>' +
      '</form>';

    // The bubble/badge sit inside the fixed host; the panel is separate
    // so it can size itself against the viewport.
    document.body.appendChild(host);
    document.body.appendChild(chat);

    var dog = host.querySelector('.buddy-dog');
    var badge = host.querySelector('.buddy-badge');
    var bubble = host.querySelector('.buddy-bubble');
    var log = chat.querySelector('.buddy-log');
    var chips = chat.querySelector('.buddy-chips');
    var form = chat.querySelector('.buddy-form');
    var input = chat.querySelector('input');

    /* ---------- sprite state machine ---------- */
    var STATES = ['idle', 'walk', 'jump', 'slide', 'hurt'];
    var stateTimer = 0;

    function setState(name, holdMs) {
      if (reduced && name !== 'idle') name = 'idle';
      for (var i = 0; i < STATES.length; i++) dog.classList.remove('is-' + STATES[i]);
      // force the animation to restart even if the class repeats
      void dog.offsetWidth;
      dog.classList.add('is-' + name);
      clearTimeout(stateTimer);
      if (holdMs) {
        stateTimer = setTimeout(function () { setState('idle'); }, holdMs);
      }
    }

    /* ---------- reactions to scrolling ---------- */
    var lastY = window.scrollY;
    var settle = 0;
    var busy = false;

    window.addEventListener('scroll', function () {
      if (reduced || busy) return;
      var y = window.scrollY;
      var delta = y - lastY;
      lastY = y;

      dog.classList.toggle('face-left', delta < 0);

      if (Math.abs(delta) > 46) {
        if (!dog.classList.contains('is-slide')) setState('slide');
      } else if (Math.abs(delta) > 1 && !dog.classList.contains('is-slide')) {
        if (!dog.classList.contains('is-walk')) setState('walk');
      }

      clearTimeout(settle);
      settle = setTimeout(function () {
        if (!busy) setState('idle');
      }, 420);
    }, { passive: true });

    /* ---------- chat plumbing ---------- */
    function scrollLog() {
      log.scrollTop = log.scrollHeight;
    }

    function addMsg(html, who) {
      var el = document.createElement('div');
      el.className = 'buddy-msg ' + who;
      el.innerHTML = html;
      log.appendChild(el);
      scrollLog();
      return el;
    }

    function addTyping() {
      var el = document.createElement('div');
      el.className = 'buddy-msg bot';
      el.innerHTML = '<span class="buddy-typing"><i></i><i></i><i></i></span>';
      log.appendChild(el);
      scrollLog();
      return el;
    }

    function respond(question) {
      addMsg(escapeHtml(question), 'me');
      var hit = findAnswer(question);
      busy = true;
      setState(hit ? 'jump' : 'hurt');

      var typing = addTyping();
      setTimeout(function () {
        typing.remove();
        addMsg(hit ? hit.answer : FALLBACK, 'bot');
        busy = false;
        setState('idle');
      }, reduced ? 120 : 520 + Math.random() * 330);
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'buddy-chip';
      b.textContent = c.label;
      b.addEventListener('click', function () { respond(c.q); });
      chips.appendChild(b);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      input.value = '';
      respond(v);
    });

    /* ---------- open / close ---------- */
    var opened = false;
    var greeted = false;

    function openChat() {
      chat.classList.add('mounted');
      requestAnimationFrame(function () { chat.classList.add('open'); });
      opened = true;
      dog.setAttribute('aria-expanded', 'true');
      badge.classList.remove('on');
      bubble.classList.remove('on');
      setState('jump', 700);

      if (!greeted) {
        greeted = true;
        addMsg(
          'Kumusta! 🐾 I’m <b>Buddy</b>. Ask me anything about Halina Travels — fares, destinations, ' +
          'payment plans, balikbayan boxes or how to book. Tap a question below to start!',
          'bot'
        );
      }
      setTimeout(function () { input.focus(); }, 260);
    }

    function closeChat() {
      chat.classList.remove('open');
      opened = false;
      dog.setAttribute('aria-expanded', 'false');
      setTimeout(function () {
        if (!opened) chat.classList.remove('mounted');
      }, 300);
      dog.focus();
    }

    dog.addEventListener('click', function () {
      if (opened) closeChat(); else openChat();
    });
    chat.querySelector('.buddy-close').addEventListener('click', closeChat);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opened) closeChat();
    });

    /* ---------- first-visit nudge ---------- */
    setTimeout(function () {
      if (opened) return;
      badge.classList.add('on');
      bubble.classList.add('on');
      setState('jump', 700);
      setTimeout(function () { bubble.classList.remove('on'); }, 6000);
    }, 4200);

    window.HalinaBuddy = {
      open: openChat,
      close: closeChat,
      ask: respond,
      setState: setState
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
