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

const END_TO_END = 'Senior Product Designer, end to end';
const PERSONAL = 'Personal project, designed and built with AI';

export const caseLines: Record<string, CaseLines> = {
	'sonary-dashboard': {
		role: END_TO_END,
		challenge: 'The first visual direction was rejected as too close to competitors.',
		did: 'I championed the alternative I had proposed from the start, then redesigned everything: palette, icons and a new dark mode.',
		result: 'Delivered on time, in light and dark, with an AI chat.',
	},
	'sonary-website': {
		role: END_TO_END,
		challenge: 'Stay consistent and warm across 37 software categories and 1,400+ generated pages.',
		did: 'A strict system of smart components, three major redesigns and continuous improvements in between.',
		result: '1,400+ indexed pages on one design system.',
	},
	top5: {
		role: END_TO_END,
		challenge: "Serve dozens of verticals with different content and colors, without duplicating components.",
		did: "A parametric design system in Figma: each component takes on the site's color.",
		result: 'One design system for 40+ sites, each with its own colors and button styles.',
	},
	'ryze-brand': {
		role: END_TO_END,
		challenge: 'Balance a modern tech image with a warm personality, for candidates and partners alike.',
		did: 'Several directions explored with the team, then an abstract illustration system built from scratch.',
		result: 'The third full redesign of the site, delivered in 2026.',
	},
	'sonary-mailer': {
		role: END_TO_END,
		challenge: 'Email client constraints: a narrow grid and automatic mobile adaptation.',
		did: 'A modular master template, mobile-first and dark-mode aware.',
		result: 'One template for every Sonary email, true to the brand.',
	},
	playright: {
		role: 'Senior Product Designer, homepage and ranking pages',
		challenge: 'Follow UKGC rules and still stand out in a crowded market.',
		did: 'Redesigned the homepage and ranking pages, built in trust blocks and coded the hover animations in HTML/CSS.',
		result: 'The required notices are there without crushing the visual hierarchy.',
	},
	'branding-old': {
		role: 'Interactive Art Designer',
		challenge: 'A high volume of campaigns for several advertisers.',
		did: 'Mini-sites, mini-games and animated banners in Flash and HTML/CSS (Bank Leumi, Afeka, UMI Motors…).',
		result: 'Some campaigns won Cactus awards (gold, silver, bronze).',
	},
	'ui-ux-vintage': {
		role: 'UI/UX Designer, then Senior UI/UX Designer',
		challenge: 'Varied products for several companies.',
		did: 'The full cycle on every project (Wochat, a SaaS dashboard).',
	},
	gamingtech: {
		role: 'UI/UX Designer, sole designer across the three brands',
		challenge: 'Evolve the casino and sports betting sites of three brands in parallel.',
		did: 'Sole designer: lobbies, bonuses, deposit flows, banners, interfaces and animations.',
	},
	tradologic: {
		role: 'Interactive Art Designer',
		challenge: 'White-label casinos for several operators.',
		did: 'Lobbies, banners, interfaces and animations; I quickly took on the most visible projects.',
	},
	facet: {
		role: PERSONAL,
		challenge: 'Understand where your money goes from a simple bank statement.',
		did: 'The statement is read in your browser, fully analyzed, and you ask questions in plain words.',
		result: 'A live demo in seven languages, Hebrew included.',
	},
	margin: {
		role: PERSONAL,
		challenge: 'Understand a contract without reading all of it.',
		did: 'An AI reader that explains what matters and shows the exact passage behind every point.',
		result: 'A live demo in ten languages, Hebrew included.',
	},
	otium: {
		role: PERSONAL,
		challenge: 'Hand a trip to an AI without losing control.',
		did: 'An agent that searches, compares and holds flights and a stay, then waits for your OK before paying.',
		result: 'A live demo in five languages, Hebrew included.',
	},
	'apex-athletic-club': {
		role: PERSONAL,
		challenge: 'A club invented from scratch, with booking, a shop and an AI coach.',
		did: 'Five linked pages, booking, a live timetable, a shop, a guest pass, and APEX Coach designed state by state.',
		// "…, with its AI chatbot." only once the chatbot is checked live (not checked from here).
		result: 'A live demo to try.',
	},
	'trattoria-fiori': {
		role: PERSONAL,
		challenge: 'Create a trattoria from scratch.',
		did: 'Full identity, menu and table booking with a demo sign-in.',
		result: 'A complete live demo to try.',
	},
};

/** The project after `slug` in its own list (the last one loops to the first). */
export function nextOf(slug: string, order: string[]): string | null {
	const i = order.indexOf(slug);
	return i < 0 ? null : order[(i + 1) % order.length];
}
