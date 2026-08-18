/** One section of a rich case study — heading + free-form body (paragraphs
 * separated by blank lines). Rendered by the /work/[slug] template. */
export interface Section {
	heading: string;
	body: string;
}

export interface FullProject {
	slug: string;
	title: string;
	client: string;
	year: string;
	/** Primary category — used for the tag shown on the project page header. */
	category: string;
	/**
	 * Filter categories — used by the home pill filter (SelectedWork).
	 * A project can belong to multiple pills (e.g. a SaaS project also
	 * counts as UI/UX). If omitted, falls back to `[category]`.
	 */
	categories?: string[];
	shortDesc: string;
	/** Legacy plain-text case study. Used as a fallback when `sections` is
	 * absent. New/rewritten projects use `sections` instead for structured
	 * rendering (h2 + paragraphs). */
	fullDesc: string;
	/** Structured case study — preferred over `fullDesc` when present. */
	sections?: Section[];
	/** Optional CTA to the live product. Rendered as a button after the
	 * case study body. */
	liveUrl?: string;
	/** Optional short note rendered above the "Visit live site" button.
	 * Use it when the visitor needs extra context to actually reach the
	 * live experience (e.g. geo-restrictions, sign-up flow, VPN needed). */
	liveUrlNote?: string;
	/** Optional per-URL device hint. Used when a gallery file lacks the usual
	 * `-desktop` / `-mobile` token (legacy uploads, single-name files). Key =
	 * substring matched against the image URL; first match wins. Consumed by
	 * `groupImagesByZone` in src/lib/zones.ts. */
	imageDeviceOverrides?: Record<string, 'desktop' | 'mobile'>;
	thumbnail: string;
	gallery: string[];
	tags: string[];
	featured: boolean;
	orientation: 'portrait' | 'landscape';
}

