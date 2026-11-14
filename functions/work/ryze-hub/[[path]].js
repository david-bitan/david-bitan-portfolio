// Ryze Hub was removed from the site (CL2, 13/11). Its page is no longer
// built, but an old copy can still be served from Cloudflare's cache for the
// exact address. This route answers first, before any cached file, with the
// site's own "Page not found" page and a real 404 status.
export async function onRequest({ request, env }) {
	const page = await env.ASSETS.fetch(new URL('/404.html', request.url));
	return new Response(page.body, {
		status: 404,
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
	});
}
