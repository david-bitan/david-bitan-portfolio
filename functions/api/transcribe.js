/**
 * APEX Coach — voice to text (Cloudflare Pages Function).
 * POST /api/transcribe with a WAV body (16 kHz mono, max ~60 s).
 * Uses the same Workers AI binding `AI` as /api/coach.
 */
const MAX_BYTES = 2_500_000;
// Whisper invents these on silence or noise: never pass them on as the user's words.
const HALLUCINATIONS = /(thank(s| you) (very much )?for (watching|joining|listening)|see you in the next video|subtitles? by|sous-titr|amara\.org|please subscribe|merci d'avoir regard)/i;

function json(status, body) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

function toBase64(bytes) {
	let s = "";
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
	return btoa(s);
}

function clean(text) {
	let t = String(text || "").replace(/\s+/g, " ").trim();
	// collapse a sentence repeated in a loop
	const parts = t.split(/(?<=[.!?])\s+/);
	const out = [];
	for (const p of parts) if (!out.length || out[out.length - 1].toLowerCase() !== p.toLowerCase()) out.push(p);
	t = out.join(" ");
	if (HALLUCINATIONS.test(t) || /^(you|thank you|merci|\.|…)?[.!]?$/i.test(t)) return "";
	return t;
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return json(503, { error: "ai_not_configured" });
	const bytes = new Uint8Array(await request.arrayBuffer());
	if (!bytes.byteLength) return json(400, { error: "empty_audio" });
	if (bytes.byteLength > MAX_BYTES) return json(413, { error: "audio_too_long" });
	const lang = (new URL(request.url).searchParams.get("lang") || "").slice(0, 2).toLowerCase();
	let text = "";
	try {
		const input = { audio: toBase64(bytes), task: "transcribe", vad_filter: true };
		// Language is auto-detected: people often speak French or Hebrew in an English browser.
		void lang;
		const out = await env.AI.run("@cf/openai/whisper-large-v3-turbo", input);
		text = out && out.text;
	} catch (e) {
		try {
			const out = await env.AI.run("@cf/openai/whisper", { audio: [...bytes] });
			text = out && out.text;
		} catch (e2) {
			return json(502, { error: "model_error" });
		}
	}
	const t = clean(text);
	return t ? json(200, { text: t }) : json(422, { error: "no_speech" });
}

export function onRequest() {
	return json(405, { error: "method_not_allowed" });
}