// Sourced from ../portfolio-cms-v2.xlsx (Projects sheet). full_desc entries
// marked PLACEHOLDER in the sheet are early scaffolding text, not final copy.
export const allProjects: FullProject[] = [

	{
		slug: 'sonary-dashboard',
		title: `Sonary — Software Stack Manager`,
		client: `Ryze Beyond`,
		year: '2025',
		category: 'SaaS',
		categories: ['SaaS', 'UI/UX'],
		shortDesc: `Sole-designed a SaaS to track software subscriptions — full dark/light design system, 96+ shipped frames, AI-powered flows.`,
		fullDesc: `Sole-designed a SaaS to track software subscriptions — full dark/light design system, 2,000+ frames, AI chat bot for natural-language queries. See structured case study below.`,
		liveUrl: 'https://sonary.com',
		liveUrlNote: `Note: to reach the actual dashboard, click 'Login/Sign up' at the top right. Alternatively, 'Get started' leads to a landing page with a Sign up button.`,
		sections: [
			{
				heading: 'Context',
				body: `Software subscriptions are messy — teams sign up for SaaS across departments, individual receipts sit in different inboxes, and nobody has a clean picture of what's actually being spent, used, or duplicated.

Sonary was Ryze Beyond's answer: a single dashboard that gives users a full view of their subscription stack (spend per month, potential savings, unused tools) while surfacing personalized alternatives — recommendations funded through Sonary's affiliate model, which keeps the product free for end users.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on the product, within a cross-functional team of product managers, content managers and engineers. From research to shipped design system, and through design QA post-implementation.`,
			},
			{
				heading: 'Approach',
				body: `Two months of concentrated work (~4.5 days per week).

Research phase: user interviews, competitive benchmarking, curated inspiration from Dribbble, Pinterest and comparable market products, then accelerated exploration with AI tools (Midjourney, Firefly, Figma AI) to rapidly generate visual directions before narrowing down.

Then: information architecture, wireframes, high-fidelity design, iteration on stakeholder feedback, developer hand-off, and design QA after implementation to verify conformance screen by screen.

Design system extended from the Sonary Website foundation (already ~6 years mature at that point), then expanded with dashboard-heavy components — data grids, filters, complex flows, multi-state modals — all responsive across 5 breakpoints (Desktop 1920, Laptop 1280, Tablet landscape, Tablet portrait, Mobile 375), with all component states (empty, loading, filter, multi-select, modals) documented. Separate motion design system documented in Figma for developers, complemented by SVGator animations delivered when needed. An AI chat bot was designed as a dedicated flow so users could query their stack in natural language.`,
			},
			{
				heading: 'Key challenge',
				body: `An initial visual direction, defined collectively upfront, didn't pass top-level review — deemed too close to what competitors were shipping.

I then brought forward the alternative I had been proposing from the start; once validated, it required a full re-design in two weeks (9 working days at 4.5 days/week): new palette, new iconography, addition of a dark mode (only one mode existed at first), applied across a project of 2,000+ frames. Delivered on time.`,
			},
			{
				heading: 'Deliverables',
				body: `6 core surfaces (Software Stack, Calculators, User Settings, Login, Dashboard, AI Chat Bot). Design system with variants, auto-layout, nested and interactive components. The full project runs over 2,000 frames — the screens shown here are a representative sample.`,
			},
			{
				heading: 'What I took from it',
				body: `Consolidating both sides of the value equation into one product — help users spend less, help the business recommend more — is a UX balancing act that only works in a team.

Building on top of the Sonary Website design system, itself mature after six years, meant the Dashboard could ship complex flows quickly while contributing new patterns (data grids, dashboard widgets, chat bot flows) back to the shared library.`,
			},
		],
		// Homepage thumb switched to the real Dashboard screen (the 4 gradient
		// stat cards + donut + spend timeline) — more recognizable than the
		// software-stack table for a first impression.
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785342119/portfolio/sonary-dashboard/07---dashboard/desktop/dark-mode/dashboard.webp',
		gallery: [
			// Featured first (David preference 2026-08-06): the 4-stat-cards
			// dashboard opens Desktop·Dark, the team-member-board opens
			// Desktop·Light — most recognizable frames for the case study.
			'https://res.cloudinary.com/akael/image/upload/v1785342119/portfolio/sonary-dashboard/07---dashboard/desktop/dark-mode/dashboard.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342098/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/team-member-board.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342017/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---grid-with-all-columns-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342019/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---grid-with-all-columns.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342020/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---list---bulk-selection-button-delete.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342022/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---list---categories-dropdown-open.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342023/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---list---popup-delete-software.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342024/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---list---status-dropdown-open.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342026/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/dashboard---list-with-all-columns.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342028/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/popups-set-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342029/portfolio/sonary-dashboard/01---software-stack-page/desktop/dark-mode/popups-set-2.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342031/portfolio/sonary-dashboard/01---software-stack-page/desktop/light-mode/dashboard---grid-with-all-columns.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342032/portfolio/sonary-dashboard/01---software-stack-page/desktop/light-mode/dashboard---list---categories-dropdown-open.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342034/portfolio/sonary-dashboard/01---software-stack-page/desktop/light-mode/dashboard---list---status-dropdown-open.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342035/portfolio/sonary-dashboard/01---software-stack-page/desktop/light-mode/dashboard---list-with-all-columns.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342036/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---empty---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342038/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---grid---colapsed.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342039/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---grid---mobile---bottom-menu.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342040/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---grid---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342042/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---grid---open-filter.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342043/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---list---mobile---bottom-menu.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342044/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---list---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342046/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/dashboard---list--open-filter.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342047/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/lightbox-375.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342048/portfolio/sonary-dashboard/01---software-stack-page/mobile/dark-mode/question-in-2-steps.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342050/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/3-steps.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342051/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---grid---mobile---bottom-menu.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342053/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---grid---mobile-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342054/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---grid---mobile-2.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342055/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---grid---mobile-3.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342056/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---grid---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342057/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---list---mobile---bottom-menu.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342059/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---list---mobile-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342060/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dashboard---list---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342062/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/dropdown-375.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342063/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/edit-software-992.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342064/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/lightbox-375.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342066/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/popup-375.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342067/portfolio/sonary-dashboard/01---software-stack-page/mobile/light-mode/question-in-2-steps.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342068/portfolio/sonary-dashboard/03---calculators-main-page/desktop/dark-mode/dashboard---forms.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342070/portfolio/sonary-dashboard/03---calculators-main-page/desktop/light-mode/dashboard---forms.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342074/portfolio/sonary-dashboard/03---calculators-main-page/mobile/dark-mode/dashboard---forms.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342075/portfolio/sonary-dashboard/03---calculators-main-page/mobile/light-mode/dashboard---forms.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342078/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/dashboard---list-with-all-columns.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342080/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/profile-settings-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342081/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/profile-settings.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342082/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/reset-password---google---facebook---linkedin.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342083/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/reset-password.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342085/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/team-member-dropdown-menu---edit---resend---remove.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342086/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/team-member-board-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342087/portfolio/sonary-dashboard/05---user-setting/desktop/dark-mode/team-member-board.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342089/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/dashboard---list-with-all-columns.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342090/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/profile-settings-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342091/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/profile-settings.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342093/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/reset-password---google---facebook---linkedin.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342094/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/reset-password.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342096/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/team-member-dropdown-menu---edit---resend---remove.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342097/portfolio/sonary-dashboard/05---user-setting/desktop/light-mode/team-member-board-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342099/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/dashboard---list---mobile-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342101/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/dashboard---list---mobile-2.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342102/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/dashboard---list---mobile-3.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342103/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/dashboard---list---mobile-4.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342104/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/dashboard---list---mobile-5.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342106/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/dashboard---list---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342107/portfolio/sonary-dashboard/05---user-setting/mobile/dark-mode/reset-password.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342108/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/dashboard---list---mobile-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342109/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/dashboard---list---mobile-2.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342111/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/dashboard---list---mobile-3.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342112/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/dashboard---list---mobile-4.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342113/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/dashboard---list---mobile-5.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342114/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/dashboard---list---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342116/portfolio/sonary-dashboard/05---user-setting/mobile/light-mode/reset-password.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342117/portfolio/sonary-dashboard/07---dashboard/desktop/dark-mode/dashboard-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342121/portfolio/sonary-dashboard/07---dashboard/mobile/dark-mode/dashboard.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342123/portfolio/sonary-dashboard/16---chat-bot/desktop/dark-mode/01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342124/portfolio/sonary-dashboard/16---chat-bot/desktop/dark-mode/02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342126/portfolio/sonary-dashboard/16---chat-bot/desktop/dark-mode/03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342127/portfolio/sonary-dashboard/16---chat-bot/desktop/dark-mode/04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342129/portfolio/sonary-dashboard/16---chat-bot/desktop/dark-mode/05.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342130/portfolio/sonary-dashboard/16---chat-bot/desktop/dark-mode/06.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342132/portfolio/sonary-dashboard/16---chat-bot/desktop/light-mode/01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342133/portfolio/sonary-dashboard/16---chat-bot/desktop/light-mode/02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342135/portfolio/sonary-dashboard/16---chat-bot/desktop/light-mode/03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342136/portfolio/sonary-dashboard/16---chat-bot/desktop/light-mode/04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342137/portfolio/sonary-dashboard/16---chat-bot/desktop/light-mode/05.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342139/portfolio/sonary-dashboard/16---chat-bot/desktop/light-mode/collapse.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342140/portfolio/sonary-dashboard/16---chat-bot/mobile/dark-mode/mobile---01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342142/portfolio/sonary-dashboard/16---chat-bot/mobile/dark-mode/mobile---02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342144/portfolio/sonary-dashboard/16---chat-bot/mobile/dark-mode/mobile---04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342145/portfolio/sonary-dashboard/16---chat-bot/mobile/dark-mode/mobile---07.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342146/portfolio/sonary-dashboard/16---chat-bot/mobile/light-mode/mobile---10.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342147/portfolio/sonary-dashboard/16---chat-bot/mobile/light-mode/mobile---11.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342149/portfolio/sonary-dashboard/16---chat-bot/mobile/light-mode/mobile---14.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342150/portfolio/sonary-dashboard/16---chat-bot/mobile/light-mode/mobile---8.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342151/portfolio/sonary-dashboard/16---chat-bot/mobile/light-mode/mobile---9.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342473/portfolio/sonary-dashboard/16-chat-bot/mobile/dark-mode/mobile-03.webp',
		],
		tags: ['SaaS', 'Dashboard', 'Design System', 'Dark Mode', 'AI-UX', 'Responsive'],
		featured: true,
		orientation: 'landscape',
	},
	{
		slug: 'sonary-website',
		title: `Sonary — Marketing Website`,
		client: `Ryze Beyond`,
		year: '2019 – 2026',
		category: 'SaaS',
		categories: ['SaaS', 'UI/UX'],
		shortDesc: `Sole designer since 2019 on Sonary's SaaS comparison platform — 37 verticals, ~3,000 CMS pages, three major redesigns.`,
		fullDesc: `Sole designer on Sonary's SaaS comparison and review platform since 2019. Design system that later seeded the Sonary Dashboard product. See structured case study below.`,
		liveUrl: 'https://sonary.com',
		sections: [
			{
				heading: 'Context',
				body: `Sonary is a SaaS software comparison and review platform for SMBs, published by Ryze Beyond. The site covers 37 verticals (AI, E-commerce, Design, Development, Finance, HR, IT, Productivity, Sales & Marketing, and more) through buying guides, side-by-side comparisons, editorial reviews, and category lineups. It complements Sonary Dashboard — the software subscription tracker from the same publisher, shipped in 2026.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on the site since 2019. Three major redesigns spaced roughly two years apart, each running from research through post-implementation design QA. Between redesigns, continuous iteration: new pages, new features, incremental improvements.`,
			},
			{
				heading: 'Approach',
				body: `Constant benchmarking of domain references (G2, Capterra, Software Advice) cross-referenced with Dribbble and Pinterest to avoid the "directory" look. On the latest redesign, the research phase was accelerated with Midjourney, Firefly and Figma AI for moodboards and concept exploration.

The design system was built for the site starting in 2019 (color tokens, Inter typography, radius, light and dark modes) — later extended to the Sonary Dashboard product shipped in 2026. Components were designed from day one as editable templates so the content team could add reviews without design intervention.`,
			},
			{
				heading: 'Key challenge',
				body: `Designing a system that could absorb the site's growth — 37 very different verticals (finance, AI, HR, e-commerce…) and close to 3,000 CMS-generated pages — without losing consistency or editorial tone. Every template needed to feel warm and inviting despite the functional density (comparison tables, review cards, scoring, lineups).

Addressed through a strict smart-component hierarchy and a library of editorial patterns (illustrated headers, quote blocks, category chips) that break up the dense sections.`,
			},
			{
				heading: 'Deliverables',
				body: `Templates covering homepage, article hub, article, review, comparison, alternative/lineup, about and category pages — close to 3,000 pages generated through the CMS across 37 verticals.

Notable components: homepage, 37-category mega menu, review card, comparison table, interactive lineup — all built as smart components reused across templates.

Five breakpoints designed systematically (Desktop 1920, Laptop 1280, Tablet landscape, Tablet portrait, Mobile 375). WordPress → Webflow migration on the latest redesign, with a full design system rebuild in Webflow and handoff to the content team. Cross-functional work with PM, front-end and back-end developers, content writers, marketing and SEO.`,
			},
			{
				heading: 'What I took from it',
				body: `Seven years on the same site taught me that a design system lasts when it makes the team autonomous — content, marketing, developers — not when it piles on rules.`,
			},
		],
		// article-hub/ files were uploaded before the -desktop / -mobile naming
		// convention was locked in. Match by unique substring so the URL patch
		// stays scoped to these two files. Ordering matters: the "-1" suffix
		// key must come before the bare key so a startsWith-style substring
		// match hits the mobile variant first.
		imageDeviceOverrides: {
			'article-hub/article-hub-1': 'mobile',
			'article-hub/article-hub.webp': 'desktop',
		},
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785342185/portfolio/sonary-website/homepage/home-page-desktop.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785342185/portfolio/sonary-website/homepage/home-page-desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342187/portfolio/sonary-website/homepage/home-page-mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342169/portfolio/sonary-website/alternative-prod-info/alternative---desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342172/portfolio/sonary-website/alternative-prod-info/mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342174/portfolio/sonary-website/article-hub/article-hub-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342177/portfolio/sonary-website/article-hub/article-hub.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342180/portfolio/sonary-website/articles/article---desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342183/portfolio/sonary-website/articles/article---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342190/portfolio/sonary-website/legal/legal-page---desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342193/portfolio/sonary-website/lineup/lineup---desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342195/portfolio/sonary-website/lineup/lineup---mobile-1.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342197/portfolio/sonary-website/lineup/lineup---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342199/portfolio/sonary-website/review-hub/desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342201/portfolio/sonary-website/review-hub/mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342204/portfolio/sonary-website/review-page/review-page---desktop-side-table-of-content.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342207/portfolio/sonary-website/review-page/review-page---with-table-of-content-open---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342208/portfolio/sonary-website/write-a-review/write-review-step-2---desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342210/portfolio/sonary-website/write-a-review/write-review-step-2---mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342476/portfolio/sonary-website/legal/legal-page-mobile.webp',
		],
		tags: ['Marketing Site', 'Content', 'SEO'],
		featured: true,
		orientation: 'portrait',
	},
	{
		slug: 'top5',
		title: `Top5`,
		client: `Ryze Beyond`,
		year: '2020 – 2026',
		category: 'SaaS',
		categories: ['SaaS', 'B2B', 'UI/UX'],
		shortDesc: `Sole designer on a family of ~37 vertical comparison sites (mattresses, POS, merchant services, dating…) powered by a single parametric Figma design system.`,
		fullDesc: `Sole designer on Top5 since 2020 — a family of ~37 vertical comparison sites all powered by one parametric Figma design system (smart components that inherit color tokens from their parent frame). See structured case study below.`,
		liveUrl: 'https://top5-mattresses.com',
		sections: [
			{
				heading: 'Context',
				body: `Top5 is a family of comparison sites for products and services aimed at SMBs, published by Ryze Beyond. The family currently spans about 37 vertical spinoffs — mattresses, POS providers, merchant services, dating sites, website builders, and more — each on its own domain (top5-mattresses.com, top-posproviders.com, top-merchantservices.com, top5-datingsites.com…) but all powered by a shared parametric design system.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on Top5 since 2020. Three major redesigns and continuous iteration between them: new smart components, incremental improvements. From research through post-implementation design QA.`,
			},
			{
				heading: 'Approach',
				body: `Benchmarking of premium comparison sites (G2, Capterra, NerdWallet, Wirecutter) cross-referenced with Dribbble and Pinterest. On the latest redesign (2023, visible in the shared POS Figma video), the research phase was accelerated with Midjourney, Firefly and Figma AI for moodboards and concepts. Components were designed from day one as editable smart components so the content team could add reviews and lineups without design intervention.`,
			},
			{
				heading: 'Key challenge',
				body: `Designing a system that could serve 37 distinct vertical sites — entirely different content, its own color identity per site — without duplicating components manually. Every site needed its own accent (from four base themes, extensible to more) while sharing the same UI architecture and behavior.

Addressed through a parametric design system in Figma: each smart component reads its color tokens from its parent frame via Figma variables. Result: a drag-and-drop into a pre-themed section re-skins all colored elements automatically (buttons, chips, cards, accents) — a single asset serving all 37 sites, just by changing the parent container.`,
			},
			{
				heading: 'Deliverables',
				body: `Parametric design system covering homepage, article, comparison, lineup, review, about and category pages, deployed across ~37 vertical sites. Five breakpoints designed systematically (Desktop 1920, Laptop 1280, Tablet landscape, Tablet portrait, Mobile 375). WordPress → Webflow migration on the latest redesign, with a full design system rebuild in Webflow and handoff to the content team. Cross-functional work with PM, front-end and back-end developers, content writers, marketing and SEO.`,
			},
			{
				heading: 'What I took from it',
				body: `A well-architected smart component system — one that inherits tokens from its container rather than binding manually — multiplies production velocity. What could have cost 37 sites × N components becomes one design system × 37 parametric variants. The discipline required upfront (structured Figma variables, container-first thinking) pays off across the entire lifespan of the project.`,
			},
		],
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/portfolio/top5/homepage/mattresses-desktop-1920.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/homepage/mattresses-desktop-1920.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/homepage/voip-desktop-1920.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/homepage/mattresses-mobile-375.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/article/article-side-bar-1920.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/article/article-375.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/comparison/comparison-page---desktop-1920.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/comparison/mobile---375---inner-343.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/lineup/website-width-1920---container-1140---lineup-950.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/lineup/website-width-375---container-343---lineup-344.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/about-us/about-us-page-desktop-1920.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/about-us/about-us-page-mobile-375.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/review-page/review-page---desktop-1920.webp',
			'https://res.cloudinary.com/akael/image/upload/portfolio/top5/review-page/review-page---mobile-375.webp',
		],
		tags: ['Editorial', 'Comparison'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'ryze-brand',
		title: `Ryze Beyond — Brand`,
		client: `Ryze Beyond`,
		year: '2026',
		category: 'Branding',
		categories: ['Branding', 'UI/UX'],
		shortDesc: `Sole designer on the third full redesign of Ryze Beyond's marketing website (2026). Abstract-illustration design system built from scratch.`,
		fullDesc: `Sole designer on the 2026 redesign of ryzebeyond.com — the marketing website for the company behind Sonary Dashboard, Sonary Website, Top5, Playright and other products. Third full redesign of the site; ~2 months of work with an abstract-illustration design system built from scratch. See structured case study below.`,
		liveUrl: 'https://ryzebeyond.com/',
		sections: [
			{
				heading: 'Context',
				body: `Ryze Brand is the marketing website for Ryze Beyond, the company behind Sonary Dashboard, Sonary Website, Top5, Playright and other products. The site presents the mission, products, team, and hiring opportunities. Third full redesign of the site since its creation: the first by a previous designer (~2019), the second by an external agency (~2023), this one in 2026.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on the 2026 redesign, about two months of work. From research through post-implementation design QA.`,
			},
			{
				heading: 'Approach',
				body: `Benchmarking of tech corporate sites (Linear, Vercel, Stripe, Notion, Figma) and the marketing sites of the domain's main comparison platforms (G2, Capterra, Top10), cross-referenced with Dribbble, Pinterest and Behance to avoid the "generic corporate" look. Research phase accelerated with Midjourney, Firefly, Figma AI, ChatGPT and Leonardo AI for moodboards, illustrative concepts and exploratory tests. Design system built from scratch for this project, drawing on elements inherited from the previous version (signature brand colors, a few graphic elements kept for visual continuity).`,
			},
			{
				heading: 'Key challenge',
				body: `Several visual directions were explored collaboratively before landing on the final line. One of the challenges was finding the right balance between a tech-forward identity (positioning Ryze as a modern SaaS publisher) and a warm personality that could speak equally to hiring talent and to business partners.

The solution: a system of abstract illustrations — colored geometric shapes, textured patterns — used as a visual thread across the entire site. More narrative explorations (illustrated characters) were carried out during the process — a few remain visible in the selection presented here.`,
			},
			{
				heading: 'Deliverables',
				body: `Full marketing website: homepage, product showcases (Sonary Dashboard, Website, Top5, Playright), about, team, careers, legal. Design system built for this project (typography, palette derived from the existing brand, radius, illustration system, light and dark modes). Five breakpoints (Desktop 1920, Laptop 1280, Tablet landscape, Tablet portrait, Mobile 375). WordPress CMS. Cross-functional work with PM, front-end and back-end developers, content writers, marketing and SEO.`,
			},
			{
				heading: 'What I took from it',
				body: `A corporate site has multiple simultaneous audiences — customers, investors, hiring talent — and each reads a visual through its own filter. Designing a system that lets the same page speak to these different audiences takes more iteration rounds than a product site aimed at a single audience. The final compromise (abstract illustrations as the visual thread) illustrates that tension well.`,
			},
		],
		// Full site captures organised by David into 10 numbered folders (01-09
		// + Other). Every filename with -desktop / -mobile tokens is auto-
		// classified. "All Field" is a wide form-field spec board and David
		// wants it rendered full-width (1200px) alongside the other desktop
		// captures, so we override it to desktop — the Other zone disappears.
		imageDeviceOverrides: {
			'other/all-field': 'desktop',
		},
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/01---homepage/ryze-website---homepage---example-of-lines-per-section---desktop.png',
		gallery: [
			// 01 — Homepage (2 desktop variants + 2 mobile variants)
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/01---homepage/ryze-website---homepage---example-of-lines-per-section---desktop.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/01---homepage/ryze-website---homepage---example-of-lines-per-section---desktop-2.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/01---homepage/ryze-website---homepage---mobile.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/01---homepage/ryze-website---homepage---mobile-2.png',
			// 02 — About us
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/02---about-us/ryze-website---about-us---desktop.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/02---about-us/ryze-website---about-us---mobile.png',
			// 03 — What we do
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/03---what-we-do/ryze-website---what-we-do---desktop.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/03---what-we-do/ryze-website---what-we-do---mobile.png',
			// 04 — Careers
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/04---careers/carreer-desktop.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/04---careers/carreer-mobile.png',
			// 05 — Inner Careers
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/05---inner-carerrs/inner-carreer---desktop.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/05---inner-carerrs/inner-carreer---mobile.png',
			// 06 — Case Study (mobile only)
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/06---case-study/case-study---mobile.png',
			// 07 — Partner with Us
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/07---partner-with-us/partner-with-us---desktop---1.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/07---partner-with-us/partner-with-us---mobile---1.png',
			// 08 — Error 404
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/08---error-404/error-404---desktop.png',
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/08---error-404/error-404---mobile.png',
			// 09 — Legal (mobile only)
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/09---legal/legal-page-mobile---1.png',
			// Other — All Field (misc, no dev/mobile split)
			'https://res.cloudinary.com/akael/image/upload/portfolio/ryze/other/all-field.png',
		],
		tags: ['Branding', 'Identity'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'ryze-hub',
		title: `Ryze Beyond Hub`,
		client: `Ryze Beyond`,
		year: '2025',
		category: 'Branding',
		categories: ['Branding', 'UI/UX'],
		shortDesc: `Sole-designed internal portal for Ryze Beyond employees — brand assets, product info and quick access in one place. Personal initiative from concept to full design system.`,
		fullDesc: `Sole designer on Ryze Hub — an internal employee portal I proposed and led end-to-end (2025). Concept, structure, dedicated design system, and templates. Delivered at full design level; production paused with an internal roadmap change. See structured case study below.`,
		sections: [
			{
				heading: 'Context',
				body: `Ryze Hub is a centralized intranet portal designed for Ryze Beyond employees. The idea: gather in one place the brand resources (fonts, logos, palettes, graphic elements), information on the company's verticals and products (Sonary Dashboard, Sonary Website, Top5, Playright…), and provide direct access to each product. Typical use case: preparing a presentation, a PDF, a social post before a meeting or a conference.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on the project, from the initial idea — proposed internally — through the full design system, site structure, and templates. Solo delivery with direct validation from the manager.`,
			},
			{
				heading: 'Approach',
				body: `Research through direct observation of internal needs (recurring requests for brand assets and product information). Benchmarking of internal tech portals (brand asset portals like Frontify/Brandfolder, team wikis like Notion, Confluence-based sites) and visual references from Dribbble and Behance. Design system built from scratch for this project, with its own "internal hub" identity — modular, geared toward fast navigation and scannable reading.`,
			},
			{
				heading: 'Key challenge',
				body: `Bringing together highly heterogeneous content in a single portal (graphic assets, product docs, external links, usage guides) without turning it into a flat catalog. Solution: structure by use case rather than by content type, with dedicated components that pull together the assets of a same family in a single view (for example: "Ryze Logo" = variants + tokens + fonts + usage in one block).`,
			},
			{
				heading: 'Deliverables',
				body: `Full portal design: use-case-driven homepage, brand center (logos, colors, typography, iconography), vertical sections by product (Sonary, Top5, Playright…), quick access to live products. Dedicated design system (typography, palette, radius, asset-card and quick-access components, light and dark modes). Five breakpoints (Desktop 1920, Laptop 1280, Tablet landscape, Tablet portrait, Mobile 375). The project was delivered at full design level; production was paused following an internal roadmap change.`,
			},
			{
				heading: 'What I took from it',
				body: `Carrying an idea from an observed need through to a delivered design system is a different exercise than a commissioned project: the vision has to be clear enough to convince before it even exists. Ryze Hub illustrates this full path (idea → concept → system → templates) — a methodological framework I've been reusing since.`,
			},
		],
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785342009/portfolio/ryze-hub/desktop/company-hub---home-page---step-01.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785342009/portfolio/ryze-hub/desktop/company-hub---home-page---step-01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342011/portfolio/ryze-hub/desktop/company-hub---home-page---step-02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342012/portfolio/ryze-hub/desktop/company-hub---home-page---step-03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342014/portfolio/ryze-hub/desktop/company-hub---innerpage---step-04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342016/portfolio/ryze-hub/mobile/company-hub---innerpage---step-04.webp',
		],
		tags: ['Branding', 'Landing', 'Corporate'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'sonary-mailer',
		title: `Sonary — Email Templates`,
		client: `Ryze Beyond`,
		year: '2025',
		category: 'SaaS',
		categories: ['SaaS', 'UI/UX'],
		shortDesc: `Sole designer on a modular master email template for the Sonary ecosystem — 600/375 breakpoints, dark-mode aware, on-brand.`,
		fullDesc: `Sole designer on the Sonary email marketing and newsletter template system (2025). Built on the existing Sonary design system tokens; a master template spinning off into multiple campaign variants. See structured case study below.`,
		sections: [
			{
				heading: 'Context',
				body: `Sonary Mailer is an email marketing and newsletter template system built for Ryze Beyond in 2025. It complements the Sonary ecosystem (Dashboard product + Website comparison platform) by enabling marketing campaigns, editorial digests, and communications in a visual style consistent with the rest of the brand.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on the mailer, owning art direction end-to-end. Collaborated with the content writer on editorial structure. Delivered from research through design, template specs, dev handoff, and QA.`,
			},
			{
				heading: 'Approach',
				body: `Benchmarking of email marketing references (Mailchimp, HubSpot, Substack) cross-referenced with Dribbble and Pinterest. Research phase accelerated with Midjourney, Firefly and Figma AI for moodboards and concepts. No new design system — templates built on the existing Sonary design system tokens (Inter typography, palette, radius, light and dark modes) for immediate brand consistency. A master template designed to spin off into multiple variants depending on the campaign type.`,
			},
			{
				heading: 'Key challenge',
				body: `Email client technical constraints are rigid: maximum 600-pixel width on desktop (past that, clients truncate or zoom), and mobile rendering that must adapt automatically to the device's width, with a design reference at 375 pixels. This means a much narrower grid than standard web, and a mobile-first layout designed at 375 and scaled up to 600.

Addressed through a master template with two strict breakpoints (Desktop 600, Mobile 375) and components that restructure vertically on mobile — each block designed to be added, removed, or duplicated without breaking the layout.`,
			},
			{
				heading: 'Deliverables',
				body: `Master email template (header, hero, article sections, CTA, footer) ready to spin off into multiple variants (editorial newsletter, product campaign, alert, digest). Two breakpoints designed (Desktop 600, Mobile 375). Light and dark modes consistent with the rest of the Sonary ecosystem. Dev handoff.`,
			},
			{
				heading: 'What I took from it',
				body: `An email isn't a web page: technical constraints (width, heterogeneous email clients, table-based rendering) force a different discipline. Designing a master template modular enough to absorb every future campaign is more valuable than one polished one-off — it's a design system in a very small footprint.`,
			},
		],
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785342153/portfolio/sonary-mailer/desktop/mailer-1-desktop.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785342153/portfolio/sonary-mailer/desktop/mailer-1-desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342154/portfolio/sonary-mailer/desktop/mailer-2-desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342156/portfolio/sonary-mailer/desktop/mailer-3-desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342157/portfolio/sonary-mailer/desktop/mailer-4-desktop.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342159/portfolio/sonary-mailer/mobile/mailer-1-mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342160/portfolio/sonary-mailer/mobile/mailer-2-mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342161/portfolio/sonary-mailer/mobile/mailer-3-mobile.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342163/portfolio/sonary-mailer/mobile/mailer-4-mobile.webp',
		],
		tags: ['Email Design', 'Templates', 'Responsive'],
		featured: false,
		orientation: 'landscape',
	},
	{
		slug: 'playright',
		title: `Playright`,
		client: `Ryze Beyond`,
		year: '2019 – 2026',
		category: 'Gaming',
		categories: ['Gaming', 'UI/UX'],
		shortDesc: `Sole designer on Playright since 2019 — UK online casino comparison platform. Initial 4-month delivery, then years of continuous design iteration. Full redesign underway.`,
		fullDesc: `Sole designer on Playright since 2019 — Ryze Beyond's UK online casino comparison platform. Initial delivery in ~4 months (2019-2020), then continuous design iteration over the following years, with a full redesign currently underway. See structured case study below.`,
		liveUrl: 'https://playright.co.uk/casino/reviews/',
		liveUrlNote: `Note: the site is geo-restricted to the UK. A VPN is required to view it from outside.`,
		sections: [
			{
				heading: 'Context',
				body: `Playright is an online casino comparison platform for the UK market, published by Ryze Beyond. The site guides players toward the best offers through editorial reviews, side-by-side comparisons, top listings, and vertical pages by game type or payment method. The domain is geo-restricted — UK-only access; a VPN is required to view it from outside the UK.`,
			},
			{
				heading: 'Role',
				body: `Sole designer on Playright since 2019. Initial delivery: about four months of concentrated work in late 2019, shipped to production in 2020. Since then: continuous design iteration (new pages, progressive redesigns, retroactive design system).`,
			},
			{
				heading: 'Approach',
				body: `Benchmarking of casino comparison sites (AskGamblers, Casino.org, Gambling.com) and visual references from Dribbble and Pinterest. On initial delivery (2019-2020), no design system yet — design produced page by page. The design system was built retroactively as the site grew, capitalizing on recurring patterns. On more recent redesigns, research accelerated with Midjourney, Firefly and Figma AI for moodboards and concepts.`,
			},
			{
				heading: 'Key challenge',
				body: `Balancing UK regulatory constraints (UKGC framework, responsible gambling notices, transparency on bonuses and wagering) with a compelling design that had to convert on a saturated market of comparators. Adding trust blocks (18+, GamStop, responsible gambling) without crushing the visual hierarchy.

The project also held a particular status in the Ryze roadmap: design often ran ahead of production, with engineering priorities allocated elsewhere. My contribution continued steadily over the years — some designs integrated quickly, others still pending.`,
			},
			{
				heading: 'Deliverables',
				body: `Initial 2019-2020 delivery (~4 months): homepage, review page, comparison, lineup, category pages, casino profile, article. Since then: iterations across dozens of pages, section redesigns, retroactive design system, new verticals and payment methods. Three breakpoints originally requested (Desktop, Mobile, Tablet portrait); now expanded to five for the ongoing full redesign (Desktop 1920, Laptop 1280, Tablet landscape, Tablet portrait, Mobile 375). WordPress CMS throughout; the current redesign's stack is not yet finalized. Cross-functional work with PM, front-end and back-end developers, content writers, marketing and SEO. A full site redesign is currently underway.`,
			},
			{
				heading: 'What I took from it',
				body: `A project that spans several years reveals one simple lesson: a design system's value shows up when you have to revisit your own work two years later. Playright pushed me to retroactively formalize what could have stayed ad hoc — and to accept that design has its own pace, sometimes running ahead of production.`,
			},
		],
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785341989/portfolio/playright/home-page/desktop---1200px---container-1140px.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785341989/portfolio/playright/home-page/desktop---1200px---container-1140px.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785341991/portfolio/playright/home-page/desktop---1920px---container-1140px.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785341993/portfolio/playright/home-page/laptop---992px---container-944px.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785341995/portfolio/playright/home-page/mobile---375px---container-343px.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785341997/portfolio/playright/home-page/tablet---768px---container-720px.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342000/portfolio/playright/prodlist/mobile---375px---container-343px.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785342002/portfolio/playright/prodlist/tablet---768px---container-720px.webp',
		],
		tags: ['Gaming', 'Casino Comparison', 'UX'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'ui-ux-vintage',
		title: `UI/UX Work (2011-2018)`,
		client: `Multiple clients`,
		year: '2015',
		category: 'UI/UX',
		shortDesc: `20 selected UI/UX screens from earlier years — fintech, mobile apps, dashboards (Smart.bid, Wochat and others).`,
		fullDesc: `PLACEHOLDER : Sélection de projets UI/UX antérieurs à Ryze Beyond. Fintech (Smart.bid/LoanMax 2018-2019), Wochat mobile app 2017-2018, autres missions.`,
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785346069/portfolio/old-wix/ui-ux/ui-ux-01.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785346069/portfolio/old-wix/ui-ux/ui-ux-01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346071/portfolio/old-wix/ui-ux/ui-ux-02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346073/portfolio/old-wix/ui-ux/ui-ux-03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346075/portfolio/old-wix/ui-ux/ui-ux-04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346076/portfolio/old-wix/ui-ux/ui-ux-05.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346078/portfolio/old-wix/ui-ux/ui-ux-06.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346080/portfolio/old-wix/ui-ux/ui-ux-07.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346081/portfolio/old-wix/ui-ux/ui-ux-08.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346083/portfolio/old-wix/ui-ux/ui-ux-09.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346084/portfolio/old-wix/ui-ux/ui-ux-10.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346086/portfolio/old-wix/ui-ux/ui-ux-11.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346088/portfolio/old-wix/ui-ux/ui-ux-12.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346089/portfolio/old-wix/ui-ux/ui-ux-13.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346092/portfolio/old-wix/ui-ux/ui-ux-14.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346094/portfolio/old-wix/ui-ux/ui-ux-15.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346096/portfolio/old-wix/ui-ux/ui-ux-16.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346098/portfolio/old-wix/ui-ux/ui-ux-17.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346099/portfolio/old-wix/ui-ux/ui-ux-18.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346101/portfolio/old-wix/ui-ux/ui-ux-19.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346103/portfolio/old-wix/ui-ux/ui-ux-20.webp',
		],
		tags: ['UI', 'UX', 'Fintech', 'Mobile'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'branding-old',
		title: `Branding & Identity Work (2006-2015)`,
		client: `Arc Interactive / Publicis`,
		year: '2010',
		category: 'Branding',
		categories: ['Branding', 'UI/UX'],
		shortDesc: `13 brand identities from the Arc Interactive / Publicis years (2006–2011) — same period as the Cactus wins.`,
		fullDesc: `PLACEHOLDER : Sélection de travaux branding réalisés chez Arc Interactive (Publicis Group), 2006-2011, période récompensée par Cactus d'Or/Argent/Bronze. Logos, palettes, guidelines, campaigns.`,
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785345947/portfolio/old-wix/branding/branding-01.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785345947/portfolio/old-wix/branding/branding-01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345949/portfolio/old-wix/branding/branding-02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345953/portfolio/old-wix/branding/branding-03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345954/portfolio/old-wix/branding/branding-04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345956/portfolio/old-wix/branding/branding-05.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345959/portfolio/old-wix/branding/branding-06.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345962/portfolio/old-wix/branding/branding-07.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345964/portfolio/old-wix/branding/branding-08.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345966/portfolio/old-wix/branding/branding-09.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345968/portfolio/old-wix/branding/branding-10.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345970/portfolio/old-wix/branding/branding-11.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345971/portfolio/old-wix/branding/branding-12.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345973/portfolio/old-wix/branding/branding-13.webp',
		],
		tags: ['Branding', 'Identity', 'Publicis', 'Awarded'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'casino-work',
		title: `10Bet & Casino Gaming Suite`,
		client: `Gamingtech / Tradologic`,
		year: '2016',
		category: 'Gaming',
		shortDesc: `20+ casino UI screens (2011–2017) — game lobbies, bonus systems, deposit funnels, mobile-first.`,
		fullDesc: `PLACEHOLDER : Design de plateformes casino online sur plusieurs années (Gamingtech 2015-2017 pour 10Bet, Real Deal Bet, Bet Rally + Tradologic 2011-2013). Livrables : lobbies de jeux, systèmes de bonus, tunnels de dépôt, interfaces mobile/desktop, animations HTML5/CSS3.`,
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785345974/portfolio/old-wix/casino/casino-01.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785345974/portfolio/old-wix/casino/casino-01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345976/portfolio/old-wix/casino/casino-02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345978/portfolio/old-wix/casino/casino-03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345979/portfolio/old-wix/casino/casino-04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345981/portfolio/old-wix/casino/casino-05.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345982/portfolio/old-wix/casino/casino-06.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345984/portfolio/old-wix/casino/casino-07.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345986/portfolio/old-wix/casino/casino-08.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345988/portfolio/old-wix/casino/casino-09.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345989/portfolio/old-wix/casino/casino-10.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345991/portfolio/old-wix/casino/casino-11.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345993/portfolio/old-wix/casino/casino-12.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345994/portfolio/old-wix/casino/casino-13.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345996/portfolio/old-wix/casino/casino-14.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785345998/portfolio/old-wix/casino/casino-15.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346000/portfolio/old-wix/casino/casino-16.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346001/portfolio/old-wix/casino/casino-17.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346002/portfolio/old-wix/casino/casino-18.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346004/portfolio/old-wix/casino/casino-19.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346006/portfolio/old-wix/casino/casino-20.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346008/portfolio/old-wix/casino/casino-21.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346010/portfolio/old-wix/casino/casino-22.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346012/portfolio/old-wix/casino/casino-23.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346013/portfolio/old-wix/casino/casino-24.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346015/portfolio/old-wix/casino/casino-25.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346016/portfolio/old-wix/casino/casino-26.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346018/portfolio/old-wix/casino/casino-27.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346020/portfolio/old-wix/casino/casino-28.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346021/portfolio/old-wix/casino/casino-29.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346023/portfolio/old-wix/casino/casino-30.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346025/portfolio/old-wix/casino/casino-31.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346026/portfolio/old-wix/casino/casino-32.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346028/portfolio/old-wix/casino/casino-33.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346029/portfolio/old-wix/casino/casino-34.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346031/portfolio/old-wix/casino/casino-35.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346033/portfolio/old-wix/casino/casino-36.webp',
		],
		tags: ['Gaming', 'Casino', 'Mobile', 'HTML5', 'Animation'],
		featured: false,
		orientation: 'portrait',
	},
	{
		slug: 'sport-betting',
		title: `Sport Betting Platforms`,
		client: `Gamingtech`,
		year: '2016',
		category: 'Gaming',
		shortDesc: `Live sport-betting interfaces for 10Bet and Real Deal Bet — real-time odds tables, HTML5 animations.`,
		fullDesc: `PLACEHOLDER : Design de plateformes sport betting online chez Gamingtech (2015-2017). Livrables : interfaces de paris live, calendriers interactifs, tableaux de cotes, animations HTML5.`,
		thumbnail: 'https://res.cloudinary.com/akael/image/upload/v1785346043/portfolio/old-wix/sport-betting/sport-betting-01.webp',
		gallery: [
			'https://res.cloudinary.com/akael/image/upload/v1785346043/portfolio/old-wix/sport-betting/sport-betting-01.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346045/portfolio/old-wix/sport-betting/sport-betting-02.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346047/portfolio/old-wix/sport-betting/sport-betting-03.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346049/portfolio/old-wix/sport-betting/sport-betting-04.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346051/portfolio/old-wix/sport-betting/sport-betting-05.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346052/portfolio/old-wix/sport-betting/sport-betting-06.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346054/portfolio/old-wix/sport-betting/sport-betting-07.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346055/portfolio/old-wix/sport-betting/sport-betting-08.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346057/portfolio/old-wix/sport-betting/sport-betting-09.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346059/portfolio/old-wix/sport-betting/sport-betting-10.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346060/portfolio/old-wix/sport-betting/sport-betting-11.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346062/portfolio/old-wix/sport-betting/sport-betting-12.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346064/portfolio/old-wix/sport-betting/sport-betting-13.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346066/portfolio/old-wix/sport-betting/sport-betting-14.webp',
			'https://res.cloudinary.com/akael/image/upload/v1785346068/portfolio/old-wix/sport-betting/sport-betting-15.webp',
		],
		tags: ['Gaming', 'Sport Betting', 'Live'],
		featured: false,
		orientation: 'portrait',
	},
];
