/**
 * APEX Coach — real AI answers (Cloudflare Pages Function).
 *
 * POST /api/coach  { messages: [{role, content}], context: {...} }
 * Streams the model answer back as Server-Sent Events.
 *
 * Needs a Workers AI binding named `AI` on the Pages project
 * (Settings → Bindings → Add → Workers AI → Variable name: AI).
 * Without it the endpoint answers 503 and the chat falls back to
 * its scripted replies.
 */

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_TURNS = 10;
const MAX_CHARS = 1200;

const CLUB = `APEX Athletic Club — private gym on Ocean Drive (between 12th & 13th), Miami Beach.
Hours: Mon–Thu 05:30–23:00, Fri 05:30–22:00, Sat 07:00–21:00, Sun 07:00–20:00.
Memberships (monthly, no contracts): Basic $149 (strength floor, sauna, group studios) · Signature $259 (full club + recovery wing 8×/month + dietitian quarterly review) · Elite $549 (personal training + club doctor + physio + weekly meal plan).
Spaces: The Strength Floor, Group Studios (Studio One, The Cage, The Loft), Recovery Wing (sauna, jacuzzi, cold plunge), lap pool.
Classes: Strength (The Cage, intermediate), Conditioning (The Loft, all levels), Boxing (Studio One, intermediate), Yoga & Pilates (Studio One, beginner-friendly), Recovery (all levels). Book on the Classes page.
Team: Marcus Reyes (head strength coach, Barbell 101 clinic on Tuesdays) · Dr. Lena Okafor (sports medicine physician) · Priya Menon (registered dietitian, sunrise yoga) · Diego Vasquez (head boxing coach, beginners welcome at 9 am) · Kai Nakamura (physiotherapist) · Sofia Rossi (coach).
In the member area: calorie & macro calculator, weekly meals, class and personal-training booking, and Coach's program builder (training + meals for 1–4 weeks, PDF with workout log).`;

function systemPrompt(ctx) {
	const lines = [];
	if (ctx && typeof ctx === "object") {
		if (ctx.name) lines.push(`Name: ${ctx.name}`);
		lines.push(`Membership: ${ctx.tier || "not a member (guest)"}`);
		if (ctx.profile) {
			const p = ctx.profile;
			lines.push(`Profile from the calculator: ${[p.sex, p.age && `${p.age} y`, p.height && `${p.height} cm`, p.weight && `${p.weight} kg`, p.activity && `activity ${p.activity}`, p.goal && `goal ${p.goal}`].filter(Boolean).join(", ")}`);
		}
		if (ctx.diet) lines.push(`Food preferences (always respect them in any food suggestion): ${String(ctx.diet).slice(0, 200)}`);
		if (ctx.metrics) {
			const m = ctx.metrics;
			lines.push(`Computed (trust these numbers, do not recompute): ${Object.entries(m).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
		}
	}
	return `You are APEX Coach, the AI assistant of APEX Athletic Club. You are a knowledgeable, warm, direct strength & conditioning coach and sports-nutrition guide.

SCOPE — answer fully and concretely: training (strength, hypertrophy, fat loss, cardio, HIIT, mobility, technique cues, programming, sets/reps, progressive overload, deloads, warm-ups), nutrition (calories, macros, protein, meal ideas, timing, supplements with good evidence like creatine and caffeine), body metrics (BMI, body-fat estimates, BMR/TDEE, ideal weight ranges, waist-to-height ratio), hydration, sleep and recovery, motivation and habits, and anything about the club.
Useful formulas: BMI = kg / m². BMR (Mifflin-St Jeor) = 10·kg + 6.25·cm − 5·age + 5 (men) or −161 (women); TDEE = BMR × activity (1.2–1.9). Body fat (US Navy): men 495/(1.0324 − 0.19077·log10(waist−neck) + 0.15456·log10(height)) − 450; women uses waist+hip−neck with 1.29579, 0.35004, 0.22100. Protein 1.6–2.2 g/kg. Water ≈ 35 ml/kg/day + 0.5–0.75 L per hour of training. Fat loss: deficit 15–25%. Muscle gain: surplus 5–10%.
If you need a number you don't have (weight, height, waist, neck…), ask for it in one short question, then compute and show the result with the formula in one line.

STYLE — reply in the user's language. Be specific: give numbers, exercises, sets × reps, portions, examples. Short paragraphs or bullet lists ("- "), **bold** for key numbers. 60–220 words unless the user asks for more. No preamble, no disclaimers paragraph.

SAFETY — you are not a doctor. Never diagnose or treat pain, injuries, illness, medication, pregnancy or eating disorders: say so in one sentence and point to Dr. Lena Okafor (sports medicine) or Kai Nakamura (physio), and to emergency services for chest pain, fainting or breathing trouble. If someone describes restrictive eating, extreme deficits (< 1,200 kcal) or rapid weight-loss goals, respond with care and suggest Priya Menon (dietitian) or a health professional; don't provide the extreme plan. For under-18s keep advice conservative and suggest a parent and a coach. Never invent club facts beyond the club info below; if unsure, say so.
OFF-TOPIC — for things unrelated to fitness, health habits, nutrition or the club, say kindly that you only coach on those, in one sentence.
BILLING — you can explain plans but never change a membership; point to "My Space → Change plan".

CLUB INFO
${CLUB}

MEMBER CONTEXT
${lines.join("\n") || "Unknown visitor."}`;
}

function bad(status, msg) {
	return new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
	if (!env.AI) return bad(503, "ai_not_configured");
	let body;
	try { body = await request.json(); } catch { return bad(400, "invalid_json"); }
	const raw = Array.isArray(body && body.messages) ? body.messages : [];
	const messages = raw
		.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
		.slice(-MAX_TURNS)
		.map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
	if (!messages.length || messages[messages.length - 1].role !== "user") return bad(400, "no_user_message");

	try {
		const stream = await env.AI.run(MODEL, {
			messages: [{ role: "system", content: systemPrompt(body.context) }, ...messages],
			max_tokens: 700,
			temperature: 0.5,
			stream: true
		});
		return new Response(stream, {
			headers: { "content-type": "text/event-stream", "cache-control": "no-store" }
		});
	} catch (e) {
		return bad(502, "model_error");
	}
}

// GET /api/coach → health check: tells whether the Workers AI binding is connected.
export function onRequestGet({ env }) {
	return new Response(JSON.stringify({ ok: true, ai: Boolean(env.AI), model: MODEL }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export function onRequest() {
	return bad(405, "method_not_allowed");
}
