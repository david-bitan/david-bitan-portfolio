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
	/** Case study body — 2–3 paragraphs, blank-line separated. */
	intro: string;
	/** Gallery images (root-relative paths under /public). */
	gallery: string[];
	/** Live demo URL (relative — e.g. /lab/trattoria-fiori/). */
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
		intro: `Trattoria Fiori is a fictional Tuscan restaurant I designed and built end-to-end as a personal exercise. The brief was self-imposed: a Michelin-adjacent family trattoria in San Gimignano, three generations deep, warm but not rustic, with a website that reads like a cellar door rather than a booking widget.

The design language borrows from fine-dining editorial — Playfair Display and Cormorant Garamond over a noir + brushed-gold + ivoire palette, dish photography treated as painterly plates rather than product shots, and micro-typography for the menu (dotted leaders, lining figures, italic wine notes) that would look at home on a printed carte.

The build is a single self-contained page ~1500 lines of hand-written HTML, CSS, and vanilla JS: view-transitions between sections, a lightbox-based reservation flow with a mock auth (Google + email), a "My space" client area with cancel confirmation, and a hero parallax that respects reduced-motion. No frameworks, no CMS — the constraint was to see how far a single-file mini-site could be pushed with AI as the sparring partner.`,
		gallery: [
			'/lab-assets/trattoria-fiori/home.jpg',
			'/lab-assets/trattoria-fiori/menu.jpg',
			'/lab-assets/trattoria-fiori/reserve-form.jpg',
			'/lab-assets/trattoria-fiori/grazie.jpg',
			'/lab-assets/trattoria-fiori/my-space.jpg',
			'/lab-assets/trattoria-fiori/cancel.jpg',
		],
		demoUrl: '/lab/trattoria-fiori/',
		thumbnail: '/lab-assets/trattoria-fiori/thumbnail.jpg',
		accent: '#B08D4B',
	},
];
