/**
 * Margin — POST /api/margin
 * The page reads the document itself and sends only passages: [{ id: "c12", page, text }].
 * Modes:
 *   ask       { question, lang, passages } → { found, answer: [{ text, cite: ["c3"] }] }
 *   summary   { lang, passages }           → { favour: [...], obligations: [...], watch: [...] }
 *   simple    { lang, passages }           → { points: [...] }
 *   translate { lang, text }               → { translation }
 * Every sentence must cite the passage ids it relies on. Unknown ids are dropped here; the page then
 * re-checks every id and every number before showing anything. Nothing is stored.
 * Same Workers AI binding ("AI") as /api/otium and /api/coach.
 */
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };
const LANG = { en: "English", fr: "French", es: "Spanish", pt: "Portuguese", de: "German", it: "Italian", ru: "Russian", tr: "Turkish", id: "Indonesian", he: "Hebrew" };

const BASE = `You help people understand a document they received (a handbook, a contract, a letter). You only use the PASSAGES given, each with an id like "c4".
Rules:
- Every sentence must be fully supported by the passages it cites. Put the ids it relies on in "cite", never in "text" (no "cite", no "c4" inside the sentence).
- Never use outside knowledge, never guess, never give legal or medical advice.
- Keep the same numbers, amounts, dates and durations as in the passage, written with digits, but format them the way the OUTPUT LANGUAGE does (68,000 € is "68 000 €" in French and Russian, "68.000 €" in German, Spanish, Italian, Portuguese, Turkish and Indonesian; 9.99 is "9,99" in those languages). Never drop the thousands.
- Short, plain sentences. Address the reader as "you". No markdown. No dashes (— or –) between words: use a comma, a colon or a full stop.
- Write in the OUTPUT LANGUAGE, even if the document is in another language.
Reply with ONE JSON object and nothing else. The JSON keys stay in English exactly as shown, whatever the output language.`;

const MODES = {
	report: { tokens: 2300, prompt: `${BASE}
Task: help the reader understand the document at once, without them asking anything. Five groups:
- "short": 2 to 4 very simple sentences saying what the document is and what it means for the reader, in everyday words (no jargon);
- "favour": rights, benefits and protections in the reader's favour;
- "against": what could work against the reader (things they lose, pay, give up, or rights the other side keeps). Prefer concrete, costly or unusual clauses (penalties, fines, deductions, unpaid extra work, one-sided changes, monitoring, restrictions after leaving) over generic ones, and give the amount when there is one;
- "watch": deadlines, conditions, limits or steps the reader must not miss, with the exact delay or date;
- "facts": the key dates, amounts, durations and numbers. Each item has "value" (the number as in the document, with its unit, for example "€68,000" or "2 months") and "text" (one plain sentence saying what this number means for the reader, for example "Your yearly salary before tax, paid in 12 monthly parts.").
Format: {"short": [{"text": "...", "cite": ["c1"]}], "favour": [...], "against": [...], "watch": [...], "facts": [{"value": "...", "text": "...", "cite": ["c2"]}]}
2 to 4 items per group (facts up to 5), the most important first, each under 30 words. An empty group is fine. Each item must cite the passage that contains its numbers.` },
	ask: { tokens: 600, prompt: `${BASE}
Task: answer the QUESTION. It may follow up on the SUMMARY or the EARLIER ANSWERS shown to the reader: use them to understand what the question refers to, but cite only passages.
Format: {"found": true|false, "answer": [{"text": "one sentence", "cite": ["c1"]}]}
If the passages do not answer it, reply {"found": false, "answer": []}. If they answer part of it, answer only that part. 1 to 4 sentences.` },
	summary: { tokens: 1600, prompt: `${BASE}
Task: pick out what matters most for the reader, in three groups:
- "favour": rights, benefits and protections in the reader's favour;
- "obligations": what the reader must do;
- "watch": deadlines, limits, costs, penalties or conditions that could go against the reader.
Format: {"favour": [{"text": "...", "cite": ["c1"]}], "obligations": [...], "watch": [...]}
2 to 4 items per group, the most important first, each under 30 words. An empty group is fine.` },
	simple: { tokens: 1400, prompt: `${BASE}
Task: explain the main points of the document in everyday words, for someone who finds this kind of text hard to read. Replace jargon with simple words.
Format: {"points": [{"text": "one simple sentence", "cite": ["c1"]}]}
4 to 8 points, in the order of the document.` },
};

