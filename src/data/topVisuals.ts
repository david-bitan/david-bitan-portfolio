// Étape 14: the visual at the top of each project page. 2 or 3 small cards,
// each showing ONE feature of the product, cut from the project’s real
// screenshots (never a whole page, never a gallery image as it is). Files:
// public/top-visuals/<slug>/<n>.webp, saved at twice their display width
// (w x h = file pixels) and never enlarged beyond the original.
export type TopCard = { src: string; w: number; h: number; title: string; desc: string; alt: string };

// Étape 14, ajout 1 (S32): the composition validated by David, page by page
// (values at 1440 px; x from the left edge of the 1200 px container, y from
// the top of the tallest letter of the H1). 2 cards (the 2nd in front), a pill
// with a real figure of the product, 3 line drawings behind (one orange).
// Card refs: 1, 2, 3 = the cards of `topVisuals` below (widths 292, 312,
// 219 px); a name = a card of `extraCards`. The card of `topVisuals` that is
// not shown any more stays in the list.
export type CardRef = 1 | 2 | 3 | string;
export type TopPill = { x: number; y: number; w?: number; bg?: string; icon: string; color: string; l1: string; l2: string };
export type TopDoodle = { name: string; x: number; y: number; r: number; s: number; orange?: boolean };
export type TopLayout = { a: { card: CardRef; x: number; y: number }; b: { card: CardRef; x: number; y: number }; pill: TopPill; doodles: TopDoodle[]; blocTop: number };
export const CARD_WIDTHS = [292, 312, 219];

export const extraCards: Record<string, TopCard & { width: number }> = {
	'monthly': { src: "/top-visuals/sonary-dashboard/monthly.webp", w: 300, h: 308, width: 182, title: "Monthly spend", desc: "The month’s total, first.", alt: "Sonary dashboard: Monthly Spend card, $52,577" },
	'uiv-dash': { src: "/top-visuals/ui-ux-vintage/sales-dashboard.webp", w: 520, h: 212, width: 292, title: "Sales dashboard", desc: "Views, sales and earnings.", alt: "SaaS dashboard overview: four stat tiles and a sales chart" },
	'uiv-wochat': { src: "/top-visuals/ui-ux-vintage/wochat-messaging.webp", w: 374, h: 221, width: 219, title: "Wochat messaging", desc: "Voice, text and video chat.", alt: "Wochat app on five phones: contacts, chat, video call and profile" },
	'brandbook': { src: "/top-visuals/branding-old/brand-book.webp", w: 560, h: 327, width: 312, title: "Brand book", desc: "Typography and brand visuals.", alt: "Wochat brand book open on the typography page, next to a brand photo" },
	'wochat-app': { src: "/top-visuals/branding-old/wochat-app.webp", w: 374, h: 288, width: 219, title: "Wochat app", desc: "Meet people and a profile.", alt: "Wochat app on two phones: the Meet people grid and a profile" },
};

