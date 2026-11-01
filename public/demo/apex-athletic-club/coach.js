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
	function tier() { const t = account().tier; return TIERS[t] ? t : null; }
	// Section links work from any APEX page: same-page anchor if present, else the member area.
	function here(h) { return document.querySelector(h) ? h : BASE + "user.html" + h; }

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
	.cx-ai.cx-caret:not(:empty)::after{content:none}
	.cx-ai.cx-caret>:last-child::after,.cx-ai.cx-caret:empty::after{content:"";display:inline-block;width:7px;height:14px;background:#00E5A0;margin-left:2px;vertical-align:-2px;animation:cxBlink 1s steps(2) infinite}
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
	.cx-mrow{grid-template-columns:72px 1fr auto}
	.cx-sub2{padding:8px 12px 4px;font:600 10.5px/1 "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#FF2E7E}
	.cx-setup{margin-top:12px;display:flex;flex-direction:column;gap:12px}
	.cx-f>span{display:block;font-size:11.5px;color:rgba(245,245,247,.6);margin-bottom:6px}
	.cx-f small{display:block;margin-top:4px;font-size:11px;color:rgba(245,245,247,.45)}
	.cx-seg{display:flex;flex-wrap:wrap;gap:6px}
	.cx-seg label{position:relative}
	.cx-seg input{position:absolute;opacity:0;inset:0;cursor:pointer}
	.cx-seg span{display:block;border:1px solid rgba(245,245,247,.22);border-radius:999px;padding:6px 11px;font-size:12.5px}
	.cx-seg input:checked+span{background:#F5F5F7;color:#0A0A0F;border-color:#F5F5F7;font-weight:600}
	.cx-seg input:focus-visible+span{outline:2px solid #00E5A0;outline-offset:2px}
	.cx-num{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(245,245,247,.6)}
	.cx-num input{width:96px;background:#0A0A0F;border:1px solid rgba(245,245,247,.22);border-radius:10px;color:#F5F5F7;padding:7px 10px;font:500 14px/1 "JetBrains Mono",monospace}
	.cx-build{align-self:flex-start}
	.cx-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
	.cx-sum div{background:#0A0A0F;border:1px solid rgba(245,245,247,.10);border-radius:10px;padding:9px 10px}
	.cx-sum b{display:block;font:700 16px/1.1 "JetBrains Mono",monospace;color:#00E5A0}
	.cx-sum span{font-size:11px;color:rgba(245,245,247,.55)}
	.cx-tabs{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
	.cx-tabs button{border:1px solid rgba(245,245,247,.22);background:transparent;color:#F5F5F7;border-radius:999px;padding:6px 12px;font:600 12px/1 Inter,sans-serif;cursor:pointer}
	.cx-tabs button[aria-selected="true"]{background:#FF2E7E;border-color:#FF2E7E}
	.cx-pdf{margin-top:12px;width:100%;text-align:center}
	.cx-pdf:disabled{opacity:.7;cursor:progress}
	.cx-dd{border-top:1px solid rgba(245,245,247,.06)}.cx-dd:first-child{border-top:0}
	.cx-dd summary{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;list-style:none}
	.cx-dd summary::-webkit-details-marker{display:none}
	.cx-dd summary::after{content:"+";color:rgba(245,245,247,.5);font-weight:600;margin-left:4px}
	.cx-dd[open] summary::after{content:"−"}
	.cx-dd[open] summary{background:rgba(245,245,247,.03)}
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
	.scroll-top-btn{bottom:92px!important}
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
		const bits = [tier() ? `${tier()} member` : "Guest · not signed in", c ? `Calculator: ${c.kcal} kcal · ${c.goal}` : null, "This week's timetable"];
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

	/* ---------- weekly meal plan ---------- */
	// [name, kcal, protein g, vegetarian]
	const MEALS = {
		Breakfast: [
			["Greek yogurt, oats & berries", 420, 32, 1], ["Egg-white omelette, spinach, sourdough", 380, 30, 1],
			["Overnight oats, whey & banana", 450, 35, 1], ["Avocado toast, 2 poached eggs", 460, 22, 1],
			["Protein pancakes, berries", 430, 34, 1]
		],
		Lunch: [
			["Grilled chicken, quinoa, roast vegetables", 620, 48, 0], ["Salmon poke bowl, brown rice, edamame", 650, 40, 0],
			["Turkey & hummus wrap, side salad", 560, 38, 0], ["Lentil & feta salad, wholegrain bread", 580, 28, 1],
			["Chickpea curry, basmati rice", 600, 22, 1], ["Tofu stir-fry, soba noodles", 590, 30, 1]
		],
		Dinner: [
			["Lean beef, sweet potato, green beans", 650, 45, 0], ["Baked cod, couscous, ratatouille", 560, 42, 0],
			["Chicken fajitas, peppers, guacamole", 640, 44, 0], ["Shrimp pasta, tomato & basil", 610, 36, 0],
			["Black bean burrito bowl", 620, 26, 1], ["Halloumi & roast veg traybake, bulgur", 640, 28, 1],
			["Mushroom & spinach risotto, parmesan", 600, 22, 1]
		],
		Snack: [
			["Cottage cheese & pineapple", 220, 24, 1], ["Protein shake & apple", 260, 26, 1],
			["Rice cakes, peanut butter", 240, 9, 1], ["Hummus & veggie sticks", 200, 8, 1], ["Boiled eggs & almonds", 250, 16, 1]
		]
	};
	const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
	const fmt = (n) => n.toLocaleString("en-US");

	/* ---------- program builder: training + meals, matched ---------- */
	const GOALS = {
		lose: { label: "Lose fat", factor: 0.8, sets: 3, reps: 12, rest: 60, protein: 0.32 },
		maintain: { label: "Maintain", factor: 1.0, sets: 3, reps: 10, rest: 75, protein: 0.3 },
		build: { label: "Build muscle", factor: 1.1, sets: 4, reps: 8, rest: 90, protein: 0.28 }
	};
	// [exercise, kind] — main: base reps · acc: base reps + 2 · time: seconds
	const SESSIONS = {
		"Full body A": [["Goblet squat", "main"], ["Push-up", "main"], ["Dumbbell row", "main"], ["Hip thrust", "acc"], ["Dead bug", "time"]],
		"Full body B": [["Deadlift", "main"], ["Dumbbell bench press", "main"], ["Lat pulldown", "acc"], ["Split squat", "acc"], ["Farmer carry", "time"]],
		"Lower A": [["Back squat", "main"], ["Romanian deadlift", "main"], ["Walking lunge", "acc"], ["Leg press", "acc"], ["Plank", "time"]],
		"Upper A": [["Bench press", "main"], ["Bent-over row", "main"], ["Overhead press", "main"], ["Lat pulldown", "acc"], ["Biceps curl", "acc"]],
		"Lower B": [["Deadlift", "main"], ["Front squat", "main"], ["Hip thrust", "acc"], ["Leg curl", "acc"], ["Calf raise", "acc"]],
		"Upper B": [["Incline dumbbell press", "main"], ["Assisted pull-up", "main"], ["Seated cable row", "acc"], ["Lateral raise", "acc"], ["Triceps pushdown", "acc"]],
		"Push": [["Bench press", "main"], ["Overhead press", "main"], ["Incline dumbbell press", "acc"], ["Lateral raise", "acc"], ["Triceps pushdown", "acc"]],
		"Pull": [["Assisted pull-up", "main"], ["Barbell row", "main"], ["Face pull", "acc"], ["Hammer curl", "acc"], ["Back extension", "acc"]]
	};
	const SPLITS = {
		2: { days: [0, 3], s: ["Full body A", "Full body B"] },
		3: { days: [0, 2, 4], s: ["Lower A", "Upper A", "Full body B"] },
		4: { days: [0, 1, 3, 5], s: ["Lower A", "Upper A", "Lower B", "Upper B"] },
		5: { days: [0, 1, 2, 4, 5], s: ["Lower A", "Push", "Pull", "Lower B", "Upper B"] }
	};
	const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
	const PROGS = {};

	function maintenance() {
		const raw = txt("r-tdee-raw");
		return raw ? +raw.replace(/\D/g, "") : null;
	}

	function parseProgramAsk(q) {
		const p = {};
		const w = q.match(/\b([1-4]|one|two|three|four|un|une|deux|trois|quatre)\s*(?:-|\s)?\s*(?:weeks?|semaines?)\b/i);
		const words = { one: 1, un: 1, une: 1, two: 2, deux: 2, three: 3, trois: 3, four: 4, quatre: 4 };
		if (w) p.weeks = words[w[1].toLowerCase()] || +w[1];
		if (/\b(month|mois)\b/i.test(q)) p.weeks = 4;
		const d = q.match(/\b([2-5])\s*(?:-|\s)?\s*(?:days?|jours?|x|times|fois|sessions?|séances?)\s*(?:a|per|par)?\s*(?:week|semaine)?/i);
		if (d && !/meal|repas/i.test(d[0])) p.days = +d[1];
		const m = q.match(/\b(3|4|three|four|trois|quatre)\s*(?:meals|repas)/i);
		if (m) p.meals = /4|four|quatre/i.test(m[1]) ? 4 : 3;
		if (/lose|fat|cut|slim|maigrir|perdre|sèche/i.test(q)) p.goal = "lose";
		else if (/muscle|bulk|gain|mass|masse|prise/i.test(q)) p.goal = "build";
		if (/vegetarian|veggie|végé|vege/i.test(q)) p.diet = "veg";
		return p;
	}

	function setupForm(p) {
		const c = calc();
		const goal = p.goal || (c && /lose|cut|deficit/i.test(c.goal) ? "lose" : c && /gain|bulk|build/i.test(c.goal) ? "build" : "maintain");
		const maint = maintenance() || 2400;
		const seg = (name, opts, val) => `<div class="cx-seg" role="radiogroup" aria-label="${name}">` + opts.map(([v, l]) =>
			`<label><input type="radio" name="${name}" value="${v}"${String(v) === String(val) ? " checked" : ""}><span>${l}</span></label>`).join("") + "</div>";
		return `<form class="cx-setup">
			<div class="cx-f"><span>Goal</span>${seg("goal", [["lose", "Lose fat"], ["maintain", "Maintain"], ["build", "Build muscle"]], goal)}</div>
			<div class="cx-f"><span>Length</span>${seg("weeks", [[1, "1 week"], [2, "2 weeks"], [3, "3 weeks"], [4, "1 month"]], p.weeks || 4)}</div>
			<div class="cx-f"><span>Training days / week</span>${seg("days", [[2, "2"], [3, "3"], [4, "4"], [5, "5"]], p.days || 3)}</div>
			<div class="cx-f"><span>Meals / day</span>${seg("meals", [[3, "3"], [4, "4"]], p.meals || 4)}</div>
			<div class="cx-f"><span>Diet</span>${seg("diet", [["any", "Everything"], ["veg", "Vegetarian"]], p.diet || "any")}</div>
			<div class="cx-f"><span>Maintenance calories</span><label class="cx-num"><input type="number" name="maint" min="1400" max="4500" step="1" value="${maint}"> kcal/day</label>
			<small>${maintenance() ? "From your calculator." : "An estimate. Use the calculator in My Space for yours."}</small></div>
			<button type="submit" class="cx-chip primary cx-build">Build my program</button>
		</form>`;
	}

	function rx(kind, g, w, weeks) {
		const G = GOALS[g];
		let sets = G.sets, reps = G.reps + (kind === "acc" ? 2 : 0), note = "";
		const phase = weeks === 4 && w === 3 ? "deload" : ["base", "reps", "sets"][w % 3];
		if (phase === "reps") reps += 1;
		if (phase === "sets") sets += 1;
		if (phase === "deload") { sets -= 1; note = "-10% load"; }
		if (kind === "time") return { sets, reps: `${30 + (phase === "reps" ? 10 : phase === "sets" ? 10 : 0)} s`, rest: "45 s", note };
		return { sets, reps: String(reps), rest: `${G.rest} s`, note };
	}

	function buildProgram(p) {
		const G = GOALS[p.goal];
		const target = Math.round((p.maint * G.factor) / 10) * 10;
		const split = SPLITS[p.days];
		const trainK = target + 150;
		const restK = Math.round(((target * 7 - trainK * p.days) / (7 - p.days)) / 10) * 10;
		const protein = Math.round((target * G.protein) / 4);
		const slots = p.meals === 4 ? ["Breakfast", "Lunch", "Snack", "Dinner"] : ["Breakfast", "Lunch", "Dinner"];
		const weeks = [];
		for (let w = 0; w < p.weeks; w++) {
			const days = WEEKDAYS.map((name, d) => {
				const si = split.days.indexOf(d);
				const session = si >= 0 ? split.s[si] : null;
				const kcal = session ? trainK : restK;
				const picks = slots.map((s, k) => {
					const pool = MEALS[s].filter((m) => p.diet !== "veg" || m[3]);
					return [s, pool[((w * 7 + d) * (k + 2) + k + w) % pool.length]];
				});
				const base = picks.reduce((t, [, m]) => t + m[1], 0);
				const f = Math.min(1.8, Math.max(0.6, kcal / base));
				const meals = picks.map(([s, m]) => ({ slot: s, dish: m[0], kcal: Math.round((m[1] * f) / 10) * 10, p: Math.round(m[2] * f) }));
				const ex = session ? SESSIONS[session].map(([n, kind]) => ({ name: n, ...rx(kind, p.goal, w, p.weeks) })) : [];
				if (session && p.goal === "lose") ex.push({ name: "Finisher: bike intervals 30 s hard / 30 s easy", sets: 1, reps: "10 min", rest: "-", note: "" });
				return { name, session, kcal: meals.reduce((t, m) => t + m.kcal, 0), protein: meals.reduce((t, m) => t + m.p, 0), meals, ex };
			});
			weeks.push(days);
		}
		return { ...p, goalLabel: G.label, target, trainK, restK, protein, weeks };
	}

	function programView(id, P) {
		const tabs = P.weeks.length > 1 ? `<div class="cx-tabs" role="tablist">${P.weeks.map((_, w) =>
			`<button type="button" role="tab" data-week="${w}" aria-selected="${w === 0}">Week ${w + 1}</button>`).join("")}</div>` : "";
		const weeks = P.weeks.map((days, w) => `<div class="cx-week" data-w="${w}"${w ? " hidden" : ""}>` + days.map((d, i) => {
			const train = d.session ? `<div class="cx-sub2">Training · ${d.session}</div>` + d.ex.map((e) =>
				`<div class="cx-row cx-mrow"><span class="cx-meta">${e.sets} × ${e.reps}</span><span>${e.name}${e.note ? ` <em class="cx-meta">${e.note}</em>` : ""}</span><span class="cx-meta">${e.rest}</span></div>`).join("")
				: `<div class="cx-sub2">Rest day · walk 30–45 min or a Recovery class</div>`;
			const meals = `<div class="cx-sub2">Meals</div>` + d.meals.map((m) =>
				`<div class="cx-row cx-mrow"><span class="cx-day">${m.slot}</span><span>${m.dish}</span><span class="cx-meta">${fmt(m.kcal)} kcal · ${m.p} g</span></div>`).join("");
			return `<details class="cx-dd"${i === 0 && w === 0 ? " open" : ""}><summary><span><span class="cx-day">${d.name.slice(0, 3)}</span> ${d.session || "Rest"}</span><span class="cx-meta">${fmt(d.kcal)} kcal</span></summary>${train}${meals}</details>`;
		}).join("") + "</div>").join("");
		return `<div class="cx-sum">
				<div><b>${fmt(P.trainK)}</b><span>kcal training day</span></div>
				<div><b>${fmt(P.restK)}</b><span>kcal rest day</span></div>
				<div><b>${P.protein} g</b><span>protein / day</span></div>
			</div>${tabs}<div class="cx-card">${weeks}</div>
			<button type="button" class="cx-chip primary cx-pdf" data-pdf="${id}">Download PDF · program, meals & workout log</button>`;
	}

	/* PDF: libraries are loaded only when someone asks for a download. */
	function loadScript(src) {
		return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
	}
	async function pdfLibs() {
		if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript(BASE + "vendor/jspdf.umd.min.js");
		if (!window.jspdf.jsPDF.API.autoTable) await loadScript(BASE + "vendor/jspdf.plugin.autotable.min.js");
		return window.jspdf.jsPDF;
	}

	async function downloadPdf(P, btn) {
		const label = btn.textContent;
		btn.disabled = true; btn.textContent = "Preparing PDF…";
		try {
			const JsPDF = await pdfLibs();
			const doc = new JsPDF({ unit: "mm", format: "a4" });
			const PINK = [255, 46, 126], INK = [10, 10, 15];
			const head = { fillColor: INK, textColor: 255, fontStyle: "bold", fontSize: 9 };
			const body = { fontSize: 9, cellPadding: 2 };
			const W = doc.internal.pageSize.getWidth();
			const n = (x) => x.toLocaleString("en-US");

			doc.setFillColor(...INK); doc.rect(0, 0, W, 38, "F");
			doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
			doc.text("APEX Coach", 14, 18);
			doc.setFontSize(12); doc.setFont("helvetica", "normal");
			doc.text(`${P.weeks.length}-week program · ${P.goalLabel} · ${P.days} training days · ${P.meals} meals a day`, 14, 28);
			doc.setTextColor(...INK);
			doc.autoTable({
				startY: 48, theme: "grid", head: [["Plan", "Value"]], headStyles: { ...head, fillColor: PINK }, styles: body,
				body: [["Member", account().name || "Guest"], ["Goal", P.goalLabel], ["Maintenance", `${n(P.maint)} kcal/day`],
					["Training day", `${n(P.trainK)} kcal`], ["Rest day", `${n(P.restK)} kcal`], ["Protein", `${P.protein} g/day`],
					["Diet", P.diet === "veg" ? "Vegetarian" : "Everything"], ["Created", new Date().toLocaleDateString("en-GB")]]
			});
			doc.setFontSize(9);
			doc.text(doc.splitTextToSize("How it fits together: training days get more food (mostly carbs around the session), rest days less, so the weekly average matches your goal. Weights go up when you hit every rep with good form. Weigh in once a week and adjust by ~150 kcal if progress stalls. Estimates only, not medical advice.", W - 28), 14, doc.lastAutoTable.finalY + 8);

			P.weeks.forEach((days, w) => {
				doc.addPage(); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(`Week ${w + 1}`, 14, 16);
				doc.setFont("helvetica", "normal");
				const tr = [];
				days.forEach((d) => d.ex.forEach((e, i) => tr.push([i ? "" : d.name, i ? "" : d.session, e.name, `${e.sets} × ${e.reps}`, e.rest, e.note])));
				doc.autoTable({ startY: 22, theme: "striped", head: [["Day", "Session", "Exercise", "Sets × reps", "Rest", "Note"]], headStyles: { ...head, fillColor: PINK }, styles: body, body: tr });
				const ml = [];
				days.forEach((d) => d.meals.forEach((m, i) => ml.push([i ? "" : d.name, i ? "" : (d.session ? "Training" : "Rest"), m.slot, m.dish, n(m.kcal), `${m.p} g`])));
				days.forEach(() => {});
				doc.autoTable({ startY: doc.lastAutoTable.finalY + 8, theme: "striped", head: [["Day", "Type", "Meal", "Dish", "kcal", "Protein"]], headStyles: head, styles: body, body: ml });
			});

			P.weeks.forEach((days, w) => {
				doc.addPage(); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(`Workout log · Week ${w + 1}`, 14, 16);
				doc.setFontSize(9); doc.setFont("helvetica", "normal");
				doc.text("Write weight × reps for each set. Bodyweight: ________   Notes: ______________________________", 14, 23);
				let y = 28;
				days.filter((d) => d.session).forEach((d) => {
					if (y > 215) { doc.addPage(); y = 16; }
					doc.autoTable({
						startY: y, theme: "grid", head: [[`${d.name} · ${d.session}`, "Target", "Set 1", "Set 2", "Set 3", "Set 4", "Set 5"]],
						headStyles: { ...head, fillColor: INK }, styles: { ...body, minCellHeight: 8 },
						columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 22 } },
						body: d.ex.map((e) => [e.name, `${e.sets} × ${e.reps}`, "", "", "", "", ""])
					});
					y = doc.lastAutoTable.finalY + 6;
				});
			});

			doc.addPage(); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("Progress tracker", 14, 16);
			doc.autoTable({
				startY: 22, theme: "grid", head: [["Week", "Date", "Bodyweight", "Waist", "Energy (1-5)", "Notes"]], headStyles: { ...head, fillColor: PINK },
				styles: { ...body, minCellHeight: 10 }, body: P.weeks.map((_, w) => [`Week ${w + 1}`, "", "", "", "", ""])
			});
			const pages = doc.getNumberOfPages();
			for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`APEX Athletic Club · Coach (demo) · page ${i}/${pages}`, 14, 290); doc.setTextColor(...INK); }
			doc.save(`APEX-${P.weeks.length}-week-program.pdf`);
			btn.textContent = "PDF downloaded ✓";
		} catch (e) {
			btn.textContent = "Couldn't create the PDF. Try again";
		}
		setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 2500);
	}

	const intents = [
		{
			id: "program",
			test: /^Build program:|^Change my program settings|(build|make|create|give|fais|crée|donne)[^?.!]{0,40}(plan|program|programme|routine|split|menu|week|semaine)|(meal|training|workout|food|repas|nourriture|entraînement)\s*(plan|program|programme)|program(me)? (sur|for|de)|\b[1-4]\s*(weeks?|semaines?)\b|\b(month|mois)\b|[2-5]-day/i,
			reply: (q) => {
				if (!/^Build program:/.test(q)) return {
					text: "I'll build a complete program where training and meals are matched: more food on training days, less on rest days, protein every day. I filled in what I could from your message. Adjust anything, then tap Build.",
					html: setupForm(parseProgramAsk(q))
				};
				const kv = {};
				q.replace(/^Build program:/, "").split(";").forEach((x) => { const [k, v] = x.split("=").map((y) => y && y.trim()); if (k) kv[k] = v; });
				const P = buildProgram({ goal: GOALS[kv.goal] ? kv.goal : "maintain", weeks: Math.min(4, Math.max(1, +kv.weeks || 4)), days: Math.min(5, Math.max(2, +kv.days || 3)), meals: +kv.meals === 3 ? 3 : 4, diet: kv.diet === "veg" ? "veg" : "any", maint: Math.min(4500, Math.max(1400, +kv.maint || 2400)) });
				const id = "p" + Math.abs([...q].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
				PROGS[id] = P;
				const prog = { 1: "Week 1 is about learning the movements and finding your weights.", 2: "Week 2 adds a rep to every exercise.", 3: "Week 2 adds a rep, week 3 adds a set.", 4: "Week 2 adds a rep, week 3 adds a set, week 4 is a lighter deload week to recover." }[P.weeks.length];
				const again = (k, v) => "Build program: " + Object.entries({ goal: P.goal, weeks: P.weeks.length, days: P.days, meals: P.meals, diet: P.diet, maint: P.maint, [k]: v }).map(([a, b]) => `${a}=${b}`).join("; ");
				return {
					text: `Your ${P.weeks.length === 4 ? "1-month" : P.weeks.length + "-week"} program is ready. ${P.goalLabel}: ${fmt(P.trainK)} kcal on training days and ${fmt(P.restK)} on rest days, averaging ${fmt(P.target)} a day, with ${P.protein} g protein every day. ${P.days} sessions a week. ${prog} Open any day to see the workout and the meals, or download everything as a PDF with log sheets.`,
					html: programView(id, P),
					note: { kind: "warn", text: "Estimates for a typical adult. Start with weights you can lift for every rep with good form. Not medical advice: see the club doctor if you have an injury or condition." },
					chips: [
						{ label: P.days < 5 ? `${P.days + 1} training days` : "4 training days", ask: again("days", P.days < 5 ? P.days + 1 : 4), display: "Rebuild with " + (P.days < 5 ? P.days + 1 : 4) + " training days" },
						{ label: P.diet === "veg" ? "Include meat & fish" : "Make it vegetarian", ask: again("diet", P.diet === "veg" ? "any" : "veg"), display: P.diet === "veg" ? "Include meat & fish" : "Make it vegetarian" },
						{ label: "Change settings", ask: "Change my program settings" }
					]
				};
			}
		},
		{
			id: "medical",
			test: /(chest pain|douleur (à la|a la|dans la) poitrine|faint|fainted|passed out|évanoui|can't breathe|cannot breathe|short(ness)? of breath|essoufflé au repos|palpitation)/i,
			reply: () => ({
				text: "Stop training now. Chest pain, fainting or trouble breathing need a medical check today. If it is severe or doesn't pass within minutes, call emergency services (911 in the US). Tell the front desk and Dr. Lena Okafor.",
				note: { kind: "safe", text: "Safety rule: warning signs always get a direct, human answer, never an AI guess." },
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
			id: "nutrition",
			test: /(eat|food|meal|protein|calorie|kcal|macro|diet|snack|manger|repas)/i,
			reply: () => {
				const c = calc();
				return {
					text: c
						? `Based on the calculator above (${c.goal}), you're around ${c.kcal} kcal a day: about ${c.p} g protein, ${c.c} g carbs and ${c.f} g fat. On training days, put most of the carbs around the session and get 25–40 g of protein within a couple of hours after.`
						: "On training days, put most of your carbs around the session and get 25–40 g of protein within a couple of hours after. Fill in the calculator on this page and I'll use your numbers.",
					note: { kind: "warn", text: "General guidance, not a meal prescription. " + (tier() !== "Signature" && tier() !== "Elite" ? "Signature and Elite include a dietitian." : "Your plan includes a dietitian who can tailor this.") },
					chips: [{ label: "Build my weekly menu", ask: "Plan my meals for the week", primary: true }, { label: "Open the calculator", href: here("#calc") }]
				};
			}
		},
		{
			id: "classes",
			test: /(which class|what class|class(es)? (for|fit|are)|quel cours|low impact|beginner class)/i,
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
			test: /(membership|member price|abonnement|upgrade|downgrade|cancel my (plan|membership)|\belite\b|signature plan|basic plan|\bmy plan\b|change plan|plans? (cost|price)|how much (is|does) (it|elite|signature|basic|a membership)|prix de l'abonnement)/i,
			reply: () => {
				const t = tier();
				if (!t) return {
					text: "You're not a member yet. Basic is $149/month, Signature $259 and Elite $549 — Elite adds personal training, the club doctor, physio and a weekly plan. No contracts.",
					chips: [{ label: "See memberships", href: BASE + "index.html#membership", primary: true }, { label: "Get a free guest pass", href: BASE + "contact.html" }]
				};
				return {
					text: `You're on ${t} ($${TIERS[t]}/month). Basic is $149, Signature $259 and Elite $549 — Elite adds personal training, the club doctor, physio and a weekly plan. I can't change your plan myself; you stay in control of anything involving billing.`,
					chips: [{ label: "Change my plan", href: here("#membership-status"), primary: true }, { label: "What does Elite include?", ask: "What does Elite include?" }]
				};
			}
		}
	];

	function answer(q) {
		// Deterministic flows where exactness matters; the live model for everything else.
		const order = ["medical", "membership", "program", "classes"];
		for (const id of order) { const it = intents.find((x) => x.id === id); if (it.test.test(q)) return { id, ...it.reply(q) }; }
		return { id: "ai", ai: true };
	}

	function starterChips() {
		return [
			{ label: "What's my BMI and ideal weight range?", ask: "What's my BMI and what's a healthy weight range for me?" },
			{ label: "How much water should I drink?", ask: "How much water should I drink per day, including training days?" },
			{ label: "Build my training + meal program", ask: "Build me a program with training and meals" },
			{ label: "Which class fits a beginner?", ask: "Which class fits a beginner?" },
			{ label: "How do I estimate my body fat?", ask: "How can I estimate my body fat percentage?" }
		];
	}

	/* ---------- rendering ---------- */
	let busy = false, cancelFlag = false, history = [];
	// Limitation notes appear the first time a topic comes up, not on every answer.
	const seen = new Set();

	function scrollDown() { log.scrollTop = log.scrollHeight; }

	function emptyState() {
		log.innerHTML = "";
		const d = document.createElement("div");
		d.className = "cx-empty";
		d.innerHTML = `<span class="cx-badge" style="margin:0">Live AI · Llama 3.3</span><h3>Hi ${firstName()}, what are we working on?</h3><p>Ask me anything about training, nutrition, body metrics, hydration, recovery or the club. I use your calculator numbers and tell you when I'm not sure.</p>`;
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
				else if (c.href.indexOf(location.pathname + "#") === 0) el.addEventListener("click", () => close());
			} else {
				el.type = "button";
				el.addEventListener("click", () => send(c.ask, c.display));
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


	/* ---------- live AI ---------- */
	const convo = [];             // [{role, content}] sent to the model
	let aborter = null;
	const API = "/api/coach";

	function num(id) { const el = document.getElementById(id); return el && el.value ? +el.value : null; }
	function profile() {
		const w = num("c-weight"), h = num("c-height");
		if (w && h) {
			const sexEl = document.getElementById("c-gender"), actEl = document.getElementById("c-activity");
			const goalEl = document.querySelector('input[name="goal"]:checked');
			const p = { age: num("c-age"), sex: sexEl ? (sexEl.value || sexEl.options[sexEl.selectedIndex].text) : null, weight: w, height: h,
				activity: actEl ? actEl.options[actEl.selectedIndex].text : null, goal: goalEl ? goalEl.value : null };
			try { localStorage.setItem("apex_profile", JSON.stringify(p)); } catch (_) {}
			return p;
		}
		try { return JSON.parse(localStorage.getItem("apex_profile")); } catch (_) { return null; }
	}
	function contextPayload() {
		const p = profile(), c = calc(), m = {};
		if (p && p.weight && p.height) {
			const bmi = p.weight / Math.pow(p.height / 100, 2);
			m.BMI = bmi.toFixed(1);
			m["healthy weight range (BMI 18.5–24.9)"] = `${Math.round(18.5 * Math.pow(p.height / 100, 2))}–${Math.round(24.9 * Math.pow(p.height / 100, 2))} kg`;
			m["water/day"] = `${(p.weight * 0.035).toFixed(1)} L + 0.5–0.75 L per training hour`;
			m["protein range"] = `${Math.round(p.weight * 1.6)}–${Math.round(p.weight * 2.2)} g/day`;
		}
		if (c) { m["calorie target"] = `${c.kcal} kcal (${c.goal})`; m.macros = `P ${c.p} g · C ${c.c} g · F ${c.f} g`; }
		const bmr = txt("r-bmr"), tdee = txt("r-tdee-raw");
		if (bmr) m.BMR = bmr + " kcal"; if (tdee) m.TDEE = tdee + " kcal";
		return { name: account().name || null, tier: tier(), profile: p, metrics: m };
	}

	function esc(t) { return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
	function md(t) {
		const inline = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
		const out = []; let list = null;
		t.split(/\n/).forEach((line) => {
			const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
			if (li) { if (!list) { list = []; } list.push(`<li>${inline(li[1])}</li>`); return; }
			if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
			const h = line.match(/^#{1,4}\s+(.*)$/);
			if (h) out.push(`<p><strong>${inline(h[1])}</strong></p>`);
			else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
		});
		if (list) out.push(`<ul>${list.join("")}</ul>`);
		return out.join("");
	}

	async function streamAI(bubble) {
		aborter = new AbortController();
		const res = await fetch(API, {
			method: "POST", signal: aborter.signal,
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ messages: convo.slice(-10), context: contextPayload() })
		});
		if (res.status === 503) { const e = new Error("not_configured"); e.code = 503; throw e; }
		if (!res.ok || !res.body) throw new Error("http_" + res.status);
		const reader = res.body.getReader(), dec = new TextDecoder();
		let buf = "", text = "";
		bubble.classList.add("cx-caret");
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buf += dec.decode(value, { stream: true });
			const lines = buf.split("\n"); buf = lines.pop();
			for (const l of lines) {
				const d = l.replace(/^data:\s*/, "").trim();
				if (!d || d === "[DONE]" || !l.startsWith("data:")) continue;
				try {
					const j = JSON.parse(d);
					const piece = j.response ?? (j.choices && j.choices[0] && (j.choices[0].delta?.content ?? j.choices[0].text)) ?? "";
					if (piece) { text += piece; bubble.innerHTML = md(text); scrollDown(); }
				} catch (_) {}
			}
		}
		bubble.classList.remove("cx-caret");
		return text.trim();
	}

	async function botTurn(q, wrap, display) {
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
		const a0 = answer(q);
		const userText = display || q;
		if (!convo.length || convo[convo.length - 1].role !== "user" || convo[convo.length - 1].content !== userText) {
			if (convo.length && convo[convo.length - 1].role === "assistant" && convo.length >= 2 && convo[convo.length - 2].content === userText) convo.pop();
			else convo.push({ role: "user", content: userText });
		}
		const steps = a0.ai ? ["Thinking…"] : ["Checking this week's timetable…", "Looking at your plan…"];
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

		// 3a. Live model
		if (a0.ai) {
			wrap.innerHTML = "";
			const bubble = document.createElement("div");
			bubble.className = "cx-bubble cx-ai";
			wrap.appendChild(bubble);
			let text = "";
			try {
				text = await streamAI(bubble);
				if (!text) throw new Error("empty");
			} catch (err) {
				if (cancelFlag || (err && err.name === "AbortError")) { bubble.classList.remove("cx-caret"); return stopped(wrap, !!bubble.textContent); }
				wrap.innerHTML = "";
				const offline = err && err.code === 503;
				wrap.appendChild(noteEl({ kind: "err", text: offline
					? "Live answers aren't switched on for this site yet. I can still build programs, compare memberships and suggest classes."
					: "Coach couldn't reach the AI service. Your message is safe — nothing was lost." }));
				const r = chipRow(offline ? starterChips().slice(2, 3) : []);
				if (!offline) {
					const retry = document.createElement("button");
					retry.type = "button"; retry.className = "cx-chip primary"; retry.textContent = "Try again";
					retry.addEventListener("click", () => botTurn(q, wrap, display));
					r.appendChild(retry);
				}
				wrap.appendChild(r);
				setBusy(false); scrollDown();
				return;
			}
			convo.push({ role: "assistant", content: text });
			wrap.appendChild(actions(q, wrap, bubble, display));
			history.push({ q, d: display || null, id: "ai", t: text });
			save();
			setBusy(false); scrollDown();
			return;
		}

		// 3b. Scripted flow
		const a = a0;
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
		if (a.note && !seen.has(a.id)) { seen.add(a.id); bubble.appendChild(noteEl(a.note)); }
		if (a.chips && a.chips.length) wrap.appendChild(chipRow(a.chips));
		wrap.appendChild(actions(q, wrap, bubble));
		convo.push({ role: "assistant", content: a.text });
		history.push({ q, d: display || null, id: a.id });
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

	function actions(q, wrap, bubble, display) {
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
		mk(I.regen, "Regenerate", () => { if (!busy) botTurn(q, wrap, display); });
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

	function send(text, display) {
		text = (text || "").trim();
		if (!text || busy) return;
		const e = log.querySelector(".cx-empty"); if (e) e.remove();
		addUser(display || text);
		input.value = ""; autosize();
		botTurn(text, null, display);
	}

	/* ---------- persistence (per tab) ---------- */
	const KEY = "apex_coach_history";
	function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-12))); } catch (_) {} }
	function restore() {
		let h = [];
		try { h = JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (_) {}
		if (!h.length) return emptyState();
		log.innerHTML = "";
		h.forEach(({ q, d, id, t }) => {
			addUser(d || q);
			convo.push({ role: "user", content: d || q });
			if (id === "ai") {
				const wrap = document.createElement("div"); wrap.className = "cx-msg cx-bot";
				const bubble = document.createElement("div"); bubble.className = "cx-bubble cx-ai"; bubble.innerHTML = md(t || "");
				wrap.appendChild(bubble); wrap.appendChild(actions(q, wrap, bubble, d)); log.appendChild(wrap);
				convo.push({ role: "assistant", content: t || "" });
				return;
			}
			const a = answer(q);
			convo.push({ role: "assistant", content: a.text });
			const wrap = document.createElement("div"); wrap.className = "cx-msg cx-bot";
			const bubble = document.createElement("div"); bubble.className = "cx-bubble";
			const p = document.createElement("p"); p.textContent = a.text; bubble.appendChild(p);
			if (a.html) bubble.insertAdjacentHTML("beforeend", a.html);
			if (a.note && !seen.has(a.id)) { seen.add(a.id); bubble.appendChild(noteEl(a.note)); }
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
	$("[data-reset]").addEventListener("click", () => { if (busy) cancelFlag = true; history = []; seen.clear(); convo.length = 0; if (aborter) aborter.abort(); save(); emptyState(); input.focus(); });
	input.addEventListener("input", autosize);
	input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
	form.addEventListener("submit", (e) => { e.preventDefault(); if (busy) { cancelFlag = true; if (aborter) aborter.abort(); return; } send(input.value); });
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

	log.addEventListener("submit", (e) => {
		const f = e.target.closest(".cx-setup"); if (!f) return;
		e.preventDefault();
		const v = (n) => (f.querySelector(`[name="${n}"]:checked`) || f.querySelector(`[name="${n}"]`)).value;
		const P = { goal: v("goal"), weeks: v("weeks"), days: v("days"), meals: v("meals"), diet: v("diet"), maint: v("maint") };
		const q = "Build program: " + Object.entries(P).map(([a, b]) => `${a}=${b}`).join("; ");
		const label = `${+P.weeks === 4 ? "1 month" : P.weeks + (+P.weeks > 1 ? " weeks" : " week")} · ${GOALS[P.goal].label} · ${P.days} training days · ${P.meals} meals a day${P.diet === "veg" ? " · vegetarian" : ""}`;
		send(q, label);
	});
	log.addEventListener("click", (e) => {
		const tab = e.target.closest("[data-week]");
		if (tab) {
			const card = tab.closest(".cx-bubble");
			card.querySelectorAll("[data-week]").forEach((b) => b.setAttribute("aria-selected", String(b === tab)));
			card.querySelectorAll(".cx-week").forEach((w) => (w.hidden = w.dataset.w !== tab.dataset.week));
			return;
		}
		const pdf = e.target.closest("[data-pdf]");
		if (pdf && PROGS[pdf.dataset.pdf]) downloadPdf(PROGS[pdf.dataset.pdf], pdf);
	});

	restore();
	if (/[?&]coach=open/.test(location.search)) open();
})();
