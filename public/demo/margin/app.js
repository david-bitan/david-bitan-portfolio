/* Margin — understand any document, and see where it says it.
 * Add files (read in the browser: pdf.js, mammoth), a link (read by /api/margin) or pasted text.
 * Code cuts everything into passages and remembers where each sits. As soon as something is added,
 * the AI writes a report whose every point cites passage ids; code checks each id and each number,
 * then shows the passage on demand ("Where it says it"). Follow-up questions see the report too. */
(() => {
	const I = window.MARGIN_I18N, t = I.t, ic = window.ic;
	const API = "/api/margin";
	const $ = (s, r = document) => r.querySelector(s);
	const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	document.querySelectorAll("[data-ic]").forEach((el) => (el.outerHTML = ic(el.dataset.ic, el.className)));
	if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

	const MAX_PAGES = 60, MAX_MB = 20, MAX_FILES = 5, WHOLE = 22000;
	const S = { shown: new Set(), docs: [], loading: 0, out: null, report: null, turns: [], speaking: null, seq: 0, cseq: 0, open: new Set() };
	const chunk = (id) => { for (const d of S.docs) { const c = d.chunks.find((x) => x.id === id); if (c) return c; } return null; };
	const docOf = (c) => S.docs.find((d) => d.fid === c.fid);
	const visual = (d) => d.type === "pdf" || d.type === "image";
	const ready = () => S.docs.filter((d) => !d.loading && d.words >= 30);

	/* ---------------- language ---------------- */
	let startLang = "en"; try { startLang = localStorage.getItem("margin-lang") || (navigator.language || "en").slice(0, 2); } catch {}
	I.set(startLang);
	function setLang(l) {
		I.set(l); try { localStorage.setItem("margin-lang", I.lang); } catch {}
		I.translateStatic(); $("#langCode").textContent = I.LANGS.find((x) => x[0] === I.lang)[2];
		S.out = I.lang; pasteLine();
		$("#langName").textContent = I.LANGS.find((x) => x[0] === I.lang)[1];
		renderFiles(); renderTries(); renderReport(); renderThread(); if (S.quota) renderQuota();
		if (S.page === 2 && S.report && !S.report.cleared && S.report.lang !== I.lang) makeReport(true); // the report follows the language
	}
	function initLang() {
		dropdown($("#langBtn"), $("#langList"), () => I.lang, (l) => setLang(l));
	}
	/* one language menu for the page and the answers (custom list-box, no native <select>) */
	function dropdown(btn, list, current, onPick) {
		const paint = () => (list.innerHTML = I.LANGS.map(([k, name, code]) => `<li role="option" tabindex="-1" data-l="${k}" aria-selected="${k === current()}" lang="${k}">${name}<small>${code}</small></li>`).join(""));
		const open = (on) => { list.hidden = !on; btn.setAttribute("aria-expanded", String(on)); if (on) { paint(); (list.querySelector('[aria-selected="true"]') || list.firstElementChild).focus(); } };
		btn.addEventListener("click", (e) => { e.stopPropagation(); open(list.hidden); });
		list.addEventListener("click", (e) => { const li = e.target.closest("li"); if (!li) return; open(false); onPick(li.dataset.l); btn.focus(); });
		list.addEventListener("keydown", (e) => {
			const items = [...list.children], i = items.indexOf(document.activeElement);
			if (e.key === "Escape") { open(false); btn.focus(); }
			else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
			else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
			else if (e.key === "Home") { e.preventDefault(); items[0].focus(); } else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
			else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); }
			else if (e.key.length === 1) { const n = items.find((x) => x.textContent.toLowerCase().startsWith(e.key.toLowerCase())); n?.focus(); }
		});
		document.addEventListener("click", (e) => { if (!list.hidden && !e.target.closest("#" + list.parentElement.id)) open(false); });
	}

	/* ---------------- sources: files, links, pasted text ---------------- */
	function addSource(name, loader, extra = {}) {
		if (S.docs.length >= MAX_FILES) return;
		const fid = "f" + ++S.seq, row = { fid, name, loading: true };
		S.docs.push(row); S.loading++; renderFiles();
		return (async () => {
			try {
				const doc = await loader(row);
				Object.assign(doc, { fid, name: doc.title || name, ...extra });
				doc.chunks.forEach((c) => { c.fid = fid; c.id = "c" + ++S.cseq; });
				doc.lang = detectLang(doc.chunks.map((c) => c.text).join(" "));
				doc.words = doc.chunks.reduce((a, c) => a + c.text.split(/\s+/).filter(Boolean).length, 0);
				doc.chars = doc.chunks.reduce((a, c) => a + c.text.length, 0);
				const i = S.docs.indexOf(row); if (i >= 0) S.docs[i] = doc;
			} catch (e) {
				console.warn("Margin, reading:", e); S.docs = S.docs.filter((d) => d !== row);
				showErr(`${name}: ${e.userMsg || t("I couldn’t open this file. It may be damaged or protected by a password.")}`);
			} finally {
				S.loading--; S.index = null; renderFiles(); scheduleReport();
				if (S.autoOpen && !S.loading) { S.autoOpen = false; if (ready().length && !quotaOut()) { go(2); makeReport(); } } // "open it directly" goes straight to the analysis
			}
		})();
	}
	function addFiles(list, isSample) {
		$("#err1").hidden = true;
		for (const file of [...list].slice(0, Math.max(0, MAX_FILES - S.docs.length))) {
			const name = file.name || "document", ext = name.toLowerCase().split(".").pop(), kind = KINDS[ext] || (/^image\/(png|jpeg)$/.test(file.type) ? "image" : null);
			if (!kind) { showErr(`${name}: ${t("This file type isn’t supported. Use a PDF, Word, Excel, text, PNG or JPEG file.")}`); continue; }
			if (file.size > MAX_MB * 1048576) { showErr(`${name}: ${t("This file is larger than 20 MB.")}`); continue; }
			if (S.docs.some((d) => d.name === name && d.size === file.size)) continue;
			addSource(name, async (row) => {
				if (kind === "image") return readImage(file, row);
				if (kind === "text") return textDoc(splitParas(await file.text()), "txt");
				if (kind === "csv") return sheetDoc([{ name: "", rows: parseCsv(await file.text()) }], "csv");
				const buf = await file.arrayBuffer();
				return kind === "pdf" ? readPdf(buf) : kind === "docx" ? readDocx(buf) : readXlsx(buf);
			}, { size: file.size, sample: Boolean(isSample) });
		}
	}
	function addLink(url) {
		$("#err1").hidden = true;
		let u; try { u = new URL(url.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return showErr(t("This link doesn’t look valid.")); }
		addSource(u.hostname, async () => {
			const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "fetch", url: u.href }) });
			if (!r.ok) { const e = new Error("fetch"); e.userMsg = t("I couldn’t read this page. Some sites block automatic reading. Copy the text, then paste it with the “click here” link under the files."); throw e; }
			if ((r.headers.get("content-type") || "").includes("pdf")) { const doc = await readPdf(await r.arrayBuffer()); doc.url = u.href; doc.title = decodeURIComponent(u.pathname.split("/").pop() || u.hostname); return doc; }
			const j = await r.json(); if (!j.paragraphs?.length) { const e = new Error("empty"); e.userMsg = t("I couldn’t read this page. Some sites block automatic reading. Copy the text, then paste it with the “click here” link under the files."); throw e; }
			const doc = textDoc(j.paragraphs, "web"); doc.url = u.href; doc.title = j.title || u.hostname; return doc;
		});
	}
	function addText(txt) {
		$("#err1").hidden = true;
		addSource(t("Pasted text"), async () => textDoc(splitParas(txt), "text"));
	}
	const splitParas = (txt) => txt.replace(/\r/g, "").split(/\n\s*\n|\n(?=[A-Z0-9֐-׿•\-–#*])/).map((s) => s.replace(/^[#>*\-\s]+/, "").replace(/\s+/g, " ").trim()).filter(Boolean);
	/* plain paragraphs (a web page, pasted text) → passages; a short line joins the paragraph after it */
	function textDoc(paras, type) {
		const chunks = []; let pending = [];
		for (const p of paras) {
			if (p.length < 70 && !/[.!?:;]$/.test(p)) { pending.push(p); continue; }
			const all = [...pending, p]; pending = [];
			const text = all.map((x, i) => (i < all.length - 1 && !/[.!?:;]$/.test(x) ? x + "." : x)).join(" ");
			if (text.length > 900) { for (let i = 0; i < text.length; i += 800) chunks.push({ page: null, parts: [text.slice(i, i + 800)], text: text.slice(i, i + 800) }); }
			else chunks.push({ page: null, parts: all, text });
		}
		if (pending.length) chunks.push({ page: null, parts: pending, text: pending.join(". ") });
		return { type, pages: null, chunks };
	}
	function showErr(msg) { const err = $("#err1"); const prev = err.hidden ? "" : err.querySelector("span")?.innerHTML + "<br>"; err.innerHTML = `${ic("circle-alert")}<span>${prev || ""}${esc(msg)}</span>`; err.hidden = false; }

	function renderFiles() {
		const NAMES = { pdf: "PDF", docx: "Word", xlsx: "Excel", csv: "CSV", txt: t("Text"), image: t("Image"), web: t("Web page"), text: t("Text") };
		const ICON = { web: "link", text: "clipboard-paste", image: "image", xlsx: "file-spreadsheet", csv: "file-spreadsheet" };
		$("#files").innerHTML = S.docs.map((d) => {
			if (d.loading) return `<li class="frow busy-row"><span class="file-ic">${ic("file-text")}</span><div><b>${esc(d.name)}</b><small>${ic("loader-circle", "spin")}${d.note ? esc(d.note) : t("Reading your document…")}</small></div></li>`;
			const bits = [NAMES[d.type], d.pages ? (d.pages === 1 ? t("1 page") : t("{n} pages", { n: d.pages })) : null, t("{n} words", { n: d.words.toLocaleString(I.lang) }), t(LANG_NAME[d.lang])].filter(Boolean);
			const warn = d.words < 30 ? `<span class="w">${t(d.type === "image" ? "I could read almost no text in this image. Try a sharper, straight photo." : "I found almost no text. This may be a scan or a photo inside a PDF. I can’t read those yet.")}</span>` : d.pages > MAX_PAGES ? `<span class="w">${t("This document is long: I’ll read its first {n} pages.", { n: MAX_PAGES })}</span>` : "";
			const fresh = !S.shown.has(d.fid); S.shown.add(d.fid);
			return `<li class="frow${fresh ? " new" : ""}" data-fid="${d.fid}"><span class="file-ic">${ic(ICON[d.type] || "file-text")}</span><div><b>${esc(d.name)}</b><small><span>${bits.map(esc).join(" · ")}</span>${warn}</small></div>${d.words >= 30 ? `<span class="ok-ic">${ic("circle-check")}</span>` : ""}<button type="button" class="btn btn-text btn-sm" data-rm="${d.fid}" aria-label="${esc(t("Remove"))} ${esc(d.name)}">${ic("x")}<span class="hide-m">${t("Remove")}</span></button></li>`;
		}).join("");
		const has = S.docs.length > 0;
		$("#filesH").hidden = !has; $("#filesH").textContent = S.docs.length > 1 ? t("Your documents ({n})", { n: S.docs.length }) : t("Your document");
		$("#sample").hidden = has;
		$("#analyse").disabled = !ready().length || S.loading > 0 || quotaOut();
		$("#drop").classList.toggle("compact", has);
		$("#drop").hidden = S.docs.length >= MAX_FILES;
		$("#dropTitle").hidden = has;
		$("#dropBtn").innerHTML = has ? `${ic("file-up")}<span>${t("Add another file")}</span>` : `${ic("file-text")}<span>${t("Choose files")}</span>`;
	}

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
			const body = lines.filter((l) => l.text.length > 2 && l.h > mid * 0.75);
			const gaps = body.slice(1).map((l, i) => l.base - body[i].base).filter((g) => g > 0).sort((a, b) => a - b);
			const normal = gaps.length ? gaps[Math.floor(gaps.length * 0.3)] : 14;
			let block = null; const blocks = [];
			body.forEach((l, i) => {
				const gap = i ? l.base - body[i - 1].base : Infinity;
				if (!block || gap > normal * 1.45 || block.text.length > 700) { block = { lines: [] }; blocks.push(block); }
				block.lines.push(l); block.text = block.lines.map((x) => x.text).join(" ");
			});
			for (let i = 0; i < blocks.length - 1; i++) if (blocks[i].lines.length === 1 && blocks[i].text.length < 70) { blocks[i + 1].lines.unshift(...blocks[i].lines); blocks.splice(i, 1); i--; }
			const left = Math.min(...body.map((l) => l.x), vp.width), right = Math.max(...body.map((l) => l.r), 0);
			pages.push({ w: vp.width, h: vp.height, left: isFinite(left) ? left : 0, right: right || vp.width });
			for (const b of blocks) {
				const text = b.lines.map((x) => x.text).join(" ").replace(/\s+/g, " ").trim(); if (!text) continue;
				chunks.push({ page: p, text, rects: b.lines.map((l) => ({ x: l.x, y: l.top, w: l.r - l.x, h: l.h * 1.25 })) });
			}
		}
		return { type: "pdf", pdf, pages: pdf.numPages, read: n, pageInfo: pages, chunks, canvases: {} };
	}
	async function readDocx(buf) {
		const res = await mammoth.convertToHtml({ arrayBuffer: buf });
		const box = document.createElement("div"); box.innerHTML = res.value;
		const paras = [...box.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td")].filter((el) => el.textContent.trim() && !(el.tagName === "TD" && el.querySelector("p")) && !(el.tagName === "LI" && el.querySelector("p"))).map((el) => el.textContent.replace(/\s+/g, " ").trim());
		const d = textDoc(paras, "docx"); return d;
	}
	const KINDS = { pdf: "pdf", docx: "docx", xlsx: "xlsx", csv: "csv", txt: "text", md: "text", text: "text", png: "image", jpg: "image", jpeg: "image" };
	/* Excel (.xlsx): a zip of XML files, opened with fflate (MIT); each row becomes one line "A | B | C" */
	function readXlsx(buf) {
		const z = fflate.unzipSync(new Uint8Array(buf)), td = new TextDecoder(), xml = (n) => (z[n] ? new DOMParser().parseFromString(td.decode(z[n]), "application/xml") : null);
		const tags = (doc, tag) => (doc ? [...doc.getElementsByTagNameNS("*", tag)] : []);
		const shared = tags(xml("xl/sharedStrings.xml"), "si").map((si) => tags(si, "t").map((x) => x.textContent).join(""));
		const rels = Object.fromEntries(tags(xml("xl/_rels/workbook.xml.rels"), "Relationship").map((r) => [r.getAttribute("Id"), r.getAttribute("Target")]));
		const sheets = tags(xml("xl/workbook.xml"), "sheet").map((sh) => {
			const target = rels[sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")] || "";
			const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
			const rows = tags(xml(path), "row").map((row) => tags(row, "c").map((c) => {
				const tp = c.getAttribute("t"), v = tags(c, "v")[0]?.textContent ?? "";
				return tp === "s" ? shared[+v] ?? "" : tp === "inlineStr" ? tags(c, "t").map((x) => x.textContent).join("") : tp === "b" ? (v === "1" ? "TRUE" : "FALSE") : v;
			}).map((x) => String(x).trim()));
			return { name: sh.getAttribute("name") || "", rows };
		});
		return sheetDoc(sheets, "xlsx");
	}
	function parseCsv(txt) {
		const first = txt.split(/\r?\n/, 1)[0] || "", sep = [";", "\t", ","].map((c) => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
		const rows = []; let row = [], cell = "", q = false;
		for (let i = 0; i < txt.length; i++) {
			const ch = txt[i];
			if (q) { if (ch === '"' && txt[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
			else if (ch === '"') q = true; else if (ch === sep) { row.push(cell.trim()); cell = ""; }
			else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; } else if (ch !== "\r") cell += ch;
		}
		if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
		return rows;
	}
	/* table rows → passages of about 600 characters, each starting with its sheet name */
	function sheetDoc(sheets, type) {
		const chunks = [];
		for (const sh of sheets) {
			let buf = [];
			const flush = () => { if (buf.length) { const text = (sh.name && sheets.length > 1 ? sh.name + ": " : "") + buf.join(" ; "); chunks.push({ page: null, parts: [text], text }); buf = []; } };
			for (const r of sh.rows) { const l = r.filter(Boolean).join(" | "); if (!l) continue; if (buf.join(" ; ").length + l.length > 600) flush(); buf.push(l.slice(0, 800)); }
			flush();
		}
		return { type, pages: null, chunks };
	}
	/* PNG or JPEG: the text is read in this browser by Tesseract (Apache-2.0); each paragraph keeps its place on the image */
	const OCR_LANG = { en: "eng", fr: "fra", es: "spa", pt: "por", de: "deu", it: "ita", ru: "rus", tr: "tur", id: "ind", he: "heb" };
	let ocr = null;
	async function ocrWorker(row) {
		const langs = [...new Set(["eng", OCR_LANG[I.lang] || "eng"])].join("+");
		if (ocr && ocr.langs === langs) return ocr.w;
		if (ocr) { ocr.w.terminate(); ocr = null; }
		const w = await Tesseract.createWorker(langs, 1, {
			workerPath: "vendor/tesseract/worker.min.js", corePath: "vendor/tesseract/core", langPath: "vendor/tesseract/lang", gzip: true, workerBlobURL: false,
			logger: (m) => { if (ocr?.row && m.progress != null) { ocr.row.note = `${t("Reading the text in the image…")} ${Math.round(m.progress * 100)} %`; renderFiles(); } },
		});
		ocr = { w, langs, row }; return w;
	}
	async function readImage(file, row) {
		row.note = t("Reading the text in the image…"); renderFiles();
		const bmp = await createImageBitmap(file), k0 = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
		const img = document.createElement("canvas"); img.width = Math.round(bmp.width * k0); img.height = Math.round(bmp.height * k0);
		img.getContext("2d").drawImage(bmp, 0, 0, img.width, img.height); bmp.close?.();
		await loadScript("vendor/tesseract/tesseract.min.js");
		const w = await ocrWorker(row); ocr.row = row;
		const { data } = await w.recognize(img);
		const k = img.width / 700, chunks = [];
		for (const p of data.paragraphs || []) {
			let lines = []; const push = () => { const text = lines.map((l) => l.text.trim()).join(" ").replace(/\s+/g, " ").trim(); if (text.length > 2) chunks.push({ page: 1, text, rects: lines.map((l) => ({ x: l.bbox.x0 / k, y: l.bbox.y0 / k, w: (l.bbox.x1 - l.bbox.x0) / k, h: (l.bbox.y1 - l.bbox.y0) / k })) }); lines = []; };
			for (const l of p.lines || []) { if (l.confidence < 30 || !l.text.trim()) continue; lines.push(l); if (lines.reduce((a, x) => a + x.text.length, 0) > 650) push(); }
			push();
		}
		const xs = chunks.flatMap((c) => c.rects), W = img.width / k, H = img.height / k;
		return { type: "image", img, pages: 1, read: 1, pageInfo: [{ w: W, h: H, left: xs.length ? Math.min(...xs.map((r) => r.x)) : 0, right: xs.length ? Math.max(...xs.map((r) => r.x + r.w)) : W }], chunks, canvases: {} };
	}
	const LANG_NAME = { en: "English", fr: "French", es: "Spanish", pt: "Portuguese", de: "German", it: "Italian", ru: "Russian", tr: "Turkish", id: "Indonesian", he: "Hebrew", other: "another language" };
	const STOPW = {
		en: "the and you is for with are your of to not this that will", fr: "le la les des est vous une pour dans avec pas du qui que", es: "el los las del es usted una para con por que se como sus",
		pt: "o os as do da é você uma para com não que pelo seus", de: "der die das und ist sie nicht mit für den von zu ein eine", it: "il lo gli della è per con non che una sono del alla",
		tr: "ve bir bu için ile da de olarak veya gibi olan değil", id: "dan yang di untuk dengan ini itu tidak dari pada anda akan",
	};
	function detectLang(txt) {
		const s = txt.slice(0, 6000), he = (s.match(/[\u0590-\u05FF]/g) || []).length, cy = (s.match(/[\u0400-\u04FF]/g) || []).length, lat = (s.match(/[a-zA-Z]/g) || []).length;
		if (he > lat * 0.6) return "he"; if (cy > lat * 0.6) return "ru";
		const w = s.toLowerCase().split(/[^\p{L}]+/u); let best = "other", top = 0;
		for (const [k, list] of Object.entries(STOPW)) { const set = new Set(list.split(" ")); const n = w.filter((x) => set.has(x)).length; if (n > top) { top = n; best = k; } }
		return top > 2 ? best : "other";
	}
	async function pageCanvas(d, p, scale = 2) {
		const key = p + "@" + scale; if (d.canvases[key]) return d.canvases[key];
		if (d.img) { const c = document.createElement("canvas"), info = d.pageInfo[0]; c.width = Math.round(info.w * scale); c.height = Math.round(info.h * scale); c.getContext("2d").drawImage(d.img, 0, 0, c.width, c.height); return (d.canvases[key] = c); }
		const page = await d.pdf.getPage(p), vp = page.getViewport({ scale }), c = document.createElement("canvas");
		c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
		await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
		return (d.canvases[key] = c);
	}

	/* ---------------- choosing passages for the AI ---------------- */
	const totalChars = () => ready().reduce((a, d) => a + d.chars, 0);
	function contextChunks(question) {
		const all = ready().flatMap((d) => d.chunks); if (totalChars() <= WHOLE) return all;
		const hits = new Set(bm25(question).slice(0, 14).map((h) => h.c)); return all.filter((c) => hits.has(c));
	}
	function importantChunks() {
		const all = ready().flatMap((d) => d.chunks); if (totalChars() <= WHOLE) return all;
		const score = (c) => (c.text.match(/\d/g) || []).length * 0.4 + (c.text.match(/\b(must|may not|cannot|within|deadline|penalt|fee|notice|terminate|liable|refund|waive|arbitration|doit|doivent|délai|pénalit|résili|frais|interdit|חייב|אסור|תוך|קנס|הודעה)/gi) || []).length * 2;
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
	async function callApi(body, ms = 45000) {
		const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
		try {
			const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
			const j = await r.json().catch(() => ({})); if (j.quota) { S.quota = j.quota; renderQuota(); }
			if (r.status === 429 && j.error === "daily_limit") { const e = new Error("daily_limit"); e.limit = true; throw e; }
			if (!r.ok) throw new Error(j.detail || j.error || "HTTP " + r.status);
			return j;
		} finally { clearTimeout(to); }
	}
	const pass = (cs) => cs.map((c) => ({ id: c.id, page: c.page, doc: S.docs.length > 1 ? docOf(c)?.name : undefined, text: c.text.slice(0, 900) }));

	/* every point must cite a passage that was sent, and every number in it must be in that passage */
	const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20, thirty: 30, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, vingt: 20, trente: 30, "אחד": 1, "אחת": 1, "שניים": 2, "שתיים": 2, "שלושה": 3, "שלוש": 3, "ארבעה": 4, "ארבע": 4, "חמישה": 5, "חמש": 5, "שבוע": 1, "יומיים": 2, "שבועיים": 2, "חודשיים": 2, "שנתיים": 2, "החודשיים": 2 };
	const nums = (s) => (String(s).replace(/(\d)[\s  '’](?=\d{3}\b)/g, "$1").replace(/(\d)[,.](?=\d{3}\b)/g, "$1").match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(",", "."));
	function srcNums(c) { const set = new Set(nums(c.text)); for (const w of String(c.text).toLowerCase().split(/[^\p{L}]+/u)) if (NUMW[w] != null) set.add(String(NUMW[w])); if (/\bhalf\b|moitié|חצי/i.test(c.text)) set.add("50"); return set; }
	/* Numbers written the English way (68,000 · 9.99) are rewritten the way the reader's language writes them
	 * (fr 68 000 · 9,99 — de 68.000 · 9,99), so "68,000" is never read as 68. English and Hebrew keep 68,000 and 9.99. */
	const LOC = { en: "en-GB", fr: "fr-FR", es: "es-ES", pt: "pt-PT", de: "de-DE", it: "it-IT", ru: "ru-RU", tr: "tr-TR", id: "id-ID", he: "he-IL" };
	const CUR = "(?:[€$£₪]|EUR|USD|GBP|ILS|NIS)";
	function localNums(s, lang) {
		if (!lang || lang === "en" || lang === "he") return s;
		const fmt = (n, dec) => new Intl.NumberFormat(LOC[lang], { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
		s = s.replace(/(?<![\d.,])(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?(?![\d,]|\.\d)/g, (m, int, dec) => fmt(+(int.replace(/,/g, "") + (dec ? "." + dec : "")), dec ? dec.length : 0));
		s = s.replace(new RegExp(`(${CUR}\\s?)(\\d+)\\.(\\d{1,2})(?![\\d.])`, "g"), (m, c, a, b) => c + fmt(+(a + "." + b), b.length));
		s = s.replace(new RegExp(`(?<![\\d.,])(\\d+)\\.(\\d{1,2})(?=\\s?(?:${CUR}|%))`, "g"), (m, a, b) => fmt(+(a + "." + b), b.length));
		s = s.replace(/([€$£₪])\s?(\d(?:[\d.,\u202f\u00a0 ]*\d)?)/g, "$2\u00a0$1"); // 68 000 €, not €68 000
		return s;
	}
	function verify(items, chunks, lang) {
		const byId = Object.fromEntries(chunks.map((c) => [c.id, c])), kept = [], removed = [];
		for (const it of items || []) {
			let text = String(it?.text || "").replace(/[*#`]/g, "").replace(/\s+[—–]\s+/g, ", ").replace(/[\s,;:(\[]*\b(?:cite[sd]?|c\d{1,4}(?:\s*,\s*c\d{1,4})*)\b[)\]]?\s*([.!?]?)\s*$/i, "$1").trim(); if (!text) continue;
			const value = String(it?.value || "").replace(/[*#`]/g, "").trim().slice(0, 60);
			if (!/[.!?…:”"״)]$/.test(text)) text += ".";
			const cites = [...new Set((Array.isArray(it.cite) ? it.cite : [it.cite]).map(String).filter((id) => byId[id]))];
			if (!cites.length) { removed.push({ text, why: "src" }); continue; }
			const allowed = new Set(cites.flatMap((id) => [...srcNums(byId[id])]));
			if (nums(value + " " + text).some((n) => !allowed.has(n) && !allowed.has(String(Math.round(+n))))) { removed.push({ text, why: "num" }); continue; }
			kept.push({ ...(value ? { value: localNums(value, lang) } : {}), text: localNums(text, lang), cite: cites, key: Math.random().toString(36).slice(2, 8) });
		}
		return { kept, removed };
	}

	/* ---------------- the report: starts by itself ---------------- */
	let reportTimer;
	function scheduleReport() { clearTimeout(reportTimer); reportTimer = setTimeout(() => { if (S.page === 2 && !S.loading && ready().length) makeReport(); }, 500); }
	const GROUPS = [["short", "In short"], ["favour", "In your favour", "fav"], ["against", "Could work against you", "aga"], ["watch", "Watch out for", "wat"], ["facts", "Key dates and numbers", "fac"]];
	async function makeReport(keepTurns) {
		const sig = ready().map((d) => d.fid).join(",") + "|" + S.out;
		if (S.report && S.report.sig === sig && !S.report.failed) return;
		const r = { sig, pending: true, step: 1, lang: S.out, id: "rep" + Date.now() };
		const same = keepTurns || (S.report && S.report.sig.split("|")[0] === sig.split("|")[0]);
		S.report = r; if (!same) S.turns = []; S.open.clear(); renderReport(); renderThread(); renderFiles();
		const tick = async (n) => { if (S.report !== r) return; r.step = n; renderReport(); await wait(reduced ? 0 : 350); };
		const chunks = importantChunks(); await tick(2);
		let j = null;
		let lim = false;
		try { j = await callApi({ mode: "report", lang: r.lang, passages: pass(chunks) }); } catch (e) { lim = Boolean(e.limit); console.warn("Margin AI:", e.message); }
		if (S.report !== r) return;
		await tick(3);
		r.pending = false; r.model = j?.model || null;
		if (!j) { r.failed = lim ? "limit" : "offline"; return renderAll(); }
		r.groups = {}; let all = [], rem = [];
		for (const [k] of GROUPS) { const v = verify(j[k], chunks, r.lang); r.groups[k] = v.kept; all = all.concat(v.kept); rem = rem.concat(v.removed); }
		r.removed = rem; r.count = all.length;
		if (!all.length) r.failed = rem.length ? "unbacked" : "empty";
		renderAll();
	}
	const renderAll = () => { renderReport(); renderThread(); renderFiles(); };
	function go(n) {
		S.page = n; $("#p1").hidden = n !== 1; $("#p2").hidden = n !== 2;
		const pg = $(n === 1 ? "#p1" : "#p2"); pg.classList.remove("page-in"); void pg.offsetWidth; pg.classList.add("page-in");
		if (n === 2) $("#s2files").textContent = ready().map((d) => d.name).join(" · ");
		scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
		const h = n === 1 ? $("#p1 h1") : $("#report h2") || $("#back2"); if (h) { if (h.tagName !== "BUTTON") h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
	}
	function renderReport() {
		const box = $("#report"), r = S.report;
		if (!r || !S.docs.length) { box.innerHTML = ""; $("#qa").hidden = true; return; }
		box.setAttribute("lang", r.lang); box.dir = r.lang === "he" ? "rtl" : "ltr";
		const names = ready().map((d) => d.name).join(" · ");
		const title = t(ready().length > 1 ? "Your documents in short" : "Your document in short");
		if (r.pending) {
			box.innerHTML = `<div class="rep"><div class="rep-h"><div><span class="kind">${esc(names)}</span><h2>${title}</h2></div></div><div class="work"><ul>${["Reading the document", "Writing the summary", "Checking every point against the document"].map((s, i) => `<li class="${r.step > i + 1 ? "done" : r.step === i + 1 ? "on" : ""}">${r.step > i + 1 ? ic("check") : r.step === i + 1 ? ic("loader-circle", "spin") : ic("circle")}${t(s)}</li>`).join("")}</ul></div></div>`;
			$("#qa").hidden = true; return;
		}
		if (r.cleared) { box.innerHTML = `<div class="rep"><p style="margin:0 0 12px;color:var(--ink-2)">${t("Analysis cleared.")}</p><button type="button" class="btn btn-sm" data-act="reanalyse">${ic("refresh-cw")}${t("Analyse again")}</button></div>`; $("#qa").hidden = true; return; }
		if (r.failed) {
			const msg = r.failed === "limit" ? limitMsg() : r.failed === "offline" ? "The AI can’t be reached right now, and this needs it. Please try again in a moment." : r.failed === "empty" ? "The AI’s answer came back incomplete this time. Please try again." : "The AI wrote points I couldn’t match to the document, so I didn’t show them. Please try again.";
			box.innerHTML = `<div class="rep"><div class="rep-h"><div><span class="kind">${esc(names)}</span><h2>${title}</h2></div></div><div class="err">${ic("circle-alert")}<span>${r.failed === "limit" ? esc(msg) : t(msg)}</span></div>${r.failed === "limit" ? "" : `<button type="button" class="btn btn-sm reanalyse" data-act="reanalyse">${ic("refresh-cw")}${t("Try again")}</button>`}</div>`;
			$("#qa").hidden = false; renderTries(); return;
		}
		const item = (it) => `<li>${pointHtml(it)}</li>`;
		const groupHtml = ([k, lbl, cls]) => `<div class="box ${cls}"><h3><span class="dot"></span>${t(lbl)}</h3>${r.groups[k].length ? `<ul>${r.groups[k].map(item).join("")}</ul>` : `<p class="empty">${t("Nothing found for this part.")}</p>`}</div>`;
		const acts = `<div class="res-acts"><button type="button" class="btn btn-text btn-sm" data-act="listen" data-r="report">${ic(S.speaking === "report" ? "square" : "volume-2")}${t(S.speaking === "report" ? "Stop" : "Listen")}</button><button type="button" class="btn btn-text btn-sm" data-act="copy" data-r="report">${ic("copy")}${t("Copy")}</button><button type="button" class="btn btn-text btn-sm" data-act="clear" data-r="report">${ic("trash-2")}${t("Clear")}</button></div>`;
		const first = !r.shown; r.shown = true;
		box.innerHTML = `<article class="rep${first ? " in" : ""}"><div class="rep-h"><div><span class="kind">${esc(names)}</span><h2>${title}</h2></div>${acts}</div>
			${r.groups.short.length ? `<div class="short">${r.groups.short.map((it) => `<span class="pt">${pointHtml(it)}</span>`).join(" ")}</div>` : ""}
			<div class="grid4">${GROUPS.slice(1).map(groupHtml).join("")}</div>
			<div class="rep-foot"><span class="badge ok">${ic("shield-check")}${t("{n} points, each checked against the document", { n: r.count })}</span>${r.removed?.length ? `<span>${r.removed.length === 1 ? esc(t(r.removed[0].why === "num" ? "Removed: its number isn’t in the document." : "Removed: it had no source.")) : esc(t("{n} removed", { n: r.removed.length }))}</span>` : ""}<span>${t("This summary helps you read. It isn’t legal advice.")}</span></div></article>`;
		S.snips = drawSnips(box); $("#qa").hidden = false; renderTries();
	}
	/* a point, with a quiet "Where it says it" that opens the highlighted passage underneath */
	function pointHtml(it, owner = "report") {
		const open = S.open.has(it.key);
		return `${it.value ? `<b class="fv">${esc(it.value)}</b> ` : ""}<span>${esc(it.quote ? `“${it.text}”` : it.text)}</span><button type="button" class="where" data-where="${it.key}" aria-expanded="${open}">${t(open ? "Hide the source" : "Where it says it")}</button>${open ? `<div class="proof">${it.cite.map((id) => srcHtml(it, id, owner)).join("")}</div>` : ""}`;
	}
	function srcHtml(it, id, owner) {
		const c = chunk(id); if (!c) return "";
		const d = docOf(c), where = [S.docs.length > 1 || d.type === "web" ? esc(d.name) : null, c.page ? t("Page {n}", { n: c.page }) : null].filter(Boolean).join(" · ");
		const lang = owner === "report" ? S.report.lang : (S.turns.find((x) => x.id === owner)?.lang || S.out);
		const tr = it.tr?.[id];
		const snip = visual(d) ? `<canvas data-snip="${id}" role="img" aria-label="${esc(c.text.slice(0, 300))}"></canvas>` : `<div class="snip-txt" dir="auto">${textSnip(d, c)}</div>`;
		return `<article class="src" dir="${I.lang === "he" ? "rtl" : "ltr"}" lang="${I.lang}">${where ? `<div class="src-top"><span>${where}</span></div>` : ""}
			<button type="button" class="snip" data-view="${id}" aria-label="${esc(t("See it in the document"))}">${snip}</button>
			${tr && tr !== "…" ? `<div class="tr" lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}">${esc(tr)}<small>${t("Machine translation. The highlighted original is what counts.")}</small></div>` : ""}
			<div class="src-acts">${d.lang !== lang ? `<button type="button" class="btn btn-text" data-tr="${it.key}" data-id="${id}" data-lang="${lang}">${tr === "…" ? ic("loader-circle", "spin") : ic("languages")}${t(tr && tr !== "…" ? "Show the original" : "Translate this passage")}</button>` : ""}<button type="button" class="btn btn-text" data-view="${id}">${ic("zoom-in")}${t("See it in the document")}</button></div></article>`;
	}
	function textSnip(d, c) {
		const cs = d.chunks, i = cs.indexOf(c), cut = (s, n, end) => (s.length > n ? (end ? "…" + s.slice(-n) : s.slice(0, n) + "…") : s);
		return `${i > 0 ? esc(cut(cs[i - 1].text, 90, true)) + " " : ""}<mark>${esc(c.text)}</mark>${cs[i + 1] ? " " + esc(cut(cs[i + 1].text, 90)) : ""}`;
	}
	async function drawSnips(root) {
		for (const cv of root.querySelectorAll("canvas[data-snip]")) {
			if (cv.dataset.done) continue; cv.dataset.done = "1";
			const c = chunk(cv.dataset.snip), d = c && docOf(c); if (!d || !visual(d)) continue;
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

	/* ---------------- follow-up questions (they also see the report) ---------------- */
	const TRIES = ["Can I work for a competitor after I leave?", "What happens if I resign in the first year?", "Who owns what I create at home?"];
	function renderTries() { $("#tries").innerHTML = S.docs.some((d) => d.sample) && !S.turns.length ? `<span>${t("Try:")}</span>${TRIES.map((q) => `<button type="button" class="chip" data-try="${esc(q)}">${esc(t(q))}</button>`).join("")}` : ""; }
	const line = (x) => (x.value ? `${x.value}: ${x.text}` : x.text);
	function reportText() { const r = S.report; if (!r || r.pending || r.failed) return ""; return GROUPS.map(([k, lbl]) => (r.groups[k].length ? `${lbl}: ${r.groups[k].map(line).join(" ")}` : "")).filter(Boolean).join("\n"); }
	async function ask(q) {
		if (!ready().length || S.turns.some((x) => x.pending)) return;
		const tu = { id: "t" + Date.now(), q, pending: true, lang: S.out };
		S.turns.push(tu); renderThread(); document.getElementById(tu.id)?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
		const chunks = contextChunks(q + " " + S.turns.slice(-3, -1).map((x) => x.q).join(" "));
		const history = S.turns.filter((x) => !x.pending && x.items).slice(-3).map((x) => ({ q: x.q, a: x.items.map((i) => i.text).join(" ") }));
		let j = null;
		try { j = await callApi({ mode: "ask", lang: tu.lang, question: q, passages: pass(chunks), report: reportText().slice(0, 2500), history }); } catch (e) { tu.limit = Boolean(e.limit); console.warn("Margin AI:", e.message); }
		tu.pending = false;
		if (!j) { const h = bm25(q), best = h.slice(0, 2).filter((x, i) => !i || x.s > 0.7 * h[0].s).map((x) => x.c); if (best.length) { tu.status = "quoted"; tu.items = best.map((c) => ({ text: c.text, cite: [c.id], quote: true, key: Math.random().toString(36).slice(2, 8) })); } else tu.status = "notfound"; }
		else { const v = verify(j.answer, chunks, tu.lang); tu.items = v.kept; tu.removed = v.removed; tu.status = v.kept.length ? "answered" : "notfound"; }
		renderThread(); renderTries();
	}
	function renderThread() {
		$("#thread").innerHTML = S.turns.map((tu) => {
			const acts = tu.pending || !tu.items?.length ? `<div class="t-acts"><button type="button" class="btn btn-text btn-sm" data-act="rmturn" data-r="${tu.id}">${ic("x")}${t("Remove")}</button></div>` : `<div class="t-acts"><button type="button" class="btn btn-text btn-sm" data-act="listen" data-r="${tu.id}">${ic(S.speaking === tu.id ? "square" : "volume-2")}${t(S.speaking === tu.id ? "Stop" : "Listen")}</button><button type="button" class="btn btn-text btn-sm" data-act="copy" data-r="${tu.id}">${ic("copy")}${t("Copy")}</button><button type="button" class="btn btn-text btn-sm" data-act="rmturn" data-r="${tu.id}">${ic("x")}${t("Remove")}</button></div>`;
			let body;
			if (tu.pending) body = `<p class="a busy">${ic("loader-circle", "spin")} ${t("Working on it…")}</p>`;
			else if (tu.status === "notfound") body = `<p class="a"><span class="badge none">${ic("search-x")}${t("I found nothing about this in the document.")}</span></p>`;
			else body = `<p class="a">${tu.items.map((it) => pointHtml(it, tu.id)).join(" ")}</p>${tu.status === "quoted" ? `<div class="trust"><span class="badge none">${ic("quote")}${t("Quoted directly")}</span><span>${tu.limit ? esc(limitMsg()) + " " + t("Here are the passages that match best, word for word.") : t("The AI can’t be reached right now. Here are the passages that match best, word for word.")}</span></div>` : ""}`;
			const fresh = !tu.shown && !tu.pending; if (fresh) tu.shown = true;
			return `<article class="turn${fresh ? " new" : ""}" id="${tu.id}" lang="${tu.lang}" dir="${tu.lang === "he" ? "rtl" : "ltr"}"><p class="q">${esc(tu.q)}</p>${body}${acts}</article>`;
		}).join("");
		S.snips = drawSnips($("#thread"));
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
		if (!visual(d)) {
			v.innerHTML = `<div class="v-box"><div class="v-bar"><b>${esc(d.name)}</b><span>${d.url ? `<a class="btn btn-text btn-sm" href="${esc(d.url)}" target="_blank" rel="noopener">${ic("external-link")}${esc(new URL(d.url).hostname)}</a>` : ""}<button type="button" class="btn btn-sm" data-close>${ic("x")}${t("Close")}</button></span></div><div class="v-page"><div class="v-doc" dir="auto">${d.chunks.map((x) => `<p class="${x === c ? "hl" : ""}">${esc(x.text)}</p>`).join("")}</div></div></div>`;
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

	/* ---------------- listen, copy ---------------- */
	function plainOf(owner) {
		if (owner === "report") { const r = S.report; if (!r || r.pending || r.failed) return ""; return GROUPS.map(([k, lbl]) => (r.groups[k].length ? `${t(lbl)}. ${r.groups[k].map(line).join(" ")}` : "")).filter(Boolean).join("\n"); }
		const tu = S.turns.find((x) => x.id === owner); return tu?.items?.length ? `${tu.q}\n${tu.items.map((x) => x.text).join(" ")}` : "";
	}
	function speak(owner) {
		const syn = window.speechSynthesis; if (!syn) return toast(t("This device has no voice for this language."));
		if (S.speaking) { const was = S.speaking; syn.cancel(); S.speaking = null; refreshListen(); if (was === owner) return; }
		const txt = plainOf(owner); if (!txt) return;
		const lang = owner === "report" ? S.report.lang : S.turns.find((x) => x.id === owner).lang;
		const code = I.LANGS.find((x) => x[0] === lang)[3], voices = syn.getVoices();
		const voice = voices.find((v) => v.lang === code) || voices.find((v) => v.lang?.toLowerCase().startsWith(lang));
		if (voices.length && !voice) return toast(t("This device has no voice for this language."));
		const u = new SpeechSynthesisUtterance(txt); u.lang = code; if (voice) u.voice = voice; u.rate = 0.95;
		u.onend = u.onerror = () => { if (S.speaking === owner) { S.speaking = null; refreshListen(); } };
		S.speaking = owner; refreshListen(); syn.speak(u);
	}
	function refreshListen() { document.querySelectorAll('[data-act="listen"]').forEach((b) => { const on = S.speaking === b.dataset.r; b.innerHTML = `${ic(on ? "square" : "volume-2")}${t(on ? "Stop" : "Listen")}`; }); }
	function copy(owner) {
		const items = owner === "report" ? Object.values(S.report.groups).flat() : S.turns.find((x) => x.id === owner).items;
		const ids = []; items.forEach((it) => it.cite.forEach((id) => !ids.includes(id) && ids.push(id)));
		const src = ids.map((id, i) => { const c = chunk(id); return c ? `[${i + 1}] ${docOf(c).name}${c.page ? ", " + t("Page {n}", { n: c.page }) : ""}: ${c.text.slice(0, 160)}` : ""; }).join("\n");
		navigator.clipboard?.writeText(`${plainOf(owner)}\n\n${t("Sources")}:\n${src}`).then(() => toast(t("Copied, with its sources.")), () => {});
	}

	/* ---------------- free daily allowance: shown to everyone ---------------- */
	const PER = 500; // about one report
	const resetAt = () => (S.quota ? new Date(S.quota.reset).toLocaleTimeString(I.lang, { hour: "2-digit", minute: "2-digit" }) + " " + t("(your local time)") : ""); // the visitor's own clock, wherever they are
	const quotaOut = () => Boolean(S.quota && S.quota.limit - S.quota.used < PER * 0.6);
	const limitMsg = () => t("This demo has used all of today’s free AI. It comes back at {time}.", { time: resetAt() || "00:00 UTC" });
	function renderQuota() {
		const q = S.quota;
		for (const el of [$("#quota1"), $("#quota2")]) {
			if (!q) { el.hidden = true; continue; }
			const left = Math.max(0, q.limit - q.used), n = Math.floor(left / PER), pct = Math.round((left / q.limit) * 100);
			const cls = left < PER * 0.6 ? "out" : pct <= 25 ? "low" : "";
			const msg = cls === "out" ? limitMsg() : cls === "low" ? t("Free demo: almost used up for today (about {n} analyses left). It comes back at {time}.", { n: Math.max(1, n), time: resetAt() }) : t("Free demo: about {n} analyses left today, for all visitors. Renewed every day at {time}.", { n, time: resetAt() });
			el.className = "quota " + cls; el.hidden = false;
			el.innerHTML = `<span class="bar" role="img" aria-label="${pct} %"><i style="width:${pct}%"></i></span><span>${esc(msg)}</span><button type="button" class="lnk" data-act="whylimit">${t("Why a limit?")}</button>`;
		}
		$("#micBtn").disabled = quotaOut(); $("#analyse").disabled = !ready().length || S.loading > 0 || quotaOut();
	}
	async function loadQuota() { try { const r = await fetch(API, { cache: "no-store" }); const j = await r.json(); if (j.quota) { S.quota = j.quota; renderQuota(); } } catch {} }

	/* ---------------- speak a question: record here, then Whisper writes it ---------------- */
	const REC_MAX = 60, SILENT_GIVE_UP = 6;
	const rec = { on: false };
	const micOK = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext));
	if (micOK) $("#micBtn").hidden = false;
	/* The AudioContext is created during the tap itself: browsers keep it "suspended" (silent) if it is created later. */
	function micTap() {
		if (rec.on) return;
		const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(); ac.resume?.();
		recStart(ac);
	}
	async function recStart(ac) {
		let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
		catch (e) { ac.close?.(); return toast(t(e?.name === "NotAllowedError" ? "Microphone access was refused. You can allow it in your browser settings." : "Your microphone isn’t available in this browser.")); }
		if (ac.state !== "running") { try { await ac.resume(); } catch {} }
		const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
		const mr = new MediaRecorder(stream), parts = [];
		mr.ondataavailable = (e) => e.data.size && parts.push(e.data);
		Object.assign(rec, { on: true, stream, ac, an, mr, parts, t0: performance.now(), heardAt: null, sawSignal: false, floor: 0, frames: 0, bars: [], level: 0 });
		rec.timer = setInterval(sample, 50);
		mr.start(250);
		$("#askForm").classList.add("recording"); $("#rec").hidden = false; $("#recOk").disabled = false; $("#recOk").focus();
		draw();
	}
	/* a small live level meter (about 150 px): it moves whenever the microphone hears something */
	/* Listening is measured every 50 ms (a timer keeps running even when the page isn't painted); the bars are drawn on screen frames. */
	function sample() {
		if (!rec.on) return;
		const buf = new Float32Array(rec.an.fftSize); rec.an.getFloatTimeDomainData(buf);
		let sum = 0, peak = 0; for (const x of buf) { sum += x * x; const a = Math.abs(x); if (a > peak) peak = a; }
		const rms = Math.sqrt(sum / buf.length), sec = (performance.now() - rec.t0) / 1000;
		if (rms > 0.0005) rec.sawSignal = true; // the meter really receives sound from the microphone
		rec.frames++; if (rec.frames <= 4) rec.floor = Math.max(rec.floor, rms); // the room's own noise, first 0.2 s
		if (rec.heardAt == null && rec.frames > 4 && (rms > Math.max(0.01, rec.floor * 2.2) || peak > 0.1)) rec.heardAt = sec;
		rec.level = Math.min(1, Math.sqrt(Math.max(0, rms - rec.floor * 0.6)) * 3.2);
		rec.bars.push(rec.level); while (rec.bars.length > 40) rec.bars.shift();
		$("#recT").textContent = `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
		// give up only when the meter works and has heard nothing: if it can't measure, the person decides with ✓
		if (rec.sawSignal && rec.heardAt == null && sec > SILENT_GIVE_UP) { recStop(false); return toast(t("I didn’t hear anything, so I stopped the microphone. Tap it again to speak.")); }
		if (sec >= REC_MAX) recStop(true);
	}
	function draw() {
		if (!rec.on) return;
		const cv = $("#wave"), g = cv.getContext("2d"), dpr = devicePixelRatio || 1, W = cv.clientWidth || 150, H = cv.clientHeight || 28;
		if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
		const n = Math.floor(W / 5), bars = rec.bars.slice(-n);
		g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.fillStyle = getComputedStyle($("#rec")).color;
		for (let i = 0; i < n; i++) { const v = bars[i - (n - bars.length)] ?? 0, h = Math.max(3, v * (H - 2)); g.globalAlpha = 0.3 + v * 0.7; g.beginPath(); g.roundRect ? g.roundRect(i * 5, (H - h) / 2, 3, h, 1.5) : g.rect(i * 5, (H - h) / 2, 3, h); g.fill(); }
		g.globalAlpha = 1;
		rec.raf = requestAnimationFrame(draw);
	}
	const HALLU = /^(thank you\.?|thanks for watching!?|you|merci\.?|sous-titrage[^]*|\.+)$/i; // what Whisper "hears" in near-silence
	async function recStop(keep) {
		if (!rec.on) return; rec.on = false; cancelAnimationFrame(rec.raf); clearInterval(rec.timer);
		const { mr, stream, ac, parts, heardAt, t0 } = rec;
		const done = new Promise((r) => (mr.onstop = r)); try { mr.stop(); } catch {} await done;
		stream.getTracks().forEach((x) => x.stop());
		const close = () => { ac.close?.(); $("#askForm").classList.remove("recording"); $("#rec").hidden = true; fit(); ta.focus(); };
		if (!keep) { close(); return; }
		if ((performance.now() - t0) < 600 || !parts.length) { close(); return toast(t("I didn’t hear anything, so I stopped the microphone. Tap it again to speak.")); }
		// ✓ always sends what was recorded: Whisper decides; near-silence comes back empty or as a known filler and is ignored
		$("#recOk").disabled = true; $("#recT").textContent = "…"; toast(t("Turning your voice into text…"));
		try {
			const wav = await toWav(new Blob(parts, { type: mr.mimeType || "audio/webm" }), Math.max(0, (heardAt ?? 0) - 0.4));
			const j = await callApi({ mode: "transcribe", audio: wav }, 30000);
			const txt = String(j.text || "").trim();
			if (!txt || HALLU.test(txt)) toast(t("I didn’t hear anything, so I stopped the microphone. Tap it again to speak."));
			else { ta.value = (ta.value.trim() ? ta.value.trim() + " " : "") + txt; $("#toast").classList.remove("on"); }
		} catch (e) { console.warn("Margin voice:", e.message); toast(e.limit ? limitMsg() : t("I couldn’t turn your voice into text. Please try again.")); }
		close();
	}
	/* the recording → 16 kHz mono WAV, without the silence before the first word, as base64 */
	async function toWav(blob, skip) {
		const audio = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(await blob.arrayBuffer());
		const rate = 16000, start = Math.min(skip, audio.duration), len = Math.max(1, Math.ceil((audio.duration - start) * rate));
		const off = new OfflineAudioContext(1, len, rate), node = off.createBufferSource(); node.buffer = audio; node.connect(off.destination); node.start(0, start);
		const pcm = (await off.startRendering()).getChannelData(0), out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
		const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
		str(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVEfmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
		out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, "data"); out.setUint32(40, pcm.length * 2, true);
		for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
		const bytes = new Uint8Array(out.buffer); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
		return btoa(bin);
	}
	/* Tesseract is large: it loads only when the first photo arrives */
	const loadScript = (src) => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const el = document.createElement("script"); el.src = src; el.onload = ok; el.onerror = no; document.head.append(el); });

	/* open or close a block smoothly (height + fade); the passage images are drawn first so the height is right */
	async function slide(el, open) {
		if (!el || reduced) return;
		el.style.overflow = "hidden";
		if (open) { el.style.height = "0px"; el.style.opacity = "0"; if (el.classList.contains("proof")) await S.snips; await new Promise(requestAnimationFrame); }
		const from = open ? 0 : el.scrollHeight, to = open ? el.scrollHeight : 0;
		el.style.height = from + "px"; void el.offsetHeight;
		el.style.transition = "height .34s cubic-bezier(.2,.7,.2,1), opacity .26s ease";
		el.style.height = to + "px"; el.style.opacity = open ? "1" : "0";
		await new Promise((r) => { const done = () => { el.removeEventListener("transitionend", done); r(); }; el.addEventListener("transitionend", done); setTimeout(done, 420); });
		el.style.height = el.style.overflow = el.style.transition = el.style.opacity = "";
	}

	/* ---------------- toast ---------------- */
	let toastT;
	function toast(msg, undoLabel, undo) {
		const el = $("#toast"); clearTimeout(toastT);
		el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">${esc(undoLabel)}</button>` : ""}`;
		// a wrapped message: shrink the box to its longest line, so the space is the same on both sides
		const sp = el.firstElementChild; sp.style.width = ""; el.classList.remove("multi"); requestAnimationFrame(() => { const r = document.createRange(); r.selectNodeContents(sp); const rs = [...r.getClientRects()]; if (rs.length > 1) el.classList.add("multi"), sp.style.width = Math.ceil(Math.max(...rs.map((x) => x.right)) - Math.min(...rs.map((x) => x.left))) + 1 + "px"; });
		if (undo) el.querySelector("button").onclick = () => { undo(); el.classList.remove("on"); };
		// reading time: about two words a second, plus a moment to notice it (never under 3 s, 6 s with Undo)
		const words = String(msg).trim().split(/\s+/).length, ms = Math.max(undo ? 6000 : 3000, words * 500 + 1500);
		const hide = () => el.classList.remove("on"), arm = () => { clearTimeout(toastT); toastT = setTimeout(hide, ms); };
		el.onmouseenter = () => clearTimeout(toastT); el.onmouseleave = arm; // hovering keeps it open
		el.classList.add("on"); arm();
	}

	/* ---------------- events ---------------- */
	const drop = $("#drop");
	["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
	["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
	drop.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
	addEventListener("dragover", (e) => e.preventDefault()); addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length && !e.target.closest("#drop")) addFiles(e.dataTransfer.files); });
	$("#fileIn").addEventListener("change", (e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; });
	/* "download it": a real download (a file saved), never a PDF opened in a tab */
	$("#sample a[download]").addEventListener("click", async (e) => {
		e.preventDefault(); const href = e.currentTarget.getAttribute("href");
		try { const r = await fetch(href); if (!r.ok) throw 0; const url = URL.createObjectURL(await r.blob()); const a = document.createElement("a"); a.href = url; a.download = "brevholt-kelmarion-employment-contract.pdf"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
		catch { location.href = href; }
	});
	const openSample = async () => { S.autoOpen = true; const r = await fetch("samples/brevholt-kelmarion-employment-contract.pdf"); addFiles([new File([await r.blob()], "brevholt-kelmarion-employment-contract.pdf", { type: "application/pdf" })], true); };
	$("#analyse").onclick = () => { go(2); makeReport(); };
	$("#legalBtn").onclick = () => { // privacy & terms, in the reader's language
		const opener = document.activeElement, scrim = document.createElement("div"), v = document.createElement("div");
		scrim.className = "scrim"; v.className = "viewer"; v.setAttribute("role", "dialog"); v.setAttribute("aria-modal", "true"); v.setAttribute("aria-labelledby", "lgH");
		v.innerHTML = `<div class="legal"><h3 id="lgH">${t("Privacy & terms")}</h3>${["Files, photos and pasted text are read in your browser. A link is fetched once by our server, only to read the page.", "When you speak a question, the recording is sent once to Cloudflare Workers AI (Whisper, by OpenAI) to turn it into text, and isn’t kept.", "This free demo shares a daily AI allowance between all visitors. When it runs out, it comes back the next day.", "To write the summary and the answers, only the passages needed are sent to Cloudflare Workers AI, which runs Llama 3.3 (Meta). Cloudflare states that it does not use this content to train AI models, and Margin stores nothing.", "Margin helps you read a document. It is not legal, financial or medical advice: for an important decision, ask a professional. The AI can be wrong. Always check the highlighted source.", "Portfolio demo: please don’t add very personal or confidential documents."].map((k) => `<p>${esc(t(k))}</p>`).join("")}<p>Built with Llama · <a class="lnk" href="THIRD-PARTY-NOTICES.txt">${t("Licences")}</a></p><div class="row"><button type="button" class="btn btn-sm" data-close>${ic("x")}${t("Close")}</button></div></div>`;
		const close = () => { scrim.remove(); v.remove(); document.removeEventListener("keydown", key); opener?.focus(); }, key = (e) => { if (e.key === "Escape") close(); };
		v.addEventListener("click", (e) => { if (e.target === v || e.target.closest("[data-close]")) close(); });
		document.addEventListener("keydown", key); document.body.append(scrim, v); v.querySelector("[data-close]").focus();
	};
	$("#back2").onclick = () => go(1);
	$("#urlIn").addEventListener("input", (e) => ($("#urlGo").disabled = !e.target.value.trim()));
	$("#urlForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#urlIn").value.trim(); if (!v) return; $("#urlIn").value = ""; $("#urlGo").disabled = true; addLink(/^https?:\/\//i.test(v) ? v : "https://" + v); });
	/* "You can also [click here] to paste…": only the two words are the link; the sentence is rebuilt in each language */
	function pasteLine() {
		const btn = $("#pasteBtn"), [before, after = ""] = t("You can also {link} to paste the text of a contract, a letter or any other document.").split("{link}");
		btn.textContent = t("click here"); btn.setAttribute("aria-label", t("Click here to paste the text"));
		$("#pasteLine").replaceChildren(document.createTextNode(before), btn, document.createTextNode(after));
	}
	let pasteBusy = false;
	async function pasteOpen(on) {
		const box = $("#pasteBox"); if (pasteBusy || box.hidden === !on) return; pasteBusy = true;
		$("#pasteBtn").setAttribute("aria-expanded", String(on));
		if (on) { box.hidden = false; $("#pasteIn").focus({ preventScroll: true }); await slide(box, true); }
		else { await slide(box, false); box.hidden = true; }
		pasteBusy = false;
	}
	$("#pasteBtn").onclick = () => pasteOpen($("#pasteBox").hidden);
	$("#pasteCancel").onclick = () => { pasteOpen(false); $("#pasteBtn").focus(); };
	$("#pasteIn").addEventListener("input", (e) => ($("#pasteOk").disabled = e.target.value.trim().split(/\s+/).length < 30));
	$("#pasteOk").onclick = () => { const v = $("#pasteIn").value; $("#pasteIn").value = ""; $("#pasteOk").disabled = true; pasteOpen(false); addText(v); };
	$("#home").onclick = () => go(1);
	const ta = $("#q"), goBtn = $("#askForm .go");
	const fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; goBtn.disabled = !ta.value.trim(); };
	ta.addEventListener("input", fit);
	ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#askForm").requestSubmit(); } });
	$("#micBtn").onclick = micTap;
	$("#recX").onclick = () => recStop(false);
	$("#recOk").onclick = () => recStop(true);
	document.addEventListener("keydown", (e) => { if (rec.on && e.key === "Escape") recStop(false); });
	$("#askForm").addEventListener("submit", (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ""; fit(); ask(v); });
	document.addEventListener("click", async (e) => {
		const rm = e.target.closest("[data-rm]");
		if (rm) { const i = S.docs.findIndex((d) => d.fid === rm.dataset.rm), d = S.docs[i]; if (!d) return; const rep = S.report, turns = S.turns; S.docs.splice(i, 1); S.index = null; if (!S.docs.length) { S.report = null; S.turns = []; } renderAll(); scheduleReport(); toast(t("File removed."), t("Undo"), () => { S.docs.splice(i, 0, d); S.index = null; S.report = rep; S.turns = turns; renderAll(); }); return; }
		const w = e.target.closest("[data-where]");
		if (w) {
			const k = w.dataset.where, again = () => (w.closest("#thread") ? renderThread() : renderReport());
			if (S.open.has(k)) { await slide(w.nextElementSibling, false); S.open.delete(k); again(); document.querySelector(`[data-where="${k}"]`)?.focus(); return; }
			S.open.add(k); again(); const b = document.querySelector(`[data-where="${k}"]`); b?.focus(); slide(b?.nextElementSibling, true); return;
		}
		const tr = e.target.closest("[data-try]"); if (tr) return ask(t(tr.dataset.try));
		const v = e.target.closest("[data-view]"); if (v) return view(v.dataset.view);
		const x = e.target.closest("[data-tr]");
		if (x) {
			const it = [...Object.values(S.report?.groups || {}).flat(), ...S.turns.flatMap((u) => u.items || [])].find((i) => i.key === x.dataset.tr); if (!it) return;
			const id = x.dataset.id, again = () => (x.closest("#thread") ? renderThread() : renderReport());
			it.tr = it.tr || {};
			if (it.tr[id] && it.tr[id] !== "…") { delete it.tr[id]; return again(); }
			it.tr[id] = "…"; again();
			try { const j = await callApi({ mode: "translate", lang: x.dataset.lang, text: chunk(id).text }); it.tr[id] = j.translation || ""; if (!it.tr[id]) delete it.tr[id]; } catch (e) { delete it.tr[id]; toast(e.limit ? limitMsg() : t("The AI can’t be reached right now, and this needs it. Please try again in a moment.")); }
			return again();
		}
		const a = e.target.closest("[data-act]"); if (!a) return;
		const owner = a.dataset.r;
		if (a.dataset.act === "whylimit") return toast(t("Margin is a free demo. It runs on Cloudflare’s free AI allowance, shared by every visitor, which renews each day."));
		if (a.dataset.act === "reanalyse") { if (S.report) { S.report.failed = "retry"; S.report.cleared = false; } return makeReport(); }
		if (a.dataset.act === "listen") return speak(owner);
		if (a.dataset.act === "copy") return copy(owner);
		if (a.dataset.act === "clear") { if (S.speaking) speak(S.speaking); const rep = S.report, turns = S.turns; S.report = { sig: rep.sig, cleared: true, failed: "cleared", lang: rep.lang }; S.turns = []; renderAll(); toast(t("Analysis cleared."), t("Undo"), () => { S.report = rep; S.turns = turns; renderAll(); }); return; }
		if (a.dataset.act === "rmturn") { const i = S.turns.findIndex((x) => x.id === owner), tu = S.turns[i]; if (!tu) return; if (S.speaking === owner) speak(owner); S.turns.splice(i, 1); renderThread(); renderTries(); toast(t("Result removed."), t("Undo"), () => { S.turns.splice(i, 0, tu); renderThread(); }); }
	});

	/* ---------------- boot ---------------- */
	S.page = 1; initLang(); setLang(I.lang); loadQuota();
	window.MARGIN_DEBUG = S;
	if (new URLSearchParams(location.search).get("sample")) openSample(); // link from the case study
})();
