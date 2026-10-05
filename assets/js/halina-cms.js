/* Halina Travels public enquiry catalog + Supabase content sync. */
(function () {
  "use strict";

  var scriptUrl = document.currentScript && document.currentScript.src || "";
  var siteRoot = scriptUrl ? new URL("../../", scriptUrl).href : new URL("./", location.href).href;
  var config = window.HALINA_SUPABASE_CONFIG || {};
  var client = null;
  var catalog = [];
  var contacts = [];
  var settings = {};
  var activeFilter = "all";
  var activeQuery = "";
  var activeContext = {};
  var modal = null;

  var fallbackContacts = [
    { contact_type: "facebook", value: "Halina Travels", url: "https://www.facebook.com/", is_primary: true, is_active: true },
    { contact_type: "messenger", value: "Message us on Facebook", url: "https://m.me/", is_primary: true, is_active: true },
    { contact_type: "email", value: "hello@halinatravels.co.uk", url: "mailto:hello@halinatravels.co.uk", is_primary: true, is_active: true },
    { contact_type: "phone", value: "020 7946 0958", url: "tel:02079460958", is_primary: true, is_active: true }
  ];

  var fallbackCatalog = [
    item("london-manila-flight", "flight", "London to Manila", "London", "Manila", 479, "Return from", "assets/img/img-05-58d168bc24.webp", "Popular"),
    item("london-cebu-flight", "flight", "London to Cebu", "London", "Cebu", 651, "Return from", "assets/img/img-06-fac233ddf8.webp"),
    item("london-boracay-flight", "flight", "London to Boracay", "London", "Boracay", 749, "Return from", "assets/img/img-07-c3155d8625.webp"),
    item("london-palawan-flight", "flight", "London to Palawan", "London", "Palawan", 799, "Return from", "assets/img/img-08-6c49b88a68.webp"),
    item("london-bohol-flight", "flight", "London to Bohol", "London", "Bohol", 759, "Return from", "assets/img/img-09-95e53a2c5c.webp"),
    item("london-davao-flight", "flight", "London to Davao", "London", "Davao", 909, "Return from", "assets/img/img-11-584de6ca5d.webp"),
    item("london-siargao-flight", "flight", "London to Siargao", "London", "Siargao", 956, "Return from", "assets/img/img-12-c02e71a201.webp"),
    packageItem("boracay-beach-escape", "Boracay Beach Escape", "Boracay", 1299, "assets/img/img-07-c3155d8625.webp", ["Return flights", "Breakfast daily", "Island hopping"]),
    packageItem("palawan-island-hopping", "Palawan Island Hopping", "Palawan", 1449, "assets/img/img-08-6c49b88a68.webp", ["Return flights", "Underground River", "El Nido tours"]),
    packageItem("cebu-bohol-twin-centre", "Cebu & Bohol Twin-Centre", "Cebu & Bohol", 1399, "assets/img/img-06-fac233ddf8.webp", ["Return flights", "Two islands", "Ferry transfers"]),
    packageItem("manila-balikbayan-reunion", "Manila Balikbayan Reunion", "Manila", 899, "assets/img/img-05-58d168bc24.webp", ["Return flights", "Extra baggage options", "Flexible dates"]),
    packageItem("siargao-surf-week", "Siargao Surf Week", "Siargao", 1549, "assets/img/img-12-c02e71a201.webp", ["Return flights", "Surf lessons", "Sugba Lagoon"]),
    packageItem("ilocos-heritage-trail", "Ilocos Heritage Trail", "Ilocos", 1199, "assets/img/img-10-989db0f4ef.webp", ["Return flights", "Private driver", "Vigan tour"]),
    { slug: "christmas-homecoming", item_type: "deal", title: "Christmas Homecoming Deal", summary: "Festive return-flight enquiry for Christmas and New Year travel.", origin: "London", destination: "Manila or Cebu", price_amount: 560, price_label: "Return from", currency: "GBP", image_url: "assets/img/img-05-58d168bc24.webp", badge: "Seasonal", inclusions: ["Return flights", "Taxes included", "Family booking support"], terms: defaultTerms(), is_active: true, sort_order: 210 }
  ];

  function item(slug, type, title, origin, destination, price, priceLabel, image, badge) {
    return { slug: slug, item_type: type, title: title, summary: "Indicative fare including taxes. Tell us your dates and we will confirm the best available option.", origin: origin, destination: destination, price_amount: price, price_label: priceLabel, currency: "GBP", image_url: image, badge: badge || "", inclusions: ["Return flights", "Taxes included", "Baggage options available"], terms: defaultTerms(), is_active: true, sort_order: price };
  }
  function packageItem(slug, title, destination, price, image, inclusions) {
    return { slug: slug, item_type: "package", title: title, summary: "A customizable Philippines holiday package from London.", origin: "London", destination: destination, price_amount: price, price_label: "Per person from", currency: "GBP", image_url: image, badge: "Package", inclusions: inclusions, terms: defaultTerms(), is_active: true, sort_order: price };
  }
  function defaultTerms() { return "Subject to availability. Fares may change until confirmed by our team."; }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>\"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function assetUrl(path) { if (!path) return ""; if (/^(https?:|data:|blob:)/i.test(path)) return path; return new URL(path.replace(/^\.\//, ""), siteRoot).href; }
  function pagePath() {
    var rootPath = new URL(siteRoot).pathname;
    var path = decodeURIComponent(location.pathname);
    if (path.indexOf(rootPath) === 0) path = path.slice(rootPath.length);
    return path.replace(/^\//, "") || "index.html";
  }
  function slugify(value) { return String(value || "").toLowerCase().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
  function primaryContact(type) {
    var list = (contacts.length ? contacts : fallbackContacts).filter(function (c) { return c.contact_type === type && c.is_active !== false; });
    return list.filter(function (c) { return c.is_primary; })[0] || list[0] || null;
  }
  function money(row) {
    if (row.price_amount == null || row.price_amount === "") return "Price on request";
    var symbols = { GBP: "£", USD: "$", EUR: "€", PHP: "₱" };
    return (symbols[row.currency] || row.currency + " ") + Number(row.price_amount).toLocaleString("en-GB", { maximumFractionDigits: 2 });
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "halina-modal";
    modal.hidden = true;
    modal.innerHTML = '<div class="halina-modal__backdrop" data-halina-close></div>' +
      '<section class="halina-modal__panel" role="dialog" aria-modal="true" aria-labelledby="halinaModalTitle">' +
      '<header class="halina-modal__head"><div><h2 id="halinaModalTitle">Available travel options</h2><p id="halinaModalLead">Choose an option to prepare your enquiry.</p></div>' +
      '<button class="halina-modal__close" type="button" aria-label="Close" data-halina-close>&times;</button></header>' +
      '<div class="halina-modal__body" id="halinaModalBody"></div></section>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (event) { if (event.target.closest("[data-halina-close]")) closeModal(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !modal.hidden) closeModal(); });
    return modal;
  }
  function showModal(title, lead) {
    ensureModal();
    modal.querySelector("#halinaModalTitle").textContent = title;
    modal.querySelector("#halinaModalLead").textContent = lead || "";
    modal.hidden = false;
    document.body.classList.add("halina-modal-open");
    modal.querySelector(".halina-modal__close").focus();
  }
  function closeModal() { if (!modal) return; modal.hidden = true; document.body.classList.remove("halina-modal-open"); }

  function openCatalog(options) {
    options = options || {};
    activeFilter = options.type || "all";
    activeQuery = options.query || options.destination || "";
    activeContext = options.context || collectSearchContext();
    showModal(options.title || "Available flights & packages", "These are enquiry offers, not live airline inventory. Choose one and we will prepare a message for our team.");
    renderCatalog();
  }
  function renderCatalog() {
    var body = modal.querySelector("#halinaModalBody");
    var rows = (catalog.length ? catalog : fallbackCatalog).filter(function (row) {
      if (row.is_active === false) return false;
      if (activeFilter !== "all" && row.item_type !== activeFilter) return false;
      if (!activeQuery) return true;
      var haystack = [row.title, row.origin, row.destination, row.summary].join(" ").toLowerCase();
      var query = activeQuery.toLowerCase().replace(/\([^)]*\)/g, "").trim();
      return !query || haystack.indexOf(query) > -1;
    });
    if (!rows.length && activeQuery) {
      activeQuery = "";
      rows = (catalog.length ? catalog : fallbackCatalog).filter(function (row) { return row.is_active !== false && (activeFilter === "all" || row.item_type === activeFilter); });
    }
    body.innerHTML = '<div class="halina-catalog-toolbar">' + ["all", "flight", "package", "deal"].map(function (type) {
      var labels = { all: "All options", flight: "Flights", package: "Packages", deal: "Deals" };
      return '<button type="button" class="halina-filter' + (activeFilter === type ? " on" : "") + '" data-filter="' + type + '">' + labels[type] + '</button>';
    }).join("") + '</div><div class="halina-catalog">' + (rows.length ? rows.map(offerMarkup).join("") : '<div class="halina-empty">No active options are available yet. Please contact our team for a custom quote.</div>') + '</div>';
    body.querySelectorAll("[data-filter]").forEach(function (button) { button.addEventListener("click", function () { activeFilter = button.dataset.filter; activeQuery = ""; renderCatalog(); }); });
    body.querySelectorAll("[data-item]").forEach(function (button) { button.addEventListener("click", function () { selectItem(findItem(button.dataset.item), activeContext); }); });
  }
  function offerMarkup(row) {
    return '<button type="button" class="halina-offer" data-item="' + esc(row.slug) + '">' +
      (row.image_url ? '<img src="' + esc(assetUrl(row.image_url)) + '" alt="">' : '<span></span>') +
      '<span class="halina-offer__copy"><span class="halina-offer__type"><span>' + esc(row.item_type) + '</span><span>' + esc(row.badge || "") + '</span></span>' +
      '<h3>' + esc(row.title) + '</h3><p>' + esc(row.summary || "") + '</p><span class="halina-offer__price">' + esc(row.price_label || "From") + ' ' + esc(money(row)) + '</span></span></button>';
  }
  function findItem(slugOrTitle) {
    var key = slugify(slugOrTitle);
    return (catalog.length ? catalog : fallbackCatalog).filter(function (row) { return row.slug === slugOrTitle || slugify(row.title) === key || slugify(row.destination) === key; })[0] || null;
  }
  function matchItemFromElement(element) {
    var card = element && element.closest(".offer,.dcard,.card,.poster,.farecard");
    if (!card) return null;
    var titleNode = card.querySelector(".body > div > b,.info b,.banner b,h3,h2,.city");
    return findItem(titleNode ? titleNode.textContent.trim() : "");
  }
  function collectSearchContext() {
    var activeTrip = document.querySelector(".trip-tabs .tab.active");
    return {
      trip: activeTrip ? activeTrip.getAttribute("data-trip") || activeTrip.textContent.trim() : "",
      from: valueOf("fromInp"), to: valueOf("toInp"), departure: valueOf("depDate"), returnDate: valueOf("retDate"),
      direct: !!(document.getElementById("direct") && document.getElementById("direct").checked)
    };
  }
  function valueOf(id) { var element = document.getElementById(id); return element ? element.value.trim() : ""; }

  function summaryFor(row, context) {
    context = context || {};
    var enquiry = settings.enquiry || {};
    var lines = [enquiry.intro || "Kumusta! I would like to enquire about the following travel option:", "", "OPTION: " + row.title];
    if (row.origin || context.from) lines.push("FROM: " + (context.from || row.origin));
    if (row.destination || context.to) lines.push("TO: " + (context.to || row.destination));
    if (context.trip) lines.push("TRIP: " + context.trip + (context.direct ? " · Direct flights preferred" : ""));
    if (context.departure) lines.push("DEPARTURE: " + context.departure);
    if (context.returnDate) lines.push("RETURN: " + context.returnDate);
    lines.push("INDICATIVE PRICE: " + (row.price_label || "From") + " " + money(row));
    if (row.inclusions && row.inclusions.length) lines.push("INCLUDES: " + row.inclusions.join(", "));
    if (row.terms) lines.push("NOTE: " + row.terms);
    lines.push("", "Please confirm availability and the best current price. Salamat!");
    return lines.join("\n");
  }
  function selectItem(row, context) {
    if (!row) return;
    var summary = summaryFor(row, context);
    showModal("Your enquiry summary", "Review it, copy it, then send it to our Facebook page or email.");
    var body = modal.querySelector("#halinaModalBody");
    body.innerHTML = '<div class="halina-summary"><article class="halina-summary__card">' +
      '<div class="halina-summary__hero">' + (row.image_url ? '<img src="' + esc(assetUrl(row.image_url)) + '" alt="">' : "") + (row.badge ? '<span>' + esc(row.badge) + '</span>' : "") + '</div>' +
      '<div class="halina-summary__info"><h3>' + esc(row.title) + '</h3><p>' + esc(row.summary || "") + '</p><div class="price">' + esc(row.price_label || "From") + ' ' + esc(money(row)) + '</div>' +
      (row.inclusions && row.inclusions.length ? '<ul>' + row.inclusions.map(function (value) { return '<li>' + esc(value) + '</li>'; }).join("") + '</ul>' : "") + '</div></article>' +
      actionMarkup(summary, row.title) + '</div>';
    bindSummaryActions(body, summary, row.title);
  }
  function actionMarkup(summary, title) {
    var email = primaryContact("email");
    var phone = primaryContact("phone");
    return '<div class="halina-summary__actions"><label for="halinaSummary">Copy-ready message</label><textarea id="halinaSummary">' + esc(summary) + '</textarea>' +
      '<button type="button" class="halina-action halina-action--primary" data-copy>Copy summary</button>' +
      '<button type="button" class="halina-action halina-action--facebook" data-facebook>Copy &amp; open Facebook</button>' +
      (email ? '<a class="halina-action halina-action--email" data-email href="' + esc(emailHref(email, title, summary)) + '">Send by email</a>' : "") +
      (phone ? '<a class="halina-action halina-action--ghost" href="' + esc(phone.url || "tel:" + phone.value.replace(/\D/g, "")) + '">Call ' + esc(phone.value) + '</a>' : "") +
      '<button type="button" class="halina-action halina-action--ghost" data-back>Back to options</button><div class="halina-copy-note" aria-live="polite"></div></div>';
  }
  function emailHref(email, title, summary) {
    var subject = (settings.enquiry && settings.enquiry.subject) || "Travel enquiry from Halina Travels website";
    return "mailto:" + email.value + "?subject=" + encodeURIComponent(subject + " — " + title) + "&body=" + encodeURIComponent(summary);
  }
  function bindSummaryActions(scope, initialSummary, title) {
    var area = scope.querySelector("#halinaSummary");
    var note = scope.querySelector(".halina-copy-note");
    scope.querySelector("[data-copy]").addEventListener("click", function () { copyText(area.value).then(function () { note.textContent = "Summary copied — ready to paste."; }); });
    scope.querySelector("[data-facebook]").addEventListener("click", function () {
      var facebook = primaryContact("messenger") || primaryContact("facebook");
      copyText(area.value).then(function () { note.textContent = "Copied. Opening Facebook…"; location.href = facebook && facebook.url || "https://www.facebook.com/"; });
    });
    var email = scope.querySelector("[data-email]");
    if (email) email.addEventListener("click", function () { var contact = primaryContact("email"); email.href = emailHref(contact, title, area.value); });
    scope.querySelector("[data-back]").addEventListener("click", renderCatalog);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve) { var area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); resolve(); });
  }
  function openTextSummary(title, summary) {
    showModal(title, "Review the details before sending them to our team.");
    var body = modal.querySelector("#halinaModalBody");
    body.innerHTML = '<div class="halina-summary" style="grid-template-columns:1fr"><div></div>' + actionMarkup(summary, title) + '</div>';
    bindSummaryActions(body, summary, title);
    var back = body.querySelector("[data-back]"); if (back) back.remove();
  }

  function wireActions() {
    var search = document.getElementById("searchBtn");
    if (search) search.addEventListener("click", function (event) { event.preventDefault(); event.stopImmediatePropagation(); var context = collectSearchContext(); openCatalog({ type: "flight", query: context.to, context: context, title: "Available flight enquiries" }); }, true);
    document.querySelectorAll(".vf").forEach(function (link) {
      link.addEventListener("click", function (event) { event.preventDefault(); var card = link.closest(".dcard"); var destination = card && card.querySelector(".info b"); openCatalog({ type: "flight", destination: destination ? destination.textContent.trim() : "" }); });
    });
    document.querySelectorAll(".offer").forEach(function (card) {
      card.classList.add("halina-clickable-card"); card.setAttribute("role", "button"); card.tabIndex = 0;
      function open() { var row = matchItemFromElement(card); if (row) selectItem(row, collectSearchContext()); else openCatalog({ type: "flight" }); }
      card.addEventListener("click", open); card.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
    });
    document.querySelectorAll("[data-toast]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault(); event.stopImmediatePropagation();
        var text = button.textContent.trim().toLowerCase();
        if (text.indexOf("whatsapp") > -1 || text.indexOf("message us") > -1) {
          openTextSummary("Facebook enquiry", "Kumusta! I would like help planning a trip to the Philippines. Please let me know what details you need. Salamat!");
        } else if (text.indexOf("christmas") > -1 || text.indexOf("book early") > -1) openCatalog({ type: "deal", title: "Available seasonal deals" });
        else if (text.indexOf("deposit") > -1) openCatalog({ title: "Offers available with deposit options" });
        else if (text.indexOf("quote") > -1) location.href = new URL("contact.html", siteRoot).href;
        else openCatalog({ title: "Available travel offers" });
      }, true);
    });
    document.querySelectorAll("a.golink[href*='contact.html']").forEach(function (link) {
      link.addEventListener("click", function (event) { var row = matchItemFromElement(link); if (!row) return; event.preventDefault(); selectItem(row, collectSearchContext()); });
    });
    var form = document.querySelector("form.quote");
    if (form) {
      var interest = new URLSearchParams(location.search).get("interest");
      if (interest) { var route = form.querySelector("[name='route']"); if (route) route.value = interest; }
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(form);
        var summary = ["Kumusta! I would like a travel quote.", "", "NAME: " + (data.get("name") || ""), "EMAIL: " + (data.get("email") || ""), "PHONE: " + (data.get("phone") || ""), "ROUTE & DATES: " + (data.get("route") || ""), "DETAILS: " + (data.get("message") || ""), "", "Please contact me with the best available options. Salamat!"].join("\n");
        openTextSummary("Your quote request", summary);
      }, true);
    }
  }

  function applyContent(rows) {
    rows.filter(function (row) { return row.is_active !== false && (row.page_path === pagePath() || row.page_path === "*"); }).forEach(function (row) {
      var elements;
      try { elements = document.querySelectorAll(row.selector); } catch (error) { return; }
      elements.forEach(function (element) {
        if (row.property === "text") element.textContent = row.value;
        else if (row.property === "direct_text") { var node = Array.prototype.filter.call(element.childNodes, function (child) { return child.nodeType === 3 && child.nodeValue.trim(); })[0]; if (node) node.nodeValue = " " + row.value + " "; }
        else if (row.property === "src" || row.property === "href" || row.property === "alt") element.setAttribute(row.property, row.property === "src" ? assetUrl(row.value) : row.value);
        else if (row.property === "background_image") element.style.backgroundImage = 'url("' + assetUrl(row.value).replace(/"/g, "%22") + '")';
        else if (row.property === "hidden") element.hidden = /^(1|true|yes)$/i.test(row.value);
      });
    });
  }
  function applyContacts() {
    ["facebook", "instagram", "tiktok", "youtube"].forEach(function (type) { var c = primaryContact(type); if (c) document.querySelectorAll('[aria-label="' + type.charAt(0).toUpperCase() + type.slice(1) + '"]').forEach(function (link) { link.href = c.url || "#"; }); });
    var email = primaryContact("email"), phone = primaryContact("phone");
    if (email) document.querySelectorAll("a[href^='mailto:']").forEach(function (link) { link.href = email.url || "mailto:" + email.value; replaceText(link, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, email.value); });
    if (phone) document.querySelectorAll("a[href^='tel:']").forEach(function (link) { link.href = phone.url || "tel:" + phone.value.replace(/\D/g, ""); replaceText(link, /(?:\+?\d[\d\s()-]{7,}\d)/g, phone.value); });
  }
  function replaceText(root, pattern, replacement) { var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); var node; while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(pattern, replacement); }
  function syncStaticCards() {
    document.querySelectorAll(".offer").forEach(function (card) { var row = matchItemFromElement(card); if (!row) return; var price = card.querySelector(".price b"), image = card.querySelector("img"); if (price) price.textContent = money(row); if (image && row.image_url) image.src = assetUrl(row.image_url); });
    document.querySelectorAll(".card").forEach(function (card) { var row = matchItemFromElement(card); if (!row) return; var price = card.querySelector(".price b"); if (price) price.textContent = money(row); });
  }

  function connect() {
    if (!config.url || !config.publishableKey || !window.supabase || !window.supabase.createClient) return Promise.resolve();
    try { client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); }
    catch (error) { return Promise.resolve(); }
    return Promise.all([refreshCatalog(), refreshContacts(), refreshContent(), refreshSettings()]).then(subscribeRealtime).catch(function () { /* Static fallbacks remain usable. */ });
  }
  function refreshCatalog() { return client.from("catalog_items").select("*").eq("is_active", true).order("sort_order").then(function (result) { if (result.error) throw result.error; catalog = result.data || []; syncStaticCards(); }); }
  function refreshContacts() { return client.from("site_contacts").select("*").eq("is_active", true).order("sort_order").then(function (result) { if (result.error) throw result.error; contacts = result.data || []; applyContacts(); }); }
  function refreshContent() { return client.from("site_content").select("*").eq("is_active", true).in("page_path", [pagePath(), "*"]).order("sort_order").then(function (result) { if (result.error) throw result.error; applyContent(result.data || []); }); }
  function refreshSettings() { return client.from("site_settings").select("setting_key,setting_value").eq("is_public", true).then(function (result) { if (result.error) throw result.error; (result.data || []).forEach(function (row) { settings[row.setting_key] = row.setting_value; }); }); }
  function subscribeRealtime() {
    client.channel("halina-public-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_items" }, refreshCatalog)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_contacts" }, refreshContacts)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, refreshContent)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, refreshSettings)
      .subscribe();
  }

  function init() {
    catalog = fallbackCatalog.slice(); contacts = fallbackContacts.slice();
    ensureModal(); wireActions(); syncStaticCards(); connect();
  }
  window.HalinaCMS = { openCatalog: openCatalog, selectItem: selectItem, close: closeModal, getCatalog: function () { return catalog.slice(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

