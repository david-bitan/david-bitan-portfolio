/**
 * APEX Coach — voice to text (Cloudflare Pages Function).
 * POST /api/transcribe with a WAV body (16 kHz mono, max ~60 s).
 * Uses the same Workers AI binding `AI` as /api/coach.
 */
const MAX_BYTES = 2_500_000;

function json(status, body) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return json(503, { error: "ai_not_configured" });
	const buf = await request.arrayBuffer();
	if (!buf.byteLength) return json(400, { error: "empty_audio" });
	if (buf.byteLength > MAX_BYTES) return json(413, { error: "audio_too_long" });
	try {
		const out = await env.AI.run("@cf/openai/whisper", { audio: [...new Uint8Array(buf)] });
		return json(200, { text: (out && out.text ? String(out.text) : "").trim() });
	} catch (e) {
		return json(502, { error: "model_error" });
	}
}

export function onRequest() {
	return json(405, { error: "method_not_allowed" });
}
