/** AI Lab project — fictional design experiments built end-to-end with AI
 * assistance. Distinct from Selected Work: no client, no brief, format allégé
 * (intro + gallery + live demo), lives under /lab/[slug]. */
export interface AILabProject {
	slug: string;
	/** Card + case study main title. */
	title: string;
	/** Subtitle rendered below the title on the case study page. */
	subtitle: string;
	/** Eyebrow text — e.g. "Restaurant · 2026". */
	eyebrow: string;
	/** Short blurb shown on the AI Lab home section card. */
	shortDesc: string;
	/** Case study body — 2–3 paragraphs, blank-line separated. First para
	 * shown by default; remaining paras hidden behind a Show more toggle. */
	intro: string;
	/** Full design system — visible section rendered between intro and gallery. */
	designSystem?: {
		colors: Array<{ name: string; hex: string; role: string }>;
		typography: Array<{ family: string; weights: string; role: string; sample: string }>;
		micro: string[];
		interactions: string[];
		constraints: string[];
	};
	/** Gallery images (root-relative paths under /public). */
	gallery: string[];
	/** Live demo URL (relative — e.g. /demo/trattoria-fiori/). */
	demoUrl: string;
	/** Thumbnail image for the AI Lab home section card. */
	thumbnail: string;
	/** Accent color hint for the card overlay (hex, optional). */
	accent?: string;
}

export const aiLabProjects: AILabProject[] = [
	{
		slug: 'trattoria-fiori',
		title: 'Trattoria Fiori',
		subtitle: 'A family kitchen in San Gimignano, imagined from scratch.',
		eyebrow: 'Restaurant · 2026',
		shortDesc:
			'A fictional Michelin-adjacent trattoria — full brand system, menu, reservation flow with fake auth. Built as a single-page experience.',
		intro: `Trattoria Fiori is a fictional Tuscan restaurant I designed and built end-to-end as a personal exercise.

The design language borrows from fine-dining editorial — Playfair Display and Cormorant Garamond over a noir + brushed-gold + ivoire palette, dish photography treated as painterly plates rather than product shots, and micro-typography for the menu (dotted leaders, lining figures, italic wine notes) that would look at home on a printed carte.

The build is a single self-contained page of hand-written HTML, CSS, and vanilla JS: view-transitions between sections, a lightbox-based reservation flow with a mock auth (Google + email), a "My space" client area with cancel confirmation, and a hero parallax that respects reduced-motion. No frameworks, no CMS — the constraint was to see how far a single-file mini-site could be pushed with AI as the sparring partner.`,
		designSystem: {
			colors: [
				{ name: 'Noir', hex: '#0F0E0C', role: 'Canvas · nav · deep backgrounds' },
				{ name: 'Brushed gold', hex: '#B08D4B', role: 'Accents · dividers · CTA hover' },
				{ name: 'Ivoire', hex: '#F5F0E5', role: 'Light surfaces · text on noir' },
				{ name: 'Sang', hex: '#8B0000', role: 'Destructive intent · cancel confirm' },
			],
			typography: [
				{
					family: 'Playfair Display',
					weights: '400 · 500 · 600 · 700 · 800',
					role: 'Display · headings · dish names',
					sample: 'Tagliatelle al tartufo',
				},
				{
					family: 'Cormorant Garamond',
					weights: '300 · 400 · 500 italic',
					role: 'Wine notes · ambient italics',
					sample: 'Chianti Classico, 2019 — cherry, tobacco',
				},
				{
					family: 'Inter',
					weights: '300 · 400 · 500 · 600',
					role: 'UI · form fields · buttons',
					sample: 'Reserve a table — 8:30 pm',
				},
			],
			micro: [
				'Dotted leaders bridging dish name and price',
				'Lining figures across the whole menu for column alignment',
				'Italic wine descriptors, never bold',
				'All-caps eyebrows with wide tracking as section anchors',
			],
			interactions: [
				'Four lightbox modals — Reserve, Auth, My Space, Cancel confirm',
				'Mock auth flow — Continue with Google or email, no password',
				'Client area persists reservations per account in localStorage',
				'Hero parallax honoring prefers-reduced-motion',
				'Cross-page nav lock kills the transitional flash between Home and Menu',
			],
			constraints: [
				'Single self-contained HTML file per page — no framework, no bundler',
				'Vanilla JS only — DOM APIs, event delegation, no dependencies',
				'localStorage as the only backend — tf_account and tf_reservations',
				'Progressive enhancement — the menu and story read fine without JS',
			],
		},
		gallery: [
			'/lab-assets/trattoria-fiori/home.jpg',
			'/lab-assets/trattoria-fiori/menu.jpg',
			'/lab-assets/trattoria-fiori/reserve-form.jpg',
			'/lab-assets/trattoria-fiori/grazie.jpg',
			'/lab-assets/trattoria-fiori/my-space.jpg',
			'/lab-assets/trattoria-fiori/cancel.jpg',
		],
		demoUrl: '/demo/trattoria-fiori/',
		thumbnail: '/lab-assets/trattoria-fiori/thumbnail.jpg',
		accent: '#B08D4B',
	},
];
