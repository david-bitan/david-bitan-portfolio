/**
 * Facet: POST /api/facet
 * { request, lang, today, from, merchants: [...], prev?: spec, sel?: index } → { spec }
 * The model only describes WHICH screen to build (blocks, periods, filters). It never sees an amount and never writes one:
 * the page computes every number from the transactions and drops anything it does not understand. Nothing is stored.
 * Same Workers AI binding ("AI") as the other demos. Daily budget counted in the MARGIN_KV namespace, under its own key.
 */
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };
const LANG = { en: "English", fr: "French", es: "Spanish", de: "German", he: "Hebrew" };

/* Workers AI gives this account 10,000 free neurons a day, shared by every demo. Facet keeps under FACET_BUDGET (about 35 requests, about 65 neurons each).
 * When it is spent, the page switches to its local reader, so the demo keeps working. */
const FACET_BUDGET = 2500, COST = 160;
const RATE_IN = 26668 / 1e6, RATE_OUT = 204805 / 1e6;
const dayKey = () => "facet:used:" + new Date().toISOString().slice(0, 10);
function nextReset() { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toISOString(); }
async function quota(env) {
	if (!env.MARGIN_KV) return null;
	let used = 0; try { used = +(await env.MARGIN_KV.get(dayKey())) || 0; } catch {}
	return { used: Math.round(used), limit: FACET_BUDGET, reset: nextReset() };
}
async function spend(env, n) {
	if (!env.MARGIN_KV || !(n > 0)) return;
	try { const k = dayKey(), used = +(await env.MARGIN_KV.get(k)) || 0; await env.MARGIN_KV.put(k, String(Math.round(used + n)), { expirationTtl: 172800 }); } catch {}
}

const PROMPT = `You design the screen of a personal finance app. The person asks something about their own current account in plain words; you answer with a SCREEN DESCRIPTION in JSON, never with prose and never with numbers. The app computes every number itself.

Data available: one current account, transactions from FROM to TODAY, in euros. Each transaction has a date, a merchant, a category and an amount (spending or money in).
Categories (use these ids only): home (rent, energy, insurance), groceries, dining (restaurants, cafes), transport, subscriptions (streaming, phone, internet, gym), leisure (cinema, books, outings, holidays), health, shopping (clothes, electronics). Money in (salary, refunds) is not a category: use measure "income".

A screen is {"title": "...", "blocks": [block, ...]}, 1 to 6 blocks, the most useful first. A block:
{"kind": "kpi"|"bar"|"line"|"donut"|"table", "title": "...", "measure": "spend"|"income"|"net"|"count"|"avg"|"avg_month", "by": "none"|"category"|"merchant"|"month"|"week"|"weekday"|"day"|"transaction", "period": PERIOD, "filter": {"categories": [...], "merchants": [...], "min": number, "max": number}, "compare": true|false, "limit": number}
- kpi: one big number (by "none"). compare true adds the change against the previous period of the same length.
- line: change over time (by month, week or day). bar: compare groups (category, merchant, weekday) or months. donut: share of a whole, by category or merchant only. table: a ranked list; by "transaction" lists the individual transactions, largest first.
- measure: spend = money out; income = money in; net = in minus out; count = number of purchases; avg = average purchase; avg_month = average spending per month over the period.
- PERIOD: {"preset": "this_month"|"last_month"|"last_3_months"|"last_6_months"|"last_12_months"|"this_year"|"all"} or {"from": "YYYY-MM", "to": "YYYY-MM"} for exact months. Default this_month. A trend needs at least last_6_months.
- filter: only what the person names. merchants must be copied exactly from the MERCHANTS list. min/max: amount of one transaction in euros.
Good screens: a vague question gets 2 or 3 kpi then 1 to 3 charts; a precise question gets exactly what answers it. Never repeat the same block.
Titles: short (under 7 words), in the OUTPUT LANGUAGE, no numbers, no amounts, no dates, no dashes (— or –).
If PREVIOUS SCREEN is given and the request changes it ("as bars", "only restaurants", "since January", "remove the table", "add ..."), return the FULL modified screen and keep everything else the same. If SELECTED is given, a change of chart type applies to that block.
If the request has nothing to do with this account's money, return {"title": "", "blocks": []}.
Reply with ONE JSON object and nothing else. JSON keys and ids stay in English.`;

const bad = (status, msg, extra) => new Response(JSON.stringify({ error: msg, ...extra }), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });

function parse(raw) {
	if (raw && typeof raw === "object") return raw;
	const txt = String(raw ?? "").replace(/```(?:json)?/gi, ""), a = txt.indexOf("{"), b = txt.lastIndexOf("}");
	if (a < 0 || b < a) return null;
	try { return JSON.parse(txt.slice(a, b + 1)); } catch { return null; }
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body; try { body = await request.json(); } catch { return bad(400, "bad_json"); }
	const req = String(body?.request || "").slice(0, 300).trim();
	if (!req) return bad(400, "empty");
	const q = await quota(env);
	if (q && q.used + COST > q.limit) return bad(429, "daily_limit", { quota: q });
	const merchants = (Array.isArray(body.merchants) ? body.merchants : []).slice(0, 60).map((m) => String(m).slice(0, 40));
	const prev = body.prev && typeof body.prev === "object" ? JSON.stringify(body.prev).slice(0, 3500) : "";
	const user = [
		`TODAY: ${String(body.today || "").slice(0, 10)}   FROM: ${String(body.from || "").slice(0, 10)}`,
		`OUTPUT LANGUAGE: ${LANG[body.lang] || "English"}`,
		`MERCHANTS: ${merchants.join(" | ")}`,
		prev ? `PREVIOUS SCREEN: ${prev}` : "",
		prev && Number.isInteger(body.sel) ? `SELECTED: block ${body.sel} (0 = first)` : "",
		`REQUEST: ${req}`,
	].filter(Boolean).join("\n");
	let r;
	try { r = await env.AI.run(MODEL, { messages: [{ role: "system", content: PROMPT }, { role: "user", content: user }], max_tokens: 900, temperature: 0.2 }); }
	catch (e) { return bad(502, "ai_error", { detail: String(e?.message || e).slice(0, 200) }); }
	const u = r?.usage || {}, n = (+u.prompt_tokens || (PROMPT.length + user.length) / 3.5) * RATE_IN + (+u.completion_tokens || String(r?.response ?? "").length / 3.5) * RATE_OUT;
	await spend(env, n);
	const spec = parse(r?.response);
	if (!spec) return bad(502, "unreadable");
	return new Response(JSON.stringify({ spec, model: MODEL, quota: q ? { ...q, used: Math.min(q.limit, Math.round(q.used + n)) } : null }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
}
export async function onRequestGet({ env }) {
	return new Response(JSON.stringify({ ok: true, ai: Boolean(env.AI), model: MODEL, quota: await quota(env) }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
}
export function onRequestOptions() { return new Response(null, { headers: CORS }); }
