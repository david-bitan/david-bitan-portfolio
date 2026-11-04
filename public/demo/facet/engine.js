/* Facet engine: turns a screen description ("spec") into numbers, in the browser.
 * The AI (or the local reader below) only CHOOSES what to show. Every number shown is computed here, from the transactions.
 * Spec: { title, blocks: [{ kind, title, measure, by, period, filter, compare, limit }] }
 *   kind     kpi | bar | line | donut | table
 *   measure  spend | income | net | count | avg | avg_month
 *   by       none | category | merchant | month | week | weekday | day | transaction
 *   period   { preset: this_month | last_month | last_3_months | last_6_months | last_12_months | this_year | all } or { from: "YYYY-MM", to: "YYYY-MM" }
 *   filter   { categories: [ids], merchants: [names], min, max }   (min/max: amount in euros, spending as a positive number)
 *   compare  true: a KPI also shows the previous period of the same length */
(function () {
	const KINDS = ["kpi", "bar", "line", "donut", "table"];
	const MEASURES = ["spend", "income", "net", "count", "avg", "avg_month"];
	const BYS = ["none", "category", "merchant", "month", "week", "weekday", "day", "transaction"];
	const PRESETS = ["this_month", "last_month", "last_3_months", "last_6_months", "last_12_months", "this_year", "all"];
	const TIME = ["month", "week", "weekday", "day"];
	const MAX_BLOCKS = 8;

	const pad = (n) => String(n).padStart(2, "0");
	const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d || 1); };
	const lastOf = (y, m) => new Date(y, m + 1, 0);
	const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1;

	/* A period becomes exact dates. "this month" ends today; the previous period has the same length, shifted back. */
	function range(period, data) {
		const T = parse(data.today), Y = T.getFullYear(), M = T.getMonth(), p = period || { preset: "this_month" };
		let from, to, months, partial = false;
		if (p.from || p.to) {
			const f = /^\d{4}-\d{2}$/.test(p.from || "") ? parse(p.from + "-01") : parse(data.from);
			const tt = /^\d{4}-\d{2}$/.test(p.to || "") ? parse(p.to + "-01") : T;
			from = new Date(f.getFullYear(), f.getMonth(), 1); to = lastOf(tt.getFullYear(), tt.getMonth());
			if (from > to) [from, to] = [new Date(to.getFullYear(), to.getMonth(), 1), lastOf(from.getFullYear(), from.getMonth())];
		} else {
			const n = { this_month: 1, last_3_months: 3, last_6_months: 6, last_12_months: 12 }[p.preset];
			if (p.preset === "last_month") { from = new Date(Y, M - 1, 1); to = lastOf(Y, M - 1); }
			else if (p.preset === "this_year") { from = new Date(Y, 0, 1); to = T; partial = true; }
			else if (p.preset === "all") { from = parse(data.from); from = new Date(from.getFullYear(), from.getMonth(), 1); to = T; partial = true; }
			else { from = new Date(Y, M - (n || 1) + 1, 1); to = T; partial = true; }
		}
		const first = parse(data.from); if (from < new Date(first.getFullYear(), first.getMonth(), 1)) from = new Date(first.getFullYear(), first.getMonth(), 1);
		if (to > T) { to = T; partial = true; }
		months = monthsBetween(from, to);
		// previous period: same number of months, and the same days if this one stops part way through a month
		const pf = new Date(from.getFullYear(), from.getMonth() - months, 1);
		const pt = partial ? new Date(to.getFullYear(), to.getMonth() - months, Math.min(to.getDate(), lastOf(to.getFullYear(), to.getMonth() - months).getDate())) : lastOf(to.getFullYear(), to.getMonth() - months);
		const prev = pf >= new Date(first.getFullYear(), first.getMonth(), 1) ? { from: ymd(pf), to: ymd(pt) } : null;
		return { from: ymd(from), to: ymd(to), months, partial, prev };
	}

	/* Keep only what the engine understands: anything else from the model is dropped, never guessed. */
	function clean(spec, data) {
		const cats = data.cats, merchants = new Map(data.merchants.map((m) => [m.toLowerCase(), m]));
		const s = { title: title(spec?.title, 90), blocks: [] };
		for (const b of Array.isArray(spec?.blocks) ? spec.blocks : []) {
			if (s.blocks.length >= MAX_BLOCKS) break;
			let kind = KINDS.includes(b?.kind) ? b.kind : null; if (!kind) continue;
			let measure = MEASURES.includes(b.measure) ? b.measure : "spend";
			let by = BYS.includes(b.by) ? b.by : (kind === "kpi" ? "none" : kind === "line" ? "month" : "category");
			const f = b.filter || {}, filter = {};
			const c = (Array.isArray(f.categories) ? f.categories : []).filter((x) => cats.includes(x)); if (c.length) filter.categories = [...new Set(c)];
			const m = (Array.isArray(f.merchants) ? f.merchants : []).map((x) => merchants.get(String(x).toLowerCase())).filter(Boolean); if (m.length) filter.merchants = [...new Set(m)];
			if (+f.min > 0) filter.min = +f.min; if (+f.max > 0) filter.max = +f.max;
			let period = null;
			if (b.period && PRESETS.includes(b.period.preset)) period = { preset: b.period.preset };
			else if (b.period && (/^\d{4}-\d{2}$/.test(b.period.from || "") || /^\d{4}-\d{2}$/.test(b.period.to || ""))) period = { from: b.period.from, to: b.period.to };
			else period = { preset: "this_month" };
			// forms that cannot work are corrected, not refused
			if (kind === "kpi") by = "none";
			if (kind !== "kpi" && by === "none") by = "category";
			if (kind === "line" && !TIME.includes(by)) by = "month";
			if (kind === "donut" && !["category", "merchant"].includes(by)) by = "category";
			if (by === "transaction") kind = "table";
			if (["income", "net"].includes(measure) && by === "category") by = kind === "kpi" ? "none" : "month";
			if (kind === "donut" && measure !== "spend" && measure !== "count") measure = "spend";
			if (measure === "avg_month" && by === "month") measure = "spend";
			const limit = Math.max(3, Math.min(+b.limit || (by === "transaction" ? 8 : by === "merchant" ? 8 : 12), 30));
			s.blocks.push({ kind, title: title(b.title, 70), measure, by, period, filter, compare: kind === "kpi" ? b.compare !== false : false, limit });
		}
		return s.blocks.length ? s : null;
	}
	const title = (x, n) => (x && typeof x === "object" && x.k ? { k: str(x.k, n), p: x.p && typeof x.p === "object" ? x.p : {} } : str(x, n));
	const str = (x, n) => String(x ?? "").replace(/\s+/g, " ").replace(/[—–]/g, ",").trim().slice(0, n);

	function pickTx(data, b, from, to) {
		const f = b.filter || {};
		return data.tx.filter((t) => {
			if (t.d < from || t.d > to) return false;
			if (b.measure === "income") { if (t.a <= 0) return false; }
			else if (b.measure !== "net" && t.a >= 0) return false;
			if (f.categories && b.measure !== "income" && b.measure !== "net" && !f.categories.includes(t.c)) return false;
			if (f.merchants && !f.merchants.includes(t.m)) return false;
			const abs = Math.abs(t.a); if (f.min && abs < f.min) return false; if (f.max && abs > f.max) return false;
			return true;
		});
	}
	function value(measure, list, months) {
		const spend = list.reduce((a, t) => a + (t.a < 0 ? -t.a : 0), 0);
		switch (measure) {
			case "income": return list.reduce((a, t) => a + (t.a > 0 ? t.a : 0), 0);
			case "net": return list.reduce((a, t) => a + t.a, 0);
			case "count": return list.length;
			case "avg": return list.length ? spend / list.length : 0;
			case "avg_month": return spend / Math.max(1, months);
			default: return spend;
		}
	}
	const r2 = (x) => Math.round(x * 100) / 100;

	function keysFor(by, from, to) {
		const out = [], a = parse(from), b = parse(to);
		if (by === "month") for (let d = new Date(a.getFullYear(), a.getMonth(), 1); d <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(ymd(d).slice(0, 7));
		if (by === "day") for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) out.push(ymd(d));
		if (by === "week") for (let d = monday(a); d <= b; d.setDate(d.getDate() + 7)) out.push(ymd(d));
		if (by === "weekday") out.push(1, 2, 3, 4, 5, 6, 0);
		return out;
	}
	function monday(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
	const keyOf = (by, t) => by === "category" ? t.c : by === "merchant" ? t.m : by === "month" ? t.d.slice(0, 7) : by === "day" ? t.d : by === "week" ? ymd(monday(parse(t.d))) : by === "weekday" ? parse(t.d).getDay() : "all";

	/* The result of one block: rows with their transactions, so every number can be traced back to its lines. */
	function run(b, data) {
		const R = range(b.period, data), list = pickTx(data, b, R.from, R.to);
		const out = { R, list, total: r2(value(b.measure, list, R.months)), ids: list.map((t) => t.id) };
		if (b.kind === "kpi") {
			if (b.compare && R.prev) { const pl = pickTx(data, b, R.prev.from, R.prev.to); out.prev = r2(value(b.measure, pl, R.months)); out.prevList = pl; }
			return out;
		}
		if (b.by === "transaction") { out.rows = list.slice().sort((x, y) => Math.abs(y.a) - Math.abs(x.a)).slice(0, b.limit).map((t) => ({ key: t.id, tx: [t], value: r2(Math.abs(t.a)) })); out.more = Math.max(0, list.length - b.limit); return out; }
		const groups = new Map();
		for (const k of keysFor(b.by, R.from, R.to)) groups.set(k, []);
		for (const t of list) { const k = keyOf(b.by, t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
		// per-month average inside a category or merchant view: divide by the months of the period; per weekday: by the number of weeks
		let rows = [...groups].map(([key, tx]) => ({ key, tx, value: r2(value(b.measure, tx, R.months)) }));
		if (TIME.includes(b.by)) {
			// the current month or week is not over yet: flagged so the chart shows it as "in progress", not as a drop
			const T = parse(data.today), curKey = b.by === "month" ? data.today.slice(0, 7) : b.by === "week" ? ymd(monday(T)) : null;
			if (curKey && R.to === data.today) rows.forEach((r) => { if (r.key === curKey) r.partial = true; });
			return { ...out, rows };
		}
		rows = rows.filter((r) => r.value !== 0).sort((x, y) => y.value - x.value);
		const cap = b.kind === "donut" ? 6 : b.limit;
		if (rows.length > cap + 1) { const rest = rows.slice(cap), tx = rest.flatMap((r) => r.tx); rows = rows.slice(0, cap).concat({ key: "_other", tx, value: r2(value(b.measure, tx, R.months)), n: rest.length }); }
		return { ...out, rows };
	}

	window.FACET_ENGINE = { KINDS, MEASURES, BYS, PRESETS, TIME, MAX_BLOCKS, range, clean, run, parse };
})();