export const topLayouts: Record<string, TopLayout> = {
	'otium': {
		a: { card: 1, x: 711, y: 0 },
		b: { card: 2, x: 887, y: 150 },
		pill: { x: 743, y: 212, w: 176, icon: "£", color: "#2F5BEA", l1: "£808 all in", l2: "£92 under your £900 cap" },
		doodles: [
			{ name: 'pin', x: 684, y: 26, r: 0, s: 0.85 },
			{ name: 'plane', x: 1079, y: 72, r: 0, s: 0.85 },
			{ name: 'suitcase', x: 827, y: 337, r: 0, s: 0.85, orange: true },
		],
		blocTop: 416,
	},
	'apex-athletic-club': {
		a: { card: 1, x: 726, y: 156 },
		b: { card: 3, x: 981, y: 0 },
		pill: { x: 808, y: 62, icon: "⚡︎", color: "#0D101A", l1: "4 sessions a week", l2: "Lower A · Cardio · Upper A" },
		doodles: [
			{ name: 'pulse', x: 913, y: 24, r: -4, s: 0.8, orange: true },
			{ name: 'dumbbell', x: 808, y: 366, r: -10, s: 0.75 },
			{ name: 'stopwatch', x: 1098, y: 296, r: 8, s: 0.9 },
		],
		blocTop: 416,
	},
	'facet': {
		a: { card: 3, x: 800, y: 0 },
		b: { card: 1, x: 908, y: 230 },
		pill: { x: 989, y: 143, icon: "≡", color: "#2F5BEA", l1: "407 lines", l2: "Read in your browser" },
		doodles: [
			{ name: 'spark', x: 758, y: 82, r: 12, s: 0.75 },
			{ name: 'coin', x: 1112, y: 82, r: -8, s: 0.85, orange: true },
			{ name: 'pie', x: 858, y: 327, r: 0, s: 0.8 },
		],
		blocTop: 431,
	},
	'margin': {
		a: { card: 3, x: 725, y: 100 },
		b: { card: 1, x: 908, y: 0 },
		pill: { x: 913, y: 227, icon: "!", color: "#E5484D", l1: "20 hours a month", l2: "Overtime included in your salary" },
		doodles: [
			{ name: 'highlighter', x: 835, y: 62, r: -10, s: 0.85, orange: true },
			{ name: 'magnifier', x: 1178, y: 288, r: 0, s: 0.8 },
			{ name: 'doc', x: 989, y: 316, r: 8, s: 0.8 },
		],
		blocTop: 416,
	},
	'trattoria-fiori': {
		a: { card: 2, x: 721, y: 112 },
		b: { card: 3, x: 980, y: 0 },
		pill: { x: 1004, y: 240, w: 196, icon: "☎︎", color: "#B08D4B", l1: "Within 2 hours", l2: "Each booking confirmed by phone" },
		doodles: [
			{ name: 'fork', x: 906, y: 64, r: -12, s: 0.85, orange: true },
			{ name: 'wine', x: 1091, y: 352, r: 8, s: 0.85 },
			{ name: 'calendar', x: 773, y: 360, r: -6, s: 0.8 },
		],
		blocTop: 416,
	},
	'sonary-dashboard': {
		a: { card: 1, x: 754, y: 0 },
		b: { card: "monthly", x: 1018, y: 44 },
		pill: { x: 811, y: 186, icon: "%", color: "#2F5BEA", l1: "30%", l2: "Communication, top category" },
		doodles: [
			{ name: 'coin', x: 1178, y: 12, r: -8, s: 0.8, orange: true },
			{ name: 'pie', x: 978, y: 272, r: 0, s: 0.8 },
			{ name: 'spark', x: 726, y: 30, r: 10, s: 0.7 },
		],
		blocTop: 316,
	},
	'top5': {
		a: { card: 3, x: 707, y: 132 },
		b: { card: 1, x: 888, y: 0 },
		pill: { x: 908, y: 232, w: 220, icon: "★", color: "#E03A3A", l1: "8.8 vs 8.5", l2: "Lightspeed vs Shopify, side by side" },
		doodles: [
			{ name: 'trophy', x: 810, y: 66, r: -8, s: 0.9, orange: true },
			{ name: 'check', x: 1034, y: 346, r: 0, s: 0.9 },
			{ name: 'star', x: 672, y: 376, r: 10, s: 0.75 },
		],
		blocTop: 456,
	},
	'sonary-website': {
		a: { card: 3, x: 719, y: 0 },
		b: { card: 1, x: 908, y: 96 },
		pill: { x: 714, y: 248.7, w: 224, icon: "★", color: "#F5B800", l1: "4.6 rating", l2: "256 reviews, Editor’s choice" },
		doodles: [
			{ name: 'magnifier', x: 686, y: 146, r: 0, s: 0.8 },
			{ name: 'star', x: 1020, y: 44, r: 8, s: 0.8, orange: true },
			{ name: 'cursor', x: 966, y: 298, r: 0, s: 0.85 },
		],
		blocTop: 336,
	},
	'playright': {
		a: { card: 1, x: 749, y: 186 },
		b: { card: 3, x: 981, y: 0 },
		pill: { x: 807, y: 106, icon: "★", color: "#E8175D", l1: "4.5 rating", l2: "Homepage casino cards" },
		doodles: [
			{ name: 'dice', x: 877, y: 42, r: -10, s: 0.85, orange: true },
			{ name: 'card', x: 1132, y: 288, r: 12, s: 0.85 },
			{ name: 'spark', x: 698, y: 316, r: 10, s: 0.7 },
		],
		blocTop: 426,
	},
	'ryze-brand': {
		a: { card: 1, x: 759, y: 0 },
		b: { card: 3, x: 981, y: 140 },
		pill: { x: 839, y: 213, w: 172, icon: "→", color: "#2F5BEA", l1: "2 paths", l2: "Partner with us or Explore careers" },
		doodles: [
			{ name: 'highlighter', x: 1092, y: 48, r: -10, s: 0.85, orange: true },
			{ name: 'spark', x: 890, y: 306, r: 10, s: 0.7 },
			{ name: 'bubble', x: 726, y: 116, r: 0, s: 0.6 },
		],
		blocTop: 386,
	},
	'sonary-mailer': {
		a: { card: 2, x: 850, y: 0 },
		b: { card: 3, x: 676, y: 76 },
		pill: { x: 1004, y: 178, w: 196, bg: "#FDE8EF", icon: "$", color: "#E8336D", l1: "$400+ a month", l2: "What a business can save" },
		doodles: [
			{ name: 'envelope', x: 760, y: 30, r: -8, s: 0.85, orange: true },
			{ name: 'plane', x: 642, y: 268, r: -6, s: 0.8 },
			{ name: 'bell', x: 1188, y: 65, r: 10, s: 0.64 },
		],
		blocTop: 348,
	},
	'ui-ux-vintage': {
		a: { card: "uiv-wochat", x: 720, y: 136 },
		b: { card: "uiv-dash", x: 908, y: 0 },
		pill: { x: 976, y: 221, icon: "⚑", color: "#2B7FFF", l1: "5 countries", l2: "On one Meet people screen" },
		doodles: [
			{ name: 'mic', x: 841, y: 75, r: 0, s: 0.8 },
			{ name: 'pie', x: 682, y: 286, r: 10, s: 0.75 },
			{ name: 'bubble', x: 1048, y: 316, r: -6, s: 0.6, orange: true },
		],
		blocTop: 436,
	},
	'branding-old': {
		a: { card: "brandbook", x: 750, y: 171 },
		b: { card: "wochat-app", x: 981, y: 0 },
		pill: { x: 750, y: 75, w: 196, icon: "●", color: "#0176D6", l1: "#0176D6", l2: "Wochat blue, next to charcoal #46454B" },
		doodles: [
			{ name: 'pencil', x: 785, y: 21, r: 0, s: 0.75 },
			{ name: 'bubble', x: 1142, y: 316, r: -6, s: 0.6 },
			{ name: 'video', x: 715, y: 336, r: -8, s: 0.8, orange: true },
		],
		blocTop: 456,
	},
	'gamingtech': {
		a: { card: 3, x: 710, y: 0 },
		b: { card: 2, x: 888, y: 200 },
		pill: { x: 965, y: 119, icon: "£", color: "#1B3F8F", l1: "£200 bonus", l2: "Welcome offer in 3 steps" },
		doodles: [
			{ name: 'coin', x: 1030, y: 44, r: -8, s: 0.85, orange: true },
			{ name: 'card', x: 676, y: 84, r: -10, s: 0.85 },
			{ name: 'ball', x: 810, y: 352, r: 0, s: 0.8 },
		],
		blocTop: 456,
	},
	'tradologic': {
		a: { card: 2, x: 760, y: 132 },
		b: { card: 3, x: 981, y: 0 },
		pill: { x: 760, y: 36, w: 196, icon: "3", color: "#A8742A", l1: "3 steps", l2: "Download, sign up, get your bonus" },
		doodles: [
			{ name: 'seven3', x: 1140, y: 268, r: 6, s: 0.85, orange: true },
			{ name: 'dice', x: 718, y: 374, r: -10, s: 0.8 },
			{ name: 'spark', x: 946, y: 9, r: 10, s: 0.65 },
		],
		blocTop: 456,
	},
};

