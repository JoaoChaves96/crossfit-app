#!/usr/bin/env node
/**
 * Move exported vendor assets out of a `node_modules` path segment.
 *
 * WHY THIS EXISTS
 * ---------------
 * `expo export` mirrors an asset's on-disk location into the output tree, so a
 * font or icon that ships inside a package lands at:
 *
 *   dist/assets/node_modules/@expo/vector-icons/.../Ionicons.<hash>.ttf
 *
 * Cloudflare Pages' uploader skips any path containing a `node_modules`
 * segment. Those files are silently never uploaded, and because `_redirects`
 * ends in a `/* /index.html 200` SPA rewrite, every request for one returns
 * index.html with a 200. Nothing 404s, so nothing looks wrong — you just get
 * `OTS parsing error: invalid sfntVersion: 1008813135` (that number is the
 * ASCII `<!DO` of `<!DOCTYPE`) and tofu boxes where the icons should be.
 *
 * This ran as a post-export step: rename the directory, then repoint the
 * references in the bundle. Both halves must succeed or the build fails —
 * a half-applied rewrite is worse than none, because it fails the same
 * invisible way the original bug did.
 *
 * Vendoring the file into `assets/` is the better fix where we control the
 * import (see the Hanken Grotesk faces in `app/_layout.tsx`). This handles the
 * assets we don't: `@expo/vector-icons` glyph fonts and the
 * `@react-navigation/elements` chrome icons.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const FROM_DIR = join(DIST, 'assets', 'node_modules');
const TO_DIR = join(DIST, 'assets', 'vendor');
const FROM_REF = 'assets/node_modules/';
const TO_REF = 'assets/vendor/';

// Text formats that can carry an asset URL. Rewriting a .ttf or .png would
// corrupt it, so the walk is allowlisted rather than "everything but binaries".
const REWRITABLE = /\.(js|mjs|cjs|html|css|json|map)$/;

function fail(message) {
  console.error(`\n[relocate-vendor-assets] FAILED: ${message}\n`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(DIST)) fail(`no dist/ at ${DIST} — run \`expo export\` first`);

if (!existsSync(FROM_DIR)) {
  // Either there are no package-owned assets, or Expo changed its output
  // layout. Neither is an error, but the second would mean this script has
  // quietly stopped protecting us — so say so rather than printing "ok".
  console.log(
    '[relocate-vendor-assets] no dist/assets/node_modules — nothing to relocate.\n' +
      '  If the app ships package assets (icon fonts, navigation icons), Expo has\n' +
      '  changed its output layout and this script needs revisiting.',
  );
  process.exit(0);
}

if (existsSync(TO_DIR)) fail(`${TO_DIR} already exists — refusing to overwrite`);

const relocated = walk(FROM_DIR).length;
renameSync(FROM_DIR, TO_DIR);

let filesRewritten = 0;
let refsRewritten = 0;
for (const file of walk(DIST)) {
  if (!REWRITABLE.test(file)) continue;
  const before = readFileSync(file, 'utf8');
  if (!before.includes(FROM_REF)) continue;
  const occurrences = before.split(FROM_REF).length - 1;
  writeFileSync(file, before.split(FROM_REF).join(TO_REF));
  filesRewritten += 1;
  refsRewritten += occurrences;
}

// The directory moved, so any surviving reference is now a genuine 404 (or,
// under the SPA rewrite, an index.html served as a font). Louder to fail here.
const stragglers = walk(DIST).filter(
  (f) => REWRITABLE.test(f) && readFileSync(f, 'utf8').includes(FROM_REF),
);
if (stragglers.length) fail(`references to ${FROM_REF} survive in:\n  ${stragglers.join('\n  ')}`);

if (refsRewritten === 0) {
  fail(
    `relocated ${relocated} asset(s) but found no references to repoint.\n` +
      `  Expected the bundle to contain "${FROM_REF}". The reference format has\n` +
      `  probably changed, which would leave every vendor asset unreachable.`,
  );
}

console.log(
  `[relocate-vendor-assets] moved ${relocated} asset(s) to assets/vendor/ and ` +
    `repointed ${refsRewritten} reference(s) across ${filesRewritten} file(s).`,
);
