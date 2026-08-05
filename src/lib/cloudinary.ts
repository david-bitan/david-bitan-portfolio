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

// For mobile screenshots: fit the whole shot (no crop, no forced aspect
// ratio), capped by height. c_limit only ever downscales — never crops,
// never upscales past the source — which is what keeps these from pixelating.
// (fl_no_upscale would express the same intent on top of c_fit, but this
// Cloudinary account rejects it with a 400, so c_limit is used instead.)
export const FIT_TALL = 'c_limit,h_800,q_auto:best,f_auto';
