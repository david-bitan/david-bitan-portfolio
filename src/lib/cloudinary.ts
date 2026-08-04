export function cld(url: string, transform: string): string {
	return url.replace('/upload/', `/upload/${transform}/`);
}

export const PORTRAIT = 'c_fill,ar_3:4,g_auto,q_auto,f_auto,w_800';
export const LANDSCAPE = 'c_fill,ar_4:3,g_auto,q_auto,f_auto,w_800';
