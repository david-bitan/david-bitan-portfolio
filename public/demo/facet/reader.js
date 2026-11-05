/* Facet local reader: used when the AI is not reachable or today's AI budget is spent, and for the suggestion chips.
 * It understands a small set of words (English and French) and builds the same kind of spec as the AI.
 * It is deliberately simple: the AI handles free wording, this keeps the demo working. */
(function () {
	const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ");
	const has = (s, words) => words.some((w) => new RegExp(`(^|[^a-z])${w}`).test(s));

	const CATW = {
		home: ["loyer", "logement", "maison", "electricite", "energie", "rent", "housing", "home", "electricity", "energy"],
		groceries: ["course", "alimentation", "supermarche", "boulangerie", "nourriture", "grocer", "food", "supermarket", "bakery"],
		dining: ["restaurant", "resto", "dining", "eating out", "cafe", "sushi", "repas dehors"],
		transport: ["transport", "metro", "taxi", "train", "deplacement", "commute", "travel", "trajet"],
		subscriptions: ["abonnement", "subscription", "streaming", "forfait", "recurring", "recurrent"],
		leisure: ["loisir", "cinema", "culture", "sortie", "vacance", "concert", "leisure", "fun", "holiday", "vacation", "entertainment"],
		health: ["sante", "pharmacie", "medecin", "docteur", "health", "pharmacy", "doctor", "medical"],
		shopping: ["shopping", "vetement", "habit", "clothes", "clothing", "electronique", "electronics"],
	};
	const KINDW = {
		bar: ["barre", "bar", "histogramme", "colonne", "column", "baton"],
		line: ["courbe", "ligne", "line", "graph line"],
		donut: ["camembert", "anneau", "donut", "pie", "cercle", "circle"],
		table: ["tableau", "table", "liste", "list", "detail"],
		kpi: ["chiffre", "total", "kpi", "nombre seul", "number only"],
	};
	const MONTHS = ["janv|jan", "fevr|feb", "mars|march|mar ", "avril|april|apr", "mai |may", "juin|june|jun ", "juil|july|jul ", "aout|august|aug", "sept", "octo|oct", "nove|nov", "dece|dec"];

	function period(s, today) {
		if (has(s, ["mois dernier", "mois precedent", "last month", "previous month"])) return { preset: "last_month" };
		if (has(s, ["ce mois", "du mois", "this month", "mois en cours", "current month", "le mois", "the month"])) return { preset: "this_month" };
		if (has(s, ["3 derniers mois", "trois derniers mois", "trimestre", "3 mois", "last 3 months", "three months", "quarter", "3 months"])) return { preset: "last_3_months" };
		if (has(s, ["6 derniers mois", "six derniers mois", "6 mois", "semestre", "last 6 months", "six months", "6 months"])) return { preset: "last_6_months" };
		if (has(s, ["cette annee", "depuis janvier", "this year", "year to date", "since january"])) return { preset: "this_year" };
		if (has(s, ["12 mois", "douze mois", "un an", "l an", "annee", "12 months", "twelve months", "year", "par mois", "per month", "monthly", "chaque mois", "every month"])) return { preset: "last_12_months" };
		if (has(s, ["tout", "depuis le debut", "all time", "everything", "since the start"])) return { preset: "all" };
		const T = new Date(today);
		for (let i = 0; i < 12; i++) if (MONTHS[i].split("|").some((w) => new RegExp(`(^|[^a-z])${w}`).test(s + " "))) {
			const y = i > T.getMonth() ? T.getFullYear() - 1 : T.getFullYear(), m = `${y}-${String(i + 1).padStart(2, "0")}`;
			return { from: m, to: m };
		}
		return null;
	}
	const catsIn = (s) => Object.keys(CATW).filter((c) => has(s, CATW[c]));
	const kindIn = (s) => Object.keys(KINDW).find((k) => has(s, KINDW[k])) || null;

	/* ctx: { t, today, prev (current spec), sel (selected block index) }. t(key, params) returns { k, p }: titles are translated when shown,
	 * so they follow the language switch; params "cat" and "cats" hold category ids. */
	function read(text, ctx) {
		const s = norm(text), t = ctx.t, P = period(s, ctx.today), cats = catsIn(s), kind = kindIn(s);
		const words = s.split(/\s+/).filter(Boolean).length;
		const refining = ctx.prev && (words <= 4 || has(s, ["plutot", "instead", "seulement", "uniquement", "only", "juste", "just", "sans", "without", "except", "en barres", "en courbe", "en camembert", "en tableau", "as a", "mets", "change", "passe", "switch", "make it", "fais"]));
		if (refining && (P || cats.length || kind)) return refine(ctx.prev, { P, cats, kind, without: has(s, ["sans", "without", "except", "hors"]), sel: ctx.sel });

		const per = P || { preset: "this_month" }, long = per.preset && per.preset !== "this_month" && per.preset !== "last_month";
		const year = { preset: "last_12_months" };
		const filt = cats.length ? { categories: cats } : {};
		const blocks = [];
		let title;

		if (has(s, ["revenu", "salaire", "gagne", "income", "salary", "earn", "rentree", "solde", "reste", "left over", "save", "epargn", "economis", "came in", "money in", "went out"])) {
			title = t("Money in and out");
			blocks.push({ kind: "kpi", title: t("Money in"), measure: "income", period: per }, { kind: "kpi", title: t("Money out"), measure: "spend", period: per }, { kind: "kpi", title: t("What is left"), measure: "net", period: per });
			blocks.push({ kind: "line", title: t("Money in, month by month"), measure: "income", by: "month", period: long ? per : year });
			blocks.push({ kind: "bar", title: t("Where the money goes, per month on average"), measure: "avg_month", by: "category", period: long ? per : { preset: "last_3_months" } });
		} else if (has(s, ["abonnement", "subscription", "recurring", "recurrent", "streaming"]) && !cats.filter((c) => c !== "subscriptions").length) {
			title = t("Your subscriptions");
			blocks.push({ kind: "kpi", title: t("Subscriptions, per month on average"), measure: "avg_month", period: { preset: "last_12_months" }, filter: { categories: ["subscriptions"] } });
			blocks.push({ kind: "kpi", title: t("Subscriptions over 12 months"), measure: "spend", period: { preset: "last_12_months" }, filter: { categories: ["subscriptions"] }, compare: false });
			blocks.push({ kind: "table", title: t("Each subscription, per month"), measure: "avg_month", by: "merchant", period: { preset: "last_12_months" }, filter: { categories: ["subscriptions"] } });
			blocks.push({ kind: "line", title: t("Subscriptions, month by month"), measure: "spend", by: "month", period: { preset: "last_12_months" }, filter: { categories: ["subscriptions"] } });
		} else if (has(s, ["semaine", "weekday", "week end", "weekend", "jour de la semaine", "day of the week", "quel jour", "which day"])) {
			title = t("Spending by day of the week");
			blocks.push({ kind: "bar", title: t("Spending by day of the week"), measure: "spend", by: "weekday", period: P || { preset: "last_3_months" }, filter: filt });
			blocks.push({ kind: "bar", title: t("Number of purchases by day of the week"), measure: "count", by: "weekday", period: P || { preset: "last_3_months" }, filter: filt });
		} else if (has(s, ["plus gros", "plus grosse", "plus cher", "biggest", "largest", "top", "most expensive", "gros achat", "big purchase"])) {
			title = t("Your biggest expenses");
			blocks.push({ kind: "table", title: t("Biggest expenses"), measure: "spend", by: "transaction", period: P || { preset: "last_3_months" }, filter: filt, limit: 10 });
			blocks.push({ kind: "bar", title: t("Where you spend the most"), measure: "spend", by: "merchant", period: P || { preset: "last_3_months" }, filter: filt, limit: 8 });
		} else if (cats.length) {
			title = cats.length === 1 ? t("{cat}: where it goes", { cat: cats[0] }) : t("{cats}", { cats: cats.join(",") });
			if (cats.length === 1 && !P) {
				// no period named: the useful answer is the usual month, then this month so far
				blocks.push({ kind: "kpi", title: t("Per month on average"), measure: "avg_month", period: year, filter: filt, compare: false });
				blocks.push({ kind: "kpi", title: t("This month so far"), measure: "spend", period: per, filter: filt });
				blocks.push({ kind: "kpi", title: t("Average purchase"), measure: "avg", period: year, filter: filt, compare: false });
				blocks.push({ kind: kind === "bar" ? "bar" : "line", title: t("Month by month"), measure: "spend", by: "month", period: year, filter: filt });
				blocks.push({ kind: "table", title: t("Where exactly"), measure: "avg_month", by: "merchant", period: year, filter: filt });
				if (kind) { const b = blocks.find((x) => x.kind !== "kpi"); if (b) b.kind = kind; }
				return { title, blocks };
			}
			if (cats.length === 1) {
				blocks.push({ kind: "kpi", title: t("{cat}", { cat: cats[0] }), measure: "spend", period: per, filter: filt });
				blocks.push({ kind: "kpi", title: t("Number of purchases"), measure: "count", period: per, filter: filt });
				blocks.push({ kind: "kpi", title: t("Average purchase"), measure: "avg", period: per, filter: filt });
			} else {
				for (const c of cats.slice(0, 4)) blocks.push({ kind: "kpi", title: t("{cat}", { cat: c }), measure: "spend", period: per, filter: { categories: [c] } });
				blocks.push({ kind: "bar", title: t("Side by side"), measure: "spend", by: "category", period: per, filter: filt });
			}
			blocks.push({ kind: kind === "bar" ? "bar" : "line", title: t("Month by month"), measure: "spend", by: "month", period: long ? per : year, filter: filt });
			blocks.push({ kind: "table", title: t("Where exactly"), measure: "spend", by: "merchant", period: per, filter: filt });
		} else if (has(s, ["evolution", "tendance", "trend", "over time", "au fil", "augment", "baisse", "increase", "grow"])) {
			title = t("How your spending changes");
			blocks.push({ kind: "line", title: t("Spending, month by month"), measure: "spend", by: "month", period: long ? per : year });
			blocks.push({ kind: "kpi", title: t("Per month on average"), measure: "avg_month", period: long ? per : year, compare: false });
			blocks.push({ kind: "bar", title: t("Per category, per month on average"), measure: "avg_month", by: "category", period: long ? per : year });
		} else {
			title = t("Your spending");
			blocks.push({ kind: "kpi", title: t("Money out"), measure: "spend", period: per }, { kind: "kpi", title: t("Money in"), measure: "income", period: per }, { kind: "kpi", title: t("What is left"), measure: "net", period: per });
			blocks.push({ kind: "donut", title: t("By category"), measure: "spend", by: "category", period: per });
			blocks.push(long ? { kind: "line", title: t("Month by month"), measure: "spend", by: "month", period: per } : { kind: "table", title: t("Where exactly"), measure: "spend", by: "merchant", period: per, limit: 6 });
			blocks.push({ kind: "table", title: t("Biggest expenses"), measure: "spend", by: "transaction", period: per, limit: 6 });
		}
		if (kind) { const b = blocks.find((x) => x.kind !== "kpi"); if (b) b.kind = kind; }
		return { title, blocks };
	}

	function refine(prev, { P, cats, kind, without, sel }) {
		const spec = JSON.parse(JSON.stringify(prev)), ALL = ["home", "groceries", "dining", "transport", "subscriptions", "leisure", "health", "shopping"];
		if (kind) {
			const i = sel != null && spec.blocks[sel] ? sel : spec.blocks.findIndex((b) => b.kind !== "kpi");
			if (i >= 0) spec.blocks[i].kind = kind;
		}
		if (P) spec.blocks.forEach((b) => (b.period = P));
		if (cats.length) spec.blocks.forEach((b) => { if (b.measure === "income" || b.measure === "net") return; b.filter = { ...(b.filter || {}), categories: without ? ALL.filter((c) => !cats.includes(c)) : cats }; });
		return spec;
	}

	window.FACET_READER = { read };
})();