function bad(status, msg, detail) {
	return new Response(JSON.stringify(detail ? { error: msg, detail } : { error: msg }), { status, headers: { "content-type": "application/json", ...CORS } });
}
const ok = (obj) => new Response(JSON.stringify({ ...obj, model: MODEL }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });

// The model may answer with an object, with JSON text, inside ``` fences, or cut off.
function parse(raw) {
	if (raw && typeof raw === "object") return raw;
	const txt = String(raw ?? "").replace(/```(?:json)?/gi, "");
	const start = txt.indexOf("{"); if (start < 0) return null;
	const body = txt.slice(start);
	try { return JSON.parse(body.slice(0, body.lastIndexOf("}") + 1)); } catch {}
	const fixed = repair(body); if (fixed) return fixed;
	const items = [...body.matchAll(/\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"cite"\s*:\s*\[([^\]]*)\]\s*\}/g)]
		.map((m) => ({ text: JSON.parse(`"${m[1]}"`), cite: [...m[2].matchAll(/"(c\d+)"/g)].map((x) => x[1]) }));
	if (items.length) return { found: true, answer: items, points: items };
	if (/"found"\s*:\s*false/.test(body)) return { found: false, answer: [] };
	return null;
}
// A cut-off answer: keep everything up to the last complete item, then close the open brackets.
function repair(body) {
	for (let end = body.lastIndexOf("}"); end > 0; end = body.lastIndexOf("}", end - 1)) {
		let s = body.slice(0, end + 1), stack = [], str = false, escp = false;
		for (const ch of s) { if (escp) { escp = false; continue; } if (ch === "\\") { escp = true; continue; } if (ch === '"') { str = !str; continue; } if (str) continue; if (ch === "{" || ch === "[") stack.push(ch); else if (ch === "}" || ch === "]") stack.pop(); }
		if (str) continue;
		s += stack.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
		try { return JSON.parse(s); } catch {}
	}
	return null;
}
// The model sometimes translates the keys: accept the usual variants.
const ALIAS = { short: ["short", "in_short", "en_bref", "summary", "résumé", "בקצרה"], against: ["against", "against_you", "contre_vous", "défaveur", "en_votre_défaveur", "נגדך", "נגדכם", "cons"], facts: ["facts", "key_facts", "key_dates", "chiffres", "dates", "עובדות", "מספרים"], favour: ["favour", "favor", "in_your_favour", "faveur", "en_votre_faveur", "pour_vous", "לטובתך", "benefits", "rights"], obligations: ["obligations", "obligation", "vos_obligations", "devoirs", "חובות", "duties"], watch: ["watch", "watch_out", "a_surveiller", "à_surveiller", "surveiller", "attention", "risques", "שימו_לב", "שים_לב", "risks"] };
const context = (b) => {
	const rep = typeof b?.report === "string" && b.report.trim() ? `\n\nSUMMARY ALREADY SHOWN TO THE READER:\n${b.report.slice(0, 2500)}` : "";
	const h = (Array.isArray(b?.history) ? b.history : []).slice(-3).filter((x) => x && typeof x.q === "string").map((x) => `Q: ${x.q.slice(0, 300)}\nA: ${String(x.a || "").slice(0, 600)}`).join("\n");
	return rep + (h ? `\n\nEARLIER ANSWERS:\n${h}` : "");
};
const pick = (obj, key) => { const norm = (k) => String(k).toLowerCase().replace(/[\s-]+/g, "_"); for (const [k, v] of Object.entries(obj || {})) if (ALIAS[key].includes(norm(k))) return v; return obj?.[key]; };
const clean = (arr, ids) => (Array.isArray(arr) ? arr : []).slice(0, 8)
	.map((s) => ({ ...(s?.value ? { value: String(s.value).replace(/[*#`]/g, "").trim().slice(0, 60) } : {}), text: String(s?.text || "").replace(/[*#`]/g, "").trim().slice(0, 500), cite: (Array.isArray(s?.cite) ? s.cite : [s?.cite]).map(String).filter((id) => ids.includes(id)) }))
	.filter((s) => s.text);

/* Daily budget. Workers AI gives this account 10,000 free "neurons" a day, shared by every demo (Margin, Otium, APEX Coach)
 * and reset at 00:00 UTC. Margin keeps itself under MARGIN_BUDGET, counted in a KV namespace bound as MARGIN_KV.
 * Without that binding, Margin still works; it just can't show what's left. */
const MARGIN_BUDGET = 6000;
const COST = { report: 500, ask: 300, summary: 450, simple: 400, translate: 80, transcribe: 60 };
const RATE_IN = 26668 / 1e6, RATE_OUT = 204805 / 1e6, WHISPER_PER_MIN = 46.63;
const dayKey = () => "used:" + new Date().toISOString().slice(0, 10);
function nextReset() { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toISOString(); }
async function quota(env) {
	if (!env.MARGIN_KV) return null;
	let used = 0; try { used = +(await env.MARGIN_KV.get(dayKey())) || 0; } catch {}
	return { used: Math.round(used), limit: MARGIN_BUDGET, reset: nextReset() };
}
async function spend(env, n) {
	if (!env.MARGIN_KV || !(n > 0)) return;
	try { const k = dayKey(), used = +(await env.MARGIN_KV.get(k)) || 0; await env.MARGIN_KV.put(k, String(Math.round(used + n)), { expirationTtl: 172800 }); } catch {}
}
const neurons = (r, promptChars) => { const u = r?.usage || {}; const pin = +u.prompt_tokens || promptChars / 3.5, pout = +u.completion_tokens || String(r?.response ?? "").length / 3.5; return pin * RATE_IN + pout * RATE_OUT; };

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body;
	try { body = await request.json(); } catch { return bad(400, "invalid_json"); }
	if (body?.mode === "fetch") return fetchPage(body.url);
	const q = await quota(env), cost = COST[body?.mode] || COST.ask;
	if (q && q.used + cost > q.limit) return new Response(JSON.stringify({ error: "daily_limit", quota: q }), { status: 429, headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
	const meter = { n: 0 };
	const res = await handle(body, env, meter);
	if (!q) return res;
	await spend(env, meter.n);
	let j = {}; try { j = await res.clone().json(); } catch { return res; }
	j.quota = { ...q, used: Math.min(q.limit, Math.round(q.used + meter.n)) };
	return new Response(JSON.stringify(j), { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
}
async function handle(body, env, meter) {
	if (body?.mode === "transcribe") return transcribe(env, body.audio, meter);
	const out = LANG[body?.lang] || "English";
	let stage = "run";
	try {
		if (body?.mode === "translate") {
			const text = String(body.text || "").slice(0, 1500); if (!text.trim()) return bad(400, "empty_request");
			const r = await env.AI.run(MODEL, { messages: [
				{ role: "system", content: `Translate the user's text into ${out}. Keep numbers, amounts, dates and names exactly. Reply with the translation only, nothing else.` },
				{ role: "user", content: text },
			], max_tokens: 700, temperature: 0.1 });
			meter.n += neurons(r, text.length + 200);
			return ok({ translation: String(r?.response ?? "").trim().slice(0, 2500) });
		}
		const mode = MODES[body?.mode] ? body.mode : "ask";
		const passages = (Array.isArray(body?.passages) ? body.passages : []).slice(0, 80)
			.filter((p) => p && /^c\d{1,4}$/.test(p.id) && typeof p.text === "string")
			.map((p) => ({ id: p.id, page: Number.isFinite(+p.page) && p.page ? +p.page : undefined, doc: typeof p.doc === "string" ? p.doc.slice(0, 80) : undefined, text: p.text.slice(0, 900) }));
		let total = 0; const kept = passages.filter((p) => (total += p.text.length) <= 24000);
		const question = typeof body?.question === "string" ? body.question.trim().slice(0, 300) : "";
		if (!kept.length || (mode === "ask" && !question)) return bad(400, "empty_request");
		const ids = kept.map((p) => p.id);
		const r = await env.AI.run(MODEL, {
			messages: [
				{ role: "system", content: `${MODES[mode].prompt}\nOUTPUT LANGUAGE: ${out}` },
				{ role: "user", content: `PASSAGES:\n${kept.map((p) => `[${p.id}${p.doc ? `, ${p.doc}` : ""}${p.page ? `, page ${p.page}` : ""}] ${p.text}`).join("\n")}${mode === "ask" ? `${context(body)}\n\nQUESTION: ${question}` : ""}\n\nWrite every \"text\" in ${out}, even if the question or the document is in another language.` },
			],
			max_tokens: MODES[mode].tokens,
			temperature: 0.1,
		});
		meter.n += neurons(r, total + 2500);
		stage = "parse";
		const obj = parse(r?.response);
		if (!obj) return bad(502, "unparsable", String(typeof r?.response === "string" ? r.response : JSON.stringify(r?.response)).slice(0, 300));
		if (mode === "report") { const keys = ["short", "favour", "against", "watch", "facts"], out = {}; for (const k of keys) out[k] = clean(pick(obj, k), ids); if (keys.every((k) => !out[k].length)) out.debug = String(typeof r?.response === "string" ? r.response : JSON.stringify(r?.response)).slice(0, 300); return ok(out); }
		if (mode === "summary") { const src = obj.summary && typeof obj.summary === "object" ? obj.summary : obj; return ok({ favour: clean(pick(src, "favour"), ids), obligations: clean(pick(src, "obligations"), ids), watch: clean(pick(src, "watch"), ids), ...(["favour", "obligations", "watch"].every((k) => !(pick(src, k) || []).length) ? { debug: String(typeof r?.response === "string" ? r.response : JSON.stringify(r?.response)).slice(0, 300) } : {}) }); }
		if (mode === "simple") return ok({ points: clean(obj.points || obj.answer, ids) });
		const answer = clean(obj.answer, ids);
		return ok({ found: obj.found !== false && answer.length > 0, answer });
	} catch (e) {
		return bad(502, "model_error", `${stage}: ${String(e?.message || e).slice(0, 200)}`);
	}
}

/* A link: read the page server-side (the browser can't read other sites), return its text as paragraphs.
 * Guards: http(s) only, standard ports, no local or private hosts, 2 MB max, 8 s max. PDFs are passed through. */
const PRIVATE = /^(localhost|.*\.local|.*\.internal|.*\.localhost)$|^(0|10|127)\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^\[?(::1|f[cd][0-9a-f]{2}:|fe80:)/i;
async function fetchPage(raw) {
	let u; try { u = new URL(String(raw || "")); } catch { return bad(400, "bad_url"); }
	if (!/^https?:$/.test(u.protocol) || (u.port && !["80", "443"].includes(u.port)) || PRIVATE.test(u.hostname) || u.username || u.password) return bad(400, "bad_url");
	const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
	try {
		const r = await fetch(u.href, { redirect: "follow", signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MarginDemo/1.0; portfolio demo)", accept: "text/html,application/pdf;q=0.9,text/plain;q=0.8" } });
		if (!r.ok) return bad(502, "fetch_failed", String(r.status));
		const type = r.headers.get("content-type") || "", len = +(r.headers.get("content-length") || 0);
		if (len > 2_000_000 * 5) return bad(413, "too_large");
		if (type.includes("pdf")) { const buf = await r.arrayBuffer(); if (buf.byteLength > 10_000_000) return bad(413, "too_large"); return new Response(buf, { headers: { "content-type": "application/pdf", ...CORS } }); }
		let html = await r.text(); if (html.length > 2_000_000) html = html.slice(0, 2_000_000);
		const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 120);
		const main = html.match(/<(main|article)[\s>][\s\S]*?<\/\1>/i)?.[0] || html;
		const txt = main
			.replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe|template)[\s\S]*?<\/\1>/gi, " ")
			.replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/section|\/article|li|h\d)[^>]*>/gi, "\n")
			.replace(/<[^>]+>/g, " ")
			.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;/g, "’").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
		const paragraphs = txt.split(/\n+/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 1).slice(0, 1500);
		let total = 0; const kept = paragraphs.filter((p) => (total += p.length) <= 60000);
		return new Response(JSON.stringify({ title, paragraphs: kept }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
	} catch { return bad(502, "fetch_failed"); } finally { clearTimeout(to); }
}

// GET /api/margin → health check.
export async function onRequestGet({ env }) {
	return new Response(JSON.stringify({ ok: true, ai: Boolean(env.AI), model: MODEL, quota: await quota(env) }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
}
export function onRequestOptions() {
	return new Response(null, { status: 204, headers: { ...CORS, "access-control-max-age": "86400" } });
}
export function onRequest() {
	return bad(405, "method_not_allowed");
}

/* Voice → text: a short WAV recorded in the reader's browser, read once by Whisper (OpenAI, MIT licence) on Workers AI. Nothing is kept. */
const WHISPER = "@cf/openai/whisper-large-v3-turbo";
async function transcribe(env, audio, meter) {
	if (typeof audio !== "string" || audio.length < 1000) return bad(400, "empty_audio");
	if (audio.length > 3500000) return bad(413, "audio_too_long");
	try {
		const r = await env.AI.run(WHISPER, { audio });
		meter.n += Math.max(0.1, (audio.length * 0.75) / 32000 / 60) * WHISPER_PER_MIN;
		return ok({ text: String(r?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 600), model: WHISPER });
	} catch (e) {
		return bad(502, "transcribe_error", String(e?.message || e).slice(0, 200));
	}
}
