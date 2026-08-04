import { allProjects } from './allProjects';

// Featured selection confirmed by David on 2026-08-03: sonary-dashboard,
// playright, top5 (only sonary-dashboard has featured=yes in the CMS sheet
// today — the other two rows should get featured=yes there too eventually).
const FEATURED_SLUGS = ['sonary-dashboard', 'playright', 'top5'];

export const featuredProjects = FEATURED_SLUGS.map(
	(slug) => allProjects.find((p) => p.slug === slug)!
);
