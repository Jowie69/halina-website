/* Supabase-backed database section for the Halina Travels Admin Console. */
(function () {
  "use strict";
  var STORAGE_KEY = "halina_supabase_public_config_v1";
  var client = null, session = null, isAdmin = false;
  var contacts = [], catalog = [], content = [], settings = [];
  var editingContact = null, editingCatalog = null, editingContent = null;
  var ui = {};

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>\"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function storedConfig() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (error) { return {}; } }
  function currentConfig() { return { url: ui.url ? ui.url.value.trim() : "", publishableKey: ui.key ? ui.key.value.trim() : "" }; }
  function configFile(config) { return '/* Generated from Admin Console > Database. The publishable/anon key is public by design. */\nwindow.HALINA_SUPABASE_CONFIG = {\n  url: ' + JSON.stringify(config.url) + ',\n  publishableKey: ' + JSON.stringify(config.publishableKey) + '\n};\n'; }
  window.__halinaConfigFile = function () { var config = storedConfig(); return config.url && config.publishableKey ? configFile(config) : ""; };

  function ensureUI() {
    if (document.getElementById("dbManager")) return;
    var trigger = document.createElement("button");
    trigger.className = "btn primary"; trigger.id = "btnDatabase"; trigger.type = "button"; trigger.textContent = "Database";
    var actions = document.querySelector(".top .actions") || document.querySelector(".top");
    actions.appendChild(trigger);

    var modal = document.createElement("div"); modal.className = "dbm"; modal.id = "dbManager"; modal.hidden = true;
    modal.innerHTML = '<div class="shade" data-db-close></div><section class="shell" role="dialog" aria-modal="true" aria-labelledby="dbTitle">' +
      '<header class="head"><div><h2 id="dbTitle">Website database</h2><p>Supabase connection, contacts, offers and synchronized page content</p></div><button class="db-btn" type="button" data-db-close>Close</button></header>' +
      '<nav class="tabs"><button class="on" type="button" data-db-tab="connection">Connection</button><button type="button" data-db-tab="contacts">Contacts & wording</button><button type="button" data-db-tab="catalog">Flights & packages</button><button type="button" data-db-tab="content">Page content</button></nav>' +
      '<div class="body">' + connectionPane() + contactsPane() + catalogPane() + contentPane() + '</div></section>';
    document.body.appendChild(modal);
    cacheUI(); bindUI(); loadSavedConfig();
  }
  function connectionPane() {
    return '<section class="db-pane on" data-db-pane="connection"><div class="db-grid"><div class="db-card"><h3>1. Connect Supabase</h3><p>Use only the project URL and publishable/anon key. Never paste a secret or service-role key here.</p><div class="db-fields">' +
      field("dbUrl", "Project URL", "url", "https://your-project.supabase.co", true) + field("dbKey", "Publishable / anon key", "password", "sb_publishable_…", true) +
      '</div><div class="db-actions"><button class="db-btn primary" id="dbSaveConfig" type="button">Save connection</button><button class="db-btn" id="dbDownloadConfig" type="button">Download public config</button></div><div class="db-status" id="dbConnectionStatus">Not connected.</div></div>' +
      '<div class="db-card"><h3>2. Sign in as an editor</h3><p>This uses Supabase Auth. The email must also exist in <code>site_admins</code> from the SQL setup.</p><div class="db-fields">' + field("dbEmail", "Admin email", "email", "you@example.com", true) + field("dbPassword", "Admin password", "password", "Your Supabase Auth password", true) +
      '</div><div class="db-actions"><button class="db-btn good" id="dbSignIn" type="button">Sign in</button><button class="db-btn" id="dbSignOut" type="button">Sign out</button></div><div class="db-status" id="dbAuthStatus">Sign in to manage live data.</div></div></div>' +
      '<div class="db-help" style="margin-top:18px"><b>Publish the connection:</b> after saving, “Publish files” includes <code>assets/js/halina-config.js</code>. You can also download that file and upload it to the same path. The public key is protected by the SQL RLS policies.</div></section>';
  }
  function contactsPane() {
    return '<section class="db-pane" data-db-pane="contacts"><div class="db-grid"><div><div class="db-card"><h3>Contact channels</h3><p>These links are used by Facebook, email and call actions across the site.</p><form id="dbContactForm"><div class="db-fields">' +
      selectField("contactType", "Type", ["facebook","messenger","email","phone","whatsapp","instagram","tiktok","youtube","address","hours","other"]) + field("contactKey", "Unique key", "text", "facebook-main", true) + field("contactLabel", "Label", "text", "Facebook page", true) + field("contactValue", "Display value", "text", "Halina Travels", true) + field("contactUrl", "Link URL", "url", "https://facebook.com/yourpage", false, "wide") + field("contactOrder", "Order", "number", "10", false) +
      '</div><div class="db-checks"><label><input id="contactPrimary" type="checkbox"> Primary</label><label><input id="contactActive" type="checkbox" checked> Active</label></div><div class="db-actions"><button class="db-btn primary" type="submit">Save contact</button><button class="db-btn" id="contactNew" type="button">New</button><button class="db-btn danger" id="contactDelete" type="button">Delete</button></div></form></div>' +
      '<div class="db-card" style="margin-top:18px"><h3>Enquiry wording</h3><p>Customize the subject and opening text used in copy-ready summaries.</p><form id="dbSettingsForm"><div class="db-fields">' + field("settingSubject", "Email subject", "text", "Travel enquiry from Halina Travels website", true, "wide") + textField("settingIntro", "Summary introduction", "Kumusta! I would like to enquire about the following travel option:", "wide") + '</div><div class="db-actions"><button class="db-btn primary" type="submit">Save wording</button></div></form></div></div>' +
      '<div class="db-card"><h3>Saved contacts</h3><p>Select a row to edit it.</p><div class="db-list" id="contactList"></div></div></div></section>';
  }
  function catalogPane() {
    return '<section class="db-pane" data-db-pane="catalog"><div class="db-grid"><div class="db-card"><h3>Flight, package or deal</h3><p>Active records appear in the public offer modal immediately.</p><form id="dbCatalogForm"><div class="db-fields">' +
      selectField("catalogType", "Type", ["flight","package","deal"]) + field("catalogSlug", "Slug", "text", "london-manila-flight", true) + field("catalogTitle", "Title", "text", "London to Manila", true, "wide") + textField("catalogSummary", "Summary", "Short description shown to customers.", "wide") + field("catalogOrigin", "Origin", "text", "London") + field("catalogDestination", "Destination", "text", "Manila") + field("catalogPrice", "Price", "number", "479") + field("catalogPriceLabel", "Price label", "text", "Return from") + field("catalogCurrency", "Currency", "text", "GBP") + field("catalogBadge", "Badge", "text", "Popular") + field("catalogTravelFrom", "Travel from", "date", "") + field("catalogTravelTo", "Travel to", "date", "") + field("catalogImage", "Image URL/path", "text", "assets/img/photo.webp", false, "wide") + textField("catalogInclusions", "Inclusions — one per line", "Return flights\nTaxes included\nBaggage options", "wide") + textField("catalogTerms", "Terms / note", "Subject to availability.", "wide") + field("catalogCta", "Button label", "text", "Enquire now") + field("catalogOrder", "Order", "number", "10") +
      '</div><div class="db-checks"><label><input id="catalogFeatured" type="checkbox"> Featured</label><label><input id="catalogActive" type="checkbox" checked> Active</label></div><div class="db-actions"><button class="db-btn primary" type="submit">Save item</button><button class="db-btn" id="catalogNew" type="button">New</button><button class="db-btn danger" id="catalogDelete" type="button">Delete</button></div></form></div>' +
      '<div class="db-card"><h3>Published catalog</h3><p>Select an item to edit it. Changes sync to open website tabs.</p><div class="db-list" id="catalogList"></div></div></div></section>';
  }
  function contentPane() {
    return '<section class="db-pane" data-db-pane="content"><div class="db-grid"><div class="db-card"><h3>Synchronized page content</h3><p>Use “Sync selected content” in the page inspector to fill this form automatically, or enter a CSS selector manually.</p><form id="dbContentForm"><div class="db-fields">' +
      field("contentPage", "Page path", "text", "index.html", true) + field("contentLabel", "Editor label", "text", "Homepage hero title", true) + field("contentSelector", "CSS selector", "text", "#home h1", true, "wide") + selectField("contentProperty", "Property", ["text","direct_text","src","href","alt","background_image","hidden"]) + field("contentOrder", "Order", "number", "10") + textField("contentValue", "Value", "Replacement content", "wide") +
      '</div><div class="db-checks"><label><input id="contentActive" type="checkbox" checked> Active</label></div><div class="db-actions"><button class="db-btn primary" type="submit">Save override</button><button class="db-btn" id="contentNew" type="button">New</button><button class="db-btn danger" id="contentDelete" type="button">Delete</button></div></form></div>' +
      '<div class="db-card"><h3>Saved overrides</h3><p>Delete an override to restore the original HTML content.</p><div class="db-list" id="contentList"></div></div></div></section>';
  }
  function field(id, label, type, placeholder, required, extra) { return '<div class="db-field ' + (extra || "") + '"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + type + '" placeholder="' + esc(placeholder || "") + '"' + (required ? " required" : "") + '></div>'; }
  function textField(id, label, placeholder, extra) { return '<div class="db-field ' + (extra || "") + '"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" placeholder="' + esc(placeholder || "") + '"></textarea></div>'; }
  function selectField(id, label, options) { return '<div class="db-field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' + options.map(function (v) { return '<option value="' + v + '">' + v.replace("_", " ") + '</option>'; }).join("") + '</select></div>'; }
  function cacheUI() { ["dbManager","dbUrl","dbKey","dbEmail","dbPassword","dbConnectionStatus","dbAuthStatus","contactList","catalogList","contentList"].forEach(function (id) { ui[id.replace(/^db/, "").replace(/^./, function (c) { return c.toLowerCase(); })] = document.getElementById(id); }); ui.modal = document.getElementById("dbManager"); ui.url = document.getElementById("dbUrl"); ui.key = document.getElementById("dbKey"); }

  function bindUI() {
    document.getElementById("btnDatabase").addEventListener("click", open);
    ui.modal.querySelectorAll("[data-db-close]").forEach(function (button) { button.addEventListener("click", close); });
    ui.modal.querySelectorAll("[data-db-tab]").forEach(function (button) { button.addEventListener("click", function () { showTab(button.dataset.dbTab); }); });
    document.getElementById("dbSaveConfig").addEventListener("click", saveConnection);
    document.getElementById("dbDownloadConfig").addEventListener("click", downloadConfig);
    document.getElementById("dbSignIn").addEventListener("click", signIn);
    document.getElementById("dbSignOut").addEventListener("click", signOut);
    document.getElementById("dbContactForm").addEventListener("submit", saveContact); document.getElementById("contactNew").addEventListener("click", resetContact); document.getElementById("contactDelete").addEventListener("click", deleteContact);
    document.getElementById("dbCatalogForm").addEventListener("submit", saveCatalog); document.getElementById("catalogNew").addEventListener("click", resetCatalog); document.getElementById("catalogDelete").addEventListener("click", deleteCatalog);
    document.getElementById("dbContentForm").addEventListener("submit", saveContent); document.getElementById("contentNew").addEventListener("click", resetContent); document.getElementById("contentDelete").addEventListener("click", deleteContent);
    document.getElementById("dbSettingsForm").addEventListener("submit", saveSettings);
  }
  function open() { ui.modal.hidden = false; document.body.classList.add("dbm-open"); }
  function close() { ui.modal.hidden = true; document.body.classList.remove("dbm-open"); }
  function showTab(name) { ui.modal.querySelectorAll("[data-db-tab]").forEach(function (b) { b.classList.toggle("on", b.dataset.dbTab === name); }); ui.modal.querySelectorAll("[data-db-pane]").forEach(function (p) { p.classList.toggle("on", p.dataset.dbPane === name); }); }
  function status(element, message, type) { element.textContent = message; element.className = "db-status" + (type ? " " + type : ""); }
  function loadSavedConfig() { var saved = storedConfig(), file = window.HALINA_SUPABASE_CONFIG || {}; ui.url.value = saved.url || file.url || ""; ui.key.value = saved.publishableKey || file.publishableKey || ""; if (ui.url.value && ui.key.value) createClient(); }
  function createClient() { var cfg = currentConfig(); if (!cfg.url || !cfg.publishableKey || !window.supabase) return null; client = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }, global: { headers: { "x-application-name": "halina-admin" } } }); status(ui.connectionStatus, "Connection configured. Sign in to verify editor access.", "ok"); client.auth.getSession().then(function (result) { if (result.data && result.data.session) { session = result.data.session; verifyAdmin(); } }); return client; }
  function saveConnection() { var cfg = currentConfig(); if (!/^https:\/\/.+\.supabase\.(co|in)$/.test(cfg.url) && cfg.url.indexOf("localhost") < 0) return status(ui.connectionStatus, "Enter a valid Supabase project URL.", "err"); if (!cfg.publishableKey) return status(ui.connectionStatus, "Enter a publishable or anon key.", "err"); localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); window.HALINA_SUPABASE_CONFIG = cfg; createClient(); status(ui.connectionStatus, "Saved in this browser. Publish/download the config so public pages can connect too.", "ok"); }
  function downloadConfig() { var cfg = currentConfig(); if (!cfg.url || !cfg.publishableKey) return status(ui.connectionStatus, "Save the connection first.", "err"); var blob = new Blob([configFile(cfg)], { type: "text/javascript" }), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "halina-config.js"; document.body.appendChild(link); link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000); status(ui.connectionStatus, "Downloaded. Upload it as assets/js/halina-config.js, or use Publish files.", "ok"); }
  function signIn() { if (!client && !createClient()) return status(ui.authStatus, "Save a valid connection first.", "err"); var email = document.getElementById("dbEmail").value.trim(), password = document.getElementById("dbPassword").value; if (!email || !password) return status(ui.authStatus, "Enter your Supabase Auth email and password.", "err"); status(ui.authStatus, "Signing in…"); client.auth.signInWithPassword({ email: email, password: password }).then(function (result) { document.getElementById("dbPassword").value = ""; if (result.error) throw result.error; session = result.data.session; return verifyAdmin(); }).catch(function (error) { status(ui.authStatus, error.message || "Sign-in failed.", "err"); }); }
  function verifyAdmin() { return client.rpc("is_current_user_site_admin").then(function (result) { if (result.error) throw result.error; isAdmin = result.data === true; if (!isAdmin) { status(ui.authStatus, "Signed in, but this email is not active in site_admins.", "err"); return; } status(ui.authStatus, "Editor verified. Live CRUD is enabled.", "ok"); return loadAll(); }).catch(function (error) { isAdmin = false; status(ui.authStatus, error.message || "Could not verify editor access. Run the supplied SQL first.", "err"); }); }
  function signOut() { if (!client) return; client.auth.signOut().then(function () { session = null; isAdmin = false; contacts = []; catalog = []; content = []; renderAll(); status(ui.authStatus, "Signed out."); }); }
  function requireAdmin() { if (!client || !session || !isAdmin) { status(ui.authStatus, "Sign in as a verified editor first.", "err"); showTab("connection"); return false; } return true; }
  function loadAll() { if (!requireAdmin()) return Promise.resolve(); return Promise.all([query("site_contacts"), query("catalog_items"), query("site_content"), query("site_settings")]).then(function (rows) { contacts = rows[0]; catalog = rows[1]; content = rows[2]; settings = rows[3]; renderAll(); subscribe(); }).catch(function (error) { status(ui.authStatus, error.message || "Could not load database rows.", "err"); }); }
  function query(table) { var request = client.from(table).select("*"); if (table !== "site_settings") request = request.order("sort_order", { ascending: true }); return request.then(unwrap); }
  function unwrap(result) { if (result.error) throw result.error; return result.data || []; }
  function subscribe() { if (client.__halinaSubscribed) return; client.__halinaSubscribed = true; client.channel("halina-admin-sync").on("postgres_changes", { event: "*", schema: "public" }, function () { loadAll(); }).subscribe(); }
  function renderAll() { renderContacts(); renderCatalog(); renderContent(); renderSettings(); }

  function renderContacts() { var box = document.getElementById("contactList"); box.innerHTML = contacts.length ? contacts.map(function (row) { return '<button class="db-row" type="button" data-contact="' + row.id + '"><span><b>' + esc(row.label) + '</b><small>' + esc(row.value) + '</small></span><span class="badge">' + esc(row.contact_type) + '</span></button>'; }).join("") : '<div class="db-empty">No contacts loaded.</div>'; box.querySelectorAll("[data-contact]").forEach(function (b) { b.addEventListener("click", function () { fillContact(contacts.filter(function (r) { return r.id === b.dataset.contact; })[0]); }); }); }
  function fillContact(row) { if (!row) return; editingContact = row.id; setValues({ contactType:row.contact_type, contactKey:row.contact_key, contactLabel:row.label, contactValue:row.value, contactUrl:row.url || "", contactOrder:row.sort_order }); document.getElementById("contactPrimary").checked = row.is_primary; document.getElementById("contactActive").checked = row.is_active; }
  function resetContact() { editingContact = null; document.getElementById("dbContactForm").reset(); document.getElementById("contactActive").checked = true; }
  function saveContact(event) { event.preventDefault(); if (!requireAdmin()) return; var row = { contact_type:v("contactType"), contact_key:v("contactKey"), label:v("contactLabel"), value:v("contactValue"), url:v("contactUrl") || null, sort_order:n("contactOrder"), is_primary:c("contactPrimary"), is_active:c("contactActive") }; saveRow("site_contacts", row, editingContact, resetContact); }
  function deleteContact() { deleteRow("site_contacts", editingContact, resetContact); }

  function renderCatalog() { var box = document.getElementById("catalogList"); box.innerHTML = catalog.length ? catalog.map(function (row) { return '<button class="db-row" type="button" data-catalog="' + row.id + '"><span><b>' + esc(row.title) + '</b><small>' + esc(row.destination || "") + ' · ' + esc(row.price_label) + ' ' + esc(row.currency + " " + (row.price_amount == null ? "—" : row.price_amount)) + '</small></span><span class="badge">' + esc(row.item_type) + (row.is_active ? "" : " · hidden") + '</span></button>'; }).join("") : '<div class="db-empty">No catalog items loaded.</div>'; box.querySelectorAll("[data-catalog]").forEach(function (b) { b.addEventListener("click", function () { fillCatalog(catalog.filter(function (r) { return r.id === b.dataset.catalog; })[0]); }); }); }
  function fillCatalog(row) { if (!row) return; editingCatalog = row.id; setValues({ catalogType:row.item_type, catalogSlug:row.slug, catalogTitle:row.title, catalogSummary:row.summary, catalogOrigin:row.origin || "", catalogDestination:row.destination || "", catalogPrice:row.price_amount == null ? "" : row.price_amount, catalogPriceLabel:row.price_label, catalogCurrency:row.currency, catalogBadge:row.badge || "", catalogTravelFrom:row.travel_from || "", catalogTravelTo:row.travel_to || "", catalogImage:row.image_url || "", catalogInclusions:(row.inclusions || []).join("\n"), catalogTerms:row.terms || "", catalogCta:row.cta_label || "Enquire now", catalogOrder:row.sort_order }); document.getElementById("catalogFeatured").checked = row.is_featured; document.getElementById("catalogActive").checked = row.is_active; }
  function resetCatalog() { editingCatalog = null; document.getElementById("dbCatalogForm").reset(); setValues({ catalogCurrency:"GBP", catalogPriceLabel:"From", catalogCta:"Enquire now", catalogOrder:"10" }); document.getElementById("catalogActive").checked = true; }
  function saveCatalog(event) { event.preventDefault(); if (!requireAdmin()) return; var row = { item_type:v("catalogType"), slug:v("catalogSlug"), title:v("catalogTitle"), summary:v("catalogSummary"), origin:v("catalogOrigin") || null, destination:v("catalogDestination") || null, price_amount:v("catalogPrice") === "" ? null : Number(v("catalogPrice")), price_label:v("catalogPriceLabel") || "From", currency:(v("catalogCurrency") || "GBP").toUpperCase(), badge:v("catalogBadge") || null, travel_from:v("catalogTravelFrom") || null, travel_to:v("catalogTravelTo") || null, image_url:v("catalogImage") || null, inclusions:v("catalogInclusions").split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean), terms:v("catalogTerms"), cta_label:v("catalogCta") || "Enquire now", sort_order:n("catalogOrder"), is_featured:c("catalogFeatured"), is_active:c("catalogActive") }; saveRow("catalog_items", row, editingCatalog, resetCatalog); }
  function deleteCatalog() { deleteRow("catalog_items", editingCatalog, resetCatalog); }

  function renderContent() { var box = document.getElementById("contentList"); box.innerHTML = content.length ? content.map(function (row) { return '<button class="db-row" type="button" data-content="' + row.id + '"><span><b>' + esc(row.label) + '</b><small>' + esc(row.page_path + " · " + row.selector) + '</small></span><span class="badge">' + esc(row.property) + '</span></button>'; }).join("") : '<div class="db-empty">No synchronized overrides yet. Select content in the page editor, then choose “Sync selected content”.</div>'; box.querySelectorAll("[data-content]").forEach(function (b) { b.addEventListener("click", function () { fillContent(content.filter(function (r) { return r.id === b.dataset.content; })[0]); }); }); }
  function fillContent(row) { if (!row) return; editingContent = row.id; setValues({ contentPage:row.page_path, contentLabel:row.label, contentSelector:row.selector, contentProperty:row.property, contentValue:row.value, contentOrder:row.sort_order }); document.getElementById("contentActive").checked = row.is_active; }
  function resetContent() { editingContent = null; document.getElementById("dbContentForm").reset(); setValues({ contentPage:"index.html", contentOrder:"10" }); document.getElementById("contentActive").checked = true; }
  function saveContent(event) { event.preventDefault(); if (!requireAdmin()) return; var row = { page_path:v("contentPage"), label:v("contentLabel"), selector:v("contentSelector"), property:v("contentProperty"), value:v("contentValue"), sort_order:n("contentOrder"), is_active:c("contentActive") }; saveRow("site_content", row, editingContent, resetContent); }
  function deleteContent() { deleteRow("site_content", editingContent, resetContent); }

  function renderSettings() { var row = settings.filter(function (r) { return r.setting_key === "enquiry"; })[0]; var value = row && row.setting_value || {}; setValues({ settingSubject:value.subject || "Travel enquiry from Halina Travels website", settingIntro:value.intro || "Kumusta! I would like to enquire about the following travel option:" }); }
  function saveSettings(event) { event.preventDefault(); if (!requireAdmin()) return; var existing = settings.filter(function (r) { return r.setting_key === "enquiry"; })[0]; var row = { setting_key:"enquiry", label:"Enquiry message defaults", setting_value:{ subject:v("settingSubject"), intro:v("settingIntro"), copy_hint:"Copy this summary, then paste it into Facebook Messenger." }, is_public:true }; saveRow("site_settings", row, existing && existing.setting_key, function () {} , "setting_key"); }

  function saveRow(table, row, id, after, keyName) { var query = id ? client.from(table).update(row).eq(keyName || "id", id) : client.from(table).insert(row); query.select().then(function (result) { if (result.error) throw result.error; if (after) after(); return loadAll(); }).catch(function (error) { status(ui.authStatus, error.message || "Save failed.", "err"); }); }
  function deleteRow(table, id, after) { if (!requireAdmin() || !id) return status(ui.authStatus, "Select a row to delete first.", "err"); if (!confirm("Delete this live database record?")) return; client.from(table).delete().eq("id", id).then(function (result) { if (result.error) throw result.error; if (after) after(); return loadAll(); }).catch(function (error) { status(ui.authStatus, error.message || "Delete failed.", "err"); }); }
  function v(id) { return document.getElementById(id).value.trim(); } function n(id) { return Number(v(id) || 0); } function c(id) { return document.getElementById(id).checked; }
  function setValues(values) { Object.keys(values).forEach(function (id) { var element = document.getElementById(id); if (element) element.value = values[id] == null ? "" : values[id]; }); }

  function cssSelector(element) {
    if (element.id && element.id.indexOf("__adm") !== 0) return "#" + cssEscape(element.id);
    var stableClasses = String(element.className || "").split(/\s+/).filter(stableClass).slice(0, 2);
    var owner = element.ownerDocument, anchored = element.parentElement;
    while (anchored && anchored.tagName !== "BODY" && !anchored.id) anchored = anchored.parentElement;
    if (anchored && anchored.id) {
      var concise = "#" + cssEscape(anchored.id) + " " + element.tagName.toLowerCase() + (stableClasses.length ? "." + stableClasses.map(cssEscape).join(".") : "");
      try { if (owner.querySelectorAll(concise).length === 1) return concise; } catch (error) { }
    }
    var parts = [], node = element;
    while (node && node.nodeType === 1 && node.tagName !== "BODY") {
      if (node.id && node.id.indexOf("__adm") !== 0) { parts.unshift("#" + cssEscape(node.id)); break; }
      var part = node.tagName.toLowerCase(), classes = String(node.className || "").split(/\s+/).filter(stableClass).slice(0, 2);
      if (classes.length) part += "." + classes.map(cssEscape).join(".");
      var siblings = node.parentElement ? Array.prototype.filter.call(node.parentElement.children, function (child) { return child.tagName === node.tagName; }) : [];
      if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
      parts.unshift(part); node = node.parentElement;
    }
    return parts.join(" > ");
  }
  function stableClass(name) { return name && !/^(reveal|show|open|on|active|scrolled|data-adm)/.test(name); }
  function cssEscape(value) { return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
  function captureSelection(page, element) {
    ensureUI(); open(); showTab("content"); editingContent = null;
    var property = "direct_text", value = "", direct = Array.prototype.filter.call(element.childNodes, function (node) { return node.nodeType === 3 && node.nodeValue.trim(); });
    if (element.tagName === "IMG") { property = "src"; value = element.getAttribute("src") || ""; }
    else if (element.tagName === "A") { property = "href"; value = element.getAttribute("href") || ""; }
    else if (direct.length) value = direct.map(function (node) { return node.nodeValue.trim(); }).join(" ");
    else { property = "text"; value = element.textContent.trim(); }
    setValues({ contentPage:page, contentLabel:(value || element.tagName).slice(0, 80), contentSelector:cssSelector(element), contentProperty:property, contentValue:value, contentOrder:"10" });
    document.getElementById("contentActive").checked = true;
  }
  window.HalinaAdminDB = { open: open, captureSelection: captureSelection };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureUI); else ensureUI();
})();
