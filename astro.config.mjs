// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Must match the served domain: feeds the sitemap URLs (see Layout SITE_URL).
  site: 'https://david-bitan-portfolio.pages.dev',
  // /demo/* are static AI Lab apps in public/, not Astro pages, so they are
  // not listed; their case studies under /lab/* are.
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  vite: {
    plugins: [tailwindcss()]
  }
});