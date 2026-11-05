/* Facet classifier: from a raw bank line to a merchant and a category, then the patterns worth showing.
 * 1. the category written in the file, when there is one; 2. common words (EN / FR); 3. the AI, for the merchants left
 *    (only the cleaned merchant names are sent: no amount, no date, no card or account number); 4. otherwise "To check". */
(function () {
	const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
	const CAT_IDS = ["home", "groceries", "dining", "transport", "subscriptions", "leisure", "health", "shopping"];

	/* "CARTE X4821 12/10 CAFE ARDOISE PARIS" → "Cafe Ardoise Paris" */
	function merchant(label) {
		let s = " " + norm(label).toUpperCase() + " ";
		s = s.replace(/\b(PAIEMENT|ACHAT) (PAR |CB )?CARTE\b|\bCARTE\b|\bCARD( PAYMENT)?\b|\bCB\b|\bPRLV( SEPA)?\b|\bPRELEVEMENT( SEPA)?\b|\bDIRECT DEBIT\b|\bVIR(EMENT)?( SEPA)?( INST(ANTANE)?)?( RECU| EMIS| DE| EN FAVEUR DE)?\b|\bTRANSFER( IN| OUT)?\b|\bFACTURE( CARTE)?\b|\bDU \d{2}\/\d{2}\b|\bREF\S*|\bECH\S*|\bMANDAT\S*/g, " ");
		s = s.replace(/\bX\d{3,}\b|\b\d{2}[/.]\d{2}([/.]\d{2,4})?\b|\b[A-Z]{2}\d{2}[A-Z0-9]{8,}\b|\d{4,}|[*#]+/g, " ");
		s = s.replace(/\b(SALAIRE|SALARY|PRIME|BONUS|REMBOURSEMENT|REFUND|LOYER|RENT)\b/g, (m) => " " + m + " ");
		s = s.replace(/\s+/g, " ").trim();
		if (!s) return String(label).trim().slice(0, 40);
		return s.toLowerCase().replace(/(^|[\s\-&'(])([a-z])/g, (m, a, b) => a + b.toUpperCase()).slice(0, 48);
	}
	/* the key used to group lines of the same merchant (drops words that vary from line to line) */
	const key = (m) => norm(m).replace(/\b(salaire|salary|prime|bonus|loyer|rent|remboursement|refund)\b/g, "").replace(/\s+/g, " ").trim() || norm(m);

	const W = {
		income: ["salaire", "salary", "payroll", "paie", "remboursement", "refund", "caf", "pole emploi", "france travail", "interets", "interest", "dividende", "prime", "bonus", "allocation", "cpam"],
		home: ["loyer", "rent", "residence", "syndic", "edf", "engie", "energie", "energy", "electricite", "electricity", "gaz", "gas", "eau", "water", "veolia", "assurance", "insurance", "maif", "macif", "matmut", "axa", "ikea", "leroy merlin", "castorama", "brico", "habitation", "taxe fonciere", "council tax"],
		groceries: ["carrefour", "leclerc", "auchan", "lidl", "aldi", "monoprix", "franprix", "intermarche", "casino", "picard", "biocoop", "naturalia", "u express", "super u", "hyper u", "supermarche", "supermarket", "marche", "market", "epicerie", "grocery", "grocer", "boulangerie", "bakery", "primeur", "boucherie", "fromagerie", "tesco", "sainsbury", "whole foods"],
		dining: ["restaurant", "resto", "cafe", "coffee", "bistro", "bistrot", "brasserie", "pizz", "sushi", "burger", "kebab", "mcdo", "mcdonald", "kfc", "starbucks", "deliveroo", "uber eats", "ubereats", "just eat", "traiteur", "creperie", "boulangerie patisserie", "bar ", "pub", "comptoir", "trattoria", "cantine", "noodle", "ramen", "thai", "tacos"],
		transport: ["sncf", "ratp", "navigo", "metro", "rail", "train", "tram", "uber", "bolt", "taxi", "heetch", "total", "esso", "shell", "bp ", "station", "carburant", "fuel", "peage", "autoroute", "toll", "parking", "velib", "blablacar", "air france", "easyjet", "ryanair", "transavia", "tfl"],
		subscriptions: ["netflix", "spotify", "deezer", "disney", "canal", "prime video", "amazon prime", "apple.com", "icloud", "google storage", "youtube", "stream", "music", "free mobile", "orange", "sfr", "bouygues", "sosh", "red by", "mobile", "box", "fibre", "fiber", "internet", "basic fit", "fitness", "gym", "club", "forme", "abonnement", "subscription", "cloud", "adobe", "microsoft"],
		health: ["pharmacie", "pharmacy", "docteur", "doctor", "dr ", "medecin", "cabinet", "dentiste", "dentist", "opticien", "optician", "mutuelle", "hopital", "hospital", "laboratoire", "labo", "kine", "osteo", "clinique", "sante"],
		leisure: ["cinema", "ugc", "pathe", "gaumont", "fnac", "librairie", "bookshop", "books", "concert", "musee", "museum", "theatre", "spectacle", "opera", "salle", "steam", "playstation", "nintendo", "xbox", "hotel", "airbnb", "booking", "gite", "camping", "voyage", "travel", "billet", "ticket", "parc", "bowling", "escape"],
		shopping: ["amazon", "zara", "h&m", "uniqlo", "decathlon", "darty", "boulanger ", "electro", "vetement", "clothes", "kiabi", "sephora", "primark", "zalando", "vinted", "apple store", "fnac.com", "cdiscount", "mode", "shoes", "chaussures"],
	};
	/* a category name written by the bank or by the person, in any of the usual words */
	function fromFile(c) {
		const s = norm(c); if (!s) return null;
		const map = [["income", ["revenu", "salaire", "income", "virement recu", "entree"]], ["home", ["logement", "loyer", "housing", "maison", "energie", "habitation"]], ["groceries", ["aliment", "course", "grocer", "supermarche", "food"]], ["dining", ["restaurant", "resto", "bar", "dining", "eating"]], ["transport", ["transport", "voiture", "car", "carburant", "travel"]], ["subscriptions", ["abonnement", "telephon", "subscription", "internet", "bills"]], ["leisure", ["loisir", "sortie", "leisure", "culture", "vacance", "entertain"]], ["health", ["sante", "health", "medical"]], ["shopping", ["shopping", "achat", "vetement", "clothes"]]];
		for (const [id, ws] of map) if (ws.some((w) => s.includes(w))) return id;
		return null;
	}
	function byWords(m, a) {
		const s = " " + norm(m) + " ";
		if (a > 0) return "income";
		for (const id of CAT_IDS) if (W[id].some((w) => s.includes(w.endsWith(" ") ? " " + w : w))) return id;
		return null;
	}

	/* classify every line; returns the merchants still unknown, for the AI */
	function classify(tx) {
		for (const t of tx) {
			t.m = merchant(t.label); t.k = key(t.m);
			const f = fromFile(t.cat);
			if (t.a > 0) { t.c = "income"; t.how = "rule"; }
			else if (f && f !== "income") { t.c = f; t.how = "file"; }
			else { const w = byWords(t.m, t.a); t.c = w || "other"; t.how = w ? "rule" : "none"; }
		}
		const unknown = [...new Set(tx.filter((t) => t.how === "none").map((t) => t.m))];
		return unknown;
	}
	function applyAI(tx, map) {
		for (const t of tx) if (t.how === "none" && map[t.m] && CAT_IDS.includes(map[t.m])) { t.c = map[t.m]; t.how = "ai"; }
	}

	/* ---------------- patterns ---------------- */
	const median = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
	const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

	/* recurring: the same merchant, a similar amount, at a steady rhythm (monthly or yearly) */
	function recurring(tx) {
		const g = new Map();
		for (const t of tx) if (t.a < 0) (g.get(t.k) || g.set(t.k, []).get(t.k)).push(t);
		const out = [];
		for (const [, list] of g) {
			const L = list.slice().sort((a, b) => (a.d < b.d ? -1 : 1)), amts = L.map((t) => -t.a), med = median(amts);
			const steady = L.filter((t) => Math.abs(-t.a - med) <= Math.max(1, med * 0.12));
			if (steady.length < 2) continue;
			const gaps = steady.slice(1).map((t, i) => days(steady[i].d, t.d)), gm = median(gaps);
			const months = new Set(steady.map((t) => t.d.slice(0, 7))).size;
			let every = null, use = steady, varies = false;
			const fixed = steady.length >= L.length * 0.7; // a subscription: nearly every line has the same amount
			if (fixed && gm >= 26 && gm <= 35 && months >= 3 && steady.length <= months * 1.3) every = "month";
			else if (fixed && gm >= 6 && gm <= 8 && steady.length >= 6) every = "week";
			else if (fixed && gm >= 350 && gm <= 380) every = "year";
			else { // a bill whose amount changes (energy): exactly one line a month, at least 4 months in a row
				const allMonths = new Set(L.map((t) => t.d.slice(0, 7))).size, lg = median(L.slice(1).map((t, i) => days(L[i].d, t.d)));
				if (L.length === allMonths && allMonths >= 4 && lg >= 26 && lg <= 35 && ["home", "subscriptions", "transport"].includes(L[0].c)) { every = "month"; use = L; varies = true; }
			}
			if (!every) continue;
			const per = varies ? median(L.map((t) => -t.a)) : med, yearly = every === "month" ? per * 12 : every === "week" ? per * 52 : per;
			out.push({ m: L[L.length - 1].m, k: L[0].k, c: L[L.length - 1].c, every, varies, amount: Math.round(per * 100) / 100, yearly: Math.round(yearly * 100) / 100, last: use[use.length - 1].d, tx: use });
		}
		return out.sort((a, b) => b.yearly - a.yearly);
	}

	/* unusual: far above what you usually pay at the same place, or among the very largest one-off expenses */
	function unusual(tx, rec) {
		const recIds = new Set(rec.flatMap((r) => r.tx.map((t) => t.id))), g = new Map(), out = [];
		for (const t of tx) if (t.a < 0) (g.get(t.k) || g.set(t.k, []).get(t.k)).push(t);
		for (const [, list] of g) {
			if (list.length < 4) continue;
			const med = median(list.map((t) => -t.a));
			for (const t of list) if (-t.a > Math.max(med * 2.5, med + 40) && !recIds.has(t.id)) out.push({ t, why: "usual", times: -t.a / med, usual: med });
		}
		const oneoff = tx.filter((t) => t.a < 0 && !recIds.has(t.id)), cut = median(oneoff.map((t) => -t.a)) * 8;
		for (const t of oneoff) if (-t.a >= Math.max(cut, 150) && (g.get(t.k)?.length || 0) < 4 && !out.some((o) => o.t === t)) out.push({ t, why: "big" });
		return out.sort((a, b) => a.t.a - b.t.a).slice(0, 6);
	}

	window.FACET_CLASSIFY = { classify, applyAI, recurring, unusual, merchant, CAT_IDS, median };
})();
