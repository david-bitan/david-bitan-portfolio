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
export const PORTRAIT = 'c_fill,ar_3:4,g_north,q_auto:best,f_auto,w_1200';
export const LANDSCAPE = 'c_fill,ar_4:3,g_north,q_auto:best,f_auto,w_1200';
export const SQUARE = 'c_fill,ar_1:1,g_north,q_auto:best,f_auto,w_800';

// For mobile screenshots INSIDE the project-page grid thumbnail (aspect 4/3
// frame, ~280px CSS wide at 4-col): h_800 is enough. c_limit only ever
// downscales — never crops, never upscales past the source — so tall shots
// stay sharp inside the small frame.
// (fl_no_upscale would express the same intent on top of c_fit, but this
// Cloudinary account rejects it with a 400, so c_limit is used instead.)
export const FIT_TALL = 'c_limit,h_800,q_auto:best,f_auto';

// Lightbox main image, LANDSCAPE. Bumped from w_1600 to w_2400 because the
// old cap made a 1200px-CSS-wide lightbox look upscaled and blurry on any
// retina / 2K / 4K display. The h_1600 cap was also removed — it was
// squishing tall images into a tiny letterbox.
export const FULL = 'c_limit,w_2400,q_auto:best,f_auto';

// Lightbox main image, TALL (mobile screenshots up to 16000px high).
// Was `c_limit,h_2400`, but that capped HEIGHT — a 375x16000 source came out
// 56x2400px (a squished sliver). Switched to `c_scale,w_1200` which caps
// WIDTH (upscales narrow mobile sources to a legible ~1200px wide) and lets
// HEIGHT grow proportionally — the lightbox scrolls the tall image vertically
// like a real phone screen.
export const FULL_TALL = 'c_scale,w_1200,q_auto:best,f_auto';

// Build a srcset spanning 1200 → 3200 CSS px, so the browser picks the
// right density for the current viewport / DPR instead of the biggest one
// every time. Landscape only — tall mobile screenshots have a fixed narrow
// width so a single high-res version is simpler.
export function landscapeSrcset(url: string): string {
	return [1200, 1800, 2400, 3200]
		.map((w) => `${cld(url, `c_limit,w_${w},q_auto:best,f_auto`)} ${w}w`)
		.join(', ');
}
