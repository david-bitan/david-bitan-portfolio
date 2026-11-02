/**
 * Otium — trip-request understanding (Cloudflare Pages Function).
 *
 * POST /api/otium  { text: "Long weekend in Lisbon for two, 900 euros" }
 * → { intent: { city, nights, travelers, budget, interests, pace, missing, note } }
 *
 * The model only READS the request and returns structured fields. Prices,
 * plans and every action are computed in code on the page, never by the
 * model. Uses the same Workers AI binding `AI` as /api/coach. Without it the
 * endpoint answers 503 and the page falls back to its local parser.
 */

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CITIES = ["lisbon", "rome", "barcelona", "amsterdam", "athens", "copenhagen"];

const SYSTEM = `You read short travel requests and extract fields. Reply with ONE JSON object and nothing else.
Fields:
- "city": one of ${CITIES.join(", ")} if the user names or clearly implies it; "other" if they name a place outside this list; null if no place is given.
- "asked_place": the place the user typed, as written, or null.
- "nights": integer 1-28 or null. "a weekend" = 2, "long weekend" = 3, "a week" = 7, "two weeks" = 14, "a month" = 28.
- "travelers": integer 1-50 or null. "couple", "my partner and I", "for two" = 2. "solo", "alone" = 1.
- "budget": total budget in euros as an integer, or null. Convert "$" or "£" roughly to euros.
- "interests": up to 3 short lowercase words (e.g. "food", "museums", "beach", "nightlife", "nature", "design").
- "pace": "slow", "balanced" or "packed", default "balanced".
- "note": one short sentence (max 18 words) restating what you understood, addressed to the user ("You want..."), written in the language named in the LANGUAGE line.
Never invent a budget, a city or a number of travelers that the user did not give.`;

function bad(status, msg) {
	return new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
}

function clampInt(v, lo, hi) {
	const n = Math.round(Number(v));
	return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

function clean(raw) {
	const o = raw && typeof raw === "object" ? raw : {};
	const city = typeof o.city === "string" ? o.city.toLowerCase().trim() : null;
	return {
		city: CITIES.includes(city) ? city : city === "other" ? "other" : null,
		askedPlace: typeof o.asked_place === "string" ? o.asked_place.slice(0, 40) : null,
		nights: clampInt(o.nights, 1, 28),
		travelers: clampInt(o.travelers, 1, 50),
		budget: clampInt(o.budget, 50, 50000),
		interests: Array.isArray(o.interests) ? o.interests.filter((s) => typeof s === "string").slice(0, 3).map((s) => s.toLowerCase().slice(0, 16)) : [],
		pace: ["slow", "balanced", "packed"].includes(o.pace) ? o.pace : "balanced",
		note: typeof o.note === "string" ? o.note.slice(0, 160) : "",
	};
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body;
	try { body = await request.json(); } catch { return bad(400, "invalid_json"); }
	const text = typeof body?.text === "string" ? body.text.trim().slice(0, 400) : "";
	const LANG = { en: "English", fr: "French", es: "Spanish", it: "Italian", he: "Hebrew" }[body?.lang] || "English";
	if (!text) return bad(400, "empty_request");
	try {
		const out = await env.AI.run(MODEL, {
			messages: [{ role: "system", content: `${SYSTEM}\nLANGUAGE: ${LANG}` }, { role: "user", content: text }],
			max_tokens: 220,
			temperature: 0.1,
		});
		const s = String(out?.response ?? "");
		const m = s.match(/\{[\s\S]*\}/);
		if (!m) return bad(502, "unparsable");
		return new Response(JSON.stringify({ intent: clean(JSON.parse(m[0])), model: MODEL }), {
			headers: { "content-type": "application/json", "cache-control": "no-store" },
		});
	} catch (e) {
		return bad(502, "model_error");
	}
}

// GET /api/otium → health check.
export function onRequestGet({ env }) {
	return new Response(JSON.stringify({ ok: true, ai: Boolean(env.AI), model: MODEL }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export function onRequest() {
	return bad(405, "method_not_allowed");
}
