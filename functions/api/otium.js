/**
 * Otium — trip-request understanding (Cloudflare Pages Function).
 *
 * POST /api/otium  { text: "Long weekend in Lisbon for two, 900 euros" }
 * → { intent: { city, nights, travelers, budget, interests, pace, missing, note } }
 *
 * POST /api/otium  { mode: "chat", messages: [{role, content}], context: {...}, lang }
 * → { reply, action }   (T-Bot, the in-app helper)
 * The helper only explains and suggests ONE action from a fixed list; the page
 * checks it and only ever opens the screen where the traveller decides.
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

// Open CORS: lets the standalone preview file (opened from disk) talk to the live model.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };

function bad(status, msg) {
	return new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json", ...CORS } });
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


const ACTIONS = ["none", "pending", "dates", "budget", "bags", "cancel", "trips", "pause", "retry", "new_trip", "human"];
const BOT = `You are T-Bot, the in-app helper of Otium, an AI travel agent. Otium is a portfolio demo: airlines (Aerolume, Skyra, Northwind), stays and prices are invented and nothing is ever really booked or charged.
Your job: answer the traveller's questions for real, like a friendly, expert travel agent. Two kinds of questions:
1) About this trip or the app (stuck, payment, dates, cancelling…): explain what is happening using TRIP CONTEXT and point to the right control.
2) General travel questions (what to see or eat at the destination, weather by season, neighbourhoods, getting around, packing, budget tips, local customs, documents in general terms): answer concretely from your general knowledge, with 2-4 specific tips. For visas, health or safety rules, give the general picture and say to check the official source before travelling.
How Otium works: the traveller describes a trip; Otium searches flights and stays, drafts the days, checks the budget cap, then STOPS and asks before paying (holding flights + stay) and before sharing traveller details with the airline. Every booking can be cancelled from the trip page (a non-refundable stay can't be recovered). The traveller can pause Otium, change dates, budget cap, travellers, cabin, bags in "What I understood", and find every plan in "My trips". A human travel team is reachable 24/7 by phone, chat or email from Help.
Rules:
- Reply in LANGUAGE. Max 110 words, plain text, no markdown. Short sentences; you may use "- " lines for tips.
- For this trip, use only facts from TRIP CONTEXT and the text above. Never invent prices, dates, availability, policies, bookings or features of Otium.
- You cannot pay, book, cancel or change anything yourself. Say what the traveller can do and where.
- If you can't solve it, or the traveller is upset, offer a person from the travel team.
- Questions unrelated to travel: say kindly in one sentence that you help with trips.
Then on a final separate line write exactly: ACTION: <one of ${ACTIONS.join(", ")}> — the single most useful button to show (pending = scroll to the card waiting for the traveller's decision; human = contact the travel team).`;

async function chat(body, env) {
	const LANG = { en: "English", fr: "French", es: "Spanish", it: "Italian", he: "Hebrew" }[body?.lang] || "English";
	const msgs = (Array.isArray(body?.messages) ? body.messages : [])
		.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
		.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
	if (!msgs.length || msgs[msgs.length - 1].role !== "user") return bad(400, "empty_request");
	const ctx = JSON.stringify(body?.context ?? {}).slice(0, 1500);
	const out = await env.AI.run(MODEL, {
		messages: [{ role: "system", content: `${BOT}\nLANGUAGE: ${LANG}\nTRIP CONTEXT (from the page, trust it): ${ctx}` }, ...msgs],
		max_tokens: 380,
		temperature: 0.4,
	});
	let text = String(out?.response ?? "").trim();
	let action = "none";
	const m = text.match(/\n?\s*ACTION:\s*([a-z_]+)\s*$/i);
	if (m) { action = m[1].toLowerCase(); text = text.slice(0, m.index).trim(); }
	if (!ACTIONS.includes(action)) action = "none";
	text = text.replace(/[*#`]/g, "").slice(0, 900);
	if (!text) return bad(502, "empty_reply");
	return new Response(JSON.stringify({ reply: text, action: action === "none" ? null : action, model: MODEL }), {
		headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
	});
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body;
	try { body = await request.json(); } catch { return bad(400, "invalid_json"); }
	if (body?.mode === "chat") { try { return await chat(body, env); } catch { return bad(502, "model_error"); } }
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
			headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
		});
	} catch (e) {
		return bad(502, "model_error");
	}
}

// GET /api/otium → health check.
export function onRequestGet({ env }) {
	return new Response(JSON.stringify({ ok: true, ai: Boolean(env.AI), model: MODEL }), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
}

export function onRequestOptions() {
	return new Response(null, { status: 204, headers: { ...CORS, "access-control-max-age": "86400" } });
}

export function onRequest() {
	return bad(405, "method_not_allowed");
}
