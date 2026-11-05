/* Facet: drop a bank statement, get the full analysis, then ask for any other view.
 * Account (demo, this browser only) → upload (or a sample) → read in the browser → classify (file categories, common words,
 * then the AI for the merchants left: names only) → report. Every figure is computed here and leads back to its file lines. */
(function () {
	const I = window.FACET_I18N, ICONS = window.FACET_ICONS, P = window.FACET_PARSE, C = window.FACET_CLASSIFY, E = window.FACET_ENGINE, RD = window.FACET_READER, CH = window.FACET_CHARTS;
	const API = "/api/facet";
	const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
	const esc = CH.esc, reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	const ic = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
	const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }, del(k) { try { localStorage.removeItem(k); } catch {} } };
	const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
	if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

	/* categories: fixed order, colour follows the category (validated palette, light and dark steps) */
	const CATS = ["home", "groceries", "dining", "transport", "subscriptions", "leisure", "health", "shopping"];
	const COL = {
		light: { home: "#2a78d6", groceries: "#eb6834", dining: "#1baf7a", transport: "#eda100", subscriptions: "#e87ba4", leisure: "#008300", health: "#6250d6", shopping: "#e34948", other: "#8E9097", rest: "#C9CBC4", income: "#187A4F", one: "#2a78d6" },
		dark: { home: "#3987e5", groceries: "#d95926", dining: "#199e70", transport: "#c98500", subscriptions: "#d55181", leisure: "#008300", health: "#9085e9", shopping: "#e66767", other: "#7C8089", rest: "#45484E", income: "#4CC38A", one: "#3987e5" },
	};
	const CAT_ICON = { home: "house", groceries: "shopping-basket", dining: "utensils", transport: "tram-front", subscriptions: "repeat", leisure: "ticket", health: "heart-pulse", shopping: "shopping-bag", other: "circle-help", income: "wallet" };
	const col = (id) => COL[S.theme][id] || COL[S.theme].other;

	const S = { smHide: store.get("facet-samples-hidden", false), lang: "en", theme: document.documentElement.dataset.theme || "dark", acct: null, A: null, data: null, open: {}, pick: {}, past: [], q: "", txN: 40, txFilter: "all", busy: false, authErr: {} };

	/* ---------------- language ---------------- */
	const qs = new URLSearchParams(location.search);
	S.lang = [qs.get("lang"), store.get("facet-lang", null)].map((l) => String(l || "").slice(0, 2)).find((l) => I.LANGS.some((x) => x[0] === l)) || "en"; // English unless the person chose another language
	/* the last two words of a sentence stay together: never one word alone on the last line, in any language */
	function t(k, p) { let s = (I.dict[S.lang] && I.dict[S.lang][k]) || k; if (p) s = s.replace(/\{(\w+)\}/g, (m, n) => (p[n] ?? m)); if (S.lang === "fr") s = s.replace(/ ([?:!;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0"); /* French: no line break before ? : ! ; */ return s.split(/\s+/).length >= 3 && !/<[^>]+$/.test(s) ? s.replace(/ ([^ <>]+)$/, "\u00a0$1") : s; }
	const catName = (id) => (id === "other" ? t("To check") : t(I.CAT_NAMES[id] || id));
	function title(x) { if (!x) return ""; if (typeof x === "string") return x; const p = { ...(x.p || {}) }; if (p.cat) p.cat = catName(p.cat); if (p.cats) p.cats = String(p.cats).split(",").map(catName).join(", "); return t(x.k, p); }
	const locale = () => I.LOCALE[S.lang] || S.lang;
	const cur = () => S.A?.cur || "EUR";
	const money = (v) => new Intl.NumberFormat(locale(), { style: "currency", currency: cur(), minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
	const money0 = (v) => new Intl.NumberFormat(locale(), { style: "currency", currency: cur(), maximumFractionDigits: 0 }).format(v);
	const moneyShort = (v) => new Intl.NumberFormat(locale(), { style: "currency", currency: cur(), notation: v >= 10000 ? "compact" : "standard", maximumFractionDigits: v >= 10000 ? 1 : 0 }).format(v);
	const num = (v) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(v);
	const pct = (v) => new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 0 }).format(v);
	const dt = (s, o) => E.parse(s).toLocaleDateString(locale(), o);
	const dShort = (s) => dt(s, { day: "numeric", month: "short" });
	const dLong = (s) => dt(s, { day: "numeric", month: "long", year: "numeric" });

	/* ---------------- account (demo: kept in this browser, no password stored or checked) ---------------- */
	const DEMO = { first: "Camille", last: "Martin", email: "camille.martin@facet.example" };
	const accounts = () => store.get("facet-accounts", {});
	S.acct = store.get("facet-account", null);
	const savedKey = () => "facet-analyses:" + (S.acct?.email || "").toLowerCase();
	const savedList = () => (S.acct ? store.get(savedKey(), []) : []);
	function signIn(a) { const all = accounts(); all[a.email.toLowerCase()] = a; store.set("facet-accounts", all); S.acct = a; store.set("facet-account", a); go("#/new"); }
	function signOut() { S.acct = null; S.A = null; store.del("facet-account"); go("#/"); toast(t("You are signed out.")); }

	/* ---------------- routing: the browser's back button works everywhere ---------------- */
	function go(h) { if (location.hash === h) route(); else location.hash = h; }
	addEventListener("hashchange", route);
	function route() {
		closeMenu(); drawer(false);
		if (S.acct && $("#authOv")) closeAuth(true);
		const h = location.hash || "#/";
		if (!S.acct && !/^#\/(signin|signup)?$/.test(h)) return go("#/signin");
		if (S.acct && /^#\/(signin|signup)?$/.test(h)) return go("#/new");
		if (h === "#/") { if ($(".site") && $("#authOv")) return closeAuth(); return landing(); }
		if (h === "#/signin" || h === "#/signup") { if ($(".site")) return openAuth(h.slice(2)); return landing(h.slice(2)); }
		if (h === "#/analyses") return shell("saved");
		const m = h.match(/^#\/a\/(\w+)/);
		if (m) { if (!S.A || S.A.id !== m[1]) { const a = savedList().find((x) => x.id === m[1]); if (!a) return go("#/analyses"); load(a); } return shell("report"); }
		return shell("upload");
	}

	/* ---------------- shared pieces ---------------- */
	const logo = (tag = "button", attrs = "") => `<${tag} class="logo" ${tag === "a" ? 'href="#/"' : tag === "button" ? 'type="button"' : ""} ${attrs} ${tag === "span" ? "" : 'aria-label="Facet"'}><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="#0D0E10" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 18v-6M12 18V6M18 18v-4"/></svg></span><b>Facet</b></${tag}>`;
	const langBtn = () => `<div class="dd"><button type="button" class="btn btn-g btn-sm" data-lang aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Language"))}">${ic("globe")}<span>${S.lang.toUpperCase()}</span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>`;
	const themeBtn = () => `<button type="button" class="icon-btn" data-theme-toggle aria-label="${esc(t(S.theme === "dark" ? "Light theme" : "Dark theme"))}" title="${esc(t(S.theme === "dark" ? "Light theme" : "Dark theme"))}">${ic(S.theme === "dark" ? "sun" : "moon")}</button>`;
	const footer = () => `<footer class="foot"><span>${esc(t("A fictional product by David Bitan for his AI Lab. The sample statements, Camille Martin and every merchant in them are invented."))}</span><a href="/lab/facet">${esc(t("How it was designed"))}</a></footer>`;
	function setTheme(th) { S.theme = th; document.documentElement.dataset.theme = th; store.set("facet-theme", th); S.quiet = true; route(); }
	function bindCommon(root) {
		$$("[data-lang]", root).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); menu(b, b.nextElementSibling, I.LANGS.map(([c, n]) => ({ code: c, label: n, on: c === S.lang })), (x) => { S.lang = x.code; store.set("facet-lang", x.code); document.documentElement.lang = x.code; S.quiet = true; route(); }); }));
		$$("[data-theme-toggle]", root).forEach((b) => b.addEventListener("click", () => setTheme(S.theme === "dark" ? "light" : "dark")));
		$$("[data-theme-set]", root).forEach((b) => b.addEventListener("click", () => b.dataset.themeSet !== S.theme && setTheme(b.dataset.themeSet)));
		$$("[data-go]", root).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
	}
	const view = (html) => { $("#app").innerHTML = html; document.documentElement.lang = S.lang; document.documentElement.dir = I.RTL.includes(S.lang) ? "rtl" : "ltr"; bindCommon($("#app")); };
	/* page change inside the app: the new content fades in and rises a little (the sidebar stays still) */
	const enter = (el) => { if (!el || reduced()) return; el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }); };

	/* ---------------- landing: top bar (logo, sign in, create an account), pitch + illustration, 3 steps ---------------- */
	function landing(tab) {
		document.title = t("Facet · drop a bank statement, see where your money goes");
		view(`<div class="site"><header class="site-top">${logo("a")}<span class="sp"></span>${themeBtn()}${langBtn()}<button type="button" class="btn btn-g" data-open-auth="signin" aria-label="${esc(t("Sign in"))}">${ic("log-in")}<span class="lbl">${esc(t("Sign in"))}</span></button><button type="button" class="btn btn-p hide-m" data-open-auth="signup">${esc(t("Create an account"))}</button></header>
		<main class="land">
			<div class="hero"><div>
				<h1>${t("Drop your bank statement. <em>See where your money goes.</em>")}</h1>
				<p class="lede">${esc(t("Facet reads the file your bank gives you, sorts every line, finds your subscriptions and the expenses that stand out, and builds the full picture. Then you ask for any other view."))}</p>
				<div class="cta"><button type="button" class="btn btn-p" data-open-auth="signup">${ic("upload")}${esc(t("Analyse a statement"))}</button></div>
				<ul class="formats" aria-label="${esc(t("Reads"))}"><li class="lead">${esc(t("Reads"))}</li>${[["file-spreadsheet", "Excel"], ["file-text", "CSV"], ["file", "PDF"], ["file-text", "Word"], ["file-text", t("Text")]].map(([i, n]) => `<li>${ic(i)}${esc(n)}</li>`).join("")}</ul>
			</div>${heroArt()}</div>
			<ol class="how">
				<li><h3>${esc(t("Drop the file"))}</h3><p>${esc(t("The export from your bank's website, a PDF statement or your own budget sheet. Several files at once is fine."))}</p></li>
				<li><h3>${esc(t("It is read on your device"))}</h3><p>${esc(t("Dates, labels and amounts are found in your browser. Each merchant is sorted into a category, and you can correct any of them."))}</p></li>
				<li><h3>${esc(t("Get the full picture"))}</h3><p>${esc(t("Spending by category, month by month, regular payments, unusual expenses. Every figure opens on the lines of your file it comes from."))}</p></li>
			</ol>
			<div class="trust">${ic("lock")}<p>${t("<b>Your file stays in your browser.</b> Only the names of merchants Facet does not recognise are sent to the AI to sort them: never an amount, a date or an account number. Nothing is kept on a server.")}</p></div>
		</main>${footer()}</div>`);
		$$("[data-open-auth]").forEach((x) => x.addEventListener("click", () => go("#/" + x.dataset.openAuth)));
		if (tab) openAuth(tab); else closeAuth(true);
	}

	/* ---------------- the account panel: an overlay over the page, blurred backdrop, animated in and out ---------------- */
	let lastFocus = null;
	function openAuth(tab) {
		let ov = $("#authOv");
		if (ov) { switchTab(tab); return; }
		lastFocus = document.activeElement;
		document.body.insertAdjacentHTML("beforeend", `<div class="ov" id="authOv"><div class="ov-bg" data-close></div><div class="ov-box" role="dialog" aria-modal="true" aria-labelledby="authTitle">${authCard(tab)}</div></div>`);
		ov = $("#authOv"); document.body.style.overflow = "hidden";
		ov.querySelector("[data-close]").addEventListener("click", () => go("#/"));
		ov.querySelector(".ov-x").addEventListener("click", () => go("#/"));
		bindAuth(tab);
		requestAnimationFrame(() => ov.classList.add("on"));
		setTimeout(() => $("#authF input")?.focus({ preventScroll: true }), reduced() ? 0 : 120);
		ov.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && !open) { e.preventDefault(); go("#/"); }
			if (e.key === "Tab") { const f = $$('button, input, a[href]', ov.querySelector(".ov-box")).filter((x) => !x.disabled && x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
		});
	}
	function closeAuth(now) {
		const ov = $("#authOv"); if (!ov) return;
		document.body.style.overflow = "";
		if (now || reduced()) { ov.remove(); return; }
		ov.classList.remove("on"); ov.classList.add("off");
		setTimeout(() => ov.remove(), 400);
		lastFocus?.focus?.({ preventScroll: true });
	}

	/* hero illustration: a statement turning into the analysis (drawn, no photo; same marks as the real charts) */
	function heroArt() {
		const c = COL[S.theme], f2 = (v) => (v > 0 ? "+" : "−") + new Intl.NumberFormat(locale(), { minimumFractionDigits: 2 }).format(Math.abs(v)), rows = [["home", 62, f2(-920)], ["groceries", 48, f2(-64.77)], ["dining", 40, f2(-18.35)], ["subscriptions", 54, f2(-13.49)], ["transport", 36, f2(-22.3)], ["income", 58, f2(2850)]];
		const seg = [[0.42, c.home], [0.17, c.groceries], [0.10, c.dining], [0.08, c.shopping], [0.07, c.transport], [0.16, c.leisure]];
		let a = -Math.PI / 2; const arcs = seg.map(([v, k], i) => { const a0 = a + 0.03, a1 = a + v * Math.PI * 2 - 0.03; a += v * Math.PI * 2; const P = (r, t) => `${(70 + r * Math.cos(t)).toFixed(1)},${(70 + r * Math.sin(t)).toFixed(1)}`; return `<path d="M${P(60, a0)} A60,60 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${P(60, a1)} L${P(42, a1)} A42,42 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${P(42, a0)} Z" fill="${k}" style="animation-delay:${1100 + i * 90}ms"/>`; }).join("");
		const bars = [44, 52, 40, 61, 48, 70, 55].map((h, i) => `<rect x="${i * 22}" y="${80 - h}" width="16" height="${h}" rx="3" fill="${c.one}" style="animation-delay:${1500 + i * 70}ms"/>`).join("");
		return `<div class="art" aria-hidden="true">
			<div class="art-doc"><div class="art-h"><span></span><span></span></div>${rows.map(([k, w, v], i) => `<div class="art-r" style="animation-delay:${200 + i * 120}ms"><i style="background:${c[k]}"></i><b style="width:${w}%"></b><em class="${k === "income" ? "in" : ""}">${v}</em></div>`).join("")}</div>
			<div class="art-out"><svg class="art-dn" viewBox="0 0 140 140">${arcs}</svg><svg class="art-bars" viewBox="0 0 150 80">${bars}</svg></div>
		</div>`;
	}

	/* ---------------- sign in / create an account (a card on the landing page) ---------------- */
	function authCard(tab) {
		return `<section class="auth-card" id="authCard"><button type="button" class="icon-btn ov-x" aria-label="${esc(t("Close"))}">${ic("x")}</button>
			<div class="tabs" role="tablist" data-on="${tab === "signup" ? "up" : "in"}"><span class="pill" aria-hidden="true"></span><button type="button" role="tab" id="tab-in" aria-controls="authBody" aria-selected="${tab !== "signup"}" data-tab="signin">${esc(t("Sign in"))}</button><button type="button" role="tab" id="tab-up" aria-controls="authBody" aria-selected="${tab === "signup"}" data-tab="signup">${esc(t("Create an account"))}</button></div>
			<div class="auth-body" id="authBody" role="tabpanel">${authForm(tab)}</div>
			<p class="demo-note">${ic("info")}<span>${esc(t("This is a demo: no e-mail is sent and the password is not checked or kept. The account only exists in this browser."))}</span></p>
		</section>`;
	}
	function authForm(tab) {
		const e = S.authErr || {}; S.authErr = {};
		const f = (id, label, type = "text", ac = "") => `<div class="field"><label for="${id}">${esc(t(label))}</label><div class="in"><input id="${id}" name="${id}" type="${type}" autocomplete="${ac}" ${e[id] ? 'aria-invalid="true" aria-describedby="' + id + '-e"' : ""}>${type === "password" ? `<button type="button" class="icon-btn eye" data-eye aria-label="${esc(t("Show the password"))}">${ic("eye")}</button>` : ""}</div>${e[id] ? `<p class="err" id="${id}-e">${esc(t(e[id]))}</p>` : ""}</div>`;
		const demo = `<div class="or">${esc(t("or"))}</div><button class="btn" type="button" data-demo>${ic("user")}${esc(t("Use the demo account (Camille Martin)"))}</button>`;
		return tab === "signup" ? `<form id="authF" novalidate data-tab="signup"><h2 id="authTitle">${esc(t("Create your account"))}</h2><p class="sub">${esc(t("Your analyses are kept in this account, in this browser."))}</p>
				<div class="row2">${f("first", "First name", "text", "given-name")}${f("last", "Last name", "text", "family-name")}</div>
				${f("email", "E-mail", "email", "email")}${f("pw", "Password (8 characters or more)", "password", "new-password")}
				<button class="btn btn-p" type="submit">${esc(t("Create my account"))}</button>${demo}</form>`
			: `<form id="authF" novalidate data-tab="signin"><h2 id="authTitle">${esc(t("Welcome back"))}</h2><p class="sub">${esc(t("Sign in to see your analyses or start a new one."))}</p>
				${f("email", "E-mail", "email", "email")}${f("pw", "Password", "password", "current-password")}
				<button class="btn btn-p" type="submit">${ic("log-in")}${esc(t("Sign in"))}</button>${demo}</form>`;
	}
	/* switching tab: the pill slides and the card's height opens or closes smoothly to the new form (500 ms, same curve as the menus) */
	function switchTab(tab) {
		const body = $("#authBody"), tabs = $("#authCard .tabs"); if (!body || tabs.dataset.on === (tab === "signup" ? "up" : "in")) return;
		const keep = { email: $("#authF [name=email]")?.value || "" };
		tabs.dataset.on = tab === "signup" ? "up" : "in";
		$$("[role=tab]", tabs).forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
		history.replaceState(null, "", "#/" + tab);
		const from = body.getBoundingClientRect().height;
		body.innerHTML = authForm(tab); bindAuth(tab, keep);
		if (reduced()) return;
		const to = body.getBoundingClientRect().height;
		body.style.overflow = "hidden";
		body.animate([{ height: from + "px" }, { height: to + "px" }], { duration: to >= from ? 500 : 400, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }).onfinish = () => (body.style.overflow = "");
		$("#authF").animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" });
	}
	function bindAuth(tab, keep) {
		const F = $("#authF"); if (!F) return;
		const vals = keep || S.authVals || {}; S.authVals = null;
		F.querySelectorAll("input").forEach((x) => (x.value = vals[x.name] || ""));
		const bad = F.querySelector("[aria-invalid]"); if (bad) bad.focus({ preventScroll: true });
		$$("#authCard [data-tab]").forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
		$$("[data-eye]", F).forEach((b) => b.addEventListener("click", () => { const i = b.previousElementSibling, show = i.type === "password"; i.type = show ? "text" : "password"; b.setAttribute("aria-label", t(show ? "Hide the password" : "Show the password")); b.innerHTML = ic(show ? "lock" : "eye"); }));
		F.querySelector("[data-demo]").addEventListener("click", () => signIn({ ...DEMO, name: DEMO.first }));
		F.addEventListener("submit", (ev) => {
			ev.preventDefault();
			const v = Object.fromEntries(new FormData(F)), err = {}, mail = String(v.email || "").trim();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) err.email = "Enter a valid e-mail, like name@example.com.";
			if (tab === "signup") {
				if (!String(v.first || "").trim()) err.first = "Enter your first name.";
				if (String(v.pw || "").length < 8) err.pw = "Use 8 characters or more.";
				if (!err.email && accounts()[mail.toLowerCase()]) err.email = "An account already uses this e-mail in this browser. Sign in instead.";
			} else {
				if (!v.pw) err.pw = "Enter your password.";
				if (!err.email && !accounts()[mail.toLowerCase()]) err.email = "No account uses this e-mail in this browser. Create one, or use the demo account.";
			}
			if (Object.keys(err).length) { S.authErr = err; $("#authBody").innerHTML = authForm(tab); return bindAuth(tab, { ...v, pw: "" }); }
			signIn(tab === "signup" ? { first: v.first.trim(), last: String(v.last || "").trim(), email: mail } : accounts()[mail.toLowerCase()]);
		});
	}

	/* ---------------- app shell ---------------- */
	function shell(page) {
		const list = savedList(), a = S.acct, init = ((a.first || "?")[0] + (a.last || "")[0] || "").toUpperCase();
		const titles = { upload: "New analysis", saved: "My analyses", report: S.A ? S.A.name : "" };
		document.title = (page === "report" && S.A ? S.A.name : t(titles[page])) + " · Facet";
		const me = (id) => `<div class="dd me"><button type="button" class="me-btn" id="${id}" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Your account"))}: ${esc(((a.first || "") + " " + (a.last || "")).trim())}"><span class="av" aria-hidden="true">${esc(init)}</span><span class="who"><b>${esc(a.first || "")}</b></span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>`;
		view(`<div class="mtop">${logo()}${themeBtn()}${langBtn()}${me("meBtnM")}<button type="button" class="icon-btn" id="burger" aria-label="${esc(t("Menu"))}" aria-expanded="false" aria-controls="side">${ic("menu")}</button></div>
		<div class="shell">
			<aside class="side" id="side" aria-label="${esc(t("Menu"))}">
				${logo("button", 'data-go="#/new"')}
				<ul class="nav"><li><button type="button" data-go="#/analyses" ${page === "saved" ? 'aria-current="page"' : ""}>${ic("layers")}${esc(t("My analyses"))}<span class="count">${list.length}</span></button>
					${list.length ? `<ul class="recent">${list.slice(0, 5).map((x) => `<li><button type="button" data-go="#/a/${x.id}" ${S.A?.id === x.id && page === "report" ? 'aria-current="true"' : ""} title="${esc(x.name)}">${esc(x.name)}</button></li>`).join("")}${list.length > 5 ? `<li><button type="button" class="all" data-go="#/analyses">${esc(t("See all ({n})", { n: list.length }))}</button></li>` : ""}</ul>` : ""}</li></ul>
				<div class="grow"></div>
				<button type="button" class="btn btn-p new side-new" data-go="#/new">${ic("plus")}${esc(t("New analysis"))}</button>
			</aside>
			<div class="mainw"><div class="topbar"><nav class="crumbs" aria-label="${esc(t("You are here"))}">${page === "report" && S.A ? `<button type="button" data-go="#/analyses">${esc(t("My analyses"))}</button>${ic("chevron-right", "flip-ic")}<span>${esc(S.A.name)}</span>` : `<span>${esc(t(titles[page]))}</span>`}</nav><span class="sp"></span>${themeBtn()}${langBtn()}${me("meBtn")}</div><main class="main" id="main" tabindex="-1"></main></div>
		</div><div class="scrim" id="scrim" hidden></div>`);
		["meBtn", "meBtnM"].forEach((id) => { const b = $("#" + id); b.addEventListener("click", (e) => { e.stopPropagation(); menu(b, b.nextElementSibling, [{ k: "saved", label: t("My analyses"), icon: "layers" }, { k: "out", label: t("Sign out"), icon: "log-out" }], (x) => (x.k === "out" ? signOut() : go("#/analyses"))); }); });
		$("#burger").addEventListener("click", () => drawer(!$("#side").classList.contains("open")));
		$("#scrim").addEventListener("click", () => drawer(false));
		if (page === "upload") upload();
		if (page === "saved") saved();
		if (page === "report") report(true);
		if (!S.quiet) enter($("#main")); S.quiet = false;
		$("#main").focus({ preventScroll: true }); scrollTo(0, 0);
	}
	function drawer(open) {
		const side = $("#side"), scrim = $("#scrim"); if (!side) return;
		if (open === side.classList.contains("open")) return;
		$("#burger")?.setAttribute("aria-expanded", open);
		if (open) { side.classList.add("open"); scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add("on")); side.querySelector("button")?.focus(); }
		else { side.classList.remove("open"); side.classList.add("closing"); scrim.classList.remove("on"); setTimeout(() => { side.classList.remove("closing"); scrim.hidden = true; }, reduced() ? 0 : 400); }
	}

	/* ---------------- upload ---------------- */
	const SAMPLES = [
		{ file: "banque-aubepine-export.csv", kind: "CSV", icon: "file-text", name: "Bank export, 13 months", desc: "A French bank's CSV export: semicolons, decimal commas, and the bank's own categories." },
		{ file: "my-budget-2026.xlsx", kind: "Excel", icon: "file-spreadsheet", name: "Budget sheet, 6 months", desc: "A personal Excel sheet in English: date, description, amount. No categories, so Facet sorts them." },
		{ file: "releve-aout-octobre-2026.pdf", kind: "PDF", icon: "file", name: "PDF statement, 3 months", desc: "A 3-page bank statement with debit and credit columns, read straight from the PDF." },
	];
	function upload() {
		$("#main").innerHTML = `<header><h1>${esc(t("New analysis"))}</h1><p>${esc(t("Drop one or several statements. Facet finds the dates, labels and amounts on its own."))}</p></header>
			<label class="drop" id="drop" for="file"><span class="ic">${ic("upload")}</span><b>${esc(t("Drop your files here"))}</b><span>${esc(t("Excel (.xlsx), CSV, PDF statement, Word (.docx) or text"))}</span><span class="btn">${ic("folder-open")}${esc(t("Choose files"))}</span></label>
			<input type="file" id="file" class="sr" multiple accept=".csv,.xlsx,.xlsm,.xls,.pdf,.docx,.txt,.tsv,text/csv,application/pdf">
			<p class="priv">${ic("lock")}<span>${esc(t("Read in your browser. Only unknown merchant names go to the AI, without amounts, dates or account numbers."))}</span></p>
			${S.fail ? failBox(S.fail) : ""}
			<div class="sec-row"><h2 class="sec hl"><span>${esc(t("No statement at hand? Try a sample"))}</span></h2><button type="button" class="btn btn-sm btn-g" id="smTog" aria-expanded="${S.smHide ? "false" : "true"}" aria-controls="smBox"><span>${esc(t(S.smHide ? "Show the samples" : "Hide the samples"))}</span>${ic("chevron-down", "chev")}</button></div>
			<div id="smBox" ${S.smHide ? "hidden" : ""}><div class="sm-in"><p class="sec-sub">${esc(t("Three invented statements in three formats. Open one here, or download it to drop it yourself."))}</p>
			<ul class="samples">${SAMPLES.map((s, i) => `<li><div class="sm-b"><span class="ft">${ic(s.icon)}${s.kind}</span><h3>${esc(t(s.name))}</h3><p>${esc(t(s.desc))}</p></div><div class="acts"><button type="button" class="btn btn-sm" data-sample="${i}">${ic("scan-search")}${esc(t("Analyse"))}</button><a class="btn btn-sm btn-g" href="samples/${s.file}" download>${ic("download")}${esc(t("Download"))}</a></div></li>`).join("")}</ul></div></div>
			${footer()}`;
		S.fail = null;
		$("#smTog").addEventListener("click", () => { S.smHide = !S.smHide; store.set("facet-samples-hidden", S.smHide); const b = $("#smTog"); b.setAttribute("aria-expanded", !S.smHide); b.querySelector("span").textContent = t(S.smHide ? "Show the samples" : "Hide the samples"); slide($("#smBox"), !S.smHide); });
		const drop = $("#drop"), inp = $("#file");
		inp.addEventListener("change", () => inp.files.length && analyse([...inp.files]));
		["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
		["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
		drop.addEventListener("drop", (e) => e.dataTransfer.files.length && analyse([...e.dataTransfer.files]));
		$$("[data-sample]").forEach((b) => b.addEventListener("click", async () => { const s = SAMPLES[+b.dataset.sample]; const blob = await (await fetch("samples/" + s.file)).blob(); analyse([new File([blob], s.file)]); }));
	}
	function failBox(f) {
		const why = { xls: "is an old Excel file (.xls). Open it and save it as .xlsx or CSV.", broken: "could not be opened. It may be damaged or protected by a password.", none: "has no line with both a date and an amount. A scanned statement (a picture of text) cannot be read: export a CSV or Excel file from your bank's website instead." };
		return `<div class="alert" role="alert">${ic("triangle-alert")}<div><p><b>${esc(t("Nothing could be read from these files."))}</b></p><ul>${f.map((x) => `<li><b>${esc(x.name)}</b> ${esc(t(why[x.fail] || why.none))}</li>`).join("")}</ul></div></div>`;
	}

	/* ---------------- analyse: read, classify, ask the AI about unknown merchants, build ---------------- */
	async function analyse(files) {
		if (S.busy) return; S.busy = true;
		const dz = $("#drop"); // the drop zone answers at once: a loader while the files are read
		if (dz) { dz.classList.add("busy"); dz.innerHTML = `<span class="ic"><span class="spin big"></span></span><b>${esc(t("Reading {f}", { f: files.map((f) => f.name).join(", ") }))}</b><span>${esc(t("This takes a few seconds."))}</span>`; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await wait(450); }
		let step = stepsView(files);
		try {
			step("read", "on");
			const r = await P.read(files);
			step("read", "done", t("{n} files, {l} lines with a date and an amount", { n: files.length, l: num(r.tx.length) }).replace(/^1 files/, t("1 file")));
			// Facet was not sure how to read a table (no header, many lines left aside, nothing found): the person picks the columns
			const unsure = r.files.filter((f) => f.rows && f.rows.length > 2 && (f.fail || f.M?.hi === -1 || (f.skipped > 3 && f.skipped > f.found * 0.25)));
			for (const f of unsure) if (!(await checkCols(r, f.name))) { S.busy = false; return upload(); }
			if (unsure.length) { step = stepsView(files); }
			S.lastRead = { r, files };
			if (!r.tx.length) { S.busy = false; S.fail = r.files.filter((f) => f.fail); return go("#/new"), upload(); }
			await finishAnalysis(r, files, null, step);
		} catch (e) { console.error(e); S.busy = false; S.fail = files.map((f) => ({ name: f.name, fail: "broken" })); upload(); }
	}
	/* classify, ask the AI about unknown merchants, build and save; keepId: the same analysis read again with new columns */
	async function finishAnalysis(r, files, keepId, step) {
		if (!step) { const st = stepsView(files); step = st; }
		try {
			step("read", "done");
			step("cols", "on"); await wait(350);
			const fileNotes = r.files.filter((f) => f.found).map((f) => f.M?.lines ? (f.M.cols ? t("debit and credit columns found") : t("read line by line")) : t("columns: {c}", { c: colNames(f).join(", ") }));
			step("cols", "done", fileNotes.join(" · "));
			step("sort", "on"); await wait(300);
			r.tx.forEach((x, i) => (x.id = "t" + (r.tx.length - i)));
			const unknown = C.classify(r.tx);
			const nFile = r.tx.filter((x) => x.how === "file").length, nRule = r.tx.filter((x) => x.how === "rule").length;
			step("sort", "done", t("{a} from your file's categories, {b} from common words, {c} merchants left", { a: num(nFile), b: num(nRule), c: num(unknown.length) }));
			let ai = { asked: unknown.length, ok: 0, reason: "" };
			if (unknown.length) {
				step("ai", "on", t("{n} names sent, nothing else", { n: unknown.length }));
				try {
					const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
					const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "classify", merchants: unknown }), signal: ctl.signal });
					clearTimeout(tm); const j = await res.json().catch(() => ({}));
					if (res.ok && j.map) { C.applyAI(r.tx, j.map); ai.ok = Object.keys(j.map).length; } else ai.reason = j.error === "daily_limit" ? "limit" : "offline";
				} catch { ai.reason = "offline"; }
				const left = new Set(r.tx.filter((x) => x.c === "other").map((x) => x.m)).size;
				step("ai", "done", ai.reason ? t(ai.reason === "limit" ? "Today's free AI is used up: {n} merchants are left for you to check" : "The AI could not be reached: {n} merchants are left for you to check", { n: left }) : t("{a} merchants sorted, {b} left for you to check", { a: ai.ok, b: left }));
			} else step("ai", "done", t("Not needed: every merchant was recognised"));
			step("build", "on"); await wait(300);
			const curs = r.files.map((f) => f.cur).filter(Boolean), cur = curs.sort((a, b) => curs.filter((x) => x === b).length - curs.filter((x) => x === a).length)[0] || "EUR";
			const A = { id: keepId || Date.now().toString(36), at: new Date().toISOString(), cur, aiChecked: false, name: files.length === 1 ? files[0].name : t("{n} files", { n: files.length }), names: files.map((f) => f.name), lang: S.lang, ai, dupes: r.dupes,
				files: r.files.map((f) => ({ name: f.name, kind: f.kind, found: f.found, skipped: f.skipped, fail: f.fail, cols: f.M?.lines ? null : colNames(f), lines: !!f.M?.lines, dc: !!f.M?.cols, pos: !!f.M?.allPositive, pages: f.pages })),
				tx: r.tx.map((x) => ({ id: x.id, d: x.d, label: x.label, a: x.a, c: x.c, how: x.how, src: x.src })), views: [] };
			const list = savedList().filter((x) => x.id !== A.id); list.unshift(A);
			while (!store.set(savedKey(), list) && list.length > 1) list.pop(); // browser storage full: the oldest analyses make room
			S.lastRead = { r, files, id: A.id };
			load(A); step("build", "done"); await wait(250);
			S.busy = false; if (location.hash === "#/a/" + A.id) route(); else go("#/a/" + A.id);
		} catch (e) { console.error(e); S.busy = false; S.fail = files.map((f) => ({ name: f.name, fail: "broken" })); upload(); }
	}
	/* the reading screen: a lime progress bar, one row per step, the active row lit, done steps ticked in lime */
	function stepsView(files) {
		const steps = [["read", "Reading the files"], ["cols", "Finding dates, labels and amounts"], ["sort", "Sorting each merchant into a category"], ["ai", "Asking the AI about merchants it did not recognise"], ["build", "Building your analysis"]];
		$("#main").innerHTML = `<header><h1>${esc(t("Reading your statement"))}</h1><p>${esc(files.map((f) => f.name).join(", "))}</p></header>
			<section class="steps-card"><div class="prog" role="progressbar" aria-label="${esc(t("Reading your statement"))}" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="0"><span id="progBar"></span></div>
			<ol class="steps" id="steps" aria-live="polite">${steps.map(([k, l], i) => `<li data-s="${k}"><span class="st"><span class="num">${i + 1}</span></span><div>${esc(t(l))}<small></small></div></li>`).join("")}</ol></section>`;
		enter($("#main"));
		return (k, state, note) => {
			const li = $(`[data-s="${k}"]`); if (!li) return; li.className = state;
			const i = steps.findIndex((x) => x[0] === k);
			li.querySelector(".st").innerHTML = state === "on" ? '<span class="spin"></span>' : state === "done" ? `<span class="tick">${ic("check")}</span>` : `<span class="num">${i + 1}</span>`;
			if (note != null) li.querySelector("small").textContent = note;
			const done = $$("#steps li.done").length + ($$("#steps li.on").length ? 0.5 : 0), bar = $("#progBar");
			if (bar) { bar.style.width = (done / steps.length) * 100 + "%"; bar.parentElement.setAttribute("aria-valuenow", Math.floor(done)); }
		};
	}

	/* "Check the columns": a preview of the table with a choice above each column, and the number of lines it gives, live */
	function checkCols(r, name) {
		return new Promise((resolve) => {
			const f = r.files.find((x) => x.name === name), M = f.M || {}, rows = f.rows, hi = M.hi ?? -1;
			const n = Math.max(...rows.slice(0, 60).map((x) => x.length));
			const ROLES = [["", "Not used"], ["date", "Date"], ["label", "Label"], ["amount", "Amount"], ["debit", "Money out (debit)"], ["credit", "Money in (credit)"], ["cat", "Category"]];
			const ov = { hi, date: M.date, label: M.label, amount: M.amount, debit: M.debit, credit: M.credit, cat: M.cat };
			const roleOf = (i) => (ROLES.find(([k]) => k && ov[k] === i) || ROLES[0])[0];
			const body = rows.slice(hi + 1).filter((x) => x.some((c) => String(c ?? "").trim())).slice(0, 7);
			const cell = (v) => (typeof v === "number" && v > 20000 && v < 80000 && (roleOf(0) === "date" || true) ? String(v) : String(v ?? ""));
			const render = () => {
				const test = P.retable(r, name, ov), ff = test.files.find((x) => x.name === name);
				$("#main").innerHTML = `<header><h1>${esc(t("Check the columns"))}</h1><p>${esc(t("Facet is not sure how to read {f}. Tell it which column holds what: the number of lines found updates as you go.", { f: name }))}</p></header>
				<div class="cc"><div class="cc-t"><table><thead><tr>${Array.from({ length: n }, (_, i) => `<th><div class="dd"><button type="button" class="fbtn ${roleOf(i) ? "on" : ""}" data-col="${i}" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Column {n}", { n: i + 1 }))}"><span>${esc(t(ROLES.find(([k]) => k === roleOf(i))[1]))}</span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>${hi >= 0 ? `<small>${esc(String(rows[hi][i] ?? ""))}</small>` : ""}</th>`).join("")}</tr></thead>
				<tbody>${body.map((x) => `<tr>${Array.from({ length: n }, (_, i) => `<td class="${roleOf(i) ? "on" : ""}">${esc(cell(x[i]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
				<div class="cc-f"><span class="${ff.found ? "ok" : "warn"}">${ic(ff.found ? "circle-check" : "triangle-alert")}${esc(ff.found ? t("{n} lines with a date and an amount", { n: num(ff.found) }) : t("No line found yet: choose at least a date and an amount."))}</span><span class="sp"></span>
				<button type="button" class="btn" id="ccNo">${esc(t("Cancel"))}</button><button type="button" class="btn btn-p" id="ccOk" ${ff.found ? "" : "disabled"}>${ic("check")}${esc(t("Read with these columns"))}</button></div></div>`;
				$$("[data-col]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); const i = +b.dataset.col; menu(b, b.nextElementSibling, ROLES.map(([k, l]) => ({ k, label: t(l), on: roleOf(i) === k })), (x) => { for (const [k] of ROLES) if (k && ov[k] === i) ov[k] = undefined; if (x.k) { ov[x.k] = i; if (x.k === "amount") ov.debit = ov.credit = undefined; if (x.k === "debit" || x.k === "credit") ov.amount = undefined; } render(); }); }));
				$("#ccNo").addEventListener("click", () => resolve(false));
				$("#ccOk").addEventListener("click", () => resolve(true));
			};
			render(); enter($("#main"));
		});
	}
	function colNames(f) {
		const M = f.M || {}, h = M.head || [], nm = (i, fb) => (i != null ? (h[i] ? `“${h[i]}”` : t(fb)) : null);
		return [M.date != null && t("date {c}", { c: nm(M.date, t("column {n}", { n: M.date + 1 })) }), M.label != null && t("label {c}", { c: nm(M.label, t("column {n}", { n: M.label + 1 })) }), M.amount != null && t("amount {c}", { c: nm(M.amount, t("column {n}", { n: M.amount + 1 })) }), M.debit != null && t("debit {c}", { c: nm(M.debit, "") }), M.credit != null && t("credit {c}", { c: nm(M.credit, "") }), M.cat != null && t("category {c}", { c: nm(M.cat, "") })].filter(Boolean);
	}

	/* an analysis becomes the engine's data: merchants rebuilt, "today" = the end of the file */
	function load(A) {
		S.A = A; S.open = {}; S.pick = {}; S.past = []; S.q = ""; S.txN = 40; S.txFilter = "all"; S.f = { per: "all", cats: [], min: 0 };
		const tx = A.tx.map((x) => ({ ...x, m: C.merchant(x.label) }));
		tx.forEach((x) => (x.k = x.m.toLowerCase()));
		const last = tx[0]?.d || new Date().toISOString().slice(0, 10), ld = E.parse(last), endM = new Date(ld.getFullYear(), ld.getMonth() + 1, 0);
		const today = ld.getDate() >= 25 ? `${last.slice(0, 7)}-${String(endM.getDate()).padStart(2, "0")}` : last;
		S.data = { full: today.slice(8) === String(endM.getDate()) && today.slice(0, 7) === last.slice(0, 7), tx, today, from: tx[tx.length - 1]?.d || last, merchants: [...new Set(tx.map((x) => x.m))].sort(), cats: CATS.concat("other") };
	}
	function persist() {
		const A = S.A, list = savedList(), i = list.findIndex((x) => x.id === A.id);
		A.tx = S.data.tx.map((x) => ({ id: x.id, d: x.d, label: x.label, a: x.a, c: x.c, how: x.how, src: x.src }));
		if (i >= 0) list[i] = A; else list.unshift(A);
		store.set(savedKey(), list);
	}

	/* filters for the whole analysis: period, categories, minimum amount. They narrow the spending lines; money in stays for the period. */
	function fdata() {
		const D = S.data, f = S.f || { per: "all", cats: [], min: 0 }, T = E.parse(D.today);
		let from = D.from, to = D.today;
		if (/^\d{4}-\d{2}$/.test(f.per)) { const [y, m] = f.per.split("-").map(Number); from = f.per + "-01"; to = `${f.per}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`; if (to > D.today) to = D.today; }
		else if (f.per === "last_3_months" || f.per === "last_6_months") { const n = f.per === "last_3_months" ? 3 : 6, d = new Date(T.getFullYear(), T.getMonth() - n + 1, 1); from = d.toISOString().slice(0, 7) + "-01"; if (from < D.from) from = D.from; }
		const tx = D.tx.filter((x) => x.d >= from && x.d <= to && (x.a > 0 || ((!f.cats.length || f.cats.includes(x.c)) && -x.a >= (f.min || 0))));
		const last = new Date(+to.slice(0, 4), +to.slice(5, 7), 0);
		return { ...D, tx, from, today: to, full: D.full || to.slice(8) === String(last.getDate()) };
	}
	const filtered = () => S.f && (S.f.per !== "all" || S.f.cats.length || S.f.min);
	function filterBar() {
		const f = S.f, D = S.data, months = [...new Set(D.tx.map((x) => x.d.slice(0, 7)))].sort().reverse();
		const perLabel = f.per === "all" ? t("The whole file") : /^\d{4}-/.test(f.per) ? dt(f.per + "-01", { month: "long", year: "numeric" }) : t(PRESET_NAMES[f.per]);
		const catLabel = !f.cats.length ? t("All categories") : f.cats.length === 1 ? catName(f.cats[0]) : t("{n} categories", { n: f.cats.length });
		const minLabel = f.min ? t("Over {v}", { v: money0(f.min) }) : t("Any amount");
		const dd = (id, icon, label, on) => `<div class="dd"><button type="button" class="fbtn ${on ? "on" : ""}" id="${id}" aria-haspopup="listbox" aria-expanded="false">${ic(icon)}<span>${esc(label)}</span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>`;
		return `<div class="filters" role="group" aria-label="${esc(t("Filter the analysis"))}"><span class="f-lead">${ic("layers")}${esc(t("Filter"))}</span>${dd("fPer", "calendar", perLabel, f.per !== "all")}${dd("fCat", "chart-pie", catLabel, f.cats.length)}${dd("fMin", "receipt-text", minLabel, f.min)}${filtered() ? `<button type="button" class="btn btn-sm btn-g" id="fReset">${ic("rotate-ccw")}${esc(t("Reset"))}</button>` : ""}<span class="sp"></span><span class="f-n">${esc(t("{n} lines", { n: num(fdata().tx.length) }))}</span></div>`;
		void months;
	}
	function bindFilters() {
		const D = S.data, f = S.f, months = [...new Set(D.tx.map((x) => x.d.slice(0, 7)))].sort().reverse(), nM = months.length;
		const apply = () => { S.txN = 40; report(false); };
		$("#fPer").addEventListener("click", (e) => { e.stopPropagation(); menu($("#fPer"), $("#fPer").nextElementSibling, [{ v: "all", label: t("The whole file") }, ...(nM > 3 ? [{ v: "last_3_months", label: t("Last 3 months") }] : []), ...(nM > 6 ? [{ v: "last_6_months", label: t("Last 6 months") }] : []), ...months.map((m) => ({ v: m, label: dt(m + "-01", { month: "long", year: "numeric" }) }))].map((x) => ({ ...x, on: x.v === f.per })), (x) => { f.per = x.v; apply(); }); });
		$("#fCat").addEventListener("click", (e) => { e.stopPropagation(); menu($("#fCat"), $("#fCat").nextElementSibling, [{ v: "", label: t("All categories"), on: !f.cats.length }, ...CATS.concat("other").filter((c) => D.tx.some((x) => x.c === c)).map((c) => ({ v: c, label: catName(c), dot: col(c), on: f.cats.includes(c), check: true }))], (x) => { if (!x.v) f.cats = []; else f.cats = f.cats.includes(x.v) ? f.cats.filter((c) => c !== x.v) : f.cats.concat(x.v); apply(); }); });
		$("#fMin").addEventListener("click", (e) => { e.stopPropagation(); menu($("#fMin"), $("#fMin").nextElementSibling, [0, 10, 50, 100, 500].map((v) => ({ v, label: v ? t("Over {v}", { v: money0(v) }) : t("Any amount"), on: v === f.min })), (x) => { f.min = x.v; apply(); }); });
		$("#fReset")?.addEventListener("click", () => { S.f = { per: "all", cats: [], min: 0 }; apply(); });
	}

	/* undo: every change (category, view added or removed, block changed) can be taken back */
	function snap() { S.past.push(JSON.stringify({ views: S.A.views, cats: S.data.tx.map((x) => [x.c, x.how]) })); if (S.past.length > 50) S.past.shift(); }
	function undo() {
		const s = S.past.pop(); if (!s) return;
		const o = JSON.parse(s); S.A.views = o.views; o.cats.forEach(([c, h], i) => { S.data.tx[i].c = c; S.data.tx[i].how = h; });
		persist(); report(false);
	}

	/* ---------------- the report ---------------- */
	function report(first) {
		const A = S.A, main = $("#main"); if (!A || !main) return;
		const FD = (S.fd = fdata()), D = FD, tx = FD.tx, all = S.data.tx;
		if (!tx.length) S.f = { per: "all", cats: [], min: 0 };
		const spend = tx.filter((x) => x.a < 0), inc = tx.filter((x) => x.a > 0);
		const todo = all.filter((x) => x.c === "other"), months = E.range({ preset: "all" }, D).months;
		const ids = new Set(tx.map((x) => x.id));
		const rec = C.recurring(all.map((x) => ({ ...x }))).map((r) => ({ ...r, tx: r.tx.filter((x) => ids.has(x.id)) })).filter((r) => r.tx.length), odd = C.unusual(all, C.recurring(all.map((x) => ({ ...x })))).filter((o) => ids.has(o.t.id));
		const counts = ["file", "rule", "ai", "you"].map((k) => [k, all.filter((x) => x.how === k).length]);
		const allP = { preset: "all" };
		const blocks = [
			{ kind: "kpi", title: { k: "Money out" }, measure: "spend", period: allP, compare: false },
			{ kind: "kpi", title: { k: "Money in" }, measure: "income", period: allP, compare: false },
			{ kind: "kpi", title: { k: "What is left" }, measure: "net", period: allP, compare: false },
			months >= 2 ? { kind: "kpi", title: { k: "Spent per month on average" }, measure: "avg_month", period: allP, compare: false } : { kind: "kpi", title: { k: "Number of purchases" }, measure: "count", period: allP, compare: false },
		];
		const where = [
			{ kind: "donut", title: { k: "By category" }, measure: "spend", by: "category", period: allP },
			{ kind: "bar", title: { k: months > 1 ? "Month by month" : "Day by day" }, measure: "spend", by: months > 1 ? "month" : "day", period: allP },
		];
		const top = [{ kind: "bar", title: { k: "Where you spend the most" }, measure: "spend", by: "merchant", period: allP, limit: 8 }];
		const r0 = E.range(allP, D);
		main.innerHTML = `
			<header class="rh"><div><h1>${esc(A.name)}</h1>
				<div class="meta"><span>${ic("calendar")}${esc(t("{a} to {b}", { a: dLong(S.data.from), b: dLong(all[0].d) }))}</span><span>${ic("receipt-text")}${esc(t("{n} lines", { n: num(all.length) }))}</span><span class="ok">${ic("check")}${esc(t("Saved in My analyses"))}</span></div></div>
				<button type="button" class="btn" data-go="#/new">${ic("upload")}<span class="lbl">${esc(t("Another file"))}</span></button></header>
			<form class="ask" id="askF" autocomplete="off"><span class="lead">${ic("sparkles")}</span><label class="sr" for="askQ">${esc(t("Ask a question about your money"))}</label><input id="askQ" maxlength="300" placeholder="${esc(t(innerWidth < 640 ? "Ask a question about your money" : "Ask a question, for example: how much do I spend on restaurants each month?"))}"><button class="btn btn-p" type="submit"><span>${esc(t("Ask"))}</span>${ic("arrow-right", "flip-ic")}</button></form>
			<ul class="chips" aria-label="${esc(t("Questions you can ask"))}">${chips(rec).map((c, i) => `<li><button type="button" data-chip="${i}" data-en="${esc(c[1])}">${esc(c[0])}</button></li>`).join("")}</ul>
			<div id="views"></div>
			<div class="rep">
			<div class="rep-main">
			${aiReview(A)}
			<div class="fwrap">${filterBar()}</div>
			<section class="sect first"><h2>${esc(t("Overview"))}</h2><p class="sub">${esc(filtered() ? t("Filtered: {r}.", { r: rangeLabel(r0) }) : t("The whole file: {r}.", { r: rangeLabel(r0) }))}</p><div class="grid" id="g-kpi"></div></section>
			<section class="sect"><h2>${esc(t("Where the money goes"))}</h2><div class="grid" id="g-where"></div></section>
			<section class="sect"><h2>${esc(t("Worth knowing"))}</h2><div class="ins" id="ins"></div><div class="grid" id="g-odd"></div></section>
			<section class="sect"><h2>${esc(t("Regular payments"))}</h2><p class="sub">${esc(rec.length ? t("Found because the same amount goes to the same place at a steady rhythm.") : t("No payment repeats at a steady rhythm in this file."))}</p><div class="grid" id="g-rec"></div></section>

			<section class="sect" id="all"><h2>${esc(t("All lines"))}</h2><p class="sub">${esc(t("Change a category and every figure above follows."))}</p>
				<div class="tools-row"><div class="search">${ic("search")}<label class="sr" for="txQ">${esc(t("Search"))}</label><input id="txQ" placeholder="${esc(t("Search a merchant or a label"))}" value="${esc(S.q)}"></div>
				<div class="dd"><button type="button" class="btn" id="txF" aria-haspopup="listbox" aria-expanded="false">${ic("layers")}<span>${esc(S.txFilter === "all" ? t("All categories") : catName(S.txFilter))}</span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div></div>
				<div class="alltx" id="alltx"></div></section>
			</div>
			<aside class="rep-side" aria-label="${esc(t("Your file"))}">${readBox(A, counts, todo)}${preview(A)}</aside>
			</div>
			${footer()}`;
		const anim = !!first;
		fill("#g-kpi", blocks, anim); fill("#g-where", where.concat(top), anim);
		insights(rec); recBlock(rec, anim); oddBlock(odd, anim); views(anim); allTx(); bindFilters();
		$("#askF").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#askQ").value.trim(); if (v) ask(v); });
		$$("[data-chip]").forEach((b) => b.addEventListener("click", () => ask(b.textContent, true, b.dataset.en)));
		$("#txQ").addEventListener("input", (e) => { S.q = e.target.value; S.txN = 40; allTx(); });
		$("#txF").addEventListener("click", (e) => { e.stopPropagation(); menu($("#txF"), $("#txF").nextElementSibling, [{ k: "all", label: t("All categories"), on: S.txFilter === "all" }, ...CATS.concat("income", "other").map((c) => ({ k: c, label: catName(c) + ` (${num(tx.filter((x) => x.c === c).length)})`, dot: col(c), on: S.txFilter === c }))], (x) => { S.txFilter = x.k; S.txN = 40; $("#txF span").textContent = x.k === "all" ? t("All categories") : catName(x.k); allTx(); }); });
		$$("[data-fixcols]").forEach((b) => b.addEventListener("click", async () => { const L = S.lastRead; if (await checkCols(L.r, b.dataset.fixcols)) { S.busy = true; await finishAnalysis(L.r, L.files, L.id); } else route(); }));
		$("#aiOk")?.addEventListener("click", () => { S.A.aiChecked = true; persist(); slide($("#aiRev"), false); setTimeout(alignSide, reduced() ? 0 : 450); });
		$$("[data-airev]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); const k = b.dataset.airev, same = S.data.tx.filter((y) => y.k === k && y.a < 0), x = same[0];
			menu(b, b.nextElementSibling, CATS.map((c) => ({ c, label: catName(c), dot: col(c), on: c === x.c })), (o) => { if (o.c === x.c) return; snap(); same.forEach((y) => { y.c = o.c; y.how = "you"; }); persist(); report(false); toast(t("{m}: {n} lines moved to {c}.", { m: x.m, n: same.length, c: catName(o.c) }), t("Undo"), undo); }); }));
		$("#pvAll")?.addEventListener("click", () => lines(t("All lines"), S.data.tx, ""));
		$("#readBtn")?.addEventListener("click", () => { S.open.read = !($("#readBtn").getAttribute("aria-expanded") === "true"); $("#readBtn").setAttribute("aria-expanded", S.open.read); slide($("#readIn"), S.open.read); setTimeout(alignSide, reduced() ? 0 : 520); });
		requestAnimationFrame(alignSide);
		$("#toCheck")?.addEventListener("click", () => { S.f = { per: "all", cats: [], min: 0 }; report(false); S.txFilter = "other"; S.txN = 40; allTx(); $("#txF span").textContent = catName("other"); $("#all").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); });
	}
	/* wide screens: the right column starts level with the Overview cards, then follows the scroll (only when it fits the screen) */
	function alignSide() {
		const side = $(".rep-side"), main = $(".rep-main"), kpi = $("#g-kpi"), fw = $(".fwrap"); if (!side || !main || !kpi) return;
		if (innerWidth < 1280) { side.style.marginTop = side.style.top = ""; side.classList.remove("stick"); return; }
		side.style.marginTop = Math.max(0, Math.round(kpi.getBoundingClientRect().top - main.getBoundingClientRect().top)) + "px";
		const top = ($(".topbar")?.offsetHeight || 0) + (fw ? fw.offsetHeight : 0) + 12;
		side.style.top = top + "px";
		side.classList.toggle("stick", side.offsetHeight <= innerHeight - top - 16);
	}
	const rangeLabel = (R) => t("{a} to {b}", { a: dShort(R.from), b: dLong(R.to) });
	function chips(rec) {
		const topCat = CATS.map((c) => [c, S.data.tx.filter((x) => x.c === c && x.a < 0).reduce((a, x) => a - x.a, 0)]).filter((x) => x[0] !== "home").sort((a, b) => b[1] - a[1])[0]?.[0] || "groceries";
		// shown in the person's language; the local reader gets the English wording (it reads English and French words)
		const q = (k, p) => [t(k, p), (k.replace(/\{(\w+)\}/g, (m, n) => (n === "cat" ? I.CAT_NAMES[topCat] : m)))];
		return [q("How much do I spend on {cat} each month?", { cat: catName(topCat).toLowerCase() }), q("What are my biggest expenses?"), q("Which day of the week do I spend the most?"), rec.length ? q("How much do my subscriptions cost?") : q("How much money came in and went out?")];
	}
	function readBox(A, counts, todo) {
		const n = Object.fromEntries(counts), files = A.files.filter((f) => f.found);
		return `<div class="read"><button type="button" id="readBtn" aria-expanded="${S.open.read ? "true" : "false"}">${ic("scan-search")}<div><b>${esc(t("What Facet read"))}</b><br><span>${esc(t("{n} lines from {f}", { n: num(S.data.tx.length), f: files.map((f) => f.name).join(", ") }))}${todo.length ? " · " : ""}</span>${todo.length ? `<span class="badge warn">${esc(t("{n} to check", { n: num(todo.length) }))}</span>` : `<span class="ok"> · ${esc(t("everything sorted"))}</span>`}</div>${ic("chevron-down", "chev")}</button>
			<div id="readIn" ${S.open.read ? "" : "hidden"}><div class="read-in">
				${A.files.map((f) => `<div class="fl"><h4>${ic(f.kind === "pdf" ? "file" : f.kind === "xlsx" ? "file-spreadsheet" : "file-text")}${esc(f.name)}</h4><p>${f.found ? esc(t("{n} lines read", { n: num(f.found) })) + (f.skipped ? esc(" · " + t("{n} lines left aside (balances, totals, lines without an amount)", { n: num(f.skipped) })) : "") + (f.pages ? esc(" · " + t("{n} pages", { n: f.pages })) : "") : esc(t("Nothing could be read from this file."))}</p>
					${f.cols ? `<ul class="cols">${f.cols.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : f.lines ? `<ul class="cols"><li>${esc(f.dc ? t("Read from the PDF layout: date at the start of the line, amount under Debit or Credit") : t("Read line by line: a date at the start, the amount at the end"))}</li></ul>` : ""}
					${f.pos ? `<p>${esc(t("Every amount was positive: they are counted as spending."))}</p>` : ""}
					${S.lastRead?.id === A.id && S.lastRead.r.files.find((x) => x.name === f.name)?.rows ? `<p><button type="button" class="btn btn-sm" data-fixcols="${esc(f.name)}">${ic("pencil")}${esc(t("Wrong columns? Fix them"))}</button></p>` : ""}</div>`).join("")}
				${A.dupes ? `<p class="sub">${esc(t("{n} lines appeared in two files and are counted once.", { n: A.dupes }))}</p>` : ""}
				<div class="how-c"><div><b>${num(n.file)}</b><small>${esc(t("sorted with your file's categories"))}</small></div><div><b>${num(n.rule)}</b><small>${esc(t("sorted with common words"))}</small></div><div><b>${num(n.ai)}</b><small>${esc(t("sorted by the AI"))}</small></div><div class="${todo.length ? "warn" : ""}"><b>${num(todo.length)}</b><small>${esc(t("to check"))}${n.you ? " · " + esc(t("{n} changed by you", { n: num(n.you) })) : ""}</small></div></div>
				${A.ai?.reason ? `<p class="sub">${esc(A.ai.reason === "limit" ? limitNote() : t("The AI could not be reached during this analysis."))}</p>` : ""}
				${todo.length ? `<p><button type="button" class="btn btn-sm" id="toCheck">${ic("pencil")}${esc(t("Check the {n} lines", { n: num(todo.length) }))}</button></p>` : ""}
			</div></div></div>`;
	}

	/* right after an analysis: the merchants the AI sorted, to confirm or correct in one look */
	function aiReview(A) {
		if (A.aiChecked) return "";
		const g = new Map(); for (const x of S.data.tx) if (x.how === "ai") (g.get(x.k) || g.set(x.k, []).get(x.k)).push(x);
		if (!g.size) return "";
		return `<div id="aiRev"><section class="airev"><div class="airev-h">${ic("sparkles")}<div><h2>${esc(t("The AI sorted {n} merchants. Do they look right?", { n: g.size }))}</h2><p class="per">${esc(t("Change any category: every line from that merchant follows."))}</p></div></div>
			<ul>${[...g.values()].map((l) => `<li><b>${esc(l[0].m)}</b><span class="per">${esc(t(l.length === 1 ? "1 line" : "{n} lines", { n: num(l.length) }))}</span><div class="dd"><button type="button" class="catb" data-airev="${esc(l[0].k)}" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Category of {m}: {c}. Change", { m: l[0].m, c: catName(l[0].c) }))}"><i class="dot" style="background:${col(l[0].c)}"></i>${esc(catName(l[0].c))}${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div></li>`).join("")}</ul>
			<button type="button" class="btn btn-sm btn-p" id="aiOk">${ic("check")}${esc(t("Everything looks right"))}</button></section></div>`;
	}

	/* the file itself, as Facet read it: the first lines with their line number, like a spreadsheet */
	function preview(A) {
		const f = A.files.find((x) => x.found), rows = S.data.tx.filter((x) => x.src?.file === f?.name).slice().sort((a, b) => (typeof a.src.line === "number" && typeof b.src.line === "number" ? a.src.line - b.src.line : a.d < b.d ? -1 : 1)).slice(0, 9);
		if (!f) return "";
		return `<section class="pv"><h3>${ic(f.kind === "pdf" ? "file" : f.kind === "xlsx" ? "file-spreadsheet" : "file-text")}<span>${esc(f.name)}</span></h3><p class="per">${esc(t("The first lines, as read from your file"))}</p>
			<div class="pv-doc"><table><tbody>${rows.map((x) => `<tr><th>${esc(typeof x.src.line === "number" ? x.src.line : x.src.line.replace("p. ", "p"))}</th><td>${esc(x.d.split("-").reverse().join("/"))}</td><td class="pl">${esc(x.label)}</td><td class="pa ${x.a > 0 ? "in" : ""}">${esc(new Intl.NumberFormat(locale(), { minimumFractionDigits: 2 }).format(x.a))}</td></tr>`).join("")}</tbody></table></div>
			<button type="button" class="btn btn-sm" id="pvAll">${ic("receipt-text")}${esc(t("See every line"))}</button></section>`;
	}

	/* insight cards: sentences with computed numbers, never written by the AI */
	function insights(rec) {
		const D = S.fd || S.data, tx = D.tx, out = [];
		const perMonth = rec.reduce((a, r) => a + (r.every === "month" ? r.amount : r.every === "week" ? (r.amount * 52) / 12 : r.amount / 12), 0);
		if (rec.length) out.push({ icon: "repeat", h: t("Regular payments"), v: t("{v} a month", { v: money0(perMonth) }), p: t("{n} payments come back on their own, about {y} a year.", { n: rec.length, y: money0(perMonth * 12) }) });
		// biggest change between the last 3 full months and the 3 before
		const T = E.parse(D.today), full = D.today.slice(8) === String(new Date(T.getFullYear(), T.getMonth() + 1, 0).getDate()) ? 0 : 1;
		const mk = (k) => { const d = new Date(T.getFullYear(), T.getMonth() - k - full, 1); return d.toISOString().slice(0, 7); };
		const span = (a, b) => { const ms = []; for (let k = a; k < b; k++) ms.push(mk(k)); return ms; };
		const recent = span(0, 3), before = span(3, 6);
		if (before.every((m) => m >= D.from.slice(0, 7))) {
			const avg = (c, ms) => tx.filter((x) => x.c === c && x.a < 0 && ms.includes(x.d.slice(0, 7))).reduce((a, x) => a - x.a, 0) / 3;
			const ch = CATS.map((c) => ({ c, a: avg(c, recent), b: avg(c, before) })).map((x) => ({ ...x, d: x.a - x.b })).filter((x) => x.b > 0).sort((p, q) => Math.abs(q.d) - Math.abs(p.d))[0];
			if (ch && Math.abs(ch.d) >= 15) out.push({ icon: ch.d > 0 ? "trending-up" : "trending-down", h: t("{cat}: the biggest change", { cat: catName(ch.c) }), v: (ch.d > 0 ? "+" : "−") + t("{v} a month", { v: money0(Math.abs(ch.d)) }), p: t("{a} a month over the last 3 months, against {b} the 3 months before.", { a: money0(ch.a), b: money0(ch.b) }) });
		}
		if (out.length < 2 && (S.f?.cats.length || 0) !== 1) { const sp = tx.filter((x) => x.a < 0), tot = sp.reduce((a, x) => a - x.a, 0) || 1, big = CATS.map((c) => [c, sp.filter((x) => x.c === c).reduce((a, x) => a - x.a, 0)]).sort((a, b) => b[1] - a[1])[0]; out.push({ icon: CAT_ICON[big[0]], h: t("Your largest category"), v: pct(big[1] / tot), p: t("{cat} takes {p} of your spending: {v}.", { cat: catName(big[0]), p: pct(big[1] / tot), v: money0(big[1]) }) }); }
		const small = tx.filter((x) => x.a < 0 && -x.a < 10);
		if (small.length >= 5) out.push({ icon: "coffee", h: t("Small purchases"), v: money0(small.reduce((a, x) => a - x.a, 0)), p: t("{n} purchases under {l} each add up to this.", { n: num(small.length), l: money0(10) }) });
		const inc = tx.filter((x) => x.a > 0).reduce((a, x) => a + x.a, 0), net = tx.reduce((a, x) => a + x.a, 0);
		if (out.length < 3 && inc > 0) out.push({ icon: "piggy-bank", h: t("What you kept"), v: pct(Math.max(0, net) / inc), p: net >= 0 ? t("Of the money that came in, {v} was left at the end.", { v: money0(net) }) : t("You spent {v} more than what came in.", { v: money0(-net) }) });
		$("#ins").innerHTML = out.slice(0, 3).map((x, i) => `<div class="in-c" style="animation-delay:${i * 70}ms"><span class="ic">${ic(x.icon)}</span><h3>${esc(x.h)}</h3><p class="v">${esc(x.v)}</p><p>${esc(x.p)}</p></div>`).join("");
	}

	function recBlock(rec, anim) {
		const g = $("#g-rec"); if (!rec.length) { g.innerHTML = ""; return; }
		const ev = { month: t("every month"), week: t("every week"), year: t("every year") };
		const el = cardShell(t("Regular payments"), t("{n} found", { n: rec.length }), 12, anim, 0);
		el.querySelector(".plot").innerHTML = `<table class="tb"><thead><tr><th>${esc(t("Merchant"))}</th><th class="n">${esc(t("Amount"))}</th><th class="n">${esc(t("Per year"))}</th></tr></thead><tbody>${rec.map((r, i) => `<tr data-r="${i}" tabindex="0"><td><span class="c"><i class="dot" style="background:${col(r.c)}"></i>${esc(r.m)}</span><br><span class="s">${esc([catName(r.c), ev[r.every] + (r.varies ? ", " + t("amount varies") : ""), t("last on {d}", { d: dShort(r.last) })].join(" · "))}</span></td><td class="n">${esc((r.varies ? "≈ " : "") + money(r.amount))}</td><td class="n">${esc(money0(r.yearly))}</td></tr>`).join("")}</tbody></table>`;
		const all = rec.flatMap((r) => r.tx), res = { list: all, rows: rec.map((r) => ({ key: r.m, tx: r.tx })) };
		addSources(el, "rec", res, { label: (row) => row.key });
		$$("tr[data-r]", el).forEach((tr) => tr.addEventListener("click", () => pickRow(el, "rec", res, +tr.dataset.r, { label: (row) => row.key })));
		g.appendChild(el);
	}
	function oddBlock(odd, anim) {
		const g = $("#g-odd");
		const el = cardShell(t("Expenses that stand out"), odd.length ? t("Far above what you usually pay at the same place, or among your very largest one-off expenses.") : "", 12, anim, 0);
		el.querySelector(".plot").innerHTML = odd.length ? `<ul class="odd">${odd.map((o) => `<li><b>${esc(o.t.m)}</b><span class="a">${esc(money(-o.t.a))}</span><small>${esc(dLong(o.t.d))} · ${esc(o.why === "usual" ? t("{x} times what you usually pay there ({u})", { x: new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(o.times), u: money(o.usual) }) : t("One of your largest one-off expenses"))} · ${esc(srcLabel(o.t))}</small></li>`).join("")}</ul>` : `<p class="per">${esc(t("Nothing stands out: no expense is far from your usual amounts."))}</p>`;
		g.appendChild(el);
	}
	const srcLabel = (x) => (typeof x.src?.line === "number" ? t("{f}, line {l}", { f: x.src.file, l: x.src.line }).replace(/ (\d+)$/, "\u00a0$1") : `${x.src?.file}, ${x.src?.line}`);

	/* ---------------- views built from a request (AI, or the local reader as a fallback) ---------------- */
	async function ask(text, chip, en) {
		if (S.busy) return; S.busy = true;
		const box = $("#views"), D = S.data;
		box.insertAdjacentHTML("afterbegin", `<div class="views-h" id="vload"><span class="spin"></span><span>${esc(t("Looking for the answer: {q}", { q: text }))}</span></div>`);
		let spec = null, src = "ai", reason = "";
		if (!chip) {
			try {
				const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
				const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal, body: JSON.stringify({ request: text, lang: S.lang, currency: cur(), today: D.today, from: D.from, merchants: D.merchants.slice(0, 60) }) });
				clearTimeout(tm); const j = await r.json().catch(() => ({}));
				if (r.ok && j.spec) { if (Array.isArray(j.spec.blocks) && !j.spec.blocks.length) { S.busy = false; $("#vload")?.remove(); return toast(t("Facet only knows this file. Ask about spending, categories, merchants or a period.")); } spec = E.clean(j.spec, D); if (!spec) reason = "unreadable"; }
				else reason = j.error === "daily_limit" ? "limit" : "offline";
			} catch { reason = "offline"; }
		}
		if (!spec) { src = chip ? "chip" : "local"; spec = E.clean(RD.read(en || text, { t: (k, p) => ({ k, p }), today: D.today }), D); }
		await wait(200);
		S.busy = false; $("#vload")?.remove();
		if (!spec) return toast(t("Facet only knows this file. Ask about spending, categories, merchants or a period."));
		snap(); S.A.views.unshift({ id: Date.now().toString(36), label: text, spec, src, reason }); persist();
		$("#askQ").value = ""; views(true);
		$("#views").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
	}
	/* shown where the AI would have acted, only when the day's free allowance is spent */
	const resetAt = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }); };
	const limitNote = () => t("Facet uses Meta's Llama 3.3 model through Cloudflare's free Workers AI service. Today's free allowance is used up: it comes back at {time}. Until then, answers come from a simpler reader, the figures stay exact, and nothing is charged.", { time: resetAt() });
	/* the answer to a question, in one sentence, computed from the first block (the AI never writes a figure) */
	function answer(spec) {
		const b = spec.blocks[0]; if (!b) return "";
		const r = E.run(b, S.data), name = title(b.title);
		if (b.kind === "kpi") return t("{what}: {v}.", { what: name || t("Answer"), v: val(b, r.total) });
		if (!r.list.length) return t("Nothing in this period.");
		if (b.by === "transaction") { const x = r.rows[0]?.tx[0]; return x ? t("The largest is {m}: {v}, on {d}.", { m: x.m, v: money(Math.abs(x.a)), d: dLong(x.d) }) : ""; }
		const rows = (r.rows || []).filter((x) => x.key !== "_other"), top = rows.slice().sort((a, b2) => b2.value - a.value)[0]; if (!top) return "";
		if (E.TIME.includes(b.by)) return t("Highest: {g}, with {v}. Total: {t}.", { g: keyLabel(b, top.key, true), v: val(b, top.value), t: val(b, r.total) });
		return t("{g} comes first, with {v}.", { g: keyLabel(b, top.key, true), v: val(b, top.value) });
	}
	function views(anim) {
		const box = $("#views"); box.innerHTML = "";
		S.A.views.forEach((v, vi) => {
			const by = v.src === "ai" ? `<span class="src-by">${ic("sparkles")}${esc(t("Layout chosen by the AI"))}</span>` : v.src === "chip" ? `<span class="src-by">${ic("check")}${esc(t("Suggestion, built without AI"))}</span>` : v.src === "edit" ? `<span class="src-by">${ic("check")}${esc(t("Changed by you"))}</span>` : `<span class="src-by warn">${ic("info")}${esc(t(v.reason === "limit" ? "Today's free AI is used up: simple local reader" : "AI not reachable: simple local reader"))}</span>`;
			const wrap = document.createElement("section"); wrap.className = "sect"; wrap.style.marginTop = vi ? "28px" : "20px";
			wrap.className = "qa";
			wrap.innerHTML = `<div class="qa-h"><div class="qa-q">${ic("sparkles")}<span>${esc(v.label)}</span></div><span class="sp"></span>${by}<button type="button" class="btn btn-sm btn-g" data-rm="${vi}">${ic("x")}<span class="lbl">${esc(t("Remove"))}</span></button></div><p class="qa-a">${esc(answer(v.spec))}</p>${v.reason === "limit" ? `<p class="per lim">${esc(limitNote())}</p>` : ""}<div class="grid"></div>`;
			box.appendChild(wrap);
			const spans = layout(v.spec.blocks), g = wrap.querySelector(".grid");
			v.spec.blocks.forEach((b, i) => g.appendChild(card(b, `v${v.id}-${i}`, spans[i], anim && vi === 0, i, { view: vi, block: i })));
			wrap.querySelector("[data-rm]").addEventListener("click", () => { snap(); S.A.views.splice(vi, 1); persist(); views(false); toast(t("View removed."), t("Undo"), undo); });
		});
	}
	function layout(blocks) {
		const out = [];
		for (let i = 0; i < blocks.length;) {
			const kpi = blocks[i].kind === "kpi"; let j = i; while (j < blocks.length && (blocks[j].kind === "kpi") === kpi) j++;
			for (let k = i; k < j; k++) out[k] = kpi ? 12 / Math.min(4, j - i - Math.floor((k - i) / 4) * 4) : blocks[k].by === "day" || (k === j - 1 && (k - i) % 2 === 0) ? 12 : 6;
			i = j;
		}
		return out;
	}
	function fill(sel, blocks, anim) { const g = $(sel), spans = layout(blocks); blocks.forEach((b, i) => g.appendChild(card(b, sel.slice(3) + i, spans[i], anim, i))); }

	/* ---------------- a block ---------------- */
	const PRESET_NAMES = { this_month: "Last month of the file", last_month: "The month before", last_3_months: "Last 3 months", last_6_months: "Last 6 months", last_12_months: "Last 12 months", this_year: "This year", all: "The whole file" };
	const KIND_NAMES = { bar: "Bars", line: "Line", donut: "Ring", table: "Table" }, KIND_ICONS = { bar: "chart-column", line: "chart-line", donut: "chart-pie", table: "table-2" };
	const val = (b, v) => (b.measure === "count" ? num(v) : money(v)), valShort = (b, v) => (b.measure === "count" ? num(v) : moneyShort(v));
	function keyLabel(b, k, long) {
		if (k === "_other") return t("Others");
		if (b.by === "category") return catName(k);
		if (b.by === "merchant") return k;
		if (b.by === "month") return dt(k + "-01", long ? { month: "long", year: "numeric" } : { month: "short" });
		if (b.by === "week") return long ? t("Week of {d}", { d: dt(k, { day: "numeric", month: "long" }) }) : dShort(k);
		if (b.by === "day") return long ? dt(k, { weekday: "long", day: "numeric", month: "long" }) : dt(k, { day: "numeric" });
		if (b.by === "weekday") return new Date(2024, 0, 7 + k).toLocaleDateString(locale(), { weekday: long ? "long" : "short" });
		return String(k);
	}
	function cardShell(h, per, span, anim, i) {
		const el = document.createElement("section"); el.className = "card"; el.style.setProperty("--span", span); el.dataset.span = span;
		el.style.setProperty("--d", `${anim ? i * 70 : 0}ms`); if (!anim) el.classList.add("still");
		el.innerHTML = `<div class="card-h"><div class="hd"><h3>${esc(h)}</h3>${per ? `<p class="per">${esc(per)}</p>` : ""}</div></div><div class="plot"></div>`;
		return el;
	}
	function card(b, key, span, anim, i, edit) {
		const D = edit ? S.data : S.fd || S.data, res = E.run(b, D), R = res.R;
		const filt = b.filter?.categories && !["income", "net"].includes(b.measure) ? b.filter.categories.map(catName).join(", ") : "";
		const per = [b.period.preset === "all" ? "" : t(PRESET_NAMES[b.period.preset] || "Chosen period"), rangeLabel(R), filt, (b.filter?.merchants || []).join(", ")].filter(Boolean).join(" · ");
		const el = cardShell(title(b.title) || t("View"), per, span, anim, i);
		if (b.kind === "kpi") el.classList.add("kpi");
		if (edit) {
			const kinds = b.kind === "kpi" || b.by === "transaction" ? [] : E.TIME.includes(b.by) ? ["line", "bar", "table"] : ["bar", "donut", "table"];
			el.querySelector(".card-h").insertAdjacentHTML("beforeend", `<div class="ctl">${kinds.length ? `<div class="dd"><button type="button" data-a="kind" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Chart type"))}" title="${esc(t("Chart type"))}">${ic(KIND_ICONS[b.kind])}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>` : ""}<div class="dd"><button type="button" data-a="period" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Period"))}" title="${esc(t("Period"))}">${ic("calendar")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div><button type="button" data-a="del" aria-label="${esc(t("Remove this block"))}" title="${esc(t("Remove this block"))}">${ic("x")}</button></div>`);
			const change = (fn) => { snap(); const v = S.A.views[edit.view], s = JSON.parse(JSON.stringify(v.spec)); fn(s); const c = E.clean(s, D); if (!c) { S.past.pop(); return; } c.title = s.title; v.spec = c; persist(); views(false); toast(t("Block changed."), t("Undo"), undo); };
			el.querySelector('[data-a="kind"]')?.addEventListener("click", (e) => { e.stopPropagation(); const btn = e.currentTarget; menu(btn, btn.nextElementSibling, kinds.map((k) => ({ k, label: t(KIND_NAMES[k]), icon: KIND_ICONS[k], on: k === b.kind })), (x) => x.k !== b.kind && change((s) => (s.blocks[edit.block].kind = x.k))); });
			el.querySelector('[data-a="period"]').addEventListener("click", (e) => { e.stopPropagation(); const btn = e.currentTarget; menu(btn, btn.nextElementSibling, E.PRESETS.map((p) => ({ p, label: t(PRESET_NAMES[p]), on: p === b.period.preset })), (x) => x.p !== b.period.preset && change((s) => { s.blocks[edit.block].period = { preset: x.p }; })); });
			el.querySelector('[data-a="del"]').addEventListener("click", () => { snap(); const v = S.A.views[edit.view]; if (v.spec.blocks.length === 1) S.A.views.splice(edit.view, 1); else v.spec.blocks.splice(edit.block, 1); persist(); views(false); toast(t("Block removed."), t("Undo"), undo); });
		}
		requestAnimationFrame(() => draw(el, b, key, res));
		addSources(el, key, res, { label: (row) => keyLabel(b, row.key, true) });
		return el;
	}
	function draw(el, b, key, res) {
		const plot = el.querySelector(".plot");
		const colorOf = (r) => (b.by === "category" ? (r.key === "_other" ? col("rest") : col(r.key)) : null);
		const single = b.filter?.categories?.length === 1 && !["income", "net"].includes(b.measure) ? col(b.filter.categories[0]) : b.measure === "income" ? col("income") : col("one");
		const o = { fmt: (v) => val(b, v), short: (v) => valShort(b, v), tick: (k) => keyLabel(b, k, false), label: (r) => (r.key === "_other" ? t("Others ({n})", { n: r.n }) : keyLabel(b, r.key, true)),
			tipLabel: (r) => keyLabel(b, r.key, true), tipExtra: (r) => [b.measure === "count" ? "" : t(r.tx.length === 1 ? "1 line" : "{n} lines", { n: num(r.tx.length) }), r.partial ? t("month not over in the file") : ""].filter(Boolean).join(" · "),
			pct, totalLabel: t("Total"), color: single, aria: title(b.title), pick: (r) => pickRow(el, key, res, r, { label: (row) => keyLabel(b, row.key, true) }) };
		if (b.kind === "kpi") { plot.innerHTML = `<p class="big ${b.measure === "net" && res.total > 0 ? "" : ""}">${esc(val(b, res.total))}</p>`; return; }
		if (!res.list.length) { plot.innerHTML = `<p class="per">${esc(t("Nothing in this period."))}</p>`; return; }
		const rows = res.rows.map((r) => ({ ...r, color: colorOf(r) }));
		if (b.kind === "table") {
			if (b.by === "transaction") { plot.innerHTML = `<table class="tb"><thead><tr><th>${esc(t("Date"))}</th><th>${esc(t("Merchant"))}</th><th class="n">${esc(t("Amount"))}</th></tr></thead><tbody>${rows.map((r) => { const x = r.tx[0]; return `<tr><td class="s">${esc(dShort(x.d))}</td><td><span class="c"><i class="dot" style="background:${col(x.c)}"></i>${esc(x.m)}</span><br><span class="s">${esc(catName(x.c))}</span></td><td class="n">${esc(money(Math.abs(x.a)))}</td></tr>`; }).join("")}</tbody></table>`; return; }
			const tot = rows.reduce((a, r) => a + r.value, 0) || 1, share = !["net", "avg", "avg_month"].includes(b.measure) && !E.TIME.includes(b.by);
			plot.innerHTML = `<table class="tb"><thead><tr><th>${esc(t(E.TIME.includes(b.by) ? "When" : b.by === "category" ? "Category" : "Merchant"))}</th>${share ? `<th class="n">${esc(t("Share"))}</th>` : ""}<th class="n">${esc(t(b.measure === "avg_month" ? "Per month" : b.measure === "count" ? "Purchases" : "Amount"))}</th></tr></thead><tbody>${rows.map((r, n) => `<tr data-r="${n}" tabindex="0"><td><span class="c">${r.color ? `<i class="dot" style="background:${r.color}"></i>` : ""}${esc(o.label(r))}</span></td>${share ? `<td class="n s">${esc(pct(r.value / tot))}</td>` : ""}<td class="n">${esc(o.fmt(r.value))}</td></tr>`).join("")}</tbody></table>`;
			$$("tr[data-r]", plot).forEach((tr) => tr.addEventListener("click", () => o.pick(+tr.dataset.r)));
			return;
		}
		if (b.kind === "line") return CH.line(plot, rows, o);
		if (b.kind === "donut") return CH.donut(plot, rows, o);
		if (E.TIME.includes(b.by)) return CH.columns(plot, rows, o);
		return CH.hbars(plot, rows, o);
	}

	/* the file lines behind any block open in a side panel (nothing pushes the page down), with their own filters */
	function addSources(el, key, res, o) {
		const n = res.list.length; if (!n) return;
		el.insertAdjacentHTML("beforeend", `<div class="src"><button type="button" aria-haspopup="dialog">${ic("receipt-text")}<span>${esc(t(n === 1 ? "See the line" : "See the {n} lines", { n: num(n) }))}</span>${ic("chevron-right", "chev flip-ic")}</button></div>`);
		el.querySelector(".src > button").addEventListener("click", () => lines(el.querySelector("h3").textContent, res.list, el.querySelector(".per")?.textContent || ""));
	}
	function pickRow(el, key, res, r, o) { const row = res.rows[r]; if (row) lines(el.querySelector("h3").textContent, row.tx, o.label(row)); }
	const txLi = (x) => `<li><span class="d">${esc(dShort(x.d))}</span><span class="m"><b><i class="dot" style="background:${col(x.c)}"></i><span>${esc(x.m)}</span></b><small title="${esc(x.label)}">${esc(x.label)} · ${esc(srcLabel(x))}</small></span><span class="a ${x.a > 0 ? "in" : ""}">${esc((x.a > 0 ? "+" : "") + money(x.a))}</span></li>`;
	function lines(h, list, sub) {
		const L = { q: "", c: "all", sort: "new", n: 30 };
		document.querySelector("#linesOv")?.remove();
		document.body.insertAdjacentHTML("beforeend", `<div class="ov sheet" id="linesOv"><div class="ov-bg" data-close></div><div class="sh" role="dialog" aria-modal="true" aria-labelledby="shT">
			<div class="sh-h"><div><h2 id="shT">${esc(h)}</h2>${sub ? `<p class="per">${esc(sub)}</p>` : ""}</div><button type="button" class="icon-btn" data-close aria-label="${esc(t("Close"))}">${ic("x")}</button></div>
			<div class="sh-f"><div class="search">${ic("search")}<label class="sr" for="shQ">${esc(t("Search"))}</label><input id="shQ" placeholder="${esc(t("Search a merchant or a label"))}"></div>
				<div class="dd"><button type="button" class="fbtn" id="shC" aria-haspopup="listbox" aria-expanded="false">${ic("chart-pie")}<span>${esc(t("All categories"))}</span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>
				<div class="dd"><button type="button" class="fbtn" id="shS" aria-haspopup="listbox" aria-expanded="false">${ic("calendar")}<span>${esc(t("Newest first"))}</span>${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div></div>
			<div class="sh-sum" id="shSum"></div><div class="sh-b" id="shB"></div></div></div>`);
		const ov = $("#linesOv"), last = document.activeElement; document.body.style.overflow = "hidden";
		const close = () => { document.body.style.overflow = ""; if (reduced()) ov.remove(); else { ov.classList.remove("on"); ov.classList.add("off"); setTimeout(() => ov.remove(), 400); } last?.focus?.({ preventScroll: true }); };
		const SORTS = { new: "Newest first", old: "Oldest first", big: "Largest first", small: "Smallest first" };
		const draw = () => {
			const q = L.q.trim().toLowerCase();
			let r = list.filter((x) => (L.c === "all" || x.c === L.c) && (!q || x.m.toLowerCase().includes(q) || x.label.toLowerCase().includes(q)));
			r = r.slice().sort((a, b) => (L.sort === "new" ? (a.d < b.d ? 1 : -1) : L.sort === "old" ? (a.d < b.d ? -1 : 1) : L.sort === "big" ? Math.abs(b.a) - Math.abs(a.a) : Math.abs(a.a) - Math.abs(b.a)));
			const tot = r.reduce((a, x) => a + x.a, 0);
			$("#shSum").innerHTML = `<span>${esc(t("{n} lines", { n: num(r.length) }))}</span><b class="${tot > 0 ? "in" : ""}">${esc((tot > 0 ? "+" : "") + money(tot))}</b>`;
			$("#shB").innerHTML = r.length ? `<ul class="tx">${r.slice(0, L.n).map(txLi).join("")}</ul>${r.length > L.n ? `<p class="tx-more"><button type="button" class="btn btn-sm" id="shMore">${ic("plus")}${esc(t("Show all"))} (${num(r.length)})</button></p>` : ""}` : `<p class="empty">${esc(t("No line matches."))}</p>`;
			$("#shMore")?.addEventListener("click", () => { L.n = Infinity; draw(); });
		};
		draw();
		$$("[data-close]", ov).forEach((x) => x.addEventListener("click", close));
		$("#shQ").addEventListener("input", (e) => { L.q = e.target.value; L.n = 30; draw(); });
		const cats = CATS.concat("income", "other").filter((c) => list.some((x) => x.c === c));
		$("#shC").addEventListener("click", (e) => { e.stopPropagation(); menu($("#shC"), $("#shC").nextElementSibling, [{ v: "all", label: t("All categories"), on: L.c === "all" }, ...cats.map((c) => ({ v: c, label: catName(c), dot: col(c), on: L.c === c }))], (x) => { L.c = x.v; L.n = 30; $("#shC span").textContent = x.v === "all" ? t("All categories") : catName(x.v); draw(); }); });
		$("#shS").addEventListener("click", (e) => { e.stopPropagation(); menu($("#shS"), $("#shS").nextElementSibling, Object.entries(SORTS).map(([v, l]) => ({ v, label: t(l), on: L.sort === v })), (x) => { L.sort = x.v; $("#shS span").textContent = t(SORTS[x.v]); draw(); }); });
		ov.addEventListener("keydown", (e) => { if (e.key === "Escape" && !open) { e.preventDefault(); close(); } });
		requestAnimationFrame(() => ov.classList.add("on")); setTimeout(() => $("#shQ").focus({ preventScroll: true }), reduced() ? 0 : 150);
	}

	/* ---------------- all lines, with the category you can change ---------------- */
	function allTx() {
		const box = $("#alltx"), q = S.q.trim().toLowerCase(), D = S.fd || S.data;
		const list = D.tx.filter((x) => (S.txFilter === "all" || x.c === S.txFilter) && (!q || x.m.toLowerCase().includes(q) || x.label.toLowerCase().includes(q)));
		if (!list.length) { box.innerHTML = `<p class="empty">${esc(t("No line matches."))}</p>`; return; }
		box.innerHTML = `<table><tbody>${list.slice(0, S.txN).map((x) => `<tr><td class="d">${esc(dShort(x.d))}</td><td class="l"><b>${esc(x.m)}</b><small>${esc(x.label)} · ${esc(srcLabel(x))}</small></td><td class="k">${x.a < 0 ? `<div class="dd"><button type="button" class="catb ${x.c === "other" ? "todo" : ""}" data-tx="${x.id}" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Category of {m}: {c}. Change", { m: x.m, c: catName(x.c) }))}"><i class="dot" style="background:${col(x.c)}"></i>${esc(catName(x.c))}${x.how === "ai" ? ` <small>${esc(t("AI"))}</small>` : ""}${ic("chevron-down", "chev")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>` : `<span class="catb" style="cursor:default"><i class="dot" style="background:${col("income")}"></i>${esc(catName("income"))}</span>`}</td><td class="a ${x.a > 0 ? "in" : ""}">${esc((x.a > 0 ? "+" : "") + money(x.a))}</td></tr>`).join("")}</tbody></table>${list.length > S.txN ? `<p class="tx-more" style="padding-bottom:12px"><button type="button" class="btn btn-sm" id="txMore">${ic("plus")}${esc(t("Show {n} more", { n: num(Math.min(40, list.length - S.txN)) }))}</button></p>` : ""}`;
		$("#txMore")?.addEventListener("click", () => { S.txN += 40; allTx(); });
		$$("[data-tx]", box).forEach((b) => b.addEventListener("click", (e) => {
			e.stopPropagation(); const x = D.tx.find((y) => y.id === b.dataset.tx), same = S.data.tx.filter((y) => y.k === x.k && y.a < 0);
			menu(b, b.nextElementSibling, CATS.map((c) => ({ c, label: catName(c), dot: col(c), on: c === x.c })), (o) => {
				if (o.c === x.c && same.every((y) => y.c === o.c)) return;
				snap(); same.forEach((y) => { y.c = o.c; y.how = "you"; }); persist(); report(false);
				toast(same.length > 1 ? t("{m}: {n} lines moved to {c}.", { m: x.m, n: same.length, c: catName(o.c) }) : t("{m} moved to {c}.", { m: x.m, c: catName(o.c) }), t("Undo"), undo);
			});
		}));
	}

	/* ---------------- my analyses ---------------- */
	function saved() {
		const list = savedList();
		const q = (S.sq || "").trim().toLowerCase(), shown = list.filter((x) => !q || x.name.toLowerCase().includes(q));
		$("#main").innerHTML = `<header><h1>${esc(t("My analyses"))}</h1><p>${esc(t("Kept in this browser, in your account."))}</p></header>
			${list.length > 3 ? `<div class="tools-row"><div class="search">${ic("search")}<label class="sr" for="sQ">${esc(t("Search"))}</label><input id="sQ" placeholder="${esc(t("Search an analysis"))}" value="${esc(S.sq || "")}"></div></div>` : ""}
			<ul class="saved">${list.length && !shown.length ? `<li class="none">${esc(t("No analysis matches."))}</li>` : ""}${list.length ? shown.map((x) => `<li><div><b>${esc(x.name)}</b><small>${esc(new Date(x.at).toLocaleString(locale(), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))} · ${esc(t("{n} lines", { n: num(x.tx.length) }))}</small></div><button type="button" class="btn btn-sm" data-go="#/a/${x.id}">${ic("eye")}${esc(t("Open"))}</button><button type="button" class="btn btn-sm btn-g" data-del="${x.id}" aria-label="${esc(t("Delete"))} ${esc(x.name)}">${ic("trash-2")}${esc(t("Delete"))}</button></li>`).join("") : `<li class="none">${esc(t("No analysis yet. Drop a statement or try a sample to start."))} <button type="button" class="btn btn-p btn-sm" data-go="#/new">${ic("plus")}${esc(t("New analysis"))}</button></li>`}</ul>${footer()}`;
		bindCommon($("#main"));
		$("#sQ")?.addEventListener("input", (e) => { S.sq = e.target.value; const pos = e.target.selectionStart; saved(); const i = $("#sQ"); i.focus(); i.setSelectionRange(pos, pos); });
		$$("[data-del]").forEach((b) => b.addEventListener("click", () => {
			const all = savedList(), i = all.findIndex((x) => x.id === b.dataset.del), gone = all.splice(i, 1)[0];
			store.set(savedKey(), all); if (S.A?.id === gone.id) S.A = null; shell("saved");
			toast(t("Analysis deleted."), t("Undo"), () => { const l = savedList(); l.splice(i, 0, gone); store.set(savedKey(), l); shell("saved"); });
		}));
	}

	/* ---------------- menus: custom dropdowns, animated 500 / 400 ms, keyboard, outside click ---------------- */
	function slide(el, open) {
		if (!el) return;
		if (el._a) { el._a.cancel(); el._a = null; }
		if (reduced()) { el.hidden = !open; return; }
		const from = el.hidden ? 0 : el.getBoundingClientRect().height, op = el.hidden ? 0 : +getComputedStyle(el).opacity;
		el.hidden = false; el.style.height = "auto"; const to = open ? el.getBoundingClientRect().height : 0; el.style.overflow = "hidden";
		const a = (el._a = el.animate([{ height: from + "px", opacity: op }, { height: to + "px", opacity: open ? 1 : 0 }], { duration: open ? 500 : 400, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }));
		a.onfinish = () => { if (el._a !== a) return; el._a = null; el.style.height = el.style.overflow = ""; if (!open) el.hidden = true; };
	}
	let open = null;
	function menu(btn, list, items, onPick) {
		if (open && open.list === list) return closeMenu(true);
		closeMenu();
		list.innerHTML = items.map((x, i) => `<li role="option" tabindex="-1" data-i="${i}" aria-selected="${x.on ? "true" : "false"}" ${x.check ? 'class="chk"' : ""}>${x.check ? `<span class="box">${x.on ? ic("check") : ""}</span>` : ""}${x.icon ? ic(x.icon) : ""}${x.dot ? `<i class="dot" style="background:${x.dot}"></i>` : ""}<span>${esc(x.label)}</span></li>`).join("");
		if (items.some((x) => x.check)) list.setAttribute("aria-multiselectable", "true");
		btn.setAttribute("aria-expanded", "true"); open = { btn, list, onPick, items }; slide(list, true);
		(list.querySelector('[aria-selected="true"]') || list.firstElementChild)?.focus({ preventScroll: true });
	}
	function closeMenu(focus) { if (!open) return; const { btn, list } = open; open = null; btn.setAttribute("aria-expanded", "false"); slide(list, false); if (focus) btn.focus(); }
	document.addEventListener("click", (e) => {
		if (!open) return;
		const li = e.target.closest("li[role=option]");
		if (li && open.list.contains(li)) { const m = open; closeMenu(true); m.onPick(m.items[+li.dataset.i]); return; }
		if (!open.btn.contains(e.target) && !open.list.contains(e.target)) closeMenu();
	});
	document.addEventListener("keydown", (e) => {
		if (open) {
			const opts = $$("li", open.list), i = opts.indexOf(document.activeElement);
			if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
			else if (e.key === "ArrowDown") { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
			else if (e.key === "ArrowUp") { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
			else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); opts[i].click(); }
			else if (e.key === "Tab") closeMenu();
			return;
		}
		if (e.key === "Escape" && $("#side")?.classList.contains("open")) drawer(false);
		const typing = /TEXTAREA|INPUT/.test(document.activeElement?.tagName);
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing && S.A && S.past.length) { e.preventDefault(); undo(); }
	});

	let tt;
	function toast(msg, action, fn) {
		const el = $("#toast"), b = $("#toastBtn");
		$("#toastTx").textContent = msg; b.hidden = !action; b.textContent = action || "";
		b.onclick = () => { el.classList.remove("on"); fn?.(); };
		el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 6000);
	}
	let rz, lw = innerWidth;
	addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (innerWidth !== lw) { lw = innerWidth; if (innerWidth > 960) drawer(false); if (S.A && /^#\/a\//.test(location.hash)) report(false); } else alignSide(); }, 150); });

	route();
})();
