/* Facet demo account: a fictional current account (Camille Martin), generated in the browser.
 * Same seed = same transactions: each month is drawn from its own seed (year * 12 + month), so a month never changes,
 * and the account always ends today. Every merchant name is invented. Amounts in euros, spending is negative. */
(function () {
	/* Categories in a FIXED order: their colour follows the category, never its rank (dataviz rule). 8 slots, validated palette. */
	const CATS = [
		{ id: "home", c: "#2a78d6", ic: "house" },
		{ id: "groceries", c: "#eb6834", ic: "shopping-basket" },
		{ id: "dining", c: "#1baf7a", ic: "utensils" },
		{ id: "transport", c: "#eda100", ic: "tram-front" },
		{ id: "subscriptions", c: "#e87ba4", ic: "repeat" },
		{ id: "leisure", c: "#008300", ic: "ticket" },
		{ id: "health", c: "#6250d6", ic: "heart-pulse" },
		{ id: "shopping", c: "#e34948", ic: "shopping-bag" },
	];
	const INCOME = { id: "income", c: "#52514e", ic: "wallet" };

	function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
	const pad = (n) => String(n).padStart(2, "0");
	const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
	const r2 = (x) => Math.round(x * 100) / 100;

	function month(y, m, lastDay) {
		const R = rng(y * 12 + m + 7919), days = new Date(y, m + 1, 0).getDate(), out = [];
		const pick = (a) => a[Math.floor(R() * a.length)];
		const between = (a, b) => r2(a + R() * (b - a));
		const day = (a = 1, b = days) => a + Math.floor(R() * (b - a + 1));
		const add = (d, m2, c, a, note) => { if (d <= lastDay) out.push({ d: iso(y, m, d), m: m2, c, a: r2(a), note }); };
		const season = { 11: 1.35, 0: 0.85, 6: 1.15, 7: 1.25 }[m] || 1; // December gifts, a quiet January, summer outings

		// income
		add(Math.min(28, days), "Atelier Norrel", "income", 2850, "salary");
		if (m === 5 || m === 11) add(Math.min(28, days), "Atelier Norrel", "income", 1425, "bonus");
		if (R() < 0.35) add(day(5, 25), "Refund · Maison Brisk", "income", between(18, 64));

		// home
		add(1, "Résidence Calvane", "home", -920, "rent");
		add(day(8, 12), "Volta Énergie", "home", -(m >= 10 || m <= 2 ? between(78, 96) : between(41, 55)));
		add(5, "Assurance Ilot", "home", -18.4);
		if (R() < 0.3) add(day(), "Brico Haut-Pont", "home", -between(14, 120));

		// subscriptions (fixed amounts)
		add(3, "Streamio", "subscriptions", -13.49);
		add(7, "Sonora Music", "subscriptions", -10.99);
		add(10, "Fibra Box", "subscriptions", -29.99);
		add(12, "Orbis Mobile", "subscriptions", -19.99);
		add(2, "Club Forme Lisière", "subscriptions", -34.9);
		if (m === 8) add(15, "Nuage Plus", "subscriptions", -29.99, "yearly");

		// groceries: about once a week
		for (let w = 0; w < 5; w++) { const d = 2 + w * 7 + Math.floor(R() * 3); if (d <= days) add(d, pick(["Marché Vert", "SuperFrais", "SuperFrais", "Épicerie Lune"]), "groceries", -between(38, 112)); }
		for (let k = 0, n = 2 + Math.floor(R() * 4); k < n; k++) add(day(), "Boulangerie Pivoine", "groceries", -between(3.2, 11.5));

		// dining
		for (let k = 0, n = Math.round((5 + R() * 5) * season); k < n; k++) add(day(), pick(["Café Ardoise", "Le Comptoir Sable", "Nonna Ruche", "Sushi Kumo", "Bistro Halte", "Café Ardoise"]), "dining", -between(9, 46));

		// transport
		add(1, "Pass Métro Urbain", "transport", -86.4);
		for (let k = 0, n = Math.floor(R() * 4); k < n; k++) add(day(), "Taxi Ville", "transport", -between(12, 34));
		if (m === 6 || m === 7 || m === 11) add(day(3, 20), "Rail Express", "transport", -between(64, 148));

		// leisure
		for (let k = 0, n = Math.round((1 + R() * 3) * season); k < n; k++) add(day(), pick(["Cinéma Lumen", "Librairie Grand Vent", "Salle Opale", "Musée Ancre"]), "leisure", -between(9, 58));
		if (m === 7) add(day(4, 14), "Gîte des Pins", "leisure", -between(380, 460), "holiday");

		// health
		if (R() < 0.7) add(day(), "Pharmacie du Square", "health", -between(6, 38));
		if (R() < 0.3) add(day(), "Cabinet Dr Aubrac", "health", -30);

		// shopping
		for (let k = 0, n = Math.round((1 + R() * 2) * season * (m === 11 ? 1.6 : 1)); k < n; k++) add(day(), pick(["Maison Brisk", "Tissage & Co", "Électro Point", "Maison Brisk"]), "shopping", -between(19, m === 11 ? 140 : 95));

		return out;
	}

	function build(today = new Date()) {
		const Y = today.getFullYear(), M = today.getMonth(), D = today.getDate(), tx = [];
		for (let k = 12; k >= 0; k--) {
			const dt = new Date(Y, M - k, 1), y = dt.getFullYear(), m = dt.getMonth();
			tx.push(...month(y, m, k === 0 ? D : 31));
		}
		tx.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
		tx.forEach((t, i) => { t.id = "t" + (tx.length - i); });
		const merchants = [...new Set(tx.map((t) => t.m))].sort();
		return { owner: "Camille Martin", currency: "EUR", today: iso(Y, M, D), from: tx[tx.length - 1].d, tx, merchants };
	}

	window.FACET_DATA = { CATS, INCOME, build };
})();
