/* Margin — a handbook assistant that cites its sources.
 * Split of work: code finds the passages, the model writes sentences that cite them,
 * code checks every citation and every number before anything is shown. */
(() => {
	const D = window.MARGIN_DATA, ic = window.ic;
	const API = "/api/margin";
	const $ = (s, r = document) => r.querySelector(s);
	const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
	document.querySelectorAll("[data-ic]").forEach((el) => (el.outerHTML = ic(el.dataset.ic)));

	/* ---------------- the handbook as passages ---------------- */
	const DOC = {}, P = {};
	for (const d of D.docs) { DOC[d.id] = d; for (const [id, title, text] of d.sections) P[id] = { id, title, text, doc: d.id }; }
	const fmtDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

	/* ---------------- retrieval (BM25, in the browser) ---------------- */
	const STOP = new Set("a an the and or of to in on for at by with from is are am be been can could do does did i im i'm me my we our you your it its this that what which who how when where why much many any some there their they as if about into than then so not no yes will would should may might get got".split(" "));
	const SYN = {
		vacation: "leave", holiday: "leave", holidays: "leave", pto: "leave", "off": "leave", annual: "leave", unused: "carry",
		wfh: "remote", home: "remote", hybrid: "remote", office: "studio", abroad: "abroad", country: "abroad", countries: "abroad",
		expense: "expenses", claim: "expenses", refund: "expenses", reimburse: "expenses", reimbursed: "expenses", spend: "expenses",
		hotel: "hotels", nightly: "hotels", night: "hotels", food: "meals", dinner: "meals", lunch: "meals", meal: "meals",
		laptop: "laptops", computer: "laptops", mac: "laptops", monitor: "screen", screens: "screen", desk: "home-office", chair: "home-office",
		baby: "parental", maternity: "parental", paternity: "parental", partner: "partners", adoption: "adoptive", adopt: "adoptive",
		course: "learning", courses: "learning", training: "learning", conference: "conferences", books: "learning", book: "learning",
		ill: "sick", sickness: "sick", doctor: "doctor's", therapy: "counsellor", therapist: "counsellor", mental: "openwell", stress: "openwell",
		password: "passwords", phishing: "suspicious", scam: "suspicious", "2fa": "two-factor", mfa: "two-factor",
		train: "trains", flight: "flights", fly: "flights", plane: "flights",
	};
	const COUNTRIES = "spain portugal france italy germany greece uk england ireland usa us america canada mexico brazil morocco japan thailand bali indonesia croatia poland belgium switzerland austria sweden norway denmark".split(" ");
	const stem = (w) => w.replace(/(ies)$/, "y").replace(/(ing|ed)$/, "").replace(/([^s])s$/, "$1");
	function groups(text) { // one group per word of the question: the word itself and its synonym
		const out = [];
		for (let w of String(text).toLowerCase().replace(/[€£$]/g, " ").split(/[^a-z0-9'’-]+/)) {
			w = w.replace(/[’']s?$/, "").replace(/^-+|-+$/g, ""); if (!w || STOP.has(w)) continue;
			if (COUNTRIES.includes(w)) { out.push(["abroad"]); continue; }
			const s = SYN[w]; out.push(s ? [stem(s), stem(w)] : [stem(w)]);
		}
		return out;
	}
	const toks = (text) => groups(text).flat();
	const CORPUS = Object.values(P).map((p) => ({ p, t: toks(`${DOC[p.doc].title} ${p.title} ${p.title} ${p.text}`) }));
	const avgLen = CORPUS.reduce((a, c) => a + c.t.length, 0) / CORPUS.length;
	const DF = {}; for (const c of CORPUS) for (const w of new Set(c.t)) DF[w] = (DF[w] || 0) + 1;
	function search(q) {
		q = String(q).replace(/\b(days?|time) off\b/gi, "annual leave days").replace(/\bvacation days?\b/gi, "annual leave days"); // everyday words → the handbook's words
		const qt = [...new Set(toks(q))]; const N = CORPUS.length;
		const scored = CORPUS.map(({ p, t }) => {
			let s = 0;
			for (const w of qt) {
				const f = t.filter((x) => x === w).length; if (!f) continue;
				const idf = Math.log(1 + (N - DF[w] + 0.5) / (DF[w] + 0.5));
				s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (t.length / avgLen))));
			}
			if (DOC[p.doc].status === "superseded") s *= 0.55; // older versions only surface next to the current one
			return { p, s };
		}).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
		// coverage: how many words of the question the best passages actually contain
		const g = groups(q), bag = new Set(scored.slice(0, 3).flatMap((h) => CORPUS.find((c) => c.p === h.p).t));
		const coverage = g.length ? g.filter((alts) => alts.some((w) => bag.has(w))).length / g.length : 0;
		return { hits: scored, qt, coverage };
	}
	const FOUND_MIN = 2.2, COVER_MIN = 0.5; // below either, the handbook does not cover the question

	/* ---------------- checks done by code, not by the model ---------------- */
	const nums = (s) => (String(s).match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[,.](?=\d{3}\b)/g, "").replace(/[.,]$/, ""));
	function verify(sentences, allowed) {
		const kept = [], removed = [];
		for (const s of sentences) {
			const cites = [...new Set((s.cite || []).filter((id) => allowed.includes(id) && P[id]))];
			let text = String(s.text || "").trim(); if (text && !/[.!?…:”"]$/.test(text)) text += "."; // the model often drops the final full stop
			if (!text) continue;
			if (!cites.length) { removed.push({ text, why: "it had no source" }); continue; }
			const srcNums = new Set(cites.flatMap((id) => { const d = DOC[P[id].doc]; return [...nums(P[id].text), ...nums(d.title), d.updated.slice(0, 4)]; })); // the passage, its document's title and year
			const bad = nums(text).filter((n) => !srcNums.has(n));
			if (bad.length) { removed.push({ text, why: `its number (${bad.join(", ")}) is not in the source` }); continue; }
			kept.push({ text, cite: cites });
		}
		return { kept, removed };
	}

	/* ---------------- state ---------------- */
	let THREAD = [];
	try { THREAD = JSON.parse(localStorage.getItem("margin-thread") || "[]"); } catch {}
	const save = () => { try { localStorage.setItem("margin-thread", JSON.stringify(THREAD.filter((x) => !x.pending))); } catch {} };

	/* ---------------- asking ---------------- */
	async function ask(question) {
		question = question.trim().replace(/\s+/g, " "); if (!question) return;
		const turn = { id: Date.now().toString(36), q: question, pending: true, step: 0 };
		THREAD.push(turn); SHOW_THREAD = true; show("ask"); renderThread(); scrollToTurn(turn);
		const tick = async (n) => { turn.step = n; renderTurn(turn); await wait(reduced ? 0 : 380); };
		await tick(1);
		const { hits, coverage } = search(question);
		const top = hits.slice(0, 5).map((h) => h.p.id);
		// a current passage that replaced an older one brings its older twin along, so changes can be explained
		for (const id of [...top]) { const d = DOC[P[id].doc]; if (d.status === "current") { const old = D.docs.find((x) => x.supersededBy === d.id); const twin = old?.sections.find((s) => s[1] === P[id].title); if (twin && !top.includes(twin[0])) top.push(twin[0]); } }
		await tick(2);
		if (!hits.length || hits[0].s < FOUND_MIN || coverage < COVER_MIN) {
			Object.assign(turn, { pending: false, status: "notfound", near: nearDocs(hits) }); save(); renderTurn(turn); return;
		}
		let res = null, mode = "ai";
		try { res = await callModel(question, top); } catch (e) { mode = "basic"; }
		if (mode === "basic" && coverage < 0.67) { await tick(3); Object.assign(turn, { pending: false, status: "notfound", near: nearDocs(hits), mode }); save(); renderTurn(turn); return; } // without the AI, only quote when the match is clear
		await tick(3);
		let kept = [], removed = [], found = true;
		if (mode === "ai") {
			found = res.found !== false && res.answer.length > 0;
			({ kept, removed } = verify(res.answer, top));
			if (!kept.length) found = false;
		} else {
			// Basic mode: no AI, so no paraphrase — quote the best passages word for word.
			const best = hits.slice(0, 2).filter((h, i) => i === 0 || (h.p.doc === hits[0].p.doc && h.s > hits[0].s * 0.8)).map((h) => h.p); // a second passage only from the same document
			kept = best.map((p) => ({ text: p.text, cite: [p.id], quote: true }));
		}
		if (!found) { Object.assign(turn, { pending: false, status: "notfound", near: nearDocs(hits), removed, mode }); save(); renderTurn(turn); return; }
		const order = []; for (const s of kept) for (const id of s.cite) if (!order.includes(id)) order.push(id);
		Object.assign(turn, { pending: false, status: "answered", mode, sentences: kept, removed, sources: order, read: top.length, model: res?.model || null });
		save(); renderTurn(turn);
	}
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	async function callModel(question, ids) {
		const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000);
		try {
			const passages = ids.map((id) => { const p = P[id], d = DOC[p.doc]; return { id, doc: d.title, section: p.title, updated: d.updated, status: d.status, text: p.text }; });
			const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, passages }), signal: ctl.signal });
			if (!r.ok) throw new Error("HTTP " + r.status);
			const j = await r.json(); if (!Array.isArray(j.answer)) throw new Error("bad");
			return j;
		} finally { clearTimeout(to); }
	}
	function nearDocs(hits) { const seen = []; for (const h of hits) { const d = h.p.doc; if (!seen.includes(d) && DOC[d].status === "current") seen.push(d); if (seen.length === 3) break; } return seen; }

	/* ---------------- rendering ---------------- */
	const STEPS = ["Searching 9 documents", "Reading the passages that match", "Checking every sentence against its source"];
	function turnHtml(t) {
		const head = `<div class="q"><h2>${esc(t.q)}</h2>${t.pending ? "" : `<div class="q-acts"><button type="button" class="btn btn-text btn-sm" data-act="remove" data-t="${t.id}"><span class="sr">Remove this question</span>${ic("x")}<span aria-hidden="true">Remove</span></button></div>`}</div>`;
		if (t.pending) return `${head}<div class="work" aria-live="polite"><ul>${STEPS.map((s, i) => `<li class="${t.step > i + 1 ? "done" : t.step === i + 1 ? "on" : ""}">${t.step > i + 1 ? ic("check") : t.step === i + 1 ? ic("loader-circle", "spin") : ic("circle")}${s}</li>`).join("")}</ul></div><div></div>`;
		if (t.status === "notfound") {
			return `${head}<div class="nf"><span class="badge none">${ic("search-x")}Not in the handbook</span>
				<h3>The handbook doesn’t answer this.</h3>
				<p>I searched all 9 documents and found nothing that covers it, so I won’t guess. ${t.removed?.length ? "The draft answer I had couldn’t be backed by a source." : ""}</p>
				${t.near?.length ? `<p style="margin-bottom:8px">Closest documents:</p><ul class="near">${t.near.map((d) => `<li><button type="button" class="chip" data-open="${d}">${esc(DOC[d].title)}</button></li>`).join("")}</ul>` : ""}
				<div class="row"><button type="button" class="btn btn-ink" data-act="human" data-t="${t.id}">${ic("mail")}Ask ${esc(D.people.team)}</button><button type="button" class="btn btn-text" data-go="handbook">${ic("book-open")}Browse the handbook</button></div></div><div></div>`;
		}
		const num = (id) => t.sources.indexOf(id) + 1;
		const body = t.sentences.map((s, i) => `<span class="s" data-s="${i}">${esc(s.quote ? `“${s.text}”` : s.text)}</span>${s.cite.map((id) => `<button type="button" class="cite" data-cite="${id}" data-t="${t.id}" aria-label="Source ${num(id)}: ${esc(DOC[P[id].doc].title)}, ${esc(P[id].title)}">${num(id)}</button>`).join("")}`).join(" ");
		const old = t.sources.some((id) => DOC[P[id].doc].status === "superseded");
		const trust = t.mode === "basic"
			? `<span class="badge none">${ic("quote")}Quoted directly</span><span>The AI is unavailable, so these are the handbook passages that match best, word for word.</span>`
			: `<span class="badge ok">${ic("shield-check")}${t.sentences.length === 1 ? "1 sentence" : `${t.sentences.length} sentences`}, each checked against its source</span>${old ? `<span class="badge old">${ic("history")}Mentions an older version</span>` : ""}<span class="model">Llama 3.3 · read ${t.read} passages</span>`;
		const removed = t.removed?.length ? `<div class="removed"><b>${t.removed.length === 1 ? "1 sentence was removed" : `${t.removed.length} sentences were removed`}</b> because ${esc(t.removed[0].why)}${t.removed.length > 1 ? " (and similar)" : ""}: <s>${esc(t.removed[0].text)}</s></div>` : "";
		const sources = `<aside class="margin" aria-label="Sources"><p class="margin-h">Sources</p>${t.sources.map((id) => srcCard(id, num(id), t.id)).join("")}</aside>`;
		return `${head}<div><div class="ans"><p>${body}</p></div><div class="trust">${trust}</div>${removed}
			<div class="acts"><button type="button" class="btn btn-text btn-sm" data-act="copy" data-t="${t.id}">${ic("copy")}Copy with sources</button><button type="button" class="btn btn-text btn-sm" data-act="flag" data-t="${t.id}">${ic("flag")}Wrong answer?</button><button type="button" class="btn btn-text btn-sm" data-act="human" data-t="${t.id}">${ic("mail")}Ask ${esc(D.people.team)}</button></div></div>${sources}`;
	}
	function srcCard(id, n, tid) {
		const p = P[id], d = DOC[p.doc];
		const old = d.status === "superseded" ? `<div class="old-note">${ic("history")}<span>Older version, replaced on ${fmtDate(DOC[d.supersededBy].updated)}. Kept to show what changed.</span></div>` : "";
		return `<article class="src" data-src="${id}" data-t="${tid}"><div class="src-in"><div class="src-top"><span class="src-n">${n}</span><div class="src-doc">${esc(d.title)}<small>${esc(p.title)}</small></div></div>
			<blockquote>${esc(p.text)}</blockquote>${old}
			<div class="src-foot"><span>Updated ${fmtDate(d.updated)} · ${esc(d.owner)}</span><button type="button" class="btn btn-text" data-open="${d.id}" data-pass="${id}">Open in handbook ${ic("arrow-right")}</button></div></div></article>`;
	}
	function renderTurn(t) {
		let el = document.getElementById("t-" + t.id);
		if (!el) { el = document.createElement("article"); el.className = "turn"; el.id = "t-" + t.id; $("#thread").append(el); }
		el.innerHTML = turnHtml(t);
	}
	let SHOW_THREAD = false; // the home page always comes first; earlier questions are one click away
	function renderThread() {
		const on = SHOW_THREAD && THREAD.length > 0;
		$("#homeIntro").hidden = on; $("#thread").hidden = !on; $("#dock").hidden = !on;
		$("#thread").innerHTML = ""; if (on) THREAD.forEach(renderTurn);
		const n = THREAD.filter((x) => !x.pending).length, r = $("#resume");
		if (r) { r.hidden = on || !n; r.querySelector("[data-n]").textContent = n === 1 ? "You asked 1 question earlier." : `You asked ${n} questions earlier.`; }
	}
	const scrollToTurn = (t) => requestAnimationFrame(() => document.getElementById("t-" + t.id)?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }));

	/* citation ↔ sentence ↔ source: hover, focus or tap links all three */
	function link(btn, on) {
		const tid = btn.dataset.t, id = btn.dataset.cite || btn.dataset.src, box = document.getElementById("t-" + tid); if (!box) return;
		box.querySelectorAll(`.cite[data-cite="${id}"]`).forEach((c) => { c.classList.toggle("hl", on); let s = c.previousElementSibling; while (s && !s.classList.contains("s")) s = s.previousElementSibling; s?.classList.toggle("hl", on); });
		box.querySelector(`.src[data-src="${id}"]`)?.classList.toggle("hl", on);
	}
	document.addEventListener("mouseover", (e) => { const b = e.target.closest(".cite, .src"); if (b) link(b, true); });
	document.addEventListener("mouseout", (e) => { const b = e.target.closest(".cite, .src"); if (b && !b.contains(e.relatedTarget)) link(b, false); });
	document.addEventListener("focusin", (e) => { const b = e.target.closest(".cite"); if (b) link(b, true); });
	document.addEventListener("focusout", (e) => { const b = e.target.closest(".cite"); if (b) link(b, false); });

	/* ---------------- handbook ---------------- */
	let lastView = { from: null, scroll: 0 };
	function renderLibrary() {
		const cur = D.docs.filter((d) => d.status === "current"), old = D.docs.filter((d) => d.status !== "current");
		$("#hbBox").innerHTML = `<div class="hb"><span class="eyebrow">What Margin can read</span><h1>The Halden handbook</h1><p class="lead">${cur.length} current documents and ${old.length} older version. Margin answers only from these — nothing else.</p>
			<div class="docs">${[...cur, ...old].map((d) => `<button type="button" class="doc-card" data-open="${d.id}">${d.status === "superseded" ? `<span class="badge old" style="align-self:flex-start">${ic("history")}Older version</span>` : ""}<b>${esc(d.title)}</b><span>${esc(d.summary)}</span><small>${d.sections.length} sections · updated ${fmtDate(d.updated)}</small></button>`).join("")}</div></div>`;
	}
	function openDoc(id, pass) {
		const d = DOC[id]; if (!d) return;
		if (!$("#ask").hidden) lastView = { from: "ask", scroll: scrollY };
		show("handbook", true);
		const back = lastView.from === "ask" && THREAD.length ? `<button type="button" class="btn btn-text" data-back>${ic("arrow-left")}Back to the answer</button>` : `<button type="button" class="btn btn-text" data-go="handbook">${ic("arrow-left")}All documents</button>`;
		$("#hbBox").innerHTML = `<div class="reader">${back}<h1>${esc(d.title)}</h1><div class="meta"><span>Owner: ${esc(d.owner)}</span><span>Updated ${fmtDate(d.updated)}</span>${d.status === "current" ? `<span class="badge ok">${ic("circle-check")}Current</span>` : `<span class="badge old">${ic("history")}Older version</span>`}</div>
			${d.status === "superseded" ? `<div class="banner">${ic("triangle-alert")}<span>This version was replaced on ${fmtDate(DOC[d.supersededBy].updated)}. <button type="button" class="btn btn-text btn-sm" style="padding:0;color:inherit;text-decoration:underline" data-open="${d.supersededBy}">Read the current one</button></span></div>` : ""}
			${d.sections.map(([pid, t, x]) => `<section class="sec${pid === pass ? " hl" : ""}" id="sec-${pid}"><h3>${esc(t)}<code>${pid}</code></h3><p>${esc(x)}</p></section>`).join("")}</div>`;
		requestAnimationFrame(() => { if (pass) document.getElementById("sec-" + pass)?.scrollIntoView({ block: "center" }); else scrollTo(0, 0); });
	}

	/* ---------------- views ---------------- */
	function show(v, keep) {
		$("#ask").hidden = v !== "ask"; $("#handbook").hidden = v !== "handbook";
		document.querySelectorAll(".nav [data-go]").forEach((b) => { if (b.dataset.go === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
		if (v === "handbook" && !keep) { renderLibrary(); scrollTo(0, 0); }
	}

	/* ---------------- toast with undo ---------------- */
	let toastT;
	function toast(msg, undoLabel, undo) {
		const el = $("#toast"); clearTimeout(toastT);
		el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">${esc(undoLabel || "Undo")}</button>` : ""}`;
		if (undo) el.querySelector("button").onclick = () => { undo(); el.classList.remove("on"); };
		el.classList.add("on"); toastT = setTimeout(() => el.classList.remove("on"), undo ? 6000 : 3200);
	}

	/* ---------------- human exit ---------------- */
	function human(t) {
		const scrim = document.createElement("div"); scrim.className = "scrim";
		const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "mh");
		const draft = `Hi ${D.people.team},\n\n${t ? `I asked the handbook assistant: “${t.q}”${t.status === "notfound" ? " — and the handbook doesn’t cover it." : ", and I’d like to double-check the answer."}` : ""}\n\nThanks!`;
		m.innerHTML = `<div class="box"><h3 id="mh">Ask ${esc(D.people.team)}</h3><p>A person answers within one working day. Edit the message as you like.</p>
			<div class="to">${ic("mail")}To: ${esc(D.people.email)} · or ${esc(D.people.slack)} on Slack</div>
			<label class="sr" for="hm">Message</label><textarea id="hm">${esc(draft)}</textarea>
			<div class="row"><button type="button" class="btn btn-text" data-m="cancel">Cancel</button><button type="button" class="btn btn-ink" data-m="send">${ic("arrow-right")}Send</button></div></div>`;
		const close = () => { scrim.remove(); m.remove(); document.removeEventListener("keydown", key); opener?.focus(); };
		const opener = document.activeElement;
		const key = (e) => { if (e.key === "Escape") close(); };
		document.addEventListener("keydown", key);
		m.addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (e.target === m) close(); if (!b) return; if (b.dataset.m === "send") toast("Sent to People Ops (demo — nothing really leaves this page)."); close(); });
		document.body.append(scrim, m); $("#hm", m).focus();
	}

	/* ---------------- events ---------------- */
	function wireAsk(form) {
		const ta = form.querySelector("textarea"), go = form.querySelector(".go");
		const fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; go.disabled = !ta.value.trim(); };
		ta.addEventListener("input", fit);
		ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
		form.addEventListener("submit", (e) => { e.preventDefault(); const v = ta.value; if (!v.trim() || THREAD.some((x) => x.pending)) return; ta.value = ""; fit(); ask(v); });
	}
	wireAsk($("#askForm")); wireAsk($("#askForm2"));
	$("#examples").innerHTML = D.examples.map((x) => `<li><button type="button" class="chip" data-ex="${esc(x)}">${esc(x)}</button></li>`).join("");

	document.addEventListener("click", (e) => {
		const ex = e.target.closest("[data-ex]"); if (ex) return ask(ex.dataset.ex);
		const go = e.target.closest("[data-go]"); if (go) { if (go.dataset.go === "ask" && !THREAD.some((x) => x.pending)) { SHOW_THREAD = false; renderThread(); } show(go.dataset.go); if (go.dataset.go === "ask") scrollTo(0, 0); return; }
		if (e.target.closest("[data-resume]")) { SHOW_THREAD = true; show("ask"); renderThread(); requestAnimationFrame(() => { const last = $("#thread").lastElementChild; last?.scrollIntoView({ block: "start" }); }); return; }
		if (e.target.closest("[data-forget]")) { const before = THREAD.slice(); THREAD = []; save(); renderThread(); toast("Earlier questions cleared.", "Undo", () => { THREAD = before; save(); renderThread(); }); return; }
		const op = e.target.closest("[data-open]"); if (op) return openDoc(op.dataset.open, op.dataset.pass);
		if (e.target.closest("[data-back]")) { show("ask"); requestAnimationFrame(() => scrollTo(0, lastView.scroll)); return; }
		const c = e.target.closest(".cite");
		if (c) { const card = document.querySelector(`#t-${c.dataset.t} .src[data-src="${c.dataset.cite}"]`); if (card) { link(c, true); card.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); setTimeout(() => link(c, false), 1600); } return; }
		const a = e.target.closest("[data-act]"); if (!a) return;
		const t = THREAD.find((x) => x.id === a.dataset.t);
		if (a.dataset.act === "human") return human(t);
		if (a.dataset.act === "remove" && t) { const i = THREAD.indexOf(t); THREAD.splice(i, 1); save(); renderThread(); toast("Question removed.", "Undo", () => { THREAD.splice(i, 0, t); save(); renderThread(); }); return; }
		if (a.dataset.act === "copy" && t) {
			const txt = `${t.q}\n\n${t.sentences.map((s) => `${s.text} ${s.cite.map((id) => `[${t.sources.indexOf(id) + 1}]`).join("")}`).join(" ")}\n\n${t.sources.map((id, i) => `[${i + 1}] ${DOC[P[id].doc].title} — ${P[id].title} (updated ${fmtDate(DOC[P[id].doc].updated)})`).join("\n")}`;
			navigator.clipboard?.writeText(txt).then(() => toast("Copied, with its sources."), () => toast("Couldn’t copy — select the text instead."));
			return;
		}
		if (a.dataset.act === "flag" && t) { t.flagged = true; save(); toast("Thanks — People Ops will review this answer.", "Undo", () => { t.flagged = false; save(); }); }
	});
	$("#clearAll").addEventListener("click", () => {
		const before = THREAD.slice(); THREAD = []; SHOW_THREAD = false; save(); renderThread(); scrollTo(0, 0);
		toast("Conversation cleared.", "Undo", () => { THREAD = before; SHOW_THREAD = true; save(); renderThread(); });
	});

	/* ---------------- the annotated example on the home page (static, nothing is asked) ---------------- */
	function renderExample() {
		const box = $("#t-example"); if (!box) return;
		box.innerHTML = turnHtml({ id: "example", q: "Can I work from Spain for a month?", status: "answered", mode: "ai", read: 5, sources: ["P9"],
			sentences: [{ text: "You can work from another country for up to 30 days per year.", cite: ["P9"] }, { text: "Ask People Ops at least 3 weeks before, because some countries need a permit even for short stays.", cite: ["P9"] }],
			removed: [{ text: "Spain is fine for up to 60 days because it is in the EU.", why: "its number (60) is not in the source" }] });
		box.querySelector(".src")?.insertAdjacentHTML("afterbegin", '<span class="tag" aria-hidden="true">1</span>');
		box.querySelector(".removed")?.insertAdjacentHTML("afterbegin", '<span class="tag" aria-hidden="true">2</span>');
	}
	renderExample();
	document.addEventListener("click", (e) => { if (e.target.closest("[data-focus-ask]")) { const q = $("#q"); q.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); setTimeout(() => q.focus({ preventScroll: true }), reduced ? 0 : 450); } });

	/* ---------------- boot ---------------- */
	renderThread();
	const qs = new URLSearchParams(location.search);
	if (qs.get("q")) ask(qs.get("q"));
	if (qs.get("doc")) openDoc(qs.get("doc"), qs.get("pass"));
	window.MARGIN_DEBUG = { search, verify, toks };
})();
