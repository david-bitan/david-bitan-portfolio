// Background color per project, used by <PhoneMockup> as the frame color
// behind mobile screenshots. Behance-style: each project gets a distinctive
// hue that reads well against a black iPhone bezel.
//
// Add / tweak per-project overrides here; unknown slugs fall back to `DEFAULT`.

export const DEFAULT_MOCKUP_BG = '#0f172a'; // slate-900

const COLORS: Record<string, string> = {
	'sonary-dashboard': '#0f172a', // slate-900 — dark SaaS
	'sonary-website': '#1e3a8a', // blue-900 — marketing blue
	'sonary-mailer': '#0e7490', // cyan-700 — email freshness
	playright: '#4c1d95', // violet-900
	top5: '#065f46', // emerald-800 — editorial premium
	'ryze-hub': '#7f1d1d', // red-900 — Ryze brand
	'ryze-brand': '#7f1d1d', // red-900 — same family as hub
	'casino-work': '#78350f', // amber-900 — casino warm
	'sport-betting': '#0c4a6e', // sky-900
	'branding-old': '#374151', // gray-700
	'ui-ux-vintage': '#1f2937', // gray-800
};

export function projectColor(slug: string): string {
	return COLORS[slug] ?? DEFAULT_MOCKUP_BG;
}
