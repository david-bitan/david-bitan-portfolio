/* Margin — understand any document, and see where it says it.
 * Files are read in the browser (pdf.js for PDF, mammoth for Word). Code cuts them into passages and
 * remembers where each one sits on its page. The model writes sentences that cite passage ids; code
 * checks every id and every number before anything is shown, then draws the passage highlighted. */
(() => {
	const I = window.MARGIN_I18N, t = I.t, ic = window.ic;
	const API = "/api/margin";
	const $ = (s, r = document) => r.querySelector(s);
	const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const paintIcons = (root = document) => root.querySelectorAll("[data-ic]").forEach((el) => (el.outerHTML = ic(el.dataset.ic, el.className)));
	paintIcons();
	if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

	const MAX_PAGES = 60, MAX_MB = 20, MAX_FILES = 5, WHOLE = 12000; // up to this many characters, the AI reads everything
	const S = { step: 1, docs: [], loading: 0, out: null, results: [], speaking: null, seq: 0, open: null };
	const allChunks = () => S.docs.flatMap((d) => d.chunks);
	const chunk = (id) => { for (const d of S.docs) { const c = d.chunks.find((x) => x.id === id); if (c) return c; } return null; };
	const docOf = (c) => S.docs.find((d) => d.fid === c.fid);

	/* ---------------- language ---------------- */
	let startLang = "en"; try { startLang = localStorage.getItem("margin-lang") || (navigator.language || "en").slice(0, 2); } catch {}
	I.set(startLang);
	function setLang(l) {
		I.set(l); try { localStorage.setItem("margin-lang", I.lang); } catch {}
		I.translateStatic(); $("#langCode").textContent = I.LANGS.find((x) => x[0] === I.lang)[2];
		if (!S.outChosen) S.out = I.lang;
		renderSteps(); renderFiles(); renderOut(); renderTries(); renderResults(); refreshListen();
	}
	function initLang() {
		const btn = $("#langBtn"), list = $("#langList");
		const paint = () => (list.innerHTML = I.LANGS.map(([k, name, code]) => `<li role="option" tabindex="-1" data-l="${k}" aria-selected="${k === I.lang}" lang="${k}">${name}<small>${code}</small></li>`).join(""));
		const open = (on) => { list.hidden = !on; btn.setAttribute("aria-expanded", String(on)); if (on) { paint(); (list.querySelector('[aria-selected="true"]') || list.firstElementChild).focus(); } };
		btn.onclick = (e) => { e.stopPropagation(); open(list.hidden); };
		list.onclick = (e) => { const li = e.target.closest("li"); if (!li) return; open(false); setLang(li.dataset.l); btn.focus(); };
		list.onkeydown = (e) => {
			const items = [...list.children], i = items.indexOf(document.activeElement);
			if (e.key === "Escape") { open(false); btn.focus(); }
			else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
			else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
			else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); }
		};
		document.addEventListener("click", (e) => { if (!e.target.closest("#langWrap")) open(false); });
	}

	/* ---------------- steps ---------------- */
	function renderSteps() {
		document.querySelectorAll("#steps li").forEach((li) => {
			const n = +li.dataset.step;
			if (n === S.step) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
			li.classList.toggle("done", n < S.step);
			li.querySelector(".n").innerHTML = n < S.step ? ic("check") : String(n);
		});
	}
	function go(n) {
		S.step = n; $("#s1").hidden = n !== 1; $("#s2").hidden = n !== 2; renderSteps();
		if (n === 2) { renderS2Files(); renderOut(); renderTries(); }
		scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
		const h = $(`#s${n} h1, #s${n} h2`); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
	}

	/* ---------------- files ---------------- */
	async function addFiles(list, isSample) {
		$("#err1").hidden = true;
		const files = [...list].slice(0, Math.max(0, MAX_FILES - S.docs.length));
		const errs = [];
		await Promise.all(files.map(async (file) => {
			const name = file.name || "document", ext = name.toLowerCase().split(".").pop();
			if (!["pdf", "docx"].includes(ext)) return errs.push(`${name} — ${t("This file type isn’t supported yet. Use a PDF or a Word (.docx) file.")}`);
			if (file.size > MAX_MB * 1048576) return errs.push(`${name} — ${t("This file is larger than 20 MB.")}`);
			if (S.docs.some((d) => d.name === name && d.size === file.size)) return;
			const fid = "f" + ++S.seq, row = { fid, name, loading: true };
			S.docs.push(row); S.loading++; renderFiles();
			try {
				const buf = await file.arrayBuffer();
				const doc = ext === "pdf" ? await readPdf(buf) : await readDocx(buf);
				Object.assign(doc, { fid, name, size: file.size, sample: Boolean(isSample) });
				doc.chunks.forEach((c) => { c.fid = fid; c.id = "c" + ++S.cseq; });
				doc.lang = detectLang(doc.chunks.map((c) => c.text).join(" "));
				doc.words = doc.chunks.reduce((a, c) => a + c.text.split(/\s+/).filter(Boolean).length, 0);
				doc.chars = doc.chunks.reduce((a, c) => a + c.text.length, 0);
				const i = S.docs.indexOf(row); if (i >= 0) S.docs[i] = doc;
			} catch (e) {
				console.warn("Margin, reading:", e); S.docs = S.docs.filter((d) => d !== row);
				errs.push(`${name} — ${t("I couldn’t open this file. It may be damaged or protected by a password.")}`);
			} finally { S.loading--; S.index = null; renderFiles(); }
		}));
		if (errs.length) { const err = $("#err1"); err.innerHTML = `${ic("circle-alert")}<span>${errs.map(esc).join("<br>")}</span>`; err.hidden = false; }
	}
	S.cseq = 0;
	function renderFiles() {
		const ready = S.docs.filter((d) => !d.loading);
		$("#files").innerHTML = S.docs.map((d) => {
			if (d.loading) return `<li class="frow busy-row"><span class="file-ic">${ic("file-text")}</span><div><b>${esc(d.name)}</b><small>${ic("loader-circle", "spin")}${t("Reading your document…")}</small></div></li>`;
			const bits = [d.type === "pdf" ? "PDF" : "Word", d.pages ? (d.pages === 1 ? t("1 page") : t("{n} pages", { n: d.pages })) : null, t("{n} words", { n: d.words.toLocaleString(I.lang) }), t(LANG_NAME[d.lang])].filter(Boolean);
			const warn = d.words < 30 ? `<span class="w">${t("I found almost no text. This may be a scan or a photo inside a PDF — I can’t read those yet.")}</span>` : d.pages > MAX_PAGES ? `<span class="w">${t("This document is long: I’ll read its first {n} pages.", { n: MAX_PAGES })}</span>` : "";
			return `<li class="frow" data-fid="${d.fid}"><span class="file-ic">${ic("file-text")}</span><div><b>${esc(d.name)}</b><small><span>${bits.map(esc).join(" · ")}</span>${warn}</small></div>${d.words >= 30 ? `<span class="ok-ic">${ic("circle-check")}</span>` : ""}<button type="button" class="btn btn-text btn-sm" data-rm="${d.fid}" aria-label="${esc(t("Remove"))} ${esc(d.name)}">${ic("x")}<span class="hide-m">${t("Remove")}</span></button></li>`;
		}).join("");
		const has = S.docs.length > 0;
		$("#sample").hidden = has;
		$("#drop").classList.toggle("compact", has);
		$("#drop").hidden = S.docs.length >= MAX_FILES;
		$("#dropTitle").textContent = t("Drop one or more PDF or Word files here"); $("#dropTitle").hidden = has;
		$("#dropBtn").innerHTML = has ? `${ic("file-up")}<span>${t("Add another file")}</span>` : `${ic("file-text")}<span>${t("Choose files")}</span>`;
		$("#next1").disabled = !ready.some((d) => d.words >= 30) || S.loading > 0;
		renderS2Files();
	}
	function renderS2Files() { const r = S.docs.filter((d) => !d.loading); $("#s2files").textContent = r.map((d) => d.name).join(" · "); }

	/* PDF: text items → lines → passages, each with its rectangles on the page */
	async function readPdf(buf) {
		const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
		const n = Math.min(pdf.numPages, MAX_PAGES), chunks = [], pages = [];
		for (let p = 1; p <= n; p++) {
			const page = await pdf.getPage(p), vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent();
			const items = tc.items.filter((it) => it.str && it.str.trim()).map((it) => {
				const tx = pdfjsLib.Util.transform(vp.transform, it.transform), h = Math.hypot(tx[2], tx[3]) || 10;
				return { s: it.str, x: tx[4], base: tx[5], h, w: it.width, rtl: it.dir === "rtl" || /[֐-׿]/.test(it.str) };
			});
			items.sort((a, b) => a.base - b.base || a.x - b.x);
			const lines = [];
			for (const it of items) {
				const L = lines.find((l) => Math.abs(l.base - it.base) < Math.max(l.h, it.h) * 0.45);
				if (L) { L.items.push(it); L.h = Math.max(L.h, it.h); } else lines.push({ base: it.base, h: it.h, items: [it] });
			}
			lines.sort((a, b) => a.base - b.base);
			for (const L of lines) {
				const rtl = L.items.filter((i) => i.rtl).length > L.items.length / 2;
				L.items.sort((a, b) => (rtl ? b.x - a.x : a.x - b.x));
				L.text = L.items.reduce((acc, it) => (acc && !/\s$/.test(acc) && !/^\s/.test(it.s) ? acc + " " : acc) + it.s, "").replace(/\s+/g, " ").trim();
				L.x = Math.min(...L.items.map((i) => i.x)); L.r = Math.max(...L.items.map((i) => i.x + i.w)); L.top = L.base - L.h * 0.95;
			}
			const hs = lines.map((l) => l.h).sort((a, b) => a - b), mid = hs[Math.floor(hs.length / 2)] || 10;
			const body = lines.filter((l) => l.text.length > 2 && l.h > mid * 0.75); // tiny text (page numbers, running footers) is not content
			const gaps = body.slice(1).map((l, i) => l.base - body[i].base).filter((g) => g > 0).sort((a, b) => a - b);
			const normal = gaps.length ? gaps[Math.floor(gaps.length * 0.3)] : 14;
			let block = null; const blocks = [];
			body.forEach((l, i) => {
				const gap = i ? l.base - body[i - 1].base : Infinity;
				if (!block || gap > normal * 1.45 || block.text.length > 700) { block = { lines: [] }; blocks.push(block); }
				block.lines.push(l); block.text = block.lines.map((x) => x.text).join(" ");
			});
			for (let i = 0; i < blocks.length - 1; i++) if (blocks[i].lines.length === 1 && blocks[i].text.length < 70) { blocks[i + 1].lines.unshift(...blocks[i].lines); blocks.splice(i, 1); i--; } // a heading joins its paragraph
			const left = Math.min(...body.map((l) => l.x), vp.width), right = Math.max(...body.map((l) => l.r), 0);
			pages.push({ w: vp.width, h: vp.height, left: isFinite(left) ? left : 0, right: right || vp.width });
			for (const b of blocks) {
				const text = b.lines.map((x) => x.text).join(" ").replace(/\s+/g, " ").trim(); if (!text) continue;
				chunks.push({ page: p, text, rects: b.lines.map((l) => ({ x: l.x, y: l.top, w: l.r - l.x, h: l.h * 1.25 })) });
			}
		}
		return { type: "pdf", pdf, pages: pdf.numPages, read: n, pageInfo: pages, chunks, canvases: {} };
	}
	/* Word: mammoth turns the file into simple HTML; each block becomes a passage */
	async function readDocx(buf) {
		const res = await mammoth.convertToHtml({ arrayBuffer: buf });
		const box = document.createElement("div"); box.innerHTML = res.value;
		const blocks = [...box.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td")].filter((el) => el.textContent.trim() && !(el.tagName === "TD" && el.querySelector("p")) && !(el.tagName === "LI" && el.querySelector("p")));
		const chunks = []; let pending = [];
		const isHead = (el) => /^H\d$/.test(el.tagName) || (el.tagName === "P" && el.textContent.trim().length < 70 && el.querySelector("strong") && el.textContent.trim() === el.querySelector("strong").textContent.trim());
		blocks.forEach((el) => {
			if (isHead(el)) { pending.push(el); return; }
			const els = [...pending, el]; pending = [];
			chunks.push({ page: null, els, text: els.map((x) => x.textContent.replace(/\s+/g, " ").trim()).join(" — ") });
		});
		pending.forEach((x) => chunks.push({ page: null, els: [x], text: x.textContent.trim() }));
		return { type: "docx", box, pages: null, chunks, html: () => box.innerHTML };
	}
	const LANG_NAME = { en: "English", fr: "French", he: "Hebrew", other: "another language" };
	function detectLang(txt) {
		const s = txt.slice(0, 6000); const he = (s.match(/[֐-׿]/g) || []).length, lat = (s.match(/[a-zA-Z]/g) || []).length;
		if (he > lat * 0.6) return "he";
		const w = s.toLowerCase().split(/[^a-zàâçéèêëîïôûùüÿœ']+/);
		const fr = w.filter((x) => ["le", "la", "les", "des", "est", "vous", "une", "pour", "dans", "avec", "pas", "du"].includes(x)).length;
		const en = w.filter((x) => ["the", "and", "you", "is", "for", "with", "are", "your", "of", "to", "not"].includes(x)).length;
		return fr > en ? "fr" : en > 0 ? "en" : "other";
	}
	async function pageCanvas(d, p, scale = 2) {
		const key = p + "@" + scale; if (d.canvases[key]) return d.canvases[key];
		const page = await d.pdf.getPage(p), vp = page.getViewport({ scale }), c = document.createElement("canvas");
		c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
		await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
		return (d.canvases[key] = c);
	}

	/* ---------------- step 2 ---------------- */
	function renderOut() {
		if (!S.out) S.out = I.lang;
		$("#outLang").innerHTML = I.LANGS.map(([k, name]) => `<button type="button" data-out="${k}" aria-pressed="${S.out === k}" lang="${k}">${name}</button>`).join("");
	}
	const TRIES = ["How many days off do I get?", "Can I work from abroad?", "What happens if I leave?", "Can I expense a gym membership?"];
	function renderTries() { $("#tries").innerHTML = S.docs.some((d) => d.sample) ? `<span>${t("Try:")}</span>${TRIES.map((q) => `<button type="button" class="chip" data-try="${esc(q)}">${esc(t(q))}</button>`).join("")}` : ""; }
	function openTool(k) {
		S.open = S.open === k && k === "ask" ? null : k;
		document.querySelectorAll(".tool[data-tool]").forEach((b) => { const on = b.dataset.tool === S.open; if (b.hasAttribute("aria-expanded")) b.setAttribute("aria-expanded", String(on)); b.classList.toggle("on", on); });
		$("#askPanel").hidden = S.open !== "ask";
		if (S.open === "ask") requestAnimationFrame(() => $("#q").focus());
	}

	/* ---------------- choosing passages for the AI ---------------- */
	const ready = () => S.docs.filter((d) => !d.loading && d.words >= 30);
	const totalChars = () => ready().reduce((a, d) => a + d.chars, 0);
	function contextChunks(question) {
		const all = ready().flatMap((d) => d.chunks);
		if (totalChars() <= WHOLE) return all;
		const hits = new Set(bm25(question).slice(0, 14).map((h) => h.c));
		return all.filter((c) => hits.has(c));
	}
	function importantChunks() { // long documents: keep the passages most likely to matter (numbers, duties, limits)
		const all = ready().flatMap((d) => d.chunks); if (totalChars() <= WHOLE) return all;
		const score = (c) => (c.text.match(/\d/g) || []).length * 0.4 + (c.text.match(/\b(must|may not|cannot|within|deadline|penalt|fee|notice|terminate|liable|refund|doit|doivent|délai|pénalit|résili|frais|interdit|חייב|אסור|תוך|קנס|הודעה)/gi) || []).length * 2;
		let total = 0; const keep = new Set();
		for (const c of [...all].sort((a, b) => score(b) - score(a))) { if (total + c.text.length > WHOLE) continue; keep.add(c); total += c.text.length; }
		return all.filter((c) => keep.has(c));
	}
	const STOP = new Set("the a an and or of to in on for at by with from is are be it this that what which who how when where can could do does i my me we you your our not no yes le la les un une des et ou de du au aux en dans pour par avec sur est sont je mon ma mes vous votre nos ne pas oui que qui quoi comment quand ce cette".split(" "));
	function toks(s) { const out = []; for (let w of String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^\p{L}\p{N}]+/u)) { if (!w || STOP.has(w)) continue; if (/^[֐-׿]{4,}$/.test(w) && /^[והבלמשכ]/.test(w)) out.push(w.slice(1)); out.push(w.length > 4 ? w.replace(/(es|s)$/, "") : w); } return out; }
	function bm25(q) {
		if (!S.index) { const all = ready().flatMap((d) => d.chunks); S.index = all.map((c) => ({ c, t: toks(c.text) })); S.avg = S.index.reduce((a, x) => a + x.t.length, 0) / (S.index.length || 1); S.df = {}; for (const x of S.index) for (const w of new Set(x.t)) S.df[w] = (S.df[w] || 0) + 1; }
		const qt = [...new Set(toks(q))], N = S.index.length;
		return S.index.map(({ c, t: tt }) => { let s = 0; for (const w of qt) { const f = tt.filter((x) => x === w).length; if (!f) continue; s += Math.log(1 + (N - S.df[w] + 0.5) / (S.df[w] + 0.5)) * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * tt.length / S.avg))); } return { c, s }; }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
	}
	async function callApi(body, ms = 40000) {
		const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
		try {
			const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
			const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.detail || j.error || "HTTP " + r.status);
			return j;
		} finally { clearTimeout(to); }
	}
	const pass = (cs) => cs.map((c) => ({ id: c.id, page: c.page, doc: S.docs.length > 1 ? docOf(c)?.name : undefined, text: c.text.slice(0, 900) }));

	/* every sentence must cite a passage that was sent, and every number in it must be in that passage */
	const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20, thirty: 30, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, vingt: 20, trente: 30, "אחד": 1, "אחת": 1, "שניים": 2, "שתיים": 2, "שלושה": 3, "שלוש": 3, "ארבעה": 4, "ארבע": 4, "חמישה": 5, "חמש": 5, "שבוע": 1, "יומיים": 2, "שבועיים": 2, "חודשיים": 2, "שנתיים": 2, "החודשיים": 2 };
	const nums = (s) => (String(s).replace(/(\d)[\s  '’](?=\d{3}\b)/g, "$1").replace(/(\d)[,.](?=\d{3}\b)/g, "$1").match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(",", "."));
	function srcNums(c) { const set = new Set(nums(c.text)); for (const w of String(c.text).toLowerCase().split(/[^\p{L}]+/u)) if (NUMW[w] != null) set.add(String(NUMW[w])); if (/\bhalf\b|moitié|חצי/i.test(c.text)) set.add("50"); return set; }
	function verify(items, chunks) {
		const byId = Object.fromEntries(chunks.map((c) => [c.id, c])), kept = [], removed = [];
		for (const it of items || []) {
			let text = String(it?.text || "").replace(/[*#`]/g, "").trim(); if (!text) continue;
			if (!/[.!?…:”"״)]$/.test(text)) text += ".";
			const cites = [...new Set((Array.isArray(it.cite) ? it.cite : [it.cite]).map(String).filter((id) => byId[id]))];
			if (!cites.length) { removed.push({ text, why: "src" }); continue; }
			const allowed = new Set(cites.flatMap((id) => [...srcNums(byId[id])]));
			if (nums(text).some((n) => !allowed.has(n) && !allowed.has(String(Math.round(+n))))) { removed.push({ text, why: "num" }); continue; }
			kept.push({ text, cite: cites });
		}
		return { kept, removed };
	}

	async function run(kind, question) {
		if (!ready().length || S.results.some((r) => r.pending)) return;
		const r = { id: Date.now().toString(36), kind, q: question || null, pending: true, step: 1, lang: S.out };
		S.results.unshift(r); renderResult(r, true);
		const tick = async (n) => { r.step = n; renderResult(r); await wait(reduced ? 0 : 350); };
		const chunks = kind === "ask" ? contextChunks(question) : importantChunks();
		await tick(2);
		let j = null;
		try { j = await callApi({ mode: kind, lang: S.out, question, passages: pass(chunks) }); } catch (e) { console.warn("Margin AI:", e.message); }
		await tick(3);
		r.pending = false; r.model = j?.model || null;
		if (!j) {
			if (kind === "ask") { const h = bm25(question), best = h.slice(0, 2).filter((x, i) => !i || x.s > 0.7 * h[0].s).map((x) => x.c); if (best.length) { r.status = "quoted"; r.items = best.map((c) => ({ text: c.text, cite: [c.id], quote: true })); r.sources = best.map((c) => c.id); } else r.status = "notfound"; }
			else r.status = "offline";
			return renderResult(r);
		}
		if (kind === "summary") {
			r.groups = {}; let all = [], rem = [];
			for (const k of ["favour", "obligations", "watch"]) { const v = verify(j[k], chunks); r.groups[k] = v.kept; all = all.concat(v.kept); rem = rem.concat(v.removed); }
			r.removed = rem; r.sources = order(all);
			r.status = all.length ? "answered" : rem.length ? "unbacked" : "empty";
		} else {
			const v = verify(kind === "simple" ? j.points : j.answer, chunks);
			r.items = v.kept; r.removed = v.removed; r.sources = order(v.kept);
			r.status = v.kept.length ? "answered" : kind === "ask" ? "notfound" : v.removed.length ? "unbacked" : "empty";
		}
		renderResult(r);
	}
	const order = (items) => { const o = []; for (const it of items) for (const id of it.cite) if (!o.includes(id)) o.push(id); return o; };

	/* ---------------- rendering results ---------------- */
	function renderResults() { $("#results").innerHTML = ""; [...S.results].reverse().forEach((r) => renderResult(r, true)); }
	function renderResult(r, isNew) {
		let el = document.getElementById("r-" + r.id);
		if (!el) { el = document.createElement("article"); el.className = "res"; el.id = "r-" + r.id; $("#results").prepend(el); }
		el.innerHTML = resultHtml(r); el.setAttribute("lang", r.lang); el.dir = r.lang === "he" ? "rtl" : "ltr";
		if (!r.pending) drawSnips(el);
		if (isNew) requestAnimationFrame(() => el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }));
	}
	const KIND = { ask: "Ask a question", summary: "The essentials", simple: "In simple words" };
	function resultHtml(r) {
		const title = r.kind === "ask" ? esc(r.q) : esc(t(r.kind === "summary" ? "Summarize the essentials" : "Explain simply"));
		const good = r.status === "answered" || r.status === "quoted";
		const acts = r.pending ? "" : `<div class="res-acts">${good ? `<button type="button" class="btn btn-text btn-sm" data-act="listen" data-r="${r.id}">${ic(S.speaking === r.id ? "square" : "volume-2")}${t(S.speaking === r.id ? "Stop" : "Listen")}</button><button type="button" class="btn btn-text btn-sm" data-act="copy" data-r="${r.id}">${ic("copy")}${t("Copy")}</button>` : ""}<button type="button" class="btn btn-text btn-sm" data-act="remove" data-r="${r.id}">${ic("x")}${t("Remove")}</button></div>`;
		const head = `<div class="res-h"><div><span class="kind">${esc(t(KIND[r.kind]))}</span><h3>${title}</h3></div>${acts}</div>`;
		if (r.pending) return head + `<div class="work"><ul>${["Reading the document", "Writing the answer", "Checking every sentence against the document"].map((s, i) => `<li class="${r.step > i + 1 ? "done" : r.step === i + 1 ? "on" : ""}">${r.step > i + 1 ? ic("check") : r.step === i + 1 ? ic("loader-circle", "spin") : ic("circle")}${t(s)}</li>`).join("")}</ul></div>`;
		const retry = `<button type="button" class="btn btn-sm retry" data-act="retry" data-r="${r.id}">${ic("refresh-cw")}${t("Try again")}</button>`;
		if (r.status === "offline") return head + `<div class="err">${ic("circle-alert")}<span>${t("The AI can’t be reached right now, and this needs it. Please try again in a moment.")}</span></div>${retry}`;
		if (r.status === "empty" || r.status === "unbacked") return head + `<div class="err">${ic("circle-alert")}<span>${t(r.status === "empty" ? "The AI’s answer came back incomplete this time. Please try again." : "The AI wrote points I couldn’t match to the document, so I didn’t show them. Please try again.")}</span></div>${retry}`;
		if (r.status === "notfound") return head + `<div class="nf"><span class="badge none">${ic("search-x")}${t("I found nothing about this in the document.")}</span><p style="margin-top:10px">${t("I read the whole document and none of it covers this, so I won’t guess.")}</p><button type="button" class="btn btn-sm" data-act="again">${ic("message-square-text")}${t("Ask another question")}</button></div>`;
		const n = (id) => r.sources.indexOf(id) + 1;
		const cites = (it) => it.cite.map((id) => `<button type="button" class="cite" data-cite="${id}" data-r="${r.id}" aria-label="${esc(t("Sources"))} ${n(id)}">${n(id)}</button>`).join("");
		const line = (it, i) => `<span class="s" data-s="${i}">${esc(it.quote ? `“${it.text}”` : it.text)}</span>${cites(it)}`;
		let body = "";
		if (r.kind === "summary") {
			const G = [["favour", "fav", "In your favour"], ["obligations", "obl", "Your obligations"], ["watch", "wat", "Watch out for"]]; let k = 0;
			body = `<div class="cols">${G.map(([key, cls, lbl]) => `<div class="col ${cls}"><h4><span class="dot"></span>${t(lbl)}</h4>${r.groups[key].length ? `<ul>${r.groups[key].map((it) => `<li>${line(it, k++)}</li>`).join("")}</ul>` : `<p class="empty">${t("Nothing found for this part.")}</p>`}</div>`).join("")}</div><p class="disc">${t("This summary helps you read — it isn’t legal advice.")}</p>`;
		} else if (r.kind === "simple") body = `<ul class="plain">${r.items.map((it, i) => `<li><span>${line(it, i)}</span></li>`).join("")}</ul>`;
		else body = `<p class="ans">${r.items.map(line).join(" ")}</p>`;
		const nItems = r.kind === "summary" ? Object.values(r.groups).flat().length : r.items.length;
		const count = r.kind === "ask" ? (nItems === 1 ? t("1 sentence, checked against the document") : t("{n} sentences, each checked against the document", { n: nItems })) : t("{n} points, each checked against the document", { n: nItems });
		const trust = r.status === "quoted" ? `<div class="trust"><span class="badge none">${ic("quote")}${t("Quoted directly")}</span><span>${t("The AI can’t be reached right now. Here are the passages that match best, word for word.")}</span></div>`
			: `<div class="trust"><span class="badge ok">${ic("shield-check")}${count}</span>${r.model ? `<span style="font:500 12px var(--mono);color:var(--ink-3)">Llama 3.3</span>` : ""}</div>`;
		const removed = r.removed?.length ? `<div class="removed">${r.removed.slice(0, 2).map((x) => `<div><b>${t(x.why === "num" ? "Removed: its number isn’t in the document." : "Removed: it had no source.")}</b> <s>${esc(x.text)}</s></div>`).join("")}</div>` : "";
		const srcs = `<div class="srcs"><p class="srcs-h">${t("Sources")}</p><div class="srcs-list">${r.sources.map((id) => srcHtml(r, id, n(id))).join("")}</div></div>`;
		return head + body + trust + removed + srcs;
	}
	function srcHtml(r, id, n) {
		const c = chunk(id); if (!c) return "";
		const d = docOf(c), where = [S.docs.length > 1 ? esc(d.name) : null, c.page ? t("Page {n}", { n: c.page }) : !S.docs.length || S.docs.length === 1 ? esc(d.name) : null].filter(Boolean).join(" · ");
		const tr = r.tr?.[id];
		const snip = d.type === "pdf" ? `<canvas data-snip="${id}" role="img" aria-label="${esc(c.text.slice(0, 300))}"></canvas>` : `<div class="snip-txt" dir="auto">${docxSnip(d, c)}</div>`;
		return `<article class="src" data-src="${id}" data-r="${r.id}" dir="${I.lang === "he" ? "rtl" : "ltr"}" lang="${I.lang}"><div class="src-top"><span class="src-n">${n}</span><span>${where}</span></div>
			<button type="button" class="snip" data-view="${id}" aria-label="${esc(t("See it in the document"))}">${snip}</button>
			${tr && tr !== "…" ? `<div class="tr" lang="${r.lang}" dir="${r.lang === "he" ? "rtl" : "ltr"}">${esc(tr)}<small>${t("Machine translation — the highlighted original is what counts.")}</small></div>` : ""}
			<div class="src-acts">${d.lang !== r.lang ? `<button type="button" class="btn btn-text" data-act="tr" data-r="${r.id}" data-id="${id}">${tr === "…" ? ic("loader-circle", "spin") : ic("languages")}${t(tr && tr !== "…" ? "Show the original" : "Translate this passage")}</button>` : ""}<button type="button" class="btn btn-text" data-view="${id}">${ic("zoom-in")}${t("See it in the document")}</button></div></article>`;
	}
	function docxSnip(d, c) {
		const cs = d.chunks, i = cs.indexOf(c), cut = (s, n, end) => (s.length > n ? (end ? "…" + s.slice(-n) : s.slice(0, n) + "…") : s);
		return `${i > 0 ? esc(cut(cs[i - 1].text, 90, true)) + " " : ""}<mark>${esc(c.text)}</mark>${cs[i + 1] ? " " + esc(cut(cs[i + 1].text, 90)) : ""}`;
	}
	/* the snippet: a crop of the real page around the passage, painted in highlighter yellow */
	async function drawSnips(root) {
		for (const cv of root.querySelectorAll("canvas[data-snip]")) {
			if (cv.dataset.done) continue; cv.dataset.done = "1";
			const c = chunk(cv.dataset.snip), d = c && docOf(c); if (!d || d.type !== "pdf") continue;
			const SC = 2, page = await pageCanvas(d, c.page, SC), info = d.pageInfo[c.page - 1];
			const top = Math.max(0, Math.min(...c.rects.map((r) => r.y)) - 14), bot = Math.min(info.h, Math.max(...c.rects.map((r) => r.y + r.h)) + 14);
			const left = Math.max(0, info.left - 14), right = Math.min(info.w, info.right + 14);
			cv.width = Math.round((right - left) * SC); cv.height = Math.round((bot - top) * SC);
			const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
			g.drawImage(page, left * SC, top * SC, cv.width, cv.height, 0, 0, cv.width, cv.height);
			g.globalCompositeOperation = "multiply"; g.fillStyle = "#FFE15A";
			for (const r of c.rects) g.fillRect((r.x - left - 2) * SC, (r.y - top - 1) * SC, (r.w + 4) * SC, (r.h + 1) * SC);
			g.globalCompositeOperation = "source-over";
		}
	}

	/* ---------------- the document viewer ---------------- */
	async function view(id) {
		const c = chunk(id); if (!c) return; const d = docOf(c);
		const opener = document.activeElement;
		const scrim = document.createElement("div"); scrim.className = "scrim";
		const v = document.createElement("div"); v.className = "viewer"; v.setAttribute("role", "dialog"); v.setAttribute("aria-modal", "true"); v.setAttribute("aria-label", d.name);
		document.body.append(scrim, v); document.body.style.overflow = "hidden";
		const close = () => { scrim.remove(); v.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", key); opener?.focus(); };
		const key = (e) => { if (e.key === "Escape") close(); };
		document.addEventListener("keydown", key);
		v.addEventListener("click", (e) => { if (e.target === v || e.target.closest("[data-close]")) close(); });
		if (d.type === "docx") {
			c.els.forEach((x) => x.classList.add("hl"));
			v.innerHTML = `<div class="v-box"><div class="v-bar"><b>${esc(d.name)}</b><button type="button" class="btn btn-sm" data-close>${ic("x")}${t("Close")}</button></div><div class="v-page"><div class="v-doc" dir="auto">${d.html()}</div></div></div>`;
			c.els.forEach((x) => x.classList.remove("hl"));
			v.querySelector("[data-close]").focus(); requestAnimationFrame(() => v.querySelector(".hl")?.scrollIntoView({ block: "center" }));
			return;
		}
		let p = c.page;
		const paint = async () => {
			v.innerHTML = `<div class="v-box"><div class="v-bar"><b>${esc(d.name)} · ${t("Page {n}", { n: p })} / ${d.read}</b><span><button type="button" class="btn btn-text btn-sm" data-pg="-1" ${p <= 1 ? "disabled" : ""} aria-label="${esc(t("Previous page"))}">${ic("chevron-left", "flip-ic")}</button><button type="button" class="btn btn-text btn-sm" data-pg="1" ${p >= d.read ? "disabled" : ""} aria-label="${esc(t("Next page"))}">${ic("chevron-right", "flip-ic")}</button><button type="button" class="btn btn-sm" data-close>${ic("x")}${t("Close")}</button></span></div><div class="v-page"><canvas></canvas></div></div>`;
			v.querySelectorAll("[data-pg]").forEach((b) => (b.onclick = () => { p += +b.dataset.pg; paint(); }));
			v.querySelector("[data-close]").focus();
			const src = await pageCanvas(d, p, 2), cv = v.querySelector("canvas"); cv.width = src.width; cv.height = src.height;
			const g = cv.getContext("2d"); g.drawImage(src, 0, 0);
			if (p === c.page) { g.globalCompositeOperation = "multiply"; g.fillStyle = "#FFE15A"; for (const r of c.rects) g.fillRect((r.x - 2) * 2, (r.y - 1) * 2, (r.w + 4) * 2, (r.h + 1) * 2); const y = Math.min(...c.rects.map((r) => r.y)) / d.pageInfo[p - 1].h; requestAnimationFrame(() => { const box = cv.getBoundingClientRect(); v.scrollTop += box.top + box.height * y - innerHeight / 3; }); }
		};
		paint();
	}

	/* ---------------- listening ---------------- */
	function plainText(r) {
		if (!r || r.pending || !["answered", "quoted"].includes(r.status)) return "";
		if (r.kind === "summary") { const L = { favour: "In your favour", obligations: "Your obligations", watch: "Watch out for" }; return Object.entries(r.groups).filter(([, v]) => v.length).map(([k, v]) => `${t(L[k])}. ${v.map((x) => x.text).join(" ")}`).join(" "); }
		return `${r.kind === "ask" ? r.q + ". " : ""}${r.items.map((x) => x.text).join(" ")}`;
	}
	function speak(r) {
		const syn = window.speechSynthesis; if (!syn) return toast(t("This device has no voice for this language."));
		if (S.speaking) { const was = S.speaking; syn.cancel(); S.speaking = null; refreshListen(); if (!r || was === r.id) return; }
		if (!r) r = S.results.find((x) => plainText(x));
		const txt = plainText(r); if (!txt) return toast(t("Nothing to read yet: ask a question or get a summary first."));
		const code = I.LANGS.find((x) => x[0] === r.lang)[3], voices = syn.getVoices();
		const voice = voices.find((v) => v.lang === code) || voices.find((v) => v.lang?.toLowerCase().startsWith(r.lang));
		if (voices.length && !voice) return toast(t("This device has no voice for this language."));
		const u = new SpeechSynthesisUtterance(txt); u.lang = code; if (voice) u.voice = voice; u.rate = 0.95;
		u.onend = u.onerror = () => { if (S.speaking === r.id) { S.speaking = null; refreshListen(); } };
		S.speaking = r.id; refreshListen(); syn.speak(u);
	}
	function refreshListen() {
		$("#listenLbl").textContent = t(S.speaking ? "Stop" : "Listen"); $("#listenTool").classList.toggle("on", Boolean(S.speaking));
		document.querySelectorAll('[data-act="listen"]').forEach((b) => { const on = S.speaking === b.dataset.r; b.innerHTML = `${ic(on ? "square" : "volume-2")}${t(on ? "Stop" : "Listen")}`; });
	}

	/* ---------------- toast ---------------- */
	let toastT;
	function toast(msg, undoLabel, undo) {
		const el = $("#toast"); clearTimeout(toastT);
		el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">${esc(undoLabel)}</button>` : ""}`;
		if (undo) el.querySelector("button").onclick = () => { undo(); el.classList.remove("on"); };
		el.classList.add("on"); toastT = setTimeout(() => el.classList.remove("on"), undo ? 6000 : 3200);
	}

	/* ---------------- events ---------------- */
	const drop = $("#drop");
	["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
	["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
	drop.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
	addEventListener("dragover", (e) => e.preventDefault()); addEventListener("drop", (e) => { e.preventDefault(); if (S.step === 1 && e.dataTransfer?.files?.length && !e.target.closest("#drop")) addFiles(e.dataTransfer.files); });
	$("#fileIn").addEventListener("change", (e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; });
	$("#openSample").addEventListener("click", async () => { const l = I.lang === "he" ? "he" : "en", r = await fetch(`samples/halden-handbook-${l}.pdf`); addFiles([new File([await r.blob()], `halden-handbook-${l}.pdf`, { type: "application/pdf" })], true); });
	$("#next1").onclick = () => go(2); $("#back2").onclick = () => go(1); $("#home").onclick = () => go(1);
	$("#outLang").addEventListener("click", (e) => { const b = e.target.closest("[data-out]"); if (!b) return; S.out = b.dataset.out; S.outChosen = true; renderOut(); });
	const ta = $("#q"), goBtn = $("#askForm .go");
	const fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; goBtn.disabled = !ta.value.trim(); };
	ta.addEventListener("input", fit);
	ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#askForm").requestSubmit(); } });
	$("#askForm").addEventListener("submit", (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ""; fit(); run("ask", v); });
	const link = (el, on) => { const box = document.getElementById("r-" + el.dataset.r), id = el.dataset.cite || el.dataset.src; if (!box) return; box.querySelectorAll(`.cite[data-cite="${id}"]`).forEach((c) => { c.classList.toggle("hl", on); let s = c.previousElementSibling; while (s && !s.classList.contains("s")) s = s.previousElementSibling; s?.classList.toggle("hl", on); }); box.querySelector(`.src[data-src="${id}"]`)?.classList.toggle("hl", on); };
	document.addEventListener("mouseover", (e) => { const b = e.target.closest(".cite, .src"); if (b) link(b, true); });
	document.addEventListener("mouseout", (e) => { const b = e.target.closest(".cite, .src"); if (b && !b.contains(e.relatedTarget)) link(b, false); });
	document.addEventListener("click", async (e) => {
		const rm = e.target.closest("[data-rm]");
		if (rm) { const i = S.docs.findIndex((d) => d.fid === rm.dataset.rm), d = S.docs[i]; if (!d) return; S.docs.splice(i, 1); S.index = null; renderFiles(); toast(t("File removed."), t("Undo"), () => { S.docs.splice(i, 0, d); S.index = null; renderFiles(); }); return; }
		const tool = e.target.closest("[data-tool]");
		if (tool) { const k = tool.dataset.tool; if (k === "listen") return speak(); openTool(k); if (k !== "ask") run(k); return; }
		const tr = e.target.closest("[data-try]"); if (tr) return run("ask", t(tr.dataset.try));
		const c = e.target.closest(".cite"); if (c) { const card = document.querySelector(`#r-${c.dataset.r} .src[data-src="${c.dataset.cite}"]`); if (card) { link(c, true); card.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); setTimeout(() => link(c, false), 1600); } return; }
		const v = e.target.closest("[data-view]"); if (v) return view(v.dataset.view);
		const a = e.target.closest("[data-act]"); if (!a) return;
		const r = S.results.find((x) => x.id === a.dataset.r);
		if (a.dataset.act === "again") { openTool("ask"); $("#askPanel").scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); return; }
		if (!r) return;
		if (a.dataset.act === "retry") { S.results.splice(S.results.indexOf(r), 1); document.getElementById("r-" + r.id)?.remove(); S.out = r.lang; return run(r.kind, r.q); }
		if (a.dataset.act === "listen") return speak(r);
		if (a.dataset.act === "remove") { const i = S.results.indexOf(r); if (S.speaking === r.id) speak(r); S.results.splice(i, 1); document.getElementById("r-" + r.id)?.remove(); toast(t("Result removed."), t("Undo"), () => { S.results.splice(i, 0, r); renderResults(); }); return; }
		if (a.dataset.act === "copy") { const txt = `${plainText(r)}\n\n${r.sources.map((id, i) => { const c = chunk(id); return c ? `[${i + 1}] ${docOf(c).name}${c.page ? ", " + t("Page {n}", { n: c.page }) : ""} — ${c.text.slice(0, 160)}` : ""; }).join("\n")}`; navigator.clipboard?.writeText(txt).then(() => toast(t("Copied, with its sources.")), () => {}); return; }
		if (a.dataset.act === "tr") {
			r.tr = r.tr || {}; const id = a.dataset.id;
			if (r.tr[id] && r.tr[id] !== "…") { delete r.tr[id]; return renderResult(r); }
			r.tr[id] = "…"; renderResult(r);
			try { const j = await callApi({ mode: "translate", lang: r.lang, text: chunk(id).text }); r.tr[id] = j.translation || ""; if (!r.tr[id]) delete r.tr[id]; } catch { delete r.tr[id]; toast(t("The AI can’t be reached right now, and this needs it. Please try again in a moment.")); }
			renderResult(r);
		}
	});

	/* ---------------- boot ---------------- */
	initLang(); setLang(I.lang); renderSteps();
	window.MARGIN_DEBUG = S;
	if (new URLSearchParams(location.search).get("sample")) $("#openSample").click();
})();
