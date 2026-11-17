// Étape 8 (I, K, L), texts validated by David on 15/11, used as given.
// - role: third item of the meta line (Work) or next to the eyebrow (AI Lab).
// - lines: "Challenge / What I did / Result", shown under the intro of each
//   project page (the full case study stays folded). Some pages have only two.
// - order: the order of the home page, for the single "Next project" link
//   (Work pages chain among themselves, AI Lab pages too; the last goes back
//   to the first).

export const WORK_RECENT = ['sonary-dashboard', 'top5', 'sonary-website', 'playright', 'ryze-brand', 'sonary-mailer'];
export const WORK_EARLIER = ['ui-ux-vintage', 'branding-old', 'gamingtech', 'tradologic'];
export const WORK_ORDER = [...WORK_RECENT, ...WORK_EARLIER];
export const LAB_ORDER = ['apex-athletic-club', 'facet', 'margin', 'otium', 'trattoria-fiori']; // étape 12, 22

export interface CaseLines {
	role: string;
	challenge: string;
	did: string;
	result?: string;
}

// Étape 14, ajout 1 (S33): texts replaced word for word (CL2, 16/11);
// the role now sits in the 4th column of the block under the header.
export const caseLines: Record<string, CaseLines> = {
	'otium': {
		role: "Personal project, designed and built with AI.",
		challenge: "Hand a trip to an AI without losing control.",
		did: "An agent that searches, compares and holds flights and a stay, then waits for your OK before paying.",
		result: "A live demo in five languages, Hebrew included.",
	},
	'apex-athletic-club': {
		role: "Personal project I designed and built with AI: the brand, the five pages and the coach’s answers.",
		challenge: "Invent a club from scratch, with class booking, a shop and an AI coach, spread across five linked pages.",
		did: "I designed five pages with booking, a shop and a guest pass, and the coach state by state.",
		result: "A live demo: you book a class, change a workout in chat and see warning signs go to a human.",
	},
	'facet': {
		role: "Personal project I designed and built with AI: every screen and every chart.",
		challenge: "Show where your money goes, from a plain bank statement.",
		did: "Facet reads the statement in your browser and sorts each line. You ask in plain words, and each answer shows the lines behind it.",
		result: "A live demo in seven languages, Hebrew included, on your own file.",
	},
	'margin': {
		role: "Personal project I designed and built with AI, including the report layout and the checks on each answer.",
		challenge: "Help people understand what they sign, before they sign it.",
		did: "Margin explains each document in plain words. Every point has a link that opens the exact passage, highlighted on its page.",
		result: "A live demo in ten languages, Hebrew included, on an invented sample contract.",
	},
	'trattoria-fiori': {
		role: "Personal project I designed and built with AI. I directed every choice along the way.",
		challenge: "Create a family trattoria in San Gimignano from scratch, with its brand, its menu and its bookings.",
		did: "I designed the brand, the menu and table booking with a demo sign-in, plus a client area where you see or cancel your table.",
		result: "A complete live demo to try, with the menu and a working reservation.",
	},
	'sonary-dashboard': {
		role: "Senior Product Designer, end to end: the design system, the dark mode and the natural-language assistant.",
		challenge: "Give Sonary a visual direction of its own, clearly apart from its competitors.",
		did: "I championed the alternative I had proposed from the start, then redesigned everything: palette, icons and a new dark mode.",
		result: "Delivered on time, in light and dark, with an AI chat.",
	},
	'top5': {
		role: "Senior Product Designer, end to end: I designed the shared components and each site’s color rules.",
		challenge: "Serve dozens of verticals, each with its own content and colors, from one shared set of components.",
		did: "I built a parametric design system in Figma: each component takes on the site’s color.",
		result: "One design system for 40+ sites, each with its own colors and button styles.",
	},
	'sonary-website': {
		role: "Senior Product Designer, end to end: the component system and all three redesigns.",
		challenge: "Stay consistent and warm across 37 software categories and 1,400+ generated pages.",
		did: "I built a strict system of smart components, then led three major redesigns with steady improvements in between.",
		result: "1,400+ pages indexed by search engines, all on one design system.",
	},
	'playright': {
		role: "Senior Product Designer on the homepage and ranking pages, including their hover animations.",
		challenge: "Make the site stand out in a crowded market while it follows UKGC rules.",
		did: "I redesigned the homepage and ranking pages, added trust blocks and coded the hover animations in HTML and CSS.",
		result: "The required notices sit on the page and the visual hierarchy stays clear.",
	},
	'ryze-brand': {
		role: "Senior Product Designer, end to end: research, design system and design QA after launch.",
		challenge: "Balance a modern tech image with a warm personality, for candidates and partners alike.",
		did: "I explored several directions with the team, then built an abstract illustration system from scratch.",
		result: "A new marketing site in light and dark modes, on 5 breakpoints.",
	},
	'sonary-mailer': {
		role: "Senior Product Designer, end to end: I designed each block, including the article layout and the call to action.",
		challenge: "Make every Sonary email look right in any inbox, on a narrow grid that adapts to mobile on its own.",
		did: "I built a modular master template, mobile-first and ready for dark mode.",
		result: "One template for every Sonary email, true to the brand.",
	},
	'ui-ux-vintage': {
		role: "UI/UX Designer, then Senior UI/UX Designer, owning each project end to end.",
		challenge: "Switch between very different products: a translation chat app and a SaaS back office.",
		did: "I ran the full cycle on each project: research, wireframes, high-fidelity screens, iterations and developer handoff.",
		result: "Wochat reached the App Store and Google Play, with free voice and video calls and real-time translation.",
	},
	'branding-old': {
		role: "Senior UI/UX Designer in a team of about four; about 50 of my 70+ feature ideas were accepted.",
		challenge: "Let two people talk on video, each in their own language, and understand each other right away.",
		did: "I designed the app, its design system and icons, the website and the presentations, then the brand book.",
		result: "One identity across the app, the website and the business cards.",
	},
	'gamingtech': {
		role: "UI/UX Designer, the only one on 10Bet, Real Deal Bet and Bet Rally, animations included.",
		challenge: "Push three brands forward at once, each with its own casino and sports betting site.",
		did: "I designed game lobbies, bonus offers and deposit flows, plus promotional banners in large numbers.",
		result: "One person kept all six live sites moving: three casinos and three sports betting sites, on desktop and mobile.",
	},
	'tradologic': {
		role: "Interactive Art Designer in a team of several designers.",
		challenge: "Give each operator its own look on one shared white-label platform.",
		did: "I designed the lobbies and promotional landing pages, plus marketing assets in Flash and HTML5.",
		result: "I took on the most visible projects, and my animations ran in several markets.",
	},
};

/** The project after `slug` in its own list (the last one loops to the first). */
export function nextOf(slug: string, order: string[]): string | null {
	const i = order.indexOf(slug);
	return i < 0 ? null : order[(i + 1) % order.length];
}
