/* Facet file reader. Everything happens in the browser: the file never leaves the page.
 * read(files) → { tx: [{ d, label, a, cat?, src: { file, line } }], files: [{ name, kind, found, skipped, note }], mapping }
 * Formats: CSV / TXT (any separator, decimal comma or point), XLSX (read here, no library: zip + XML),
 * PDF (pdf.js, text with positions: debit and credit columns found by their header), DOCX (mammoth: tables, else lines). */
(function () {
	const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

	/* ---------------- amounts and dates ---------------- */
	const MONEY = /^[(+\-−]?\s*(?:[€$£]\s*)?\d{1,3}(?:[   .,']\d{3})*(?:[.,]\d{1,2})?\s*(?:€|eur|\$|£)?\s*[)\-]?$|^[(+\-−]?\d+(?:[.,]\d{1,2})?\s*(?:€|eur)?[)\-]?$/i;
	function amount(v) {
		if (typeof v === "number") return isFinite(v) ? v : null;
		let s = String(v ?? "").trim(); if (!s || !/\d/.test(s) || !MONEY.test(s)) return null;
		let neg = /^[(\-−]/.test(s) || /[\-)]$/.test(s);
		s = s.replace(/[^\d.,]/g, "");
		const lc = s.lastIndexOf(","), lp = s.lastIndexOf(".");
		let dec = null;
		if (lc >= 0 && lp >= 0) dec = lc > lp ? "," : ".";
		else if (lc >= 0) dec = s.length - lc - 1 <= 2 ? "," : null;
		else if (lp >= 0) dec = s.length - lp - 1 <= 2 ? "." : null;
		const [int, frac = ""] = dec ? [s.slice(0, s.lastIndexOf(dec)), s.slice(s.lastIndexOf(dec) + 1)] : [s, ""];
		const n = parseFloat(int.replace(/[.,]/g, "") + (frac ? "." + frac : ""));
		return isFinite(n) ? (neg ? -n : n) : null;
	}
	const MON = { jan: 1, janv: 1, fev: 2, fevr: 2, feb: 2, mar: 3, mars: 3, avr: 4, apr: 4, mai: 5, may: 5, jun: 6, juin: 6, jul: 7, juil: 7, aou: 8, aout: 8, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
	const iso = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null);
	const y4 = (y) => (y < 100 ? 2000 + y : y);
	/* order: "dmy" or "mdy", decided per file from the values themselves */
	function date(v, order = "dmy", yearHint) {
		if (typeof v === "number") { if (v > 20000 && v < 80000) { const t = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); } return null; }
		const s = norm(v); let m;
		if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return iso(+m[1], +m[2], +m[3]);
		if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/))) { const a = +m[1], b = +m[2], y = y4(+m[3]); return order === "mdy" ? iso(y, a, b) : iso(y, b, a); }
		if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/)) && yearHint) { const a = +m[1], b = +m[2]; return order === "mdy" ? iso(yearHint, a, b) : iso(yearHint, b, a); }
		if ((m = s.match(/^(\d{1,2})\s+([a-z]{3,5})\.?\s+(\d{2,4})/)) && MON[m[2]]) return iso(y4(+m[3]), MON[m[2]], +m[1]);
		if ((m = s.match(/^([a-z]{3,5})\.?\s+(\d{1,2}),?\s+(\d{4})/)) && MON[m[1]]) return iso(+m[3], MON[m[1]], +m[2]);
		return null;
	}
	function dateOrder(values) {
		let dmy = 0, mdy = 0;
		for (const v of values) { const m = String(v ?? "").match(/^\s*(\d{1,2})[-/.](\d{1,2})/); if (!m) continue; if (+m[1] > 12) dmy++; if (+m[2] > 12) mdy++; }
		return mdy > dmy ? "mdy" : "dmy";
	}

	/* ---------------- tables (CSV, XLSX, DOCX tables) ---------------- */
	const H = {
		date: ["date", "date operation", "date de l operation", "transaction date", "booking date", "posted", "jour", "fecha", "datum"],
		vdate: ["date de valeur", "value date", "valeur"],
		label: ["libelle", "label", "description", "details", "detail", "operation", "payee", "merchant", "beneficiaire", "narrative", "intitule", "memo", "concept"],
		amount: ["montant", "amount", "somme", "valeur eur", "value", "importe", "betrag", "sum"],
		debit: ["debit", "debits", "withdrawal", "paid out", "sortie", "depense", "money out", "out"],
		credit: ["credit", "credits", "deposit", "paid in", "entree", "recette", "money in", "in"],
		cat: ["categorie", "category", "type de depense", "rubrique", "poste"],
	};
	const hit = (cell, words) => { const c = norm(cell).replace(/\(.*?\)/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim(); return c && words.some((w) => c === w || c.startsWith(w + " ")); };
	function headerRow(rows) {
		let best = -1, score = 0;
		for (let i = 0; i < Math.min(rows.length, 40); i++) {
			const r = rows[i]; let s = 0;
			for (const c of r) for (const k of Object.keys(H)) if (hit(c, H[k])) { s++; break; }
			if (s > score) { score = s; best = i; }
		}
		return score >= 2 ? best : -1;
	}
	function mapColumns(rows, hi) {
		const head = hi >= 0 ? rows[hi] : [], body = rows.slice(hi + 1).filter((r) => r.some((c) => String(c ?? "").trim())), n = Math.max(...body.slice(0, 200).map((r) => r.length), head.length);
		const col = (k) => head.findIndex((c, i) => hit(c, H[k]) && !(k === "date" && hit(c, H.vdate)) && !used.has(i));
		const used = new Set(), M = {};
		for (const k of ["date", "label", "amount", "debit", "credit", "cat"]) { const i = col(k); if (i >= 0) { M[k] = i; used.add(i); } }
		// no header (or missing columns): look at the values
		const sample = body.slice(0, 300), order = dateOrder(sample.map((r) => r[M.date ?? 0]));
		const ratio = (i, f) => sample.filter((r) => f(r[i])).length / (sample.length || 1);
		if (M.date == null) for (let i = 0; i < n; i++) if (!used.has(i) && ratio(i, (v) => date(v, order)) > 0.8) { M.date = i; used.add(i); break; }
		if (M.amount == null && M.debit == null) {
			const nums = []; for (let i = 0; i < n; i++) if (!used.has(i) && ratio(i, (v) => amount(v) != null) > 0.6) nums.push(i);
			if (nums.length === 1) M.amount = nums[0];
			else if (nums.length >= 2) { // two sparse money columns: debit then credit; otherwise the last one is the amount (often followed by a balance)
				const fill = nums.map((i) => ratio(i, (v) => amount(v) != null));
				if (fill[0] < 0.95 && fill[1] < 0.95) { M.debit = nums[0]; M.credit = nums[1]; } else M.amount = nums[0];
			}
			[M.amount, M.debit, M.credit].forEach((i) => i != null && used.add(i));
		}
		if (M.label == null) { let bi = -1, bl = 0; for (let i = 0; i < n; i++) { if (used.has(i)) continue; const l = sample.reduce((a, r) => a + (amount(r[i]) == null && !date(r[i], order) ? String(r[i] ?? "").length : 0), 0); if (l > bl) { bl = l; bi = i; } } if (bi >= 0) M.label = bi; }
		M.order = order; M.head = head.map((c) => String(c ?? ""));
		return { M, body };
	}
	function fromTable(rows, file) {
		const hi = headerRow(rows), { M, body } = mapColumns(rows, hi), tx = [], at = new Map(rows.map((r, i) => [r, i + 1])); let skipped = 0;
		if (M.date == null || (M.amount == null && M.debit == null && M.credit == null)) return { tx, skipped: body.length, M, fail: true };
		body.forEach((r, k) => {
			const d = date(r[M.date], M.order);
			let a = M.amount != null ? amount(r[M.amount]) : null;
			if (a == null && (M.debit != null || M.credit != null)) { const de = amount(r[M.debit]), cr = amount(r[M.credit]); a = de ? -Math.abs(de) : cr ? Math.abs(cr) : null; }
			const label = String(r[M.label] ?? "").replace(/\s+/g, " ").trim();
			if (!d || a == null || a === 0 || /^(solde|total|balance|report|ancien solde|nouveau solde)\b/i.test(norm(label))) { skipped++; return; }
			tx.push({ d, label: label || "?", a: Math.round(a * 100) / 100, cat: M.cat != null ? String(r[M.cat] ?? "").trim() : "", src: { file, line: at.get(r) || k + 1 } });
		});
		// a sheet where every amount is positive and there is one amount column: they are spending
		if (M.amount != null && tx.length && tx.every((t) => t.a > 0)) { tx.forEach((t) => (t.a = -t.a)); M.allPositive = true; }
		return { tx, skipped, M };
	}

	function csvRows(text) {
		const lines = text.replace(/^﻿/, "").split(/\r?\n/);
		const cand = [";", ",", "\t", "|"], sample = lines.slice(0, 60);
		const sep = cand.map((c) => [c, sample.filter((l) => l.split(c).length > 2).length]).sort((a, b) => b[1] - a[1])[0];
		if (!sep || sep[1] < 3) return null;
		const s = sep[0], out = [];
		for (const l of lines) { const row = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === s && !q) { row.push(cur); cur = ""; } else cur += ch; } row.push(cur); out.push(row.map((c) => c.trim())); }
		return out;
	}

	/* XLSX without a library: unzip with the browser's own DecompressionStream, then read the XML of the first sheet */
	async function unzip(buf) {
		const v = new DataView(buf), files = {}; let e = buf.byteLength - 22;
		while (e > 0 && v.getUint32(e, true) !== 0x06054b50) e--;
		let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true), dec = new TextDecoder();
		for (let k = 0; k < n; k++) {
			const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
			const name = dec.decode(new Uint8Array(buf, p + 46, nl)); p += 46 + nl + xl + cl;
			const lnl = v.getUint16(off + 26, true), lxl = v.getUint16(off + 28, true), data = new Uint8Array(buf, off + 30 + lnl + lxl, size);
			files[name] = { method, data };
		}
		return async (name) => { const f = files[name]; if (!f) return null; if (f.method === 0) return dec.decode(f.data); const s = new Blob([f.data]).stream().pipeThrough(new DecompressionStream("deflate-raw")); return await new Response(s).text(); };
	}
	async function xlsxRows(buf) {
		const get = await unzip(buf), X = (t) => new DOMParser().parseFromString(t, "application/xml");
		const ss = await get("xl/sharedStrings.xml"), strings = ss ? [...X(ss).getElementsByTagName("si")].map((si) => [...si.getElementsByTagName("t")].map((t) => t.textContent).join("")) : [];
		const wb = X((await get("xl/workbook.xml")) || "<x/>"), rels = X((await get("xl/_rels/workbook.xml.rels")) || "<x/>");
		const first = wb.getElementsByTagName("sheet")[0], rid = first?.getAttribute("r:id") || first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
		const target = [...rels.getElementsByTagName("Relationship")].find((r) => r.getAttribute("Id") === rid)?.getAttribute("Target") || "worksheets/sheet1.xml";
		const sheet = X(await get("xl/" + target.replace(/^\/?xl\//, "").replace(/^\//, "")));
		const out = [];
		for (const row of sheet.getElementsByTagName("row")) {
			const r = +row.getAttribute("r") - 1, cells = [];
			for (const c of row.getElementsByTagName("c")) {
				const ref = c.getAttribute("r"), t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0]?.textContent;
				const ci = ref.replace(/\d+/g, "").split("").reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
				cells[ci] = t === "s" ? strings[+v] : t === "inlineStr" ? [...c.getElementsByTagName("t")].map((x) => x.textContent).join("") : t === "str" || t === "b" ? v : v != null ? +v : "";
			}
			out[r] = [...cells].map((x) => x ?? "");
		}
		return [...out].map((r) => r || []);
	}

	/* ---------------- lines (PDF statements, text, Word without tables) ---------------- */
	const SKIP = /\b(solde|total|balance|report|ancien solde|nouveau solde|sous-total|carry|brought forward|page \d)\b/i;
	function fromLines(lines, file, cols) {
		const all = lines.map((l) => l.text).join("\n"), years = (all.match(/\b20\d\d\b/g) || []).map(Number);
		const yearHint = years.length ? +Object.entries(years.reduce((a, y) => ((a[y] = (a[y] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
		const order = dateOrder(lines.map((l) => l.text.trim()));
		const tx = []; let skipped = 0, lastMonth = null, roll = 0;
		lines.forEach((L, k) => {
			const text = L.text.replace(/\s+/g, " ").trim(), m = text.match(/^(\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[a-zéû]{3,5}\.?(?:\s+\d{4})?)\s+(.*)$/i);
			if (!m) return;
			let d = date(m[1], order, yearHint);
			if (!d) return;
			if (/^\d{1,2}[/.\-]\d{1,2}$|^\d{1,2}\s+[a-zéû]+\.?$/i.test(m[1])) { // no year written: follow the months through a new year
				const mo = +d.slice(5, 7); if (lastMonth && mo < lastMonth - 6) roll = 1; lastMonth = mo; if (roll) d = (+d.slice(0, 4) + roll) + d.slice(4);
			}
			let rest = m[2].replace(/^(\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?)\s+/, ""); // a second date (value date)
			const toks = rest.split(" "); const money = [];
			while (toks.length && amount(toks[toks.length - 1]) != null) {
				let t = toks.pop();
				while (toks.length && /^\d{1,3}$/.test(toks[toks.length - 1]) && /^\d{3}[.,]\d{2}/.test(t)) t = toks.pop() + " " + t; // "1 234,56"
				money.unshift(t);
			}
			const label = toks.join(" ").trim();
			if (!money.length || !label || SKIP.test(label)) { skipped++; return; }
			let a = amount(money[0]);
			if (cols && L.items) { // which column is the amount under: debit or credit?
				const item = L.items.slice().reverse().find((it) => amount(it.s.trim()) != null);
				if (item) a = Math.abs(a) * (Math.abs(item.x - cols.credit) < Math.abs(item.x - cols.debit) ? 1 : -1);
			} else if (money.length >= 2 && !/[\-−(]/.test(money.join(""))) {
				// two amounts and no sign: the first is the movement, the last is often the running balance
				a = /\b(vir(ement)? (sepa )?(recu|de)|salaire|remboursement|refund|credit|deposit|interets)\b/i.test(norm(label)) ? Math.abs(a) : -Math.abs(a);
			} else if (!/[\-−(]/.test(money[0])) a = /\b(vir(ement)? (sepa )?(recu|de)|salaire|salary|remboursement|refund|deposit|interets|prime)\b/i.test(norm(label)) ? Math.abs(a) : -Math.abs(a);
			if (!a) { skipped++; return; }
			tx.push({ d, label, a: Math.round(a * 100) / 100, cat: "", src: { file, line: L.page ? `p. ${L.page}` : k + 1 } });
		});
		return { tx, skipped, M: { lines: true, cols: !!cols } };
	}
	async function pdfLines(buf) {
		const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise, out = []; let cols = null;
		for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
			const page = await pdf.getPage(p), c = await page.getTextContent(), rows = new Map();
			for (const it of c.items) { if (!it.str.trim()) continue; const y = Math.round(it.transform[5] / 2.5); const x = it.transform[4] + (it.width || 0); (rows.get(y) || rows.set(y, []).get(y)).push({ s: it.str, x, x0: it.transform[4] }); }
			[...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
				items.sort((a, b) => a.x0 - b.x0);
				const text = items.map((i) => i.s).join(" ");
				const de = items.find((i) => /^d[ée]bits?$|^debit$|^withdrawals?$|^paid out$/i.test(i.s.trim())), cr = items.find((i) => /^cr[ée]dits?$|^deposits?$|^paid in$/i.test(i.s.trim()));
				if (de && cr) cols = { debit: de.x, credit: cr.x };
				out.push({ text, items, page: p });
			});
		}
		return { lines: out, cols, pages: pdf.numPages };
	}

	/* ---------------- one file ---------------- */
	async function readFile(f) {
		const name = f.name, ext = (name.split(".").pop() || "").toLowerCase();
		const res = (kind, r, note) => ({ kind, ...r, note });
		if (ext === "xls") return { kind: "xls", tx: [], skipped: 0, fail: "xls" };
		if (ext === "xlsx" || ext === "xlsm") return res("xlsx", fromTable(await xlsxRows(await f.arrayBuffer()), name));
		if (ext === "pdf") { const { lines, cols, pages } = await pdfLines(await f.arrayBuffer()); const r = fromLines(lines, name, cols); return res("pdf", r, { pages }); }
		if (ext === "docx") {
			const html = (await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() })).value, doc = new DOMParser().parseFromString(html, "text/html");
			const tables = [...doc.querySelectorAll("table")];
			if (tables.length) { const rows = tables.flatMap((t) => [...t.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("td,th")].map((c) => c.textContent.trim()))); const r = fromTable(rows, name); if (r.tx.length) return res("docx", r); }
			return res("docx", fromLines([...doc.body.querySelectorAll("p,li")].map((p) => ({ text: p.textContent })), name));
		}
		let text = await f.text();
		if (text.includes("�")) text = new TextDecoder("windows-1252").decode(await f.arrayBuffer());
		const rows = csvRows(text);
		if (rows) { const r = fromTable(rows, name); if (r.tx.length) return res(ext === "csv" ? "csv" : "txt", r); }
		return res("txt", fromLines(text.split(/\r?\n/).map((t) => ({ text: t })), name));
	}

	async function read(files) {
		const out = { tx: [], files: [] };
		for (const f of files) {
			let r; try { r = await readFile(f); } catch (e) { r = { kind: "?", tx: [], skipped: 0, fail: "broken" }; console.warn(e); }
			out.files.push({ name: f.name, kind: r.kind, found: r.tx.length, skipped: r.skipped, fail: r.fail || (r.tx.length ? null : "none"), M: r.M, pages: r.note?.pages });
			out.tx.push(...r.tx);
		}
		// the same line in two files (two overlapping statements) is counted once
		const seen = new Set(); out.dupes = 0;
		out.tx = out.tx.filter((t) => { const k = t.d + "|" + t.a + "|" + norm(t.label); if (seen.has(k)) { out.dupes++; return false; } seen.add(k); return true; });
		out.tx.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
		return out;
	}

	window.FACET_PARSE = { read, amount, date };
})();
