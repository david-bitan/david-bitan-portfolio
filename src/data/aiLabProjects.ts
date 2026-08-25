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
	/** Where the AI Lab card points, when it is NOT a generated /lab/[slug]
	 * page. Set this and the entry becomes a card only: getStaticPaths skips
	 * it, so no duplicate case-study route is built for it. */
	cardHref?: string;
}

// Order = display order. New AI Lab projects go at the TOP; the
// `portfolio-colophon` card stays LAST, always — it is the site itself, not
// one of the experiments, so it closes the row rather than opening it.
export const aiLabProjects: AILabProject[] = [
	{
		slug: 'apex-athletic-club',
		title: 'APEX Athletic Club',
		subtitle: 'An oceanfront strength and recovery club in Miami Beach, invented and built out to five pages.',
		eyebrow: 'Fitness · 2026',
		shortDesc:
			'A fictional members club — five interlinked pages, a booking gate, a class timetable that never goes stale, a shop with a persistent cart, and a QR guest pass written from scratch.',
		intro: `APEX Athletic Club is a fictional private gym I invented and built end-to-end, and the brief I set myself was to go past the marketing page: a mini-site is easy to fake in one screen, and much harder to hold together across five.

The visual language is the opposite of the wellness pastel most gyms reach for. Ink canvas, one hot pink accent, one mint signal, Space Grotesk for display and JetBrains Mono for anything numeric — times, prices, capacities — so the timetable reads like a schedule board rather than a brochure. The photography is stock, so the grid imposes its own treatment (grayscale, dimmed, colour returning on hover) instead of hoping six unrelated shoots agree with each other.

Almost all of the work was in the parts that are usually faked. Booking a class is a member action, so the CTA opens an identity gate, not a payment funnel — and after signing in, the booking the visitor originally clicked resumes on its own. The seven-day timetable is generated from the real date, so it can never show a stale week. The shop derives its member discount from the list price at render time rather than storing a second number that could drift. The guest pass emits an actual ticket with a scannable QR, encoded by hand — around 200 lines of Reed-Solomon and mask scoring — and validated by decoding the rendered bitmap, because a QR that looks right and never scans is the easiest thing in the world to ship.`,
		designSystem: {
			colors: [
				{ name: 'Ink', hex: '#0A0A0F', role: 'Canvas · nav · cards · modals' },
				{ name: 'Hot pink', hex: '#FF2E7E', role: 'Primary action · active state · sliding indicator' },
				{ name: 'Mint', hex: '#00E5A0', role: 'Eyebrows · availability · confirmation' },
				{ name: 'Off-white', hex: '#F5F5F7', role: 'Type on ink, at three opacities' },
			],
			typography: [
				{
					family: 'Space Grotesk',
					weights: '400 · 500 · 600 · 700',
					role: 'Display · headings · nav · class names',
					sample: 'Train where the ocean starts.',
				},
				{
					family: 'Inter',
					weights: '300 · 400 · 500 · 600 · 700',
					role: 'Body copy · form fields · testimonials',
					sample: 'Small membership, full team, direct beach access.',
				},
				{
					family: 'JetBrains Mono',
					weights: '400 · 500 · 700',
					role: 'Times · prices · capacities · pass fields',
					sample: '06:30 · 45 MIN · 3 of 8 left',
				},
			],
			micro: [
				'Every number set in mono so times and capacities align down a column',
				'A single pink block that travels between tabs instead of backgrounds that blink',
				'Cards entering in a 55ms cascade on filter change, skipped on first paint',
				'Availability shifting mint to amber to pink as a class fills',
				'Stock photography unified by the grid — grayscale and dimmed, colour on hover',
			],
			interactions: [
				'Identity gate before any payment funnel — and the booking resumes after sign-in',
				'Seven-day timetable generated from the current date, filtered by type and level',
				'Cart and wishlist drawers persisted in localStorage across pages',
				'Member pricing derived from list price at render time, never stored twice',
				'Guest pass issued as a ticket — hand-written QR encoder, PNG export, print sheet',
				'Custom date picker replacing the native control, positioned to escape modal overflow',
			],
			constraints: [
				'Five self-contained HTML files — no framework, no bundler, no CDN',
				'Vanilla JS only, including the QR encoder — Reed-Solomon over GF(256), all eight masks',
				'localStorage as the only backend — account, cart and wishlist',
				'Every QR decoded by machine before shipping, not eyeballed',
				'Overflow detection run programmatically across 5 pages × 8 widths, overlays opened and measured individually',
			],
		},
		gallery: [
			'/lab-assets/apex-athletic-club/home.jpg',
			'/lab-assets/apex-athletic-club/classes.jpg',
			'/lab-assets/apex-athletic-club/shop.jpg',
			'/lab-assets/apex-athletic-club/my-space.jpg',
			'/lab-assets/apex-athletic-club/contact.jpg',
		],
		demoUrl: '/demo/apex-athletic-club/',
		thumbnail: '/lab-assets/apex-athletic-club/thumbnail.jpg',
		accent: '#FF2E7E',
	},
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
	{
		slug: 'portfolio-colophon',
		title: 'This portfolio',
		subtitle: 'The site you are reading, taken apart.',
		eyebrow: 'Portfolio · 2026',
		shortDesc:
			'How this site is built — the stack, the token set, the method, and an honest account of what was designed by hand and what was not.',
		intro: '',
		gallery: [],
		demoUrl: '/colophon',
		thumbnail: '/lab-assets/portfolio-colophon/thumbnail.jpg',
		accent: '#FF5A1F',
		cardHref: '/colophon',
	},
];