export const topVisuals: Record<string, TopCard[]> = {
	'sonary-dashboard': [
		{ src: "/top-visuals/sonary-dashboard/1.webp", w: 536, h: 165, title: 'AI assistant', desc: 'Ask your stack anything.', alt: 'Sonary AI chat: a question and the assistant answer' },
		{ src: "/top-visuals/sonary-dashboard/2.webp", w: 576, h: 154, title: 'Spend overview', desc: 'Costs by category and month.', alt: 'Sonary dashboard: expenses by category donut and spend timeline chart' },
		{ src: "/top-visuals/sonary-dashboard/3.webp", w: 376, h: 319, title: 'Monthly spend', desc: "The month’s total, first.", alt: 'Sonary dashboard: Monthly Spend card, $52,577' },
	],
	'apex-athletic-club': [
		{ src: "/top-visuals/apex-athletic-club/1.webp", w: 536, h: 193, title: "Workout plan", desc: "Built and changed in chat.", alt: "APEX member page: weekly workout plan with Tuesday marked updated in chat by APEX Coach" },
		{ src: "/top-visuals/apex-athletic-club/2.webp", w: 576, h: 204, title: "Class booking", desc: "Spots left, one tap to book.", alt: "APEX timetable: seven-day picker, type and level filters, and classes with spots left and Book buttons" },
		{ src: "/top-visuals/apex-athletic-club/3.webp", w: 376, h: 319, title: "AI coach", desc: "Warning signs go to a human.", alt: "APEX Coach chat: a member reports chest pain, the coach says to stop and see a doctor, with a safety rule note and a button to book the club doctor" },
	],
	'branding-old': [
		{ src: "/top-visuals/branding-old/1.webp", w: 536, h: 206, title: "Logo variations", desc: "Approved logo backgrounds.", alt: "Wochat brand book page: the logo on white, blue, charcoal and light backgrounds" },
		{ src: "/top-visuals/branding-old/2.webp", w: 576, h: 274, title: "Business card", desc: "Name, contacts and QR code.", alt: "Wochat business card: blue corner with a QR code, name, title and contact details" },
		{ src: "/top-visuals/branding-old/3.webp", w: 376, h: 294, title: "Color palette", desc: "Blue, charcoal and white.", alt: "Wochat brand book page: color palette swatches #0176D6, #46454B and #FFFFFF" },
	],
	'facet': [
		{ src: "/top-visuals/facet/1.webp", w: 536, h: 196, title: "Ask a question", desc: "Answered from your own file.", alt: "Facet answer to “How much do I spend on groceries each month?”: average per month, this month so far and average purchase" },
		{ src: "/top-visuals/facet/2.webp", w: 576, h: 288, title: "See the lines", desc: "Every total, line by line.", alt: "Facet side panel listing the 407 statement lines behind a total, with search, category filter and sort" },
		{ src: "/top-visuals/facet/3.webp", w: 376, h: 359, title: "Where it goes", desc: "Spending by category.", alt: "Facet donut chart of October spending by category, total 27,397.12 euros, with Home and Groceries first" },
	],
	'gamingtech': [
		{ src: "/top-visuals/gamingtech/1.webp", w: 536, h: 262, title: "Sign-up funnel", desc: "Three steps to the bonus.", alt: "10Bet landing page: £200 welcome bonus box, Join now button and three numbered sign-up steps" },
		{ src: "/top-visuals/gamingtech/2.webp", w: 576, h: 277, title: "10Bet casino", desc: "Main menu and game promo.", alt: "10Bet casino page: login bar, main navigation, sub menu and a Blood Suckers slot promo with Learn more button" },
		{ src: "/top-visuals/gamingtech/3.webp", w: 376, h: 380, title: "VIP tiers", desc: "Platinum, Diamond and Gold.", alt: "10Bet VIP page: Platinum, Diamond and Gold tiers in hexagons, each with its perks" },
	],
	'margin': [
		{ src: "/top-visuals/margin/1.webp", w: 536, h: 244, title: "Highlighted source", desc: "One tap to the exact clause.", alt: "Margin point about a 1,200 euro learning budget, with its source clause highlighted on page 5 of the contract" },
		{ src: "/top-visuals/margin/2.webp", w: 576, h: 270, title: "Risk summary", desc: "What could work against you.", alt: "Margin report section \"Could work against you\" with three points, each linked to its source" },
		{ src: "/top-visuals/margin/3.webp", w: 376, h: 311, title: "Ask the document", desc: "Answers cite the contract.", alt: "Margin answer to “Can I work for a competitor after I leave?” with two “Where it says it” links" },
	],
	'otium': [
		{ src: "/top-visuals/otium/1.webp", w: 536, h: 189, title: "Agent steps", desc: "Paying waits for your OK.", alt: "Otium agent steps: budget check tagged Automatic, hold flights and stay tagged Needs your OK" },
		{ src: "/top-visuals/otium/2.webp", w: 576, h: 297, title: "Trip request", desc: "Read by AI, edited by you.", alt: "Otium “What I understood” panel: a trip request in plain words turned into editable fields for city, dates, travellers and budget cap" },
		{ src: "/top-visuals/otium/3.webp", w: 376, h: 187, title: "Travel documents", desc: "A pass for each traveller.", alt: "Otium boarding pass, Paris CDG to Lisbon, with passenger, seat and gate" },
	],
	'playright': [
		{ src: "/top-visuals/playright/1.webp", w: 536, h: 204, title: "Casino rankings", desc: "Offer, rating and terms.", alt: "Playright ranking page: Betway and Betfair rows with offer, 9.8 rating, Get Bonus button and terms" },
		{ src: "/top-visuals/playright/2.webp", w: 576, h: 165, title: "Casino cards", desc: "Rating and one CTA each.", alt: "Playright homepage: carousel of casino cards with logo, 4.5 rating and Visit Site button" },
		{ src: "/top-visuals/playright/3.webp", w: 376, h: 310, title: "Trust blocks", desc: "Safety, bonuses, payments.", alt: "Playright homepage: four trust blocks around a shield icon, game selection, bonus offers, safety and security, deposits and withdrawals" },
	],
	'ryze-brand': [
		{ src: "/top-visuals/ryze-brand/1.webp", w: 536, h: 205, title: "Line illustrations", desc: "Built from scratch for Ryze.", alt: "Ryze Beyond homepage: line illustration of a thumbs-up hand, an AI bubble and a laptop next to a section heading" },
		{ src: "/top-visuals/ryze-brand/2.webp", w: 576, h: 260, title: "Hero message", desc: "Headline, pitch, two CTAs.", alt: "Ryze Beyond hero: Smarter performance. Real results. with a short pitch and Partner with us and Explore careers buttons" },
		{ src: "/top-visuals/ryze-brand/3.webp", w: 376, h: 228, title: "Form fields", desc: "Default, error and success.", alt: "Ryze Beyond form field states: default, focus, error and success inputs with labels and helper text" },
	],
	'sonary-mailer': [
		{ src: "/top-visuals/sonary-mailer/1.webp", w: 536, h: 228, title: "Article blocks", desc: "Image, pitch and one button.", alt: "Sonary email: article block with a photo, the headline A POS system that pays for itself and a Get the scoop button" },
		{ src: "/top-visuals/sonary-mailer/2.webp", w: 576, h: 290, title: "Topic picker", desc: "Readers pick their topics.", alt: "Sonary email: three topic tiles with line icons, POS and payment processing, HR software, website builders and hosting" },
		{ src: "/top-visuals/sonary-mailer/3.webp", w: 376, h: 289, title: "Tips and CTAs", desc: "A tip box, then a CTA.", alt: "Sonary email: yellow Did you know? tip box above a Need a POS system too? prompt and a Start now button" },
	],
	'sonary-website': [
		{ src: "/top-visuals/sonary-website/1.webp", w: 536, h: 195, title: "Side-by-side comparison", desc: "Ratings and prices per tool.", alt: "Sonary alternatives page: three tools side by side with rating, Visit Site button and starting price" },
		{ src: "/top-visuals/sonary-website/2.webp", w: 576, h: 229, title: "Ranked lineup", desc: "Top picks in each category.", alt: "Sonary lineup page: the first two ranked products with badge, perks, score and Visit Site button" },
		{ src: "/top-visuals/sonary-website/3.webp", w: 376, h: 298, title: "Review cards", desc: "Logo, rating, review link.", alt: "Sonary review hub: Paysafe review card with 4.8 rating, summary, Visit Site and Read Review" },
	],
	'top5': [
		{ src: "/top-visuals/top5/1.webp", w: 536, h: 245, title: "Ranked lineup", desc: "Top picks, ranked by score.", alt: "Top5 POS lineup: Toast ranked first and second with offer, features, 9.9 and 9.7 scores and green Visit site buttons" },
		{ src: "/top-visuals/top5/2.webp", w: 576, h: 228, title: "Brand comparison", desc: "Pick brands, compare scores.", alt: "Top5 VoIP site: custom brand comparison with Lightspeed and Shopify cards, red buttons and an Add a brand slot" },
		{ src: "/top-visuals/top5/3.webp", w: 376, h: 401, title: "Product cards", desc: "Image, rating and two CTAs.", alt: "Top5 mattress site: Tempur-Pedic product card with photo, 9.2 rating, Read Review and Visit Site" },
	],
	'tradologic': [
		{ src: "/top-visuals/tradologic/1.webp", w: 536, h: 265, title: "Sign-up steps", desc: "Download, sign up, deposit.", alt: "City Tower Casino landing: three numbered steps, Play now button and a slot game preview" },
		{ src: "/top-visuals/tradologic/2.webp", w: 576, h: 392, title: "Game showcase", desc: "Featured slot and game list.", alt: "City Club Casino page: Atlantis Queen featured slot panel above a row of game screenshots" },
		{ src: "/top-visuals/tradologic/3.webp", w: 376, h: 209, title: "Welcome offer", desc: "City Club deposit bonus.", alt: "City Club Casino hero: Put $100 Receive €500 offer with Play now button and slot machines" },
	],
	'trattoria-fiori': [
		{ src: "/top-visuals/trattoria-fiori/1.webp", w: 536, h: 244, title: "Table booking", desc: "Date, time and guests.", alt: "Trattoria Fiori Reserve a table form: date, time, guests and full name fields" },
		{ src: "/top-visuals/trattoria-fiori/2.webp", w: 576, h: 264, title: "The menu", desc: "Each dish with its price.", alt: "Trattoria Fiori menu: two dish cards with photo, name, price and short description" },
		{ src: "/top-visuals/trattoria-fiori/3.webp", w: 376, h: 257, title: "My space", desc: "See or cancel a booking.", alt: "Trattoria Fiori My space panel: one upcoming reservation with a cancel button, Log out and New reservation" },
	],
	'ui-ux-vintage': [
		{ src: "/top-visuals/ui-ux-vintage/1.webp", w: 536, h: 215, title: "Sales dashboard", desc: "Views, sales and earnings.", alt: "SaaS dashboard overview: four KPI cards with bar sparklines above a six-month statistics line chart" },
		{ src: "/top-visuals/ui-ux-vintage/2.webp", w: 576, h: 285, title: "Wochat messaging", desc: "Voice, text and video chat.", alt: "Wochat app screens: contact list, a chat with voice messages, and the front camera view" },
		{ src: "/top-visuals/ui-ux-vintage/3.webp", w: 376, h: 376, title: "Meet people", desc: "Each profile shows a flag.", alt: "Wochat Meet people screen: a grid of profile photos with names and country flags" },
	],
};
