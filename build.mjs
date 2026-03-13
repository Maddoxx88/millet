#!/usr/bin/env node
/**
 * Millet — build.mjs
 * Produces minified dist/ files via esbuild.
 * Run: node build.mjs
 */

import { build, transform } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';

mkdirSync('dist', { recursive: true });

// ── CSS ───────────────────────────────────────────────────────────────────────
const cssResult = await transform(readFileSync('src/css/millet.css', 'utf8'), {
  loader: 'css',
  minify: true,
});
writeFileSync('dist/millet.min.css', cssResult.code);

// ── JS ────────────────────────────────────────────────────────────────────────
await build({
  entryPoints: ['src/js/core.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/millet.min.js',
});

// ── Report ────────────────────────────────────────────────────────────────────
function stat(label, path) {
  const raw = readFileSync(path);
  const gz  = gzipSync(raw, { level: 9 });
  console.log(`  ${label.padEnd(24)} ${fmt(raw.length).padStart(8)}  →  ${fmt(gz.length).padStart(8)} gz`);
}

function fmt(b) {
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(2)} KB`;
}

console.log('\nMillet build output:');
stat('dist/millet.min.css', 'dist/millet.min.css');
stat('dist/millet.min.js',  'dist/millet.min.js');

const css = readFileSync('dist/millet.min.css');
const js  = readFileSync('dist/millet.min.js');
const combined = Buffer.concat([css, js]);
const combinedGz = gzipSync(combined, { level: 9 });
console.log(`  ${'TOTAL (combined)'.padEnd(24)} ${fmt(combined.length).padStart(8)}  →  ${fmt(combinedGz.length).padStart(8)} gz`);
console.log();
