/* Facet: ask about your money, get the screen that answers.
 * Flow: request → AI (or local reader) → spec → engine.clean → engine.run per block → charts.
 * The AI never sees or writes an amount. Every screen is a step in the history: back, forward, jump, start over (with undo). */
(function () {
	const D = window.FACET_DATA, E = window.FACET_ENGINE, RD = window.FACET_READER, CH = window.FACET_CHARTS, I = window.FACET_I18N, ICONS = window.FACET_ICONS;
	const API = "/api/facet";
	const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
	const esc = CH.esc, reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	const ic = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
	const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

	const data = D.build();
	data.cats = D.CATS.map((c) => c.id);
	const CAT = Object.fromEntries(D.CATS.concat(D.INCOME).map((c) => [c.id, c]));

	const S = { lang: "en", hist: [], at: -1, sel: null, busy: false, open: {}, pick: {} };

	/* ---------------- language ---------------- */
	const fromUrl = new URLSearchParams(location.search).get("lang");
	S.lang = [fromUrl, store.get("facet-lang", null), ...(navigator.languages || [])].map((l) => String(l || "").slice(0, 2)).find((l) => I.LANGS.some((x) => x[0] === l)) || "en";
	function t(k, p) {
		let s = (I.dict[S.lang] && I.dict[S.lang][k]) || k;
		if (p) s = s.replace(/\{(\w+)\}/g, (m, n) => (p[n] ?? m));
		return s;
	}
	const catName = (id) => t(I.CAT_NAMES[id] || id);
	/* titles from the local reader are kept as { k, p } and translated when shown; titles from the AI are plain text */
	function title(x) {
		if (!x) return "";
		if (typeof x === "string") return x;
		const p = { ...(x.p || {}) };
		if (p.cat) p.cat = catName(p.cat);
		if (p.cats) p.cats = String(p.cats).split(",").map(catName).join(", ");
		return t(x.k, p);
	}

	/* ---------------- formats ---------------- */
	const locale = () => I.LOCALE[S.lang] || S.lang;
	const money = (v) => new Intl.NumberFormat(locale(), { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
	const moneyShort = (v) => new Intl.NumberFormat(locale(), { style: "currency", currency: "EUR", notation: v >= 10000 ? "compact" : "standard", maximumFractionDigits: v >= 10000 ? 1 : 0 }).format(v);
	const num = (v) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(v);
	const pct = (v) => new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 0 }).format(v);
	const val = (b, v) => (b.measure === "count" ? num(v) : money(v));
	const valShort = (b, v) => (b.measure === "count" ? num(v) : moneyShort(v));
	const dt = (s, o) => E.parse(s).toLocaleDateString(locale(), o);
	const WD = (i) => new Date(2024, 0, 7 + i).toLocaleDateString(locale(), { weekday: "short" }); // 7 Jan 2024 is a Sunday
	const WDL = (i) => new Date(2024, 0, 7 + i).toLocaleDateString(locale(), { weekday: "long" });
	function keyLabel(b, k, long) {
		if (k === "_other") return t("Other");
		if (b.by === "category") return catName(k);
		if (b.by === "merchant") return k;
		if (b.by === "month") return dt(k + "-01", long ? { month: "long", year: "numeric" } : { month: "short" });
		if (b.by === "week") return long ? t("Week of {d}", { d: dt(k, { day: "numeric", month: "long" }) }) : dt(k, { day: "numeric", month: "short" });
		if (b.by === "day") return long ? dt(k, { weekday: "long", day: "numeric", month: "long" }) : dt(k, { day: "numeric" });
		if (b.by === "weekday") return long ? WDL(k) : WD(k);
		return String(k);
	}
	function rangeLabel(R) {
		const a = E.parse(R.from), z = E.parse(R.to), sameY = a.getFullYear() === z.getFullYear();
		if (R.months === 1 && a.getDate() === 1 && !R.partial) return dt(R.from, { month: "long", year: "numeric" });
		const o1 = sameY ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" };
		return t("{a} to {b}", { a: dt(R.from, o1), b: dt(R.to, { day: "numeric", month: "short", year: "numeric" }) });
	}
	const PRESET_NAMES = { this_month: "This month", last_month: "Last month", last_3_months: "Last 3 months", last_6_months: "Last 6 months", last_12_months: "Last 12 months", this_year: "This year", all: "Everything" };
	const MEASURE_NAMES = { spend: "spending", income: "money in", net: "what is left", count: "purchases", avg: "average purchase", avg_month: "per month on average" };
	const KIND_NAMES = { bar: "Bars", line: "Line", donut: "Ring", table: "Table" };
	const KIND_ICONS = { bar: "chart-column", line: "chart-line", donut: "chart-pie", table: "table-2", kpi: "hash" };

	/* ---------------- static text ---------------- */
	function applyLang() {
		document.documentElement.lang = S.lang;
		document.documentElement.dir = I.RTL.includes(S.lang) ? "rtl" : "ltr";
		$$("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
		$$("[data-t-ph]").forEach((el) => (el.placeholder = t(el.dataset.tPh)));
		$$("[data-t-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.tLabel)));
		$("#langName").textContent = I.LANGS.find((l) => l[0] === S.lang)[1];
		$("#noteTx").textContent = t("Demo account with {n} invented transactions over 13 months. Every number is computed in your browser from those transactions: the AI only chooses what to show, it never writes a figure.", { n: num(data.tx.length) });
		renderChips(); placeholder();
		if (S.at >= 0) render(false);
	}
	$$("[data-ic]").forEach((el) => (el.outerHTML = ic(el.dataset.ic, el.className)));

	const CHIPS = [
		["wallet", "My spending last month"],
		["utensils", "How much do I spend on restaurants?"],
		["repeat", "My subscriptions"],
		["trending-up", "How my spending changed over the year"],
		["receipt-text", "My biggest expenses in the last 3 months"],
		["calendar", "Which day of the week do I spend the most?"],
	];
	function renderChips() {
		$("#chips").innerHTML = CHIPS.map(([i, k], n) => `<li><button type="button" data-chip="${n}">${ic(i)}<span>${esc(t(k))}</span></button></li>`).join("");
	}
	$("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-chip]"); if (!b) return; const k = CHIPS[+b.dataset.chip][1]; ask(t(k), { local: true }); });

	function placeholder() {
		const q = $("#q");
		q.placeholder = S.sel != null && cur() ? t("Change the selected block, for example: as bars, only restaurants") : cur() ? t("Change this screen or ask something else") : t("What do you want to see? For example: my spending this month");
	}

	/* ---------------- dropdowns: custom, animated (500 ms open, 400 ms close), keyboard, outside click ---------------- */
	function slide(el, open) {
		if (el._a) { el._a.cancel(); el._a = null; }
		if (reduced()) { el.hidden = !open; el.style.height = ""; return Promise.resolve(); }
		const from = el.hidden ? 0 : el.getBoundingClientRect().height, op = el.hidden ? 0 : +getComputedStyle(el).opacity;
		el.hidden = false; el.style.height = "auto";
		const to = open ? el.getBoundingClientRect().height : 0;
		el.style.overflow = "hidden";
		const a = (el._a = el.animate([{ height: from + "px", opacity: op }, { height: to + "px", opacity: open ? 1 : 0 }], { duration: open ? 500 : 400, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }));
		return new Promise((res) => { a.onfinish = () => { if (el._a !== a) return res(); el._a = null; el.style.height = el.style.overflow = ""; if (!open) el.hidden = true; res(); }; a.oncancel = res; });
	}
	let openMenu = null;
	function menu(btn, list, items, onPick) {
		if (openMenu && openMenu.list === list) return closeMenu();
		closeMenu();
		list.innerHTML = items.map((x, i) => `<li role="option" tabindex="-1" data-i="${i}" aria-selected="${x.on ? "true" : "false"}">${x.icon ? ic(x.icon) : ""}<span>${esc(x.label)}</span>${x.small ? `<small>${esc(x.small)}</small>` : ""}</li>`).join("");
		btn.setAttribute("aria-expanded", "true");
		openMenu = { btn, list, onPick, items };
		slide(list, true);
		(list.querySelector('[aria-selected="true"]') || list.firstElementChild)?.focus({ preventScroll: true });
	}
	function closeMenu(focusBtn) {
		if (!openMenu) return;
		const { btn, list } = openMenu; openMenu = null;
		btn.setAttribute("aria-expanded", "false"); slide(list, false);
		if (focusBtn) btn.focus();
	}
	document.addEventListener("click", (e) => {
		if (!openMenu) return;
		const li = e.target.closest("li[role=option]");
		if (li && openMenu.list.contains(li)) { const m = openMenu; closeMenu(true); m.onPick(m.items[+li.dataset.i]); return; }
		if (!openMenu.btn.contains(e.target) && !openMenu.list.contains(e.target)) closeMenu();
	});
	document.addEventListener("keydown", (e) => {
		if (openMenu) {
			const opts = $$("li", openMenu.list), i = opts.indexOf(document.activeElement);
			if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
			else if (e.key === "ArrowDown") { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
			else if (e.key === "ArrowUp") { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
			else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); opts[i].click(); }
			else if (e.key === "Tab") closeMenu();
			return;
		}
		const typing = /TEXTAREA|INPUT/.test(document.activeElement?.tagName);
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); e.shiftKey ? go(S.at + 1) : go(S.at - 1); }
		if (e.key === "Escape" && S.sel != null && !typing) select(null);
	});
	$("#langBtn").addEventListener("click", () => menu($("#langBtn"), $("#langList"), I.LANGS.map(([c, n]) => ({ code: c, label: n, small: c.toUpperCase(), on: c === S.lang })), (x) => { S.lang = x.code; store.set("facet-lang", x.code); applyLang(); }));

	/* ---------------- prompt ---------------- */
	const q = $("#q");
	const fit = () => { q.style.height = "auto"; q.style.height = Math.min(q.scrollHeight, 120) + "px"; $("#go").disabled = !q.value.trim() || S.busy; };
	q.addEventListener("input", fit);
	q.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#askForm").requestSubmit(); } });
	$("#askForm").addEventListener("submit", (e) => { e.preventDefault(); const v = q.value.trim(); if (v && !S.busy) ask(v); });

	const cur = () => S.hist[S.at] || null;

	async function ask(text, opt = {}) {
		S.busy = true; fit();
		const prev = cur()?.spec || null, sel = prev ? S.sel : null;
		if (!prev) $("#hero").hidden = false;
		loading(text);
		let spec = null, src = "ai", reason = "";
		if (!opt.local) {
			try {
				const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
				const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal, body: JSON.stringify({ request: text, lang: S.lang, today: data.today, from: data.from, merchants: data.merchants, prev: prev ? plain(prev) : undefined, sel: sel ?? undefined }) });
				clearTimeout(timer);
				const j = await r.json().catch(() => ({}));
				if (r.ok && j.spec) {
					if (Array.isArray(j.spec.blocks) && !j.spec.blocks.length) { S.busy = false; fit(); return offTopic(text); }
					spec = E.clean(j.spec, data);
					if (!spec) reason = "unreadable";
				} else reason = j.error === "daily_limit" ? "limit" : "offline";
			} catch { reason = "offline"; }
		}
		if (!spec) {
			src = opt.local ? "chip" : "local";
			const raw = RD.read(text, { t: (k, p) => ({ k, p }), today: data.today, prev: prev ? plain(prev) : null, sel });
			spec = E.clean(raw, data);
		}
		if (!opt.local) await wait(reduced() ? 0 : 250);
		S.busy = false; q.value = ""; fit();
		if (!spec) return offTopic(text);
		if (!spec.title) spec.title = prev?.title || { k: "Your screen" };
		push({ spec, label: text, src, reason });
	}
	const plain = (spec) => ({ title: title(spec.title), blocks: spec.blocks.map((b) => ({ ...b, title: title(b.title) })) });
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));

	function push(step) {
		S.hist = S.hist.slice(0, S.at + 1); S.hist.push(step); S.at = S.hist.length - 1;
		S.open = {}; S.pick = {}; if (S.sel != null && !step.spec.blocks[S.sel]) S.sel = null;
		render(true);
	}
	function go(i) {
		if (i < 0 || i >= S.hist.length || i === S.at) return;
		S.at = i; S.open = {}; S.pick = {}; if (S.sel != null && !cur().spec.blocks[S.sel]) S.sel = null;
		render(true);
	}
	function edit(label, change) {
		const spec = JSON.parse(JSON.stringify(cur().spec)); change(spec);
		const c = E.clean(spec, data); if (!c) return;
		c.title = spec.title;
		push({ spec: c, label, src: "edit" });
	}

	/* ---------------- screen ---------------- */
	function loading(text) {
		$("#screen").innerHTML = `<div class="status">${'<span class="spin" aria-hidden="true"></span>'}<span>${esc(t("Building the screen for: {q}", { q: text }))}</span></div><div class="grid">${[4, 4, 4, 6, 6].map((n, i) => `<div class="card ${n === 4 ? "kpi" : ""} ghost"><div class="skel h"></div><div class="skel b" style="animation-delay:${i * 90}ms"></div></div>`).join("")}</div>`;
	}
	function offTopic(text) {
		const back = cur() ? `<button type="button" class="btn" id="backCur">${ic("arrow-left")}${esc(t("Back to the screen"))}</button>` : "";
		$("#screen").innerHTML = `<div class="msg">${ic("info")}<div><p><b>${esc(t("Facet only knows this account."))}</b></p><p>${esc(t("I could not turn “{q}” into a screen. Ask about spending, money in, categories, merchants or a period, or pick a suggestion above.", { q: text }))}</p>${back ? `<p style="margin-top:12px">${back}</p>` : ""}</div></div>`;
		$("#backCur")?.addEventListener("click", () => render(false));
	}

	function render(animate) {
		const step = cur(); if (!step) { $("#screen").innerHTML = ""; ["#hero", "#chips", "#note"].forEach((x) => ($(x).hidden = false)); placeholder(); return; }
		["#hero", "#chips", "#note"].forEach((x) => ($(x).hidden = true)); // once a screen exists, it comes first
		const spec = step.spec;
		const by = step.src === "ai" ? `<span>${ic("sparkles")}${esc(t("Layout chosen by the AI (Llama 3.3)"))}</span>`
			: step.src === "edit" ? `<span>${ic("check")}${esc(t("Changed by you"))}</span>`
			: step.src === "chip" ? `<span>${ic("check")}${esc(t("Suggestion, built without AI"))}</span>`
			: `<span class="warn">${ic("info")}${esc(step.reason === "limit" ? t("Today's AI budget is spent: built by the simple local reader") : t("AI not reachable: built by the simple local reader"))}</span>`;
		const steps = S.hist.length > 1 ? `<ol class="steps" aria-label="${esc(t("Steps"))}">${S.hist.map((h, i) => `<li><button type="button" data-step="${i}" ${i === S.at ? 'aria-current="step"' : ""} title="${esc(h.label)}">${esc(h.label)}</button></li>`).join("")}</ol>` : "";
		$("#screen").innerHTML = `
			<div class="bar"><h2 tabindex="-1" id="scrTitle">${esc(title(spec.title))}</h2>
				<div class="tools">
					<button type="button" class="btn" id="undo" ${S.at <= 0 ? "disabled" : ""} aria-label="${esc(t("Back"))}">${ic("undo-2")}<span class="lbl">${esc(t("Back"))}</span></button>
					<button type="button" class="btn" id="redo" ${S.at >= S.hist.length - 1 ? "disabled" : ""} aria-label="${esc(t("Forward"))}">${ic("redo-2")}<span class="lbl">${esc(t("Forward"))}</span></button>
					<button type="button" class="btn" id="reset">${ic("rotate-ccw")}<span class="lbl">${esc(t("Start over"))}</span></button>
				</div></div>
			<div class="by">${by}<span>${ic("lock")}${esc(t("Figures computed in your browser"))}</span></div>
			${steps}
			<div class="grid${animate ? "" : " still"}" id="grid"></div>`;
		const grid = $("#grid");
		const spans = layout(spec.blocks);
		spec.blocks.forEach((b, i) => { const c = card(b, i, animate); c.style.setProperty("--span", spans[i]); c.dataset.span = spans[i]; grid.appendChild(c); });
		$("#undo").onclick = () => go(S.at - 1); $("#redo").onclick = () => go(S.at + 1);
		$("#reset").onclick = startOver;
		$$("[data-step]").forEach((x) => (x.onclick = () => go(+x.dataset.step)));
		placeholder();
		if (animate) { $("#scrTitle").focus({ preventScroll: true }); const top = $("#screen").getBoundingClientRect().top + scrollY - 16; if (scrollY > top || scrollY < top - innerHeight * 0.5) scrollTo({ top: Math.max(0, top - 160), behavior: reduced() ? "auto" : "smooth" }); }
	}

	/* rows that fill the width: a run of n figures shares a row (up to 4), charts go two by two, a lone chart or a daily one takes the row */
	function layout(blocks) {
		const out = [];
		for (let i = 0; i < blocks.length;) {
			const kpi = blocks[i].kind === "kpi"; let j = i;
			while (j < blocks.length && (blocks[j].kind === "kpi") === kpi) j++;
			const run = j - i;
			for (let k = i; k < j; k++) {
				if (kpi) { const left = run - Math.floor((k - i) / 4) * 4, n = Math.min(4, left); out[k] = 12 / n; }
				else out[k] = blocks[k].by === "day" || (k === j - 1 && (k - i) % 2 === 0) ? 12 : 6;
			}
			i = j;
		}
		return out;
	}

	function startOver() {
		const keep = { hist: S.hist, at: S.at };
		S.hist = []; S.at = -1; S.sel = null; render(false);
		toast(t("Screen cleared."), t("Undo"), () => { S.hist = keep.hist; S.at = keep.at; render(true); });
		q.focus();
	}

	function card(b, i, animate) {
		const el = document.createElement("section");
		el.className = `card ${b.kind === "kpi" ? "kpi" : ""} ${S.sel === i ? "sel" : ""}`;
		el.style.setProperty("--d", `${animate ? i * 70 : 0}ms`);
		if (!animate) el.style.animation = "none";
		el.dataset.i = i;
		const res = E.run(b, data), R = res.R;
		const filt = b.filter?.categories && !["income", "net"].includes(b.measure) ? b.filter.categories.map(catName).join(", ") : "";
		const merch = b.filter?.merchants ? b.filter.merchants.join(", ") : "";
		const amt = b.filter?.min || b.filter?.max ? [b.filter.min ? t("over {v}", { v: money(b.filter.min) }) : "", b.filter.max ? t("under {v}", { v: money(b.filter.max) }) : ""].filter(Boolean).join(", ") : "";
		const per = [t(PRESET_NAMES[b.period.preset] || "Custom period"), rangeLabel(R), filt, merch, amt].filter(Boolean).join(" · ");
		const kinds = b.kind === "kpi" || b.by === "transaction" ? [] : E.TIME.includes(b.by) ? ["line", "bar", "table"] : ["bar", "donut", "table"];
		el.innerHTML = `<div class="card-h"><div class="hd"><h3 id="h${i}">${esc(title(b.title) || t(MEASURE_NAMES[b.measure]))}</h3><p class="per">${esc(per)}</p></div>
			<div class="ctl">
				${kinds.length ? `<div class="dd"><button type="button" data-a="kind" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Chart type"))}" title="${esc(t("Chart type"))}">${ic(KIND_ICONS[b.kind])}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>` : ""}
				<div class="dd"><button type="button" data-a="period" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t("Period"))}" title="${esc(t("Period"))}">${ic("calendar")}</button><ul class="menu" role="listbox" tabindex="-1" hidden></ul></div>
				<button type="button" data-a="del" aria-label="${esc(t("Remove this block"))}" title="${esc(t("Remove this block"))}">${ic("x")}</button>
			</div></div>
			<div class="plot" id="p${i}"></div>
			${sources(b, i, res)}`;
		el.setAttribute("aria-labelledby", "h" + i);
		requestAnimationFrame(() => draw(el.querySelector(".plot"), b, i, res));

		el.querySelector('[data-a="kind"]')?.addEventListener("click", (e) => { e.stopPropagation(); const btn = e.currentTarget; menu(btn, btn.nextElementSibling, kinds.map((k) => ({ k, label: t(KIND_NAMES[k]), icon: KIND_ICONS[k], on: k === b.kind })), (x) => x.k !== b.kind && edit(t("{b}: {k}", { b: title(b.title) || t("Block"), k: t(KIND_NAMES[x.k]).toLowerCase() }), (s) => (s.blocks[i].kind = x.k))); });
		el.querySelector('[data-a="period"]').addEventListener("click", (e) => { e.stopPropagation(); const btn = e.currentTarget; menu(btn, btn.nextElementSibling, E.PRESETS.map((p) => ({ p, label: t(PRESET_NAMES[p]), on: p === b.period.preset })), (x) => x.p !== b.period.preset && edit(t("{b}: {p}", { b: title(b.title) || t("Block"), p: t(PRESET_NAMES[x.p]).toLowerCase() }), (s) => { s.blocks[i].period = { preset: x.p }; if (s.blocks[i].kind === "line" && s.blocks[i].by === "month" && ["this_month", "last_month"].includes(x.p)) s.blocks[i].by = "day"; })); });
		el.querySelector('[data-a="del"]').addEventListener("click", (e) => {
			e.stopPropagation();
			if (cur().spec.blocks.length === 1) return startOver();
			const name = title(b.title) || t("Block");
			edit(t("Removed: {b}", { b: name }), (s) => s.blocks.splice(i, 1));
			if (S.sel === i) S.sel = null; else if (S.sel > i) S.sel--;
			toast(t("Block removed."), t("Undo"), () => go(S.at - 1));
		});
		el.addEventListener("click", (e) => { if (e.target.closest("button, a, li[role], tr, .hit, .sl, .src")) return; select(S.sel === i ? null : i); });
		const sb = el.querySelector(".src > button");
		sb?.addEventListener("click", () => { S.open[i] = !S.open[i]; sb.setAttribute("aria-expanded", S.open[i]); slide(el.querySelector(".src-b"), S.open[i]); });
		el.querySelector(".src")?.addEventListener("click", (e) => {
			const m = e.target.closest("[data-more]"); if (m) { S.pick[i] = { ...(S.pick[i] || {}), n: (S.pick[i]?.n || 12) + 12 }; refreshSrc(el, b, i, res); }
			const c = e.target.closest("[data-clear]"); if (c) { S.pick[i] = null; refreshSrc(el, b, i, res); }
		});
		return el;
	}

	function select(i) {
		S.sel = i; $$("#grid .card").forEach((c) => c.classList.toggle("sel", +c.dataset.i === i)); placeholder();
		if (i != null) { q.focus({ preventScroll: true }); }
	}

	/* the transactions behind a block: always reachable, so any figure can be checked line by line */
	function sources(b, i, res) {
		const n = res.list.length;
		if (!n) return "";
		return `<div class="src"><button type="button" aria-expanded="${S.open[i] ? "true" : "false"}">${ic("receipt-text")}<span>${esc(t(n === 1 ? "See the transaction" : "See the {n} transactions", { n: num(n) }))}</span>${ic("chevron-down", "chev")}</button><div class="src-b" ${S.open[i] ? "" : "hidden"}><div class="src-in">${srcList(b, i, res)}</div></div></div>`;
	}
	function srcList(b, i, res) {
		const pk = S.pick[i] || {}, row = pk.row != null && res.rows ? res.rows[pk.row] : null;
		const list = (row ? row.tx : res.list).slice().sort((x, y) => (x.d < y.d ? 1 : -1)), show = pk.n || 12;
		const head = row ? `<p class="src-f">${esc(t("Only: {g}", { g: keyLabel(b, row.key, true) }))} <button type="button" data-clear>${ic("x")}${esc(t("Show all"))}</button></p>` : "";
		return head + `<ul class="tx">${list.slice(0, show).map((x) => `<li><span class="d">${esc(dt(x.d, { day: "numeric", month: "short" }))}</span><span class="m"><i class="dot" style="background:${CAT[x.c].c}" title="${esc(catName(x.c))}"></i><span>${esc(x.m)}</span></span><span class="a ${x.a > 0 ? "in" : ""}">${esc((x.a > 0 ? "+" : "") + money(x.a))}</span></li>`).join("")}</ul>` + (list.length > show ? `<p class="tx-more"><button type="button" class="btn" data-more>${ic("plus")}${esc(t("Show {n} more", { n: num(Math.min(12, list.length - show)) }))}</button></p>` : "");
	}
	function refreshSrc(el, b, i, res) { const box = el.querySelector(".src-in"); if (box) box.innerHTML = srcList(b, i, res); }
	/* clicking a bar, a slice or a row opens the sources on that group */
	function pickRow(el, b, i, res, r) {
		S.pick[i] = { row: r }; refreshSrc(el, b, i, res);
		if (!S.open[i]) { S.open[i] = true; el.querySelector(".src > button").setAttribute("aria-expanded", "true"); slide(el.querySelector(".src-b"), true); }
	}

	function draw(plot, b, i, res) {
		const el = plot.closest(".card"), colorOf = (r) => (b.by === "category" && CAT[r.key] ? CAT[r.key].c : r.key === "_other" ? "#9A988F" : null);
		const single = b.filter?.categories?.length === 1 && !["income", "net"].includes(b.measure) ? CAT[b.filter.categories[0]].c : b.measure === "income" ? "#187A4F" : null;
		const o = {
			fmt: (v) => val(b, v), short: (v) => valShort(b, v), tick: (k) => keyLabel(b, k, false), label: (r) => (r.key === "_other" ? t("Other ({n})", { n: r.n }) : keyLabel(b, r.key, true)),
			tipLabel: (r) => keyLabel(b, r.key, true), tipExtra: (r) => [b.measure === "count" ? "" : t(r.tx.length === 1 ? "1 transaction" : "{n} transactions", { n: num(r.tx.length) }), r.partial ? t("in progress") : ""].filter(Boolean).join(" · "),
			pct, totalLabel: t("Total"), color: single, aria: title(b.title), small: false,
			pick: (r) => pickRow(el, b, i, res, r),
		};
		if (b.kind === "kpi") return kpi(plot, b, res);
		const rows = res.rows.map((r) => ({ ...r, color: colorOf(r) }));
		if (!res.list.length) { plot.innerHTML = `<p class="per">${esc(t("Nothing in this period."))}</p>`; return; }
		if (b.kind === "table") return table(plot, b, i, res, rows, o);
		if (b.kind === "line") return CH.line(plot, rows, o);
		if (b.kind === "donut") return CH.donut(plot, rows, o);
		if (E.TIME.includes(b.by)) return CH.columns(plot, rows, o);
		return CH.hbars(plot, rows, o);
	}

	function kpi(plot, b, res) {
		let delta = "";
		if (b.compare && res.prev != null && res.R.prev) {
			const d = res.total - res.prev, p = res.prev ? d / Math.abs(res.prev) : null, up = d > 0;
			const what = res.R.partial && res.R.months === 1 ? t("vs the same days last month") : t("vs the period before");
			const shown = p == null || !isFinite(p) ? val(b, Math.abs(d)) : pct(Math.abs(p));
			delta = d === 0 ? `<p class="delta"><b>${ic("minus")}${esc(t("Same"))}</b><span>${esc(what)}</span></p>`
				: `<p class="delta" title="${esc(rangeLabel(res.R.prev))}: ${esc(val(b, res.prev))}"><b>${ic(up ? "trending-up" : "trending-down")}${esc((up ? "+" : "−") + shown)}</b><span>${esc(what)} (${esc(val(b, res.prev))})</span></p>`;
		}
		plot.innerHTML = `<p class="big">${esc(val(b, res.total))}</p>${delta}`;
	}

	function table(plot, b, i, res, rows, o) {
		const el = plot.closest(".card");
		if (b.by === "transaction") {
			plot.innerHTML = `<table class="tb"><thead><tr><th>${esc(t("Date"))}</th><th>${esc(t("Merchant"))}</th><th class="n">${esc(t("Amount"))}</th></tr></thead><tbody>${rows.map((r) => { const x = r.tx[0]; return `<tr><td class="s">${esc(dt(x.d, { day: "numeric", month: "short" }))}</td><td><span class="c"><i class="dot" style="background:${CAT[x.c].c}"></i>${esc(x.m)}</span><br><span class="s">${esc(catName(x.c))}</span></td><td class="n">${esc(money(Math.abs(x.a)))}</td></tr>`; }).join("")}</tbody></table>${res.more ? `<p class="more-n">${esc(t("{n} smaller ones are in the list below.", { n: num(res.more) }))}</p>` : ""}`;
			return;
		}
		const total = rows.reduce((a, r) => a + r.value, 0) || 1, share = !["net", "avg", "avg_month"].includes(b.measure) && !E.TIME.includes(b.by);
		plot.innerHTML = `<table class="tb"><thead><tr><th>${esc(t(E.TIME.includes(b.by) ? "When" : b.by === "category" ? "Category" : "Merchant"))}</th>${share ? `<th class="n">${esc(t("Share"))}</th>` : ""}<th class="n">${esc(t(b.measure === "avg_month" ? "Per month" : b.measure === "count" ? "Purchases" : "Amount"))}</th></tr></thead><tbody>${rows.map((r, n) => `<tr data-r="${n}" tabindex="0"><td><span class="c">${r.color ? `<i class="dot" style="background:${r.color}"></i>` : ""}${esc(o.label(r))}</span></td>${share ? `<td class="n s">${esc(pct(r.value / total))}</td>` : ""}<td class="n">${esc(o.fmt(r.value))}</td></tr>`).join("")}</tbody></table>`;
		$$("tr[data-r]", plot).forEach((tr) => { const go2 = () => pickRow(el, b, i, res, +tr.dataset.r); tr.addEventListener("click", go2); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") go2(); }); });
	}

	/* redraw charts at their new width, without the entrance animation */
	let rz, lastW = innerWidth;
	addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (innerWidth !== lastW && cur()) { lastW = innerWidth; render(false); } }, 150); });

	/* ---------------- toast with undo ---------------- */
	let tt;
	function toast(msg, action, fn) {
		const el = $("#toast"), b = $("#toastBtn");
		$("#toastTx").textContent = msg; b.hidden = !action; b.textContent = action || "";
		b.onclick = () => { el.classList.remove("on"); fn?.(); };
		el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 6000);
	}

	$("#home").addEventListener("click", () => { if (cur()) startOver(); });
	applyLang(); fit();
	const pre = new URLSearchParams(location.search).get("q");
	if (pre) ask(pre, { local: new URLSearchParams(location.search).has("local") });
})();
