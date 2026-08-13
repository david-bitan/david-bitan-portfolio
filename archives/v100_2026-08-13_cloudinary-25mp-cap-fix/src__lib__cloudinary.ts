export function cld(url: string, transform: string): string {
	return url.replace('/upload/', `/upload/${transform}/`);
}

// Detects tall mobile-viewport screenshots (folder/filename contains "mobile")
// mixed into project galleries alongside desktop shots. These are narrow
// source images — forcing them through a 4:3 crop upscales a thin sliver of
// pixels and comes out blurry, so they get a different, non-cropping treatment.
export function isMobileShot(url: string): boolean {
	return /mobile/i.test(url);
}

// g_north (not g_auto) so crops keep the top of the image — the part of a UI
// screenshot that actually identifies it — instead of a "smart" crop that can
// land anywhere.
// "Large" cards (Selected Work grid, Work grid, case-study gallery) get enough
// width to stay sharp at 2x pixel density; "small" thumbnails (Craft grid) get less.
// Quality policy: David's Cloudinary uploads are already WebP q=90. Passing
// them through Cloudinary's default `q_auto:best` (~85) re-compresses them,
// noticeably softening UI screenshots (menus, text, thin lines). We force
// `q_100` so Cloudinary re-encodes at the maximum quality — bigger files,
// but the visual fidelity matches what David sees in Figma.
export const PORTRAIT = 'c_fill,ar_3:4,g_north,q_100,f_auto,w_1200';
export const LANDSCAPE = 'c_fill,ar_4:3,g_north,q_100,f_auto,w_1200';
export const SQUARE = 'c_fill,ar_1:1,g_north,q_100,f_auto,w_800';

// For mobile screenshots INSIDE the project-page grid thumbnail (aspect 4/3
// frame, ~280px CSS wide at 4-col): h_800 is enough. c_limit only ever
// downscales — never crops, never upscales past the source — so tall shots
// stay sharp inside the small frame.
// (fl_no_upscale would express the same intent on top of c_fit, but this
// Cloudinary account rejects it with a 400, so c_limit is used instead.)
export const FIT_TALL = 'c_limit,h_800,q_100,f_auto';

// Lightbox main image, LANDSCAPE. Bumped from w_1600 to w_2400 because the
// old cap made a 1200px-CSS-wide lightbox look upscaled and blurry on any
// retina / 2K / 4K display. The h_1600 cap was also removed — it was
// squishing tall images into a tiny letterbox.
export const FULL = 'c_limit,w_2400,q_100,f_auto';

// Lightbox main image, TALL (mobile screenshots up to 16000px high).
// Was `c_limit,h_2400`, but that capped HEIGHT — a 375x16000 source came out
// 56x2400px (a squished sliver). Switched to `c_scale,w_1200` which caps
// WIDTH (upscales narrow mobile sources to a legible ~1200px wide) and lets
// HEIGHT grow proportionally — the lightbox scrolls the tall image vertically
// like a real phone screen.
// c_limit (never upscale) instead of c_scale — David's rule: no upscale ever.
// A tall mobile source narrower than 1200px is served at its true native
// width; the browser handles fit-to-viewport in the (now unused) lightbox.
export const FULL_TALL = 'c_limit,w_1200,q_100,f_auto';

// Mobile screenshot preset for the project-page grid. Rendered at 375px CSS
// (the true native width of the source designs). c_limit (never upscale) is
// non-negotiable per David — we accept that on retina the browser stretches
// the 375 source to 750 device pixels rather than serving an interpolated
// 750-wide file, because interpolated upscales look worse than a straight
// browser stretch on UI mockups (soft type, halos on borders).
export const MOBILE = 'c_limit,w_800,q_100,f_auto';

// srcset only proposes widths ≤ source width — c_limit never upscales.
// v093 bump: added 1125 (mobile design @3x) so if David re-exports mobile
// screens at Figma 2x/3x, the retina browsers can actually fetch a matching
// variant. Sources currently at 375 native (1x export) will still return 375
// for all three requests — no gain in that case, no regression either.
export function mobileSrcset(url: string): string {
	return [375, 750, 1125]
		.map((w) => `${cld(url, `c_limit,w_${w},q_100,f_auto`)} ${w}w`)
		.join(', ');
}

// Build a srcset spanning 1200 → 3200 CSS px, so the browser picks the
// right density for the current viewport / DPR instead of the biggest one
// every time. Landscape only — tall mobile screenshots have a fixed narrow
// width so a single high-res version is simpler.
//
// Widths chosen to stay under Cloudinary Free tier's 25 MP output cap when
// applied to very tall screenshots (e.g. review-page-side-toc is 1920×15613
// = source ~30 MP). A w_1800 rescale on that source produced 1800×14640 =
// 26.4 MP and returned HTTP 400. w_1600 caps at ~13010 h = 20.8 MP → safe.
// The gap between 1600 and 2400 is fine: browsers pick either the exact
// match or the next-larger, so intermediate DPRs hop from 1600 → 2400.
export function landscapeSrcset(url: string): string {
	return [1200, 1600, 2400, 3200]
		.map((w) => `${cld(url, `c_limit,w_${w},q_100,f_auto`)} ${w}w`)
		.join(', ');
}
