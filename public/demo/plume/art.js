/* Plume · illustrations. Vector line art loaded on demand, then animated with restraint:
   things settle in, feathers drift down, and where a feather lands one small detail takes its colour. */
(() => {
"use strict";
const D = document.documentElement;
const still = () => D.dataset.motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)", SINE = "cubic-bezier(0.37, 0, 0.63, 1)";
const cache = {};
const load = n => cache[n] || (cache[n] = fetch("art/" + n + ".svg").then(r => r.ok ? r.text() : ""));
/* a gentle, endless loop that starts and ends on the same pose */
const loop = (el, frames, ms, delay = 0) => el && el.animate(frames, { duration: ms, delay, iterations: Infinity, easing: SINE, direction: "alternate" });

/* ---------- small feather used on the product cards (our own drawing) ---------- */
const FEA = '<svg class="pc-fea" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27c2-10 9-18 22-22-2 12-10 20-22 22z"/><path class="v" d="M7 25l14-14"/></svg>';
$$(".pcard").forEach(c => c.insertAdjacentHTML("beforeend", FEA));

/* ---------- per-illustration motion, once it is on screen ---------- */
const PLAY = {
	covered: s => { const b = $(".p-bubble", s); if (!b) return; b.style.transformOrigin = "0% 100%"; b.animate([{ transform: "scale(.88)", opacity: 0 }, { transform: "scale(1.02)", opacity: 1, offset: .7 }, { transform: "scale(1)", opacity: 1 }], { duration: 700, delay: 500, easing: EASE, fill: "backwards" }); loop(b, [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }], 2600, 1200); },
	aih: s => ["b1", "b2", "b3"].forEach((k, i) => { const b = $(".p-" + k, s); if (!b) return; b.style.transformOrigin = "50% 100%"; b.animate([{ transform: "scale(.88)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 650, delay: 450 + i * 140, easing: EASE, fill: "backwards" }); loop(b, [{ transform: "translateY(0)" }, { transform: `translateY(${-4 - i}px)` }], [3400, 4300, 3800][i], 1200 + i * 300); }),
	pause: s => { const z = $(".p-zzz", s); loop(z, [{ transform: "translate(0,0)", opacity: .45 }, { transform: "translate(6px,-10px)", opacity: 1 }], 2600); },
	urg: s => {
		const d = $(".p-drop", s); if (d) d.animate([{ transform: "translateY(-6px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1, offset: .25 }, { transform: "translateY(10px)", opacity: 1, offset: .75 }, { transform: "translateY(14px)", opacity: 0 }], { duration: 1800, iterations: Infinity, easing: "ease-in" });
		const w = $(".p-wrench", s); if (w) { w.style.transformOrigin = "85% 70%"; w.animate([{ transform: "rotate(0)" }, { transform: "rotate(0)", offset: .7 }, { transform: "rotate(-7deg)", offset: .78 }, { transform: "rotate(4deg)", offset: .86 }, { transform: "rotate(0)" }], { duration: 4200, iterations: Infinity, easing: EASE }); }
	},
	parcel: s => { loop($(".p-box", s), [{ transform: "translateX(-8px)" }, { transform: "translateX(4px)" }], 1800); loop($(".p-pin", s), [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }], 1500, 300); },
	final: s => {
		const f = $(".pur", s), v = $(".pur2", s), r = $(".p-rays", s);
		[f, v].forEach(e => e && e.animate([{ transform: "translate(18px,-36px) rotate(-14deg)", opacity: 0 }, { transform: "translate(0,0) rotate(0)", opacity: 1 }], { duration: 1600, delay: 300, easing: EASE, fill: "backwards" }));
		[f, v].forEach(e => loop(e, [{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-5px) rotate(-3deg)" }], 3000, 1900));
		if (r) { r.style.transformOrigin = "50% 60%"; loop(r, [{ transform: "scale(.96)", opacity: .55 }, { transform: "scale(1.04)", opacity: 1 }], 1800, 1600); }
	},
	price: s => [$(".pur", s), $(".pur2", s)].forEach(e => loop(e, [{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-4px) rotate(-2deg)" }], 2800, 900)),
	phone: s => [$(".pur", s), $(".pur2", s)].forEach(e => loop(e, [{ transform: "translateX(0)" }, { transform: "translateX(14px)" }], 2200, 800)),
	access: s => { s._knob = [$(".pur", s), $(".pur2", s)].filter(Boolean); knob(); },
	hero: s => hero(s)
};
/* the text-size slider in the accessibility drawing follows the real setting */
const knob = () => { const s = $('[data-art="access"]'); if (!s || !s._knob) return; const x = { m: 0, l: 22, xl: 44 }[D.dataset.size || "m"]; s._knob.forEach(e => e.animate([{ transform: getComputedStyle(e).transform === "none" ? "translateX(0)" : getComputedStyle(e).transform }, { transform: `translateX(${x}px)` }], { duration: still() ? 1 : 500, easing: EASE, fill: "forwards" })); };
new MutationObserver(knob).observe(D, { attributes: true, attributeFilter: ["data-size"] });

/* ---------- hero: the street settles, feathers drift in, three of them colour a detail ---------- */
function hero(svg) {
	const feas = $$(".h-fea", svg), acc = { cat: $(".a-cat", svg), tag: $(".a-tag", svg), dog: $(".a-dog", svg) };
	const T = (x, y, r = 0, s = 1) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${s})`;
	const show = () => { feas.forEach(f => f.style.opacity = 1); Object.values(acc).forEach(a => a && a.classList.add("lit")); };
	/* living background: clouds drift, smoke rises, a bird glides; durations never line up */
	const ambient = () => {
		loop($(".h-cla", svg), [{ transform: "translateX(0)" }, { transform: "translateX(60px)" }], 21000);
		loop($(".h-clb", svg), [{ transform: "translateX(0)" }, { transform: "translateX(-50px)" }], 26000);
		loop($(".h-smoke", svg), [{ transform: "translateY(0)", opacity: .55 }, { transform: "translateY(-18px)", opacity: 1 }], 4300);
		loop($(".h-bird", svg), [{ transform: "translate(0,0)" }, { transform: "translate(70px,-16px)" }], 9000);
		feas.forEach((f, i) => loop(f, [{ transform: T(0, 0) }, { transform: T(i % 2 ? 10 : -10, -16, i % 2 ? 4 : -4) }], [4200, 5600, 3800, 4900][i % 4], 200 * i));
	};
	if (still()) { show(); return; }
	/* sky feathers: fall in an arc, sway less and less, slow down before they stop */
	feas.forEach((f, i) => {
		const dir = i % 2 ? -1 : 1, n = 40, fr = [];
		for (let k = 0; k <= n; k++) { const t = k / n, e = 1 - Math.pow(1 - t, 2.2), calm = 1 - t;
			fr.push({ transform: T(Math.sin(t * Math.PI * 3.2) * 70 * calm * dir, -520 * (1 - e), Math.sin(t * Math.PI * 3.2 + .5) * 26 * calm), opacity: Math.min(1, t * 5), offset: t }); }
		const a = f.animate(fr, { duration: 4200 + i * 300, delay: 600 + i * 260, easing: "linear", fill: "backwards" });
		a.onfinish = () => { f.style.opacity = 1; if (i === feas.length - 1) ambient(); };
		f.style.opacity = 1;
	});
	/* three small feathers float down onto the cat's collar, the luggage tag and the dog's collar */
	const src = feas[0]; if (!src) return show();
	const [cx, cy] = src.dataset.c.split(",").map(Number);
	const TARGETS = [["tag", 588, 960], ["cat", 364, 1046], ["dog", 1319, 986]];
	TARGETS.forEach(([k, x, y], i) => {
		const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "lander");
		g.innerHTML = `<g transform="translate(${-cx} ${-cy})">${src.innerHTML}</g>`; svg.appendChild(g);
		const fr = [], n = 36, x0 = x + (i % 2 ? 140 : -140);
		for (let s = 0; s <= n; s++) { const t = s / n, e = 1 - Math.pow(1 - t, 1.8), calm = 1 - t;
			fr.push({ transform: T(x0 + (x - x0) * t + Math.sin(t * Math.PI * 2.4) * 40 * calm, y - 760 * (1 - e), 20 + Math.sin(t * Math.PI * 2.4) * 30 * calm, .32), opacity: t < .1 ? t * 10 : 1, offset: t }); }
		const a = g.animate(fr, { duration: 3600, delay: 2600 + i * 700, easing: "linear", fill: "both" });
		a.onfinish = () => {
			const ac = acc[k]; if (ac) ac.classList.add("lit");
			g.animate([{ transform: T(x, y, 20, .32), opacity: 1 }, { transform: T(x + 6, y - 10, 34, .26), opacity: 0 }], { duration: 900, easing: EASE, fill: "forwards" }).onfinish = () => g.remove();
		};
	});
	/* depth: the layers drift a little with the pointer (desktop only) */
	const hs = svg.closest(".hero");
	if (hs && matchMedia("(hover: hover) and (pointer: fine)").matches) {
		const L = [[".h-soft, .h-cla, .h-clb, .h-smoke", 4], [".h-ink, .h-acc", 8], [".h-fea", 16]];
		let raf; hs.addEventListener("pointermove", e => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
			if (still()) return; const r = hs.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
			L.forEach(([sel, k]) => $$(sel, svg).forEach(el => el.style.translate = `${(-px * k).toFixed(1)}px ${(-py * k * .6).toFixed(1)}px`)); }); });
		hs.addEventListener("pointerleave", () => L.forEach(([sel]) => $$(sel, svg).forEach(el => el.style.translate = "")));
	}
}

/* ---------- load each drawing a little before it scrolls into view ---------- */
const start = slot => {
	slot.classList.add("on"); const n = slot.dataset.art, f = PLAY[n]; if (!f) return;
	if (still() && n !== "hero" && n !== "access") return;
	setTimeout(() => f(n === "hero" ? slot.querySelector("svg") : slot), 50);
};
const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.target._ready) { seen.unobserve(e.target); start(e.target); } }), { threshold: .25 });
const near = new IntersectionObserver(es => es.forEach(e => {
	if (!e.isIntersecting) return; near.unobserve(e.target); const slot = e.target;
	load(slot.dataset.art).then(txt => { slot.innerHTML = txt; slot._ready = true; seen.observe(slot); });
}), { rootMargin: "400px 0px" });
$$(".art-slot[data-art]").forEach(s => near.observe(s));
})();
