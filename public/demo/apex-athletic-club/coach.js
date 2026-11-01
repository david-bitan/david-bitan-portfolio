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
	.cx-launch:focus-visible,.cx-panel button:focus-visible,.cx-panel a:focus-visible{outline:2px solid #00E5A0;outline-offset:2px}
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
	.cx-txt{display:flex;margin-top:8px}
	.cx-mf{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12.5px;color:rgba(245,245,247,.7)}
	.cx-mf input{width:96px;background:#0A0A0F;border:1px solid rgba(245,245,247,.22);border-radius:10px;color:#F5F5F7;padding:7px 10px;font:500 14px/1 "JetBrains Mono",monospace}.cx-txt input{flex:1;width:auto!important;font:400 13px/1.3 Inter,sans-serif!important}
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
	.cx-chips{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:10px}
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
	.cx-form [hidden]{display:none!important}
	.cx-how{margin-left:6px;border:1px solid rgba(0,229,160,.5);background:transparent;color:#00E5A0;border-radius:999px;padding:2px 8px;font:600 10.5px/1.4 Inter,sans-serif;cursor:pointer;vertical-align:1px}
	.cx-how[aria-expanded="true"]{background:#00E5A0;color:#0A0A0F}
	.cx-demo{margin:8px 10px 10px;padding:12px;border:1px solid rgba(0,229,160,.25);border-radius:12px;background:#0A0A0F}
	.cx-bubble>.cx-demo{margin:10px 0 0}
	.cx-demo-top{display:flex;gap:12px;align-items:center}
	.cx-views{display:flex;gap:8px;margin-top:8px}
	.cx-views figure{margin:0;flex:1;text-align:center}
	.cx-views .cx-demo-fig{display:flex;justify-content:center}
	.cx-views figcaption{font-size:10.5px;color:rgba(245,245,247,.6);margin-top:3px}
	.cx-demo-info{display:flex;align-items:baseline;gap:12px;margin-top:8px}
	.cx-demo-info .cx-phase,.cx-demo-info .cx-count{margin:0}
	.cx-demo-fig{flex:none;background:#14141C;border-radius:10px;padding:4px}
	.cx-phase{font:700 18px/1.2 "Space Grotesk",Arial,sans-serif;margin-top:6px}
	.cx-count{font:700 30px/1 "JetBrains Mono",monospace;color:#00E5A0;margin:4px 0}
	.cx-count small{font-size:13px;color:rgba(245,245,247,.5)}
	.cx-steps{display:flex;gap:8px;margin-top:10px}
	.cx-steps figure{margin:0;background:#14141C;border-radius:8px;padding:4px 4px 2px;text-align:center}
	.cx-steps figcaption{font-size:10.5px;color:rgba(245,245,247,.6)}
	.cx-cues{margin:10px 0 0;padding-left:16px;font-size:12.5px;color:rgba(245,245,247,.8)}
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
	// [name, kcal, protein g, tags] — tags: meat, red (red meat), pork, fish, shell, dairy, egg, gluten, nuts, soy
	const MEALS = {
		Breakfast: [
			["Greek yogurt, oats & berries", 420, 32, "dairy gluten"], ["Egg-white omelette, spinach, sourdough", 380, 30, "egg gluten"],
			["Overnight oats, whey & banana", 450, 35, "dairy gluten"], ["Avocado toast, 2 poached eggs", 460, 22, "egg gluten"],
			["Protein pancakes, berries", 430, 34, "egg dairy gluten"], ["Tofu scramble, peppers, rye toast", 410, 26, "soy gluten"],
			["Chia pudding, soy milk, mango & pumpkin seeds", 400, 18, "soy"], ["Smoked salmon & cream cheese bagel", 480, 30, "fish dairy gluten"],
			["Buckwheat porridge, almond butter & banana", 430, 14, "nuts"], ["Berry smoothie bowl, hemp seeds & buckwheat", 400, 16, ""]
		],
		Lunch: [
			["Grilled chicken, quinoa, roast vegetables", 620, 48, "meat"], ["Salmon poke bowl, brown rice, edamame", 650, 40, "fish soy"],
			["Turkey & hummus wrap, side salad", 560, 38, "meat gluten"], ["Lentil & feta salad, wholegrain bread", 580, 28, "dairy gluten"],
			["Chickpea curry, basmati rice", 600, 22, ""], ["Tofu stir-fry, soba noodles", 590, 30, "soy gluten"],
			["Tuna niçoise salad, potatoes, egg", 560, 42, "fish egg"], ["Black bean & quinoa bowl, avocado, salsa", 610, 24, ""],
			["Shrimp & avocado rice bowl", 590, 36, "shell"], ["Beef kofta, bulgur tabbouleh", 640, 42, "meat red gluten"]
		],
		Dinner: [
			["Lean beef, sweet potato, green beans", 650, 45, "meat red"], ["Baked cod, couscous, ratatouille", 560, 42, "fish gluten"],
			["Chicken fajitas, peppers, guacamole", 640, 44, "meat gluten"], ["Shrimp pasta, tomato & basil", 610, 36, "shell gluten"],
			["Black bean burrito bowl", 620, 26, ""], ["Halloumi & roast veg traybake, bulgur", 640, 28, "dairy gluten"],
			["Mushroom & spinach risotto, parmesan", 600, 22, "dairy"], ["Pork tenderloin, apple & roast potatoes", 620, 46, "meat pork"],
			["Tempeh & peanut noodle stir-fry", 630, 34, "soy nuts gluten"], ["Red lentil dhal, brown rice & spinach", 590, 26, ""],
			["Turkey meatballs, tomato sauce, rice", 620, 44, "meat"], ["Grilled salmon, new potatoes, asparagus", 610, 44, "fish"]
		],
		Snack: [
			["Cottage cheese & pineapple", 220, 24, "dairy"], ["Whey shake & apple", 260, 26, "dairy"],
			["Rice cakes, peanut butter", 240, 9, "nuts"], ["Hummus & veggie sticks", 200, 8, ""],
			["Boiled eggs & almonds", 250, 16, "egg nuts"], ["Soy yogurt, granola & berries", 230, 12, "soy gluten"],
			["Edamame with sea salt", 190, 17, "soy"], ["Roasted chickpeas & fruit", 210, 9, ""], ["Beef jerky & an orange", 200, 22, "meat red"]
		]
	};
	const DIETS = {
		any: { label: "Everything", no: [] },
		halal: { label: "Halal", no: ["pork"], note: "Use halal-certified meat." },
		kosher: { label: "Kosher", no: ["pork", "shell"], note: "Use kosher-certified meat and fish; no meat and dairy in the same meal." },
		pesca: { label: "Pescatarian", no: ["meat"] },
		veg: { label: "Vegetarian", no: ["meat", "fish", "shell"] },
		vegan: { label: "Vegan", no: ["meat", "fish", "shell", "dairy", "egg"] }
	};
	const ALLERGENS = [["dairy", "Dairy / lactose"], ["gluten", "Gluten"], ["egg", "Eggs"], ["nuts", "Nuts & peanuts"], ["soy", "Soy"], ["fish", "Fish"], ["shell", "Shellfish"], ["red", "Red meat"]];
	// French words people type → English words in dish names (or a tag)
	const FR = { champignon: "mushroom", saumon: "salmon", thon: "tuna", crevette: "shrimp", poulet: "chicken", "bœuf": "beef", boeuf: "beef", porc: "pork", dinde: "turkey", cabillaud: "cod",
		"œuf": "egg", oeuf: "egg", fromage: "cheese", lentille: "lentil", "pois chiche": "chickpea", avocat: "avocado", banane: "banana", "épinard": "spinach", epinard: "spinach", tofu: "tofu", "riz": "rice", "pâtes": "pasta", pates: "pasta", ananas: "pineapple", haricot: "bean", mangue: "mango" };
	function dislikeWords(txt0) {
		return (txt0 || "").toLowerCase().split(/[,;\n]+/).map((w) => w.trim()).filter(Boolean)
			.map((w) => FR[w] || FR[w.replace(/s$/, "")] || w.replace(/s$/, "")).filter((w) => w.length > 2);
	}
	function allowed(m, diet, ex, dis) {
		const tags = m[3].split(" ");
		const banned = (DIETS[diet] || DIETS.any).no.concat(ex);
		if (tags.some((t) => banned.includes(t))) return false;
		const name = m[0].toLowerCase();
		return !dis.some((w) => name.includes(w));
	}
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
		if (/vegan|végétalien|vegetalien/i.test(q)) p.diet = "vegan";
		else if (/vegetarian|veggie|végétarien|vegetarien|végé/i.test(q)) p.diet = "veg";
		else if (/halal/i.test(q)) p.diet = "halal";
		else if (/kosher|casher|cacher|kasher/i.test(q)) p.diet = "kosher";
		else if (/pescatarian|pescétarien|pescetarien/i.test(q)) p.diet = "pesca";
		if (/lactose|dairy|laitier/i.test(q)) (p.ex = p.ex || []).push("dairy");
		if (/gluten/i.test(q)) (p.ex = p.ex || []).push("gluten");
		if (/nut|noix|arachide|cacahu/i.test(q)) (p.ex = p.ex || []).push("nuts");
		return p;
	}

	function setupForm(p) {
		const c = calc();
		const goal = p.goal || (c && /lose|cut|deficit/i.test(c.goal) ? "lose" : c && /gain|bulk|build/i.test(c.goal) ? "build" : "maintain");
		const maint = maintenance() || 2400;
		let last = {};
		try { last = JSON.parse(localStorage.getItem("apex_food_prefs")) || {}; } catch (_) {}
		const seg = (name, opts, val) => `<div class="cx-seg" role="radiogroup" aria-label="${name}">` + opts.map(([v, l]) =>
			`<label><input type="radio" name="${name}" value="${v}"${String(v) === String(val) ? " checked" : ""}><span>${l}</span></label>`).join("") + "</div>";
		return `<form class="cx-setup">
			<div class="cx-f"><span>Goal</span>${seg("goal", [["lose", "Lose fat"], ["maintain", "Maintain"], ["build", "Build muscle"]], goal)}</div>
			<div class="cx-f"><span>Length</span>${seg("weeks", [[1, "1 week"], [2, "2 weeks"], [3, "3 weeks"], [4, "1 month"]], p.weeks || 4)}</div>
			<div class="cx-f"><span>Training days / week</span>${seg("days", [[2, "2"], [3, "3"], [4, "4"], [5, "5"]], p.days || 3)}</div>
			<div class="cx-f"><span>Meals / day</span>${seg("meals", [[3, "3"], [4, "4"]], p.meals || 4)}</div>
			<div class="cx-f"><span>Diet</span>${seg("diet", Object.entries(DIETS).map(([k, d]) => [k, d.label]), p.diet || last.diet || "any")}</div>
			<div class="cx-f"><span>Allergies & foods to avoid</span><div class="cx-seg">${ALLERGENS.map(([k, l]) =>
				`<label><input type="checkbox" name="ex" value="${k}"${(p.ex || last.ex || []).includes(k) ? " checked" : ""}><span>${l}</span></label>`).join("")}</div>
			<label class="cx-num cx-txt"><input type="text" name="avoid" maxlength="120" placeholder="Other foods you don't like, e.g. mushrooms, tuna" value="${esc(last.avoid || "")}"></label></div>
			<div class="cx-f"><span>Maintenance calories</span><label class="cx-num"><input type="number" name="maint" min="1400" max="4500" step="1" value="${maint}"> kcal/day</label>
			<small>${maintenance() ? "From your calculator." : "An estimate. Use the calculator in My Space for yours."}</small></div>
			<button type="submit" class="cx-chip primary cx-build">Build my program</button>
		</form>`;
	}

	function dietText(P) {
		const parts = [DIETS[P.diet].label];
		if (P.ex.length) parts.push("no " + P.ex.map((k) => ALLERGENS.find(([a]) => a === k)[1].toLowerCase()).join(", no "));
		if (P.avoid) parts.push("avoiding " + P.avoid);
		return parts.join(", ") + (DIETS[P.diet].note ? ". " + DIETS[P.diet].note : "");
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
					let pool = MEALS[s].filter((m) => allowed(m, p.diet, p.ex, p.dis));
					if (!pool.length) pool = [["Custom meal — ask Priya (dietitian) for a swap", MEALS[s][0][1], MEALS[s][0][2], ""]];
					return [s, pool[((w * 7 + d) * (k + 2) + k + w + (p.seed || 0) * 3) % pool.length]];
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
				`<div class="cx-row cx-mrow"><span class="cx-meta">${e.sets} × ${e.reps}</span><span>${e.name}${e.note ? ` <em class="cx-meta">${e.note}</em>` : ""}${EXERCISES[e.name] ? ` <button type="button" class="cx-how" data-ex="${e.name}" aria-expanded="false">How to</button>` : ""}</span><span class="cx-meta">${e.rest}</span></div>`).join("")
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
					["Diet", dietText(P)], ["Created", new Date().toLocaleDateString("en-GB")]]
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


	/* ---------- body metrics: computed in code, always available ---------- */
	function savedProfile() {
		const w = num("c-weight"), h = num("c-height");
		if (w && h) return profile();
		try { return JSON.parse(localStorage.getItem("apex_profile")) || {}; } catch (_) { return {}; }
	}
	function metricForm(kind, pr) {
		const f = (name, label, val, min, max, opt) => `<label class="cx-mf"><span>${label}</span><input type="number" name="${name}" min="${min}" max="${max}" step="0.1" value="${val || ""}"${opt ? "" : " required"}></label>`;
		const sex = (pr.sex || "male").toLowerCase().startsWith("f") ? "female" : "male";
		const sexSeg = `<div class="cx-seg" role="radiogroup" aria-label="Sex">${[["male", "Male"], ["female", "Female"]].map(([v, l]) => `<label><input type="radio" name="sex" value="${v}"${v === sex ? " checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
		let fields = f("weight", "Weight (kg)", pr.weight, 30, 250) + f("height", "Height (cm)", pr.height, 120, 230);
		if (kind === "bodyfat") fields = sexSeg + f("height", "Height (cm)", pr.height, 120, 230) + f("waist", "Waist at navel (cm)", pr.waist, 40, 200) + f("neck", "Neck (cm)", pr.neck, 20, 70) + f("hip", "Hips, widest point (cm) · women", pr.hip, 50, 200, true);
		if (kind === "water") fields += f("hours", "Training hours per week", pr.hours || 4, 0, 30);
		return `<form class="cx-setup cx-metric" data-kind="${kind}">${fields}<button type="submit" class="cx-chip primary cx-build">Calculate</button></form>`;
	}
	function bmiAnswer(pr) {
		const m = pr.height / 100, bmi = pr.weight / (m * m);
		const cat = bmi < 18.5 ? "underweight" : bmi < 25 ? "a healthy range" : bmi < 30 ? "overweight" : "obesity range";
		const lo = Math.round(18.5 * m * m), hi = Math.round(24.9 * m * m);
		const diff = pr.weight < lo ? `about ${Math.round(lo - pr.weight)} kg below` : pr.weight > hi ? `about ${Math.round(pr.weight - hi)} kg above` : "inside";
		return {
			text: `Your BMI is ${bmi.toFixed(1)} (${pr.weight} kg, ${pr.height} cm), which is ${cat}. For your height, a healthy weight range is ${lo}–${hi} kg; you're ${diff} it. BMI = weight ÷ height² (${pr.weight} ÷ ${m.toFixed(2)}²). It doesn't tell muscle from fat, so if you lift regularly, body fat is the better measure.`,
			html: `<div class="cx-sum"><div><b>${bmi.toFixed(1)}</b><span>BMI</span></div><div><b>${lo}–${hi}</b><span>healthy kg</span></div><div><b>${pr.weight} kg</b><span>your weight</span></div></div>`,
			chips: [{ label: "Estimate my body fat", ask: "How can I estimate my body fat percentage?" }, { label: "How much water should I drink?", ask: "How much water should I drink per day, including training days?" }]
		};
	}
	function waterAnswer(pr) {
		const base = pr.weight * 0.035, h = +pr.hours || 0, perSession = 0.6;
		const trainDay = base + perSession;
		return {
			text: `About ${base.toFixed(1)} L a day on rest days (35 ml × ${pr.weight} kg), and ${trainDay.toFixed(1)}–${(base + 0.75).toFixed(1)} L on training days: add 0.5–0.75 L per hour of training, more in Miami heat or if you sweat a lot. ${h ? `Over your ${h} training hours a week that's roughly ${(base * 7 + h * 0.6).toFixed(0)} L a week. ` : ""}Food covers about 20% of it. Simple check: pale-yellow urine means you're on track.`,
			html: `<div class="cx-sum"><div><b>${base.toFixed(1)} L</b><span>rest day</span></div><div><b>${trainDay.toFixed(1)} L</b><span>training day</span></div><div><b>0.5 L</b><span>2 h before training</span></div></div>`,
			chips: [{ label: "What's my BMI?", ask: "What's my BMI and what's a healthy weight range for me?" }, { label: "Build my training + meal program", ask: "Build me a program with training and meals" }]
		};
	}
	function bodyfatAnswer(pr) {
		const L = Math.log10, female = (pr.sex || "").toLowerCase().startsWith("f");
		if (female && !pr.hip) return { text: "For women the formula also needs your hip measurement. Add it and tap Calculate.", html: metricForm("bodyfat", pr) };
		const bf = female
			? 495 / (1.29579 - 0.35004 * L(+pr.waist + +pr.hip - +pr.neck) + 0.221 * L(+pr.height)) - 450
			: 495 / (1.0324 - 0.19077 * L(+pr.waist - +pr.neck) + 0.15456 * L(+pr.height)) - 450;
		if (!isFinite(bf) || bf < 2 || bf > 60) return { text: "Those measurements don't give a realistic result. Check that waist is measured at the navel and neck just below the Adam's apple, then try again.", html: metricForm("bodyfat", pr) };
		const cuts = female ? [[14, "athletic"], [21, "athletic"], [25, "fit"], [32, "average"], [99, "above average"]] : [[6, "athletic"], [14, "athletic"], [18, "fit"], [25, "average"], [99, "above average"]];
		const cat = cuts.find(([c]) => bf < c)[1];
		const w = +pr.weight || num("c-weight");
		const fatKg = w ? (w * bf / 100) : null;
		return {
			text: `Estimated body fat: ${bf.toFixed(1)}% (US Navy method, ${female ? "waist + hips − neck" : "waist − neck"} vs height), which is ${cat} for ${female ? "women" : "men"}.${fatKg ? ` That's about ${fatKg.toFixed(1)} kg of fat and ${(w - fatKg).toFixed(1)} kg of lean mass.` : ""} Expect ±3–4% versus a DEXA scan. Measure the same way every 2–4 weeks: the trend matters more than the number.`,
			html: `<div class="cx-sum"><div><b>${bf.toFixed(1)}%</b><span>body fat</span></div><div><b>${female ? "21–31%" : "14–24%"}</b><span>fit to average</span></div><div><b>${cat}</b><span>category</span></div></div>`,
			chips: [{ label: "Build a fat-loss program", ask: "Build me a 1 month fat loss program" }, { label: "What's my BMI?", ask: "What's my BMI and what's a healthy weight range for me?" }]
		};
	}
	/* ---------- exercise demos: original SVG figure, step by step, with tempo ---------- */
	// Poses are joint coordinates (side view unless noted). Missing *2 points mirror the first side.
	const STAND = { head: [61, 22], sh: [60, 34], el: [60, 53], ha: [61, 71], hip: [60, 70], kn: [60, 100], an: [60, 130], toe: [71, 130] };
	const P = (o) => Object.assign({}, STAND, o);
	const PATTERNS = {
		squat: { a: P({ el: [50, 42], ha: [57, 33] }), b: P({ head: [66, 54], sh: [60, 66], el: [50, 72], ha: [57, 64], hip: [40, 100], kn: [72, 102] }), gear: "barBack", end: "Bottom",
			phases: [["Lower", 3, "a", "b"], ["Pause", 1, "b", "b"], ["Drive up", 1, "b", "a"]], cues: ["Brace, then sit between your hips", "Knees track over the toes", "Stand up through the whole foot"] },
		goblet: { a: P({ el: [64, 50], ha: [70, 42] }), b: P({ head: [62, 52], sh: [57, 64], el: [62, 82], ha: [70, 72], hip: [40, 100], kn: [72, 102] }), gear: "dbHand", end: "Bottom",
			phases: [["Lower", 3, "a", "b"], ["Pause", 1, "b", "b"], ["Drive up", 1, "b", "a"]], cues: ["Weight held against the chest", "Elbows inside the knees at the bottom", "Chest up, back neutral"] },
		hinge: { a: P({ ha: [61, 72] }), b: P({ head: [93, 58], sh: [82, 63], el: [82, 81], ha: [82, 99], hip: [47, 75], kn: [63, 101] }), gear: "barHand", end: "Hinge",
			phases: [["Hinge down", 3, "a", "b"], ["Pause", 1, "b", "b"], ["Stand tall", 1, "b", "a"]], cues: ["Push the hips back, soft knees", "Bar slides close to the legs", "Flat back, squeeze the glutes to finish"] },
		row: { a: P({ head: [87, 46], sh: [79, 52], el: [79, 70], ha: [79, 88], hip: [50, 76], kn: [63, 101] }), b: P({ head: [87, 46], sh: [79, 52], el: [62, 58], ha: [70, 72], hip: [50, 76], kn: [63, 101] }), gear: "barHand", end: "Pull",
			phases: [["Pull", 1, "a", "b"], ["Squeeze", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Torso still, about 45°", "Pull the elbows toward the hips", "Shoulder blades together at the top"] },
		pullup: { a: P({ head: [61, 33], sh: [60, 44], el: [61, 28], ha: [61, 12], hip: [60, 80], kn: [64, 106], an: [58, 128], toe: [66, 130] }), b: P({ head: [61, 13], sh: [60, 24], el: [48, 28], ha: [61, 12], hip: [60, 60], kn: [64, 86], an: [58, 108], toe: [66, 110] }), gear: "pullBar", end: "Top",
			phases: [["Pull up", 1, "a", "b"], ["Squeeze", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Start from a dead hang, shoulders set", "Lead with the chest", "Full control on the way down"] },
		bench: { a: { head: [31, 92], sh: [40, 96], el: [41, 78], ha: [42, 60], hip: [76, 96], kn: [97, 96], an: [100, 130], toe: [110, 130] }, b: { head: [31, 92], sh: [40, 96], el: [33, 104], ha: [45, 87], hip: [76, 96], kn: [97, 96], an: [100, 130], toe: [110, 130] }, gear: "bench", end: "Bar to chest",
			phases: [["Lower", 3, "a", "b"], ["Pause", 1, "b", "b"], ["Press", 1, "b", "a"]], cues: ["Feet planted, shoulder blades pinned", "Touch the lower chest", "Press up and slightly back"] },
		pushup: { a: { head: [36, 96], sh: [44, 101], el: [44, 115], ha: [44, 130], hip: [79, 114], kn: [97, 121], an: [113, 128], toe: [115, 130] }, b: { head: [36, 113], sh: [44, 117], el: [57, 121], ha: [44, 130], hip: [79, 122], kn: [97, 125], an: [113, 128], toe: [115, 130] }, gear: "", end: "Chest down",
			phases: [["Lower", 3, "a", "b"], ["Pause", 1, "b", "b"], ["Push up", 1, "b", "a"]], cues: ["Body in one straight line", "Elbows about 45° from the body", "Chest to fist height"] },
		ohp: { a: P({ el: [70, 44], ha: [64, 32] }), b: P({ el: [62, 14], ha: [61, -4] }), gear: "barHand", end: "Overhead",
			phases: [["Press", 1, "a", "b"], ["Lock out", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Squeeze glutes and abs", "Head through once the bar passes", "Bar finishes over the mid-foot"] },
		lateral: { front: true, a: { head: [60, 22], sh: [50, 34], sh2: [70, 34], el: [46, 52], el2: [74, 52], ha: [44, 70], ha2: [76, 70], hip: [54, 70], hip2: [66, 70], kn: [54, 100], kn2: [66, 100], an: [54, 130], an2: [66, 130] },
			b: { head: [60, 22], sh: [50, 34], sh2: [70, 34], el: [32, 36], el2: [88, 36], ha: [15, 38], ha2: [105, 38], hip: [54, 70], hip2: [66, 70], kn: [54, 100], kn2: [66, 100], an: [54, 130], an2: [66, 130] }, gear: "dbHand", end: "Shoulder height",
			phases: [["Raise", 1, "a", "b"], ["Hold", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Slight bend in the elbows", "Lead with the elbows, not the hands", "Stop at shoulder height"] },
		curl: { a: P({ el: [60, 53], ha: [63, 71] }), b: P({ el: [60, 53], ha: [70, 37] }), gear: "dbHand", end: "Top",
			phases: [["Curl", 1, "a", "b"], ["Squeeze", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Elbows pinned to your sides", "No swinging from the back", "Lower all the way to straight arms"] },
		pushdown: { a: P({ el: [62, 54], ha: [78, 49] }), b: P({ el: [62, 54], ha: [65, 72] }), gear: "cable", end: "Arms straight",
			phases: [["Push down", 1, "a", "b"], ["Squeeze", 1, "b", "b"], ["Return", 3, "b", "a"]], cues: ["Elbows stay by the ribs", "Only the forearms move", "Full lockout at the bottom"] },
		plank: { a: { head: [37, 106], sh: [46, 112], el: [46, 130], ha: [60, 130], hip: [79, 118], kn: [97, 124], an: [113, 128], toe: [115, 130] }, gear: "", end: "Hold", hold: true,
			phases: [["Hold", 30, "a", "a"]], cues: ["Elbows under the shoulders", "Squeeze glutes, ribs down", "Breathe slowly, don't let hips sag"] },
		deadbug: { a: { head: [29, 119], sh: [40, 124], el: [40, 108], ha: [40, 92], el2: [41, 108], ha2: [41, 92], hip: [72, 124], kn: [72, 102], an: [90, 102], kn2: [73, 102], an2: [91, 102] },
			b: { head: [29, 119], sh: [40, 124], el: [27, 114], ha: [15, 120], el2: [41, 108], ha2: [41, 92], hip: [72, 124], kn: [91, 117], an: [110, 121], kn2: [73, 102], an2: [91, 102] }, gear: "floor", end: "Extend",
			phases: [["Extend", 2, "a", "b"], ["Return", 2, "b", "a"]], cues: ["Lower back pressed into the floor", "Opposite arm and leg move together", "Exhale as you extend"] },
		lunge: { a: P({ head: [57, 28], sh: [56, 40], el: [57, 58], ha: [58, 76], hip: [56, 76], kn: [70, 102], an: [78, 130], toe: [88, 130], kn2: [46, 104], an2: [34, 128] }),
			b: P({ head: [53, 52], sh: [52, 64], el: [53, 82], ha: [54, 100], hip: [52, 100], kn: [78, 102], an: [78, 130], toe: [88, 130], kn2: [48, 124], an2: [30, 126] }), gear: "", end: "Bottom",
			phases: [["Lower", 3, "a", "b"], ["Pause", 1, "b", "b"], ["Drive up", 1, "b", "a"]], cues: ["Front shin close to vertical", "Back knee just above the floor", "Push through the front heel"] },
		bridge: { a: { head: [29, 93], sh: [38, 98], el: [48, 108], ha: [60, 110], hip: [62, 118], kn: [84, 104], an: [90, 130], toe: [100, 130] }, b: { head: [29, 93], sh: [38, 98], el: [48, 98], ha: [62, 96], hip: [64, 96], kn: [86, 98], an: [90, 130], toe: [100, 130] }, gear: "box", end: "Hips up",
			phases: [["Drive hips up", 1, "a", "b"], ["Squeeze", 2, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Upper back on the bench", "Chin tucked, ribs down", "Shins vertical at the top"] },
		legpress: { a: { head: [27, 76], sh: [34, 84], el: [44, 96], ha: [56, 104], hip: [60, 110], kn: [78, 82], an: [92, 98], toe: [98, 92] }, b: { head: [27, 76], sh: [34, 84], el: [44, 96], ha: [56, 104], hip: [60, 110], kn: [88, 94], an: [116, 82], toe: [122, 76] }, gear: "sled", end: "Legs extended",
			phases: [["Press", 1, "b", "b"], ["Lower", 3, "b", "a"], ["Press", 1, "a", "b"]], cues: ["Lower back stays on the pad", "Knees in line with the feet", "Don't lock the knees hard"] },
		legcurl: { a: { head: [19, 92], sh: [30, 96], el: [24, 106], ha: [14, 106], hip: [66, 96], kn: [96, 96], an: [124, 98], toe: [128, 92] }, b: { head: [19, 92], sh: [30, 96], el: [24, 106], ha: [14, 106], hip: [66, 96], kn: [96, 96], an: [104, 69], toe: [110, 66] }, gear: "bench", end: "Curled",
			phases: [["Curl", 1, "a", "b"], ["Squeeze", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Hips pressed into the pad", "Curl the heels toward the glutes", "Slow on the way back"] },
		calf: { a: P({}), b: P({ head: [61, 14], sh: [60, 26], el: [60, 45], ha: [61, 63], hip: [60, 62], kn: [60, 92], an: [62, 122], toe: [71, 130] }), gear: "step", end: "On the toes",
			phases: [["Rise", 1, "a", "b"], ["Hold", 1, "b", "b"], ["Lower", 3, "b", "a"]], cues: ["Full stretch at the bottom", "Rise onto the big toe", "Pause at the top"] },
		carry: { a: P({ ha: [61, 72], kn: [66, 100], an: [72, 130], toe: [82, 130], kn2: [54, 100], an2: [48, 130] }), b: P({ ha: [61, 72], kn: [54, 100], an: [48, 130], toe: [58, 130], kn2: [66, 100], an2: [72, 130] }), gear: "dbHand", end: "Walk",
			phases: [["Step", 0.6, "a", "b"], ["Step", 0.6, "b", "a"]], cues: ["Stand tall, shoulders down", "Short, quick steps", "Grip hard, don't let the weights swing"] }
	};
	const EXERCISES = {
		"Back squat": "squat", "Front squat": "squat", "Goblet squat": "goblet", "Leg press": "legpress",
		"Romanian deadlift": "hinge", "Deadlift": "hinge", "Back extension": "hinge",
		"Walking lunge": "lunge", "Split squat": "lunge", "Hip thrust": "bridge", "Leg curl": "legcurl", "Calf raise": "calf",
		"Bench press": "bench", "Dumbbell bench press": "bench", "Incline dumbbell press": "bench", "Push-up": "pushup", "Overhead press": "ohp",
		"Lateral raise": "lateral", "Bent-over row": "row", "Barbell row": "row", "Dumbbell row": "row", "Seated cable row": "row", "Face pull": "row",
		"Lat pulldown": "pullup", "Assisted pull-up": "pullup", "Biceps curl": "curl", "Hammer curl": "curl", "Triceps pushdown": "pushdown",
		"Plank": "plank", "Dead bug": "deadbug", "Farmer carry": "carry"
	};
	// Words people use in questions (EN + FR) → exercise name
	const ALIASES = [[/squat/i, "Back squat"], [/goblet/i, "Goblet squat"], [/soulev[ée] de terre|deadlift/i, "Deadlift"], [/romanian|rdl|roumain/i, "Romanian deadlift"],
		[/d[ée]velopp[ée] couch[ée]|bench/i, "Bench press"], [/pompes?|push-?ups?/i, "Push-up"], [/d[ée]velopp[ée] militaire|overhead press|shoulder press|military press/i, "Overhead press"],
		[/[ée]l[ée]vations? lat[ée]rales?|lateral raise/i, "Lateral raise"], [/rowing|\brow\b/i, "Bent-over row"], [/tractions?|pull-?ups?|chin-?ups?/i, "Assisted pull-up"], [/tirage vertical|pulldown/i, "Lat pulldown"],
		[/curl/i, "Biceps curl"], [/triceps/i, "Triceps pushdown"], [/planche|gainage|plank/i, "Plank"], [/dead ?bug/i, "Dead bug"], [/fentes?|lunges?/i, "Walking lunge"],
		[/hip thrust|pont fessier|glute bridge/i, "Hip thrust"], [/presse|leg press/i, "Leg press"], [/leg curl|ischios?/i, "Leg curl"], [/mollets?|calf/i, "Calf raise"], [/farmer|marche du fermier/i, "Farmer carry"]];
	function exerciseIn(text) { for (const [re, ex] of ALIASES) if (re.test(text)) return ex; return null; }

	function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
	function poseAt(pat, from, to, t) {
		const A = pat[from] || pat.a, B = pat[to] || pat.a, out = {};
		Object.keys(Object.assign({}, A, B)).forEach((k) => { out[k] = lerp(A[k] || B[k], B[k] || A[k], t); });
		return out;
	}
	function gearSvg(g, p) {
		const H = p.ha, H2 = p.ha2 || p.ha;
		const pink = 'stroke="#FF2E7E" fill="#FF2E7E"';
		switch (g) {
			case "barBack": return `<line x1="${p.sh[0] - 4}" y1="${p.sh[1] - 1}" x2="${p.sh[0] + 4}" y2="${p.sh[1] - 1}" stroke="#FF2E7E" stroke-width="3"/><circle cx="${p.sh[0] - 1}" cy="${p.sh[1] - 1}" r="7" fill="none" stroke="#FF2E7E" stroke-width="3"/>`;
			case "barHand": return `<circle cx="${H[0]}" cy="${H[1]}" r="7" fill="none" stroke="#FF2E7E" stroke-width="3"/>`;
			case "dbHand": return `<rect x="${H[0] - 5}" y="${H[1] - 2.5}" width="10" height="5" rx="2" ${pink}/>` + (p.ha2 ? `<rect x="${H2[0] - 5}" y="${H2[1] - 2.5}" width="10" height="5" rx="2" ${pink}/>` : "");
			case "pullBar": return `<line x1="35" y1="12" x2="95" y2="12" stroke="#FF2E7E" stroke-width="3" stroke-linecap="round"/>`;
			case "bench": return `<line x1="22" y1="102" x2="100" y2="102" stroke="rgba(245,245,247,.35)" stroke-width="5"/><line x1="40" y1="104" x2="40" y2="130" stroke="rgba(245,245,247,.35)" stroke-width="3"/><line x1="90" y1="104" x2="90" y2="130" stroke="rgba(245,245,247,.35)" stroke-width="3"/>` + (p.ha[1] < 95 && p.ha[0] < 60 ? `<circle cx="${H[0]}" cy="${H[1]}" r="7" fill="none" stroke="#FF2E7E" stroke-width="3"/>` : "");
			case "cable": return `<line x1="96" y1="-8" x2="${H[0]}" y2="${H[1]}" stroke="#FF2E7E" stroke-width="1.5"/><rect x="${H[0] - 5}" y="${H[1] - 2}" width="10" height="4" rx="2" ${pink}/>`;
			case "box": return `<rect x="16" y="98" width="26" height="32" rx="3" fill="rgba(245,245,247,.18)"/><rect x="${p.hip[0] - 8}" y="${p.hip[1] - 9}" width="16" height="5" rx="2" ${pink}/>`;
			case "sled": return `<line x1="${p.toe[0] + 6}" y1="${p.toe[1] - 14}" x2="${p.an[0] - 4}" y2="${p.an[1] + 14}" stroke="#FF2E7E" stroke-width="4" stroke-linecap="round"/><line x1="28" y1="72" x2="64" y2="116" stroke="rgba(245,245,247,.35)" stroke-width="5"/>`;
			case "step": return `<rect x="56" y="130" width="24" height="8" fill="rgba(245,245,247,.25)"/>`;
			case "floor": return "";
			default: return "";
		}
	}
	function figureSvg(pat, p, size) {
		const q = Object.assign({}, p);
		["sh", "el", "ha", "hip", "kn", "an"].forEach((k) => { if (!q[k + "2"]) q[k + "2"] = q[k]; });
		const p2 = q; const segQ = (a, b, w) => p2[a] && p2[b] ? `<line x1="${p2[a][0].toFixed(1)}" y1="${p2[a][1].toFixed(1)}" x2="${p2[b][0].toFixed(1)}" y2="${p2[b][1].toFixed(1)}" stroke-width="${w}"/>` : "";
		const backQ = `<g stroke="rgba(245,245,247,.45)" stroke-linecap="round">${segQ("sh2", "el2", 4)}${segQ("el2", "ha2", 4)}${segQ("hip2", "kn2", 5)}${segQ("kn2", "an2", 5)}${pat.front ? segQ("sh", "sh2", 5) + segQ("hip", "hip2", 5) + segQ("hip2", "sh2", 6) : ""}</g>`;
		const front = `<g stroke="#F5F5F7" stroke-linecap="round">${segQ("hip", "sh", 6)}${segQ("sh", "el", 4)}${segQ("el", "ha", 4)}${segQ("hip", "kn", 5)}${segQ("kn", "an", 5)}${segQ("an", "toe", 4)}</g>`;
		const head = `<circle cx="${p.head[0].toFixed(1)}" cy="${p.head[1].toFixed(1)}" r="7" fill="#F5F5F7"/>`;
		return `<svg viewBox="0 -14 140 154" width="${size}" height="${size * 1.1}" aria-hidden="true"><line x1="0" y1="131" x2="140" y2="131" stroke="rgba(245,245,247,.15)" stroke-width="1"/>${backQ}${gearSvg(pat.gear, p)}${front}${head}</svg>`;
	}
	/* ---------- front view: stance width, grip width, knee tracking ---------- */
	// Left-side points only; the right side is mirrored around x = 60 unless given.
	const FSTAND = { head: [60, 22], sh: [48, 34], el: [46, 52], ha: [46, 70], hip: [54, 70], kn: [53, 100], an: [52, 130] };
	function F(o) {
		const p = Object.assign({}, FSTAND, o);
		["sh", "el", "ha", "hip", "kn", "an"].forEach((k) => { if (!p[k + "2"]) p[k + "2"] = [120 - p[k][0], p[k][1]]; });
		return p;
	}
	const FRONT = {
		squat: { a: F({ el: [36, 40], ha: [38, 30], an: [46, 130], kn: [47, 100] }), b: F({ head: [60, 50], sh: [48, 62], el: [36, 68], ha: [38, 58], hip: [52, 98], kn: [38, 102], an: [46, 130] }), gear: "barShoulders" },
		goblet: { a: F({ el: [48, 50], ha: [56, 44], an: [46, 130], kn: [47, 100] }), b: F({ head: [60, 50], sh: [48, 62], el: [44, 78], ha: [56, 72], hip: [52, 98], kn: [38, 102], an: [46, 130] }), gear: "dbCenter" },
		hinge: { a: F({ el: [47, 52], ha: [50, 72] }), b: F({ head: [60, 52], sh: [48, 60], el: [48, 78], ha: [50, 96], hip: [54, 74], kn: [53, 101] }), gear: "barWide" },
		row: { a: F({ head: [60, 44], sh: [48, 52], el: [48, 70], ha: [50, 88], hip: [54, 76], kn: [53, 101] }), b: F({ head: [60, 44], sh: [48, 52], el: [30, 56], ha: [48, 68], hip: [54, 76], kn: [53, 101] }), gear: "barWide" },
		pullup: { a: F({ head: [60, 33], sh: [48, 44], el: [36, 28], ha: [30, 12], hip: [54, 80], kn: [53, 106], an: [53, 128] }), b: F({ head: [60, 13], sh: [48, 24], el: [28, 30], ha: [30, 12], hip: [54, 60], kn: [53, 86], an: [53, 108] }), gear: "pullBar" },
		bench: { a: F({ head: [60, 90], sh: [46, 98], el: [38, 80], ha: [34, 62], hip: [54, 100], kn: [44, 104], an: [40, 130] }), b: F({ head: [60, 90], sh: [46, 98], el: [28, 104], ha: [34, 86], hip: [54, 100], kn: [44, 104], an: [40, 130] }), gear: "benchBar" },
		pushup: { a: F({ head: [60, 94], sh: [47, 101], el: [40, 115], ha: [36, 130], hip: [55, 108], kn: [56, 112], an: [57, 116] }), b: F({ head: [60, 110], sh: [47, 117], el: [30, 121], ha: [36, 130], hip: [55, 120], kn: [56, 122], an: [57, 124] }), gear: "" },
		ohp: { a: F({ el: [38, 46], ha: [42, 32] }), b: F({ el: [42, 14], ha: [44, -4] }), gear: "barHandsFront" },
		lateral: null,
		curl: { a: F({ el: [46, 53], ha: [45, 71] }), b: F({ el: [46, 53], ha: [45, 40] }), gear: "dbBoth" },
		pushdown: { a: F({ el: [46, 54], ha: [54, 48] }), b: F({ el: [46, 54], ha: [48, 72] }), gear: "cableFront" },
		plank: { a: F({ head: [60, 104], sh: [48, 112], el: [48, 130], ha: [55, 130], hip: [55, 116], kn: [56, 119], an: [57, 122] }), gear: "" },
		deadbug: { a: F({ head: [60, 116], sh: [48, 122], el: [48, 106], ha: [50, 90], hip: [54, 124], kn: [52, 104], an: [52, 100] }),
			b: F({ head: [60, 116], sh: [48, 122], el: [46, 118], ha: [44, 124], el2: [72, 106], ha2: [70, 90], hip: [54, 124], kn: [52, 104], an: [52, 100], kn2: [67, 114], an2: [70, 126] }), gear: "" },
		lunge: { a: F({ hip: [53, 76], kn: [51, 102], an: [50, 130], kn2: [69, 104], an2: [71, 128] }), b: F({ head: [60, 52], sh: [48, 64], el: [46, 82], ha: [46, 100], hip: [53, 100], kn: [50, 102], an: [50, 130], hip2: [67, 100], kn2: [70, 124], an2: [72, 128] }), gear: "" },
		bridge: { a: F({ head: [60, 94], sh: [48, 98], el: [44, 108], ha: [52, 112], hip: [52, 118], kn: [44, 104], an: [46, 130] }), b: F({ head: [60, 94], sh: [48, 98], el: [44, 100], ha: [52, 96], hip: [52, 96], kn: [44, 98], an: [46, 130] }), gear: "boxFront" },
		legpress: { a: F({ head: [60, 76], sh: [48, 84], el: [42, 98], ha: [44, 108], hip: [52, 110], kn: [44, 86], an: [46, 98] }), b: F({ head: [60, 76], sh: [48, 84], el: [42, 98], ha: [44, 108], hip: [52, 110], kn: [46, 96], an: [46, 84] }), gear: "sledFront" },
		legcurl: { a: F({ head: [60, 88], sh: [48, 94], el: [44, 100], ha: [46, 106], hip: [54, 98], kn: [54, 100], an: [54, 102] }), b: F({ head: [60, 88], sh: [48, 94], el: [44, 100], ha: [46, 106], hip: [54, 98], kn: [54, 100], an: [54, 72] }), gear: "benchFront" },
		calf: { a: F({ an: [53, 130] }), b: F({ head: [60, 14], sh: [48, 26], el: [46, 44], ha: [46, 62], hip: [54, 62], kn: [53, 92], an: [53, 122] }), gear: "stepFront" },
		carry: { a: F({ ha: [42, 72], an: [50, 130], an2: [68, 126] }), b: F({ ha: [42, 72], an: [52, 126], an2: [70, 130] }), gear: "dbBoth" }
	};
	function frontGear(g, p) {
		const pink = 'stroke="#FF2E7E" fill="#FF2E7E"', line = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FF2E7E" stroke-width="${w || 3}" stroke-linecap="round"/>`;
		const H = p.ha, H2 = p.ha2;
		switch (g) {
			case "barShoulders": return line(18, p.sh[1] - 4, 102, p.sh[1] - 4) + `<rect x="12" y="${p.sh[1] - 12}" width="6" height="16" rx="2" ${pink}/><rect x="102" y="${p.sh[1] - 12}" width="6" height="16" rx="2" ${pink}/>`;
			case "barWide": case "barHandsFront": return line(18, H[1], 102, H2[1]) + `<rect x="12" y="${H[1] - 8}" width="6" height="16" rx="2" ${pink}/><rect x="102" y="${H2[1] - 8}" width="6" height="16" rx="2" ${pink}/>`;
			case "dbCenter": return `<rect x="54" y="${H[1] - 4}" width="12" height="8" rx="2" ${pink}/>`;
			case "dbBoth": return `<rect x="${H[0] - 3}" y="${H[1] - 6}" width="6" height="12" rx="2" ${pink}/><rect x="${H2[0] - 3}" y="${H2[1] - 6}" width="6" height="12" rx="2" ${pink}/>`;
			case "pullBar": return line(10, 12, 110, 12);
			case "benchFront": case "benchBar": return `<rect x="40" y="100" width="40" height="6" rx="2" fill="rgba(245,245,247,.35)"/><line x1="44" y1="106" x2="44" y2="130" stroke="rgba(245,245,247,.35)" stroke-width="3"/><line x1="76" y1="106" x2="76" y2="130" stroke="rgba(245,245,247,.35)" stroke-width="3"/>` + (g === "benchBar" ? line(18, H[1], 102, H2[1]) : "");
			case "cableFront": return line(60, -8, H[0], H[1], 1.5) + line(60, -8, H2[0], H2[1], 1.5);
			case "boxFront": return `<rect x="36" y="98" width="48" height="32" rx="3" fill="rgba(245,245,247,.18)"/><rect x="44" y="${p.hip[1] - 9}" width="32" height="5" rx="2" ${pink}/>`;
			case "sledFront": return `<rect x="34" y="${p.an[1] - 10}" width="52" height="20" rx="3" fill="none" stroke="#FF2E7E" stroke-width="3"/>`;
			case "stepFront": return `<rect x="40" y="130" width="40" height="8" fill="rgba(245,245,247,.25)"/>`;
			default: return "";
		}
	}
	function frontSvg(key, p, size) {
		const s = (a, b, w) => p[a] && p[b] ? `<line x1="${p[a][0].toFixed(1)}" y1="${p[a][1].toFixed(1)}" x2="${p[b][0].toFixed(1)}" y2="${p[b][1].toFixed(1)}" stroke-width="${w}"/>` : "";
		const feet = `<line x1="${p.an[0].toFixed(1)}" y1="${p.an[1].toFixed(1)}" x2="${(p.an[0] - 5).toFixed(1)}" y2="${(p.an[1] + 1).toFixed(1)}" stroke-width="4"/><line x1="${p.an2[0].toFixed(1)}" y1="${p.an2[1].toFixed(1)}" x2="${(p.an2[0] + 5).toFixed(1)}" y2="${(p.an2[1] + 1).toFixed(1)}" stroke-width="4"/>`;
		const body = `<g stroke="#F5F5F7" stroke-linecap="round">${s("sh", "sh2", 5)}${s("sh", "hip", 5)}${s("sh2", "hip2", 5)}${s("hip", "hip2", 5)}${s("sh", "el", 4)}${s("el", "ha", 4)}${s("sh2", "el2", 4)}${s("el2", "ha2", 4)}${s("hip", "kn", 5)}${s("kn", "an", 5)}${s("hip2", "kn2", 5)}${s("kn2", "an2", 5)}${feet}</g>`;
		const fg = FRONT[key] ? FRONT[key].gear : "";
		return `<svg viewBox="0 -14 120 154" width="${size * 0.86}" height="${size * 1.1}" aria-hidden="true"><line x1="0" y1="131" x2="120" y2="131" stroke="rgba(245,245,247,.15)" stroke-width="1"/>${body}${frontGear(fg, p)}<circle cx="${p.head[0].toFixed(1)}" cy="${p.head[1].toFixed(1)}" r="7" fill="#F5F5F7"/></svg>`;
	}
	function frontPose(key, from, to, t) {
		const fr = FRONT[key]; if (!fr) return null;
		const A = fr[from] || fr.a, B = fr[to] || fr.a, out = {};
		Object.keys(A).forEach((k) => { out[k] = lerp(A[k], B[k] || A[k], t); });
		return out;
	}
	// Lateral raise is already drawn from the front; its "other view" is the side.
	const LATERAL_SIDE = { a: P({ el: [62, 52], ha: [64, 70] }), b: P({ el: [64, 40], ha: [70, 38] }) };

	function sideView(key, pose) { return key === "lateral" ? figureSvg({ gear: "dbHand" }, pose, VIEW) : figureSvg(PATTERNS[key], pose, VIEW); }
	function frontView(key, pose) { return key === "lateral" ? figureSvg(PATTERNS.lateral, pose, VIEW) : frontSvg(key, pose, VIEW); }
	function posesAt(key, from, to, k) {
		if (key === "lateral") return [poseAt(LATERAL_SIDE, from, to, k), poseAt(PATTERNS.lateral, from, to, k)];
		return [poseAt(PATTERNS[key], from, to, k), frontPose(key, from, to, k)];
	}
	const VIEW = 100;

	function demoCard(ex) {
		const key = EXERCISES[ex]; if (!key) return "";
		const pat = PATTERNS[key];
		const tempo = pat.hold ? `Hold ${pat.phases[0][1]} s` : pat.phases.map(([l, sec]) => `${l} ${sec} s`).join(" · ");
		const [sa, fa] = posesAt(key, "a", "a", 0), [sb, fb] = posesAt(key, "b", "b", 0);
		const th = (svg, cap) => `<figure>${svg.replace(/width="[\d.]+" height="[\d.]+"/, 'width="52" height="57"')}<figcaption>${cap}</figcaption></figure>`;
		const thumbs = pat.hold ? "" : `<div class="cx-steps">${th(sideView(key, sa), "1 · Side")}${th(frontView(key, fa), "1 · Front")}${th(sideView(key, sb), "2 · Side")}${th(frontView(key, fb), "2 · Front")}</div><div class="cx-meta" style="margin-top:4px">1 · Start → 2 · ${pat.end}</div>`;
		return `<div class="cx-demo" data-demo="${key}"><div class="cx-sub2" style="padding:0">How to · ${esc(ex)}</div>
			<div class="cx-views"><figure><div class="cx-demo-fig" data-view="side">${sideView(key, sa)}</div><figcaption>Side view</figcaption></figure><figure><div class="cx-demo-fig" data-view="front">${frontView(key, fa)}</div><figcaption>Front view</figcaption></figure></div>
			<div class="cx-demo-info"><div class="cx-phase">${pat.phases[0][0]}</div><div class="cx-count">${pat.phases[0][1]}<small> s</small></div></div><div class="cx-meta">Tempo: ${tempo}</div>
			${thumbs}<ul class="cx-cues">${pat.cues.map((c) => `<li>${c}</li>`).join("")}</ul></div>`;
	}
	// One loop drives every demo on screen.
	let demoLoop = null;
	function animateDemos() {
		if (demoLoop) return;
		const t0 = performance.now();
		const tick = (now) => {
			const cards = log.querySelectorAll(".cx-demo");
			if (!cards.length || !panel.classList.contains("open")) { demoLoop = null; return; }
			cards.forEach((card) => {
				const pat = PATTERNS[card.dataset.demo];
				const total = pat.phases.reduce((t, ph) => t + ph[1], 0);
				let t = ((now - t0) / 1000) % total, i = 0;
				while (t > pat.phases[i][1]) { t -= pat.phases[i][1]; i++; }
				const [label, sec, from, to] = pat.phases[i];
				const k = REDUCED ? 0 : (1 - Math.cos(Math.PI * (t / sec))) / 2;
				const key = card.dataset.demo;
				const [ps, pf] = REDUCED ? posesAt(key, from, from, 0) : posesAt(key, from, to, k);
				card.querySelector('[data-view="side"]').innerHTML = sideView(key, ps);
				card.querySelector('[data-view="front"]').innerHTML = frontView(key, pf);
				card.querySelector(".cx-phase").textContent = label;
				card.querySelector(".cx-count").firstChild.nodeValue = String(Math.max(0, Math.ceil(sec - t)));
			});
			demoLoop = requestAnimationFrame(tick);
		};
		demoLoop = requestAnimationFrame(tick);
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
				const P = buildProgram({ goal: GOALS[kv.goal] ? kv.goal : "maintain", weeks: Math.min(4, Math.max(1, +kv.weeks || 4)), days: Math.min(5, Math.max(2, +kv.days || 3)), meals: +kv.meals === 3 ? 3 : 4, diet: DIETS[kv.diet] ? kv.diet : "any", ex: (kv.ex || "").split(",").filter((x) => ALLERGENS.some(([k]) => k === x)), avoid: (kv.avoid || "").replace(/[|]/g, ", "), dis: dislikeWords((kv.avoid || "").replace(/[|]/g, ",")), maint: Math.min(4500, Math.max(1400, +kv.maint || 2400)), seed: +kv.seed || 0 });
				const id = "p" + Math.abs([...q].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
				PROGS[id] = P;
				const prog = { 1: "Week 1 is about learning the movements and finding your weights.", 2: "Week 2 adds a rep to every exercise.", 3: "Week 2 adds a rep, week 3 adds a set.", 4: "Week 2 adds a rep, week 3 adds a set, week 4 is a lighter deload week to recover." }[P.weeks.length];
				const again = (k, v) => "Build program: " + Object.entries({ goal: P.goal, weeks: P.weeks.length, days: P.days, meals: P.meals, diet: P.diet, ex: P.ex.join(","), avoid: P.avoid.replace(/,\s*/g, "|"), maint: P.maint, [k]: v }).map(([a, b]) => `${a}=${b}`).join("; ");
				return {
					text: `Your ${P.weeks.length === 4 ? "1-month" : P.weeks.length + "-week"} program is ready. ${P.goalLabel}: ${fmt(P.trainK)} kcal on training days and ${fmt(P.restK)} on rest days, averaging ${fmt(P.target)} a day, with ${P.protein} g protein every day. ${P.days} sessions a week. Meals: ${dietText(P)}. ${prog} Open any day to see the workout and the meals, or download everything as a PDF with log sheets.`,
					html: programView(id, P),
					note: { kind: "warn", text: "Estimates for a typical adult. Start with weights you can lift for every rep with good form. Not medical advice: see the club doctor if you have an injury or condition." },
					chips: [
						{ label: P.days < 5 ? `${P.days + 1} training days` : "4 training days", ask: again("days", P.days < 5 ? P.days + 1 : 4), display: "Rebuild with " + (P.days < 5 ? P.days + 1 : 4) + " training days" },
						{ label: "Swap all the meals", ask: again("seed", (+(P.seed || 0) + 1) % 7), display: "Swap all the meals" },
						{ label: "Change settings", ask: "Change my program settings" }
					]
				};
			}
		},
		{
			id: "metrics",
			test: /^Metric:|\b(bmi|imc|body ?fat|masse grasse|graisse corporelle|ideal weight|poids idéal|poids ideal|healthy weight|how much water|combien d'eau|quantité d'eau|hydrat)/i,
			reply: (q) => {
				let kind = /^Metric:/.test(q) ? q.match(/kind=(\w+)/)[1] : /fat|grasse|graisse/i.test(q) ? "bodyfat" : /water|eau|hydrat/i.test(q) ? "water" : "bmi";
				const pr = Object.assign({}, savedProfile());
				if (/^Metric:/.test(q)) q.replace(/^Metric:/, "").split(";").forEach((x) => { const [k, v] = x.split("=").map((y) => y && y.trim()); if (k && v && k !== "kind") pr[k] = isNaN(+v) ? v : +v; });
				const need = kind === "bodyfat" ? ["height", "waist", "neck"] : ["weight", "height"];
				if (!/^Metric:/.test(q) || need.some((k) => !pr[k])) {
					if (kind !== "bodyfat" && need.every((k) => pr[k]) && !/^Metric:/.test(q)) return kind === "bmi" ? bmiAnswer(pr) : waterAnswer(pr);
					return {
						text: kind === "bodyfat"
							? "I'll estimate it with the US Navy method: a tape measure is all you need. Measure your waist at the navel and your neck just below the Adam's apple (women: also hips at the widest point)."
							: "I just need your weight and height." + (kind === "water" ? " Add your weekly training hours too." : ""),
						html: metricForm(kind, pr)
					};
				}
				return kind === "bodyfat" ? bodyfatAnswer(pr) : kind === "water" ? waterAnswer(pr) : bmiAnswer(pr);
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
		const order = ["medical", "metrics", "membership", "program", "classes"];
		for (const id of order) { const it = intents.find((x) => x.id === id); if (it.test.test(q)) return { id, ...it.reply(q) }; }
		return { id: "ai", ai: true };
	}

	function starterChips() {
		return [
			{ label: "What's my BMI and ideal weight range?", ask: "What's my BMI and what's a healthy weight range for me?" },
			{ label: "How much water should I drink?", ask: "How much water should I drink per day, including training days?" },
			{ label: "Build my training + meal program", ask: "Build me a program with training and meals" },
			{ label: "Which class fits a beginner?", ask: "Which class fits a beginner?" },
			{ label: "How do I estimate my body fat?", ask: "How can I estimate my body fat percentage?" },
			{ label: "Show me how to squat", ask: "How do I squat with good form?" }
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
		let food = null;
		try { food = JSON.parse(localStorage.getItem("apex_food_prefs")); } catch (_) {}
		const diet = food ? [DIETS[food.diet] ? DIETS[food.diet].label : null, food.ex && food.ex.length ? "avoid " + food.ex.join(", ") : null, food.avoid ? "dislikes " + food.avoid : null].filter(Boolean).join("; ") : null;
		return { name: account().name || null, tier: tier(), profile: p, metrics: m, diet };
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
				const exOff = exerciseIn(userText);
				if (exOff) { const b2 = document.createElement("div"); b2.className = "cx-bubble"; b2.innerHTML = demoCard(exOff); wrap.appendChild(b2); animateDemos(); }
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
			const ex = exerciseIn(userText);
			if (ex) { bubble.insertAdjacentHTML("beforeend", demoCard(ex)); animateDemos(); }
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
				const bubble = document.createElement("div"); bubble.className = "cx-bubble cx-ai"; bubble.innerHTML = md(t || "") + (exerciseIn(d || q) ? demoCard(exerciseIn(d || q)) : "");
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
		animateDemos();
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
		const mf = e.target.closest(".cx-metric");
		if (mf) {
			e.preventDefault();
			const kind = mf.dataset.kind, vals = {};
			mf.querySelectorAll("input[type=number]").forEach((i) => { if (i.value) vals[i.name] = +i.value; });
			const sx = mf.querySelector("[name=sex]:checked"); if (sx) vals.sex = sx.value;
			let saved = {}; try { saved = JSON.parse(localStorage.getItem("apex_profile")) || {}; } catch (_) {}
			try { localStorage.setItem("apex_profile", JSON.stringify(Object.assign(saved, vals))); } catch (_) {}
			const label = kind === "bodyfat" ? `Waist ${vals.waist} cm · neck ${vals.neck} cm${vals.hip ? ` · hips ${vals.hip} cm` : ""} · ${vals.height} cm` : `${vals.weight} kg · ${vals.height} cm${vals.hours != null ? ` · ${vals.hours} h training/week` : ""}`;
			send("Metric: kind=" + kind + "; " + Object.entries(vals).map(([a, b]) => `${a}=${b}`).join("; "), label);
			return;
		}
		const f = e.target.closest(".cx-setup"); if (!f || f.classList.contains("cx-metric")) return;
		e.preventDefault();
		const v = (n) => (f.querySelector(`[name="${n}"]:checked`) || f.querySelector(`[name="${n}"]`)).value;
		const ex = [...f.querySelectorAll('[name="ex"]:checked')].map((x) => x.value);
		const avoid = f.querySelector('[name="avoid"]').value.replace(/[;=|]/g, " ").split(",").map((x) => x.trim()).filter(Boolean).join("|");
		const P = { goal: v("goal"), weeks: v("weeks"), days: v("days"), meals: v("meals"), diet: v("diet"), ex: ex.join(","), avoid, maint: v("maint") };
		try { localStorage.setItem("apex_food_prefs", JSON.stringify({ diet: P.diet, ex, avoid: avoid.replace(/\|/g, ", ") })); } catch (_) {}
		const q = "Build program: " + Object.entries(P).map(([a, b]) => `${a}=${b}`).join("; ");
		const label = `${+P.weeks === 4 ? "1 month" : P.weeks + (+P.weeks > 1 ? " weeks" : " week")} · ${GOALS[P.goal].label} · ${P.days} training days · ${P.meals} meals a day${P.diet !== "any" ? " · " + DIETS[P.diet].label : ""}${ex.length ? " · no " + ex.join(", ") : ""}${avoid ? " · avoid " + avoid.replace(/\|/g, ", ") : ""}`;
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
		const how = e.target.closest(".cx-how");
		if (how) {
			const row = how.closest(".cx-row"), next = row.nextElementSibling;
			if (next && next.classList.contains("cx-demo")) { next.remove(); how.setAttribute("aria-expanded", "false"); return; }
			row.insertAdjacentHTML("afterend", demoCard(how.dataset.ex));
			how.setAttribute("aria-expanded", "true");
			animateDemos();
			return;
		}
		const pdf = e.target.closest("[data-pdf]");
		if (pdf && PROGS[pdf.dataset.pdf]) downloadPdf(PROGS[pdf.dataset.pdf], pdf);
	});

	restore();
	if (/[?&]coach=open/.test(location.search)) open();
})();
