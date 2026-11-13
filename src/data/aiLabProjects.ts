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
	/** Optional shorter meta description (≤158 characters); falls back to shortDesc. */
	metaDesc?: string;
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
		/** Optional stylesheet with the demo's self-hosted fonts, loaded so the typography samples show the real faces. */
		fontCss?: string;
	};
	/** Gallery images (root-relative paths under /public). */
	gallery: string[];
	/** Optional phone screenshots, shown four across under the gallery. */
	mobileGallery?: string[];
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
	/** Optional next steps: ideas planned but not built yet, shown as their own
	 * section after the screenshots, labelled as upcoming. */
	nextSteps?: Array<{ title: string; body: string }>;
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
		slug: 'facet',
		title: 'Facet',
		subtitle: 'Drop a bank statement, see where your money goes, then ask anything.',
		eyebrow: 'Personal finance · 2026',
		shortDesc:
			'A money app: drop the statement your bank gives you (Excel, CSV, PDF or Word) and Facet reads it in your browser, sorts every line and builds the full analysis. Then you ask questions in plain words. Seven languages, Hebrew in RTL.',
		intro: `Facet is a fictional personal finance app I designed and built end-to-end. It starts from a file almost everyone has and almost nobody reads: the statement your bank lets you download. Facet turns it into an answer to the question behind it, where does my money go?

You drop the file, or several. Facet finds the dates, labels and amounts on its own, whatever the format: a French bank's CSV with semicolons and decimal commas, an Excel budget sheet, a PDF statement with debit and credit columns. When it is not sure how to read a table, it asks: a preview of the file with a choice above each column, and the number of lines found updating as you go. Every merchant is then sorted into a category, first with the categories written in the file, then with common words, and only then with the AI.

The report builds itself: money in and out, spending by category and month by month, regular payments found from their rhythm, the expenses that stand out. Above it, a question field: ask "how much do I spend on restaurants each month?" and Facet answers in one sentence, with the charts that show it. Every figure on the page opens the exact lines of your file it comes from.`,
		aiFeature: {
			eyebrow: 'AI UX · Generated interface',
			title: 'The AI picks the screen, the code computes the numbers',
			lead: 'Facet uses an open model (Llama 3.3 on Cloudflare Workers AI) for two narrow jobs: sorting merchant names it does not recognise, and turning a question into a description of the screen that answers it (which blocks, which period, which filters). The model never sees an amount and never writes one. Every number is computed in the browser from the lines of the file, so an answer can always be traced back to its source.',
			tryUrl: '/demo/facet/',
			tryLabel: 'Try a sample statement',
			states: ['Excel, CSV, PDF, Word or text, several files at once', 'Column check when a table is unclear', 'Merchants sorted by the AI, shown for review', 'Lines left to check, fixed in one tap', 'Report: overview, where the money goes, worth knowing, regular payments', 'Question answered in one sentence plus charts', 'Lines behind any figure, with search and sort', 'Filters for period, categories and amount', 'Free AI used up: simpler reader, figures still exact', 'Dark and light themes, seven languages, Hebrew in RTL'],
			decisions: [
				{ title: 'No figure from the model', body: 'The AI only describes the screen: blocks, periods, filters. The page drops anything it does not understand and computes every total itself, so the model cannot invent an amount, even when it misreads the question.' },
				{ title: 'Every number opens its lines', body: '"See the lines" sits under every figure and chart. It opens a side panel with the exact lines of the file, their line number or page, and a search, a category filter and a sort, so checking a number costs one tap.' },
				{ title: 'Ask before guessing the columns', body: 'When a table has no header or leaves many lines aside, Facet shows a preview with a choice above each column and counts the lines found as you change them. Reading a stranger\'s file wrong is the fastest way to lose trust.' },
				{ title: 'Rules first, the AI last', body: 'Categories written in the file come first, then common words in English and French, and only the merchants left go to the AI. Fewer calls, faster results, and the AI\'s choices are listed right after the analysis so they can be confirmed or corrected.' },
				{ title: 'Your file stays on your device', body: 'Files are opened in the browser: Excel without any library, PDF with PDF.js, Word with Mammoth. Only unknown merchant names are sent to the AI, never an amount, a date or an account number.' },
				{ title: 'A question field, not a chatbot', body: 'People ask about their money, they do not want to chat. One field at the top, suggested questions written from the file itself, and an answer in one sentence above the charts. Each answer can be removed or changed, with undo.' },
				{ title: 'Correct once, everything follows', body: 'Changing the category of one line moves every line from that merchant, and every chart, total and insight updates. One undo takes it back.' },
				{ title: 'When the free AI runs out', body: 'The demo has a small daily allowance. When it is spent, nothing breaks: a simpler local reader answers, unknown merchants wait in "To check", and a short note says why and when the AI comes back, in the visitor\'s own time.' },
				{ title: 'What I left out on purpose', body: 'No connection to a real bank, no budgets to fill in, no score or judgement on spending. The app describes, it does not lecture, and it never needs more than the file you chose to give it.' },
				{ title: 'How I would test it', body: 'Moderated sessions with 6 to 8 people per round, each bringing an export from their own bank. I would measure how many files read correctly without the column check, how often people open the lines behind a figure, and whether they can answer three questions about their month faster than in their banking app.' },
			],
		},
		designSystem: {
			fontCss: '/demo/facet/fonts/fonts.css',
			colors: [
				{ name: 'Night', hex: '#0D0E10', role: 'Canvas in the dark theme, the default' },
				{ name: 'Surface', hex: '#17191C', role: 'Cards, panels and menus' },
				{ name: 'Ink', hex: '#EEEFF1', role: 'Type and key figures' },
				{ name: 'Lime', hex: '#C5F06A', role: 'Brand · main buttons · active filters' },
				{ name: 'Focus blue', hex: '#5B9BEA', role: 'Fields being typed in · keyboard focus' },
				{ name: 'Money in', hex: '#4CC38A', role: 'Income · sorted · confirmed' },
				{ name: 'To check', hex: '#F0B44C', role: 'Lines waiting for a category · notes' },
			],
			typography: [
				{ family: 'IBM Plex Sans', weights: '400 · 500 · 600 · 700', role: 'Interface · headings · figures', sample: 'See where your money goes.' },
				{ family: 'IBM Plex Mono', weights: '400 · 500', role: 'File lines, labels as the bank wrote them', sample: 'CARTE X4821 12/10 CAFE ARDOISE' },
				{ family: 'Heebo', weights: '400 · 500 · 600 · 700', role: 'Hebrew, right-to-left', sample: 'רואים לאן הולך הכסף.' },
			],
			micro: [
				'One icon set everywhere: Lucide, thin strokes, no filled shapes',
				'Category colours from a palette checked for colour blindness, in fixed order',
				'Squircle corners where the browser supports them, radii kept concentric',
				'Charts drawn by hand in SVG: thin bars, a tooltip on every mark, the month not over shown dashed',
				'Everything that opens slides in: menus, panels, the sign-in overlay',
				'The lines of the file always in mono, as the bank wrote them',
			],
			interactions: [
				'Sign in or create an account in an overlay, or use the demo account',
				'Drop files or try one of three sample statements',
				'Column check with a live count of lines found',
				'Question field with suggestions, answers with undo',
				'Filters for period, categories and amount above the whole report',
				'Side panel with the lines behind any figure',
			],
			constraints: [
				'Plain HTML, CSS and JavaScript: no framework, no bundler, no CDN',
				'Files read in the browser; Excel opened without a library',
				'Free plans only: a daily AI budget, and a local reader as a fallback',
				'Invented sample statements, merchants and account holder',
				'Not financial advice: Facet describes, it does not recommend',
				'Tested in a headless browser: 13 screen sizes in portrait and landscape, seven languages, dark and light',
			],
		},
		nextSteps: [
			{ title: 'A month in review', body: 'At the end of each month, Facet would compare the new statement with the previous ones and point out what changed: a new subscription, a category that grew, a payment that stopped.' },
		],
		gallery: [
			'/lab-assets/facet/report.webp',
			'/lab-assets/facet/answer.webp',
			'/lab-assets/facet/lines.webp',
			'/lab-assets/facet/columns.webp',
			'/lab-assets/facet/home.webp',
			'/lab-assets/facet/sign-in.webp',
		],
		mobileGallery: [
			'/lab-assets/facet/m-report.webp',
			'/lab-assets/facet/m-answer.webp',
			'/lab-assets/facet/m-lines.webp',
			'/lab-assets/facet/m-home.webp',
		],
		demoUrl: '/demo/facet/',
		thumbnail: '/lab-assets/facet/thumbnail.jpg',
		accent: '#C5F06A',
	},
	{
		slug: 'margin',
		title: 'Margin',
		subtitle: 'An AI reader that explains any document and shows you where it says it.',
		eyebrow: 'Documents · 2026',
		shortDesc:
			'An AI reader for contracts, letters and terms of use. Drop a PDF or a Word file, paste a link or some text: Margin explains what matters in plain words and points to the exact passage behind every point. Ten languages, Hebrew in RTL.',
		intro: `Margin is a fictional AI reader I designed and built end-to-end. It starts from a moment everyone knows: a contract, a lawyer’s letter or a page of terms lands in front of you, and you sign or scroll past it without really knowing what you agreed to.

Margin reads the document and answers the questions you would ask a friend who knows the subject: what is in my favour, what could work against me, what must I not miss, which dates and amounts matter. Then you can ask your own questions. Every point comes with “Where it says it”, which opens the exact passage, highlighted, on the right page.

The hard part of an AI reader is trust, so the design is built around one rule: a point you cannot check should not be shown. Each answer must cite a passage that was actually sent to the model, and every number in it must appear in that passage, or the point is removed before you see it. Files are read in your browser; only the useful passages go to the AI. The demo runs on a fictional contract, and nothing it says is legal advice.`,
		aiFeature: {
			eyebrow: 'AI UX · Grounded answers',
			title: 'Every answer points to its source',
			lead: 'Margin sends the relevant passages of the document to an open model (Llama 3.3 on Cloudflare Workers AI) and asks for short points, each one tied to the passages it comes from. The interface then checks every point against those passages before showing it. The reader never has to take the AI’s word for it: one tap shows the original text.',
			tryUrl: '/demo/margin/?sample=1',
			tryLabel: 'Try a sample contract',
			states: ['PDF and Word files, a link or pasted text', 'Several files, one report section each', 'Report in five groups: in short, in your favour, against you, watch out, key numbers', 'Where it says it: the passage highlighted on its page', 'Points removed when no source or a wrong number', 'Questions about the document, with sources', 'Not in the document: says so instead of guessing', 'Suggested questions', 'Listen and copy', 'Machine translation of a passage, the original stays the reference', 'Numbers written the local way (68 000 € in French)', 'Daily free AI allowance shown, with reset time', 'Allowance used up: a clear message, nothing lost', 'AI offline or slow: retry without losing the files', 'Sign in or create a demo account', 'My analyses: saved, reopened read-only, deleted with undo', 'Sign out with undo', 'Ten languages from one menu, Hebrew in RTL'],
			decisions: [
				{ title: 'No source, no point', body: 'Every point must cite a passage that was sent, and every number in it must appear in that passage. A point that fails either test is removed before it reaches the screen, and the report says how many were removed.' },
				{ title: 'Answers you can check in one tap', body: '“Where it says it” sits at the end of every point. It opens the original passage in place, highlighted, with its page number, so checking costs one tap instead of a search through the file.' },
				{ title: 'Five questions people really ask', body: 'Instead of a generic summary, the report answers what a reader wants to know before signing: what it is, what is in my favour, what could work against me, what I must not miss, and the key dates and amounts.' },
				{ title: 'Read in the browser, send only what is needed', body: 'PDF and Word files are opened in the browser. Only the passages useful for the report or the question go to the AI, and nothing is stored on a server. A link is fetched once, only to read the page.' },
				{ title: 'Say “not in the document”', body: 'When a question has no answer in the text, Margin says so plainly instead of filling the gap with general knowledge. An honest “I can’t find it” keeps the other answers credible.' },
				{ title: 'Your language, the original’s authority', body: 'The interface, the report and the answers follow the language chosen in one menu. A cited passage can be machine translated, but the highlighted original stays visible and is what counts.' },
				{ title: 'Numbers that cannot be misread', body: 'Amounts are rewritten the way the reader’s language writes them, so “68,000” is never read as 68 in French or German. The check against the source still uses the original figure.' },
				{ title: 'A limit shown, not hidden', body: 'The demo runs on a free daily AI allowance shared by all visitors. The page shows what is left and when it renews, in the visitor’s own time zone, so running out is expected, not a surprise.' },
				{ title: 'Keep your analyses', body: 'With a demo account, every finished analysis is saved in My analyses: the points and the cited passages as text, never the files. Saved analyses open read-only, and deleting or signing out can be undone.' },
				{ title: 'What I left out on purpose', body: 'Voice questions, photos and spreadsheets were tried, then removed. Voice failed silently on some browsers, text read from a poor-quality photo could contain errors, and figures in tables were harder to check against their source. PDF and Word cover the documents people actually need explained, and every point stays checkable.' },
				{ title: 'How I would test it', body: 'Moderated sessions with 6 to 8 people per round, each reading a real contract of their own type. I would measure how often people open “Where it says it”, whether they can find a risky clause faster than with the file alone, and a short trust score before and after checking a source.' },
			],
		},
		designSystem: {
			fontCss: '/demo/margin/fonts/fonts.css',
			colors: [
				{ name: 'Paper', hex: '#F6F5F1', role: 'Canvas: a warm page, like a printed document' },
				{ name: 'Ink', hex: '#141414', role: 'Type · main buttons · key numbers' },
				{ name: 'Marker', hex: '#FFE15A', role: 'Highlighted passage: the source behind a point' },
				{ name: 'Link blue', hex: '#1F5FAD', role: 'Where it says it · links' },
				{ name: 'In your favour', hex: '#22A06B', role: 'Green dot · checked · allowance left' },
				{ name: 'Against you', hex: '#E5484D', role: 'Red dot · errors · allowance used up' },
				{ name: 'Watch out', hex: '#E8920C', role: 'Amber dot · deadlines and conditions' },
			],
			typography: [
				{ family: 'Geist', weights: '400 · 500 · 600 · 700', role: 'Interface · headings · body', sample: 'Read it once. Understand it all.' },
				{ family: 'Heebo', weights: '400 · 500 · 700', role: 'Hebrew, right-to-left', sample: 'קוראים פעם אחת. מבינים הכול.' },
			],
			micro: [
				'One icon set everywhere: Lucide, thin strokes, no filled shapes',
				'A coloured dot per group, the text always stays dark',
				'The cited passage opens in place, highlighted like a marker on paper',
				'A small bar shows the daily AI allowance, green, then amber, then red',
				'Messages stay on screen long enough to read, and stay while hovered',
				'Concentric corners: inner radius plus padding equals outer radius',
			],
			interactions: [
				'Drop files, paste a link or paste text, from one screen',
				'Report per file, with Listen, Copy and Clear',
				'Questions with suggested prompts, answers with sources',
				'Language menu that switches the interface and the next answers',
				'Sign in or create an account, as in Otium, with a demo account',
				'My analyses: open read-only, delete with undo',
			],
			constraints: [
				'Plain HTML, CSS and JavaScript: no framework, no bundler, no CDN',
				'PDF.js and Mammoth open files in the browser, fonts are self-hosted',
				'Ten languages from one string table, Hebrew in RTL',
				'A fictional contract as the sample: no real names or brands',
				'Not legal advice: the report says it, the terms say it',
				'Tested in a headless browser: full flow, ten languages, five screen widths from 320 to 1440 px',
			],
		},
		nextSteps: [
			{ title: 'Margin where you already read', body: 'A browser extension: select a clause on any page, right-click “Explain in Margin”, and the text opens in Margin, ready to analyse. Reading a document and understanding it would become the same gesture.' },
		],
		gallery: [
			'/lab-assets/margin/report.webp',
			'/lab-assets/margin/source.webp',
			'/lab-assets/margin/answer.webp',
			'/lab-assets/margin/home.webp',
			'/lab-assets/margin/my-analyses.webp',
			'/lab-assets/margin/sign-in.webp',
		],
		mobileGallery: [
			'/lab-assets/margin/m-report.webp',
			'/lab-assets/margin/m-source.webp',
			'/lab-assets/margin/m-answer.webp',
			'/lab-assets/margin/m-my-analyses.webp',
		],
		demoUrl: '/demo/margin/',
		thumbnail: '/lab-assets/margin/thumbnail.jpg',
		accent: '#1F5FAD',
	},
	{
		slug: 'otium',
		title: 'Otium',
		subtitle: 'An AI travel agent that plans in the open and asks before it acts.',
		eyebrow: 'Travel · 2026',
		shortDesc:
			'An AI travel agent: it reads a trip described in plain words, searches, compares and holds flights and a stay, then stops for your OK before it pays or shares your details. Five languages, Hebrew in RTL.',
		intro: `Otium is a fictional AI travel agent I designed and built end-to-end. The question behind it is the one every agentic product now faces: once an AI can act for you (search, book, pay), how do you stay in control without doing the work yourself?

The answer I designed is an agent that works in the open. You describe a trip in your own words; Otium shows each step as it happens, flags what it assumed, and lets you correct any of it. Searching is automatic. Paying, sharing your details and going over budget always wait for an explicit yes, with a before/after view of what changes. Every booking can be cancelled from the trip, every decision is written to a trip history, and a human travel team is always one tap away.

The language model only reads the request. Prices, the plan, the budget check and every action are computed in code, so the model can never invent a fare or approve a payment. The demo runs on invented airlines, stays and prices; nothing is ever booked or charged.`,
		aiFeature: {
			eyebrow: 'AI UX · Agent',
			title: 'An agent that asks before it acts',
			lead: 'Otium plans a full short trip on its own (flights, a stay, the days), but every action with consequences waits for the traveller. The request is read by an LLM (Llama 3.3 on Cloudflare Workers AI); everything else is deterministic code. T-Bot, a built-in helper, answers questions along the way and only ever points to the control where the traveller decides.',
			tryUrl: '/demo/otium/',
			tryLabel: 'Try the demo',
			states: ['Request read by AI, with assumptions flagged', 'Basic matching when the AI is offline', 'Clarifying question when the place is missing', 'Destination not covered: no guessing', 'Steps shown live, foldable', 'Pause and resume', 'Over budget: stops and offers options', 'Approval before payment, with before/after', 'Approval before sharing traveller details', 'Ask before every choice', 'Pay alone up to a limit, labelled on the step', 'Co-traveller approval', 'Price drop after booking: asks before rebooking', 'Trip picked up after a refresh', 'One-minute video of a full run, plus a step-by-step tour', 'Fare changed: asks again', 'Flight sold out: plan B', 'Edit flight or stay before approving', 'Cancel one booking or all', 'Trip history, tap to jump to a step', 'Several trips saved in My trips', 'Date-range calendar', 'Details missing at payment: sends to the profile, then resumes', 'Tickets and hotel voucher as PDF, calendar file', 'T-Bot helper with action buttons', 'Talk to a human', 'Five languages, Hebrew in RTL'],
			decisions: [
				{ title: 'Model for reading, code for acting', body: 'The LLM turns a sentence into fields: city, nights, travellers, budget. Prices, the plan, the budget check and every booking step are computed in code, so the model can never invent a fare or approve a payment.' },
				{ title: 'Automatic vs. needs you', body: 'Each step carries a tag. Searching and comparing run on their own; paying, sharing personal data and going over budget always stop and wait. Permissions show the same rules in one place.' },
				{ title: 'Autonomy is the traveller’s choice', body: 'Permissions offer three levels: ask before every choice, ask before payments and personal data (the default), or pay alone up to a limit. Even at the most autonomous level, sharing personal data always waits, and an auto-approved payment says so on the step and can be cancelled.' },
				{ title: 'Show what it assumed', body: 'Anything the traveller did not say (dates, number of travellers, budget) is shown dashed in “What I understood”. One tap changes it and the agent re-plans from that point.' },
				{ title: 'Approve with a before/after', body: 'Every approval card shows what changes: amount held, what is refundable, what happens next. Edit and No are as visible as Yes.' },
				{ title: 'Plan B instead of an error', body: 'A sold-out flight or a fare change does not end in a dead end: the agent explains, proposes the next option and asks again.' },
				{ title: 'Nothing gets lost', body: 'Every plan is saved in My trips with its status: draft, waiting for your OK, booked. Starting a new plan sets the current one aside instead of replacing it, and the agent resumes exactly where it stopped.' },
				{ title: 'Help that points, never acts', body: 'T-Bot answers questions in context and offers one button from a fixed list: change dates, show what needs me, cancel options, talk to a human. It never pays, books or cancels on its own.' },
				{ title: 'Two stops, not one', body: 'Paying and sharing personal data are two different consents, so they get two separate approvals. One combined “OK” would bundle them: you could not pay now and send passport details later, and you would never see exactly what goes to whom. The second card lists every field the airline receives, and the phone number is optional.' },
				{ title: 'Explain every choice', body: '“Why this flight?” and “Why this stay?” show the rule the agent applied and the options it compared, with prices. An agent that cannot explain itself cannot be trusted with money.' },
				{ title: 'An agent that keeps working', body: 'After booking, Otium keeps watching the price of a refundable stay. When it drops, it comes back with a before/after and asks before rebooking, and the rebooking has an undo.' },
				{ title: 'Two people, one trip', body: 'A trip for two can wait for a co-traveller’s approval before payment. The card shows who approved and that the traveller’s OK is the last one.' },
				{ title: 'Needs travel with you', body: 'Travel assistance (wheelchair, extra legroom, a baby) is set once in the profile. Seats that suit it are highlighted on the seat map, and the request is listed on the data-sharing card and in the trip summary.' },
				{ title: 'What I left out on purpose', body: 'No auto-booking without a visible card, no countdown pressure, no hidden fees, no pre-ticked extras. A free-text chat with the agent was kept to a helper that points to controls (T-Bot) rather than one that acts.' },
				{ title: 'How I would test it', body: 'Moderated tests with 6–8 travellers per round, measuring time to first approval, how often people open “Why?” or edit before approving, abandonment at the payment card, and a short trust score after the task. The step-by-step tour doubles as a script for those sessions.' },
				{ title: 'Always a human exit', body: 'Help, a phone line, chat and email are reachable from every screen, and the travel team sees the full trip history, so nobody has to explain twice.' },
			],
		},
		designSystem: {
			colors: [
				{ name: 'Otium red', hex: '#C2344C', role: 'Brand · actions · hearts · notifications · needs you' },
				{ name: 'Confirm green', hex: '#1E8A5A', role: 'Done · automatic · under budget · refunded' },
				{ name: 'Calm blue', hex: '#2F6FB5', role: 'Selection · your seats · trip held' },
				{ name: 'Ink', hex: '#222222', role: 'Type · T-Bot button · portfolio strip' },
				{ name: 'White', hex: '#FFFFFF', role: 'Canvas: light, rounded cards, fine lines' },
			],
			typography: [
				{ family: 'Plus Jakarta Sans', weights: '400 · 500 · 600 · 700', role: 'Interface · headings · body', sample: 'You decide. Otium does the legwork.' },
				{ family: 'Heebo', weights: '400 · 500 · 700', role: 'Hebrew, right-to-left', sample: 'אתם מחליטים. Otium עושה את העבודה.' },
			],
			micro: [
				'One icon set everywhere: Lucide, thin strokes, no filled shapes',
				'Steps tick in one by one, then fold so the timeline stays short',
				'A budget bar with the cap marked: green under the cap, red the moment the plan goes over',
				'Red dot on My trips and on T-Bot when something waits for you',
				'Calendar range preview on hover, nights counted live',
				'Help and T-Bot stacked bottom right, the way back to the portfolio bottom left',
			],
			interactions: [
				'Request in plain words, read by AI, every field editable with custom menus',
				'Approval cards with before/after, Edit and No as visible as Yes',
				'Cancel per booking or all, with what is refunded shown first',
				'My trips: several plans kept side by side, each resumes where it stopped',
				'Language switch translates every trip in place: nothing is re-planned',
				'T-Bot chat with contextual suggestions and one safe action per answer',
				'Sign-in and profile: payment waits until traveller details, address and a card are saved',
				'32 destinations with filters and sorting',
			],
			constraints: [
				'Plain HTML, CSS and JavaScript: no framework, no bundler, no CDN',
				'The model only reads; prices and actions are computed in code',
				'Five languages from one string table, Hebrew in RTL',
				'Fictional airlines, stays and prices: nothing is booked, charged or sent',
				'Photography from Pexels (free licence, credits in /demo/otium/media/CREDITS.txt), one daylight treatment for all 32 destinations',
				'Tested end-to-end in a headless browser: full flow, six tricky cases, mobile at 390 px, five languages',
			],
		},
		gallery: [
			'/lab-assets/otium/home.webp',
			'/lab-assets/otium/approve.webp',
			'/lab-assets/otium/plan.webp',
			'/lab-assets/otium/seats.webp',
			'/lab-assets/otium/summary.webp',
			'/lab-assets/otium/permissions.webp',
			'/lab-assets/otium/t-bot.webp',
			'/lab-assets/otium/my-trips.webp',
		],
		mobileGallery: [
			'/lab-assets/otium/m-approve.webp',
			'/lab-assets/otium/m-plan.webp',
			'/lab-assets/otium/m-seats.webp',
			'/lab-assets/otium/m-summary.webp',
		],
		demoUrl: '/demo/otium/',
		thumbnail: '/lab-assets/otium/thumbnail.jpg',
		accent: '#C2344C',
	},
	{
		slug: 'apex-athletic-club',
		title: 'APEX Athletic Club',
		subtitle: 'An oceanfront strength and recovery club in Miami Beach, invented and built out to five pages.',
		eyebrow: 'Fitness · 2026',
		shortDesc:
			'A members club: five interlinked pages, a booking gate, a live timetable, a shop with a persistent cart, a QR guest pass, and APEX Coach, its AI chatbot, designed state by state.',
		intro: `APEX Athletic Club is a fictional private gym I invented and built end-to-end, and the brief I set myself was to go past the marketing page: a mini-site is easy to fake in one screen, and much harder to hold together across five.

The visual language is the opposite of the wellness pastel most gyms reach for. Ink canvas, one hot pink accent, one mint signal, Space Grotesk for display and JetBrains Mono for anything numeric (times, prices, capacities), so the timetable reads like a schedule board rather than a brochure. The photography is stock, so the grid imposes its own treatment (grayscale, dimmed, colour returning on hover) instead of hoping six unrelated shoots agree with each other.

Almost all of the work was in the parts that are usually faked. Booking a class is a member action, so the CTA opens an identity gate, not a payment funnel, and after signing in, the booking the visitor originally clicked resumes on its own. The seven-day timetable is generated from the real date, so it can never show a stale week. The shop derives its member discount from the list price at render time rather than storing a second number that could drift. The guest pass emits an actual ticket with a scannable QR, encoded by hand (around 200 lines of Reed-Solomon and mask scoring), and validated by decoding the rendered bitmap, because a QR that looks right and never scans is the easiest thing in the world to ship.`,
		aiFeature: {
			eyebrow: 'AI UX · Assistant',
			title: 'APEX Coach',
			lead: 'APEX Athletic Club: a fitness club website where the AI coach offers several tools, used separately or together: workout plan, meal plan, BMI, metabolism and macro calculations. Every result updates the member’s profile. Open questions about training, nutrition, BMI, body fat, hydration or recovery are answered live by an LLM (Llama 3.3 on Cloudflare Workers AI) with a coaching system prompt and the member’s own numbers. Tasks where numbers must be exact (programs, prices, warning signs) run through designed, deterministic flows.',
			tryUrl: '/demo/apex-athletic-club/user.html?coach=open',
			tryLabel: 'Try APEX Coach',
			states: ['Empty state with starters', 'Thinking with visible steps', 'Streaming answer', 'Clarifying question', 'Structured plan with actions', 'Setup form for missing details', 'Body metrics: BMI, water, body fat', 'Diets, allergies & dislikes', 'Exercise demos for every muscle group, side + front, with tempo', 'Workout plan, meal plan or both, 1 to 4 weeks', 'Plans saved to the member profile, changed from the chat', 'PDF export with workout log', 'Low-confidence note', 'AI service offline fallback', 'Safety refusal', 'Out of scope', 'Error + retry', 'Stop · Regenerate · Copy', 'Feedback with reasons'],
			decisions: [
				{ title: 'Show what it uses', body: 'A context bar lists exactly what Coach can see: membership tier, calculator numbers, this week’s timetable. Users trust an answer more when they know where it comes from.' },
				{ title: 'Ask before guessing', body: 'A vague goal like “lose weight” gets one clarifying question with tappable options instead of a generic plan. One question, not an interview.' },
				{ title: 'Answers that lead to action', body: 'A training week comes back as a structured card where every session has a Book link into the real class flow, not a wall of text to copy.' },
				{ title: 'Model for talk, code for numbers', body: 'The LLM handles open questions, but BMI, healthy weight range, water, protein and calorie targets are computed in code and passed to it as facts, so it explains numbers instead of guessing them. Programs and prices never go through the model.' },
				{ title: 'One plan, not two', body: 'Workout and menu come from the same settings. Training days get more food, rest days less, so the weekly average hits the goal, and loads progress week by week with a lighter fourth week. Everything exports as a PDF with blank log sheets, like a real gym program.' },
				{ title: 'Say when it’s unsure', body: 'Plans and nutrition answers carry a short note on their limits (no access to training history, not a meal prescription), and point to the human who can go further.' },
				{ title: 'Refuse safely, then redirect', body: 'Warning signs like chest pain or fainting get a fixed, human-written answer, never a model guess. Injury and medical questions are redirected to the club doctor and physio by the system prompt.' },
				{ title: 'The user stays in control', body: 'Stop mid-answer, regenerate, copy, or flag a bad reply with a reason. Billing changes are never done by the assistant: it links to the plan screen instead.' },
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
				'Stock photography unified by the grid: grayscale and dimmed, colour on hover',
			],
			interactions: [
				'Identity gate before any payment funnel, and the booking resumes after sign-in',
				'Seven-day timetable generated from the current date, filtered by type and level',
				'Cart and wishlist drawers persisted in localStorage across pages',
				'Member pricing derived from list price at render time, never stored twice',
				'Guest pass issued as a ticket: hand-written QR encoder, PNG export, print sheet',
				'Custom date picker replacing the native control, positioned to escape modal overflow',
			],
			constraints: [
				'Five self-contained HTML files: no framework, no bundler, no CDN',
				'Vanilla JS only, including the QR encoder: Reed-Solomon over GF(256), all eight masks',
				'localStorage as the only backend: account, cart and wishlist',
				'Every QR decoded by machine before shipping, not eyeballed',
				'Overflow detection run programmatically across 5 pages × 8 widths, overlays opened and measured individually',
			],
		},
		gallery: [
			'/lab-assets/apex-athletic-club/home.jpg',
			'/lab-assets/apex-athletic-club/classes.jpg',
			'/lab-assets/apex-athletic-club/shop.jpg',
			'/lab-assets/apex-athletic-club/my-space.jpg',
			'/lab-assets/apex-athletic-club/coach-welcome.jpg',
			'/lab-assets/apex-athletic-club/coach-program.jpg',
			'/lab-assets/apex-athletic-club/coach-safety.jpg',
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
			'A refined trattoria: full brand identity, menu and table booking with a demo sign-in. Designed and built with AI, from research to finished product, every choice directed by me.',
		metaDesc:
			'A refined trattoria: brand identity, menu and table booking with a demo sign-in. Designed and built with AI, every choice directed by me.',
		intro: `A refined trattoria: full brand identity, menu and table booking with a demo sign-in. Designed and built with AI, from research to finished product, every choice directed by me.

The design language borrows from fine-dining editorial: Playfair Display and Cormorant Garamond over a noir + brushed-gold + ivoire palette, dish photography treated as painterly plates rather than product shots, and micro-typography for the menu (dotted leaders, lining figures, italic wine notes) that would look at home on a printed carte.

The build is a single self-contained page of hand-written HTML, CSS, and vanilla JS: view-transitions between sections, a lightbox-based reservation flow with a mock auth (Google + email), a "My space" client area with cancel confirmation, and a hero parallax that respects reduced-motion. No frameworks, no CMS: the constraint was to see how far a single-file mini-site could be pushed with AI as the sparring partner.`,
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
					sample: 'Chianti Classico, 2019 · cherry, tobacco',
				},
				{
					family: 'Inter',
					weights: '300 · 400 · 500 · 600',
					role: 'UI · form fields · buttons',
					sample: 'Reserve a table · 8:30 pm',
				},
			],
			micro: [
				'Dotted leaders bridging dish name and price',
				'Lining figures across the whole menu for column alignment',
				'Italic wine descriptors, never bold',
				'All-caps eyebrows with wide tracking as section anchors',
			],
			interactions: [
				'Four lightbox modals: Reserve, Auth, My Space, Cancel confirm',
				'Mock auth flow: Continue with Google or email, no password',
				'Client area persists reservations per account in localStorage',
				'Hero parallax honoring prefers-reduced-motion',
				'Cross-page nav lock kills the transitional flash between Home and Menu',
			],
			constraints: [
				'Single self-contained HTML file per page: no framework, no bundler',
				'Vanilla JS only: DOM APIs, event delegation, no dependencies',
				'localStorage as the only backend: tf_account and tf_reservations',
				'Progressive enhancement: the menu and story read fine without JS',
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
			'How this site is built: the stack, the token set, the method, and an honest account of what was designed by hand and what was not.',
		intro: '',
		gallery: [],
		demoUrl: '/colophon',
		thumbnail: '/lab-assets/portfolio-colophon/thumbnail.jpg',
		accent: '#FF5A1F',
		cardHref: '/colophon',
	},
];
