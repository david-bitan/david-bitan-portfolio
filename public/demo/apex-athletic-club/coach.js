/* ============================================================
   APEX Coach — AI assistant (simulated) for the member area.
   Self-contained: injects its own styles and markup.
   Responses are scripted locally (no model call) so every AI
   state can be shown on demand: thinking, streaming, clarifying
   question, structured answer, low confidence, safety refusal,
   out-of-scope, error + retry, stop, regenerate, feedback.
   ============================================================ */
(function () {
	"use strict";
	if (window.__apexCoach) return;
	window.__apexCoach = true;

	const BASE = "/demo/apex-athletic-club/";
	const TIERS = { Basic: 149, Signature: 259, Elite: 549 };
	const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* ---------- context from the page ---------- */
	function account() {
		try { return JSON.parse(localStorage.getItem("apex_account")) || {}; } catch (_) { return {}; }
	}
	function txt(id) { const el = document.getElementById(id); return el ? el.textContent.trim() : null; }
	function calc() {
		const kcal = txt("r-tdee");
		if (!kcal) return null;
		return { kcal, goal: txt("r-goal-label") || "maintain", p: txt("r-p-g"), c: txt("r-c-g"), f: txt("r-f-g") };
	}
	function firstName() { return (account().name || "there").split(" ")[0]; }
	function tier() { const t = account().tier; return TIERS[t] ? t : "Signature"; }

	/* ---------- styles ---------- */
	const css = `
	.cx-launch{position:fixed;right:24px;bottom:24px;z-index:900;display:flex;align-items:center;gap:10px;padding:14px 20px 14px 16px;border-radius:999px;border:1px solid rgba(245,245,247,.22);background:#14141C;color:#F5F5F7;font:600 13px/1 "Space Grotesk",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:border-color .2s,transform .2s}
	.cx-launch:hover{border-color:#FF2E7E;transform:translateY(-2px)}
	.cx-launch:focus-visible,.cx-panel button:focus-visible,.cx-panel textarea:focus-visible,.cx-panel a:focus-visible{outline:2px solid #00E5A0;outline-offset:2px}
	.cx-spark{width:22px;height:22px;border-radius:50%;background:conic-gradient(from 0deg,#FF2E7E,#00E5A0,#FF2E7E);display:grid;place-items:center}
	.cx-spark::after{content:"";width:10px;height:10px;border-radius:50%;background:#14141C}
	.cx-launch[aria-expanded="true"]{opacity:0;pointer-events:none}
	.cx-panel{position:fixed;right:24px;bottom:24px;z-index:901;width:min(420px,calc(100vw - 32px));height:min(680px,calc(100vh - 48px));display:flex;flex-direction:column;background:#0A0A0F;border:1px solid rgba(245,245,247,.16);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.6);color:#F5F5F7;font:400 14px/1.55 Inter,system-ui,sans-serif;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .22s,transform .22s}
	.cx-panel.open{opacity:1;transform:none;pointer-events:auto}
	.cx-head{display:flex;align-items:center;gap:12px;padding:16px 16px 14px 18px;border-bottom:1px solid rgba(245,245,247,.10)}
	.cx-title{font:700 16px/1.2 "Space Grotesk",Arial,sans-serif}
	.cx-badge{font:600 10px/1 "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#00E5A0;border:1px solid rgba(0,229,160,.4);border-radius:999px;padding:4px 7px;margin-left:6px;vertical-align:2px}
	.cx-sub{font-size:12px;color:rgba(245,245,247,.52);margin-top:3px}
	.cx-icon{margin-left:auto;width:36px;height:36px;border-radius:50%;border:1px solid rgba(245,245,247,.16);background:transparent;color:#F5F5F7;cursor:pointer;display:grid;place-items:center;flex:none}
	.cx-icon+.cx-icon{margin-left:0}
	.cx-icon:hover{border-color:rgba(245,245,247,.4)}
	.cx-ctx{display:flex;flex-wrap:wrap;gap:6px;padding:10px 18px;border-bottom:1px solid rgba(245,245,247,.06);font-size:11.5px;color:rgba(245,245,247,.6)}
	.cx-ctx span{background:#14141C;border:1px solid rgba(245,245,247,.10);border-radius:999px;padding:3px 9px}
	.cx-log{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:14px;overscroll-behavior:contain}
	.cx-msg{max-width:92%}
	.cx-user{align-self:flex-end;background:#FF2E7E;color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;max-width:82%;white-space:pre-wrap;word-wrap:break-word}
	.cx-bot{align-self:flex-start}
	.cx-bubble{background:#14141C;border:1px solid rgba(245,245,247,.08);border-radius:16px 16px 16px 4px;padding:12px 14px}
	.cx-bubble p{margin:0 0 8px}.cx-bubble p:last-child{margin:0}
	.cx-bubble ul{margin:6px 0 8px;padding-left:18px}.cx-bubble li{margin:2px 0}
	.cx-bubble strong{color:#fff}
	.cx-caret::after{content:"";display:inline-block;width:7px;height:14px;background:#00E5A0;margin-left:2px;vertical-align:-2px;animation:cxBlink 1s steps(2) infinite}
	@keyframes cxBlink{50%{opacity:0}}
	.cx-think{display:flex;align-items:center;gap:10px;color:rgba(245,245,247,.6);font-size:13px}
	.cx-dots{display:inline-flex;gap:4px}.cx-dots i{width:6px;height:6px;border-radius:50%;background:#00E5A0;animation:cxDot 1.2s infinite}
	.cx-dots i:nth-child(2){animation-delay:.15s}.cx-dots i:nth-child(3){animation-delay:.3s}
	@keyframes cxDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
	.cx-step{font-family:"JetBrains Mono",monospace;font-size:11.5px}
	.cx-card{margin-top:10px;border:1px solid rgba(245,245,247,.12);border-radius:12px;overflow:hidden}
	.cx-row{display:grid;grid-template-columns:56px 1fr auto;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid rgba(245,245,247,.06);font-size:13px}
	.cx-row:first-child{border-top:0}
	.cx-day{font:600 11px/1 "JetBrains Mono",monospace;color:#00E5A0;text-transform:uppercase}
	.cx-meta{color:rgba(245,245,247,.5);font-size:12px}
	.cx-row a{color:#FF2E7E;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap}
	.cx-row a:hover{text-decoration:underline}
	.cx-note{margin-top:10px;display:flex;gap:8px;padding:9px 11px;border-radius:10px;font-size:12.5px;background:rgba(255,176,32,.08);border:1px solid rgba(255,176,32,.3);color:#FFD27A}
	.cx-note.safe{background:rgba(0,229,160,.07);border-color:rgba(0,229,160,.3);color:#9FF5D6}
	.cx-note.err{background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.35);color:#FF9DC0}
	.cx-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
	.cx-chip{border:1px solid rgba(245,245,247,.22);background:transparent;color:#F5F5F7;border-radius:999px;padding:7px 12px;font:500 12.5px/1.2 Inter,sans-serif;cursor:pointer;text-align:left}
	.cx-chip:hover{border-color:#FF2E7E}
	.cx-chip.primary{background:#FF2E7E;border-color:#FF2E7E;color:#fff}
	.cx-acts{display:flex;align-items:center;gap:4px;margin-top:6px}
	.cx-act{border:0;background:transparent;color:rgba(245,245,247,.5);padding:5px 7px;border-radius:8px;font:500 11.5px/1 Inter,sans-serif;cursor:pointer;display:inline-flex;gap:5px;align-items:center}
	.cx-act:hover{color:#F5F5F7;background:#14141C}
	.cx-act[aria-pressed="true"]{color:#00E5A0}
	.cx-fb{margin-top:8px;font-size:12px;color:rgba(245,245,247,.6)}
	.cx-empty{text-align:left}
	.cx-empty h3{font:700 22px/1.2 "Space Grotesk",Arial,sans-serif;margin:6px 0 6px}
	.cx-empty p{color:rgba(245,245,247,.6);margin:0 0 14px;font-size:13.5px}
	.cx-foot{border-top:1px solid rgba(245,245,247,.10);padding:12px 14px 10px}
	.cx-form{display:flex;align-items:flex-end;gap:8px;background:#14141C;border:1px solid rgba(245,245,247,.14);border-radius:14px;padding:6px 6px 6px 12px}
	.cx-form:focus-within{border-color:rgba(245,245,247,.4)}
	.cx-form textarea{flex:1;resize:none;border:0;background:transparent;color:#F5F5F7;font:400 14px/1.45 Inter,sans-serif;max-height:110px;padding:7px 0;outline:none}
	.cx-form textarea::placeholder{color:rgba(245,245,247,.4)}
	.cx-send{width:38px;height:38px;border-radius:10px;border:0;background:#FF2E7E;color:#fff;cursor:pointer;display:grid;place-items:center;flex:none}
	.cx-send:disabled{background:#2a2a35;color:rgba(245,245,247,.35);cursor:not-allowed}
	.cx-send.stop{background:#F5F5F7;color:#0A0A0F}
	.cx-legal{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:11px;color:rgba(245,245,247,.4)}
	.cx-legal button{border:0;background:none;color:rgba(245,245,247,.5);font:inherit;cursor:pointer;text-decoration:underline;padding:0}
	.cx-sim{display:none;gap:6px;flex-wrap:wrap;margin-top:8px}
	.cx-sim.on{display:flex}
	.cx-sim .cx-chip{font-size:11.5px;padding:5px 10px}
	.cx-sim .cx-chip[aria-pressed="true"]{border-color:#00E5A0;color:#00E5A0}
	.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
	@media (max-width:560px){.cx-panel{right:0;left:0;bottom:0;width:100%;height:100dvh;border-radius:0;border:0}.cx-launch{right:16px;bottom:16px}}
	@media (prefers-reduced-motion:reduce){.cx-panel,.cx-launch{transition:none}.cx-dots i,.cx-caret::after{animation:none}}
	`;
	const style = document.createElement("style");
	style.textContent = css;
	document.head.appendChild(style);

	/* ---------- markup ---------- */
	const I = {
		send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
		stop: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
		close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
		reset: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
		copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
		regen: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
		up: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.5 8A2 2 0 0 1 18.5 21H7"/></svg>',
		down: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.5-8A2 2 0 0 1 5.5 3H17"/></svg>'
	};

	const launch = document.createElement("button");
	launch.className = "cx-launch";
	launch.type = "button";
	launch.setAttribute("aria-haspopup", "dialog");
	launch.setAttribute("aria-expanded", "false");
	launch.innerHTML = '<span class="cx-spark" aria-hidden="true"></span>Ask Coach';

	const panel = document.createElement("section");
	panel.className = "cx-panel";
	panel.setAttribute("role", "dialog");
	panel.setAttribute("aria-label", "APEX Coach assistant");
	panel.setAttribute("aria-hidden", "true");
	panel.innerHTML = `
		<header class="cx-head">
			<span class="cx-spark" aria-hidden="true"></span>
			<div>
				<div class="cx-title">APEX Coach <span class="cx-badge">AI · Beta</span></div>
				<div class="cx-sub">Training, nutrition and club questions</div>
			</div>
			<button type="button" class="cx-icon" data-reset aria-label="New conversation" title="New conversation">${I.reset}</button>
			<button type="button" class="cx-icon" data-close aria-label="Close assistant">${I.close}</button>
		</header>
		<div class="cx-ctx" aria-label="What Coach can see"></div>
		<div class="cx-log" aria-live="polite" aria-relevant="additions"></div>
		<div class="cx-foot">
			<form class="cx-form">
				<label class="sr-only" for="cx-input">Message APEX Coach</label>
				<textarea id="cx-input" rows="1" maxlength="400" placeholder="Ask about training, food or classes…"></textarea>
				<button type="submit" class="cx-send" aria-label="Send" disabled>${I.send}</button>
			</form>
			<div class="cx-legal">
				<span>Coach can be wrong. Not medical advice.</span>
				<button type="button" data-sim-toggle aria-expanded="false">Demo controls</button>
			</div>
			<div class="cx-sim" role="group" aria-label="Simulate a state">
				<button type="button" class="cx-chip" data-sim="error" aria-pressed="false">Next reply fails</button>
				<button type="button" class="cx-chip" data-sim="slow" aria-pressed="false">Slow network</button>
			</div>
		</div>`;
	document.body.append(launch, panel);

	const $ = (s) => panel.querySelector(s);
	const log = $(".cx-log"), input = $("#cx-input"), sendBtn = $(".cx-send"), form = $(".cx-form");
	const sim = { error: false, slow: false };

	/* ---------- context chips ---------- */
	function renderCtx() {
		const c = calc();
		const bits = [`${tier()} member`, c ? `Calculator: ${c.kcal} kcal · ${c.goal}` : null, "This week's timetable"];
		$(".cx-ctx").innerHTML = '<span style="border:0;background:none;padding-left:0">Using:</span>' +
			bits.filter(Boolean).map((b) => `<span>${b}</span>`).join("");
	}

	/* ---------- knowledge (scripted) ---------- */
	const CLASSES = {
		Strength: { room: "The Cage", level: "Intermediate" },
		Conditioning: { room: "The Loft", level: "All levels" },
		Boxing: { room: "Studio One", level: "Intermediate" },
		"Yoga & Pilates": { room: "Studio One", level: "Beginner" },
		Recovery: { room: "Recovery Wing", level: "All levels" }
	};
	const PLANS = {
		2: [["Mon", "Strength", "Full body · 50 min"], ["Thu", "Conditioning", "Intervals · 45 min"]],
		3: [["Mon", "Strength", "Lower body · 50 min"], ["Wed", "Conditioning", "Intervals · 45 min"], ["Fri", "Strength", "Upper body · 50 min"]],
		4: [["Mon", "Strength", "Lower body · 50 min"], ["Tue", "Yoga & Pilates", "Mobility · 45 min"], ["Thu", "Strength", "Upper body · 50 min"], ["Sat", "Boxing", "Conditioning · 45 min"]]
	};

	function planCard(days) {
		const rows = PLANS[days].map(([d, cls, what]) =>
			`<div class="cx-row"><span class="cx-day">${d}</span><span>${cls}<div class="cx-meta">${what} · ${CLASSES[cls].room}</div></span><a href="${BASE}classes.html">Book →</a></div>`).join("");
		return `<div class="cx-card">${rows}</div>`;
	}

	// Each intent returns { text (streamed), html (appended after), chips, note }
	const intents = [
		{
			id: "medical",
			test: /(pain|hurt|injur|knee|back pain|my back|shoulder|ankle|pregnan|medic|doctor|dizz|chest|surgery|douleur|blessure)/i,
			reply: () => ({
				text: "I can't assess pain or injuries — that needs a professional who can examine you, and guessing could make it worse.",
				note: { kind: "safe", text: "Safety rule: Coach never gives medical advice. It routes you to the club's medical team instead." },
				chips: [{ label: "Book Dr. Lena Okafor (club doctor)", href: BASE + "index.html", primary: true }, { label: "Show me low-impact classes", ask: "Which classes are low impact?" }]
			})
		},
		{
			id: "vague-goal",
			test: /^(.{0,40})(lose weight|get fit|get in shape|tone up|maigrir|perdre du poids)(.{0,20})$/i,
			reply: () => ({
				text: "Happy to help. To give you something useful rather than generic, I need one thing first: what matters most to you right now?",
				chips: [{ label: "Lose fat, keep muscle", ask: "Plan for fat loss, 3 days a week" }, { label: "Build strength", ask: "Build me a 3-day strength week" }, { label: "Move better, less stiffness", ask: "Which classes are low impact?" }]
			})
		},
		{
			id: "plan",
			test: /(plan|program|programme|routine|week|workout|split|strength|fat loss|entraîn|séance)/i,
			reply: (q) => {
				const m = q.match(/\b([2-4])\s*(?:-|\s)?\s*(?:day|days|x|jours?)\b/i);
				if (!m) return {
					text: "How many days a week can you realistically train? I'll build around your real schedule, not an ideal one.",
					chips: [2, 3, 4].map((n) => ({ label: `${n} days`, ask: `Build me a ${n}-day ${/fat/i.test(q) ? "fat loss" : "strength"} week` }))
				};
				const n = +m[1];
				return {
					text: `Here's a ${n}-day week built from classes that are actually on the timetable, with at least one rest day between hard sessions.`,
					html: planCard(n),
					note: { kind: "warn", text: "Suggested from class schedules only — I can't see your training history. Your coach on the floor can adjust loads." },
					chips: [{ label: "Make it easier", ask: `Build me an easier ${Math.max(2, n - 1)}-day week` }, { label: "What should I eat on training days?", ask: "What should I eat on training days?" }]
				};
			}
		},
		{
			id: "nutrition",
			test: /(eat|food|meal|protein|calorie|kcal|macro|diet|snack|manger|repas)/i,
			reply: () => {
				const c = calc();
				return {
					text: c
						? `Based on the calculator above (${c.goal}), you're around ${c.kcal} kcal a day: about ${c.p} g protein, ${c.c} g carbs and ${c.f} g fat. On training days, put most of the carbs around the session and get 25–40 g of protein within a couple of hours after.`
						: "On training days, put most of your carbs around the session and get 25–40 g of protein within a couple of hours after. Fill in the calculator on this page and I'll use your numbers.",
					note: { kind: "warn", text: "General guidance, not a meal prescription. " + (tier() === "Basic" ? "Signature and Elite include a dietitian." : "Your plan includes a dietitian who can tailor this.") },
					chips: [{ label: "Open the calculator", href: "#calc" }, { label: "See this week's meals", href: "#meal-plan" }]
				};
			}
		},
		{
			id: "classes",
			test: /(class|beginner|yoga|pilates|boxing|low impact|recovery|cours|débutant)/i,
			reply: (q) => {
				const low = /low impact|recovery|beginner|débutant/i.test(q);
				const list = low ? ["Yoga & Pilates", "Recovery", "Conditioning"] : ["Strength", "Boxing", "Conditioning"];
				return {
					text: low ? "Good options if you want to go easy on the joints or you're starting out:" : "Popular picks this week:",
					html: `<div class="cx-card">${list.map((c) => `<div class="cx-row"><span class="cx-day">${CLASSES[c].level.split(" ")[0]}</span><span>${c}<div class="cx-meta">${CLASSES[c].room} · ${CLASSES[c].level}</div></span><a href="${BASE}classes.html">Book →</a></div>`).join("")}</div>`,
					chips: [{ label: "Build me a 3-day week", ask: "Build me a 3-day strength week" }]
				};
			}
		},
		{
			id: "membership",
			test: /(member|price|cost|upgrade|downgrade|cancel|tier|elite|basic|signature|my plan|change plan|abonnement|prix)/i,
			reply: () => {
				const t = tier();
				return {
					text: `You're on ${t} ($${TIERS[t]}/month). Basic is $149, Signature $259 and Elite $549 — Elite adds personal training, the club doctor, physio and a weekly plan. I can't change your plan myself; you stay in control of anything involving billing.`,
					chips: [{ label: "Change my plan", href: "#membership-status", primary: true }, { label: "What does Elite include?", ask: "What does Elite include?" }]
				};
			}
		}
	];

	function answer(q) {
		const order = ["medical", "vague-goal", "membership", "nutrition", "classes", "plan"];
		for (const id of order) { const it = intents.find((x) => x.id === id); if (it.test.test(q)) return { id, ...it.reply(q) }; }
		if (/elite/i.test(q)) return intents.find((i) => i.id === "membership").reply(q);
		return {
			id: "scope",
			text: "That's outside what I can help with. I know APEX training, nutrition basics, classes and memberships — and I'd rather say so than make something up.",
			chips: starterChips()
		};
	}

	function starterChips() {
		return [
			{ label: "Build me a 3-day strength week", ask: "Build me a 3-day strength week" },
			{ label: "What should I eat after training?", ask: "What should I eat after training?" },
			{ label: "Which class fits a beginner?", ask: "Which class fits a beginner?" },
			{ label: "My knee hurts when I squat", ask: "My knee hurts when I squat" }
		];
	}

	/* ---------- rendering ---------- */
	let busy = false, cancelFlag = false, history = [];

	function scrollDown() { log.scrollTop = log.scrollHeight; }

	function emptyState() {
		log.innerHTML = "";
		const d = document.createElement("div");
		d.className = "cx-empty";
		d.innerHTML = `<span class="cx-badge" style="margin:0">Simulated demo</span><h3>Hi ${firstName()}, what are we working on?</h3><p>I plan weeks from the real timetable, use your calculator numbers, and tell you when I'm not sure.</p>`;
		d.appendChild(chipRow(starterChips()));
		log.appendChild(d);
	}

	function chipRow(chips) {
		const row = document.createElement("div");
		row.className = "cx-chips";
		chips.forEach((c) => {
			const el = document.createElement(c.href ? "a" : "button");
			el.className = "cx-chip" + (c.primary ? " primary" : "");
			el.textContent = c.label;
			if (c.href) {
				el.href = c.href;
				el.style.textDecoration = "none";
				if (c.href.startsWith("#")) el.addEventListener("click", () => close());
			} else {
				el.type = "button";
				el.addEventListener("click", () => send(c.ask));
			}
			row.appendChild(el);
		});
		return row;
	}

	function addUser(text) {
		const d = document.createElement("div");
		d.className = "cx-msg cx-user";
		d.textContent = text;
		log.appendChild(d);
	}

	function noteEl(n) {
		const d = document.createElement("div");
		d.className = "cx-note " + (n.kind || "");
		d.innerHTML = `<span aria-hidden="true">${n.kind === "safe" ? "◆" : n.kind === "err" ? "!" : "ⓘ"}</span><span>${n.text}</span>`;
		return d;
	}

	const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 60) : ms));

	function setBusy(on) {
		busy = on;
		sendBtn.classList.toggle("stop", on);
		sendBtn.innerHTML = on ? I.stop : I.send;
		sendBtn.setAttribute("aria-label", on ? "Stop generating" : "Send");
		sendBtn.disabled = on ? false : !input.value.trim();
		input.disabled = on;
	}

	async function botTurn(q, wrap) {
		const isNew = !wrap;
		if (isNew) { wrap = document.createElement("div"); wrap.className = "cx-msg cx-bot"; log.appendChild(wrap); }
		wrap.innerHTML = "";
		cancelFlag = false;
		setBusy(true);

		// 1. Thinking, with visible steps
		const think = document.createElement("div");
		think.className = "cx-think";
		think.innerHTML = '<span class="cx-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="cx-step">Reading your question…</span>';
		wrap.appendChild(think);
		scrollDown();
		const steps = ["Checking this week's timetable…", "Looking at your plan…"];
		for (const s of steps) {
			await wait(sim.slow ? 1600 : 550);
			if (cancelFlag) return stopped(wrap);
			think.querySelector(".cx-step").textContent = s;
		}
		await wait(sim.slow ? 1800 : 400);
		if (cancelFlag) return stopped(wrap);

		// 2. Error path
		if (sim.error) {
			sim.error = false;
			$('[data-sim="error"]').setAttribute("aria-pressed", "false");
			wrap.innerHTML = "";
			wrap.appendChild(noteEl({ kind: "err", text: "Coach couldn't reach the server. Your message is safe — nothing was lost." }));
			const r = chipRow([]);
			const retry = document.createElement("button");
			retry.type = "button"; retry.className = "cx-chip primary"; retry.textContent = "Try again";
			retry.addEventListener("click", () => botTurn(q, wrap));
			r.appendChild(retry);
			wrap.appendChild(r);
			setBusy(false); scrollDown();
			return;
		}

		// 3. Stream the text
		const a = answer(q);
		wrap.innerHTML = "";
		const bubble = document.createElement("div");
		bubble.className = "cx-bubble";
		const p = document.createElement("p");
		p.className = "cx-caret";
		bubble.appendChild(p);
		wrap.appendChild(bubble);
		const words = a.text.split(" ");
		for (let i = 0; i < words.length; i++) {
			if (cancelFlag) { p.classList.remove("cx-caret"); p.textContent += " …"; return stopped(wrap, true); }
			p.textContent += (i ? " " : "") + words[i];
			if (i % 3 === 0) scrollDown();
			await wait(sim.slow ? 70 : 28);
		}
		p.classList.remove("cx-caret");
		if (a.html) bubble.insertAdjacentHTML("beforeend", a.html);
		if (a.note) bubble.appendChild(noteEl(a.note));
		if (a.chips && a.chips.length) wrap.appendChild(chipRow(a.chips));
		wrap.appendChild(actions(q, wrap, bubble));
		history.push({ q, id: a.id });
		save();
		setBusy(false); scrollDown();
	}

	function stopped(wrap, keepText) {
		if (!keepText) wrap.innerHTML = "";
		const s = document.createElement("div");
		s.className = "cx-fb";
		s.textContent = "Stopped. Ask again or rephrase whenever you're ready.";
		wrap.appendChild(s);
		setBusy(false); input.focus();
	}

	function actions(q, wrap, bubble) {
		const bar = document.createElement("div");
		bar.className = "cx-acts";
		const mk = (icon, label, fn, pressable) => {
			const b = document.createElement("button");
			b.type = "button"; b.className = "cx-act"; b.innerHTML = icon + `<span>${label}</span>`;
			if (pressable) b.setAttribute("aria-pressed", "false");
			b.addEventListener("click", () => fn(b));
			bar.appendChild(b);
			return b;
		};
		mk(I.copy, "Copy", (b) => {
			const t = bubble.innerText;
			(navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.lastChild.textContent = "Copied"; setTimeout(() => (b.lastChild.textContent = "Copy"), 1400); }).catch(() => {});
		});
		mk(I.regen, "Regenerate", () => { if (!busy) botTurn(q, wrap); });
		const up = mk(I.up, "", (b) => vote(b, down, true), true);
		const down = mk(I.down, "", (b) => vote(b, up, false), true);
		up.setAttribute("aria-label", "Helpful"); down.setAttribute("aria-label", "Not helpful");
		function vote(b, other, good) {
			b.setAttribute("aria-pressed", "true"); other.setAttribute("aria-pressed", "false");
			const old = wrap.querySelector(".cx-fb"); if (old) old.remove();
			const f = document.createElement("div"); f.className = "cx-fb";
			if (good) { f.textContent = "Thanks — that helps Coach learn what works."; wrap.appendChild(f); return; }
			f.textContent = "What went wrong?";
			const r = chipRow([]);
			["Not accurate", "Too generic", "Not what I asked"].forEach((l) => {
				const c = document.createElement("button"); c.type = "button"; c.className = "cx-chip"; c.textContent = l;
				c.addEventListener("click", () => { f.textContent = `Noted: "${l}". A coach reviews flagged answers weekly.`; r.remove(); });
				r.appendChild(c);
			});
			f.appendChild(r); wrap.appendChild(f); scrollDown();
		}
		return bar;
	}

	function send(text) {
		text = (text || "").trim();
		if (!text || busy) return;
		const e = log.querySelector(".cx-empty"); if (e) e.remove();
		addUser(text);
		input.value = ""; autosize();
		botTurn(text);
	}

	/* ---------- persistence (per tab) ---------- */
	const KEY = "apex_coach_history";
	function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-12))); } catch (_) {} }
	function restore() {
		let h = [];
		try { h = JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (_) {}
		if (!h.length) return emptyState();
		log.innerHTML = "";
		h.forEach(({ q }) => {
			addUser(q);
			const a = answer(q);
			const wrap = document.createElement("div"); wrap.className = "cx-msg cx-bot";
			const bubble = document.createElement("div"); bubble.className = "cx-bubble";
			const p = document.createElement("p"); p.textContent = a.text; bubble.appendChild(p);
			if (a.html) bubble.insertAdjacentHTML("beforeend", a.html);
			if (a.note) bubble.appendChild(noteEl(a.note));
			wrap.appendChild(bubble);
			wrap.appendChild(actions(q, wrap, bubble));
			log.appendChild(wrap);
		});
		history = h;
	}

	/* ---------- open / close ---------- */
	let lastFocus = null;
	function open() {
		lastFocus = document.activeElement;
		renderCtx();
		panel.classList.add("open");
		panel.setAttribute("aria-hidden", "false");
		launch.setAttribute("aria-expanded", "true");
		setTimeout(() => input.focus(), 50);
		scrollDown();
	}
	function close() {
		panel.classList.remove("open");
		panel.setAttribute("aria-hidden", "true");
		launch.setAttribute("aria-expanded", "false");
		(lastFocus && lastFocus.focus ? lastFocus : launch).focus();
	}

	function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; sendBtn.disabled = busy ? false : !input.value.trim(); }

	launch.addEventListener("click", open);
	$("[data-close]").addEventListener("click", close);
	$("[data-reset]").addEventListener("click", () => { if (busy) cancelFlag = true; history = []; save(); emptyState(); input.focus(); });
	input.addEventListener("input", autosize);
	input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
	form.addEventListener("submit", (e) => { e.preventDefault(); if (busy) { cancelFlag = true; return; } send(input.value); });
	panel.addEventListener("keydown", (e) => {
		if (e.key === "Escape") return close();
		if (e.key !== "Tab") return;
		const f = [...panel.querySelectorAll("button:not([disabled]),a[href],textarea:not([disabled])")].filter((x) => x.offsetParent !== null);
		if (!f.length) return;
		if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
		else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
	});
	$("[data-sim-toggle]").addEventListener("click", (e) => {
		const on = $(".cx-sim").classList.toggle("on");
		e.currentTarget.setAttribute("aria-expanded", String(on));
	});
	panel.querySelectorAll("[data-sim]").forEach((b) => b.addEventListener("click", () => {
		const k = b.dataset.sim; sim[k] = !sim[k]; b.setAttribute("aria-pressed", String(sim[k]));
	}));

	restore();
	if (/[?&]coach=open/.test(location.search)) open();
})();
