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
	const eur = (n) => new Intl.NumberFormat(I.locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n));
	const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const ORIGIN_FACTOR = { Paris: 1, London: 1.08, "Tel Aviv": 1.45, Berlin: 0.95, Madrid: 0.9, Brussels: 0.98, Dublin: 1.12, Geneva: 1.1, Lyon: 0.96, Milan: 0.92, Munich: 1.02, Vienna: 1.04 };
	const TICKETS_PP_DAY = 30;
	const SWATCH = { lisbon: ["#E7B98A", "#B5653E"], rome: ["#E2B27C", "#9C5A37"], barcelona: ["#9CC3D5", "#3F7C93"], amsterdam: ["#B9C9B2", "#5E7A63"], athens: ["#D9D3C4", "#8B9BA8"], copenhagen: ["#A9C0CF", "#4F6E86"] };
	const ic = window.ic;
	document.querySelectorAll("i[data-i]").forEach((e) => (e.outerHTML = ic(e.dataset.i)));
	const ICON = {
		check: ic("check"), spin: ic("loader-circle"), hand: ic("hand"), x: ic("x"), dot: ic("circle-dot"), lock: ic("lock"), info: ic("info"),
		edit: ic("pencil"), cal: ic("calendar"), ticket: ic("ticket"), phone: ic("phone"), chat: ic("message-circle"), mail: ic("mail"), pin: ic("pin"),
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
			$("#ask").value = S.text;
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
		"Rome for 3 nights with my partner, museums, €1,200 max",
		"Solo weekend in Copenhagen, design and bakeries",
		"Somewhere warm next month",
	];
	function renderExamples() { $("#examples").innerHTML = EXAMPLES.map((x) => `<button class="chip" type="button">${esc(t(x))}</button>`).join(""); }
	function initHome() {
		initOrigin();
		renderExamples();
		$("#examples").onclick = (e) => {
			const b = e.target.closest(".chip"); if (!b) return;
			$("#ask").value = b.textContent; $("#ask").focus();
		};
		renderCats(); renderListings();
		const cardClick = (e) => {
			const h = e.target.closest(".heart");
			if (h) { const on = h.getAttribute("aria-pressed") !== "true"; h.setAttribute("aria-pressed", on); saved[on ? "add" : "delete"](h.dataset.city); toast(on ? t("{city} saved to your wishlist", { city: D.cities[h.dataset.city].name }) : t("Removed from your wishlist")); return; }
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
			renderListings();
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
	const CITY_CATS = { lisbon: ["food", "culture", "night"], rome: ["food", "culture"], barcelona: ["beach", "food", "night", "design"], amsterdam: ["culture", "design", "night"], athens: ["culture", "beach"], copenhagen: ["design", "food"] };
	const POPULAR = { lisbon: "Most planned", barcelona: "Trending" };
	let activeCat = "all"; const saved = new Set();
	function renderCats() {
		$("#cats").innerHTML = CATS.map(([k, label, icon]) => `<button type="button" data-cat="${k}" aria-pressed="${k === activeCat}">${icon}${t(label)}</button>`).join("");
	}
	let sortBy = "price";
	function cityKeys() { return Object.keys(D.cities).filter((k) => activeCat === "all" || CITY_CATS[k].includes(activeCat)); }
	function cardHtml(k, n) {
			const c = D.cities[k]; const f = flightOptions(k, S.origin, 1, DEFAULT_PREFS)[0]; const rating = Math.max(...c.stays.map((s) => s.rating));
			return `<div class="card-l" role="button" tabindex="0" data-city="${k}" style="animation-delay:${n * 50}ms" aria-label="${esc(t("Plan a trip to {city}", { city: c.name }))}">
				<div class="photo">${pic(c.photo, k, c.name)}${POPULAR[k] ? `<span class="pop">${t(POPULAR[k])}</span>` : ""}<button class="heart" type="button" data-city="${k}" aria-pressed="${saved.has(k)}" aria-label="${esc(t("Save {city}", { city: c.name }))}">${ic("heart")}</button></div>
				<div class="row1">${c.name}, ${c.country}<span>${ICON.star}${rating.toFixed(1)}</span></div>
				<div class="sub2">${esc(c.tagline)}</div>
				<div class="sub2">${t("{h} direct from {o}", { h: f.hours, o: esc(on(S.origin)) })}</div>
				<div class="pr"><b class="num">${eur(f.price)}</b> <u>${t("flight per person")}</u></div>
			<span class="plan-cta">${t("Plan this trip")} ${ICON.arrow}</span>
			</div>`;
		
	}
	function renderListings() {
		const keys = cityKeys(); const LIMIT = 3;
		$("#mosaic").innerHTML = keys.slice(0, LIMIT).map(cardHtml).join("");
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
	const ALIASES = { lisbon: ["lisbon", "lisboa", "lisbonne", "lisbona", "ליסבון"], rome: ["rome", "roma", "רומא"], barcelona: ["barcelona", "barcelone", "barcellona", "barça", "bcn", "ברצלונה"], amsterdam: ["amsterdam", "ámsterdam", "אמסטרדם"], athens: ["athens", "athina", "athènes", "atenas", "atene", "אתונה"], copenhagen: ["copenhagen", "copenhague", "copenaghen", "københavn", "kobenhavn", "cph", "קופנהגן"] };
	const ELSEWHERE = ["tokio", "טוקיו", "ניו יורק", "tokyo", "new york", "nyc", "bali", "bangkok", "dubai", "marrakech", "london", "paris", "berlin", "madrid", "prague", "vienna", "istanbul", "iceland", "reykjavik", "mexico", "japan", "thailand", "morocco", "cairo", "sydney", "miami", "eilat"];
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
		try {
			const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
			const r = await fetch("/api/otium", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang: I.lang }), signal: ctl.signal });
			clearTimeout(to);
			if (!r.ok) throw new Error(r.status);
			const j = await r.json();
			if (!j.intent) throw new Error("empty");
			// Belt and braces: the model may miss a number that is plainly in the text.
			const loc = localParse(text); const i = j.intent;
			for (const k of ["nights", "travelers", "budget"]) if (i[k] == null && loc[k] != null) i[k] = loc[k];
			Object.assign(i, { cabin: loc.cabin, bags: loc.bags, time: loc.time });
			if (!i.city && loc.city) { i.city = loc.city; i.askedPlace = loc.askedPlace; }
			return { intent: i, ai: true };
		} catch { return { intent: localParse(text), ai: false }; }
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
			S.aiUsed = ai; S.intent = intent;
			if (!ai) $("#notice").innerHTML = `<div class="notice">${ICON.info}<span>${t("Smart reading is offline right now, so Otium used basic matching. Check the details below — you can change any of them.")}</span></div>`;
			s.sub(t(ai ? "Matched it against six destinations (Llama 3.3)" : "Matched it against six destinations (basic matching)"));
			if (S.scenario === "overbudget") intent.budget = 400;

			if (intent.city === "other" || !intent.city) {
				s.set("ask");
				const other = intent.city === "other";
				s.detail(other ? t("{place} isn’t covered in this demo yet.", { place: esc(intent.askedPlace || t("That place")) }) : t("One thing I need before I start."));
				setStatus("waiting", t("Waiting for you"));
				const slot = s.slot(`<div class="card ask"><h4>${t(other ? "Pick one of these instead?" : "Where would you like to go?")}</h4><p>${t(other ? "Otium plans six cities for now. I won’t guess on your behalf." : "Pick a city — I’ll keep the rest of what you said.")}</p><div class="city-pick">${Object.keys(D.cities).map((k) => `<button data-choice="${k}">${pic(D.cities[k].photo, k)}<span>${D.cities[k].name}</span></button>`).join("")}</div></div>`);
				const city = await decide(slot);
				if (id !== S.run) throw new Stale();
				intent.city = city; slot.innerHTML = "";
				log("You", t("Chose {city}", { city: D.cities[city].name }));
				setStatus("working", t("Working on it…"));
			}
			const assumed = { nights: intent.nights == null, travelers: intent.travelers == null, cap: intent.budget == null };
			S.plan = {
				city: intent.city, nights: intent.nights ?? 3, travelers: intent.travelers ?? 2,
				cap: intent.budget ?? S.settings.cap, flight: 0, stay: null, assumed, interests: intent.interests || [], pace: intent.pace || "balanced", prefs: { ...DEFAULT_PREFS, cabin: intent.cabin || "economy", bags: intent.bags ? 1 : 0, time: intent.time || "any" },
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
				const raise = Math.ceil(k.total / 50) * 50;
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
					if (n === "cheaper") { p.cap = Math.max(200, Math.round((costs(p).total * 0.8) / 50) * 50); p.assumed.cap = false; log("You", t("Asked for cheaper — cap set to {x}", { x: eur(p.cap) })); renderUnderstood(); restartFrom("stay"); return; }
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
			const slot = s.slot(`<div class="card ask"><h4>${t("Share your details with {a}?", { a: esc(k.fl.airline) })}</h4><ul class="what"><li><span>${t("Full names")}</span><span>${P(p.travelers, "1 traveller", "{n} travellers")}</span></li><li><span>${t("Passport numbers")}</span><span>${t("From your profile")}</span></li><li><span>${t("Phone, for delay alerts")}</span><span>${t("Optional")}</span></li></ul><div class="row"><button class="btn btn-amber btn-sm" data-choice="yes">${t("Share and issue tickets")}</button><button class="btn btn-ghost btn-sm" data-choice="noPhone">${t("Share without phone")}</button><button class="btn btn-text btn-sm" data-choice="later">${t("I’ll do it myself")}</button></div><p class="fine">${ICON.lock}<span>${t("Shared with the airline only, for this booking. Demo — no data is entered or sent.")}</span></p></div>`);
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
		const caps = [...new Set([300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, p.cap])].sort((a, b) => a - b);
		box.innerHTML = `<div class="lbl"><span>${t("WHAT I UNDERSTOOD")}</span><span>${t(S.aiUsed ? "Read by AI" : "Basic matching")}</span></div>
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
			<div class="cal-quick"><span>${t("Stay for")}</span>${QUICK_NIGHTS.map((n) => `<button type="button" class="chip" data-n="${n}" aria-pressed="false">${P(n, "1 night", "{n} nights")}</button>`).join("")}</div>
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
		el.querySelectorAll(".cal-quick .chip").forEach((c) => c.setAttribute("aria-pressed", String(n === +c.dataset.n)));
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
		v.textContent = homeWhen ? `${fmtDay(fromIso(homeWhen.out))} – ${fmtDay(addDays(fromIso(homeWhen.out), homeWhen.nights))}` : t("Any dates");
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
	function openGroups() {
		modal(`<h3 id="modalTitle">${t("Groups & companies")}</h3><p>${t("From 10 travellers, a dedicated travel planner builds the trip with you: group fares, several rooms or a whole hotel, meeting rooms, transfers and one invoice. Otium hands over everything it has prepared.")}</p>
			<div class="help-list">
				<a class="help-row" href="tel:${HELP_TEL.replace(/\s/g, "")}"><span class="pi" style="--i:#0F6E62;--t:#E6F4F1">${ICON.phone}</span><span><b>${t("Call the groups team")}</b><small dir="ltr">${HELP_TEL}</small></span></a>
				<a class="help-row" href="mailto:groups@otium.example?subject=${encodeURIComponent("Group trip")}"><span class="pi" style="--i:#B8680F;--t:#FDF0E1">${ICON.mail}</span><span><b>${t("Send a group request")}</b><small>groups@otium.example</small></span></a>
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
		<div class="trip-hero">${pic(c.photo, p.city, c.name)}<div class="in"><div><span class="status-tag ${st[0]}"><i></i>${st[1]}</span><h2>${c.name}</h2><div class="meta">${fmtDay(dates.out)} → ${fmtDay(dates.back)} · ${P(p.nights, "1 night", "{n} nights")} · ${P(p.travelers, "1 traveller", "{n} travellers")} · ${t("from {o}", { o: esc(on(S.origin)) })}</div></div></div></div>
		${S.progress.done ? doneBanner(k) : ""}
		${S.progress.cancelled && !S.progress.done ? `<div class="panel block draft-note"><b>${t("Bookings cancelled.")}</b> ${t("Your plan is kept as a draft.")} <button class="btn btn-primary btn-sm" data-rebook>${t("Book it again")}</button></div>` : ""}
		<div class="panel budget">
			<div class="budget-top"><div><b class="num">${k ? eur(k.total) : "—"}</b> <span>${t("estimated total")}</span></div><span class="num">${k ? (over ? `<span class="diff">${t("{x} over", { x: eur(k.total - p.cap) })}</span>` : t("{x} left under your cap", { x: eur(p.cap - k.total) })) : t("Calculating…")}</span></div>
			<div class="meter${over ? " over" : ""}"><div class="fill" style="width:${k ? (k.total / scale) * 100 : 0}%"></div><div class="cap" style="left:${(p.cap / scale) * 100}%" data-l="${esc(t("Cap {x}", { x: eur(p.cap) }))}"></div></div>
			${k ? `<div class="split num"><span><i style="background:var(--lagoon)"></i>${t("Flights {x}", { x: eur(k.flights) })}</span><span><i style="background:#5FB3A6"></i>${t("Stay {x}", { x: eur(k.stay) })}</span>${k.tickets ? `<span><i style="background:var(--sand-2)"></i>${t("Tickets, est. {x}", { x: eur(k.tickets) })}</span>` : ""}</div>` : ""}
		</div>
		<div class="panel block">
			<div class="block-h"><h3>${t("Flights")}</h3><span class="state ${S.held.flights ? "held" : S.progress.pendingHold ? "pending" : ""}">${S.held.flights ? `${t("Held · {c}", { c: S.held.flights.code })} <button class="linkish" data-cancel="flights">${t("Cancel")}</button>` : t(S.progress.pendingHold ? "Waiting for your OK" : fl ? "Not held yet" : "Searching…")}</span></div>
			${fl ? flightRow(fl[p.flight], c) + altFlights(fl) : '<div class="skeleton"></div>'}
		</div>
		<div class="panel block">
			<div class="block-h"><h3>${t("Stay")}</h3><span class="state ${S.held.stay ? "held" : S.progress.pendingHold ? "pending" : ""}">${S.held.stay ? `${t("Held · {c}", { c: S.held.stay.code })} <button class="linkish" data-cancel="stay">${t("Cancel")}</button>` : t(S.progress.pendingHold ? "Waiting for your OK" : p.stay && S.progress.stay === "ready" ? "Not held yet" : "Searching…")}</span></div>
			${p.stay && S.progress.stay === "ready" ? stayRow(c.stays.find((x) => x.id === p.stay), p) + altStays(c, p) : '<div class="skeleton"></div>'}
		</div>
		<div class="panel block">
			<div class="block-h"><h3>${t("Your days")}</h3><span class="state">${t(S.settings.activities ? "Draft · nothing bought" : "Free days")}</span></div>
			${S.progress.days === "ready" ? `<div class="days">${Array.from({ length: p.nights + 1 }, (_, i) => `<div class="day" style="animation-delay:${i * 70}ms"><b>${t("Day {n}", { n: i + 1 })}</b><ul>${(S.settings.activities ? (i === 0 ? [t("Arrive, check in"), ...c.days[0].slice(1)] : c.days[Math.min(i, c.days.length - 1)]).map((x) => `<li>${esc(x)}</li>`).join("") : `<li>${t("Free day — yours to plan")}</li>`)}</ul></div>`).join("")}</div>` : '<div class="skeleton"></div>'}
		</div>`;
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
		return `<div class="stay"><div class="pic">${pic(s.photo, p.city, s.name)}</div><div><b>${esc(s.name)}</b><br><small>${esc(s.area)} · ${ICON.star} ${s.rating} · ${esc(s.perk)}</small><div class="tags">${s.freeCancel ? `<span class="tag g">${t("Free cancellation")}</span>` : `<span class="tag r">${t("Non-refundable")}</span>`}<span class="tag">${t("Matches your cap")}</span></div></div><div class="price num">${eur(s.nightly * p.nights)}<small>${t("{x} / night", { x: eur(s.nightly) })}</small></div></div>`;
	}
	function altStays(c, p) {
		if (S.held.stay || S.progress.done) return "";
		return `<details class="toggle-alts" data-alts="stays"${(S.progress.editing && !S.progress.editPicked) || openAlts.has("stays") ? " open" : ""}><summary class="btn btn-text btn-sm">${t("Other stays ({n})", { n: c.stays.length - 1 })}</summary><div class="alts">${c.stays.map((s) => `<button class="alt" data-stay="${s.id}" aria-pressed="${s.id === p.stay}"><span><b>${esc(s.name)}</b> · ${esc(s.area)} · ${ICON.star} ${s.rating}${s.freeCancel ? "" : t(" · non-refundable")}</span><span class="num">${eur(s.nightly * p.nights)}</span><span>${t(s.id === p.stay ? "Selected" : "Choose")}</span></button>`).join("")}</div></details>${S.progress.editing ? `<div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="editDone">${t("Done — show me the new total")}</button></div>` : ""}`;
	}
	function doneBanner(k) {
		const h = S.held;
		return `<div class="panel done-banner"><div class="check">${ICON.check}</div><div><h3>${t("Your trip is held.")}</h3><p>${h.flights || h.stay ? t("{x} held", { x: eur((h.flights?.amount || 0) + (h.stay?.amount || 0)) }) : t("Nothing held")}${t(" · simulated, nothing charged.")}</p><div class="codes">${h.flights ? `${t("Flight")} <b>${h.flights.code}</b>` : t("Flight released")} · ${h.stay ? `${t("Stay")} <b>${h.stay.code}</b>` : t("Stay released")}</div></div><div class="row">${h.flights && h.data ? `<button class="btn btn-primary btn-sm" id="docs">${ICON.ticket} ${t("Tickets & voucher")}</button>` : h.flights ? `<span class="tag">${t("Tickets: send traveller details first")}</span>` : ""}<button class="btn btn-ghost btn-sm" id="ics">${ICON.cal} ${t("Add to calendar")}</button>${h.flights || h.stay ? `<button class="btn btn-text btn-sm" data-cancel="all">${t("Cancel all bookings")}</button>` : ""}<button class="btn btn-text btn-sm" data-help>${t("Need help?")}</button></div></div>`;
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
	});

	/* ---------------- trip history (read-only receipt) + cancelling bookings ---------------- */
	function renderLog() {
		$("#log").innerHTML = S.log.length ? S.log.map((l) => `<li class="${l.target ? "jump" : ""}" ${l.target ? `data-target="${l.target}" tabindex="0" title="${t("Show this step")}"` : ""}><time>${l.t}</time><div><span class="by">${l.by === "You" ? t("You") : "Otium"}</span><span class="${l.undone ? "undone" : ""}">${esc(l.text)}</span></div><span></span></li>`).join("") : `<li class="empty" style="display:block">${t("Nothing yet.")}</li>`;
		const hb = $("#openHistory"); if (hb) hb.lastChild.textContent = t("Trip history ({n})", { n: S.log.length });
	}
	$("#openHistory").onclick = () => openDrawer("logDrawer");
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
			<div class="setting" style="display:block"><b>${t("Default budget cap")}</b><small>${t("Used when you don’t give one. Otium stops instead of going over.")}</small><input class="range" type="range" min="300" max="3000" step="50" value="${st.cap}" id="capRange" aria-label="${esc(t("Default budget cap"))}"><div class="num" style="font-weight:700" id="capVal">${eur(st.cap)}</div></div>
			${row("r1", "Ask before any payment", "Holds, bookings and upgrades.", true, true)}
			${row("r2", "Ask before sharing my details", "Names, passports, phone, email.", true, true)}
			${row("r3", "Ask again if a price goes up", "Even by €1 after you approved.", true, true)}
			${row("refundable", "Prefer refundable stays", "Picks free cancellation when one fits.", st.refundable, false)}
			${row("activities", "Draft activities for me", "Off = Otium leaves your days free.", st.activities, false)}`;
		$("#capRange").oninput = (e) => { st.cap = +e.target.value; $("#capVal").textContent = eur(st.cap); };
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
		modal(`<h3 id="modalTitle">${t("Discard this trip?")}</h3><p>${heldAmt ? t("Otium will release everything it holds first. ") + t(S.held.stay && !S.held.stay.refundable ? "The stay is non-refundable, so that part can’t be recovered." : "Nothing is lost.") : t("Nothing has been booked yet, so nothing is lost.")}</p>
			<div class="ba"><div><b>${t("Now")}</b>${D.cities[S.plan?.city]?.name || t("Draft")} · ${heldAmt ? t("{x} held", { x: eur(heldAmt) }) : t("draft")}</div><span class="arrow">${ICON.arrow}</span><div class="after"><b>${t("After")}</b>${t("No trip")} · ${heldAmt ? t("{x} released", { x: eur(heldAmt) }) : t("back to start")}</div></div>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Keep it")}</button><button class="btn btn-danger btn-sm" data-m="ok">${t("Discard trip")}</button></div>`, (r) => {
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
				<a class="help-row" href="tel:${HELP_TEL.replace(/\s/g, "")}"><span class="pi" style="--i:#0F6E62;--t:#E6F4F1">${ICON.phone}</span><span><b>${t("Call us")}</b><small dir="ltr">${t("{tel} · average wait 2 min", { tel: HELP_TEL })}</small></span></a>
				<button class="help-row" type="button" data-m="chat"><span class="pi" style="--i:#5146C9;--t:#ECEBFB">${ICON.chat}</span><span><b>${t("Chat with an agent")}</b><small>${t("A person joins this trip and sees what Otium did")}</small></span></button>
				<a class="help-row" href="mailto:help@otium.example?subject=${encodeURIComponent("Trip help" + (ref ? " " + ref : ""))}"><span class="pi" style="--i:#B8680F;--t:#FDF0E1">${ICON.mail}</span><span><b>${t("Email")}</b><small>${t("help@otium.example · reply within 4 h")}</small></span></a>
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
	function show(v, fromPop) {
		if (v === "trip" && !S.plan && !S.text) v = "home";
		$("#home").hidden = v !== "home"; $("#trip").hidden = v !== "trip"; $("#explore").hidden = v !== "explore"; $("#trips").hidden = v !== "trips";
		if (v === "explore") renderExplore();
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
	const seat = (n) => `${{ Business: 2, "Premium economy": 8 }[costs(S.plan).fl.cabin] || 14}${"ACDFBE"[n % 6]}`;
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
			<dl class="pass-grid"><div><dt>${t("Passenger")}</dt><dd>${t("Traveller {n}", { n: n + 1 })}</dd></div><div><dt>${t("Date")}</dt><dd>${fmtDay(l.date)}</dd></div><div><dt>${t("Boarding")}</dt><dd>${l.board}</dd></div><div><dt>${t("Gate")}</dt><dd>${l.gate}</dd></div><div><dt>${t("Seat")}</dt><dd>${seat(n)}</dd></div><div><dt>${t("Cabin")}</dt><dd>${t(l.cabin)}</dd></div><div><dt>${t("Bags")}</dt><dd>${t(l.bags)}</dd></div><div><dt>${t("Booking")}</dt><dd>${l.code}</dd></div></dl>
		</div><div class="pass-stub"><svg viewBox="0 0 ${x} 56" preserveAspectRatio="none" aria-hidden="true">${b}</svg><b>${l.code}</b><small>${t("DEMO · NOT VALID FOR TRAVEL")}</small></div></div>`;
	}
	function openDocs() {
		const p = S.plan; const L = legs(); const k = costs(p); const d = tripDates(p.nights);
		modal(`<h3 id="modalTitle">${t("Your travel documents")}</h3><p>${P(p.travelers, "1 traveller", "{n} travellers")} · ${t("{n} flights each", { n: L.length })}${S.held.stay ? t(" · 1 hotel voucher") : ""}${t(". The PDF has every pass, one page per traveller.")}</p>
			<div class="docs">${passHtml(L[0], 0)}
			${S.held.stay ? `<div class="voucher"><div><span class="pass-dir">${t("Hotel voucher")}</span><b>${esc(k.st.name)}</b><small>${esc(k.st.area)}, ${D.cities[p.city].name} · ${ICON.star} ${k.st.rating}</small></div><dl class="pass-grid"><div><dt>${t("Check-in")}</dt><dd>${fmtDay(d.out)} · 15:00</dd></div><div><dt>${t("Check-out")}</dt><dd>${fmtDay(d.back)} · 11:00</dd></div><div><dt>${t("Guests")}</dt><dd>${p.travelers}</dd></div><div><dt>${t("Booking")}</dt><dd>${S.held.stay.code}</dd></div></dl></div>` : ""}</div>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Close")}</button><button class="btn btn-primary btn-sm" data-m="pdf">${ICON.ticket} ${t("Download PDF")}</button></div>`, (r) => { if (r === "pdf") downloadPdf(); });
		$("#modalBox").classList.add("wide");
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
		const ink = [34, 34, 34], grey = [106, 106, 106], teal = [15, 110, 98], line = [221, 221, 221];
		const pass = (l, n, y) => {
			doc.setDrawColor(...line); doc.setFillColor(255, 255, 255); doc.roundedRect(15, y, 180, 92, 4, 4, "FD");
			doc.setFillColor(...teal); doc.roundedRect(15, y, 180, 14, 4, 4, "F"); doc.rect(15, y + 8, 180, 6, "F");
			doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(l.airline, 22, y + 9.5);
			doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`${l.dir.toUpperCase()} · E-TICKET · OTIUM`, 188, y + 9.5, { align: "right" });
			doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.text(l.from, 22, y + 34); doc.text(l.to, 112, y + 34);
			doc.setFontSize(11); doc.text(l.dep, 22, y + 41); doc.text(l.arr, 112, y + 41);
			doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...grey); doc.text(l.fromN, 22, y + 46); doc.text(l.toN, 112, y + 46);
			doc.setDrawColor(...grey); doc.setLineDashPattern([1, 1], 0); doc.line(52, y + 30, 106, y + 30); doc.setLineDashPattern([], 0); doc.text(l.flight, 79, y + 27, { align: "center" });
			const f = [["PASSENGER", `Traveller ${n + 1}`], ["DATE", fmtDay(l.date)], ["BOARDING", l.board], ["GATE", l.gate], ["SEAT", seat(n)], ["CABIN", l.cabin], ["BAGS", l.bags], ["BOOKING", l.code]];
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
	function askLang(l) {
		if (l === I.lang) return;
		const name = I.LANGS.find((x) => x[0] === l)[1];
		if (!S.text || $("#trip").hidden) return setLang(l);
		modal(`<h3 id="modalTitle">${t("Switch language?")}</h3><p>${t("Otium will re-plan this trip from the start in {lang}. Nothing is booked in this demo, so nothing is lost.", { lang: name })}</p>
			<div class="row"><button class="btn btn-ghost btn-sm" data-m="cancel">${t("Keep {lang}", { lang: I.LANGS.find((x) => x[0] === I.lang)[1] })}</button><button class="btn btn-primary btn-sm" data-m="ok">${t("Switch to {lang}", { lang: name })}</button></div>`, (r) => { if (r === "ok") { setLang(l); start(S.text, true); } });
	}
	function setLang(l) {
		I.set(l); try { localStorage.setItem("otium-lang", I.lang); } catch {}
		applyCityLang(); I.translateStatic();
		$("#langCode").textContent = I.LANGS.find((x) => x[0] === I.lang)[2];
		$("#originVal").textContent = on(S.origin);
		$("#pauseBtn").textContent = t(S.paused ? "Resume" : "Pause");
		renderExamples(); renderCats(); renderListings(); paintWhen(); if (cal) closeCal(); renderScen(); renderLog(); renderNotes(); renderCase();
		if (S.plan) { renderUnderstood(); renderTrip(); }
		renderTripsNav();
	}

	/* ---------------- boot ---------------- */
	const q = new URLSearchParams(location.search);
	let startLang = "en"; try { startLang = localStorage.getItem("otium-lang") || "en"; } catch {}
	if (q.get("lang")) startLang = q.get("lang");
	I.set(startLang); applyCityLang();
	initHome(); initWhen(); initLang(); renderLog(); setLang(I.lang);
	postit();
	renderScen();
	if (q.get("from") && D.origins.some(([n]) => n === q.get("from"))) { S.origin = q.get("from"); $("#originVal").textContent = S.origin; }
	if (q.get("state")) { const st = STATES.find((x) => x[0] === q.get("state")); if (st) { $("#ask").value = st[3]; start(st[3], false, st[0], st); } }
	else if (q.get("q")) { $("#ask").value = q.get("q"); start(q.get("q")); }
})();
