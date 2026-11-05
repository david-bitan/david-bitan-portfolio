/* Plume · home page. English (default, never the browser language) + French only. */
(() => {
"use strict";
const D = document.documentElement;
D.classList.add("js");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const IC = window.PLUME_ICONS || {};
const icon = n => `<i data-i="${n}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ""}</svg></i>`;
const paintIcons = (r = document) => $$("i[data-i]", r).forEach(i => { if (!i.firstChild) i.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[i.dataset.i] || ""}</svg>`; });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Preferences */
let P = {}; try { P = JSON.parse(localStorage.getItem("plume-prefs") || "{}") || {}; } catch {}
const save = () => { try { localStorage.setItem("plume-prefs", JSON.stringify(P)); } catch {} };
let lang = D.lang === "fr" ? "fr" : "en";
const motionOff = () => D.dataset.motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Strings */
const S = {
en: {
	skip: "Skip to content", "nav.label": "Main", "nav.claims": "Claims", "lang.label": "Language", "theme.dark": "Dark theme", "theme.light": "Light theme", menu: "Menu",
	"p.home": "Home", "p.car": "Car", "p.pet": "Pet", "p.travel": "Travel", "cta.price": "Check my price", undo: "Undo",
	"hero.kicker": "Home · Car · Pet · Travel", "hero.title": "Insurance you can read in a minute.", "hero.sub": "Cover explained in plain words. AI makes it fast, and a real person is always one tap away.", "hero.choose": "What would you like to insure?", "hero.fine": "No paperwork. Cancel anytime, in two taps.",
	"cov.eyebrow": "Am I covered?", "cov.title": "Ask before it happens, not after.", "cov.sub": "Describe a situation in your own words. Plume tells you if you would be covered, how much you would get, and why.", "cov.label": "Describe a situation", "cov.ph": "My bike was stolen outside the station", "cov.ask": "Ask", "cov.try": "Or try one:",
	"cov.pay": "You get", "cov.ded": "Deductible", "cov.when": "Paid within", "cov.why": "Why", "cov.foot": "Example answers for a fictional policy.", "cov.you": "You asked",
	"v.yes": "Covered", "v.part": "Partly covered", "v.no": "Not covered", "v.person": "A person will check",
	"pr.eyebrow": "Your price, laid bare", "pr.title": "See where every cent goes.", "pr.sub": "Move the sliders: your price changes, and so does what you would get back. No fine print. Well, there is some, but we translated it.", "pr.product": "Product", "pr.ded": "Deductible", "pr.cta": "Get this price", "pr.fine": "Example prices for a fictional insurer.", "pr.note": "Plume is fictional: nothing can be bought here, but the next step of this project builds the full quote.",
	"pr.month": "/month", "pr.yours": "Your {p} cover", "pr.pot": "Claims pot", "pr.potS": "Pays claims only, kept apart", "pr.fee": "Plume", "pr.feeS": "Flat fee: it does not grow with your cover", "pr.tax": "Taxes", "pr.taxS": "Collected for the state",
	"pr.L.home": "Belongings covered up to", "pr.L.car": "Car value covered", "pr.L.pet": "Yearly vet limit", "pr.L.travel": "Cover per trip",
	"pr.s.home": "Laptop stolen in a burglary, worth {a}: you get {b}.", "pr.s.car": "Rear bumper repair after a parking knock, {a}: you get {b}.", "pr.s.pet": "Your dog swallowed a sock. Vet bill {a}: you get {b}.", "pr.s.travel": "Suitcase lost on the way out, worth {a}: you get {b}.",
	"how.eyebrow": "How it works", "how.title": "Covered before your coffee gets cold.", "how.1t": "Tell us about you", "how.1p": "A few questions, one at a time, in plain words. No forms to decode.", "how.2t": "Shape your cover", "how.2p": "Pick what matters to you and see the price, and the payout, change live.", "how.3t": "You are covered", "how.3p": "Your policy starts right away, with a one-page summary anyone can read.",
	"cl.eyebrow": "Claims", "cl.title": "Follow your claim like a parcel.", "cl.sub": "Every step, who is handling it, and what happens next. No more wondering whether anyone has read your file.", "cl.replay": "Replay the example", "cl.file": "Claim · Water damage", "cl.kitchen": "Kitchen ceiling", "cl.role": "Claims expert, follows your file", "cl.msg": "Message Léa",
	"cl.prog": "In progress", "cl.paid": "Paid", "cl.lea": "In the real product, this opens a chat with Léa. Here, Léa is fictional.",
	"cl.1": "Claim declared", "cl.1d": "Photos and a short description, in 3 minutes", "cl.1t": "Mon 9:12",
	"cl.2": "Checked by AI", "cl.2d": "Policy and photos match: covered", "cl.2t": "Mon 9:14",
	"cl.3": "Reviewed by Léa", "cl.3d": "Repair quote approved, plumber booked", "cl.3t": "Mon 11:40",
	"cl.4": "Paid", "cl.4d": "{a} sent to your account", "cl.4t": "Tue 10:05",
	"ai.eyebrow": "AI, with people in charge", "ai.title": "AI makes it fast. People make the calls.", "ai.1t": "A person decides every refusal", "ai.1p": "AI can pay simple claims in minutes. It can never say no on its own.", "ai.2t": "You always see why", "ai.2p": "Every decision comes with its reasons in plain words, and the clause it relies on.", "ai.3t": "A human in one tap", "ai.3p": "Chat or call a real person, 8 am to 10 pm, every day. No maze of menus.",
	"pa.eyebrow": "Pause", "pa.title": "Car in the garage for the winter? Pause it.", "pa.sub": "Theft and fire stay covered. You pay only for what you use, and you can switch back anytime.", "pa.car": "Car · Peugeot 208", "pa.sw": "Pause car cover",
	"pa.on": "Fully covered · {a}/month", "pa.off": "Paused · {a}/month instead of {b}", "pa.toast": "Car cover paused. Theft and fire stay on.", "pa.toast2": "Car cover is back on.",
	"em.eyebrow": "Emergency mode", "em.title": "Water everywhere? One screen, the right steps.", "em.sub": "Emergency mode keeps calm for you: what to do now, a priority line, and a claim already filled in.", "em.open": "See the steps", "em.close": "Hide the steps",
	"em.1": "Turn off the water at the main valve.", "em.2": "Take a few photos. Plume adds them to your claim.", "em.3": "Tap once: we send a plumber and call you back within 15 minutes.",
	"ac.eyebrow": "Accessible to everyone", "ac.title": "Insurance should work for every reader.", "ac.sub": "Plume is designed for keyboards and screen readers, with readable contrast everywhere. Try the settings: they apply to the whole site.", "ac.size": "Text size", "ac.motion": "Animations", "ac.contrast": "Higher contrast",
	"fq.eyebrow": "Good to know", "fq.title": "Questions, answered plainly.",
	"end.title": "Ready when you are.", "end.sub": "Two minutes for your price. No call, no paperwork, no surprise.",
	"foot.lab": "A fictional product by David Bitan for his AI Lab. Plume, Léa Moreau and every price are invented.", "foot.other": "Other AI Lab projects", "foot.credits": "Credits"
},
fr: {
	skip: "Aller au contenu", "nav.label": "Principal", "nav.claims": "Sinistres", "lang.label": "Langue", "theme.dark": "Thème sombre", "theme.light": "Thème clair", menu: "Menu",
	"p.home": "Habitation", "p.car": "Auto", "p.pet": "Animaux", "p.travel": "Voyage", "cta.price": "Voir mon prix", undo: "Annuler",
	"hero.kicker": "Habitation · Auto · Animaux · Voyage", "hero.title": "L’assurance qui se lit en une minute.", "hero.sub": "Vos garanties expliquées avec des mots simples. L’IA va vite, et une vraie personne reste toujours à un geste.", "hero.choose": "Que voulez-vous assurer ?", "hero.fine": "Zéro paperasse. Résiliable à tout moment, en deux gestes.",
	"cov.eyebrow": "Suis-je couvert ?", "cov.title": "Posez la question avant, pas après.", "cov.sub": "Décrivez une situation avec vos mots. Plume vous dit si vous seriez couvert, combien vous toucheriez, et pourquoi.", "cov.label": "Décrivez une situation", "cov.ph": "On m’a volé mon vélo devant la gare", "cov.ask": "Demander", "cov.try": "Ou essayez :",
	"cov.pay": "Vous touchez", "cov.ded": "Franchise", "cov.when": "Payé sous", "cov.why": "Pourquoi", "cov.foot": "Réponses d’exemple pour un contrat fictif.", "cov.you": "Votre question",
	"v.yes": "Couvert", "v.part": "En partie couvert", "v.no": "Pas couvert", "v.person": "Une personne va vérifier",
	"pr.eyebrow": "Votre prix, à nu", "pr.title": "Voyez où va chaque centime.", "pr.sub": "Bougez les curseurs : votre prix change, et ce que vous toucheriez aussi. Pas de petites lignes. Enfin si, mais on les a traduites.", "pr.product": "Produit", "pr.ded": "Franchise", "pr.cta": "Obtenir ce prix", "pr.fine": "Prix d’exemple pour un assureur fictif.", "pr.note": "Plume est fictif : rien ne peut être acheté ici, mais la prochaine étape du projet construit le devis complet.",
	"pr.month": "/mois", "pr.yours": "Votre assurance {p}", "pr.pot": "Caisse des sinistres", "pr.potS": "Ne paie que les sinistres, gardée à part", "pr.fee": "Plume", "pr.feeS": "Frais fixes : ils n’augmentent pas avec vos garanties", "pr.tax": "Taxes", "pr.taxS": "Collectées pour l’État",
	"pr.L.home": "Biens couverts jusqu’à", "pr.L.car": "Valeur du véhicule couverte", "pr.L.pet": "Plafond véto par an", "pr.L.travel": "Garantie par voyage",
	"pr.s.home": "Ordinateur volé lors d’un cambriolage, valeur {a} : vous touchez {b}.", "pr.s.car": "Pare-chocs arrière à réparer après un accrochage, {a} : vous touchez {b}.", "pr.s.pet": "Votre chien a avalé une chaussette. Facture véto {a} : vous touchez {b}.", "pr.s.travel": "Valise perdue à l’aller, valeur {a} : vous touchez {b}.",
	"how.eyebrow": "Comment ça marche", "how.title": "Assuré avant que votre café refroidisse.", "how.1t": "Parlez-nous de vous", "how.1p": "Quelques questions, une à la fois, avec des mots simples. Aucun formulaire à déchiffrer.", "how.2t": "Ajustez vos garanties", "how.2p": "Choisissez ce qui compte pour vous et voyez le prix, et le remboursement, changer en direct.", "how.3t": "Vous êtes couvert", "how.3p": "Votre contrat démarre tout de suite, avec un résumé d’une page lisible par tous.",
	"cl.eyebrow": "Sinistres", "cl.title": "Suivez votre sinistre comme un colis.", "cl.sub": "Chaque étape, qui s’en occupe, et ce qui se passe ensuite. Fini de se demander si quelqu’un a lu votre dossier.", "cl.replay": "Rejouer l’exemple", "cl.file": "Sinistre · Dégât des eaux", "cl.kitchen": "Plafond de la cuisine", "cl.role": "Experte sinistres, suit votre dossier", "cl.msg": "Écrire à Léa",
	"cl.prog": "En cours", "cl.paid": "Payé", "cl.lea": "Dans le vrai produit, ceci ouvre une discussion avec Léa. Ici, Léa est fictive.",
	"cl.1": "Sinistre déclaré", "cl.1d": "Photos et courte description, en 3 minutes", "cl.1t": "lun. 9 h 12",
	"cl.2": "Vérifié par l’IA", "cl.2d": "Contrat et photos concordent : couvert", "cl.2t": "lun. 9 h 14",
	"cl.3": "Revu par Léa", "cl.3d": "Devis de réparation validé, plombier réservé", "cl.3t": "lun. 11 h 40",
	"cl.4": "Payé", "cl.4d": "{a} versés sur votre compte", "cl.4t": "mar. 10 h 05",
	"ai.eyebrow": "L’IA, avec des humains aux commandes", "ai.title": "L’IA va vite. Les humains décident.", "ai.1t": "Une personne décide de chaque refus", "ai.1p": "L’IA peut payer les sinistres simples en quelques minutes. Elle ne peut jamais dire non seule.", "ai.2t": "Vous voyez toujours pourquoi", "ai.2p": "Chaque décision est expliquée avec des mots simples, avec la clause sur laquelle elle s’appuie.", "ai.3t": "Un humain en un geste", "ai.3p": "Discutez ou appelez une vraie personne, de 8 h à 22 h, tous les jours. Aucun labyrinthe de menus.",
	"pa.eyebrow": "Pause", "pa.title": "Voiture au garage pour l’hiver ? Mettez\u2011la en pause.", "pa.sub": "Le vol et l’incendie restent couverts. Vous ne payez que ce que vous utilisez, et vous réactivez quand vous voulez.", "pa.car": "Auto · Peugeot 208", "pa.sw": "Mettre l’assurance auto en pause",
	"pa.on": "Entièrement couverte · {a}/mois", "pa.off": "En pause · {a}/mois au lieu de {b}", "pa.toast": "Assurance auto en pause. Vol et incendie restent actifs.", "pa.toast2": "Assurance auto réactivée.",
	"em.eyebrow": "Mode urgence", "em.title": "De l’eau partout ? Un seul écran, les bons gestes.", "em.sub": "Le mode urgence garde son calme pour vous : quoi faire tout de suite, une ligne prioritaire, et une déclaration déjà remplie.", "em.open": "Voir les étapes", "em.close": "Masquer les étapes",
	"em.1": "Coupez l’eau au robinet principal.", "em.2": "Prenez quelques photos. Plume les ajoute à votre déclaration.", "em.3": "Un geste : on envoie un plombier et on vous rappelle sous 15 minutes.",
	"ac.eyebrow": "Accessible à tous", "ac.title": "L’assurance doit marcher pour chaque lecteur.", "ac.sub": "Plume est conçu pour le clavier et les lecteurs d’écran, avec des contrastes lisibles partout. Essayez les réglages : ils s’appliquent à tout le site.", "ac.size": "Taille du texte", "ac.motion": "Animations", "ac.contrast": "Contraste renforcé",
	"fq.eyebrow": "Bon à savoir", "fq.title": "Vos questions, des réponses claires.",
	"end.title": "Prêt quand vous l’êtes.", "end.sub": "Deux minutes pour votre prix. Pas d’appel, pas de paperasse, pas de surprise.",
	"foot.lab": "Un produit fictif conçu par David Bitan pour son AI Lab. Plume, Léa Moreau et tous les prix sont inventés.", "foot.other": "Les autres projets AI Lab", "foot.credits": "Crédits"
}};
const frFix = s => s.replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
const t = (k, v = {}) => { let s = (S[lang][k] ?? S.en[k] ?? k); if (lang === "fr") s = frFix(s); return s.replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ""); };
const money = (n, dec) => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: lang === "fr" ? "EUR" : "USD", minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 }).format(n);

/* No single word on the last line: glue the last two words unless that overflows */
const glue = el => {
	const tn = [...el.childNodes].reverse().find(n => n.nodeType === 3 && n.nodeValue.trim());
	if (!tn) return; const v = tn.nodeValue; const i = v.trimEnd().lastIndexOf(" ");
	if (i < 1 || v.trim().split(/\s+/).length < 3) return;
	tn.nodeValue = v.slice(0, i) + " " + v.slice(i + 1);
	if (el.scrollWidth > el.clientWidth + 1) tn.nodeValue = v;
};
const glueAll = (r = document) => $$("h1, h2, h3, p, .em-l span, .acc-q span, .legend .lt, .ex button, dd, .clause, #toastT", r).forEach(glue);

/* Static texts */
const applyTexts = () => {
	D.lang = lang;
	$$("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
	$$("[data-t-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.tAria)));
	$$("[data-t-ph]").forEach(el => el.setAttribute("placeholder", t(el.dataset.tPh)));
	$(".dd-cur").textContent = lang.toUpperCase();
	$$("#langDd li").forEach(li => li.setAttribute("aria-selected", String(li.dataset.lang === lang)));
	themeLabel();
	document.title = lang === "fr" ? "Plume · l’assurance qui se lit en une minute" : "Plume · insurance you can read in a minute";
};
const renderAll = () => { applyTexts(); renderExamples(); renderAnswer(cur.key, cur.text, false); renderCalc(false); renderTrack(); renderPause(); renderFaq(); emLabel(); paintIcons(); requestAnimationFrame(() => glueAll()); };

/* Theme */
const themeLabel = () => { const b = $("#themeBtn"); b.setAttribute("aria-label", t(D.dataset.theme === "dark" ? "theme.light" : "theme.dark")); };
$("#themeBtn").addEventListener("click", () => { D.dataset.theme = D.dataset.theme === "dark" ? "light" : "dark"; P.theme = D.dataset.theme; save(); themeLabel(); });

/* Dropdown */
const dd = $("#langDd"), ddBtn = $(".dd-btn", dd);
const ddOpen = o => { dd.classList.toggle("open", o); ddBtn.setAttribute("aria-expanded", String(o)); if (o) ($("li[aria-selected=true]", dd) || $("li", dd)).focus(); };
ddBtn.addEventListener("click", () => ddOpen(!dd.classList.contains("open")));
document.addEventListener("click", e => { if (!dd.contains(e.target)) { dd.classList.remove("open"); ddBtn.setAttribute("aria-expanded", "false"); } });
$$("li", dd).forEach(li => {
	li.addEventListener("click", () => setLang(li.dataset.lang));
	li.addEventListener("keydown", e => {
		const items = $$("li", dd), i = items.indexOf(li);
		if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
		if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
		if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLang(li.dataset.lang); }
		if (e.key === "Escape" || e.key === "Tab") { ddOpen(false); ddBtn.focus(); }
	});
});
const setLang = l => {
	ddOpen(false); ddBtn.focus();
	if (l === lang) return;
	lang = l; P.lang = l; save();
	if (motionOff()) return renderAll();
	document.body.classList.add("swap");
	setTimeout(() => { renderAll(); document.body.classList.remove("swap"); }, 220);
};

/* Mobile nav */
const burger = $("#burger"), mnav = $("#mnav");
const navOpen = o => { mnav.classList.toggle("open", o); burger.setAttribute("aria-expanded", String(o)); };
burger.addEventListener("click", () => navOpen(!mnav.classList.contains("open")));
$$("#mnav a").forEach(a => a.addEventListener("click", () => navOpen(false)));
addEventListener("keydown", e => { if (e.key === "Escape") { navOpen(false); if (dd.classList.contains("open")) { ddOpen(false); ddBtn.focus(); } } });
const top = $("#top");
addEventListener("scroll", () => top.classList.toggle("scrolled", scrollY > 8), { passive: true });

/* Products */
const PR = {
	home: { base: 9, L: [5000, 60000, 1000, 20000], Dd: [0, 500, 50, 150], a: 1200 },
	car: { base: 34, L: [5000, 50000, 1000, 15000], Dd: [0, 1000, 50, 300], a: 1800 },
	pet: { base: 12, L: [1000, 10000, 500, 4000], Dd: [0, 300, 25, 100], a: 900 },
	travel: { base: 6, L: [1000, 10000, 500, 3000], Dd: [0, 200, 25, 50], a: 700 }
};
const state = { product: "home", L: {}, D: {} };
Object.keys(PR).forEach(k => { state.L[k] = PR[k].L[3]; state.D[k] = PR[k].Dd[3]; });
const price = k => { const p = PR[k]; return p.base * (0.55 + 0.45 * state.L[k] / p.L[3]) * (1.18 - 0.6 * state.D[k] / p.Dd[1]); };

/* Radio groups with arrow keys (hero chooser, price tabs, text size) */
const roving = (group, sel, attr, onPick) => {
	const items = $$(sel, group);
	items.forEach((b, i) => {
		b.addEventListener("click", () => onPick(b));
		b.addEventListener("keydown", e => {
			const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
			if (!d) return; e.preventDefault(); const n = items[(i + d + items.length) % items.length]; n.focus(); onPick(n);
		});
	});
};
const markGroup = (group, sel, attr, match) => $$(sel, group).forEach(b => { const on = match(b); b.setAttribute(attr, String(on)); b.tabIndex = on ? 0 : -1; });
const movePill = group => {
	const pill = $(".pill", group), on = $('[aria-selected="true"], [aria-checked="true"]', group);
	if (!pill || !on) return; pill.style.width = on.offsetWidth + "px"; pill.style.transform = `translateX(${on.offsetLeft - parseFloat(getComputedStyle(pill).left)}px)`;
};
const setProduct = (k, from) => {
	if (!PR[k]) return; const changed = k !== state.product; state.product = k;
	markGroup($(".chooser"), "button", "aria-checked", b => b.dataset.product === k);
	markGroup($("#prTabs"), "button", "aria-selected", b => b.dataset.product === k);
	movePill($("#prTabs"));
	if (changed) renderCalc(from !== "init");
};
roving($(".chooser"), "button", "aria-checked", b => setProduct(b.dataset.product));
roving($("#prTabs"), "button", "aria-selected", b => setProduct(b.dataset.product));
$$("a[data-product]").forEach(a => a.addEventListener("click", () => setProduct(a.dataset.product)));

/* Price calculator */
const slL = $("#slL"), slD = $("#slD");
const fill = s => s.style.setProperty("--p", ((s.value - s.min) / (s.max - s.min) * 100) + "%");
const renderCalc = animate => {
	const k = state.product, p = PR[k];
	const paint = () => {
		[slL.min, slL.max, slL.step] = p.L; slL.value = state.L[k];
		[slD.min, slD.max, slD.step] = p.Dd; slD.value = state.D[k];
		fill(slL); fill(slD);
		$("#slLl").textContent = t("pr.L." + k);
		updateCalc();
	};
	if (animate && !motionOff()) { const b = $("#calcBody"); b.classList.add("out"); setTimeout(() => { paint(); b.classList.remove("out"); }, 200); } else paint();
};
const updateCalc = () => {
	const k = state.product, p = PR[k], total = price(k);
	const tax = total * 0.1, fee = p.base * 0.22, pot = total - tax - fee;
	$("#slLv").textContent = money(state.L[k]); $("#slDv").textContent = money(state.D[k]);
	$("#billL").textContent = t("pr.yours", { p: t("p." + k).toLowerCase() });
	$("#billP").textContent = money(total, true); $("#billU").textContent = t("pr.month");
	const bars = $$("#bar span"); [pot, fee, tax].forEach((v, i) => bars[i].style.flexGrow = v.toFixed(3));
	$("#legend").innerHTML = [["pot", pot, "var(--accent)"], ["fee", fee, "var(--mint)"], ["tax", tax, "var(--line-2)"]].map(([id, v, c]) =>
		`<li><span class="sw" style="background:${c}"></span><span class="lt">${esc(t("pr." + id))}<small>${esc(t("pr." + id + "S"))}</small></span><b>${money(v, true)}</b></li>`).join("");
	const back = Math.max(0, Math.min(p.a, state.L[k]) - state.D[k]);
	$("#scen").innerHTML = `${icon("circle-check")}<p>${t("pr.s." + k, { a: `<b>${money(p.a)}</b>`, b: `<b>${money(back)}</b>` })}</p>`;
	glueAll($("#calc") || document.querySelector(".calc"));
};
slL.addEventListener("input", () => { state.L[state.product] = +slL.value; fill(slL); updateCalc(); });
slD.addEventListener("input", () => { state.D[state.product] = +slD.value; fill(slD); updateCalc(); });
$("#calcCta").addEventListener("click", () => { $("#calcNote").hidden = false; glue($("#calcNote")); });

/* Am I covered? */
const EX = {
	bike: { v: "yes", re: [/bike|bicycle|cycle|v[ée]lo|trottinette|scooter/i, /stol|steal|theft|thief|nick|vol[ée]|vol |piqu|disparu|cambriol/i],
		q: { en: "My bike was stolen outside the station", fr: "On m’a volé mon vélo devant la gare" },
		a: { en: "Covered, as long as it was locked.", fr: "Couvert, du moment qu’il était attaché." },
		f: [["cov.pay", { en: "Its value, up to {1500}", fr: "Sa valeur, jusqu’à {1500}" }], ["cov.ded", "{150}"], ["cov.when", { en: "48 hours", fr: "48 heures" }]],
		w: { en: "Bikes are covered away from home when locked to a fixed point. Keep a photo of the lock: that is all we ask.", fr: "Les vélos sont couverts hors du domicile s’ils sont attachés à un point fixe. Gardez une photo de l’antivol : c’est tout ce qu’on demande." },
		c: { en: "Home policy · 4.2 Theft away from home", fr: "Contrat habitation · 4.2 Vol hors du domicile" } },
	pet: { v: "yes", re: [/\bdog|\bcat\b|\bpupp|\bkitten|chien|\bchat\b|chiot|animal/i, /swallow|\bate\b|eaten|sock|aval|mang|chaussette/i],
		q: { en: "My dog ate a sock, the vet bill is {900}", fr: "Mon chien a avalé une chaussette, facture véto de {900}" },
		a: { en: "Covered. You get {800} back.", fr: "Couvert. Vous récupérez {800}." },
		f: [["cov.pay", "{800}"], ["cov.ded", "{100}"], ["cov.when", { en: "24 hours", fr: "24 heures" }]],
		w: { en: "Swallowed objects count as an accident. We repay the vet bill after your yearly deductible.", fr: "Un objet avalé compte comme un accident. On rembourse la facture après votre franchise annuelle." },
		c: { en: "Pet policy · 2.3 Accidents", fr: "Contrat animaux · 2.3 Accidents" } },
	flight: { v: "part", re: [/flight|plane|airline|airport|avion|\bvol\b|a[ée]roport|compagnie/i, /cancel|strike|delay|annul|gr[èe]ve|retard/i],
		q: { en: "My flight was cancelled because of a strike", fr: "Mon vol a été annulé à cause d’une grève" },
		a: { en: "Partly: we cover the wait, the airline covers the ticket.", fr: "En partie : on couvre l’attente, la compagnie rembourse le billet." },
		f: [["cov.pay", { en: "Up to {300}", fr: "Jusqu’à {300}" }], ["cov.ded", "{0}"], ["cov.when", { en: "48 hours", fr: "48 heures" }]],
		w: { en: "Hotel, meals and transport while you wait are on us. The ticket refund is the airline’s job, and Plume shows you how to claim it.", fr: "Hôtel, repas et transport pendant l’attente sont pour nous. Le remboursement du billet revient à la compagnie, et Plume vous montre comment le demander." },
		c: { en: "Travel policy · 5.1 Delays and cancellations", fr: "Contrat voyage · 5.1 Retards et annulations" } },
	leak: { v: "yes", re: [/leak|water|flood|pipe|fuite|\beau\b|d[ée]g[âa]t des eaux|inond|tuyau|machine [àa] laver|washing/i],
		q: { en: "My washing machine leaked into the flat below", fr: "Ma machine à laver a fui chez le voisin du dessous" },
		a: { en: "Covered: your repairs and your neighbour’s.", fr: "Couvert : vos réparations et celles du voisin." },
		f: [["cov.pay", { en: "Repair costs", fr: "Coût des réparations" }], ["cov.ded", "{150}"], ["cov.when", { en: "5 days", fr: "5 jours" }]],
		w: { en: "Damage at home is your belongings cover; damage you cause to others is your liability cover. One claim handles both.", fr: "Les dégâts chez vous relèvent de vos biens, ceux causés aux autres de votre responsabilité civile. Une seule déclaration gère les deux." },
		c: { en: "Home policy · 3.1 Water damage, 6.1 Liability", fr: "Contrat habitation · 3.1 Dégât des eaux, 6.1 Responsabilité civile" } },
	phone: { v: "no", re: [/phone|screen|laptop|tablet|t[ée]l[ée]phone|[ée]cran|portable|tablette|ordinateur/i, /dropp|broke|crack|smash|tomb|cass|fissur|bris/i],
		q: { en: "I dropped my phone and cracked the screen", fr: "J’ai fait tomber mon téléphone, l’écran est fissuré" },
		a: { en: "Not covered yet. One option would change that.", fr: "Pas encore couvert. Une option changerait ça." },
		f: [["cov.pay", "{0}"], [{ en: "Gadgets option", fr: "Option Appareils" }, { en: "+{3}/month", fr: "+{3}/mois" }], [{ en: "Deductible with it", fr: "Franchise avec" }, "{50}"]],
		w: { en: "Accidental breakage is not in Home Essential. The Gadgets option covers drops and screens for phones, laptops and tablets.", fr: "La casse accidentelle n’est pas dans Habitation Essentiel. L’option Appareils couvre chutes et écrans des téléphones, ordinateurs et tablettes." },
		c: { en: "Home policy · 7 Exclusions, Gadgets option", fr: "Contrat habitation · 7 Exclusions, option Appareils" } }
};
const L10 = x => typeof x === "string" ? x : x[lang];
const fmt = s => L10(s).replace(/\{(\d+)\}/g, (_, n) => money(+n));
const cur = { key: "bike", text: null };
const renderExamples = () => {
	$("#examples").innerHTML = Object.entries(EX).map(([k, e]) => `<button type="button" data-k="${k}" aria-pressed="${cur.key === k && !cur.text}">${esc(fmt(e.q))}</button>`).join("");
	glueAll($("#examples"));
	$$("#examples button").forEach(b => b.addEventListener("click", () => { cur.key = b.dataset.k; cur.text = null; $("#askQ").value = ""; $$("#examples button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); renderAnswer(cur.key, null, true); }));
};
const vIcon = { yes: "circle-check", part: "circle-alert", no: "circle-x", person: "user" };
const renderAnswer = (k, text, animate) => {
	const box = $("#answer"); const e = EX[k];
	const q = text || (e ? fmt(e.q) : "");
	let html;
	if (e) {
		html = `<div class="q">${icon("message-circle")}<p><span class="sr">${esc(t("cov.you"))}: </span>${esc(q)}</p></div>
		<span class="verdict v-${e.v}">${icon(vIcon[e.v])}${esc(t("v." + e.v))}</span>
		<p class="ans-t">${esc(fmt(e.a))}</p>
		<dl class="figs">${e.f.map(([l, v]) => `<div><dt>${esc(typeof l === "string" && l.startsWith("cov.") ? t(l) : L10(l))}</dt><dd>${esc(fmt(v))}</dd></div>`).join("")}</dl>
		<div class="why"><button class="disc" type="button" aria-expanded="false" aria-controls="whyC">${esc(t("cov.why"))}${icon("chevron-down").replace("<i ", '<i class="chev" ')}</button>
		<div class="coll" id="whyC"><div class="coll-in"><p>${esc(L10(e.w))}<span class="clause">${esc(L10(e.c))}</span></p></div></div></div>
		<p class="fine" style="margin-top:16px">${esc(t("cov.foot"))}</p>`;
	} else {
		const P2 = { en: ["This one deserves a real person.", "Léa from our claims team answers questions like this in a few minutes, 8 am to 10 pm.", "Ask Léa"], fr: ["Celle-ci mérite une vraie personne.", "Léa, de l’équipe sinistres, répond à ce genre de question en quelques minutes, de 8 h à 22 h.", "Demander à Léa"] }[lang];
		html = `<div class="q">${icon("message-circle")}<p>${esc(q)}</p></div>
		<span class="verdict v-person">${icon("user")}${esc(t("v.person"))}</span>
		<p class="ans-t">${esc(P2[0])}</p><p class="lead" style="font-size:1rem;margin-top:10px">${esc(lang === "fr" ? frFix(P2[1]) : P2[1])}</p>
		<button class="btn btn-ghost person-btn" type="button" id="askLea">${icon("message-circle")}${esc(P2[2])}</button>
		<p class="note" id="askLeaN" hidden>${esc(t("cl.lea"))}</p>`;
	}
	const put = () => {
		box.innerHTML = `<div class="answer-in${animate && !motionOff() ? " out" : ""}">${html}</div>`;
		const inn = $(".answer-in", box); if (animate) requestAnimationFrame(() => requestAnimationFrame(() => inn.classList.remove("out")));
		const d = $(".disc", box); if (d) d.addEventListener("click", () => { const o = d.getAttribute("aria-expanded") !== "true"; d.setAttribute("aria-expanded", String(o)); $("#whyC").classList.toggle("open", o); });
		const l = $("#askLea"); if (l) l.addEventListener("click", () => { $("#askLeaN").hidden = false; glue($("#askLeaN")); });
		glueAll(box);
	};
	if (animate && !motionOff() && box.firstChild) { box.firstChild.classList.add("out"); setTimeout(put, 250); } else put();
};
$("#askF").addEventListener("submit", ev => {
	ev.preventDefault(); const v = $("#askQ").value.trim(); if (!v) { $("#askQ").focus(); return; }
	const k = Object.keys(EX).find(x => EX[x].re.every(r => r.test(v))) || null;
	cur.key = k; cur.text = v; $$("#examples button").forEach(x => x.setAttribute("aria-pressed", "false"));
	renderAnswer(k, v, true);
});

/* Claim tracker */
let trStep = 0, trTimer = null;
const renderTrack = () => {
	$("#tl").innerHTML = [1, 2, 3, 4].map(n => `<li class="${n <= trStep ? "done" : n === trStep + 1 ? "now" : ""}"><span class="dot">${icon("check")}</span><div><p class="st">${esc(t("cl." + n))}</p><p class="sd">${esc(t("cl." + n + "d", { a: money(1240) }))}</p></div><span class="tm">${esc(t("cl." + n + "t"))}</span></li>`).join("");
	const b = $("#trBadge"); const paid = trStep >= 4; b.className = "badge" + (paid ? " done" : ""); b.innerHTML = icon(paid ? "circle-check" : "clock") + esc(t(paid ? "cl.paid" : "cl.prog"));
};
const stepTrack = () => {
	const lis = $$("#tl li");
	lis.forEach((li, i) => { li.classList.toggle("done", i < trStep); li.classList.toggle("now", i === trStep); });
	const b = $("#trBadge"); const paid = trStep >= 4; b.className = "badge" + (paid ? " done" : ""); b.innerHTML = icon(paid ? "circle-check" : "clock") + esc(t(paid ? "cl.paid" : "cl.prog"));
};
const playTrack = () => {
	clearInterval(trTimer);
	if (motionOff()) { trStep = 4; return stepTrack(); }
	trStep = 0; stepTrack();
	trTimer = setInterval(() => { trStep++; stepTrack(); if (trStep >= 4) clearInterval(trTimer); }, 1100);
};
$("#replay").addEventListener("click", playTrack);
$("#msgLea").addEventListener("click", () => { const n = $("#leaNote"); n.textContent = t("cl.lea"); n.hidden = false; glue(n); });

/* Pause */
let paused = false;
const renderPause = () => {
	const s = $("#pauseState"); s.textContent = paused ? t("pa.off", { a: money(4), b: money(34) }) : t("pa.on", { a: money(34) });
	s.classList.toggle("paused", paused); $("#pauseSw").setAttribute("aria-checked", String(paused));
};
let toastTimer;
const setPause = (v, withToast) => {
	paused = v; renderPause();
	const tt = $("#toast"); clearTimeout(toastTimer);
	if (withToast) { tt.hidden = false; $("#toastT").textContent = t(v ? "pa.toast" : "pa.toast2"); glue($("#toastT")); $("#undo").style.display = v ? "" : "none"; tt.style.animation = "none"; tt.offsetHeight; tt.style.animation = ""; toastTimer = setTimeout(() => tt.hidden = true, 6000); }
	else tt.hidden = true;
};
$("#pauseSw").addEventListener("click", () => setPause(!paused, true));
$("#undo").addEventListener("click", () => { setPause(false, false); $("#pauseSw").focus(); });

/* Emergency steps */
const emBtn = $("#emBtn");
const emLabel = () => { $("span", emBtn).textContent = t(emBtn.getAttribute("aria-expanded") === "true" ? "em.close" : "em.open"); };
emBtn.addEventListener("click", () => { const o = emBtn.getAttribute("aria-expanded") !== "true"; emBtn.setAttribute("aria-expanded", String(o)); $("#emSteps").classList.toggle("open", o); emLabel(); });

/* Accessibility settings, applied to the whole site */
const seg = $("#segSize");
const setSize = v => { if (v === "m") delete D.dataset.size; else D.dataset.size = v; P.size = v === "m" ? undefined : v; save(); markGroup(seg, "button", "aria-checked", b => b.dataset.v === v); requestAnimationFrame(() => { movePill(seg); movePill($("#prTabs")); }); };
roving(seg, "button", "aria-checked", b => setSize(b.dataset.v));
const swM = $("#swMotion"), swC = $("#swContrast");
const syncSw = () => { swM.setAttribute("aria-checked", String(D.dataset.motion !== "off")); swC.setAttribute("aria-checked", String(D.dataset.contrast === "high")); };
swM.addEventListener("click", () => { if (D.dataset.motion === "off") { delete D.dataset.motion; delete P.motion; } else { D.dataset.motion = "off"; P.motion = "off"; } save(); syncSw(); });
swC.addEventListener("click", () => { if (D.dataset.contrast === "high") { delete D.dataset.contrast; delete P.contrast; } else { D.dataset.contrast = "high"; P.contrast = "high"; } save(); syncSw(); });

/* FAQ */
const FAQ = {
	en: [["Is Plume a real insurer?", "No. Plume is a fictional product designed by David Bitan for his AI Lab, to show what insurance could feel like. Nothing here can be bought."],
		["Can I talk to a person?", "Yes, always. Chat or call, 8 am to 10 pm every day. Emergencies get a priority line around the clock."],
		["Does AI decide my claim?", "AI checks simple claims and can pay them in minutes. Any refusal, or anything unclear, goes to a person, and you see the reasons."],
		["How is my price calculated?", "From what you insure, how much cover you choose and your deductible. Our fee is flat, and you see the full breakdown before you buy."],
		["Can I pause or cancel?", "Pause a cover when you do not need it, or cancel anytime in two taps. No fees, no letter to send."],
		["What happens when I make a claim?", "You follow every step like a parcel, with the name of the person handling it and the time it should take."]],
	fr: [["Plume est-il un vrai assureur ?", "Non. Plume est un produit fictif conçu par David Bitan pour son AI Lab, pour montrer ce que l’assurance pourrait être. Rien ici ne peut être acheté."],
		["Puis-je parler à quelqu’un ?", "Oui, toujours. Discussion ou appel, de 8 h à 22 h tous les jours. Les urgences ont une ligne prioritaire jour et nuit."],
		["Est-ce l’IA qui décide de mon sinistre ?", "L’IA vérifie les sinistres simples et peut les payer en quelques minutes. Tout refus, ou tout cas flou, passe par une personne, et vous voyez les raisons."],
		["Comment mon prix est-il calculé ?", "Selon ce que vous assurez, le niveau de garantie choisi et votre franchise. Nos frais sont fixes, et vous voyez le détail complet avant d’acheter."],
		["Puis-je mettre en pause ou résilier ?", "Mettez une garantie en pause quand vous n’en avez pas besoin, ou résiliez à tout moment en deux gestes. Sans frais, sans courrier."],
		["Que se passe-t-il quand je déclare un sinistre ?", "Vous suivez chaque étape comme un colis, avec le nom de la personne qui s’en occupe et le délai prévu."]]
};
const faqOpen = new Set();
const renderFaq = () => {
	$("#faq").innerHTML = FAQ[lang].map(([q, a], i) => { const o = faqOpen.has(i); const f = lang === "fr" ? frFix : x => x;
		return `<div class="acc-i"><h3><button class="acc-q" type="button" aria-expanded="${o}" aria-controls="fa${i}" id="fq${i}"><span>${esc(f(q))}</span>${icon("chevron-down").replace("<i ", '<i class="chev" ')}</button></h3><div class="coll${o ? " open" : ""}" id="fa${i}" role="region" aria-labelledby="fq${i}"><div class="coll-in acc-a"><p>${esc(f(a))}</p></div></div></div>`; }).join("");
	$$(".acc-q").forEach((b, i) => b.addEventListener("click", () => { const o = !faqOpen.has(i); o ? faqOpen.add(i) : faqOpen.delete(i); b.setAttribute("aria-expanded", String(o)); $("#fa" + i).classList.toggle("open", o); }));
};

/* Scroll reveals, illustration drawing, tracker start */
const io = new IntersectionObserver(es => es.forEach(e => {
	if (!e.isIntersecting) return; const el = e.target; io.unobserve(el);
	el.classList.add("in");
	if (el.matches(".ill")) { el.classList.add("drawn"); setTimeout(() => el.classList.add("alive"), 2600); }
	if (el.id === "track") setTimeout(playTrack, 400);
}), { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
$$(".reveal, .ill").forEach(el => io.observe(el));

/* Start */
addEventListener("resize", () => { movePill($("#prTabs")); movePill(seg); });
renderAll(); syncSw(); setProduct("home", "init"); setSize(D.dataset.size || "m");
trStep = 0; stepTrack();
if (document.fonts) document.fonts.ready.then(() => { movePill($("#prTabs")); movePill(seg); glueAll(); });
})();
