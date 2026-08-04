export function cld(url: string, transform: string): string {
	return url.replace('/upload/', `/upload/${transform}/`);
}

// "Large" cards (Selected Work grid, Work grid, case-study gallery) get enough
// width to stay sharp at 2x pixel density; "small" thumbnails (Craft grid) get less.
export const PORTRAIT = 'c_fill,ar_3:4,g_auto,q_auto:best,f_auto,w_1200';
export const LANDSCAPE = 'c_fill,ar_4:3,g_auto,q_auto:best,f_auto,w_1200';
export const SQUARE = 'c_fill,ar_1:1,g_auto,q_auto:best,f_auto,w_800';
