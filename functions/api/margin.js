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
const LANG = { en: "English", fr: "French", he: "Hebrew" };

const BASE = `You help people understand a document they received (a handbook, a contract, a letter). You only use the PASSAGES given, each with an id like "c4".
Rules:
- Every sentence must be fully supported by the passages it cites. Put the ids it relies on in "cite".
- Never use outside knowledge, never guess, never give legal or medical advice.
- Keep numbers, amounts, dates and durations exactly as in the passage, written with digits.
- Short, plain sentences. Address the reader as "you". No markdown.
- Write in the OUTPUT LANGUAGE, even if the document is in another language.
Reply with ONE JSON object and nothing else. The JSON keys stay in English exactly as shown, whatever the output language.`;

const MODES = {
	ask: { tokens: 600, prompt: `${BASE}
Task: answer the QUESTION.
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
const ALIAS = { favour: ["favour", "favor", "in_your_favour", "faveur", "en_votre_faveur", "pour_vous", "לטובתך", "benefits", "rights"], obligations: ["obligations", "obligation", "vos_obligations", "devoirs", "חובות", "duties"], watch: ["watch", "watch_out", "a_surveiller", "à_surveiller", "surveiller", "attention", "risques", "שימו_לב", "שים_לב", "risks"] };
const pick = (obj, key) => { const norm = (k) => String(k).toLowerCase().replace(/[\s-]+/g, "_"); for (const [k, v] of Object.entries(obj || {})) if (ALIAS[key].includes(norm(k))) return v; return obj?.[key]; };
const clean = (arr, ids) => (Array.isArray(arr) ? arr : []).slice(0, 8)
	.map((s) => ({ text: String(s?.text || "").replace(/[*#`]/g, "").trim().slice(0, 500), cite: (Array.isArray(s?.cite) ? s.cite : [s?.cite]).map(String).filter((id) => ids.includes(id)) }))
	.filter((s) => s.text);

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body;
	try { body = await request.json(); } catch { return bad(400, "invalid_json"); }
	const out = LANG[body?.lang] || "English";
	let stage = "run";
	try {
		if (body?.mode === "translate") {
			const text = String(body.text || "").slice(0, 1500); if (!text.trim()) return bad(400, "empty_request");
			const r = await env.AI.run(MODEL, { messages: [
				{ role: "system", content: `Translate the user's text into ${out}. Keep numbers, amounts, dates and names exactly. Reply with the translation only, nothing else.` },
				{ role: "user", content: text },
			], max_tokens: 700, temperature: 0.1 });
			return ok({ translation: String(r?.response ?? "").trim().slice(0, 2500) });
		}
		const mode = MODES[body?.mode] ? body.mode : "ask";
		const passages = (Array.isArray(body?.passages) ? body.passages : []).slice(0, 80)
			.filter((p) => p && /^c\d{1,4}$/.test(p.id) && typeof p.text === "string")
			.map((p) => ({ id: p.id, page: Number.isFinite(+p.page) && p.page ? +p.page : undefined, text: p.text.slice(0, 900) }));
		let total = 0; const kept = passages.filter((p) => (total += p.text.length) <= 14000);
		const question = typeof body?.question === "string" ? body.question.trim().slice(0, 300) : "";
		if (!kept.length || (mode === "ask" && !question)) return bad(400, "empty_request");
		const ids = kept.map((p) => p.id);
		const r = await env.AI.run(MODEL, {
			messages: [
				{ role: "system", content: `${MODES[mode].prompt}\nOUTPUT LANGUAGE: ${out}` },
				{ role: "user", content: `PASSAGES:\n${kept.map((p) => `[${p.id}${p.page ? `, page ${p.page}` : ""}] ${p.text}`).join("\n")}${mode === "ask" ? `\n\nQUESTION: ${question}` : ""}` },
			],
			max_tokens: MODES[mode].tokens,
			temperature: 0.1,
		});
		stage = "parse";
		const obj = parse(r?.response);
		if (!obj) return bad(502, "unparsable", String(typeof r?.response === "string" ? r.response : JSON.stringify(r?.response)).slice(0, 300));
		if (mode === "summary") { const src = obj.summary && typeof obj.summary === "object" ? obj.summary : obj; return ok({ favour: clean(pick(src, "favour"), ids), obligations: clean(pick(src, "obligations"), ids), watch: clean(pick(src, "watch"), ids), ...(["favour", "obligations", "watch"].every((k) => !(pick(src, k) || []).length) ? { debug: String(typeof r?.response === "string" ? r.response : JSON.stringify(r?.response)).slice(0, 300) } : {}) }); }
		if (mode === "simple") return ok({ points: clean(obj.points || obj.answer, ids) });
		const answer = clean(obj.answer, ids);
		return ok({ found: obj.found !== false && answer.length > 0, answer });
	} catch (e) {
		return bad(502, "model_error", `${stage}: ${String(e?.message || e).slice(0, 200)}`);
	}
}

// GET /api/margin → health check.
export function onRequestGet({ env }) {
	return new Response(JSON.stringify({ ok: true, ai: Boolean(env.AI), model: MODEL }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
}
export function onRequestOptions() {
	return new Response(null, { status: 204, headers: { ...CORS, "access-control-max-age": "86400" } });
}
export function onRequest() {
	return bad(405, "method_not_allowed");
}
