/* Daily AI budget shared by the demos (not a route: files under _lib are only imported).
 * Workers AI's free plan gives this account 10,000 neurons a day (reset 00:00 UTC), for every demo together.
 * Each demo keeps under its own cap, so the total can never reach the free limit:
 *   Margin 3,000 · Facet 1,500 · Otium 1,500 · APEX Coach 1,000 · insurance site (to come) 1,500 · margin of safety 1,500.
 * Counted in the KV namespace bound as MARGIN_KV, one key per demo and per day. */
export const RATE_IN = 26668 / 1e6, RATE_OUT = 204805 / 1e6; // neurons per token, Llama 3.3 70B fp8-fast
const day = () => new Date().toISOString().slice(0, 10);
export function nextReset() { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toISOString(); }
export function budget(env, name, limit) {
	const key = `${name}:used:${day()}`, kv = env.MARGIN_KV;
	return {
		async quota() { if (!kv) return null; let used = 0; try { used = +(await kv.get(key)) || 0; } catch {} return { used: Math.round(used), limit, reset: nextReset() }; },
		async spend(n) { if (!kv || !(n > 0)) return; try { const used = +(await kv.get(key)) || 0; await kv.put(key, String(Math.round(used + n)), { expirationTtl: 172800 }); } catch {} },
	};
}
export const neurons = (r, promptChars, outFallback = 0) => { const u = r?.usage || {}; return (+u.prompt_tokens || promptChars / 3.5) * RATE_IN + (+u.completion_tokens || outFallback || String(r?.response ?? "").length / 3.5) * RATE_OUT; };
export function limitResponse(q, cors = {}) { return new Response(JSON.stringify({ error: "daily_limit", quota: q }), { status: 429, headers: { "content-type": "application/json", "cache-control": "no-store", ...cors } }); }
