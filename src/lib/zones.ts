// Groups a flat project gallery into "zones" for the redesigned project page.
// A zone is a section on the page (e.g. "Desktop · Dark", "Mobile · Light",
// or just "Desktop" / "Mobile" / "Gallery") that gets its own h2 + intro + image
// stack. Detection is URL-heuristic, based on the folder / filename patterns
// David uses in Cloudinary uploads.
//
// Modes:
//   - 4-zone mode : any image has an explicit `dark-mode` or `light-mode` token
//     AND at least one image is classified as desktop/mobile. Used by Sonary
//     Dashboard and Sonary Mailer if applicable.
//   - 2-zone mode : no theme token, but at least one desktop and one mobile
//     image. Used by most other projects (Playright, Top5, Ryze Hub, etc.).
//   - 1-zone mode : nothing matches. Used by legacy Wix imports where images
//     are just casino-01, casino-02, … with no responsive split.

export interface ZoneImage {
	url: string;
	// Position in the original project.gallery array — the lightbox is bound
	// to that flat array, so the trigger buttons pass the global index.
	globalIndex: number;
}

export interface Zone {
	label: string;
	images: ZoneImage[];
	// True for mobile-only zones. The template uses this to switch from a
	// full-width stacked layout (desktop shots) to a 3-column grid (mobile
	// shots, which are portrait and would overwhelm the page if stacked full).
	isMobile: boolean;
}

function classify(url: string): {
	device: 'desktop' | 'mobile' | 'unknown';
	theme: 'dark' | 'light' | 'unknown';
} {
	// Delimiter-anchored to avoid matching words like "dashboard".
	const isMobile = /[/\-_]mobile[/\-_.]|-375\b/i.test(url);
	const isDesktop = /[/\-_]desktop[/\-_.]|-1920\b|[/\-_](laptop|tablet)[/\-_.]/i.test(url);
	const isDark = /dark-mode|[/\-_]dark[/\-_.]/i.test(url);
	const isLight = /light-mode|[/\-_]light[/\-_.]/i.test(url);
	return {
		device: isMobile ? 'mobile' : isDesktop ? 'desktop' : 'unknown',
		theme: isDark ? 'dark' : isLight ? 'light' : 'unknown',
	};
}

export function groupImagesByZone(gallery: string[]): Zone[] {
	const classified = gallery.map((url, i) => ({
		url,
		globalIndex: i,
		...classify(url),
	}));

	const anyTheme = classified.some((c) => c.theme !== 'unknown');
	const anyDevice = classified.some((c) => c.device !== 'unknown');

	// Fallback : one flat "Gallery" zone.
	if (!anyDevice && !anyTheme) {
		return [
			{
				label: 'Gallery',
				isMobile: false,
				images: classified.map(({ url, globalIndex }) => ({ url, globalIndex })),
			},
		];
	}

	if (anyTheme && anyDevice) {
		// 4-zone mode. Fixed display order (per contexte-portfolio.md, Phase D):
		// Desktop·Light → Desktop·Dark → Mobile·Light → Mobile·Dark.
		// "Big picture" first (desktop before mobile), light before dark.
		const buckets: Record<string, Zone> = {
			'Desktop · Light': { label: 'Desktop · Light', isMobile: false, images: [] },
			'Desktop · Dark': { label: 'Desktop · Dark', isMobile: false, images: [] },
			'Mobile · Light': { label: 'Mobile · Light', isMobile: true, images: [] },
			'Mobile · Dark': { label: 'Mobile · Dark', isMobile: true, images: [] },
		};
		const other: Zone = { label: 'Other', isMobile: false, images: [] };
		for (const c of classified) {
			const dev = c.device === 'unknown' ? 'Desktop' : c.device === 'mobile' ? 'Mobile' : 'Desktop';
			const th = c.theme === 'unknown' ? 'Light' : c.theme === 'dark' ? 'Dark' : 'Light';
			const key = `${dev} · ${th}`;
			if (buckets[key]) buckets[key].images.push({ url: c.url, globalIndex: c.globalIndex });
			else other.images.push({ url: c.url, globalIndex: c.globalIndex });
		}
		const zones = Object.values(buckets).filter((z) => z.images.length > 0);
		if (other.images.length > 0) zones.push(other);
		return zones;
	}

	// 2-zone mode : device split, no theme.
	const desktop: Zone = { label: 'Desktop', isMobile: false, images: [] };
	const mobile: Zone = { label: 'Mobile', isMobile: true, images: [] };
	const other: Zone = { label: 'Other', isMobile: false, images: [] };
	for (const c of classified) {
		const target = c.device === 'desktop' ? desktop : c.device === 'mobile' ? mobile : other;
		target.images.push({ url: c.url, globalIndex: c.globalIndex });
	}
	const zones: Zone[] = [];
	if (desktop.images.length > 0) zones.push(desktop);
	if (mobile.images.length > 0) zones.push(mobile);
	if (other.images.length > 0) zones.push(other);
	return zones;
}

// Placeholder copy for the right column of each zone. Auto-generated so the
// page is never empty — David can rewrite these per project when he's ready.
export function zoneDescription(label: string, count: number): string {
	const s = count > 1 ? 's' : '';
	switch (label) {
		case 'Desktop · Dark':
			return `${count} desktop frame${s} in dark mode. Full-bleed layouts at 1440+, showcasing the primary product surface.`;
		case 'Desktop · Light':
			return `${count} desktop frame${s} in light mode. Same layouts as the dark variant, tuned for high-ambient environments.`;
		case 'Mobile · Dark':
			return `${count} mobile screen${s} in dark mode. Native-feel touch targets, bottom-sheet interactions, condensed nav.`;
		case 'Mobile · Light':
			return `${count} mobile screen${s} in light mode. Content-forward layouts optimized for outdoor legibility.`;
		case 'Desktop':
			return `${count} desktop layout${s}. Optimized for 1200–1920 viewports.`;
		case 'Mobile':
			return `${count} mobile screen${s}. Portrait-first, thumb-reach navigation.`;
		case 'Other':
			return `Additional exploration${s} that didn't fit the responsive split above.`;
		default:
			return `${count} image${s}.`;
	}
}
