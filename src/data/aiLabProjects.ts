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
	/** Optional AI feature built into the demo — rendered as its own case-study
	 * section (#ai-feature) with design decisions and a deep link to try it. */
	aiFeature?: {
		eyebrow: string;
		title: string;
		lead: string;
		tryUrl: string;
		tryLabel: string;
		states: string[];
		decisions: Array<{ title: string; body: string }>;
	};
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
		slug: 'otium',
		title: 'Otium',
		subtitle: 'An AI travel agent that plans in the open and asks before it acts.',
		eyebrow: 'Travel · 2026',
		shortDesc:
			'A fictional AI travel agent — it reads a trip described in plain words, searches, compares and holds flights and a stay, then stops for your OK before it pays or shares your details. Five languages, Hebrew in RTL.',
		intro: `Otium is a fictional AI travel agent I designed and built end-to-end. The question behind it is the one every agentic product now faces: once an AI can act for you — search, book, pay — how do you stay in control without doing the work yourself?

The answer I designed is an agent that works in the open. You describe a trip in your own words; Otium shows each step as it happens, flags what it assumed, and lets you correct any of it. Searching is automatic. Paying, sharing your details and going over budget always wait for an explicit yes, with a before/after view of what changes. Every booking can be cancelled from the trip, every decision is written to a trip history, and a human travel team is always one tap away.

The language model only reads the request. Prices, the plan, the budget check and every action are computed in code, so the model can never invent a fare or approve a payment. The demo runs on invented airlines, stays and prices; nothing is ever booked or charged.`,
		aiFeature: {
			eyebrow: 'AI UX · Agent',
			title: 'An agent that asks before it acts',
			lead: 'Otium plans a full short trip on its own — flights, a stay, the days — but every action with consequences waits for the traveller. The request is read by an LLM (Llama 3.3 on Cloudflare Workers AI); everything else is deterministic code. T-Bot, a built-in helper, answers questions along the way and only ever points to the control where the traveller decides.',
			tryUrl: '/demo/otium/',
			tryLabel: 'Try Otium',
			states: ['Request read by AI, with assumptions flagged', 'Basic matching when the AI is offline', 'Clarifying question when the place is missing', 'Destination not covered — no guessing', 'Steps shown live, foldable', 'Pause and resume', 'Over budget — stops and offers options', 'Approval before payment, with before/after', 'Approval before sharing traveller details', 'Fare changed — asks again', 'Flight sold out — plan B', 'Edit flight or stay before approving', 'Cancel one booking or all', 'Trip history, tap to jump to a step', 'Several trips saved in My trips', 'Date-range calendar', 'Tickets and hotel voucher as PDF, calendar file', 'T-Bot helper with action buttons', 'Talk to a human', 'Five languages, Hebrew in RTL'],
			decisions: [
				{ title: 'Model for reading, code for acting', body: 'The LLM turns a sentence into fields — city, nights, travellers, budget. Prices, the plan, the budget check and every booking step are computed in code, so the model can never invent a fare or approve a payment.' },
				{ title: 'Automatic vs. needs you', body: 'Each step carries a tag. Searching and comparing run on their own; paying, sharing personal data and going over budget always stop and wait. Permissions show the same rules in one place.' },
				{ title: 'Show what it assumed', body: 'Anything the traveller did not say — dates, number of travellers, budget — is shown dashed in “What I understood”. One tap changes it and the agent re-plans from that point.' },
				{ title: 'Approve with a before/after', body: 'Every approval card shows what changes: amount held, what is refundable, what happens next. Edit and No are as visible as Yes.' },
				{ title: 'Plan B instead of an error', body: 'A sold-out flight or a fare change does not end in a dead end: the agent explains, proposes the next option and asks again.' },
				{ title: 'Nothing gets lost', body: 'Every plan is saved in My trips with its status — draft, waiting for your OK, booked. Starting a new plan sets the current one aside instead of replacing it, and the agent resumes exactly where it stopped.' },
				{ title: 'Help that points, never acts', body: 'T-Bot answers questions in context and offers one button from a fixed list — change dates, show what needs me, cancel options, talk to a human. It never pays, books or cancels on its own.' },
				{ title: 'Always a human exit', body: 'Help, a phone line, chat and email are reachable from every screen, and the travel team sees the full trip history, so nobody has to explain twice.' },
			],
		},
		designSystem: {
			colors: [
				{ name: 'Lagoon', hex: '#0F6E62', role: 'Primary action · automatic steps · confirmed' },
				{ name: 'Amber', hex: '#B8680F', role: 'Needs you · waiting for your OK' },
				{ name: 'Rose', hex: '#B4432F', role: 'Over budget · cancel · discard' },
				{ name: 'Ink', hex: '#222222', role: 'Type · T-Bot button · portfolio strip' },
				{ name: 'White', hex: '#FFFFFF', role: 'Canvas — light, rounded cards, fine lines' },
			],
			typography: [
				{ family: 'Plus Jakarta Sans', weights: '400 · 500 · 600 · 700', role: 'Interface · headings · body', sample: 'You decide. Otium does the legwork.' },
				{ family: 'Heebo', weights: '400 · 500 · 700', role: 'Hebrew, right-to-left', sample: 'אתם מחליטים. Otium עושה את העבודה.' },
				{ family: 'Fraunces', weights: 'Italic 500', role: 'Logotype only', sample: 'otium' },
			],
			micro: [
				'One icon set everywhere — Lucide, thin strokes, no filled shapes',
				'Steps tick in one by one, then fold so the timeline stays short',
				'A budget bar with the cap marked, turning rose the moment the plan goes over',
				'Amber dot on My trips and on T-Bot when something waits for you',
				'Calendar range preview on hover, nights counted live',
			],
			interactions: [
				'Request in plain words, read by AI, every field editable with custom menus',
				'Approval cards with before/after, Edit and No as visible as Yes',
				'Cancel per booking or all, with what is refunded shown first',
				'My trips: several plans kept side by side, each resumes where it stopped',
				'Language switch translates every trip in place — nothing is re-planned',
				'T-Bot chat with contextual suggestions and one safe action per answer',
			],
			constraints: [
				'Plain HTML, CSS and JavaScript — no framework, no bundler, no CDN',
				'The model only reads; prices and actions are computed in code',
				'Five languages from one string table, Hebrew in RTL',
				'Fictional airlines, stays and prices — nothing is booked, charged or sent',
				'Tested end-to-end in a headless browser: full flow, six tricky cases, mobile at 390 px, five languages',
			],
		},
		gallery: [
			'/lab-assets/otium/home.jpg',
			'/lab-assets/otium/plan.jpg',
			'/lab-assets/otium/calendar.jpg',
			'/lab-assets/otium/my-trips.jpg',
			'/lab-assets/otium/t-bot.jpg',
		],
		demoUrl: '/demo/otium/',
		thumbnail: '/lab-assets/otium/thumbnail.jpg',
		accent: '#0F6E62',
	},
	{
		slug: 'apex-athletic-club',
		title: 'APEX Athletic Club',
		subtitle: 'An oceanfront strength and recovery club in Miami Beach, invented and built out to five pages.',
		eyebrow: 'Fitness · 2026',
		shortDesc:
			'A fictional members club — five interlinked pages, a booking gate, a live timetable, a shop with a persistent cart, a QR guest pass, and APEX Coach, an AI assistant designed state by state.',
		intro: `APEX Athletic Club is a fictional private gym I invented and built end-to-end, and the brief I set myself was to go past the marketing page: a mini-site is easy to fake in one screen, and much harder to hold together across five.

The visual language is the opposite of the wellness pastel most gyms reach for. Ink canvas, one hot pink accent, one mint signal, Space Grotesk for display and JetBrains Mono for anything numeric — times, prices, capacities — so the timetable reads like a schedule board rather than a brochure. The photography is stock, so the grid imposes its own treatment (grayscale, dimmed, colour returning on hover) instead of hoping six unrelated shoots agree with each other.

Almost all of the work was in the parts that are usually faked. Booking a class is a member action, so the CTA opens an identity gate, not a payment funnel — and after signing in, the booking the visitor originally clicked resumes on its own. The seven-day timetable is generated from the real date, so it can never show a stale week. The shop derives its member discount from the list price at render time rather than storing a second number that could drift. The guest pass emits an actual ticket with a scannable QR, encoded by hand — around 200 lines of Reed-Solomon and mask scoring — and validated by decoding the rendered bitmap, because a QR that looks right and never scans is the easiest thing in the world to ship.`,
		aiFeature: {
			eyebrow: 'AI UX · Assistant',
			title: 'APEX Coach',
			lead: 'An AI assistant on every page of APEX. Open questions about training, nutrition, BMI, body fat, hydration or recovery are answered live by an LLM (Llama 3.3 on Cloudflare Workers AI) with a coaching system prompt and the member’s own numbers. Tasks where numbers must be exact — programs, prices, warning signs — run through designed, deterministic flows.',
			tryUrl: '/demo/apex-athletic-club/user.html?coach=open',
			tryLabel: 'Try APEX Coach',
			states: ['Empty state with starters', 'Thinking with visible steps', 'Streaming answer', 'Clarifying question', 'Structured plan with actions', 'Setup form for missing details', 'Body metrics: BMI, water, body fat', 'Diets, allergies & dislikes', 'Exercise demos for every muscle group, side + front, with tempo', 'Training + meal program, 1 to 4 weeks', 'PDF export with workout log', 'Low-confidence note', 'AI service offline fallback', 'Safety refusal', 'Out of scope', 'Error + retry', 'Stop · Regenerate · Copy', 'Feedback with reasons'],
			decisions: [
				{ title: 'Show what it uses', body: 'A context bar lists exactly what Coach can see — membership tier, calculator numbers, this week’s timetable. Users trust an answer more when they know where it comes from.' },
				{ title: 'Ask before guessing', body: 'A vague goal like “lose weight” gets one clarifying question with tappable options instead of a generic plan. One question, not an interview.' },
				{ title: 'Answers that lead to action', body: 'A training week comes back as a structured card where every session has a Book link into the real class flow, not a wall of text to copy.' },
				{ title: 'Model for talk, code for numbers', body: 'The LLM handles open questions, but BMI, healthy weight range, water, protein and calorie targets are computed in code and passed to it as facts, so it explains numbers instead of guessing them. Programs and prices never go through the model.' },
				{ title: 'One plan, not two', body: 'Workout and menu come from the same settings. Training days get more food, rest days less, so the weekly average hits the goal, and loads progress week by week with a lighter fourth week. Everything exports as a PDF with blank log sheets, like a real gym program.' },
				{ title: 'Say when it’s unsure', body: 'Plans and nutrition answers carry a short note on their limits — no access to training history, not a meal prescription — and point to the human who can go further.' },
				{ title: 'Refuse safely, then redirect', body: 'Warning signs like chest pain or fainting get a fixed, human-written answer, never a model guess. Injury and medical questions are redirected to the club doctor and physio by the system prompt.' },
				{ title: 'The user stays in control', body: 'Stop mid-answer, regenerate, copy, or flag a bad reply with a reason. Billing changes are never done by the assistant — it links to the plan screen instead.' },
			],
		},
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
