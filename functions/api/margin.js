/**
 * Margin — POST /api/margin
 * Body: { question, passages: [{ id, doc, section, updated, status, text }] } (max 8 passages, chosen by the page)
 * Reply: { found, answer: [{ text, cite: [ids] }], model }
 *
 * The model only writes sentences from the passages it is given, and tags each sentence with the ids it
 * relies on. This endpoint drops any id that was not sent; the page then re-checks every sentence
 * (ids and numbers) before showing it. Uses the same Workers AI binding ("AI") as /api/otium and /api/coach.
 */
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };

const SYSTEM = `You answer employees' questions using ONLY the handbook passages given to you. You are careful and plain-spoken.
Reply with ONE JSON object and nothing else:
{"found": true|false, "answer": [{"text": "one sentence", "cite": ["P1"]}]}
Rules:
- Every sentence must be fully supported by the passages it cites. Cite the passage ids (like "P3") that support it.
- Never use outside knowledge, never guess, never add advice that is not in the passages.
- Copy numbers, amounts, days and dates exactly as written in the passage.
- If the passages do not answer the question, reply {"found": false, "answer": []}. Partial coverage: answer only the covered part.
- Passages with status "superseded" are older versions. Base the answer on "current" passages; you may add one sentence saying what changed, citing both.
- 1 to 4 short sentences. Address the employee as "you". No markdown.`;

function bad(status, msg) {
	return new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json", ...CORS } });
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body;
	try { body = await request.json(); } catch { return bad(400, "invalid_json"); }
	const question = typeof body?.question === "string" ? body.question.trim().slice(0, 300) : "";
	const passages = (Array.isArray(body?.passages) ? body.passages : []).slice(0, 8)
		.filter((p) => p && /^P\d{1,3}$/.test(p.id) && typeof p.text === "string")
		.map((p) => ({ id: p.id, doc: String(p.doc || "").slice(0, 60), section: String(p.section || "").slice(0, 60), updated: String(p.updated || "").slice(0, 10), status: p.status === "superseded" ? "superseded" : "current", text: p.text.slice(0, 600) }));
	if (!question || !passages.length) return bad(400, "empty_request");
	const ids = passages.map((p) => p.id);
	try {
		const out = await env.AI.run(MODEL, {
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: `PASSAGES:\n${JSON.stringify(passages)}\n\nQUESTION: ${question}` },
			],
			max_tokens: 420,
			temperature: 0.1,
		});
		const raw = out?.response;
		let obj = raw && typeof raw === "object" ? raw : null;
		if (!obj) { const m = String(raw ?? "").match(/\{[\s\S]*\}/); if (!m) return bad(502, "unparsable"); obj = JSON.parse(m[0]); }
		const answer = (Array.isArray(obj.answer) ? obj.answer : []).slice(0, 5)
			.map((s) => ({ text: String(s?.text || "").replace(/[*#`]/g, "").trim().slice(0, 400), cite: (Array.isArray(s?.cite) ? s.cite : [s?.cite]).map(String).filter((id) => ids.includes(id)) }))
			.filter((s) => s.text);
		return new Response(JSON.stringify({ found: obj.found !== false && answer.length > 0, answer, model: MODEL }), {
			headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
		});
	} catch {
		return bad(502, "model_error");
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
