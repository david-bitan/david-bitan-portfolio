/* Otium — an AI travel agent that plans in the open and asks before it acts.
 * The model (POST /api/otium) only reads the request. Prices, the plan, the
 * budget check and every action are computed here, in code. Nothing is ever
 * booked, charged or sent anywhere. */
(() => {
	"use strict";
	const D = window.OTIUM_DATA;
	const I = window.OTIUM_I18N, t = I.t, P = I.plural, on = I.origin;
	const EN_CITIES = JSON.parse(JSON.stringify(D.cities));
	function applyCityLang() {
		for (const [k, en] of Object.entries(EN_CITIES)) {
			const c = D.cities[k]; const L = I.CITY[I.lang]?.[k];
			c.name = L ? L[0] : en.name; c.country = L ? L[1] : en.country; c.tagline = L ? L[2] : en.tagline; c.days = L ? L[3] : en.days;
			c.stays.forEach((s, i) => (s.perk = (L && L[4][s.id]) || en.stays[i].perk));
		}
	}
	const $ = (s, r = document) => r.querySelector(s);
	/* Prices live in euros internally and are shown in the departure city's currency (demo rates, rounded). */
	const CUR_BY_ORIGIN = { London: ["GBP", 0.86, 1], "Tel Aviv": ["ILS", 3.9, 4], Geneva: ["CHF", 0.94, 1] };
	const cur = () => CUR_BY_ORIGIN[S.origin] || ["EUR", 1, 1];
	const money = (local) => new Intl.NumberFormat(I.locale, { style: "currency", currency: cur()[0], currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(local));
	const eur = (n) => money(n * cur()[1]);
	const fromLocal = (x) => x / cur()[1];
	const roundLocal = (e, step = 50, up = false) => fromLocal((up ? Math.ceil : Math.round)((e * cur()[1]) / step) * step);
	const CAP_BASE = [300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];
	const capList = () => CAP_BASE.map((v) => fromLocal(v * cur()[2]));
	const snapCap = (e) => capList().reduce((a, b) => (Math.abs(b - e) < Math.abs(a - e) ? b : a));
	const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	// The model lives on the published site. Opened anywhere else (a preview file), Otium calls the live endpoint.
	const API = /(^|\.)david-bitan-portfolio\.pages\.dev$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "/api/otium" : "https://david-bitan-portfolio.pages.dev/api/otium";
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const ORIGIN_FACTOR = { Paris: 1, London: 1.08, "Tel Aviv": 1.45, Berlin: 0.95, Madrid: 0.9, Brussels: 0.98, Dublin: 1.12, Geneva: 1.1, Lyon: 0.96, Milan: 0.92, Munich: 1.02, Vienna: 1.04 };
	const TICKETS_PP_DAY = 30;
	const SWATCH = { telaviv: ["#A9CFE0", "#3E7FA0"], jerusalem: ["#E3CFA6", "#9C7A45"], lisbon: ["#E7B98A", "#B5653E"], rome: ["#E2B27C", "#9C5A37"], barcelona: ["#9CC3D5", "#3F7C93"], amsterdam: ["#B9C9B2", "#5E7A63"], athens: ["#D9D3C4", "#8B9BA8"], copenhagen: ["#A9C0CF", "#4F6E86"] , porto: ["#D9B48F", "#8E5A3C"], seville: ["#E9C08A", "#B3653A"], valencia: ["#A9CFD9", "#3C7F96"], granada: ["#E2C29A", "#9E6B44"], palma: ["#9DD0D8", "#2F7C8C"], florence: ["#E3B98D", "#A35E3A"], venice: ["#A9C6D3", "#4B7489"], naples: ["#E7B583", "#A84F35"], palermo: ["#EAC28F", "#B0623A"], nice: ["#9CCBDD", "#2E6F8E"], valletta: ["#E8CF9C", "#A97C45"], santorini: ["#B5D3E6", "#3D6E9A"], prague: ["#C9B7A2", "#6E5A4B"], budapest: ["#D8C29C", "#8C6B43"], krakow: ["#CDB9A0", "#7A5E46"], dubrovnik: ["#A8CFE0", "#3A7493"], split: ["#B3D5DC", "#3F7F8A"], istanbul: ["#E0B98E", "#8E4F3A"], marrakech: ["#E5A77C", "#A24E2E"], reykjavik: ["#B9CBD6", "#4F6B80"], edinburgh: ["#BFB8B0", "#5D5650"], stockholm: ["#B6C6D4", "#4D657D"], tallinn: ["#C3BBAE", "#6B6255"], bruges: ["#C8B9A2", "#77654D"] };
	const ic = window.ic;
	document.querySelectorAll("i[data-i]").forEach((e) => (e.outerHTML = ic(e.dataset.i)));
	const ICON = {
		check: ic("check"), spin: ic("loader-circle"), hand: ic("hand"), x: ic("x"), dot: ic("circle-dot"), lock: ic("lock"), info: ic("info"),
		edit: ic("pencil"), cal: ic("calendar"), ticket: ic("ticket"), receipt: ic("receipt"), phone: ic("phone"), chat: ic("message-circle"), mail: ic("mail"), pin: ic("pin"),
		star: ic("star", "star"), plane: ic("plane"), arrow: ic("arrow-right"), down: ic("chevron-down"), cancel: ic("undo-2"),
	};

	/* ---------------- state ---------------- */
	const S = {
		origin: "Paris", text: "", scenario: "normal", run: 0, paused: false, resume: null,
		settings: { cap: 1000, refundable: true, activities: true },
		intent: null, plan: null, progress: {}, held: {}, log: [], status: "idle", aiUsed: false,
	};
	let RUN = 0; // every agent run gets a unique id, so parked trips never collide

	/* ---------------- my trips ----------------
	 * Every plan is a trip. Opening another trip "parks" the current one: its state
	 * and its live step cards are set aside untouched, and its agent waits until the
	 * trip is opened again. Nothing is ever replaced or lost. */
	const TRIP_KEYS = ["text", "scenario", "run", "paused", "resume", "intent", "plan", "progress", "held", "log", "status", "aiUsed", "case", "origin", "_prev", "curStep", "when"];
	const TRIPS = []; let activeTrip = null, tripSeq = 0;
	const tripData = (tr) => (tr === activeTrip ? S : tr.s);
	function withTrip(d, fn) { // pricing reads S.origin / S.plan: borrow them briefly for a parked trip
		const keep = [S.origin, S.plan]; S.origin = d.origin; S.plan = d.plan;
		try { return fn(); } finally { [S.origin, S.plan] = keep; }
	}
	function tripState(d) {
		if (d.status === "waiting") return ["wait", "Waiting for your OK", "hand"];
		if (d.progress?.done && (d.held?.flights || d.held?.stay)) return ["ok", "Booked", "check"];
		return ["draft", "Draft", "pencil"];
	}
	function newTripRecord() {
		if (activeTrip) {
			const d = S.plan && D.cities[S.plan.city];
			const was = activeTrip; parkTrip();
			toast(d ? t("Your {city} trip is saved in My trips.", { city: d.name }) : t("Your last trip is saved in My trips."), t("Open"), () => openTrip(was.id));
		}
		activeTrip = { id: ++tripSeq, s: null, at: Date.now() };
		TRIPS.unshift(activeTrip);
	}
	function parkTrip() {
		const tr = activeTrip; if (!tr) return;
		tr.s = {}; for (const k of TRIP_KEYS) tr.s[k] = S[k];
		tr.statusTxt = $("#agentStatus").textContent;
		tr.steps = document.createDocumentFragment(); tr.steps.append(...$("#steps").childNodes);
		tr.notice = document.createDocumentFragment(); tr.notice.append(...$("#notice").childNodes);
		tr.edit = editResolve; editResolve = null; tr.alts = [...openAlts]; openAlts.clear();
		activeTrip = null;
	}
	function openTrip(id) {
		const tr = TRIPS.find((x) => x.id === id); if (!tr) return;
		if (tr !== activeTrip) {
			parkTrip();
			for (const k of TRIP_KEYS) S[k] = tr.s[k];
			$("#steps").replaceChildren(tr.steps); $("#notice").replaceChildren(tr.notice);
			editResolve = tr.edit; tr.alts.forEach((a) => openAlts.add(a));
			activeTrip = tr; tr.s = null;
			$("#originVal").textContent = on(S.origin);
			$("#pauseBtn").textContent = t(S.paused ? "Resume" : "Pause");
			$("#understood").hidden = !S.plan; if (S.plan) renderUnderstood();
			renderTrip(); renderLog(); renderCase();
			setStatus(S.status, tr.statusTxt);
			const w = tr.wake; tr.wake = null; w?.();
		}
		show("trip");
	}
	function dropTrip(tr) {
		const i = TRIPS.indexOf(tr); if (i >= 0) TRIPS.splice(i, 1);
		const w = tr.wake; tr.wake = null; w?.(); // a parked agent wakes up, finds no trip and stops
		if (tr === activeTrip) activeTrip = null;
		renderTripsNav();
	}
	function renderTripsNav() {
		const b = $("#navTrip"); if (!b) return;
		const n = TRIPS.length; b.hidden = !n; b.disabled = !n;
		const wait = TRIPS.filter((tr) => tripState(tripData(tr))[0] === "wait").length;
		const lab = t("My trips ({n})", { n });
		b.innerHTML = `${esc(lab)}${wait ? '<span class="tdot" aria-hidden="true"></span>' : ""}`;
		b.setAttribute("aria-label", wait ? `${lab} · ${t("{n} waiting for your OK", { n: wait })}` : lab);
		renderMenu();
		const m = $("#navTripsM");
		if (m) { m.hidden = !n; m.setAttribute("aria-label", b.getAttribute("aria-label")); m.querySelector(".tdot")?.remove(); if (wait) m.insertAdjacentHTML("beforeend", '<span class="tdot" aria-hidden="true"></span>'); }
		if (!$("#trips").hidden) renderTrips();
	}
	function renderTrips() {
		const n = TRIPS.length;
		$("#tripsCount").textContent = n ? t("Saved automatically. Open any trip to pick up where you left off.") : "";
		const html = n ? TRIPS.map((tr) => {
			const d = tripData(tr); const p = d.plan; const c = p && D.cities[p.city];
			const [cls, lab, icn] = tripState(d);
			const k = p && p.stay ? withTrip(d, () => costs(p)) : null;
			const meta = p ? [`${fmtDay(tripDates(p.nights, p.out).out)} – ${fmtDay(tripDates(p.nights, p.out).back)}`, P(p.nights, "1 night", "{n} nights"), P(p.travelers, "1 traveller", "{n} travellers"), t("from {o}", { o: esc(on(d.origin)) })] : [t("from {o}", { o: esc(on(d.origin)) })];
			const title = c ? c.name : t("New trip");
			return `<article class="tcard" data-trip="${tr.id}">
				<div class="tphoto">${c ? pic(c.photo, p.city, c.name) : `<div class="ph" style="--c1:#E9E1D5;--c2:#C9BFB2"></div><span class="tph-i">${ic("compass")}</span>`}</div>
				<div class="tbody">
					<div class="trow"><h3>${esc(title)}</h3><span class="tstate ${cls}">${ic(icn)}${t(lab)}</span></div>
					<p class="tmeta">${meta.map((x) => `<span>${x}</span>`).join("")}</p>
					<p class="tq">“${esc(d.text)}”</p>
					<div class="tfoot">${k ? `<span class="tprice"><b class="num">${eur(k.total)}</b> ${t("total")}</span>` : `<span class="tprice">${t("Price once the plan is ready")}</span>`}${tr === activeTrip ? `<span class="tag g">${t("Open now")}</span>` : ""}
						<span class="tacts"><button class="btn btn-ghost btn-sm" type="button" data-topen aria-label="${esc(t("Open {x}", { x: title }))}">${t("Open")}</button><button class="btn btn-text btn-sm tdel" type="button" data-tdel aria-label="${esc(t("Delete trip"))}">${ic("trash-2")}</button></span></div>
				</div>
			</article>`;
		}).join("") : `<div class="tempty">${ic("luggage")}<h3>${t("No trips yet")}</h3><p>${t("Tell Otium where you want to go. Every plan is saved here, so you never lose one.")}</p><button class="btn btn-primary" type="button" data-go="home">${t("Plan a trip")}</button></div>`;
		if (html !== $("#tripsList").__html) { $("#tripsList").innerHTML = html; $("#tripsList").__html = html; } // live updates without flicker
	}
	function askDropTrip(tr) {
		const d = tripData(tr); const H = d.held || {};
		const heldAmt = (H.flights?.amount || 0) + (H.stay?.amount || 0);
		const name = D.cities[d.plan?.city]?.name || t("New trip");
		modal(`<h3 id="modalTitle">${t("Delete this trip?")}</h3><p>${heldAmt ? t("Otium will release everything it holds first. ") + t(H.stay && !H.stay.refundable ? "The stay is non-refundable, so that part can’t be recovered." : "Nothing is lost.") : t("Nothing has been booked yet, so nothing is lost.")}</p>
			<div class="ba"><div><b>${t("Now")}</b>${esc(name)} · ${heldAmt ? t("{x} held", { x: eur(heldAmt) }) : t("draft")}</div><span class="arrow">${ICON.arrow}</span><div class="after"><b>${t("After")}</b>${t("Removed from My trips")} · ${heldAmt ? t("{x} released", { x: eur(heldAmt) }) : t("nothing to release")}</div></div>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Keep it")}</button><button class="btn btn-danger btn-sm" data-m="ok">${t("Delete trip")}</button></div>`, (r) => {
			if (r !== "ok") return;
			if (tr === activeTrip) { clearActive(); }
			dropTrip(tr); renderTrips();
			toast(t("Trip deleted. Nothing is held."));
		});
	}
	function clearActive() {
		S.run = ++RUN; S.paused = false; S.held = {}; S.plan = null; S.intent = null; S.text = ""; S.progress = {}; S.status = "idle"; S.log = []; S.case = null;
		$("#steps").innerHTML = ""; $("#notice").innerHTML = ""; $("#understood").hidden = true; $("#ask").value = "";
		renderLog();
	}

	/* ---------------- media ---------------- */
	function pic(src, key, alt = "") {
		const [c1, c2] = SWATCH[key] || ["#C9B79C", "#8E7A62"];
		return `<div class="ph" style="--c1:${c1};--c2:${c2}"></div><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.remove()">`;
	}

	/* ---------------- home ---------------- */
	const EXAMPLES = [
		"A long weekend in Lisbon for two, food and viewpoints, under €900",
		"Somewhere warm next month",
		"Rome for 3 nights with my partner, museums, €1,200 max",
		"Solo weekend in Copenhagen, design and bakeries",
	];
	const EXAMPLE_SHORT = ["Lisbon for two", "Somewhere sunny", "Rome, 3 nights, museums", "Solo in Copenhagen"];
	function renderExamples() { $("#examples").innerHTML = EXAMPLES.map((x, i) => `<button class="chip" type="button" data-ex="${i}" title="${esc(t(x))}">${esc(t(EXAMPLE_SHORT[i]))}</button>`).join("") + `<button type="button" class="chip chip-budget" id="budgetCta">${ic("compass")}<span>${t("Ideas for my budget")}</span></button>`; }
	function fitAsk() {
		const a = $("#ask"); if (!a) return; const MAX = 132;
		if (!a.value || !a.offsetParent) { a.style.height = ""; a.style.overflowY = ""; $("#composer").classList.remove("multi"); if (!a.value || !a.offsetParent) return; } // empty or hidden: back to the CSS size
		a.style.height = "auto"; const h = Math.min(a.scrollHeight, MAX);
		a.style.height = `${h}px`; a.style.overflowY = a.scrollHeight > MAX ? "auto" : "hidden";
		$("#composer").classList.toggle("multi", h > 34);
	}
	addEventListener("resize", () => fitAsk());
	function initHome() {
		initOrigin();
		renderExamples();
		$("#examples").onclick = (e) => {
			if (e.target.closest("#budgetCta")) return goBudget();
			const b = e.target.closest("[data-ex]"); if (!b) return;
			$("#ask").value = t(EXAMPLES[+b.dataset.ex]); fitAsk(); $("#ask").focus();
		};
		renderCats(); renderListings();
		const cardClick = (e) => {
			const h = e.target.closest(".heart");
			if (h) { const on = h.getAttribute("aria-pressed") !== "true"; h.setAttribute("aria-pressed", on); saved[on ? "add" : "delete"](h.dataset.city); keepSaved(); toast(on ? t("{city} saved to your wishlist", { city: D.cities[h.dataset.city].name }) : t("Removed from your wishlist")); return; }
			const card = e.target.closest(".card-l"); if (!card) return;
			const cat = CATS.find((c) => c[0] === activeCat);
			const q = t("A long weekend in {city} for two", { city: D.cities[card.dataset.city].name }) + (cat && cat[0] !== "all" ? `, ${t(cat[3])}` : "");
			$("#ask").value = q; start(q, false, "normal", null);
		};
		$("#mosaic").onclick = cardClick; $("#exploreGrid").onclick = cardClick;
		const catClick = (e) => { const b = e.target.closest("[data-cat]"); if (!b) return; activeCat = b.dataset.cat; renderCats(); renderListings(); };
		$("#cats").onclick = catClick; $("#cats2").onclick = catClick;
		$("#sortBar").onclick = (e) => { const b = e.target.closest("[data-sort]"); if (!b) return; sortBy = b.dataset.sort; renderExplore(); };
		// No form submit: embedded previews often block it. A plain click works everywhere.
		const go = () => { const v = $("#ask").value.trim() || $("#ask").placeholder; $("#ask").value = v; start(v, false, "normal", null); };
		$("#composer").onsubmit = (e) => { e.preventDefault(); go(); };
		$("#planBtn").onclick = go;
		$("#ask").addEventListener("input", fitAsk);
		$("#ask").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } };
	}

	function initOrigin() {
		const btn = $("#originBtn"), list = $("#originList");
		let act = 0;
		const paint = () => {
			list.innerHTML = D.origins.map(([n, c], i) => `<li role="option" id="org-${i}" data-o="${n}" aria-selected="${n === S.origin}" class="${i === act ? "act" : ""}">${on(n)}<small>${c}</small></li>`).join("");
			list.setAttribute("aria-activedescendant", `org-${act}`);
		};
		const open = (on) => {
			list.classList.toggle("on", on); btn.setAttribute("aria-expanded", on);
			if (on) { act = Math.max(0, D.origins.findIndex(([n]) => n === S.origin)); paint(); list.focus(); $(`#org-${act}`)?.scrollIntoView({ block: "nearest" }); }
		};
		const pick = (n) => {
			S.origin = n; $("#originVal").textContent = on(n); open(false); btn.focus();
			S.settings.cap = snapCap(S.settings.cap); if (S.plan && !S.progress?.done) S.plan.cap = snapCap(S.plan.cap);
			renderListings(); renderBudget(Boolean($("#budgetOut")?.innerHTML)); if (!$("#rules")?.closest("[hidden]")) try { renderRules?.(); } catch {}
		};
		btn.onclick = (e) => { e.stopPropagation(); open(!list.classList.contains("on")); };
		list.onclick = (e) => { const li = e.target.closest("li"); if (li) pick(li.dataset.o); };
		list.onkeydown = (e) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); act = (act + (e.key === "ArrowDown" ? 1 : -1) + D.origins.length) % D.origins.length; paint(); $(`#org-${act}`).scrollIntoView({ block: "nearest" }); }
			else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(D.origins[act][0]); }
			else if (e.key === "Escape" || e.key === "Tab") { open(false); if (e.key === "Escape") btn.focus(); }
		};
		document.addEventListener("click", (e) => { if (!e.target.closest("#fromWrap")) open(false); });
		paint();
	}

	/* categories + listing cards */
	const CATS = [
		["all", "All trips", ic("globe"), ""],
		["food", "Food", ic("utensils"), "food and good restaurants"],
		["culture", "Culture", ic("landmark"), "museums and history"],
		["beach", "Beach", ic("tree-palm"), "beach time"],
		["design", "Design", ic("building-2"), "design and architecture"],
		["night", "Nightlife", ic("moon"), "nightlife"],
	];
	const CITY_CATS = { telaviv: ["beach", "food", "night", "design"], jerusalem: ["culture", "food"], lisbon: ["food", "culture", "night"], rome: ["food", "culture"], barcelona: ["beach", "food", "night", "design"], amsterdam: ["culture", "design", "night"], athens: ["culture", "beach"], copenhagen: ["design", "food"], porto: ["food", "culture"], seville: ["culture", "food", "night"], valencia: ["beach", "food", "design"], granada: ["culture"], palma: ["beach", "food"], florence: ["culture", "food", "design"], venice: ["culture", "design"], naples: ["food", "culture", "beach"], palermo: ["food", "culture", "beach"], nice: ["beach", "food", "culture"], valletta: ["culture", "beach", "food"], santorini: ["beach", "design"], prague: ["culture", "night", "food"], budapest: ["culture", "night"], krakow: ["culture", "food"], dubrovnik: ["beach", "culture"], split: ["beach", "culture", "night"], istanbul: ["food", "culture", "night"], marrakech: ["food", "culture", "design"], reykjavik: ["culture", "design"], edinburgh: ["culture", "night"], stockholm: ["design", "culture"], tallinn: ["culture", "design"], bruges: ["culture", "food"] };
	const POPULAR = { lisbon: "Most planned", barcelona: "Trending" };
	let activeCat = "all"; const saved = new Set((() => { try { return JSON.parse(localStorage.getItem("otium-saved") || "[]"); } catch { return []; } })());
	const keepSaved = () => { try { localStorage.setItem("otium-saved", JSON.stringify([...saved])); } catch {} };
	function renderCats() {
		$("#cats").innerHTML = CATS.map(([k, label, icon]) => `<button type="button" data-cat="${k}" aria-pressed="${k === activeCat}">${icon}${t(label)}</button>`).join("");
	}
	let sortBy = "price";
	function cityKeys() { return Object.keys(D.cities).filter((k) => activeCat === "all" || CITY_CATS[k].includes(activeCat)); }
	function cardHtml(k, n) {
			const c = D.cities[k]; const f = flightOptions(k, S.origin, 1, DEFAULT_PREFS)[0]; const rating = Math.max(...c.stays.map((s) => s.rating));
			return `<div class="card-l" role="button" tabindex="0" data-city="${k}" style="animation-delay:${n * 50}ms" aria-label="${esc(t("Plan a trip to {city}", { city: c.name }))}">
				<div class="photo">${pic(c.photo, k, c.name)}<button type="button" class="pics-btn" data-citypics="${k}" aria-label="${esc(t("See {n} photos of {city}", { n: galN(k), city: c.name }))}">${ic("images")}<span>${galN(k)}</span></button>${POPULAR[k] ? `<span class="pop">${t(POPULAR[k])}</span>` : ""}<button class="heart" type="button" data-city="${k}" aria-pressed="${saved.has(k)}" aria-label="${esc(t("Save {city}", { city: c.name }))}">${ic("heart")}</button></div>
				<div class="row1">${c.name}, ${c.country}<span>${ICON.star}${rating.toFixed(1)}</span></div>
				<div class="sub2">${esc(c.tagline)}</div>
				<div class="sub2">${t("{h} direct from {o}", { h: f.hours, o: esc(on(S.origin)) })}</div>
				<div class="pr"><b class="num">${eur(f.price)}</b> <u>${t("flight per person")}</u></div>
			<span class="plan-cta">${t("Plan this trip")} ${ICON.arrow}</span>
			</div>`;
		
	}
	/* Home picks per style: different cities (and a different number of them) for each filter,
	 * so a click visibly changes the selection. "See all" still lists every match. */
	const FEATURED = { // always a multiple of 4: full rows of four cards
		all: ["lisbon", "santorini", "prague", "marrakech", "barcelona", "reykjavik", "florence", "dubrovnik"],
		food: ["naples", "istanbul", "porto", "palermo"],
		culture: ["jerusalem", "athens", "granada", "krakow", "venice", "edinburgh", "rome", "budapest"],
		beach: ["telaviv", "nice", "dubrovnik", "palma"],
		design: ["copenhagen", "stockholm", "valencia", "amsterdam"],
		night: ["telaviv", "budapest", "amsterdam", "istanbul"],
	};
	function renderListings() {
		const keys = cityKeys();
		const pick = (FEATURED[activeCat] || []).filter((k) => keys.includes(k));
		const shown = pick.length ? pick : keys.slice(0, 8);
		const m = $("#mosaic"); m.dataset.n = shown.length;
		m.innerHTML = shown.map(cardHtml).join("");
		$("#seeAll").innerHTML = `<button type="button" class="btn btn-ghost" data-go="explore">${t("See all {n} destinations", { n: keys.length })} ${ICON.arrow}</button>`;
		renderExplore();
	}
	function renderExplore() {
		if (!$("#exploreGrid")) return;
		$("#cats2").innerHTML = $("#cats").innerHTML;
		const rate = (k) => Math.max(...D.cities[k].stays.map((s) => s.rating));
		const keys = cityKeys().sort((a, b) => sortBy === "price" ? flightOptions(a, S.origin, 1, DEFAULT_PREFS)[0].price - flightOptions(b, S.origin, 1, DEFAULT_PREFS)[0].price : sortBy === "time" ? D.cities[a].flight.hours.localeCompare(D.cities[b].flight.hours) : rate(b) - rate(a));
		$("#sortBar").innerHTML = [["price", "Cheapest flight"], ["time", "Shortest flight"], ["rating", "Best rated"]].map(([v, label]) => `<button type="button" data-sort="${v}" aria-pressed="${sortBy === v}">${t(label)}</button>`).join("");
		$("#exploreCount").textContent = P(keys.length, "1 destination from {o}", "{n} destinations from {o}", { o: on(S.origin) });
		$("#exploreGrid").innerHTML = keys.map(cardHtml).join("");
	}

	document.addEventListener("keydown", (e) => { const c = e.target.closest?.(".card-l"); if (c && (e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); c.click(); } });

	/* ---------------- pricing (code, never the model) ---------------- */
	const CABINS = { economy: ["Economy", 1], premium: ["Premium economy", 1.75], business: ["Business", 3.1] };
	const AIRCRAFT = ["Airbus A320neo", "Boeing 787 Dreamliner", "Airbus A220"];
	const BAG_PP = 40; // checked bag, return, per person
	const DEFAULT_PREFS = { cabin: "economy", stops: "direct", bags: 0, time: "any" };
	function flightOptions(city, origin, travelers, prefs = S.plan?.prefs || DEFAULT_PREFS) {
		const c = D.cities[city]; const f = ORIGIN_FACTOR[origin] || 1; const cab = CABINS[prefs.cabin] || CABINS.economy;
		return [1, 1.18, 0.86].map((m, i) => {
			const pp = Math.round(c.flight.base * f * m * cab[1]) + (prefs.bags ? BAG_PP : 0);
			const hr = +D.departures[i][0].slice(0, 2);
			const fits = (prefs.stops !== "direct" || D.departures[i][1] === "Direct") && (prefs.time === "any" || (prefs.time === "morning" ? hr < 12 : hr >= 17));
			return { i, airline: D.airlines[i], dep: D.departures[i][0], kind: D.departures[i][1], hours: c.flight.hours, aircraft: AIRCRAFT[i], cabin: cab[0], bags: prefs.bags, pp, price: pp * travelers, fits };
		});
	}
	function bestFlight(opts) {
		const ok = opts.filter((o) => o.fits);
		return ((ok.length ? ok : opts).slice().sort((a, b) => a.price - b.price)[0]);
	}
	function costs(p) {
		const c = D.cities[p.city];
		const fl = flightOptions(p.city, S.origin, p.travelers)[p.flight];
		const st = c.stays.find((s) => s.id === p.stay);
		const flights = fl.price, stay = st.nightly * p.nights;
		const tickets = S.settings.activities ? TICKETS_PP_DAY * p.travelers * (p.nights + 1) : 0;
		return { fl, st, flights, stay, tickets, hold: flights + stay, total: flights + stay + tickets };
	}
	function pickStay(p) {
		const c = D.cities[p.city];
		let pool = [...c.stays].sort((a, b) => b.rating - a.rating);
		if (S.settings.refundable && pool.some((s) => s.freeCancel)) pool = pool.filter((s) => s.freeCancel);
		const fits = pool.find((s) => costs({ ...p, stay: s.id }).total <= p.cap);
		return (fits || [...pool].sort((a, b) => a.nightly - b.nightly)[0]).id;
	}
	function tripDates(nights, out = S.plan?.out) {
		let d;
		if (out) d = fromIso(out);
		else { d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 21 + ((5 - d.getDay() + 7) % 7)); } // default: a Friday about three weeks out
		const back = new Date(d); back.setDate(d.getDate() + nights);
		return { out: d, back };
	}
	const fmtDay = (d) => d.toLocaleDateString(I.locale, { weekday: "short", day: "numeric", month: "short" });

	/* ---------------- understanding the request ---------------- */
	const ALIASES = { telaviv: ["tel aviv", "tel-aviv", "telaviv", "tlv", "jaffa", "yafo", "תל אביב", "תל-אביב"], jerusalem: ["jerusalem", "jérusalem", "jerusalén", "gerusalemme", "ירושלים"], lisbon: ["lisbon", "lisboa", "lisbonne", "lisbona", "ליסבון"], rome: ["rome", "roma", "רומא"], barcelona: ["barcelona", "barcelone", "barcellona", "barça", "bcn", "ברצלונה"], amsterdam: ["amsterdam", "ámsterdam", "אמסטרדם"], athens: ["athens", "athina", "athènes", "atenas", "atene", "אתונה"], copenhagen: ["copenhagen", "copenhague", "copenaghen", "københavn", "kobenhavn", "cph", "קופנהגן"] , porto: ["porto", "oporto", "פורטו"], seville: ["seville", "sevilla", "séville", "siviglia", "סביליה"], valencia: ["valencia", "valence", "valència", "ולנסיה"], granada: ["granada", "grenade", "גרנדה"], palma: ["palma", "mallorca", "majorque", "maiorca", "פלמה", "מיורקה"], florence: ["florence", "firenze", "florencia", "פירנצה"], venice: ["venice", "venezia", "venise", "venecia", "ונציה"], naples: ["naples", "napoli", "nápoles", "נאפולי"], palermo: ["palermo", "palerme", "פלרמו"], nice: ["nice", "nizza", "niza", "ניס"], valletta: ["valletta", "malta", "malte", "לה ולטה", "מלטה"], santorini: ["santorini", "santorin", "סנטוריני"], prague: ["prague", "praha", "praga", "פראג"], budapest: ["budapest", "budapeste", "בודפשט"], krakow: ["krakow", "kraków", "cracovie", "cracovia", "קרקוב"], dubrovnik: ["dubrovnik", "דוברובניק"], split: ["split", "ספליט"], istanbul: ["istanbul", "estambul", "istambul", "איסטנבול"], marrakech: ["marrakech", "marrakesh", "marrakesch", "marrakech", "מרקש"], reykjavik: ["reykjavik", "reikiavik", "reykjavík", "רייקיאוויק", "איסלנד", "iceland", "islande", "islandia", "islanda"], edinburgh: ["edinburgh", "édimbourg", "edimburgo", "אדינבורו"], stockholm: ["stockholm", "estocolmo", "stoccolma", "שטוקהולם"], tallinn: ["tallinn", "tallin", "טאלין"], bruges: ["bruges", "brugge", "brujas", "בריז׳"] };
	const ELSEWHERE = ["tokio", "טוקיו", "ניו יורק", "tokyo", "new york", "nyc", "bali", "bangkok", "dubai", "london", "paris", "berlin", "madrid", "vienna", "mexico", "japan", "thailand", "morocco", "cairo", "sydney", "miami", "eilat"];
	const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7 };
	function localParse(text) {
		const s = text.toLowerCase();
		let city = null, askedPlace = null;
		for (const [k, al] of Object.entries(ALIASES)) if (al.some((a) => s.includes(a))) { city = k; askedPlace = D.cities[k].name; break; }
		if (!city) { const o = ELSEWHERE.find((p) => new RegExp(`\\b${p}\\b`).test(s) && p !== S.origin.toLowerCase()); if (o) { city = "other"; askedPlace = o.replace(/\b\w/g, (c) => c.toUpperCase()); } }
		let nights = null; let m;
		if ((m = s.match(/(\d+|one|two|three|four|five|six|seven|deux|trois|quatre|cinq|sept|dos|tres|cuatro|cinco|seis|siete|due|tre|quattro|cinque|sei|sette)\s*(nights?|nuits?|noches?|notti|notte|לילות|לילה)/))) nights = NUM[m[1]] || +m[1];
		else if ((m = s.match(/(\d|two|three|four|five|six|seven)\s*(days?)/))) nights = Math.max(1, (NUM[m[1]] || +m[1]) - 1);
		else if (/long weekend|long week-end|fin de semana largo|weekend lungo|סוף שבוע ארוך/.test(s)) nights = 3; else if (/week-?end|fin de semana|fine settimana|סוף שבוע|סופ״ש/.test(s)) nights = 2; else if (/\bweek\b|semaine|semana|settimana|שבוע/.test(s)) nights = 7;
		let travelers = null;
		if (/\b(solo|alone|by myself|just me|seul|seule|sola|da solo|da sola)\b|לבד/.test(s)) travelers = 1;
		else if (/\b(for two|couple|partner|wife|husband|girlfriend|boyfriend|the two of us|2 people|two people|pour deux|à deux|para dos|en pareja|per due|in coppia|conjoint|pareja)\b|לשניים|זוג/.test(s)) travelers = 2;
		else if ((m = s.match(/(\d|three|four|five|six) (people|of us|adults|friends)/)) || (m = s.match(/for (\d|three|four|five|six)\b(?!\s*(nights?|days?|weeks?))/))) travelers = NUM[m[1]] || +m[1];
		else if (/family/.test(s)) travelers = 4;
		let budget = null;
		if ((m = s.match(/[€$£]\s?(\d[\d,.\s]*)/)) || (m = s.match(/(\d[\d,.]*)\s?(€|eur|euros?|\$|usd|dollars?|£)/)) || (m = s.match(/(?:under|max|budget(?: of)?|up to|moins de|menos de|sotto i?|עד)\s+(\d[\d,.]*)/))) budget = parseInt(m[1].replace(/[,.\s]/g, ""), 10) || null;
		const KW = { food: ["food", "gastronomie", "comida", "cibo", "אוכל"], museums: ["museum", "musée", "museo", "musei", "מוזיאון"], beach: ["beach", "plage", "playa", "spiaggia", "mare", "חוף"], nightlife: ["nightlife", "vie nocturne", "vida nocturna", "vita notturna", "חיי לילה"], design: ["design", "diseño", "עיצוב"], viewpoints: ["viewpoint", "belvédère", "mirador", "belvedere", "תצפית"], history: ["history", "histoire", "historia", "storia", "היסטוריה"], bakeries: ["bakeries", "boulangerie", "panader", "panetteri", "מאפי"], art: [" art", "arte", "אמנות"] };
		const interests = Object.keys(KW).filter((k) => KW[k].some((w) => s.includes(w))).slice(0, 3);
		const pace = /\b(relax|slow|chill|lazy)\b/.test(s) ? "slow" : /\b(packed|see everything|busy)\b/.test(s) ? "packed" : "balanced";
		const cabin = /\bbusiness\b/.test(s) ? "business" : /\bpremium\b/.test(s) ? "premium" : null;
		const bags = /\b(checked bag|suitcase|luggage|hold bag)\b/.test(s);
		const time = /\bmorning (flight|departure)\b/.test(s) ? "morning" : /\bevening (flight|departure)\b/.test(s) ? "evening" : null;
		return { city, askedPlace, nights, travelers, budget, interests, pace, cabin, bags, time, note: "" };
	}
	async function understand(text) {
		if (S.scenario === "offline") return { intent: localParse(text), ai: false };
		const ask = async (ms) => {
			const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
			try {
				const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang: I.lang }), signal: ctl.signal });
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const j = await r.json(); if (!j.intent) throw new Error("empty");
				return j;
			} finally { clearTimeout(to); }
		};
		try {
			// the 70B model can take a while on a cold start: wait longer, and try twice before giving up
			let j; try { j = await ask(15000); } catch (e) { if (e.name === "AbortError") throw e; console.warn("Otium AI, first try:", e.message); j = await ask(10000); }
			// Belt and braces: the model may miss a number that is plainly in the text.
			const loc = localParse(text); const i = j.intent;
			for (const k of ["nights", "travelers", "budget"]) if (i[k] == null && loc[k] != null) i[k] = loc[k];
			Object.assign(i, { cabin: loc.cabin, bags: loc.bags, time: loc.time });
			if (!i.city && loc.city) { i.city = loc.city; i.askedPlace = loc.askedPlace; }
			return { intent: i, ai: true };
		} catch (e) { console.warn("Otium AI unavailable, basic matching used:", e.message); return { intent: localParse(text), ai: false }; }
	}

	/* ---------------- run engine ---------------- */
	class Stale extends Error {}
	const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 80) : ms));
	async function beat(id, ms) {
		await sleep(ms);
		for (;;) {
			if (id === S.run) { if (!S.paused) return; await new Promise((r) => (S.resume = r)); continue; }
			const tr = TRIPS.find((x) => x.s && x.s.run === id); // parked: wait until it is opened again
			if (!tr) throw new Stale();
			await new Promise((r) => (tr.wake = r));
		}
	}
	function setStatus(st, txt) {
		S.status = st; $("#agent").dataset.status = st; $("#agentStatus").textContent = txt;
		$("#pauseBtn").hidden = st === "done" || st === "idle";
		updateNY(); renderTripsNav();
		clearTimeout(botTimer); if (st === "waiting") botTimer = setTimeout(botNudge, 40000);
		if (st === "waiting" && S.case) caseMoment();
	}
	function addStep(key, title, risk) {
		S.curStep = key;
		let li = $(`#step-${key}`);
		if (!li) { li = document.createElement("li"); li.className = "step"; li.id = `step-${key}`; $("#steps").append(li); }
		li.innerHTML = `<span class="ic">${ICON.spin}</span><div class="t">${esc(title)}${risk ? `<span class="risk ${risk === "auto" ? "auto" : "ok"}">${t(risk === "auto" ? "Automatic" : "Needs your OK")}</span>` : ""}</div><div class="d"></div><ul class="sub"></ul><div class="slot"></div>`;
		li.dataset.s = "working";
		scrollAgent(li);
		return {
			el: li,
			sub(t) { const x = document.createElement("li"); x.textContent = t; li.querySelector(".sub").append(x); },
			detail(t) { li.querySelector(".d").innerHTML = t; },
			set(s) { li.dataset.s = s;
				if (s === "done" && li.querySelector(".sub li") && !li.querySelector(".peek")) { li.classList.add("folded"); const n = li.querySelectorAll(".sub li").length; li.querySelector(".t").insertAdjacentHTML("beforeend", `<button class="peek" type="button" aria-expanded="false">${P(n, "1 detail", "{n} details")} ${ICON.down}</button>`); } const rb = li.querySelector(".risk.ok"); if (rb) rb.textContent = t(s === "done" ? "Approved by you" : s === "skipped" ? "Declined" : "Needs your OK"); li.querySelector(".ic").innerHTML = { done: ICON.check, working: ICON.spin, ask: ICON.hand, blocked: ICON.x, skipped: ICON.dot }[s]; },
			slot(html) { const sl = li.querySelector(".slot"); sl.innerHTML = html; scrollAgent(sl); return sl; },
		};
	}
	function scrollAgent(node) {
		const body = $("#agentBody");
		if (getComputedStyle($("#agent")).position !== "sticky") return;
		requestAnimationFrame(() => body.scrollTo({ top: body.scrollTop + node.getBoundingClientRect().top - body.getBoundingClientRect().top - 24, behavior: reduced ? "auto" : "smooth" }));
	}
	function decide(slot) {
		return new Promise((resolve) => {
			slot.addEventListener("click", function h(e) {
				const b = e.target.closest("[data-choice]"); if (!b) return;
				slot.removeEventListener("click", h); resolve(b.dataset.choice);
			});
		});
	}
	function log(by, text, undo) {
		const now = new Date();
		S.log.unshift({ id: Math.random().toString(36).slice(2), t: now.toTimeString().slice(0, 5), by, text, undo, undone: false, target: S.curStep });
		renderLog();
	}

	/* Budget explorer (home): every destination whose cheapest plan fits a total budget. */
	let PRESET = null; const BUD = { nights: 3, travelers: 2 };
	function budgetTrips(budgetLocal) {
		const cap = fromLocal(budgetLocal);
		return Object.keys(D.cities).map((k) => {
			const c = D.cities[k]; const fl = bestFlight(flightOptions(k, S.origin, BUD.travelers, DEFAULT_PREFS));
			const st = [...c.stays].sort((a, b) => a.nightly - b.nightly)[0];
			const tickets = S.settings.activities ? TICKETS_PP_DAY * BUD.travelers * (BUD.nights + 1) : 0;
			const total = fl.price + st.nightly * BUD.nights + tickets;
			return { k, c, total, left: cap - total };
		}).sort((a, b) => a.total - b.total).map((x) => ({ ...x, fits: x.total <= cap }));
	}
	function renderBudget(show) {
		const box = $("#budgetOut"); if (!box) return;
		$("#budCur").textContent = money(0).replace(/[\d\s.,\u00a0\u202f]/g, "");
		$("#budDD").innerHTML = dd("b", "nights", [2, 3, 4, 5, 7].map((n) => [n, P(n, "1 night", "{n} nights")]), BUD.nights, t("Nights")) + dd("b", "travelers", [1, 2, 3, 4].map((n) => [n, P(n, "1 traveller", "{n} travellers")]), BUD.travelers, t("Travellers"));
		const raw = +String($("#budAmt").value).replace(/[^\d]/g, "");
		if (!show) return;
		if (!raw) { box.innerHTML = `<p class="err">${t("Enter a budget.")}</p>`; return; }
		const all = budgetTrips(raw), ok = all.filter((x) => x.fits);
		const what = t(S.settings.activities ? "Flights, stay and activities" : "Flights and stay");
		if (!ok.length) { const low = all[0]; box.innerHTML = `<div class="bud-empty"><p>${t("Nothing fits {x} yet. The lowest is {y}.", { x: money(raw), y: eur(low.total) })}</p><button type="button" class="btn btn-ghost btn-sm" data-budset="${Math.ceil((low.total * cur()[1]) / 50) * 50}">${t("Use {y}", { y: eur(Math.ceil((low.total * cur()[1]) / 50) * 50 / cur()[1]) })}</button></div>`; return; }
		box.innerHTML = `<p class="bud-n">${t(ok.length === 1 ? "1 destination fits {x}" : "{n} destinations fit {x}", { n: ok.length, x: money(raw) })} · <span>${what}</span></p><div class="bud-grid">${ok.slice(0, BUD.all ? ok.length : 8).map((x) => `<button type="button" class="bud-card" data-budcity="${x.k}"><span class="ph-w">${pic(x.c.photo, x.k, x.c.name)}</span><span class="bud-b"><b>${esc(x.c.name)}</b><small>${esc(x.c.country)}</small><span class="bud-p"><strong>${eur(x.total)}</strong><em>${t("{x} left", { x: eur(Math.max(0, x.left)) })}</em></span><span class="bud-go">${t("Plan this trip")}${ICON.arrow}</span></span></button>`).join("")}</div>${ok.length > 8 && !BUD.all ? `<div class="see-all"><button type="button" class="btn btn-ghost" data-budall>${t("See all {n} destinations", { n: ok.length })}</button></div>` : ""}`;
	}
	function goBudget() { const head = document.querySelector(".top")?.offsetHeight || 70; window.scrollTo({ top: $("#budget").getBoundingClientRect().top + scrollY - head - 16, behavior: reduced ? "auto" : "smooth" }); setTimeout(() => $("#budAmt").focus({ preventScroll: true }), 500); }
	function initBudget() {
		const f = $("#budgetForm"); if (!f) return;
		renderBudget(false);
		$("#budGo").onclick = () => { BUD.all = false; renderBudget(true); };
		$("#budAmt").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); BUD.all = false; renderBudget(true); } };
		$("#budAmt").oninput = (e) => { const d = e.target.value.replace(/[^\d]/g, "").slice(0, 6); e.target.value = d ? Number(d).toLocaleString(I.locale) : ""; };
		
		$("#budgetOut").onclick = (e) => {
			if (e.target.closest("[data-budall]")) { BUD.all = true; return renderBudget(true); }
			const s2 = e.target.closest("[data-budset]"); if (s2) { $("#budAmt").value = Number(s2.dataset.budset).toLocaleString(I.locale); return renderBudget(true); }
			const c = e.target.closest("[data-budcity]"); if (!c) return;
			const raw = +String($("#budAmt").value).replace(/[^\d]/g, ""); const city = D.cities[c.dataset.budcity];
			PRESET = { city: c.dataset.budcity, nights: BUD.nights, travelers: BUD.travelers, budget: raw };
			const q = t("{city}, {n} nights for {t}, budget {x}", { city: city.name, n: BUD.nights, t: BUD.travelers, x: money(raw) });
			$("#ask").value = q; start(q, false, "normal", null);
		};
	}
	async function start(text, sameTrip = false, scenario, kase) {
		if (!sameTrip || !activeTrip) { newTripRecord(); S.log = []; S.status = "idle"; S.case = null; S.scenario = "normal"; }
		if (scenario !== undefined) { S.scenario = scenario; S.case = kase; }
		if (!sameTrip) S.when = homeWhen ? { ...homeWhen } : null;
		S.text = text; S.run = ++RUN; S.paused = false; S.held = {}; S.progress = {}; S.plan = null; S.intent = null;
		if (S.case && S.case[0] !== S.scenario) S.case = null;
		show("trip"); renderCase();
		$("#steps").innerHTML = ""; $("#notice").innerHTML = ""; $("#understood").hidden = true;
		log("You", t("Asked: “{x}”", { x: text }));
		renderTrip();
		try { await flow(S.run); } catch (e) { if (!(e instanceof Stale)) { console.error(e); failSafe(); } }
	}

	async function flow(id, fromStep = "read") {
		const order = ["read", "flights", "stay", "days", "budget", "hold", "share", "done"];
		const at = (k) => order.indexOf(k) >= order.indexOf(fromStep);

		/* 1 — read */
		if (at("read")) {
			setStatus("working", t("Reading your request…"));
			const s = addStep("read", t("Understand what you want"), "auto");
			s.sub(t("Reading your words"));
			const { intent, ai } = await understand(S.text);
			await beat(id, 500);
			if (PRESET) { Object.assign(intent, PRESET); PRESET = null; }
			S.aiUsed = ai; S.intent = intent;
			s.sub(t(ai ? "Matched it against 30 destinations (Llama 3.3)" : "Matched it against 30 destinations (basic matching)"));
			if (S.scenario === "overbudget") intent.budget = 400;

			if (intent.city === "other" || !intent.city) {
				s.set("ask");
				const other = intent.city === "other";
				s.detail(other ? t("{place} isn’t covered in this demo yet.", { place: esc(intent.askedPlace || t("That place")) }) : t("One thing I need before I start."));
				setStatus("waiting", t("Waiting for you"));
				const slot = s.slot(`<div class="card ask"><h4>${t(other ? "Pick one of these instead?" : "Where would you like to go?")}</h4><p>${t(other ? "Otium plans 30 cities for now. I won’t guess on your behalf." : "Pick a city — I’ll keep the rest of what you said.")}</p><div class="city-pick">${Object.keys(D.cities).slice(0, 8).map((k) => `<button data-choice="${k}">${pic(D.cities[k].photo, k)}<span>${D.cities[k].name}</span></button>`).join("")}</div></div>`);
				const city = await decide(slot);
				if (id !== S.run) throw new Stale();
				intent.city = city; slot.innerHTML = "";
				log("You", t("Chose {city}", { city: D.cities[city].name }));
				setStatus("working", t("Working on it…"));
			}
			const assumed = { nights: intent.nights == null, travelers: intent.travelers == null, cap: intent.budget == null };
			S.plan = {
				city: intent.city, nights: intent.nights ?? 3, travelers: intent.travelers ?? 2,
				cap: intent.budget != null ? fromLocal(intent.budget) : S.settings.cap, flight: 0, stay: null, assumed, interests: intent.interests || [], pace: intent.pace || "balanced", prefs: { ...DEFAULT_PREFS, cabin: intent.cabin || "economy", bags: intent.bags ? 1 : 0, time: intent.time || "any" },
			};
			if (S.when) { S.plan.out = S.when.out; S.plan.nights = S.when.nights; assumed.nights = false; }
			else S.plan.out = iso(tripDates(S.plan.nights, null).out);
			s.set("done");
			s.detail(esc(intent.note || t("You want {n} nights in {city} for {t}.", { n: S.plan.nights, city: D.cities[S.plan.city].name, t: S.plan.travelers })));
			renderUnderstood();
			log("Otium", t("Understood: {city}, {n} nights, {t} travellers, cap {cap}", { city: D.cities[S.plan.city].name, n: S.plan.nights, t: S.plan.travelers, cap: eur(S.plan.cap) }));
			renderTrip();
		}
		const p = S.plan; const c = D.cities[p.city];

		/* 2 — flights */
		if (at("flights")) {
			await beat(id, 450);
			const s = addStep("flights", t("Find flights from {o}", { o: on(S.origin) }), "auto");
			S.progress.flights = "searching"; renderTrip();
			for (const a of D.airlines) { await beat(id, 380); s.sub(t("Checked {a}", { a })); }
			const opts = flightOptions(p.city, S.origin, p.travelers);
			const best = bestFlight(opts); p.flight = best.i;
			if (!best.fits) s.sub(t("No flight matched every filter — picked the closest"));
			await beat(id, 300);
			s.set("done"); s.detail(t("Picked {a}, {d} — {cabin}, {kind}, cheapest that matches your filters. Two other options kept.", { a: esc(opts[p.flight].airline), d: opts[p.flight].dep, cabin: t(opts[p.flight].cabin).toLowerCase(), kind: t(opts[p.flight].kind).toLowerCase() }));
			S.progress.flights = "ready"; renderTrip();
			log("Otium", t("Compared 3 flights, picked {a} {d}", { a: opts[p.flight].airline, d: opts[p.flight].dep }));
		}

		/* 3 — stay */
		if (at("stay")) {
			await beat(id, 400);
			const s = addStep("stay", t("Find a place to stay in {city}", { city: c.name }), "auto");
			S.progress.stay = "searching"; renderTrip();
			await beat(id, 500); s.sub(t("Read {n} shortlisted stays", { n: c.stays.length }));
			if (S.settings.refundable) { await beat(id, 350); s.sub(t("Kept refundable ones first (your setting)")); }
			p.stay = pickStay(p);
			await beat(id, 350);
			const st = c.stays.find((x) => x.id === p.stay);
			s.set("done"); s.detail(t("{name} in {area} — best rated that fits your cap.", { name: esc(st.name), area: esc(st.area) }));
			S.progress.stay = "ready"; renderTrip();
			log("Otium", t("Picked {name}, {price}/night", { name: st.name, price: eur(st.nightly) }));
		}

		/* 4 — days */
		if (at("days")) {
			await beat(id, 400);
			const s = addStep("days", t(S.settings.activities ? "Draft your days" : "Leave your days free"), "auto");
			S.progress.days = "searching"; renderTrip();
			await beat(id, 700);
			s.sub(S.settings.activities ? t("Paced as “{pace}”", { pace: t(p.pace) }) + (p.interests.length ? t(", leaning on {list}", { list: p.interests.join(", ") }) : "") : t("You chose to plan activities yourself"));
			s.set("done"); s.detail(S.settings.activities ? t("{n} days drafted. Tickets are estimated, not bought.", { n: p.nights + 1 }) : t("Nothing added."));
			S.progress.days = "ready"; renderTrip();
		}

		/* 5 — budget guardrail */
		if (at("budget")) {
			await beat(id, 400);
			const s = addStep("budget", t("Check it against your {cap} cap", { cap: eur(p.cap) }), "auto");
			await beat(id, 500);
			let k = costs(p);
			while (k.total > p.cap) {
				s.set("blocked"); setStatus("waiting", t("Stopped — over your budget cap"));
				s.detail(t("This plan is {x} over your cap. I stopped instead of going over.", { x: `<b class="num">${eur(k.total - p.cap)}</b>` }));
				const cheaper = c.stays.filter((x) => x.nightly < k.st.nightly).sort((a, b) => b.rating - a.rating)[0];
				const choices = [];
				if (cheaper) choices.push(["stay:" + cheaper.id, t("Switch to {name}", { name: cheaper.name }), t("{area} · rated {r}", { area: cheaper.area, r: cheaper.rating }), -(k.st.nightly - cheaper.nightly) * p.nights]);
				if (p.nights > 1) choices.push(["night", t("One night less"), t("{a} nights instead of {b}", { a: p.nights - 1, b: p.nights }), -(k.st.nightly + TICKETS_PP_DAY * p.travelers * (S.settings.activities ? 1 : 0))]);
				if (k.fl.kind === "Direct" && p.flight !== 2) { const o = flightOptions(p.city, S.origin, p.travelers)[2]; choices.push(["flight:2", t("Take the {d} flight with a stop", { d: o.dep }), t("{a} · longer journey", { a: o.airline }), o.price - k.flights]); }
				if (p.prefs.cabin !== "economy") { const eco = flightOptions(p.city, S.origin, p.travelers, { ...p.prefs, cabin: "economy" })[p.flight]; choices.unshift(["cabin", t("Fly economy instead"), t("{c} → Economy", { c: t(CABINS[p.prefs.cabin][0]) }), eco.price - k.flights]); }
				const raise = roundLocal(k.total, 50, true);
				choices.push(["cap", t("Raise my cap to {x}", { x: eur(raise) }), t("Keep the plan as it is"), 0]);
				renderTrip();
				const slot = s.slot(`<div class="card warn"><h4>${t("Over budget by {x}", { x: eur(k.total - p.cap) })}</h4><p>${t("Pick one — I won’t choose for you when it’s your money.")} <button class="linkish" data-help>${t("Or ask a person")}</button></p><div class="opts">${choices.map(([v, t, sm, d]) => `<button class="opt" data-choice="${v}"><span>${esc(t)}<small>${esc(sm)}</small></span>${d ? `<span class="diff down num">${d < 0 ? "−" : "+"}${eur(Math.abs(d))}</span>` : ""}</button>`).join("")}</div></div>`);
				const ch = await decide(slot);
				if (id !== S.run) throw new Stale();
				slot.innerHTML = "";
				if (ch === "cabin") { p.prefs.cabin = "economy"; log("You", t("Switched to economy")); }
				else if (ch === "cap") { p.cap = raise; p.assumed.cap = false; log("You", t("Raised the cap to {x}", { x: eur(raise) })); }
				else if (ch === "night") { p.nights--; p.assumed.nights = false; log("You", t("Cut the trip to {n} nights", { n: p.nights })); }
				else if (ch.startsWith("stay:")) { p.stay = ch.slice(5); log("You", t("Switch to {name}", { name: c.stays.find((x) => x.id === p.stay).name })); }
				else if (ch.startsWith("flight:")) { p.flight = +ch.slice(7); log("You", t("Switched to the cheaper flight with a stop")); }
				renderUnderstood(); renderTrip();
				setStatus("working", t("Working on it…"));
				await beat(id, 400);
				k = costs(p);
			}
			s.set("done"); s.detail(t("{x} all in — {y} under your cap.", { x: eur(k.total), y: `<b class="num">${eur(p.cap - k.total)}</b>` }));
			renderTrip();
		}

		/* 6 — hold (payment) */
		if (at("hold")) {
			await beat(id, 450);
			let approvedAmount = null;
			const s = addStep("hold", t("Hold flights and stay"), "ok");
			while (!readyToPay()) {
				s.set("ask"); setStatus("waiting", t("Waiting for your details"));
				s.detail(t("Otium needs your details before it can pay."));
				S.progress.needDetails = true; gateTrip = activeTrip?.id ?? gateTrip; renderTrip();
				const slot = s.slot(`<div class="card warn" role="group" aria-label="${esc(t("Details needed to pay"))}"><h4>${t(ME.signedIn ? "Add your details to pay" : "Sign in to pay")}</h4>
					<p>${t("To hold flights and a stay, Otium needs your payment card and traveller details from your profile. Nothing is paid until you approve.")}</p>
					<ul class="what">${missingList().map((m) => `<li><span>${t(m)}</span><span class="miss">${t("Missing")}</span></li>`).join("")}</ul>
					<div class="row"><button class="btn btn-amber btn-sm" data-choice="profile">${ic("user")}${t(ME.signedIn ? "Complete my profile" : "Sign in")}</button></div>
					<p class="fine">${ICON.lock}<span>${t("Your trip stays saved in My trips. Otium carries on by itself once your details are in.")}</span></p></div>`);
				const ch = await Promise.race([decide(slot), profileReady()]);
				if (ch === "profile") { goAccount(); await profileReady(); }
				await beat(id, 0); // waits here if this trip was set aside meanwhile
				S.progress.needDetails = false;
				log("Otium", t("Details complete — back to the payment"));
			}
			S.progress.needDetails = false;
			for (;;) {
				const k = costs(p);
				s.set("ask"); setStatus("waiting", t("Waiting for your OK"));
				s.detail(t("This step spends money, so it waits for you."));
				S.progress.pendingHold = true; renderTrip();
				const dates = tripDates(p.nights);
				const reprice = approvedAmount != null && k.hold !== approvedAmount;
				const slot = s.slot(`<div class="card ask" role="group" aria-label="${t("Approve payment")}">
					<h4>${t(reprice ? "The price changed — approve the new total?" : "Approve this payment?")}</h4>
					<div class="amount num">${eur(k.hold)} ${reprice ? `<span class="diff num">+${eur(k.hold - approvedAmount)}</span>` : ""}</div>
					<ul class="what">
						<li><span>${esc(k.fl.airline)} · ${k.fl.dep} · ${P(p.travelers, "1 seat", "{n} seats")}</span><span class="num">${eur(k.flights)}</span></li>
						<li><span>${esc(k.st.name)} · ${P(p.nights, "1 night", "{n} nights")}</span><span class="num">${eur(k.stay)}</span></li>
						<li><span>${fmtDay(dates.out)} → ${fmtDay(dates.back)}</span><span>${t(k.st.freeCancel ? "Free cancellation" : "Stay non-refundable")}</span></li>
						<li><span>${t("Paid with")}</span><span>${esc(cardLabel())}</span></li>
					</ul>
					<div class="row"><button class="btn btn-amber btn-sm" data-choice="yes">${t("Approve {x}", { x: eur(k.hold) })}</button><button class="btn btn-ghost btn-sm" data-choice="edit">${t("Change something")}</button><button class="btn btn-text btn-sm" data-choice="no">${t("Not now")}</button></div>
					<p class="fine">${ICON.lock}<span>${t("Simulated payment — nothing is charged in this demo. Tickets for activities ({x}) are not part of this payment.", { x: eur(k.tickets) })}</span></p>
				</div>`);
				const ch = await decide(slot);
				if (id !== S.run) throw new Stale();
				if (ch === "edit") { slot.innerHTML = ""; s.detail(t("Change the flight or stay, then confirm.")); S.progress.editing = true; S.progress.editPicked = false; S.progress.pendingHold = false; renderTrip(); document.querySelector("#tripCanvas .toggle-alts")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); await waitEdit(); if (id !== S.run) throw new Stale(); S.progress.editing = false; log("You", t("Edited the plan")); restartFrom("budget"); return; }
				if (ch === "no") {
					slot.innerHTML = `<div class="card"><h4>${t("Nothing booked.")}</h4><p>${t("Your plan is saved as a draft. Prices may change.")}</p><div class="row"><button class="btn btn-ghost btn-sm" data-choice="again">${t("Review it again")}</button><button class="btn btn-text btn-sm" data-choice="cheaper">${t("Find something cheaper")}</button></div></div>`;
					s.set("skipped"); s.detail(t("You declined. No money moved."));
					setStatus("waiting", t("Draft saved — nothing booked"));
					S.progress.pendingHold = false; renderTrip();
					log("You", t("Declined the {x} payment", { x: eur(k.hold) }));
					const n = await decide(slot);
					if (id !== S.run) throw new Stale();
					if (n === "cheaper") { p.cap = Math.max(fromLocal(200 * cur()[2]), roundLocal(costs(p).total * 0.8)); p.assumed.cap = false; log("You", t("Asked for cheaper — cap set to {x}", { x: eur(p.cap) })); renderUnderstood(); restartFrom("stay"); return; }
					slot.innerHTML = ""; setStatus("working", t("Working on it…")); continue;
				}
				approvedAmount = k.hold;
				log("You", t("Approved {x}", { x: eur(k.hold) }));
				slot.innerHTML = ""; s.set("working"); setStatus("working", t("Holding your trip…"));
				s.detail("");
				await beat(id, 700); s.sub(t("Holding {x}", { x: `${k.fl.airline} ${k.fl.dep}` }));
				if (S.scenario === "soldout" && !S.progress.soldoutDone) {
					await beat(id, 900);
					S.progress.soldoutDone = true;
					const nx = flightOptions(p.city, S.origin, p.travelers).filter((o) => o.i !== p.flight && o.kind === "Direct")[0];
					s.set("blocked"); setStatus("waiting", t("A flight sold out — waiting for you"));
					s.detail(t("The {d} {a} flight sold out while I was holding it. Nothing was charged.", { d: k.fl.dep, a: esc(k.fl.airline) }));
					log("Otium", t("{a} {d} sold out — nothing charged", { a: k.fl.airline, d: k.fl.dep }));
					const sl2 = s.slot(`<div class="card warn"><h4>${t("Plan B: {a} at {d}", { a: esc(nx.airline), d: nx.dep })}</h4><p>${t("Same day, direct. It costs more than what you approved, so I need you again.")} <button class="linkish" data-help>${t("Prefer a person?")}</button></p><div class="row"><button class="btn btn-amber btn-sm" data-choice="b">${t("Use plan B")}</button><button class="btn btn-text btn-sm" data-choice="stop">${t("Stop here")}</button></div></div>`);
					const b = await decide(sl2);
					if (id !== S.run) throw new Stale();
					sl2.innerHTML = "";
					if (b === "stop") { s.set("skipped"); s.detail(t("Stopped. Nothing booked.")); setStatus("waiting", t("Stopped — nothing booked")); return; }
					p.flight = nx.i; renderTrip(); continue;
				}
				await beat(id, 600); s.sub(t("Holding {x}", { x: k.st.name }));
				await beat(id, 500);
				S.held.flights = { airline: k.fl.airline, dep: k.fl.dep, amount: k.flights, code: code() };
				S.held.stay = { name: k.st.name, amount: k.stay, refundable: k.st.freeCancel, code: code() };
				log("Otium", t("Held {a} for {x}", { a: `${k.fl.airline} ${k.fl.dep}`, x: eur(k.flights) }), "flights");
				log("Otium", t("Held {a} for {x}", { a: k.st.name, x: eur(k.stay) }), "stay");
				s.set("done"); s.detail(t("{x} held. ", { x: eur(k.hold) }) + t(k.st.freeCancel ? "Free cancellation on the stay." : "The stay is non-refundable."));
				S.progress.pendingHold = false; renderTrip();
				break;
			}
		}

		/* 7 — share data */
		if (at("share")) {
			await beat(id, 450);
			const k = costs(p);
			const s = addStep("share", t("Send traveller details to {a}", { a: k.fl.airline }), "ok");
			s.set("ask"); setStatus("waiting", t("Waiting for your OK"));
			s.detail(t("Airlines need names and passport numbers to issue tickets."));
			const slot = s.slot(`<div class="card ask"><h4>${t("Share your details with {a}?", { a: esc(k.fl.airline) })}</h4><ul class="what"><li><span>${t("Full names")}</span><span>${esc(fullName())}${p.travelers > 1 ? ` +${p.travelers - 1}` : ""}</span></li><li><span>${t("Passport numbers")}</span><span>${t("From your profile")}</span></li><li><span>${t("Phone, for delay alerts")}</span><span>${t("Optional")}</span></li></ul><div class="row"><button class="btn btn-amber btn-sm" data-choice="yes">${t("Share and issue tickets")}</button><button class="btn btn-ghost btn-sm" data-choice="noPhone">${t("Share without phone")}</button><button class="btn btn-text btn-sm" data-choice="later">${t("I’ll do it myself")}</button></div><p class="fine">${ICON.lock}<span>${t("Shared with the airline only, for this booking. Demo — no data is entered or sent.")}</span></p></div>`);
			const ch = await decide(slot);
			if (id !== S.run) throw new Stale();
			slot.innerHTML = "";
			if (ch === "later") { s.set("skipped"); s.detail(t("You’ll add details yourself. Seats stay held for 24 h.")); log("You", t("Chose to send traveller details myself")); }
			else {
				log("You", t(ch === "noPhone" ? "Shared names and passports (no phone)" : "Shared names, passports and phone"));
				s.set("working"); setStatus("working", t("Issuing tickets…"));
				await beat(id, 800); s.sub(t("Tickets issued"));
				S.held.data = { phone: ch === "yes" };
				log("Otium", t("Sent details to {a}", { a: k.fl.airline }), "data");
				s.set("done"); s.detail(t("Tickets issued."));
			}
		}

		/* 8 — done */
		await beat(id, 350);
		const s = addStep("done", t("Trip ready"), null);
		s.set("done"); s.detail(t("Everything is in the trip history, and every booking can be cancelled from this page."));
		setStatus("done", t("Done — nothing else needs you"));
		S.progress.done = true; renderTrip();
		showDone();
		toast(t("Your trip is held. You can still cancel anything from this page."));
	}
	function restartFrom(stepKey) {
		const order = ["read", "flights", "stay", "days", "budget", "hold", "share", "done"];
		order.slice(order.indexOf(stepKey)).forEach((k) => $(`#step-${k}`)?.remove());
		S.run = ++RUN; S.paused = false; S.held = {};
		Object.assign(S.progress, { done: false, pendingHold: false, editing: false });
		if (order.indexOf(stepKey) <= order.indexOf("flights")) S.progress.flights = null;
		if (order.indexOf(stepKey) <= order.indexOf("stay")) { S.progress.stay = null; S.plan.stay = null; }
		if (order.indexOf(stepKey) <= order.indexOf("flights")) S.plan.flight = 0;
		if (order.indexOf(stepKey) <= order.indexOf("days")) S.progress.days = null;
		renderTrip();
		flow(S.run, stepKey).catch((e) => { if (!(e instanceof Stale)) { console.error(e); failSafe(); } });
	}
	let editResolve = null;
	const waitEdit = () => new Promise((r) => (editResolve = r));
	function failSafe() {
		setTimeout(botNudge, 600);
		setStatus("paused", t("Something went wrong — nothing was booked"));
		$("#notice").innerHTML = `<div class="notice">${ICON.info}<span>${t("Otium hit an error and stopped. Nothing was booked or charged.")} <button class="btn btn-ghost btn-sm" id="retry">${t("Try again")}</button></span></div>`;
		$("#retry").onclick = () => start(S.text, true);
	}
	const code = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

	/* ---------------- what Otium understood (editable) ---------------- */
	/* Custom dropdown — the same component as "From" on the home page, used for every choice in the app. */
	function dd(kind, key, vals, cur, label, extraClass = "") {
		const curLabel = (vals.find(([v]) => v == cur) || vals[0])[1];
		return `<div class="dd fact ${extraClass}" data-kind="${kind}" data-key="${key}" title="${esc(label)}"><button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(label)}"><span>${esc(curLabel)}</span>${ICON.down}</button><ul class="from-list dd-list" role="listbox" tabindex="-1" aria-label="${esc(label)}">${vals.map(([v, tx, sm]) => `<li role="option" data-v="${v}" aria-selected="${v == cur}">${esc(tx)}${sm ? `<small>${esc(sm)}</small>` : ""}</li>`).join("")}</ul></div>`;
	}
	function closeDDs(except) { document.querySelectorAll(".dd-list.on").forEach((l) => { if (l !== except) { l.classList.remove("on"); l.previousElementSibling.setAttribute("aria-expanded", "false"); } }); }
	document.addEventListener("click", (e) => {
		const btn = e.target.closest(".dd-btn");
		if (btn) {
			const list = btn.nextElementSibling; const open = !list.classList.contains("on");
			closeDDs(list); list.classList.toggle("on", open); btn.setAttribute("aria-expanded", open);
			if (open) { const sel = list.querySelector('[aria-selected="true"]'); list.querySelectorAll(".act").forEach((x) => x.classList.remove("act")); sel?.classList.add("act"); list.focus(); sel?.scrollIntoView({ block: "nearest" }); }
			return;
		}
		const li = e.target.closest(".dd-list li");
		if (li) { const w = li.closest(".dd"); closeDDs(); pickFact(w.dataset.kind, w.dataset.key, li.dataset.v, li.firstChild.textContent); return; }
		if (!e.target.closest(".dd")) closeDDs();
	});
	document.addEventListener("keydown", (e) => {
		const list = e.target.closest?.(".dd-list"); if (!list) return;
		const items = [...list.querySelectorAll("li")]; let i = items.findIndex((x) => x.classList.contains("act"));
		if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[i]?.classList.remove("act"); i = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items[i].classList.add("act"); items[i].scrollIntoView({ block: "nearest" }); }
		else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); items[i]?.click(); }
		else if (e.key === "Escape") { closeDDs(); list.previousElementSibling.focus(); }
	});
	function renderUnderstood() {
		const p = S.plan; if (!p) return;
		const box = $("#understood"); box.hidden = false;
		const fact = (key, vals, cur, label) => dd("k", key, vals, cur, t(label), p.assumed[key] ? "assumed" : "");
		const pref = (key, vals, label) => dd("p", key, vals, p.prefs[key], t(label), "pref");
		const caps = [...new Set([...capList(), p.cap])].sort((a, b) => a - b);
		box.innerHTML = `<div class="lbl"><span>${t("WHAT I UNDERSTOOD")}</span><span ${S.aiUsed ? "" : `title="${esc(t("Smart reading is offline right now, so Otium used basic matching. Check the details below — you can change any of them."))}"`}>${t(S.aiUsed ? "Read by AI" : "Basic matching")}</span></div>
			<p>${esc(S.text)}</p>
			<div class="facts">
				${fact("city", Object.keys(D.cities).map((k) => [k, D.cities[k].name, D.cities[k].country]), p.city, "Destination")}
				<div class="fact datef ${p.assumed.nights ? "assumed" : ""}" title="${esc(t("Dates"))}"><button type="button" class="cal-btn" id="dateBtn" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(t("Dates"))}">${ICON.cal}<span>${fmtDay(tripDates(p.nights).out)} – ${fmtDay(tripDates(p.nights).back)} · ${P(p.nights, "1 night", "{n} nights")}</span>${ICON.down}</button></div>
				${fact("travelers", [...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, P(n, "1 traveller", "{n} travellers")]), ["group", t("10 or more"), t("Group or company")]], p.travelers, "Travellers")}
				${fact("cap", caps.map((n) => [n, t("Cap {x}", { x: eur(n) })]), p.cap, "Budget cap")}
			</div>
			<div class="lbl" style="margin-top:12px"><span>${t("FLIGHT PREFERENCES")}</span></div>
			<div class="facts" style="margin-top:6px">
				${pref("cabin", Object.entries(CABINS).map(([k, v]) => [k, t(v[0])]), "Cabin class")}
				${pref("stops", [["direct", t("Direct only")], ["any", t("Stops OK")]], "Stops")}
				${pref("bags", [[0, t("Cabin bag only")], [1, t("+ checked bag")]], "Bags")}
				${pref("time", [["any", t("Any time")], ["morning", t("Morning departure")], ["evening", t("Evening departure")]], "Departure time")}
			</div>
			${Object.values(p.assumed).some(Boolean) ? `<div class="legend">${t("Dashed = I assumed it. Tap any value to change it — I’ll re-plan.")}</div>` : ""}`;
	}
	function pickFact(kind, key, raw, label) {
		if (kind === "b") { BUD[key] = +raw; renderBudget(Boolean($("#budgetOut").innerHTML)); return; }
		if (kind === "u") { ME[key] = raw; const b = document.querySelector('.dd[data-kind="u"][data-key="' + key + '"] .dd-btn span'); if (b) b.textContent = label; return; }
		const p = S.plan; if (!p) return;
		if (kind === "p") {
			const v = key === "bags" ? +raw : raw; if (p.prefs[key] === v) return;
			p.prefs[key] = v;
			log("You", t("Flight preference: {x}", { x: label }));
			toast(t("Re-planning flights with your preference…")); renderUnderstood(); restartFrom("flights"); return;
		}
		if (key === "travelers" && raw === "group") return openGroups();
		const v = key === "city" ? raw : +raw;
		if (p[key] === v) return;
		p[key] = v; p.assumed[key] = false;
		log("You", t("Changed {k} to {v}", { k: t(key === "cap" ? "the budget cap" : key), v: label }));
		renderUnderstood();
		toast(t("Re-planning with your change…"));
		restartFrom("flights");
	}

	/* ---------------- calendar: one custom date-range picker, used on the home bar and in the plan ---------------- */
	const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	function fromIso(x) { const [y, m, d] = x.split("-").map(Number); return new Date(y, m - 1, d, 12); }
	const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
	const nightsBetween = (a, b) => Math.round((b - a) / 864e5);
	const MAX_NIGHTS = 28, QUICK_NIGHTS = [2, 3, 4, 5, 7, 10, 14];
	let homeWhen = null; // dates picked on the home bar, used by every new plan until cleared
	let cal = null;
	const calToday = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
	function openCal(anchor, out, nights, onApply, onClear) {
		closeCal(); closeDDs();
		const a = out ? fromIso(out) : null;
		const base = a || addDays(calToday(), 1);
		cal = { anchor, a, b: a && nights ? addDays(a, nights) : null, hover: null, onApply, onClear, month: new Date(base.getFullYear(), base.getMonth(), 1, 12) };
		const el = document.createElement("div"); el.className = "cal"; el.id = "cal"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", t("Choose your dates"));
		el.onmouseover = (e) => { if (!cal || !cal.a || cal.b) return; const d = e.target.closest(".cal-d"); const h = d && !d.disabled ? fromIso(d.dataset.d) : null; if (+h !== +cal.hover) { cal.hover = h; markCal(); } };
		el.onkeydown = calKey;
		document.body.append(el); anchor.setAttribute("aria-expanded", "true");
		paintCal(); placeCal();
		(el.querySelector('.cal-d[tabindex="0"]') || el.querySelector(".cal-d:not(:disabled)"))?.focus({ preventScroll: true });
	}
	function closeCal(focus) {
		if (!cal) return; const c = cal; cal = null;
		$("#cal")?.remove(); c.anchor.setAttribute("aria-expanded", "false"); if (focus) c.anchor.focus();
	}
	function placeCal() {
		const el = $("#cal"); if (!el || !cal) return;
		const r = cal.anchor.getBoundingClientRect(); const w = el.offsetWidth;
		let x = document.dir === "rtl" ? r.right - w : r.left; x = Math.max(16, Math.min(x, innerWidth - w - 16));
		el.style.left = `${x + scrollX}px`; el.style.top = `${r.bottom + 10 + scrollY}px`;
	}
	function calMonth(m) {
		const y = m.getFullYear(), mo = m.getMonth(); const wk0 = I.lang === "he" ? 0 : 1;
		const lead = (new Date(y, mo, 1, 12).getDay() - wk0 + 7) % 7; const days = new Date(y, mo + 1, 0).getDate();
		const min = iso(addDays(calToday(), 1)), max = iso(addDays(calToday(), 330));
		const head = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + wk0 + i, 12).toLocaleDateString(I.locale, { weekday: "narrow" }));
		let cells = "";
		for (let i = 0; i < lead; i++) cells += "<span></span>";
		for (let d = 1; d <= days; d++) {
			const dt = new Date(y, mo, d, 12); const k = iso(dt);
			cells += `<button type="button" class="cal-d" data-d="${k}" data-off="${k < min || k > max ? 1 : 0}" tabindex="-1" aria-label="${esc(dt.toLocaleDateString(I.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}"><span>${d}</span></button>`;
		}
		return `<div class="cal-m"><div class="cal-t">${esc(new Date(y, mo, 1, 12).toLocaleDateString(I.locale, { month: "long", year: "numeric" }))}</div><div class="cal-g">${head.map((h) => `<span class="cal-h" aria-hidden="true">${h}</span>`).join("")}${cells}</div></div>`;
	}
	function paintCal() {
		const el = $("#cal"); if (!el || !cal) return;
		const two = innerWidth > 720; const t0 = calToday();
		const m2 = new Date(cal.month); m2.setMonth(m2.getMonth() + 1);
		const last = addDays(t0, 330); const lastM = new Date(last.getFullYear(), last.getMonth(), 1, 12);
		const canPrev = cal.month > new Date(t0.getFullYear(), t0.getMonth(), 1, 12), canNext = (two ? m2 : cal.month) < lastM;
		el.innerHTML = `<div class="cal-top">
				<button type="button" class="cal-nav prev" data-cal="prev" aria-label="${esc(t("Previous month"))}" ${canPrev ? "" : "disabled"}>${ic("chevron-left", "dir")}</button>
				<div class="cal-ms">${calMonth(cal.month)}${two ? calMonth(m2) : ""}</div>
				<button type="button" class="cal-nav next" data-cal="next" aria-label="${esc(t("Next month"))}" ${canNext ? "" : "disabled"}>${ic("chevron-right", "dir")}</button>
			</div>
			
			<div class="cal-foot"><div class="cal-sum" aria-live="polite"></div><div class="row">${cal.onClear ? `<button type="button" class="btn btn-text btn-sm" data-cal="clear">${t("Clear dates")}</button>` : ""}<button type="button" class="btn btn-ghost btn-sm" data-cal="cancel">${t("Cancel")}</button><button type="button" class="btn btn-primary btn-sm" data-cal="apply">${t("Apply dates")}</button></div></div>`;
		markCal();
	}
	function markCal() {
		const el = $("#cal"); if (!el || !cal) return;
		const A = cal.a, B = cal.b || (A && cal.hover && cal.hover > A ? cal.hover : null);
		const a = A && iso(A), b = B && iso(B), lim = A && !cal.b ? iso(addDays(A, MAX_NIGHTS)) : null;
		let roving = null;
		el.querySelectorAll(".cal-d").forEach((x) => {
			const k = x.dataset.d;
			x.disabled = x.dataset.off === "1" || Boolean(lim && k > lim);
			x.classList.toggle("c-s", k === a); x.classList.toggle("c-e", Boolean(b) && k === b);
			x.classList.toggle("c-r", Boolean(a && b && k > a && k < b)); x.classList.toggle("c-sr", Boolean(b) && k === a);
			x.classList.toggle("c-tmp", !cal.b && Boolean(b) && k === b);
			x.setAttribute("aria-pressed", k === a || (cal.b && k === b) ? "true" : "false");
			x.tabIndex = -1; if (k === a || (!roving && !x.disabled && !a)) roving = x;
		});
		(roving || el.querySelector(".cal-d:not(:disabled)"))?.setAttribute("tabindex", "0");
		const n = A && cal.b ? nightsBetween(A, cal.b) : 0;
		el.querySelector(".cal-sum").innerHTML = !A ? t("Pick your departure day")
			: !cal.b ? `<b>${fmtDay(A)}</b> · ${t("now pick your return day")}`
			: `<b>${fmtDay(A)} – ${fmtDay(cal.b)}</b> · ${P(n, "1 night", "{n} nights")}`;
		el.querySelector('[data-cal="apply"]').disabled = !n;
		el.querySelectorAll(".cal-quick .chip:not(.cal-custom)").forEach((c) => c.setAttribute("aria-pressed", String(n === +c.dataset.n)));
		const cc = el.querySelector(".cal-custom"); if (cc) { const own = n > 0 && !QUICK_NIGHTS.includes(n); cc.hidden = !own; if (own) { cc.dataset.n = n; cc.textContent = P(n, "1 night", "{n} nights"); } }
	}
	function calShow(d) { // make sure a date is in the visible month(s)
		const two = innerWidth > 720; const m = new Date(d.getFullYear(), d.getMonth(), 1, 12);
		const end = new Date(cal.month); end.setMonth(end.getMonth() + (two ? 1 : 0));
		if (m < cal.month) { cal.month = m; paintCal(); } else if (m > end) { cal.month = two ? new Date(m.getFullYear(), m.getMonth() - 1, 1, 12) : m; paintCal(); }
	}
	function calKey(e) {
		if (e.key === "Escape") { e.preventDefault(); return closeCal(true); }
		const d = e.target.closest?.(".cal-d"); if (!d) return;
		const rtl = document.dir === "rtl";
		const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
		if (!step) return;
		e.preventDefault();
		const to = addDays(fromIso(d.dataset.d), step); calShow(to);
		const nb = $("#cal").querySelector(`.cal-d[data-d="${iso(to)}"]`); if (nb && !nb.disabled) nb.focus();
	}
	document.addEventListener("click", (e) => {
		if (!cal) return; const el = $("#cal");
		if (!el.contains(e.target)) { if (!cal.anchor.contains(e.target)) closeCal(); return; }
		const d = e.target.closest(".cal-d");
		if (d) {
			if (d.disabled) return;
			const dt = fromIso(d.dataset.d);
			if (!cal.a || cal.b || dt <= cal.a) { cal.a = dt; cal.b = null; } else cal.b = dt;
			cal.hover = null; markCal(); d.focus(); return;
		}
		const q = e.target.closest("[data-n]");
		if (q) { if (!cal.a) cal.a = tripDates(0, null).out; cal.b = addDays(cal.a, +q.dataset.n); calShow(cal.b); calShow(cal.a); markCal(); return; }
		const act = e.target.closest("[data-cal]")?.dataset.cal;
		if (act === "prev" || act === "next") { cal.month.setMonth(cal.month.getMonth() + (act === "next" ? 1 : -1)); paintCal(); el.querySelector(`.cal-nav.${act}`)?.focus(); }
		else if (act === "cancel") closeCal(true);
		else if (act === "clear") { const f = cal.onClear; closeCal(true); f?.(); }
		else if (act === "apply" && cal.a && cal.b) { const r = { out: iso(cal.a), nights: nightsBetween(cal.a, cal.b) }; const f = cal.onApply; closeCal(true); f(r); }
	});
	addEventListener("resize", () => { if (cal) { paintCal(); placeCal(); } });
	function paintWhen() {
		const v = $("#whenVal"); if (!v) return;
		const sh = (d) => d.toLocaleDateString(I.locale, { day: "numeric", month: "short" }); // compact: fits the search bar
		v.textContent = homeWhen ? `${sh(fromIso(homeWhen.out))} – ${sh(addDays(fromIso(homeWhen.out), homeWhen.nights))}` : t("Any dates");
		v.classList.toggle("ph-v", !homeWhen);
	}
	function initWhen() {
		$("#whenBtn").onclick = (e) => {
			e.stopPropagation();
			if (cal && cal.anchor === e.currentTarget) return closeCal();
			openCal(e.currentTarget, homeWhen?.out, homeWhen?.nights, (r) => { homeWhen = r; paintWhen(); }, () => { homeWhen = null; paintWhen(); });
		};
		paintWhen();
	}
	$("#understood").addEventListener("click", (e) => {
		const b = e.target.closest("#dateBtn"); if (!b) return;
		e.stopPropagation();
		if (cal && cal.anchor === b) return closeCal();
		const p = S.plan; if (!p) return;
		openCal(b, p.out, p.nights, ({ out, nights }) => {
			if (out === p.out && nights === p.nights) return;
			p.out = out; p.nights = nights; p.assumed.nights = false;
			const d = tripDates(nights);
			log("You", t("Changed dates to {x}", { x: `${fmtDay(d.out)} – ${fmtDay(d.back)}` }));
			renderUnderstood(); toast(t("Re-planning with your change…")); restartFrom("flights");
		});
	});

	/* ---------------- T-Bot: the in-app helper ----------------
	 * Explains what is happening and points to the right control. It never pays,
	 * books or cancels: every action button only opens the place where YOU decide.
	 * Real AI answers come from POST /api/otium {mode:"chat"}; offline it uses
	 * the scripted answers below. Actions are a fixed list, checked in code. */
	const BOT = { msgs: [], busy: false, ai: null, greeted: false };
	const goTrip = () => { if ($("#trip").hidden && S.plan) show("trip"); };
	const later = (fn) => { closeDrawers(); setTimeout(fn, 300); };
	const BOT_ACTIONS = {
		pending: ["hand", "Show what needs me", () => pendingCard(), () => later(() => { goTrip(); goToCard(); })],
		dates: ["calendar", "Change dates", () => true, () => later(() => { if (S.plan && !$("#understood").hidden) { goTrip(); const b = $("#dateBtn"); b.scrollIntoView({ block: "center" }); setTimeout(() => b.click(), 250); } else { show("home"); setTimeout(() => $("#whenBtn").click(), 250); } })],
		budget: ["shield-check", "Change budget cap", () => true, () => later(() => { const b = S.plan && document.querySelector('#understood .dd[data-key="cap"] .dd-btn'); if (b) { goTrip(); b.scrollIntoView({ block: "center" }); setTimeout(() => b.click(), 250); } else openDrawer("rulesDrawer"); })],
		bags: ["luggage", "Change bags", () => Boolean(S.plan), () => later(() => { goTrip(); const b = document.querySelector('#understood .dd[data-key="bags"] .dd-btn'); if (b) { b.scrollIntoView({ block: "center" }); setTimeout(() => b.click(), 250); } })],
		cancel: ["undo-2", "Show cancel options", () => Boolean(S.held.flights || S.held.stay), () => later(() => { goTrip(); document.querySelector("#tripCanvas [data-cancel]")?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); })],
		trips: ["luggage", "Open My trips", () => TRIPS.length > 0, () => later(() => show("trips"))],
		pause: ["hand", "Pause Otium", () => !S.paused && !$("#pauseBtn").hidden, () => later(() => $("#pauseBtn").click())],
		retry: ["undo-2", "Try again", () => Boolean($("#retry")), () => later(() => $("#retry")?.click())],
		new_trip: ["plane", "Plan a new trip", () => true, () => later(() => { show("home"); $("#ask").focus(); })],
		human: ["phone", "Talk to a human", () => true, () => later(openHelp)],
		profile: ["user", "Open my profile", () => true, () => later(goAccount)],
	};
	const KW = (re) => new RegExp(re, "i");
	const BOT_RULES = [
		["how", KW("how does|how it works|what is otium|comment (ça )?marche|comment fonctionne|c.est quoi|c[oó]mo funciona|qu[eé] es otium|come funziona|cos.è otium|איך .*עובד|מה זה")],
		["human", KW("human|person|someone|agent|call|phone|humain|conseiller|appeler|t[ée]l[ée]phone|persona|llamar|humano|umano|chiamare|telefono|אדם|נציג|טלפון|להתקשר")],
		["profile", KW("profile|account|sign ?in|log ?in|my details|profil|compte|connexion|connecter|perfil|cuenta|iniciar|profilo|accedi|פרופיל|חשבון|התחבר|פרטים")],
		["cancel", KW("cancel|refund|annul|rembours|cancelar|reembolso|annulla|rimborso|ביטול|לבטל|החזר")],
		["pay", KW("pay|card|charge|safe|money|pai|carte|payer|pago|tarjeta|pagar|pagamento|carta|soldi|תשלום|כרטיס|לשלם|כסף")],
		["dates", KW("date|when|calendar|quand|jour|fecha|cu[aá]ndo|d[ií]a|data|quando|giorno|תאריך|מתי|יום")],
		["budget", KW("budget|cap|expensive|price|cost|cher|prix|presupuesto|caro|precio|costoso|prezzo|תקציב|יקר|מחיר")],
		["bags", KW("bag|luggage|suitcase|bagage|valise|maleta|equipaje|bagaglio|valigia|מזוודה|כבודה")],
		["trips", KW("my trips|lost|previous|other trip|saved|mes voyages|perdu|mis viajes|perd|miei viaggi|pers|טיולים|נשמר|הקודם")],
		["pause", KW("pause|stop|arr[eê]t|detener|pausa|ferma|עצור|השה")],
		["stuck", KW("stuck|wait|what now|next|blocked|bloqu|attend|que faire|atascad|espera|bloccat|aspett|תקוע|מחכה|מה עכשיו")],
	];
	function botLocal(text) {
		const p = S.plan; const pc = pendingCard(); const held = S.held.flights || S.held.stay;
		if ($("#retry") && !/human|humain|humano|umano|אדם/i.test(text)) return [t("Otium hit a problem and stopped. Nothing was booked or charged. You can try again, or a person from our team can take over."), "retry"];
		const hit = (BOT_RULES.find(([, re]) => re.test(text)) || [null])[0];
		switch (hit) {
			case "how": return [t("You describe a trip in your own words. Otium searches flights and stays, checks your budget, and stops to ask you before it pays or shares your details. You can change anything, pause or cancel."), S.plan ? null : "new_trip"];
			case "human": return [t("Our travel team is there 24/7 by phone, chat or email. They see everything Otium did, so you won’t have to explain twice."), "human"];
			case "cancel": return held ? [t("You can cancel the flight, the stay, or both from your trip page. Otium always shows you what you get back first."), "cancel"] : [t("Nothing is booked yet, so there is nothing to cancel. You can keep the plan as a draft, or delete it from My trips."), TRIPS.length ? "trips" : null];
			case "pay": return [t("Otium never pays without your OK. Each payment waits on a card where you approve, edit or say no. In this demo, nothing is ever charged."), !readyToPay() ? "profile" : pc ? "pending" : null];
			case "profile": return [readyToPay() ? t("Your profile is complete: Otium uses your saved details and card, and still asks before every payment.") : t("Otium needs your traveller details, billing address and a card in your profile before it can pay. It takes a minute."), "profile"];
			case "dates": return [t("Pick new dates in the calendar and Otium re-plans flights and stay for those days. Nothing booked changes without your OK."), "dates"];
			case "budget": return [p ? t("Your cap for this trip is {x}. Otium stops and asks before going over it. You can change it in “What I understood”.", { x: eur(p.cap) }) : t("Set a budget cap in Permissions. Otium stops and asks before going over it."), "budget"];
			case "bags": return [t("Add a checked bag in “What I understood”, under Flight preferences. Otium re-checks flights and price with it."), p ? "bags" : null];
			case "trips": return [t("Every plan is saved automatically in My trips. Open one to pick up where you left off."), "trips"];
			case "pause": return [t("You can pause Otium at any moment. Nothing moves until you resume."), "pause"];
			case "stuck": return pc ? [t("Otium is waiting for you on “{x}”. Nothing happens until you decide.", { x: pc.querySelector("h4")?.textContent || t("your OK") }), "pending"] : [S.plan ? t("Nothing needs you right now. Status: {x}.", { x: $("#agentStatus").textContent }) : t("Describe your trip on the home page and Otium starts planning. I’m here if anything is unclear."), S.plan ? null : "new_trip"];
		}
		return [p ? t("I can help with dates, budget, bags, payment, cancelling, or finding a person. What is blocking you?") : t("Tell me what you need: how Otium works, your trips, or a person from our team."), null];
	}
	function botContext() {
		const p = S.plan; const c = p && D.cities[p.city]; let k = null; try { k = p && p.stay ? costs(p) : null; } catch { /* plan not priced yet */ }
		const d = p ? tripDates(p.nights) : null; const pc = pendingCard();
		return {
			screen: ["home", "trip", "trips", "explore"].find((v) => !$("#" + v).hidden) || "home",
			agent_status: S.plan || S.text ? $("#agentStatus").textContent : "no trip in progress",
			waiting_for_user_on: pc ? pc.querySelector("h4")?.textContent || "a decision" : null,
			error: Boolean($("#retry")),
			trip: p ? { destination: c.name, dates: `${fmtDay(d.out)} – ${fmtDay(d.back)}`, nights: p.nights, travellers: p.travelers, from: S.origin, budget_cap_eur: p.cap, estimated_total_eur: k?.total ?? null, flights_held: Boolean(S.held.flights), stay_held: Boolean(S.held.stay), stay_refundable: S.held.stay ? S.held.stay.refundable : null, trip_ready: Boolean(S.progress.done) } : null,
			saved_trips: TRIPS.length,
			signed_in: ME.signedIn, profile_complete: readyToPay(), missing_for_payment: readyToPay() ? [] : missingList(),
		};
	}
	const BOT_SUGG = () => S.plan ? [pendingCard() ? "What is Otium waiting for?" : null, "Is my payment safe?", "Change my dates", "How do I cancel?"].filter(Boolean).slice(0, 3) : ["How does Otium work?", TRIPS.length ? "Where are my trips?" : null, "Talk to a person"].filter(Boolean);
	function botGreet() {
		const pc = pendingCard();
		const [text, action] = $("#retry") ? botLocal("")
			: pc ? [t("Otium is waiting for you on “{x}”. Nothing happens until you decide. Ask me anything about it.", { x: pc.querySelector("h4")?.textContent || t("your OK") }), "pending"]
			: [t("Hi, I’m T-Bot. I help when something is unclear or goes wrong. Ask me anything about your trip."), null];
		BOT.msgs.push({ by: "bot", text, action, local: true });
	}
	function renderBot() {
		const log = $("#botLog"); if (!log) return;
		log.innerHTML = BOT.msgs.map((m) => {
			const a = m.action && BOT_ACTIONS[m.action] && BOT_ACTIONS[m.action][2]() ? BOT_ACTIONS[m.action] : null;
			return `<div class="bm ${m.by}"><p>${esc(m.text)}</p>${a ? `<button type="button" class="btn btn-ghost btn-sm" data-bot-act="${m.action}">${ic(a[0])}${t(a[1])}</button>` : ""}</div>`;
		}).join("") + (BOT.busy ? `<div class="bm bot typing"><p>${ICON.spin}${t("T-Bot is thinking…")}</p></div>` : "");
		$("#botSugg").innerHTML = BOT.busy ? "" : BOT_SUGG().map((x) => `<button type="button" class="chip" data-bot-q="${esc(x)}">${t(x)}</button>`).join("");
		$("#botMode").textContent = t(BOT.ai === true ? "Your trip helper · AI" : BOT.ai === false ? "Your trip helper · basic answers" : "Your trip helper");
		log.scrollTop = log.scrollHeight;
	}
	function botLabels() {
		const f = $("#botFab"); if (!f) return;
		f.setAttribute("aria-label", t("Ask T-Bot, your trip helper")); f.querySelector(".lbl").textContent = t("Ask T-Bot");
		f.querySelector(".bot-tip").textContent = t("Stuck? Ask T-Bot");
		$("#botAsk").placeholder = t("Ask anything about your trip");
	}
	function openBot() {
		$("#botFab").classList.remove("nudge", "dot");
		if (!BOT.greeted || BOT.msgs.at(-1)?.by === "user") { BOT.greeted = true; botGreet(); }
		renderBot(); openDrawer("botDrawer"); setTimeout(() => $("#botAsk").focus(), 350);
	}
	async function botSend(text) {
		text = text.trim().slice(0, 300); if (!text || BOT.busy) return;
		BOT.msgs.push({ by: "user", text }); BOT.busy = true; renderBot();
		let lt = "", la = null; try { [lt, la] = botLocal(text); } catch (e) { console.error(e); }
		let reply = null, action = null;
		if (S.scenario !== "offline") {
			try {
				const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000);
				const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
					body: JSON.stringify({ mode: "chat", lang: I.lang, context: botContext(), messages: BOT.msgs.filter((m) => m.by === "user" || !m.local || m === BOT.msgs[0]).slice(-8).map((m) => ({ role: m.by === "user" ? "user" : "assistant", content: m.text })) }) });
				clearTimeout(to);
				if (r.ok) { const j = await r.json(); if (typeof j.reply === "string" && j.reply.trim()) { reply = j.reply.trim().slice(0, 900); action = BOT_ACTIONS[j.action] ? j.action : null; } }
			} catch { /* AI unreachable: honest scripted answer below */ }
		}
		BOT.ai = reply != null;
		// Never pretend: without the model, say so before the scripted answer.
		BOT.msgs.push(reply ? { by: "bot", text: reply, action } : { by: "bot", text: `${t("My AI can’t be reached right now, so here is the basic answer:")} ${lt || t("I can help with dates, budget, bags, payment, cancelling, or finding a person. What is blocking you?")}`, action: la || "human", local: true });
		BOT.busy = false; renderBot();
	}
	let botTimer = null;
	function botNudge() { // proactive help when someone seems stuck
		const f = $("#botFab"); if (!f || $("#botDrawer").classList.contains("on")) return;
		f.classList.add("nudge", "dot"); setTimeout(() => f.classList.remove("nudge"), 7000);
	}
	function initBot() {
		$("#botFab").onclick = openBot;
		// no <form>: sandboxed previews block form submission, so Send and Enter call the chat directly
		const submit = () => { const a = $("#botAsk"); const v = a.value; if (!v.trim()) return a.focus(); a.value = ""; a.style.height = ""; botSend(v); };
		$("#botSend").onclick = submit;
		$("#botAsk").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } };
		$("#botAsk").oninput = (e) => { const a = e.target; a.style.height = "auto"; a.style.height = `${Math.min(a.scrollHeight, 96)}px`; };
		$("#botHuman").onclick = () => later(openHelp);
		$("#botDrawer").addEventListener("click", (e) => {
			const q = e.target.closest("[data-bot-q]"); if (q) return botSend(t(q.dataset.botQ));
			const a = e.target.closest("[data-bot-act]"); if (a) BOT_ACTIONS[a.dataset.botAct]?.[3]();
		});
		botLabels();
	}

	/* ---------------- account & profile (demo: kept in this tab only, nothing is sent) ----------------
	 * Paying and issuing tickets need the traveller's details and a card. If something is missing,
	 * the agent stops on a card that says what, links to the profile, and resumes on its own once it's done. */
	const ME = { signedIn: false, email: "", first: "", last: "", phone: "", dob: "", passport: "", street: "", city: "", zip: "", country: "", card: null };
	try { const keep = JSON.parse(localStorage.getItem("otium-me") || "null"); if (keep && typeof keep === "object") Object.keys(ME).forEach((k) => { if (k in keep) ME[k] = keep[k]; }); } catch {}
	const saveMe = () => { try { localStorage.setItem("otium-me", JSON.stringify(ME)); } catch {} };
	const COUNTRIES = ["FR", "GB", "IL", "DE", "ES", "IT", "PT", "NL", "BE", "CH", "AT", "IE", "GR", "DK", "US", "CA"];
	const countryName = (c) => { try { return new Intl.DisplayNames([I.locale], { type: "region" }).of(c); } catch { return c; } };
	const profileParts = () => ({
		personal: Boolean(ME.first && ME.last && ME.email && ME.phone && ME.dob && ME.passport),
		address: Boolean(ME.street && ME.city && ME.zip && ME.country),
		card: Boolean(ME.card),
	});
	const readyToPay = () => ME.signedIn && Object.values(profileParts()).every(Boolean);
	const cardLabel = () => (ME.card ? `${ME.card.brand} •••• ${ME.card.last4}` : "");
	const fullName = () => `${ME.first} ${ME.last}`.trim();
	const missingList = () => { const m = profileParts(); return [!ME.signedIn && "An Otium account", !m.personal && "Traveller details (name, birth date, passport)", !m.address && "Billing address", !m.card && "A payment card"].filter(Boolean); };
	const profWaiters = [];
	const profileReady = () => new Promise((r) => profWaiters.push(r));
	function profileChanged() {
		saveMe(); if (ME.signedIn) keepAccount();
		renderAcct();
		if (!$("#profile").hidden) renderProfile();
		if (readyToPay() && profWaiters.length) { profWaiters.splice(0).forEach((r) => r("ready")); }
	}
	function renderAcct() {
		renderMenu();
		const b = $("#acctBtn"); if (!b) return;
		const done = readyToPay();
		b.innerHTML = ME.signedIn
			? `<span class="av">${esc((ME.first[0] || ME.email[0] || "?").toUpperCase())}${esc((ME.last[0] || "").toUpperCase())}</span><span class="lbl">${esc(ME.first || t("My profile"))}</span>${done ? "" : '<span class="tdot" aria-hidden="true"></span>'}`
			: `${ic("user")}<span class="lbl">${t("Sign in")}</span>`;
		b.setAttribute("aria-label", ME.signedIn ? t(done ? "My profile" : "My profile — details missing") : t("Sign in"));
		const h = $("#acctHint"); if (!h) return;
		h.hidden = done;
		h.innerHTML = done ? "" : `${ic(ME.signedIn ? "credit-card" : "user")}<span>${t(ME.signedIn ? "Finish your profile so Otium can pay the moment you approve." : "Create an account or sign in: Otium will fill in your details for you.")}</span>${ME.signedIn ? `<button type="button" class="btn btn-ghost btn-sm" data-acct>${t("Complete my profile")}</button>` : `<button type="button" class="btn btn-primary btn-sm" data-signup>${t("Sign up")}</button><button type="button" class="btn btn-ghost btn-sm" data-acct>${t("Sign in")}</button>`}`;
	}
	function goAccount() { if (ME.signedIn) show("profile"); else openSignIn(); }
	/* Accounts (demo): kept in this browser only, keyed by email. No password is stored or checked. */
	const BLANK_ME = { first: "", last: "", phone: "", dob: "", passport: "", street: "", city: "", zip: "", country: "", card: null };
	const accounts = () => { try { return JSON.parse(localStorage.getItem("otium-accounts") || "{}"); } catch { return {}; } };
	const keepAccount = () => { if (!ME.email) return; try { const all = accounts(); const { signedIn, ...rest } = ME; all[ME.email.toLowerCase()] = rest; localStorage.setItem("otium-accounts", JSON.stringify(all)); } catch {} };
	function openSignIn(then, mode = "in") {
		const up = mode === "up";
		modal(`<h3 id="modalTitle">${t(up ? "Create your Otium account" : "Sign in to Otium")}</h3><p>${t("Your details and card are filled in for you when Otium books.")}</p>
			<div class="auth-tabs" role="tablist"><button type="button" role="tab" data-auth="in" aria-selected="${!up}">${t("I have an account")}</button><button type="button" role="tab" data-auth="up" aria-selected="${up}">${t("I’m new here")}</button></div>
			<div class="flds">${up ? `<div class="fld-row"><label class="fld"><span>${t("First name")}</span><input id="siFirst" autocomplete="off"></label><label class="fld"><span>${t("Last name")}</span><input id="siLast" autocomplete="off"></label></div>` : ""}<label class="fld"><span>${t("Email")}</span><input id="siEmail" type="email" autocomplete="off" spellcheck="false"></label>
			<label class="fld"><span>${t(up ? "Choose a password" : "Password")}</span><input id="siPass" type="password" autocomplete="off"></label></div>
			<p class="err" id="siErr" hidden></p>
			<p class="fine">${ICON.info}<span>${t("Demo: passwords aren’t checked and nothing is sent. Your account stays in this browser, signed in until you sign out.")}</span></p>
			<div class="row"><button class="btn btn-text btn-sm" data-m="cancel">${t("Cancel")}</button><button class="btn btn-ghost btn-sm" id="siDemo" type="button">${t("Use a demo account")}</button><button class="btn btn-primary btn-sm" id="siGo" type="button">${t(up ? "Create my account" : "Sign in")}</button></div>`, () => {});
		const err = (m, link) => { const e = $("#siErr"); e.hidden = false; e.innerHTML = `${esc(t(m))}${link ? ` <button type="button" class="btn-text auth-sw" data-auth="${link[0]}">${t(link[1])}</button>` : ""}`; };
		const done = (em, msg) => {
			ME.signedIn = true; ME.email = em;
			closeModal("ok"); log("You", t(msg)); toast(t(msg === "Created an account" ? "Account created. Welcome, {x}!" : "Signed in as {x}", { x: ME.first || em }));
			keepAccount(); profileChanged(); (then || (() => { if (!readyToPay()) show("profile"); }))();
		};
		const go = (demo) => {
			if (demo) { Object.assign(ME, { first: "Alex", last: "Martin", phone: "+44 20 7946 0000", dob: "14/03/1990", passport: "X1234567", street: "12 Harbour Lane", city: "London", zip: "N1 7GU", country: "GB", card: { brand: "Visa", last4: "4242", exp: "12/29", name: "Alex Martin" } }); return done("alex.martin@otium.example", "Signed in"); }
			const em = $("#siEmail").value.trim(), key = em.toLowerCase();
			if (up && (!$("#siFirst").value.trim() || !$("#siLast").value.trim())) return err("Enter your first and last name.");
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || !$("#siPass").value) return err("Enter an email and a password.");
			const known = accounts()[key];
			if (up) {
				if (known) return err("An account already uses this email.", ["in", "Sign in instead"]);
				Object.assign(ME, BLANK_ME, { first: $("#siFirst").value.trim(), last: $("#siLast").value.trim() });
				return done(em, "Created an account");
			}
			if (!known) return err("No account with this email yet.", ["up", "Create one"]);
			Object.assign(ME, BLANK_ME, known); return done(em, "Signed in");
		};
		const box = $("#modalBox");
		box.querySelectorAll("[data-auth]").forEach((x) => (x.onclick = null));
		box.onclick = (e) => { const sw = e.target.closest("[data-auth]"); if (sw && sw.dataset.auth !== mode) { const em = $("#siEmail")?.value; openSignIn(then, sw.dataset.auth); if (em) $("#siEmail").value = em; } };
		$("#siGo").onclick = () => go(false); $("#siDemo").onclick = () => go(true);
		box.querySelectorAll("input").forEach((x) => (x.onkeydown = (e) => { if (e.key === "Enter") go(false); }));
		setTimeout(() => (up ? $("#siFirst") : $("#siEmail"))?.focus(), 50);
	}
	const openSignUp = (then) => openSignIn(then, "up");
	const fld = (id, label, val, extra = "") => `<label class="fld"><span>${t(label)}</span><input id="${id}" value="${esc(val || "")}" autocomplete="off" ${extra}></label>`;
	let gateTrip = null; // the trip that stopped to ask for details
	function waitingTrip() { const tr = TRIPS.find((x) => x.id === gateTrip); return tr && tripData(tr)?.plan ? tripData(tr) : null; }
	function renderProfile() {
		const w = $("#profWrap"); if (!w) return;
		$("#profSub").textContent = ME.signedIn ? ME.email : t("Sign in to save your details and card.");
		if (!ME.signedIn) { w.innerHTML = `<div class="tempty">${ic("user")}<h3>${t("You’re not signed in")}</h3><p>${t("Sign in once — Otium fills in your details and card when it books.")}</p><button class="btn btn-primary" type="button" data-acct>${t("Sign in")}</button></div>`; return; }
		const m = profileParts(); const n = Object.values(m).filter(Boolean).length;
		const wt = waitingTrip();
		const chip = (ok, label) => `<span class="pchip ${ok ? "ok" : ""}">${ic(ok ? "check" : "circle-dot")}${t(label)}</span>`;
		const country = dd("u", "country", [["", t("Choose a country")], ...COUNTRIES.map((c) => [c, countryName(c)])], ME.country, t("Country"), "pdd");
		w.innerHTML = `
			<div class="pstat"><div><b>${t("{n} of 3 ready", { n })}</b><span>${chip(m.personal, "Traveller details")}${chip(m.address, "Billing address")}${chip(m.card, "Payment card")}</span></div>
				${wt ? `<div class="pwait">${ICON.hand}<span>${readyToPay() ? t("All set. Your {city} trip can go on.", { city: D.cities[wt.plan.city].name }) : t("Your {city} trip is waiting for these details.", { city: D.cities[wt.plan.city].name })}</span>${readyToPay() ? `<button class="btn btn-primary btn-sm" type="button" data-backtrip>${t("Back to your trip")}</button>` : ""}</div>` : ""}</div>
			<div class="pgrid">
				<section class="pcard" data-sec="personal"><h3>${ic("user")}${t("Traveller details")}</h3><p class="psub">${t("As written in your passport. Used for tickets.")}</p>
					<div class="flds two">${fld("pFirst", "First name", ME.first)}${fld("pLast", "Last name", ME.last)}${fld("pEmail", "Email", ME.email, 'type="email"')}${fld("pPhone", "Phone", ME.phone, 'type="tel" dir="ltr"')}${fld("pDob", "Date of birth", ME.dob, 'placeholder="DD/MM/YYYY" inputmode="numeric" dir="ltr"')}${fld("pPass", "Passport number", ME.passport, 'dir="ltr"')}</div>
					<p class="err" hidden></p><div class="row"><button class="btn btn-primary btn-sm" type="button" data-save="personal">${t("Save")}</button></div></section>
				<section class="pcard" data-sec="address"><h3>${ic("map-pin")}${t("Billing address")}</h3><p class="psub">${t("Must match your card.")}</p>
					<div class="flds two">${fld("pStreet", "Street and number", ME.street)}${fld("pCity", "City", ME.city)}${fld("pZip", "Postcode", ME.zip, 'dir="ltr"')}<div class="fld"><span>${t("Country")}</span>${country}</div></div>
					<p class="err" hidden></p><div class="row"><button class="btn btn-primary btn-sm" type="button" data-save="address">${t("Save")}</button></div></section>
				<section class="pcard" data-sec="card"><h3>${ic("credit-card")}${t("Payment card")}</h3>
					${ME.card ? `<div class="ccard"><b>${esc(cardLabel())}</b><span>${esc(ME.card.name)} · ${t("Expires {x}", { x: ME.card.exp })}</span></div><p class="psub">${t("Otium pays with this card only after you approve each payment.")}</p><div class="row"><button class="btn btn-ghost btn-sm" type="button" data-card="replace">${t("Replace card")}</button><button class="btn btn-text btn-sm danger" type="button" data-card="remove">${t("Remove")}</button></div>`
					: `<p class="psub">${t("Otium pays with this card only after you approve each payment.")}</p>
					<div class="flds two">${fld("cName", "Name on card", ME.card?.name || fullName())}${fld("cNum", "Card number", "", 'inputmode="numeric" dir="ltr" placeholder="4242 4242 4242 4242" maxlength="23"')}${fld("cExp", "Expiry (MM/YY)", "", 'inputmode="numeric" dir="ltr" placeholder="12/29" maxlength="5"')}${fld("cCvc", "CVC", "", 'inputmode="numeric" dir="ltr" placeholder="123" maxlength="4"')}</div>
					<p class="fine">${ICON.lock}<span>${t("Demo: use the test card 4242 4242 4242 4242, never a real one. Only the brand and last 4 digits are kept, in this tab.")}</span></p>
					<p class="err" hidden></p><div class="row"><button class="btn btn-primary btn-sm" type="button" data-save="card">${t("Save card")}</button></div>`}
				</section>
				<section class="pcard pmore"><h3>${ic("shield-check")}${t("Account")}</h3>
					<button type="button" class="plink" data-go="trips">${ic("luggage")}<span>${t("My trips ({n})", { n: TRIPS.length })}</span>${ICON.arrow}</button>
					<button type="button" class="plink" data-open="rulesDrawer">${ic("shield-check")}<span>${t("What Otium may do")}</span>${ICON.arrow}</button>
					<button type="button" class="plink danger" data-signout>${ic("log-out")}<span>${t("Sign out")}</span></button>
				</section>
			</div>`;
	}
	const luhn = (n) => { let s = 0; [...n].reverse().forEach((d, i) => { let x = +d; if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; }); return s % 10 === 0; };
	const brandOf = (n) => (/^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "Amex" : t("Card"));
	function saveSection(sec) {
		const box = document.querySelector(`.pcard[data-sec="${sec}"]`); const err = box.querySelector(".err");
		const v = (id) => $("#" + id)?.value.trim() || "";
		let msg = null;
		if (sec === "personal") {
			const x = { first: v("pFirst"), last: v("pLast"), email: v("pEmail"), phone: v("pPhone"), dob: v("pDob"), passport: v("pPass") };
			const dm = x.dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); const dd_ = dm && new Date(+dm[3], +dm[2] - 1, +dm[1]);
			if (Object.values(x).some((y) => !y)) msg = t("Fill in every field.");
			else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) msg = t("Check the email address.");
			else if (x.phone.replace(/\D/g, "").length < 7) msg = t("Check the phone number.");
			else if (!dd_ || dd_.getMonth() !== +dm[2] - 1 || dd_ > new Date()) msg = t("Date of birth: use DD/MM/YYYY.");
			else if (!/^[A-Z0-9]{6,9}$/i.test(x.passport)) msg = t("Passport number: 6 to 9 letters or digits.");
			else Object.assign(ME, x, { passport: x.passport.toUpperCase() });
		} else if (sec === "address") {
			const x = { street: v("pStreet"), city: v("pCity"), zip: v("pZip") };
			if (Object.values(x).some((y) => !y) || !ME.country) msg = t("Fill in every field.");
			else Object.assign(ME, x);
		} else if (sec === "card") {
			const num = v("cNum").replace(/\D/g, ""), exp = v("cExp"), cvc = v("cCvc"), name = v("cName");
			const em = exp.match(/^(\d{2})\/(\d{2})$/); const now = new Date();
			if (!name || !num || !exp || !cvc) msg = t("Fill in every field.");
			else if (num.length < 13 || num.length > 19 || !luhn(num)) msg = t("This card number isn’t valid. In this demo, use 4242 4242 4242 4242.");
			else if (!em || +em[1] < 1 || +em[1] > 12 || new Date(2000 + +em[2], +em[1], 0) < now) msg = t("Check the expiry date (MM/YY).");
			else if (!/^\d{3,4}$/.test(cvc)) msg = t("Check the CVC.");
			else ME.card = { brand: brandOf(num), last4: num.slice(-4), exp, name }; // the full number and CVC are never kept
		}
		if (msg) { err.hidden = false; err.textContent = msg; return; }
		log("You", t(sec === "card" ? "Saved a payment card" : "Updated my profile"));
		toast(sec === "card" ? t("Card saved: {x}", { x: cardLabel() }) : t("Saved"));
		profileChanged();
		if (readyToPay() && waitingTrip()) toast(t("All set. Your {city} trip can go on.", { city: D.cities[waitingTrip().plan.city].name }), t("Back to your trip"), () => backToWaiting());
	}
	function backToWaiting() { const tr = TRIPS.find((x) => x.id === gateTrip) || activeTrip; gateTrip = null; if (tr) openTrip(tr.id); else show("home"); }
	function initAcct() {
		$("#acctBtn").onclick = goAccount;
		document.addEventListener("click", (e) => {
			if (e.target.closest("[data-signup]")) return openSignUp();
			if (e.target.closest("[data-acct]")) return goAccount();
			if (e.target.closest("[data-backtrip]")) return backToWaiting();
			if (e.target.closest("[data-signout]")) { keepAccount(); ME.signedIn = false; Object.assign(ME, BLANK_ME, { email: "" }); log("You", t("Signed out")); profileChanged(); show("home"); toast(t("Signed out. Your details stay on this account.")); return; }
			const sv = e.target.closest("[data-save]"); if (sv) return saveSection(sv.dataset.save);
			const cd = e.target.closest("[data-card]"); if (cd) { if (cd.dataset.card === "remove") { ME.card = null; log("You", t("Removed the payment card")); } else ME.card = null; profileChanged(); if (cd.dataset.card === "replace") setTimeout(() => $("#cNum")?.focus(), 50); }
		});
		document.addEventListener("input", (e) => {
			if (e.target.id === "cNum") { const d = e.target.value.replace(/\D/g, "").slice(0, 19); e.target.value = d.replace(/(.{4})/g, "$1 ").trim(); }
			if (e.target.id === "cExp") { const d = e.target.value.replace(/\D/g, "").slice(0, 4); e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; }
			if (e.target.id === "pDob") { const d = e.target.value.replace(/\D/g, "").slice(0, 8); e.target.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/"); }
			if (e.target.closest?.(".pcard")) { const er = e.target.closest(".pcard").querySelector(".err"); if (er) er.hidden = true; }
		});
		renderAcct();
	}

	/* ---------------- photos: destination galleries, stay details, one lightbox ---------------- */
	const hashN = (x) => { let h = 0; for (const ch of String(x)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
	const credit = (src) => D.credits[String(src).replace(/^media\//, "")] || "";
	const GAL_N = {"telaviv": 9, "jerusalem": 10, "amsterdam": 10, "athens": 6, "barcelona": 7, "bruges": 8, "budapest": 7, "copenhagen": 8, "dubrovnik": 8, "edinburgh": 7, "florence": 10, "granada": 7, "istanbul": 9, "krakow": 6, "lisbon": 8, "marrakech": 8, "naples": 6, "nice": 8, "palermo": 7, "palma": 8, "porto": 7, "prague": 9, "reykjavik": 6, "rome": 9, "santorini": 10, "seville": 9, "split": 7, "stockholm": 6, "tallinn": 5, "valencia": 6, "valletta": 6, "venice": 9}; // photos per destination, hero included (5 to 10)
	const galN = (k) => GAL_N[k] || 5;
	const cityPhotos = (k) => [[D.cities[k].photo, ""], ...Array.from({ length: galN(k) - 1 }, (_, i) => [`media/g/${k}-${i + 1}.jpg`, ""])];
	const STAY_SETS = {
		"hotel-a": [["media/stay-1.jpg", "Room"], ["media/s/hotel-a-2.jpg", "Lobby"], ["media/s/hotel-a-3.jpg", "Bathroom"], ["media/s/hotel-a-4.jpg", "Breakfast"], ["media/s/hotel-a-5.jpg", "Pool"]],
		"hotel-b": [["media/s/hotel-b-1.jpg", "Room"], ["media/s/hotel-b-2.jpg", "Lobby"], ["media/s/hotel-b-3.jpg", "Bathroom"], ["media/s/hotel-b-4.jpg", "Breakfast"], ["media/s/hotel-b-5.jpg", "Pool"]],
		"apt-a": [["media/stay-2.jpg", "Living room"], ["media/s/apt-a-2.jpg", "Living room"], ["media/s/apt-a-3.jpg", "Kitchen"], ["media/s/apt-a-4.jpg", "Bedroom"], ["media/s/apt-a-5.jpg", "Balcony"]],
		"apt-b": [["media/s/apt-b-1.jpg", "Living room"], ["media/s/apt-b-2.jpg", "Kitchen"], ["media/s/apt-b-3.jpg", "Bedroom"], ["media/s/apt-b-4.jpg", "Balcony"]],
		"villa-a": [["media/stay-3.jpg", "Pool"], ["media/s/villa-a-2.jpg", "Pool"], ["media/s/villa-a-3.jpg", "Living room"], ["media/s/villa-a-4.jpg", "Bedroom"], ["media/s/villa-a-5.jpg", "Dining terrace"], ["media/s/villa-a-6.jpg", "View"]],
		"villa-b": [["media/s/villa-b-1.jpg", "Pool"], ["media/s/villa-b-2.jpg", "Living room"], ["media/s/villa-b-3.jpg", "Bedroom"], ["media/s/villa-b-4.jpg", "View"], ["media/s/villa-b-5.jpg", "Dining terrace"]],
		"guest-a": [["media/s/guest-1.jpg", "Courtyard"], ["media/s/guest-2.jpg", "Courtyard"], ["media/s/guest-3.jpg", "Lounge"], ["media/s/guest-4.jpg", "Room"], ["media/s/guest-5.jpg", "Breakfast"]],
	};
	const STYLES = { hotel: ["Contemporary", "Art deco touches", "Boutique, warm woods"], apt: ["Scandinavian, light", "Industrial loft", "Mid-century modern"], villa: ["Mediterranean", "Modern minimal", "Rustic stone"], guest: ["Traditional, hand-made tiles", "Family-run, antique pieces"] };
	const AMEN = {
		wifi: ["wifi", "Wi-Fi"], ac: ["snowflake", "Air conditioning"], breakfast: ["coffee", "Breakfast included"], desk: ["concierge-bell", "24 h reception"], pool: ["waves", "Pool"], ppool: ["waves", "Private pool"],
		kitchen: ["cooking-pot", "Kitchen"], washer: ["washing-machine", "Washing machine"], balcony: ["sun", "Balcony"], terrace: ["sun", "Terrace and garden"], selfin: ["key-round", "Self check-in"], parking: ["car", "Parking"], host: ["concierge-bell", "Host on site"], patio: ["sun", "Garden patio"],
	};
	const KIND = { hotel: ["hotel", "Hotel"], apt: ["house", "Apartment"], villa: ["house", "Villa"], guest: ["house", "Guesthouse"] };
	function stayMeta(st) {
		const n = st.name; const h = hashN(st.id);
		const kind = /villa|finca|yal|lodge|manor|mansion|garden house/i.test(n) ? "villa" : /riad|carmen|patio|casa|courtyard|guest/i.test(n) ? "guest" : /loft|studio|flat|apartment|house|beach flat/i.test(n) ? "apt" : "hotel";
		const set = kind === "guest" ? "guest-a" : `${kind}-${h % 2 ? "b" : "a"}`;
		const m = { kind, set, style: STYLES[kind][h % STYLES[kind].length] };
		if (kind === "hotel") Object.assign(m, { stars: st.rating >= 4.8 ? 5 : 4, rooms: 18 + (h % 40), amen: ["wifi", "ac", "breakfast", "desk", "pool"] });
		if (kind === "guest") Object.assign(m, { rooms: 5 + (h % 7), amen: ["wifi", "ac", "breakfast", "patio", "host"] });
		if (kind === "apt") Object.assign(m, { beds: 1 + (h % 2), size: 48 + (h % 40), amen: ["wifi", "ac", "kitchen", "washer", "balcony", "selfin"] });
		if (kind === "villa") Object.assign(m, { beds: 3 + (h % 3), size: 160 + (h % 120), amen: ["wifi", "ac", "ppool", "kitchen", "terrace", "parking"] });
		return m;
	}
	for (const c of Object.values(D.cities)) for (const st of c.stays) { st.meta = stayMeta(st); st.photo = STAY_SETS[st.meta.set][0][0]; }
	const stayPhotos = (st, k) => [...STAY_SETS[st.meta.set], [`media/g/${k}-1.jpg`, "NEIGHBOURHOOD"]];

	/* lightbox */
	const LB = { items: [], i: 0, title: "" };
	function lbPaint() {
		const it = LB.items[LB.i]; if (!it) return;
		const img = $("#lbImg"); img.classList.remove("on"); img.onload = () => img.classList.add("on"); img.src = it[0]; img.alt = it[1] || LB.title;
		$("#lbCap").innerHTML = `${it[1] ? `<b>${esc(it[1])}</b>` : ""}${credit(it[0]) ? `<span>${t("Photo: {x} · Pexels", { x: esc(credit(it[0])) })}</span>` : ""}`;
		$("#lbCount").textContent = `${LB.i + 1} / ${LB.items.length}`;
		$("#lbThumbs").querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", j === LB.i ? "true" : "false"));
		$("#lbThumbs").querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}
	function openGallery(items, start = 0, title = "", info = "") {
		LB.items = items; LB.i = start; LB.title = title; LB.last = document.activeElement;
		const lb = $("#lb");
		$("#lbTitle").textContent = title;
		$("#lbThumbs").innerHTML = items.map(([src, cap], j) => `<button type="button" data-lbi="${j}" aria-label="${esc(cap || title)} ${j + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("");
		$("#lbInfo").innerHTML = info; lb.classList.toggle("has-info", Boolean(info));
		lb.hidden = false; document.body.classList.add("lb-open"); requestAnimationFrame(() => lb.classList.add("on"));
		lbPaint(); $("#lbClose").focus();
	}
	function closeGallery() { const lb = $("#lb"); if (lb.hidden) return; lb.classList.remove("on"); document.body.classList.remove("lb-open"); setTimeout(() => (lb.hidden = true), 200); LB.last?.focus?.(); }
	const lbGo = (d) => { LB.i = (LB.i + d + LB.items.length) % LB.items.length; lbPaint(); };
	function initGallery() {
		const lb = $("#lb");
		lb.addEventListener("click", (e) => {
			if (e.target.closest("#lbClose") || e.target === lb) return closeGallery();
			if (e.target.closest(".lb-nav.prev")) return lbGo(-1); // buttons follow reading order (their arrows flip in Hebrew)
			if (e.target.closest(".lb-nav.next")) return lbGo(1);
			const th = e.target.closest("[data-lbi]"); if (th) { LB.i = +th.dataset.lbi; lbPaint(); }
		});
		document.addEventListener("keydown", (e) => {
			if (lb.hidden) return;
			if (e.key === "Escape") { e.preventDefault(); closeGallery(); }
			if (e.key === "ArrowRight") lbGo(document.dir === "rtl" ? -1 : 1);
			if (e.key === "ArrowLeft") lbGo(document.dir === "rtl" ? 1 : -1);
		});
		let x0 = null; const stage = $("#lbStage");
		stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
		stage.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) lbGo((dx < 0 ? 1 : -1) * (document.dir === "rtl" ? -1 : 1)); });
		document.addEventListener("click", (e) => {
			const cg = e.target.closest("[data-citypics]"); if (cg) { e.stopPropagation(); e.preventDefault(); const k = cg.dataset.citypics; return openGallery(cityPhotos(k), 0, `${D.cities[k].name}, ${D.cities[k].country}`); }
			const sg = e.target.closest("[data-staypics]"); if (sg) { e.stopPropagation(); e.preventDefault(); return openStay(sg.dataset.staypics); }
		}, true);
	}
	function openStay(id) {
		let city = null, st = null; for (const [k, c] of Object.entries(D.cities)) { const x = c.stays.find((y) => y.id === id); if (x) { city = k; st = x; } }
		if (!st) return; const m = st.meta; const c = D.cities[city];
		const items = stayPhotos(st, city).map(([src, cap]) => [src, cap === "NEIGHBOURHOOD" ? t("Around: {x}", { x: st.area }) : t(cap)]);
		const size = m.kind === "hotel" ? t("{n} rooms", { n: m.rooms }) : m.kind === "guest" ? t("{n} rooms, family-run", { n: m.rooms }) : t("{n} bedrooms · sleeps {m} · {s} m²", { n: m.beds, m: m.beds * 2, s: m.size });
		const n = S.plan?.city === city ? S.plan.nights : 3;
		const info = `<div class="si-k"><span class="tag g">${ic(KIND[m.kind][0])}${t(KIND[m.kind][1])}</span>${m.stars ? `<span class="si-stars" aria-label="${esc(t("{n} stars", { n: m.stars }))}">${ICON.star.repeat(m.stars)}</span>` : ""}</div>
			<h3>${esc(st.name)}</h3><p class="si-a">${ic("map-pin")}${esc(st.area)}, ${esc(c.name)} · ${ICON.star} ${st.rating}</p>
			<ul class="si-facts"><li>${ic(m.kind === "hotel" || m.kind === "guest" ? "bed-double" : "ruler")}<span>${size}</span></li><li>${ic("palette")}<span>${t("Design: {x}", { x: t(m.style) })}</span></li><li>${ic("sun")}<span>${esc(st.perk)}</span></li></ul>
			<h4>${t("What’s included")}</h4><ul class="si-amen">${m.amen.map((a) => `<li>${ic(AMEN[a][0])}<span>${t(AMEN[a][1])}</span></li>`).join("")}</ul>
			<div class="si-price"><div><b class="num">${eur(st.nightly)}</b> ${t("per night")}</div><span class="tag ${st.freeCancel ? "g" : "r"}">${t(st.freeCancel ? "Free cancellation" : "Non-refundable")}</span></div>
			<p class="fine">${ICON.info}<span>${t("Fictional stay — photos are illustrative, from Pexels.")}</span></p>`;
		openGallery(items, 0, st.name, info);
	}

	/* ---------------- mobile menu: nothing disappears on small screens ---------------- */
	function renderMenu() {
		const m = $("#menuList"); if (!m) return;
		const wait = TRIPS.filter((tr) => tripState(tripData(tr))[0] === "wait").length;
		m.innerHTML = [
			["home", "search", t("Plan a trip")], ["explore", "compass", t("All destinations")],
			TRIPS.length ? ["trips", "luggage", t("My trips ({n})", { n: TRIPS.length }), wait] : null,
			["acct", "user", ME.signedIn ? t("My profile") : t("Sign in")],
			["rules", "shield-check", t("What Otium may do")], ["notes", "bell", t("Notifications")], ["help", "circle-help", t("Help — talk to a human")],
			["portfolio", "arrow-left", t("Back to portfolio")],
		].filter(Boolean).map(([k, icn, lab, dot]) => `<li><button type="button" data-menu="${k}">${ic(icn, k === "portfolio" ? "dir" : "")}<span>${esc(lab)}</span>${dot ? '<span class="mdot" aria-hidden="true"></span>' : ""}</button></li>`).join("");
		const wb = $("#menuBtn"); if (wb) wb.classList.toggle("has-dot", wait > 0);
	}
	function initMenu() {
		$("#menuBtn").onclick = () => { renderMenu(); openDrawer("menuDrawer"); };
		$("#menuList").addEventListener("click", (e) => {
			const b = e.target.closest("[data-menu]"); if (!b) return; const k = b.dataset.menu;
			closeDrawers();
			setTimeout(() => {
				if (k === "home" || k === "explore" || k === "trips") show(k);
				else if (k === "acct") goAccount();
				else if (k === "rules") openDrawer("rulesDrawer");
				else if (k === "notes") $("#openNotes").click();
				else if (k === "help") openHelp();
				else if (k === "portfolio") location.href = "/#ai-lab";
			}, 280);
		});
		renderMenu();
	}
	/* category rows: swipe on touch, arrows on desktop, faded edges show there is more */
	function initScrollers() {
		document.querySelectorAll(".cats").forEach((row) => {
			if (row.parentElement.classList.contains("cats-wrap")) return;
			const w = document.createElement("div"); w.className = "cats-wrap"; row.before(w); w.append(row);
			w.insertAdjacentHTML("beforeend", `<button type="button" class="cs-nav prev" aria-label="${esc(t("Previous"))}" tabindex="-1">${ic("chevron-left", "dir")}</button><button type="button" class="cs-nav next" aria-label="${esc(t("Next"))}" tabindex="-1">${ic("chevron-right", "dir")}</button>`);
			const upd = () => {
				const max = row.scrollWidth - row.clientWidth; const x = Math.abs(row.scrollLeft);
				w.classList.toggle("can-prev", max > 2 && x > 2); w.classList.toggle("can-next", max > 2 && x < max - 2);
			};
			row.addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); new MutationObserver(upd).observe(row, { childList: true });
			w.querySelectorAll(".cs-nav").forEach((b) => (b.onclick = () => { const dir = b.classList.contains("next") ? 1 : -1; row.scrollBy({ left: dir * (document.dir === "rtl" ? -1 : 1) * row.clientWidth * 0.7, behavior: reduced ? "auto" : "smooth" }); }));
			setTimeout(upd, 50);
		});
	}
	function openGroups() {
		modal(`<h3 id="modalTitle">${t("Groups & companies")}</h3><p>${t("From 10 travellers, a dedicated travel planner builds the trip with you: group fares, several rooms or a whole hotel, meeting rooms, transfers and one invoice. Otium hands over everything it has prepared.")}</p>
			<div class="help-list">
				<a class="help-row" href="tel:${HELP_TEL.replace(/\s/g, "")}"><span class="pi" style="--i:#C2344C;--t:#FBEAED">${ICON.phone}</span><span><b>${t("Call the groups team")}</b><small dir="ltr">${HELP_TEL}</small></span></a>
				<a class="help-row" href="mailto:groups@otium.example?subject=${encodeURIComponent("Group trip")}"><span class="pi" style="--i:#C2344C;--t:#FBEAED">${ICON.mail}</span><span><b>${t("Send a group request")}</b><small>groups@otium.example</small></span></a>
			</div>
			<p class="fine-note">${t("Demo: the number and address are fictional placeholders.")}</p>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Keep 9 or fewer")}</button></div>`, () => {});
	}

	/* ---------------- trip canvas ---------------- */
	function renderTrip() {
		const box = $("#tripCanvas"); const p = S.plan;
		if (!p) {
			box.innerHTML = `<div class="trip-hero"><div class="ph"></div><div class="in"><div><span class="status-tag"><i></i>${t("Starting")}</span><h2>${t("Your trip")}</h2><div class="meta">${t("Otium is reading your request…")}</div></div></div></div><div class="panel block"><div class="skeleton"></div></div><div class="panel block"><div class="skeleton"></div></div>`;
			return;
		}
		const c = D.cities[p.city]; const dates = tripDates(p.nights);
		const k = p.stay ? costs(p) : null;
		const st = S.progress.done ? ["ok", t("Held · ready to go")] : S.progress.pendingHold ? ["wait", t("Waiting for your OK")] : ["", t("Planning")];
		const fl = S.progress.flights === "ready" ? flightOptions(p.city, S.origin, p.travelers) : null;
		const over = k && k.total > p.cap;
		const scale = k ? Math.max(p.cap, k.total) * 1.12 : p.cap * 1.12;
		box.innerHTML = `
		<div class="trip-hero">${pic(c.photo, p.city, c.name)}<button type="button" class="pics-btn big" data-citypics="${p.city}">${ic("images")}<span>${t("Photos ({n})", { n: galN(p.city) })}</span></button><div class="in"><div><span class="status-tag ${st[0]}"><i></i>${st[1]}</span><h2>${c.name}</h2><div class="meta">${fmtDay(dates.out)} → ${fmtDay(dates.back)} · ${P(p.nights, "1 night", "{n} nights")} · ${P(p.travelers, "1 traveller", "{n} travellers")} · ${t("from {o}", { o: esc(on(S.origin)) })}</div></div></div></div>
		${S.progress.done ? doneBanner(k) : ""}
		${S.progress.cancelled && !S.progress.done ? `<div class="panel block draft-note"><b>${t("Bookings cancelled.")}</b> ${t("Your plan is kept as a draft.")} <button class="btn btn-primary btn-sm" data-rebook>${t("Book it again")}</button></div>` : ""}
		<div class="panel budget">
			<div class="budget-top"><div><b class="num">${k ? eur(k.total) : "—"}</b> <span>${t("estimated total")}</span></div><span class="num">${k ? (over ? `<span class="diff">${t("{x} over", { x: eur(k.total - p.cap) })}</span>` : t("{x} left under your cap", { x: eur(p.cap - k.total) })) : t("Calculating…")}</span></div>
			<div class="meter${over ? " over" : ""}"><div class="fill" style="width:${k ? (k.total / scale) * 100 : 0}%"></div><div class="cap" style="left:${(p.cap / scale) * 100}%" data-l="${esc(t("Cap {x}", { x: eur(p.cap) }))}"></div></div>
			${k ? `<div class="split num"><span><i style="background:${over ? "var(--rose)" : "var(--ok)"}"></i>${t("Flights {x}", { x: eur(k.flights) })}</span><span><i style="background:${over ? "#E58A99" : "#7CC9A1"}"></i>${t("Stay {x}", { x: eur(k.stay) })}</span>${k.tickets ? `<span><i style="background:var(--sand-2)"></i>${t("Tickets, est. {x}", { x: eur(k.tickets) })}</span>` : ""}</div>` : ""}
		</div>
		<div class="panel block">
			<div class="block-h"><h3>${t("Flights")}</h3><span class="state ${S.held.flights ? "held" : S.progress.pendingHold ? "pending" : ""}">${S.held.flights ? `${t("Held · {c}", { c: S.held.flights.code })} <button class="linkish" data-cancel="flights">${t("Cancel")}</button>` : t(S.progress.pendingHold ? "Waiting for your OK" : fl ? "Not held yet" : "Searching…")}</span></div>
			${fl ? flightRow(fl[p.flight], c) + (S.held.flights ? `<div class="seat-h">${ic("plane")}<b>${t("Your seats on the plane")}</b></div>${seatMap(p.travelers)}` : "") + altFlights(fl) : '<div class="skeleton"></div>'}
		</div>
		<div class="panel block">
			<div class="block-h"><h3>${t("Stay")}</h3><span class="state ${S.held.stay ? "held" : S.progress.pendingHold ? "pending" : ""}">${S.held.stay ? `${t("Held · {c}", { c: S.held.stay.code })} <button class="linkish" data-cancel="stay">${t("Cancel")}</button>` : t(S.progress.pendingHold ? "Waiting for your OK" : p.stay && S.progress.stay === "ready" ? "Not held yet" : "Searching…")}</span></div>
			${p.stay && S.progress.stay === "ready" ? stayRow(c.stays.find((x) => x.id === p.stay), p) + altStays(c, p) : '<div class="skeleton"></div>'}
		</div>
		<div class="panel block">
			<div class="block-h"><h3>${t("Your days")}</h3><span class="state">${t(S.settings.activities ? "Draft · nothing bought" : "Free days")}</span></div>
			${S.progress.days === "ready" ? `<div class="days">${Array.from({ length: p.nights + 1 }, (_, i) => `<div class="day" style="animation-delay:${i * 70}ms"><b>${t("Day {n}", { n: i + 1 })}</b><ul>${dayPlan(i, c, p).map(([tm, x]) => `<li>${tm ? `<time dir="ltr">${tm}</time>` : ""}<span>${esc(x)}</span></li>`).join("")}</ul></div>`).join("")}</div>` : '<div class="skeleton"></div>'}
		</div>`;
	}
	/* Your days: every activity gets a time slot. Day 1 starts after the flight lands; the last day ends in time for the flight home. */
	const hm = (x) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; };
	const hhmm = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
	const SLOTS = [[570, 750], [840, 1050], [1170, 1320]]; // 09:30–12:30, 14:00–17:30, 19:30–22:00
	function dayPlan(i, c, p) {
		if (!S.settings.activities) return [["", t("Free day — yours to plan")]];
		const acts = c.days[Math.min(i, c.days.length - 1)];
		const fl = flightOptions(p.city, S.origin, p.travelers)[p.flight] || flightOptions(p.city, S.origin, p.travelers)[0];
		const dur = (() => { const m = String(fl.hours).match(/(\d+)h\s*(\d+)?/); return m ? +m[1] * 60 + (+m[2] || 0) : 150; })();
		const out = [];
		let from = 0, until = 1440;
		if (i === 0) { const land = hm(fl.dep) + dur; from = land + 75; out.push([hhmm(land + 60), t("Arrive, check in")]); }
		if (i === p.nights) { const back = hm(["16:20", "19:05", "21:40"][fl.i] || "16:20"); until = back - 150; }
		SLOTS.forEach(([a, b], j) => { if (i === 0 && j === 0) return; if (a >= from && b <= until) out.push([`${hhmm(a)} – ${hhmm(b)}`, acts[j]]); });
		if (i === p.nights) out.push([hhmm(until), t("Head to the airport")]);
		return out;
	}
	function flightRow(f, c) {
		return `<div class="flight"><div class="al">${f.airline[0]}</div><div><div class="route">${esc(on(S.origin))} <span class="line">${ICON.plane}</span> ${c.name}</div><small>${esc(f.airline)} · ${t("departs {d}", { d: f.dep })} · ${t(f.kind)} · ${f.hours}</small><div class="tags"><span class="tag g">${t(f.cabin)}</span><span class="tag">${f.aircraft}</span><span class="tag">${t(f.bags ? "Cabin + checked bag" : "Cabin bag only")}</span></div></div><div class="price num">${eur(f.price)}<small>${t("{x} / person, return", { x: eur(f.pp) })}</small></div></div>${airportInfo(f)}`;
	}
	function altFlights(fl) {
		const p = S.plan; const canEdit = !S.held.flights && !S.progress.done;
		if (!canEdit) return "";
		const open = S.progress.editing;
		return `<details class="toggle-alts" data-alts="flights"${(open && !S.progress.editPicked) || openAlts.has("flights") ? " open" : ""}><summary class="btn btn-text btn-sm">${t("Other flights ({n})", { n: fl.length - 1 })}</summary><div class="alts">${fl.map((f) => `<button class="alt" data-flight="${f.i}" aria-pressed="${f.i === p.flight}"><span><b>${esc(f.airline)}</b> · ${f.dep} · ${t(f.kind)}<small>${t(f.cabin)} · ${f.aircraft} · ${t(f.bags ? "cabin + checked bag" : "cabin bag only")}${f.fits ? "" : t(" · outside your filters")}</small></span><span class="num">${eur(f.price)}</span><span>${t(f.i === p.flight ? "Selected" : "Choose")}</span></button>`).join("")}</div></details>`;
	}
	const openAlts = new Set(); // keeps "Other flights / stays" open across live re-renders
	$("#tripCanvas").addEventListener("toggle", (e) => { const d = e.target.closest?.("[data-alts]"); if (d) openAlts[d.open ? "add" : "delete"](d.dataset.alts); }, true);
	function airportInfo(f) {
		const o = (D.origins.find(([n]) => n === S.origin) || ["", "—"])[1];
		const [hh, mm] = f.dep.split(":").map(Number); const m = (hh * 60 + mm - 120 + 1440) % 1440; const at = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
		const close = (hh * 60 + mm - 45 + 1440) % 1440;
		return `<dl class="fl-info"><div><dt>${t("Airport")}</dt><dd>${esc(on(S.origin))} ${o} · ${t("Terminal {n}", { n: 1 + f.i })}</dd></div><div><dt>${t("Be there by")}</dt><dd>${t("{t} (2 h before)", { t: at })}</dd></div><div><dt>${t("Check-in closes")}</dt><dd>${String(Math.floor(close / 60)).padStart(2, "0")}:${String(close % 60).padStart(2, "0")}</dd></div><div><dt>${t("Gate")}</dt><dd>${t("Shown 24 h before")}</dd></div></dl>`;
	}
	function stayRow(s, p) {
		return `<div class="stay"><button type="button" class="pic" data-staypics="${s.id}" aria-label="${esc(t("Photos and details of {x}", { x: s.name }))}">${pic(s.photo, p.city, s.name)}<span class="pics-n">${ic("images")}${STAY_SETS[s.meta.set].length + 1}</span></button><div><b>${esc(s.name)}</b><br><small>${t(KIND[s.meta.kind][1])}${s.meta.stars ? ` ${"★".repeat(s.meta.stars)}` : ""} · ${esc(s.area)} · ${ICON.star} ${s.rating} · ${esc(s.perk)}</small><div class="tags">${s.freeCancel ? `<span class="tag g">${t("Free cancellation")}</span>` : `<span class="tag r">${t("Non-refundable")}</span>`}<span class="tag">${t("Matches your cap")}</span></div></div><div class="price num">${eur(s.nightly * p.nights)}<small>${t("{x} / night", { x: eur(s.nightly) })}</small></div></div>`;
	}
	function altStays(c, p) {
		if (S.held.stay || S.progress.done) return "";
		return `<details class="toggle-alts" data-alts="stays"${(S.progress.editing && !S.progress.editPicked) || openAlts.has("stays") ? " open" : ""}><summary class="btn btn-text btn-sm">${t("Other stays ({n})", { n: c.stays.length - 1 })}</summary><div class="alts">${c.stays.map((s) => `<div class="alt-row"><button class="alt" data-stay="${s.id}" aria-pressed="${s.id === p.stay}"><span><b>${esc(s.name)}</b> · ${esc(s.area)} · ${ICON.star} ${s.rating}${s.freeCancel ? "" : t(" · non-refundable")}</span><span class="num">${eur(s.nightly * p.nights)}</span><span>${t(s.id === p.stay ? "Selected" : "Choose")}</span></button><button type="button" class="alt-pics" data-staypics="${s.id}" aria-label="${esc(t("Photos and details of {x}", { x: s.name }))}">${ic("images")}</button></div>`).join("")}</div></details>${S.progress.editing ? `<div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="editDone">${t("Done — show me the new total")}</button></div>` : ""}`;
	}
	// Trip ready: bring the page back up to the documents banner (tickets, voucher, invoice).
	function showDone() {
		const go = () => { const b = document.querySelector("#tripCanvas .done-banner"); if (!b) return;
			const head = document.querySelector(".top")?.offsetHeight || 70;
			window.scrollTo({ top: Math.max(0, b.getBoundingClientRect().top + scrollY - head - 24), behavior: reduced ? "auto" : "smooth" });
			b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); };
		setTimeout(go, 350);
	}

	function doneBanner(k) {
		const h = S.held;
		return `<div class="panel done-banner"><div class="check">${ICON.check}</div><div><h3>${t("Your trip is held.")}</h3><p>${h.flights || h.stay ? t("{x} held", { x: eur((h.flights?.amount || 0) + (h.stay?.amount || 0)) }) : t("Nothing held")}${t(" · simulated, nothing charged.")}</p><div class="codes">${h.flights ? `${t("Flight")} <b>${h.flights.code}</b>` : t("Flight released")} · ${h.stay ? `${t("Stay")} <b>${h.stay.code}</b>` : t("Stay released")}</div></div><div class="row">${h.flights && h.data ? `<button class="btn btn-primary btn-ok btn-sm" id="docs">${ICON.ticket} ${t("Tickets & voucher")}</button>` : h.flights ? `<span class="tag">${t("Tickets: send traveller details first")}</span>` : ""}${h.flights || h.stay ? `<button class="btn btn-ghost btn-sm" id="invoice">${ICON.receipt} ${t("Invoice")}</button>` : ""}<button class="btn btn-ghost btn-sm" id="ics">${ICON.cal} ${t("Add to calendar")}</button>${h.flights || h.stay ? `<button class="btn btn-text btn-sm" data-cancel="all">${t("Cancel all bookings")}</button>` : ""}<button class="btn btn-text btn-sm" data-help>${t("Need help?")}</button></div></div>`;
	}
	$("#tripCanvas").addEventListener("click", (e) => {
		const p = S.plan; if (!p) return;
		const f = e.target.closest("[data-flight]"); const s = e.target.closest("[data-stay]");
		if (f || s) {
			const before = costs(p);
			if (f) p.flight = +f.dataset.flight; else p.stay = s.dataset.stay;
			openAlts.delete(f ? "flights" : "stays"); if (S.progress.editing) S.progress.editPicked = true; // close the list, show the choice
			const after = costs(p);
			renderTrip();
			const d = after.total - before.total;
			if (d) toast(t("New total {x} ({d})", { x: eur(after.total), d: (d > 0 ? "+" : "−") + eur(Math.abs(d)) }));
			if (!S.progress.editing && !S.progress.pendingHold && S.status === "done") return;
			if (!S.progress.editing && S.progress.pendingHold) { restartFrom("budget"); }
			return;
		}
		if (e.target.closest("#editDone")) { editResolve?.(); editResolve = null; return; }
		if (e.target.closest("#ics")) return downloadIcs();
		if (e.target.closest("#docs")) return openDocs();
		if (e.target.closest("#invoice")) return downloadInvoice();
	});

	/* ---------------- trip history (read-only receipt) + cancelling bookings ---------------- */
	function renderLog() {
		$("#log").innerHTML = S.log.length ? S.log.map((l) => `<li class="${l.target ? "jump" : ""}" ${l.target ? `data-target="${l.target}" tabindex="0" title="${t("Show this step")}"` : ""}><time>${l.t}</time><div><span class="by">${l.by === "You" ? t("You") : "Otium"}</span><span class="${l.undone ? "undone" : ""}">${esc(l.text)}</span></div><span class="nb"><button type="button" data-logdel="${l.id}" aria-label="${esc(t("Delete"))}" title="${esc(t("Delete"))}">${ic("trash-2")}</button></span></li>`).join("") : `<li class="empty" style="display:block">${t("Nothing yet.")}</li>`;
		const hb = $("#openHistory"); if (hb) hb.lastChild.textContent = t("Trip history ({n})", { n: S.log.length });
		const cl = $("#clearLog"); if (cl) cl.disabled = !S.log.length;
	}
	$("#openHistory").onclick = () => openDrawer("logDrawer");
	// History: delete one line or everything, always with an undo.
	$("#log").addEventListener("click", (e) => {
		const d = e.target.closest("[data-logdel]"); if (!d) return;
		e.stopImmediatePropagation();
		const i = S.log.findIndex((l) => l.id === d.dataset.logdel); if (i < 0) return;
		const [gone] = S.log.splice(i, 1); renderLog();
		toast(t("Removed from the history"), t("Undo"), () => { S.log.splice(Math.min(i, S.log.length), 0, gone); renderLog(); });
	});
	$("#clearLog").onclick = () => {
		if (!S.log.length) return;
		const kept = S.log.splice(0); renderLog();
		toast(t("History cleared"), t("Undo"), () => { S.log.unshift(...kept); renderLog(); });
	};
	$("#log").addEventListener("click", (e) => {
		const li = e.target.closest("li[data-target]"); if (!li) return;
		const step = $(`#step-${li.dataset.target}`); if (!step || $("#trip").hidden) return;
		closeDrawers(); step.classList.remove("folded");
		step.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
		step.classList.add("flash"); setTimeout(() => step.classList.remove("flash"), 1600);
	});
	// Cancel lives on the thing itself: the flight block, the stay block, or “cancel all” on the trip.
	$("#tripCanvas").addEventListener("click", (e) => {
		if (e.target.closest("[data-rebook]")) { S.progress.cancelled = false; restartFrom("hold"); return; }
		const b = e.target.closest("[data-cancel]"); if (!b) return;
		const what = b.dataset.cancel; const H = S.held;
		const parts = what === "all" ? ["flights", "stay"].filter((k) => H[k]) : [what];
		const lost = parts.includes("stay") && H.stay && !H.stay.refundable ? H.stay.amount : 0;
		const amt = parts.reduce((a, k) => a + (H[k]?.amount || 0), 0);
		const title = t(what === "all" ? "Cancel all bookings?" : what === "flights" ? "Cancel the flight?" : "Cancel the stay?");
		const before = parts.map((k) => (k === "flights" ? `${H.flights.airline} ${H.flights.dep}` : H.stay.name)).join(" + ");
		modal(`<h3 id="modalTitle">${title}</h3><p>${lost ? t("The stay is non-refundable: {x} can’t be recovered.", { x: eur(lost) }) : t("Everything is refundable. Your plan stays here as a draft — you can approve it again.")}</p>
			<div class="ba"><div><b>${t("Now")}</b>${esc(before)} · ${t("{x} held", { x: eur(amt) })}</div><span class="arrow">${ICON.arrow}</span><div class="after"><b>${t("After")}</b>${t("Cancelled · {x} back", { x: eur(amt - lost) })}${lost ? t(" · {x} lost", { x: eur(lost) }) : ""}</div></div>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t(parts.length > 1 ? "Keep them" : "Keep it")}</button><button class="btn btn-danger btn-sm" data-m="ok">${t(what === "all" ? "Cancel all" : "Cancel it")}</button></div>`, (r) => {
			if (r !== "ok") return;
			parts.forEach((k) => delete H[k]); if (!H.flights) delete H.data;
			log("You", t(what === "all" ? "Cancelled all bookings" : what === "flights" ? "Cancelled the flight" : "Cancelled the stay"));
			if (!H.flights && !H.stay) { S.progress.done = false; S.progress.cancelled = true; setStatus("waiting", t("Bookings cancelled — plan kept as a draft")); }
			renderTrip(); toast(t(what === "all" ? "All bookings cancelled. Your plan is kept as a draft." : "Cancelled."));
		});
	});

	/* ---------------- permissions drawer ---------------- */
	function renderRules() {
		const st = S.settings;
		const row = (id, title, small, isOn, locked) => `<div class="setting"><div><b>${t(title)}</b><small>${t(small)}</small>${locked ? `<span class="lock">${ICON.lock}${t("Always on in Otium")}</span>` : ""}</div><label class="switch"><input type="checkbox" id="${id}"${isOn ? " checked" : ""}${locked ? " disabled" : ""} aria-label="${esc(t(title))}"><span></span></label></div>`;
		$("#rules").innerHTML = `<p style="margin:0 0 6px;font-size:13px;color:var(--ink-2)">${t("Searching and comparing are automatic. Anything that spends money or shares your details waits for you.")}</p>
			<div class="setting" style="display:block"><b>${t("Default budget cap")}</b><small>${t("Used when you don’t give one. Otium stops instead of going over.")}</small><input class="range" type="range" min="0" max="${CAP_BASE.length - 1}" step="1" value="${capList().indexOf(snapCap(st.cap))}" id="capRange" aria-label="${esc(t("Default budget cap"))}"><div class="num" style="font-weight:700" id="capVal">${eur(st.cap)}</div></div>
			${row("r1", "Ask before any payment", "Holds, bookings and upgrades.", true, true)}
			${row("r2", "Ask before sharing my details", "Names, passports, phone, email.", true, true)}
			${row("r3", "Ask again if a price goes up", "Even by €1 after you approved.", true, true)}
			${row("refundable", "Prefer refundable stays", "Picks free cancellation when one fits.", st.refundable, false)}
			${row("activities", "Draft activities for me", "Off = Otium leaves your days free.", st.activities, false)}`;
		$("#capRange").oninput = (e) => { st.cap = capList()[+e.target.value]; $("#capVal").textContent = eur(st.cap); };
		$("#refundable").onchange = (e) => { st.refundable = e.target.checked; log("You", t(st.refundable ? "Turned on “{x}”" : "Turned off “{x}”", { x: t("Prefer refundable stays") })); };
		$("#activities").onchange = (e) => { st.activities = e.target.checked; log("You", t(st.activities ? "Turned on “{x}”" : "Turned off “{x}”", { x: t("Draft activities for me") })); if (S.plan && S.progress.days === "ready") renderTrip(); };
	}

	/* ---------------- chrome: drawers, modal, toast, states ---------------- */
	let lastFocus = null;
	function openDrawer(id) {
		lastFocus = document.activeElement;
		if (id === "rulesDrawer") renderRules();
		const d = $("#" + id); const sc = $("#scrim");
		sc.hidden = false; requestAnimationFrame(() => { sc.classList.add("on"); d.classList.add("on"); });
		d.setAttribute("aria-hidden", "false"); d.querySelector("[data-close]").focus();
	}
	function closeDrawers() {
		document.querySelectorAll(".drawer.on").forEach((d) => { d.classList.remove("on"); d.setAttribute("aria-hidden", "true"); });
		const sc = $("#scrim"); sc.classList.remove("on"); setTimeout(() => (sc.hidden = true), 250);
		lastFocus?.focus?.();
	}
	$("#openRules").onclick = () => openDrawer("rulesDrawer");
	document.addEventListener("click", (e) => {
		if (e.target.closest("[data-close]") || e.target === $("#scrim")) { if (!$("#modal").hidden) closeModal("cancel"); else closeDrawers(); }
		const o = e.target.closest("[data-open]"); if (o) openDrawer(o.dataset.open);
		const g = e.target.closest("[data-go]"); if (g) show(g.dataset.go);
	});
	document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawers(); closeModal(); } });

	let modalCb = null;
	function modal(html, cb) {
		const m = $("#modal"); $("#modalBox").innerHTML = html; $("#modalBox").classList.remove("wide"); modalCb = cb;
		m.hidden = false; $("#scrim").hidden = false;
		requestAnimationFrame(() => { m.classList.add("on"); $("#scrim").classList.add("on"); });
		$("#modalBox").querySelector("[data-m]")?.focus();
	}
	function closeModal(r) {
		const m = $("#modal"); if (m.hidden) return;
		m.classList.remove("on"); setTimeout(() => (m.hidden = true), 250);
		if (!$(".drawer.on")) { $("#scrim").classList.remove("on"); setTimeout(() => ($("#scrim").hidden = true), 250); }
		const cb = modalCb; modalCb = null; cb?.(r);
	}
	$("#modal").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (b) closeModal(b.dataset.m); else if (e.target === $("#modal")) closeModal("cancel"); });

	/* notification history — every toast is kept, can be pinned, deleted or cleared */
	const NOTES = []; let unread = 0;
	function note(msg, kind = "info") {
		NOTES.unshift({ id: Math.random().toString(36).slice(2), t: new Date().toTimeString().slice(0, 5), msg, kind, pinned: false });
		unread++; renderNotes();
	}
	function renderNotes() {
		const b = $("#notifBadge"); b.textContent = unread > 9 ? "9+" : unread; b.hidden = !unread;
		const ul = $("#notes"); if (!ul) return;
		const pinned = NOTES.filter((n) => n.pinned), rest = NOTES.filter((n) => !n.pinned);
		const row = (n) => `<li class="${n.pinned ? "pinned" : ""}"><time>${n.t}</time><span>${esc(n.msg)}</span><span class="nb"><button type="button" data-pin="${n.id}" aria-pressed="${n.pinned}" aria-label="${t(n.pinned ? "Unpin" : "Keep")}" title="${t(n.pinned ? "Unpin" : "Keep — survives Clear all")}">${ICON.pin}</button><button type="button" data-del="${n.id}" aria-label="${t("Delete")}" title="${t("Delete")}">${ICON.x}</button></span></li>`;
		ul.innerHTML = NOTES.length ? (pinned.length ? `<li class="grp">${t("Kept")}</li>${pinned.map(row).join("")}` : "") + (rest.length ? `<li class="grp">${t("Recent")}</li>${rest.map(row).join("")}` : "") : `<li class="empty">${t("No notifications yet. Messages that pop up at the bottom of the screen are kept here.")}</li>`;
		$("#clearNotes").disabled = !rest.length;
	}
	document.addEventListener("click", (e) => {
		const p = e.target.closest("[data-pin]"), d = e.target.closest("[data-del]");
		if (p) { const n = NOTES.find((x) => x.id === p.dataset.pin); n.pinned = !n.pinned; renderNotes(); }
		if (d) { NOTES.splice(NOTES.findIndex((x) => x.id === d.dataset.del), 1); renderNotes(); }
		if (e.target.closest("#clearNotes")) { for (let i = NOTES.length - 1; i >= 0; i--) if (!NOTES[i].pinned) NOTES.splice(i, 1); renderNotes(); }
	});
	$("#openNotes").onclick = () => { unread = 0; renderNotes(); openDrawer("notesDrawer"); };

	let toastT;
	function toast(msg, action, fn) {
		note(msg);
		const el = $("#toast");
		el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ""}`;
		if (action) el.querySelector("button").onclick = () => { fn(); el.classList.remove("on"); };
		el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 4200);
	}

	const STATES = [
		["normal", "Everything goes right", "A clear request. Watch Otium plan the trip, then stop twice: before it pays, and before it shares your details.", "A long weekend in Lisbon for two, food and viewpoints, under €900"],
		["vague", "You don’t know where to go yet", "Otium asks one simple question instead of guessing or showing a long form.", "Somewhere warm next month"],
		["outside", "A city Otium doesn’t cover", "It says so honestly and suggests places it can plan — it never pretends.", "A week in Tokyo for two"],
		["overbudget", "The trip costs too much", "Otium stops at your budget cap and lets you choose how to save. It never decides with your money.", "Rome for 3 nights with my partner, museums"],
		["soldout", "A flight sells out while booking", "Nothing is charged. Otium finds a plan B and asks again, because the price changed.", "Barcelona for 3 nights for two, beach and tapas, €1,200"],
		["offline", "The AI is down", "Otium switches to basic matching and tells you to double-check what it understood.", "Amsterdam for 2 nights, solo, museums"],
	];
	const SC_COL = { normal: "var(--lagoon)", vague: "#8C847A", outside: "#8C847A", overbudget: "var(--rose)", soldout: "var(--rose)", offline: "var(--amber)" };
	function renderScen() {
		$("#scenList").innerHTML = STATES.map(([k, title, sm]) => `<div class="case" aria-current="${Boolean(S.text && S.scenario === k)}"><b>${t(title)}</b><p>${esc(t(sm))}</p><button type="button" class="btn btn-ghost btn-sm" data-state="${k}">${t("Run this case")} ${ICON.arrow}</button></div>`).join("");
	}
	$("#scenList").onclick = (e) => {
		const b = e.target.closest("[data-state]"); if (!b) return;
		const st = STATES.find((x) => x[0] === b.dataset.state);
		closeDrawers(); $("#ask").value = t(st[3]); start(t(st[3]), false, st[0], st);
	};
	$("#openCases").onclick = () => { renderScen(); openDrawer("casesDrawer"); };

	$("#steps").addEventListener("click", (e) => { const b = e.target.closest(".peek"); if (!b) return; const li = b.closest(".step"); const open = li.classList.toggle("folded") === false; b.setAttribute("aria-expanded", open); });
	$("#discardTrip").onclick = () => {
		const heldAmt = (S.held.flights?.amount || 0) + (S.held.stay?.amount || 0);
		modal(`<h3 id="modalTitle">${t("Cancel this trip?")}</h3><p>${heldAmt ? t("Otium will release everything it holds first. ") + t(S.held.stay && !S.held.stay.refundable ? "The stay is non-refundable, so that part can’t be recovered." : "Nothing is lost.") : t("Nothing has been booked yet, so nothing is lost.")}</p>
			<div class="ba"><div><b>${t("Now")}</b>${D.cities[S.plan?.city]?.name || t("Draft")} · ${heldAmt ? t("{x} held", { x: eur(heldAmt) }) : t("draft")}</div><span class="arrow">${ICON.arrow}</span><div class="after"><b>${t("After")}</b>${t("No trip")} · ${heldAmt ? t("{x} released", { x: eur(heldAmt) }) : t("back to start")}</div></div>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Keep it")}</button><button class="btn btn-danger btn-sm" data-m="ok">${t("Cancel this trip")}</button></div>`, (r) => {
			if (r !== "ok") return;
			const tr = activeTrip; clearActive(); if (tr) dropTrip(tr);
			show("home"); toast(t("Trip discarded. Nothing is held."));
		});
	};
	const HELP_TEL = "+44 20 7946 0123"; // UK range reserved for fiction — never a real line
	function openHelp() {
		const p = S.plan; const ref = S.held.flights?.code || S.held.stay?.code;
		modal(`<h3 id="modalTitle">${t("Talk to a human")}</h3><p>${t("Otium’s travel team can fix anything the agent can’t — 24/7, in English, French, Spanish, Italian and Hebrew.")}${ref ? `${t(" Have your booking code ready: ")}<b>${ref}</b>.` : ""}</p>
			<div class="help-list">
				<a class="help-row" href="tel:${HELP_TEL.replace(/\s/g, "")}"><span class="pi" style="--i:#C2344C;--t:#FBEAED">${ICON.phone}</span><span><b>${t("Call us")}</b><small dir="ltr">${t("{tel} · average wait 2 min", { tel: HELP_TEL })}</small></span></a>
				<button class="help-row" type="button" data-m="chat"><span class="pi" style="--i:#5146C9;--t:#ECEBFB">${ICON.chat}</span><span><b>${t("Chat with an agent")}</b><small>${t("A person joins this trip and sees what Otium did")}</small></span></button>
				<a class="help-row" href="mailto:help@otium.example?subject=${encodeURIComponent("Trip help" + (ref ? " " + ref : ""))}"><span class="pi" style="--i:#C2344C;--t:#FBEAED">${ICON.mail}</span><span><b>${t("Email")}</b><small>${t("help@otium.example · reply within 4 h")}</small></span></a>
			</div>
			<p class="fine-note">${t("Demo: the number and address are fictional placeholders.")}</p>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Close")}</button></div>`, (r) => {
			if (r === "chat") { log("You", t("Asked for a human agent")); toast(t("A travel agent will join in about 2 minutes (demo).")); }
		});
	}
	document.addEventListener("click", (e) => { if (e.target.closest("[data-help]")) openHelp(); });
	// "Waiting for your OK" bar: only when the decision card is off-screen; one tap brings you to it.
	const pendingCard = () => [...document.querySelectorAll("#steps .card.ask, #steps .card.warn")].pop();
	function updateNY() {
		const c = pendingCard(); let off = false;
		if (c && S.status === "waiting" && !$("#trip").hidden) { const r = c.getBoundingClientRect(); off = r.bottom < 70 || r.top > innerHeight - 40; }
		$("#needsYou").classList.toggle("on", off);
	}
	let nyRaf = 0; addEventListener("scroll", () => { cancelAnimationFrame(nyRaf); nyRaf = requestAnimationFrame(updateNY); }, { passive: true });
	function goToCard() {
		const c = pendingCard(); if (!c) return;
		c.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
		c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash");
	}
	$("#needsYou").onclick = goToCard;
	/* portfolio cases: say what to watch, then point at the moment it happens */
	const WATCH = {
		normal: "Otium plans on its own, then stops twice: before it pays, and before it shares your details. Watch for the amber cards on the left.",
		vague: "Your request names no place. Instead of guessing, Otium asks one question — pick a city from the photos.",
		outside: "You asked for Tokyo, which Otium doesn’t cover. It says so honestly and suggests cities it can plan.",
		overbudget: "Your budget is set to €400 — too low for Rome. Otium stops at the cap instead of going over and asks how you want to save.",
		soldout: "Approve the payment when asked: the flight will sell out during booking. Watch Otium charge nothing, find a plan B and ask again for the new price.",
		offline: "The AI is switched off for this case. Otium falls back to simple matching and shows a warning so you double-check what it understood.",
	};
	function renderCase() {
		const b = $("#caseBanner");
		if (!S.case) { b.hidden = true; return; }
		b.hidden = false;
		b.innerHTML = `<div><span class="case-tag">${t("Case")}</span><b>${esc(t(S.case[1]))}</b><p>${esc(t(WATCH[S.case[0]]))}</p></div><button type="button" class="btn btn-ghost btn-sm" id="caseExit">${t("Exit case")}</button>`;
		$("#caseExit").onclick = () => { S.case = null; renderCase(); };
	}
	function caseMoment() {
		const b = $("#caseBanner"); if (b.hidden || b.querySelector(".moment")) return;
		b.insertAdjacentHTML("beforeend", `<button type="button" class="moment">${ic("hand")} ${t("This is the moment — see the card")}</button>`);
		b.querySelector(".moment").onclick = goToCard;
		setTimeout(goToCard, 350);
	}
	$("#pauseBtn").onclick = () => {
		S.paused = !S.paused;
		$("#pauseBtn").textContent = t(S.paused ? "Resume" : "Pause");
		if (S.paused) { S._prev = [S.status, $("#agentStatus").textContent]; setStatus("paused", t("Paused — nothing happens until you resume")); log("You", t("Paused Otium")); }
		else { setStatus(...(S._prev || ["working", t("Working on it…")])); log("You", t("Resumed Otium")); S.resume?.(); S.resume = null; }
	};

	$("#newTrip").onclick = () => show("home");
	$("#tripsList").addEventListener("click", (e) => {
		const card = e.target.closest(".tcard"); if (!card) return;
		const tr = TRIPS.find((x) => x.id === +card.dataset.trip); if (!tr) return;
		if (e.target.closest("[data-tdel]")) return askDropTrip(tr);
		openTrip(tr.id);
	});
	addEventListener("popstate", () => show(typeof history.state?.otium === "string" ? history.state.otium : "home", true));
	let curView = "home";
	function show(v, fromPop) {
		if (v === "trip" && !S.plan && !S.text) v = "home";
		const fresh = v === "home" && curView !== "home";
		if (fresh) $("#ask").value = ""; // a new search starts empty
		curView = v;
		$("#home").hidden = v !== "home"; $("#trip").hidden = v !== "trip"; $("#explore").hidden = v !== "explore"; $("#trips").hidden = v !== "trips"; $("#profile").hidden = v !== "profile";
		if (v === "explore") renderExplore();
		if (fresh) fitAsk();
		if (v === "profile") renderProfile();
		if (v === "trips") { const L = $("#tripsList"); L.__html = null; L.classList.add("fresh"); renderTrips(); setTimeout(() => L.classList.remove("fresh"), 700); }
		document.querySelectorAll(".nav [data-go]").forEach((b) => b.setAttribute("aria-current", b.dataset.go === v ? "page" : "false"));
		renderTripsNav();
		updateNY();
		window.scrollTo({ top: 0, behavior: "auto" });
		try {
			if (!fromPop && (history.state?.otium || "home") !== v) history.pushState({ otium: v }, "");
		} catch { /* sandboxed previews block history — the buttons still work */ }
		renderScen();
	}
	addEventListener("scroll", () => $("#top").classList.toggle("scrolled", scrollY > 4), { passive: true });

	function downloadIcs() {
		const p = S.plan; const d = tripDates(p.nights); const c = D.cities[p.city];
		const f = (x) => x.toISOString().slice(0, 10).replace(/-/g, "");
		const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Otium demo//EN", "BEGIN:VEVENT", `UID:${Date.now()}@otium.demo`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${f(d.out)}`, `DTEND;VALUE=DATE:${f(d.back)}`, `SUMMARY:${c.name} trip (Otium demo)`, "DESCRIPTION:Simulated booking — nothing was charged.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
		const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = `otium-${p.city}.ics`; a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 2000);
	}

	/* ---------------- travel documents (demo, never valid for travel) ---------------- */
	function legs() {
		const p = S.plan; const k = costs(p); const c = D.cities[p.city]; const d = tripDates(p.nights);
		const oc = (D.origins.find(([n]) => n === S.origin) || ["", "XXX"])[1];
		const add = (tm, h) => { const [hh, mm] = tm.split(":").map(Number); const mt = String(h).match(/(\d+)\s*h\s*(\d+)?/) || [0, 2, 0]; const ah = +mt[1], am = +(mt[2] || 0); const m = (hh * 60 + mm + ah * 60 + (am || 0) + 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
		const board = (tm) => { const [hh, mm] = tm.split(":").map(Number); const m = hh * 60 + mm - 40; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
		const no = (n) => `${k.fl.airline.slice(0, 2).toUpperCase()} ${n}`;
		const retDep = ["16:20", "19:05", "21:40"][k.fl.i];
		return [
			{ dir: "Outbound", from: oc, fromN: S.origin, to: c.code, toN: c.name, date: d.out, dep: k.fl.dep, arr: add(k.fl.dep, k.fl.hours), board: board(k.fl.dep), flight: no(400 + k.fl.i * 37), gate: "B" + (12 + k.fl.i) },
			{ dir: "Return", from: c.code, fromN: c.name, to: oc, toN: S.origin, date: d.back, dep: retDep, arr: add(retDep, k.fl.hours), board: board(retDep), flight: no(401 + k.fl.i * 37), gate: "A" + (4 + k.fl.i) },
		].map((l) => ({ ...l, cabin: k.fl.cabin, bags: k.fl.bags ? "Cabin + hold" : "Cabin only", airline: k.fl.airline, aircraft: k.fl.aircraft, code: S.held.flights.code }));
	}
	const seat = (n) => `${{ Business: 2, "Premium economy": 8 }[costs(S.plan).fl.cabin] || 14}${"ABCDEF"[n % 6]}`;
	const seatKind = (letter) => ("AF".includes(letter) ? "Window seat" : "CD".includes(letter) ? "Aisle seat" : "Middle seat");
	/* Seat map: three rows around the travellers' row, 3-3 cabin, their seats in blue. */
	function seatMap(travelers) {
		const seats = Array.from({ length: Math.min(travelers, 6) }, (_, n) => seat(n));
		const row = parseInt(seats[0], 10), taken = new Set(seats.map((x) => x.replace(/\d+/, "")));
		const W = 22, H = 20, gap = 4, aisle = 22, x0 = 40, y0 = 26;
		const colX = (i) => x0 + i * (W + gap) + (i > 2 ? aisle : 0);
		let g = "";
		"ABCDEF".split("").forEach((L, i) => { g += `<text x="${colX(i) + W / 2}" y="16" class="sm-l">${L}</text>`; });
		[row - 1, row, row + 1].forEach((r, j) => {
			const y = y0 + j * (H + 8);
			g += `<text x="24" y="${y + 14}" class="sm-r">${r}</text>`;
			"ABCDEF".split("").forEach((L, i) => { const on = r === row && taken.has(L); g += `<rect x="${colX(i)}" y="${y}" width="${W}" height="${H}" rx="5" class="${on ? "sm-on" : "sm-s"}"/>${on ? `<text x="${colX(i) + W / 2}" y="${y + 14}" class="sm-t">${L}</text>` : ""}`; });
		});
		const w = colX(5) + W + 14, h = y0 + 3 * (H + 8) + 2;
		g = `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="16" class="sm-f"/><line x1="8" y1="${y0}" x2="8" y2="${h - 12}" class="sm-w"/><line x1="${w - 8}" y1="${y0}" x2="${w - 8}" y2="${h - 12}" class="sm-w"/>` + g;
		const who = (n) => (n === 0 && ME.first ? fullName() : t("Traveller {n}", { n: n + 1 }));
		return `<div class="seatmap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t("Your seats on the plane"))}">${g}</svg><ul>${seats.map((x, n) => `<li><b>${x}</b><span>${esc(who(n))}</span><em>${t(seatKind(x.slice(-1)))}</em></li>`).join("")}</ul></div>`;
	}
	function bars(seed) {
		let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		const out = []; for (let i = 0; i < 46; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(1 + (h >> 16) % 3); }
		return out;
	}
	function passHtml(l, n) {
		let x = 0; const b = bars(l.code + l.flight + n).map((w, i) => { const r = i % 2 ? "" : `<rect x="${x}" y="0" width="${w}" height="56"/>`; x += w + 1; return r; }).join("");
		return `<div class="pass"><div class="pass-main">
			<div class="pass-top"><span class="al">${l.airline[0]}</span><b>${esc(l.airline)}</b><span class="pass-dir">${t(l.dir)} · ${t("E-ticket")}</span></div>
			<div class="pass-route"><div><big>${l.from}</big><small>${esc(l.fromN)}</small><em>${l.dep}</em></div><div class="pass-plane">${ICON.plane}<small>${l.flight}</small></div><div><big>${l.to}</big><small>${esc(l.toN)}</small><em>${l.arr}</em></div></div>
			<dl class="pass-grid"><div><dt>${t("Passenger")}</dt><dd>${n === 0 && ME.first ? esc(fullName()) : t("Traveller {n}", { n: n + 1 })}</dd></div><div><dt>${t("Date")}</dt><dd>${fmtDay(l.date)}</dd></div><div><dt>${t("Boarding")}</dt><dd>${l.board}</dd></div><div><dt>${t("Gate")}</dt><dd>${l.gate}</dd></div><div><dt>${t("Seat")}</dt><dd>${seat(n)}</dd></div><div><dt>${t("Cabin")}</dt><dd>${t(l.cabin)}</dd></div><div><dt>${t("Bags")}</dt><dd>${t(l.bags)}</dd></div><div><dt>${t("Booking")}</dt><dd>${l.code}</dd></div></dl>
		</div><div class="pass-stub"><svg viewBox="0 0 ${x} 56" preserveAspectRatio="none" aria-hidden="true">${b}</svg><b>${l.code}</b><small>${t("DEMO · NOT VALID FOR TRAVEL")}</small></div></div>`;
	}
	function openDocs() {
		const p = S.plan; const L = legs(); const k = costs(p); const d = tripDates(p.nights);
		modal(`<h3 id="modalTitle">${t("Your travel documents")}</h3><p>${P(p.travelers, "1 traveller", "{n} travellers")} · ${t("{n} flights each", { n: L.length })}${S.held.stay ? t(" · 1 hotel voucher") : ""}${t(". The PDF has every pass, one page per traveller.")}</p>
			<div class="docs"><div class="pass-pick"><div class="chips" role="group" aria-label="${esc(t("Traveller"))}">${Array.from({ length: p.travelers }, (_, n) => `<button type="button" class="chip" data-pt="${n}" aria-pressed="${n === 0}">${esc(n === 0 && ME.first ? fullName() : t("Traveller {n}", { n: n + 1 }))}</button>`).join("")}</div><div class="chips" role="group" aria-label="${esc(t("Flight"))}">${L.map((l, j) => `<button type="button" class="chip" data-pl="${j}" aria-pressed="${j === 0}">${t(l.dir)} · ${l.from}–${l.to}</button>`).join("")}</div><small>${t("{n} boarding passes in all", { n: p.travelers * L.length })}</small></div><div id="passBox">${passHtml(L[0], 0)}</div><div class="voucher"><span class="pass-dir">${t("Your seats on the plane")}</span>${seatMap(p.travelers)}</div>
			${S.held.stay ? `<div class="voucher"><div><span class="pass-dir">${t("Hotel voucher")}</span><b>${esc(k.st.name)}</b><small>${esc(k.st.area)}, ${D.cities[p.city].name} · ${ICON.star} ${k.st.rating}</small></div><dl class="pass-grid"><div><dt>${t("Check-in")}</dt><dd>${fmtDay(d.out)} · 15:00</dd></div><div><dt>${t("Check-out")}</dt><dd>${fmtDay(d.back)} · 11:00</dd></div><div><dt>${t("Guests")}</dt><dd>${p.travelers}</dd></div><div><dt>${t("Booking")}</dt><dd>${S.held.stay.code}</dd></div></dl></div>` : ""}</div>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Close")}</button><button class="btn btn-ghost btn-sm" data-m="inv">${ICON.receipt} ${t("Download invoice")}</button><button class="btn btn-primary btn-ok btn-sm" data-m="pdf">${ICON.ticket} ${t("Download PDF")}</button></div>`, (r) => { if (r === "pdf") downloadPdf(); if (r === "inv") downloadInvoice(); });
		$("#modalBox").classList.add("wide");
		const pick = { n: 0, j: 0 };
		$("#modalBox").querySelector(".pass-pick").onclick = (e) => {
			const a = e.target.closest("[data-pt]"), b = e.target.closest("[data-pl]"); if (!a && !b) return;
			if (a) pick.n = +a.dataset.pt; if (b) pick.j = +b.dataset.pl;
			$("#modalBox").querySelectorAll("[data-pt]").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.pt === pick.n)));
			$("#modalBox").querySelectorAll("[data-pl]").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.pl === pick.j)));
			$("#passBox").innerHTML = passHtml(L[pick.j], pick.n);
		};
	}
	function loadPdf() {
		if (window.jspdf) return Promise.resolve(window.jspdf);
		return new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "vendor/jspdf.umd.min.js"; sc.onload = () => res(window.jspdf); sc.onerror = rej; document.head.append(sc); });
	}
	async function downloadPdf() {
		toast(t("Preparing your PDF…"));
		let lib; try { lib = await loadPdf(); } catch { toast(t("Couldn’t load the PDF tool. Try again.")); return; }
		const p = S.plan; const L = legs(); const k = costs(p); const d = tripDates(p.nights);
		const doc = new lib.jsPDF({ unit: "mm", format: "a4" });
		const ink = [34, 34, 34], grey = [106, 106, 106], teal = [194, 52, 76], line = [221, 221, 221];
		const pass = (l, n, y) => {
			doc.setDrawColor(...line); doc.setFillColor(255, 255, 255); doc.roundedRect(15, y, 180, 92, 4, 4, "FD");
			doc.setFillColor(...teal); doc.roundedRect(15, y, 180, 14, 4, 4, "F"); doc.rect(15, y + 8, 180, 6, "F");
			doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(l.airline, 22, y + 9.5);
			doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`${l.dir.toUpperCase()} · E-TICKET · OTIUM`, 188, y + 9.5, { align: "right" });
			doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.text(l.from, 22, y + 34); doc.text(l.to, 112, y + 34);
			doc.setFontSize(11); doc.text(l.dep, 22, y + 41); doc.text(l.arr, 112, y + 41);
			doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...grey); doc.text(l.fromN, 22, y + 46); doc.text(l.toN, 112, y + 46);
			doc.setDrawColor(...grey); doc.setLineDashPattern([1, 1], 0); doc.line(52, y + 30, 106, y + 30); doc.setLineDashPattern([], 0); doc.text(l.flight, 79, y + 27, { align: "center" });
			const f = [["PASSENGER", n === 0 && ME.first ? fullName() : `Traveller ${n + 1}`], ["DATE", fmtDay(l.date)], ["BOARDING", l.board], ["GATE", l.gate], ["SEAT", seat(n)], ["CABIN", l.cabin], ["BAGS", l.bags], ["BOOKING", l.code]];
			f.forEach(([a, b], i) => { const x = 22 + (i % 4) * 34, yy = y + 58 + Math.floor(i / 4) * 14; doc.setFontSize(7); doc.setTextColor(...grey); doc.text(a, x, yy); doc.setFontSize(10); doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.text(String(b), x, yy + 5); doc.setFont("helvetica", "normal"); });
			doc.setDrawColor(...line); doc.setLineDashPattern([2, 2], 0); doc.line(160, y + 16, 160, y + 90); doc.setLineDashPattern([], 0);
			let bx = 165; doc.setFillColor(...ink); bars(l.code + l.flight + n).forEach((w, i) => { if (!(i % 2)) doc.rect(bx, y + 22, w * 0.28, 44, "F"); bx += (w + 1) * 0.28; });
			doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text(l.code, 177.5, y + 74, { align: "center" }); doc.setFont("helvetica", "normal");
			doc.setFontSize(6); doc.setTextColor(180, 67, 47); doc.text("DEMO - NOT VALID", 177.5, y + 80, { align: "center" }); doc.text("FOR TRAVEL", 177.5, y + 83, { align: "center" });
		};
		for (let n = 0; n < p.travelers; n++) {
			if (n) doc.addPage();
			doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...ink); doc.text("otium", 15, 18);
			doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...grey); doc.text(`Travel documents · Traveller ${n + 1} of ${p.travelers} · ${D.cities[p.city].name}`, 195, 18, { align: "right" });
			pass(L[0], n, 28); pass(L[1], n, 128);
			doc.setFontSize(8); doc.setTextColor(...grey); doc.text("Otium is a fictional demo by David Bitan. Nothing was booked or charged. Need help? +44 20 7946 0123 (fictional).", 15, 236);
		}
		if (S.held.stay) {
			doc.addPage();
			doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...ink); doc.text("otium", 15, 18);
			doc.setDrawColor(...line); doc.roundedRect(15, 28, 180, 70, 4, 4, "S");
			doc.setFontSize(9); doc.setTextColor(...teal); doc.text("HOTEL VOUCHER", 22, 40);
			doc.setFontSize(20); doc.setTextColor(...ink); doc.text(k.st.name, 22, 52);
			doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...grey); doc.text(`${k.st.area}, ${D.cities[p.city].name} · ${k.st.perk}`, 22, 59);
			[["CHECK-IN", `${fmtDay(d.out)} · 15:00`], ["CHECK-OUT", `${fmtDay(d.back)} · 11:00`], ["GUESTS", String(p.travelers)], ["BOOKING", S.held.stay.code], ["NIGHTS", String(p.nights)], ["CANCELLATION", k.st.freeCancel ? "Free until 48 h before" : "Non-refundable"]].forEach(([a, b], i) => {
				const x = 22 + (i % 3) * 58, yy = 72 + Math.floor(i / 3) * 13; doc.setFontSize(7); doc.setTextColor(...grey); doc.text(a, x, yy); doc.setFontSize(10); doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.text(b, x, yy + 5); doc.setFont("helvetica", "normal");
			});
			doc.setFontSize(8); doc.setTextColor(...grey); doc.text("Demo voucher - not valid for a real stay.", 15, 108);
		}
		doc.save(`otium-${p.city}-documents.pdf`);
		log("You", t("Downloaded tickets and voucher (PDF)"));
	}

	async function downloadInvoice() {
		const p = S.plan, h = S.held; if (!p || !(h.flights || h.stay)) return;
		toast(t("Preparing your invoice…"));
		let lib; try { lib = await loadPdf(); } catch { toast(t("Couldn’t load the PDF tool. Try again.")); return; }
		const k = costs(p), L = legs(), d = tripDates(p.nights), city = D.cities[p.city].name;
		const doc = new lib.jsPDF({ unit: "mm", format: "a4" });
		const ink = [34, 34, 34], grey = [106, 106, 106], red = [194, 52, 76], green = [30, 138, 90], line = [221, 221, 221];
		const money = (n) => cur()[0] + " " + Number(n * cur()[1]).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		const today = new Date(), iso = (x) => x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
		const no = `OT-${today.getFullYear()}-${(h.flights || h.stay).code}`;
		doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...red); doc.text("otium", 15, 22);
		doc.setFontSize(18); doc.setTextColor(...ink); doc.text("INVOICE", 195, 22, { align: "right" });
		doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...grey);
		doc.text(["Otium Travel (fictional company)", "1 Demo Street, London", "help@otium.example"], 15, 30);
		[["Invoice no.", no], ["Date", iso(today)], ["Status", "PAID (simulated)"]].forEach(([a, b], i) => { doc.setTextColor(...grey); doc.text(a, 150, 30 + i * 5); doc.setTextColor(...(i === 2 ? green : ink)); doc.setFont("helvetica", "bold"); doc.text(b, 195, 30 + i * 5, { align: "right" }); doc.setFont("helvetica", "normal"); });
		doc.setDrawColor(...line); doc.line(15, 50, 195, 50);
		doc.setFontSize(8); doc.setTextColor(...grey); doc.text("BILLED TO", 15, 58); doc.text("TRIP", 110, 58);
		doc.setFontSize(10); doc.setTextColor(...ink);
		const who = [fullName() || "Traveller 1", ME.street, [ME.zip, ME.city].filter(Boolean).join(" "), ME.country, ME.email].filter(Boolean);
		doc.text(who, 15, 64);
		doc.text([`${city} · ${p.travelers} traveller${p.travelers > 1 ? "s" : ""}`, `${iso(d.out)} - ${iso(d.back)}`, `${p.nights} night${p.nights > 1 ? "s" : ""}`], 110, 64);
		let y = 96;
		doc.setFillColor(247, 247, 247); doc.rect(15, y - 6, 180, 9, "F");
		doc.setFontSize(8); doc.setTextColor(...grey); doc.text("DESCRIPTION", 18, y); doc.text("BOOKING", 128, y); doc.text("AMOUNT", 192, y, { align: "right" });
		y += 10; doc.setFontSize(10);
		const row = (a, sub, c, amt) => { doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.text(a, 18, y); doc.setFont("helvetica", "normal"); doc.text(c, 128, y); doc.text(money(amt), 192, y, { align: "right" }); doc.setFontSize(8.5); doc.setTextColor(...grey); doc.text(sub, 18, y + 5); doc.setFontSize(10); y += 13; doc.setDrawColor(...line); doc.line(15, y - 5, 195, y - 5); };
		if (h.flights) row(`Return flights · ${h.flights.airline}`, `${L[0].from} > ${L[0].to} ${L[0].flight} · ${L[1].from} > ${L[1].to} ${L[1].flight} · ${p.travelers} passenger${p.travelers > 1 ? "s" : ""}`, h.flights.code, h.flights.amount);
		if (h.stay) row(`Stay · ${k.st.name}`, `${k.st.area}, ${city} · ${p.nights} night${p.nights > 1 ? "s" : ""} x ${money(k.st.nightly)}`, h.stay.code, h.stay.amount);
		const total = (h.flights?.amount || 0) + (h.stay?.amount || 0);
		y += 4; doc.setFontSize(10); doc.setTextColor(...grey); doc.text("Subtotal", 132, y); doc.setTextColor(...ink); doc.text(money(total), 192, y, { align: "right" });
		y += 6; doc.setTextColor(...grey); doc.text("Taxes and fees", 132, y); doc.setTextColor(...ink); doc.text("included", 192, y, { align: "right" });
		y += 4; doc.setDrawColor(...ink); doc.line(130, y, 195, y); y += 7;
		doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Total paid", 132, y); doc.text(money(total), 192, y, { align: "right" }); doc.setFont("helvetica", "normal");
		y += 16; doc.setFontSize(9); doc.setTextColor(...grey); doc.text("PAYMENT", 15, y); doc.setTextColor(...ink); doc.text(`${cardLabel() || "Card on file"} · ${iso(today)} · approved by you in the app`, 15, y + 5);
		doc.setFontSize(8); doc.setTextColor(...grey); doc.text("Otium is a fictional demo by David Bitan. Nothing was booked or charged. This invoice is not a valid tax document.", 15, 280);
		doc.save(`otium-${p.city}-invoice-${no}.pdf`);
		log("You", t("Downloaded the invoice (PDF)"));
	}

	function postit() {
		let seen = false; try { seen = sessionStorage.getItem("otium-demo-note") === "1"; } catch {}
		if (seen) return;
		const el = $("#postit"); el.hidden = false;
		note(t("Demo: nothing you do here is booked, charged or sent anywhere."));
		const hide = () => { el.classList.remove("on"); setTimeout(() => (el.hidden = true), 600); try { sessionStorage.setItem("otium-demo-note", "1"); } catch {} };
		setTimeout(() => el.classList.add("on"), 700);
		const timer = setTimeout(hide, 7500);
		$("#postitX").onclick = () => { clearTimeout(timer); hide(); };
	}
	/* ---------------- language ---------------- */
	function initLang() {
		const btn = $("#langBtn"), list = $("#langList");
		const paint = () => { list.innerHTML = I.LANGS.map(([k, name, code]) => `<li role="option" data-l="${k}" aria-selected="${k === I.lang}" lang="${k}">${name}<small>${code}</small></li>`).join(""); $("#langCode").textContent = I.LANGS.find((l) => l[0] === I.lang)[2]; };
		const open = (on) => { list.classList.toggle("on", on); btn.setAttribute("aria-expanded", on); if (on) { paint(); list.focus(); } };
		btn.onclick = (e) => { e.stopPropagation(); open(!list.classList.contains("on")); };
		list.onclick = (e) => { const li = e.target.closest("li"); if (!li) return; open(false); askLang(li.dataset.l); };
		list.onkeydown = (e) => { if (e.key === "Escape") { open(false); btn.focus(); } };
		document.addEventListener("click", (e) => { if (!e.target.closest("#langWrap")) open(false); });
		paint();
	}
	function askLang(l) { if (l !== I.lang) setLang(l); } // every trip is translated in place: nothing is re-planned or lost
	function valMapper(prev) { // city and departure names written in the previous language → current language
		const cityBy = {}; for (const k of Object.keys(D.cities)) cityBy[prev === "en" ? EN_CITIES[k].name : (I.CITY[prev]?.[k]?.[0] || EN_CITIES[k].name)] = k;
		const orgBy = {}; for (const [n] of D.origins) orgBy[prev === "en" ? n : (I.ORIGINS[prev]?.[n] || n)] = n;
		return (v) => {
			const x = v.trim(); if (cityBy[x]) return D.cities[cityBy[x]].name; if (orgBy[x]) return on(orgBy[x]);
			if (/^[^\d]*(€|£|₪|CHF)[^\d]*[\d.,\s\u00a0\u202f]+$|^[\d.,\s\u00a0\u202f]+[^\d]*(€|£|₪|CHF)$/.test(x)) { const n = +x.replace(/[^\d]/g, ""); if (n) return money(n); } // money in the new format
			return v;
		};
	}
	function retranslateTrips(prev) {
		const mv = valMapper(prev);
		const tr = (root) => root && I.retranslate(root, prev, mv);
		const rs = (x) => (typeof x === "string" ? I.retext(x, prev, mv) : x);
		tr($("#steps")); tr($("#notice"));
		$("#agentStatus").textContent = rs($("#agentStatus").textContent);
		if (S._prev) S._prev[1] = rs(S._prev[1]);
		S.log.forEach((l) => (l.text = rs(l.text)));
		for (const x of TRIPS) if (x.s) { tr(x.steps); tr(x.notice); x.statusTxt = rs(x.statusTxt); x.s.log.forEach((l) => (l.text = rs(l.text))); if (x.s._prev) x.s._prev[1] = rs(x.s._prev[1]); }
		NOTES.forEach((n) => (n.msg = rs(n.msg)));
		BOT.msgs.forEach((m) => { if (m.local) m.text = rs(m.text); });
	}
	function setLang(l) {
		const prev = I.lang;
		I.set(l); try { localStorage.setItem("otium-lang", I.lang); } catch {}
		applyCityLang(); I.translateStatic();
		$("#langCode").textContent = I.LANGS.find((x) => x[0] === I.lang)[2];
		$("#originVal").textContent = on(S.origin);
		$("#pauseBtn").textContent = t(S.paused ? "Resume" : "Pause");
		renderExamples(); renderCats(); renderListings(); renderBudget(Boolean($("#budgetOut")?.innerHTML)); paintWhen(); if (cal) closeCal(); renderScen(); renderLog(); renderNotes(); renderCase();
		if (prev !== I.lang) retranslateTrips(prev);
		if (S.plan) { renderUnderstood(); renderTrip(); }
		renderTripsNav(); renderLog(); renderNotes(); botLabels(); renderBot(); renderAcct(); renderMenu(); if (!$("#profile").hidden) renderProfile();
	}

	/* ---------------- boot ---------------- */
	const q = new URLSearchParams(location.search);
	let startLang = "en"; try { startLang = localStorage.getItem("otium-lang") || "en"; } catch {}
	if (q.get("lang")) startLang = q.get("lang");
	I.set(startLang); applyCityLang();
	initHome(); initBudget(); initWhen(); initBot(); initAcct(); initGallery(); initMenu(); initScrollers(); initLang(); renderLog(); setLang(I.lang);
	postit();
	renderScen();
	if (q.get("from") && D.origins.some(([n]) => n === q.get("from"))) { S.origin = q.get("from"); $("#originVal").textContent = S.origin; S.settings.cap = snapCap(S.settings.cap); renderListings(); renderBudget(false); }
	if (q.get("state")) { const st = STATES.find((x) => x[0] === q.get("state")); if (st) { $("#ask").value = st[3]; start(st[3], false, st[0], st); } }
	else if (q.get("q")) { $("#ask").value = q.get("q"); start(q.get("q")); }
})();
