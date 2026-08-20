#!/usr/bin/env node
/**
 * Re-upload the local PNG sources to Cloudinary, overwriting the current
 * WebP-source variants. Cloudinary keeps the same public_id (without
 * extension), so every live URL in allProjects.ts continues to work — but
 * `f_auto` now delivers PNG lossless to browsers on UI screenshots (0
 * chroma-subsampling artefacts on white text over saturated buttons).
 *
 * Usage:
 *   1. Copy .env.example → .env, fill in Cloudinary credentials
 *      (Dashboard → Settings → API Keys)
 *   2. npm install --save-dev cloudinary dotenv
 *   3. Dry-run (no upload, just print planned mappings):
 *        node scripts/upload-pngs.js
 *   4. Real run (uploads, overwrites, invalidates CDN):
 *        node scripts/upload-pngs.js --confirm
 *
 * Public_id mapping rules (verified against existing Cloudinary URLs):
 *   - Root folder "Portfolio images" → "portfolio"
 *   - Every other segment: lowercase + spaces → hyphens
 *   - File extension dropped (Cloudinary stores format separately)
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const ROOT = path.resolve(__dirname, '..', '..', 'Portfolio images');
const CONFIRM = process.argv.includes('--confirm');
// Optional filter: --only "<substring>" restricts the upload set to files whose
// computed public_id contains the given substring (case-insensitive). Handy
// for re-uploading just one image after a local tweak.
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx !== -1 ? (process.argv[onlyIdx + 1] || '').toLowerCase() : null;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
});

/** Turn a local path into the Cloudinary public_id. */
function toPublicId(localAbsPath) {
	const rel = path.relative(ROOT, localAbsPath);
	const parts = rel.split(path.sep);
	// Drop file extension on the last segment
	parts[parts.length - 1] = parts[parts.length - 1].replace(/\.[^.]+$/, '');
	const slugged = parts.map((seg) => seg.toLowerCase().replace(/\s+/g, '-'));
	return ['portfolio', ...slugged].join('/');
}

/** Recursively collect all .png files under root. */
function walkPngs(dir) {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walkPngs(full));
		else if (entry.isFile() && /\.png$/i.test(entry.name)) out.push(full);
	}
	return out;
}

async function uploadOne(localPath, publicId) {
	return cloudinary.uploader.upload(localPath, {
		public_id: publicId,
		overwrite: true,
		invalidate: true, // purge Cloudflare/CDN cache for existing URLs
		resource_type: 'image',
		// No transformation on upload — store the raw PNG as source.
		// f_auto etc. are applied at DELIVERY time via the URL.
	});
}

async function main() {
	if (!fs.existsSync(ROOT)) {
		console.error(`✗ ROOT not found: ${ROOT}`);
		console.error(`  Expected the "Portfolio images/" folder to sit next to portfolio-site/`);
		process.exit(1);
	}

	const allPngs = walkPngs(ROOT);
	if (!allPngs.length) {
		console.error(`✗ No PNG files found under ${ROOT}`);
		process.exit(1);
	}

	const pngs = ONLY
		? allPngs.filter((p) => toPublicId(p).toLowerCase().includes(ONLY))
		: allPngs;

	console.log(`Found ${allPngs.length} PNG files total.`);
	if (ONLY) console.log(`Filter: --only "${ONLY}" → ${pngs.length} match(es).`);
	console.log(`Mode: ${CONFIRM ? 'UPLOAD (overwrite + invalidate)' : 'DRY-RUN (nothing sent)'}`);
	console.log(`Target cloud: ${process.env.CLOUDINARY_CLOUD_NAME || '<not set>'}`);
	console.log('---');

	if (ONLY && !pngs.length) {
		console.error(`✗ No files match filter "${ONLY}". Aborting.`);
		process.exit(1);
	}

	if (CONFIRM) {
		const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
			.filter((k) => !process.env[k]);
		if (missing.length) {
			console.error(`✗ Missing env vars: ${missing.join(', ')}. Fill in .env first.`);
			process.exit(1);
		}
	}

	let ok = 0, fail = 0;
	for (const png of pngs) {
		const publicId = toPublicId(png);
		const rel = path.relative(ROOT, png);
		if (!CONFIRM) {
			console.log(`${rel}\n  → ${publicId}`);
			continue;
		}
		process.stdout.write(`Uploading ${rel} → ${publicId} ... `);
		try {
			const res = await uploadOne(png, publicId);
			console.log(`OK (${res.format}, ${res.bytes} bytes)`);
			ok++;
		} catch (e) {
			console.log(`FAIL — ${e.message}`);
			fail++;
		}
	}

	console.log('---');
	if (CONFIRM) {
		console.log(`Done. ${ok} uploaded, ${fail} failed.`);
		if (fail === 0) {
			console.log('CDN cache invalidated (invalidate: true). Live URLs should serve the new PNG source within a few minutes.');
		}
	} else {
		console.log('This was a dry-run. Re-run with --confirm to actually upload.');
	}
}

main().catch((e) => {
	console.error('Fatal:', e);
	process.exit(1);
});
