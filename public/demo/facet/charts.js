/* Facet charts: hand-drawn SVG and HTML, no library. Thin marks, 4 px rounded ends on the baseline, 2 px gaps,
 * recessive grid, one axis, a tooltip on every mark, text in ink colours (the colour only carries identity). */
(function () {
	const NS = "http://www.w3.org/2000/svg";
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
	const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	const BLUE = "#2a78d6";

	/* nice round steps for the axis */
	function ticks(max, n = 4) {
		if (!(max > 0)) return [0, 1];
		const raw = max / n, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw);
		const out = []; for (let v = 0; v <= max + step * 0.001; v += step) out.push(v);
		if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
		return out;
	}

	/* one shared tooltip, placed next to the pointer, kept inside the card */
	function tip(host) {
		let el = host.querySelector(".tip");
		if (!el) { el = document.createElement("div"); el.className = "tip"; el.setAttribute("role", "presentation"); host.appendChild(el); }
		return {
			show(html, x, y) {
				el.innerHTML = html; el.classList.add("on");
				const hw = host.clientWidth, w = el.offsetWidth, h = el.offsetHeight;
				let left = x + 14; if (left + w > hw - 4) left = x - w - 14; if (left < 4) left = 4;
				let top = y - h - 12; if (top < 4) top = y + 16;
				el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
			},
			hide() { el.classList.remove("on"); },
		};
	}
	const tipHtml = (label, value, extra) => `<b>${esc(label)}</b><span>${esc(value)}</span>${extra ? `<small>${esc(extra)}</small>` : ""}`;

	/* vertical columns: months, weeks, days, weekdays */
	function columns(el, rows, o) {
		const W = Math.max(260, el.clientWidth), H = o.small ? 190 : 230, L = 52, B = 26, T = 10, R = 4;
		const max = Math.max(...rows.map((r) => r.value), 0), tk = ticks(max), top = tk[tk.length - 1] || 1;
		const n = rows.length, slot = (W - L - R) / n, bw = Math.max(2, Math.min(36, slot - 2));
		const y = (v) => T + (H - T - B) * (1 - v / top);
		const every = Math.ceil(n / Math.floor((W - L) / 56));
		let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
		for (const v of tk) s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${esc(o.short(v))}</text>`;
		rows.forEach((r, i) => {
			const x = L + slot * i + (slot - bw) / 2, h = Math.max(0, y(0) - y(r.value)), rad = Math.min(4, bw / 2, h);
			if (h > 0) s += `<path class="mk${r.partial ? " part" : ""}" data-i="${i}" fill="${r.color || o.color || BLUE}" style="--d:${Math.min(i * 18, 400)}ms" d="M${x},${y(0)} v${-(h - rad)} q0,${-rad} ${rad},${-rad} h${bw - 2 * rad} q${rad},0 ${rad},${rad} v${h - rad} z"/>`;
			if (i % every === 0) s += `<text class="ax" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(o.tick(r.key))}</text>`;
			s += `<rect class="hit" data-i="${i}" x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent"/>`;
		});
		s += `<line class="base" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/></svg>`;
		el.innerHTML = s;
		hover(el, rows, o, (i) => el.querySelectorAll(`.mk`).forEach((m) => m.classList.toggle("dim", i >= 0 && +m.dataset.i !== i)));
	}

	/* horizontal bars: categories, merchants (long labels stay readable) */
	function hbars(el, rows, o) {
		const max = Math.max(...rows.map((r) => r.value), 0) || 1;
		el.innerHTML = `<ul class="hb">${rows.map((r, i) => `<li data-i="${i}" tabindex="0" role="button" aria-label="${esc(o.label(r))}: ${esc(o.fmt(r.value))}"><span class="hb-l">${r.color ? `<i class="dot" style="background:${r.color}"></i>` : ""}<span>${esc(o.label(r))}</span></span><span class="hb-t"><span class="hb-b" style="--w:${(r.value / max) * 100}%;--d:${Math.min(i * 40, 400)}ms;background:${r.color || o.color || BLUE}"></span></span><span class="hb-v">${esc(o.fmt(r.value))}</span></li>`).join("")}</ul>`;
		el.querySelectorAll("li").forEach((li) => { const pick = () => o.pick?.(+li.dataset.i); li.addEventListener("click", pick); li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }); });
	}

	/* line: 2 px, light area, crosshair + tooltip */
	function line(el, rows, o) {
		const W = Math.max(260, el.clientWidth), H = o.small ? 190 : 230, L = 52, B = 26, T = 12, R = 10;
		const max = Math.max(...rows.map((r) => r.value), 0), tk = ticks(max), top = tk[tk.length - 1] || 1, n = rows.length;
		const x = (i) => L + (n === 1 ? (W - L - R) / 2 : ((W - L - R) * i) / (n - 1)), y = (v) => T + (H - T - B) * (1 - v / top);
		const c = o.color || BLUE, pts = rows.map((r, i) => [x(i), y(r.value)]);
		const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
		const every = Math.ceil(n / Math.floor((W - L) / 56));
		let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
		for (const v of tk) s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${esc(o.short(v))}</text>`;
		rows.forEach((r, i) => { if (i % every === 0) s += `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 && n > 1 ? "start" : "middle"}">${esc(o.tick(r.key))}</text>`; });
		const part = n > 1 && rows[n - 1].partial, dm = part ? pts.slice(0, -1).map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") : d;
		s += `<path class="area" fill="${c}" d="${dm} L${pts[part ? n - 2 : n - 1][0]},${y(0)} L${x(0)},${y(0)} Z"/><path class="ln" stroke="${c}" d="${dm}" pathLength="1"/>`;
		if (part) s += `<path class="ln-part" stroke="${c}" d="M${pts[n - 2][0]},${pts[n - 2][1]} L${pts[n - 1][0]},${pts[n - 1][1]}"/>`;
		s += `<line class="cross" x1="0" x2="0" y1="${T}" y2="${y(0)}"/><circle class="pt" r="5" fill="${c}" cx="0" cy="0" style="opacity:0"/>`;
		rows.forEach((r, i) => { const w = n === 1 ? W - L - R : (W - L - R) / (n - 1); s += `<rect class="hit" data-i="${i}" x="${x(i) - w / 2}" y="${T}" width="${w}" height="${H - T - B}" fill="transparent"/>`; });
		s += `<line class="base" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/></svg>`;
		el.innerHTML = s;
		const cross = el.querySelector(".cross"), pt = el.querySelector(".pt");
		hover(el, rows, o, (i) => { if (i < 0) { cross.style.opacity = 0; pt.style.opacity = 0; return; } cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.opacity = 1; pt.setAttribute("cx", x(i)); pt.setAttribute("cy", y(rows[i].value)); pt.style.opacity = 1; });
	}

	/* donut: share of a whole, 2 px gaps, total in the middle, legend with values (identity is never colour alone) */
	function donut(el, rows, o) {
		const S = 180, r0 = 62, r1 = 86, cx = S / 2, total = rows.reduce((a, r) => a + r.value, 0) || 1;
		let a = -Math.PI / 2, s = `<div class="dn"><div class="dn-c"><svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${esc(o.aria)}">`;
		const gap = 2 / r1; // 2 px on the outer edge
		rows.forEach((r, i) => {
			const sweep = (r.value / total) * Math.PI * 2, a0 = a + (rows.length > 1 ? gap / 2 : 0), a1 = a + sweep - (rows.length > 1 ? gap / 2 : 0); a += sweep;
			if (a1 <= a0) return;
			const big = a1 - a0 > Math.PI ? 1 : 0, P = (rr, t) => `${(cx + rr * Math.cos(t)).toFixed(2)},${(cx + rr * Math.sin(t)).toFixed(2)}`;
			const path = a1 - a0 >= Math.PI * 2 - 0.001 ? `M${P(r1, 0)} A${r1},${r1} 0 1 1 ${P(r1, Math.PI)} A${r1},${r1} 0 1 1 ${P(r1, 0)} M${P(r0, 0)} A${r0},${r0} 0 1 0 ${P(r0, Math.PI)} A${r0},${r0} 0 1 0 ${P(r0, 0)} Z`
				: `M${P(r1, a0)} A${r1},${r1} 0 ${big} 1 ${P(r1, a1)} L${P(r0, a1)} A${r0},${r0} 0 ${big} 0 ${P(r0, a0)} Z`;
			s += `<path class="mk sl" data-i="${i}" fill="${r.color || BLUE}" d="${path}" style="--d:${i * 60}ms"/>`;
		});
		s += `</svg><div class="dn-t"><small>${esc(o.totalLabel)}</small><b>${esc(o.fmt(total))}</b></div></div><ul class="lg">`;
		s += rows.map((r, i) => `<li data-i="${i}" tabindex="0" role="button"><i class="dot" style="background:${r.color || BLUE}"></i><span class="lg-n">${esc(o.label(r))}</span><span class="lg-v">${esc(o.fmt(r.value))}</span><span class="lg-p">${esc(o.pct(r.value / total))}</span></li>`).join("");
		el.innerHTML = s + "</ul></div>";
		const svg = el.querySelector("svg"), T = tip(el.closest(".card") || el);
		const focus = (i) => { el.querySelectorAll(".sl").forEach((m) => m.classList.toggle("dim", i >= 0 && +m.dataset.i !== i)); el.querySelectorAll(".lg li").forEach((m) => m.classList.toggle("dim", i >= 0 && +m.dataset.i !== i)); };
		el.querySelectorAll(".sl, .lg li").forEach((m) => {
			const i = +m.dataset.i;
			m.addEventListener("pointerenter", () => focus(i)); m.addEventListener("pointerleave", () => { focus(-1); T.hide(); });
			m.addEventListener("pointermove", (e) => { if (!m.classList.contains("sl")) return; const b = (el.closest(".card") || el).getBoundingClientRect(); T.show(tipHtml(o.label(rows[i]), o.fmt(rows[i].value), o.pct(rows[i].value / total)), e.clientX - b.left, e.clientY - b.top); });
			m.addEventListener("click", () => o.pick?.(i));
			m.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.pick?.(i); } });
		});
		void svg;
	}

	function hover(el, rows, o, mark) {
		const card = el.closest(".card") || el, T = tip(card);
		el.querySelectorAll(".hit").forEach((h) => {
			const i = +h.dataset.i;
			h.addEventListener("pointermove", (e) => { const b = card.getBoundingClientRect(); mark(i); T.show(tipHtml(o.tipLabel(rows[i]), o.fmt(rows[i].value), o.tipExtra?.(rows[i])), e.clientX - b.left, e.clientY - b.top); });
			h.addEventListener("pointerleave", () => { mark(-1); T.hide(); });
			h.addEventListener("click", () => o.pick?.(i));
		});
		el.addEventListener("pointerleave", () => { el.querySelectorAll(".mk").forEach((m) => m.classList.remove("dim")); T.hide(); });
	}

	window.FACET_CHARTS = { columns, hbars, line, donut, esc, reduced };
})();
