#!/usr/bin/env node
/**
 * Millet — measure.mjs
 * Compares file sizes: raw → minified → gzip → brotli
 *
 * Usage:
 *   node measure.mjs                        # measures Millet
 *   node measure.mjs path/to/other.css      # measures any file
 *   node measure.mjs --compare path/to/oat  # side-by-side diff
 *
 * Requires: esbuild  (npm i -D esbuild)
 * Optional: brotli   (brew install brotli / apt install brotli)
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';
import { resolve, basename, extname } from 'path';

const MILLET_FILES = [
  'src/css/millet.css',
  'src/js/enhance.js',
  'src/js/core.js',
];

const args = process.argv.slice(2);
const compareIndex = args.indexOf('--compare');
const compareDir = compareIndex !== -1 ? args[compareIndex + 1] : null;
const extraFiles = args.filter((a, i) => !a.startsWith('--') && i !== compareIndex + 1);

const filesToMeasure = extraFiles.length ? extraFiles : MILLET_FILES;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function minify(filePath) {
  const ext = extname(filePath);
  try {
    if (ext === '.css') {
      // esbuild handles CSS minification
      const result = execSync(
        `npx esbuild --bundle=false --minify "${filePath}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      return Buffer.from(result);
    } else if (ext === '.js' || ext === '.mjs' || ext === '.ts') {
      const result = execSync(
        `npx esbuild --bundle=false --minify --format=esm "${filePath}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      return Buffer.from(result);
    }
  } catch (e) {
    console.warn(`  ⚠ Could not minify ${filePath}: ${e.message}`);
  }
  return readFileSync(filePath);
}

function brotli(buf) {
  try {
    const result = spawnSync('brotli', ['--best', '--stdout'], {
      input: buf,
      encoding: 'buffer',
    });
    if (result.status === 0) return result.stdout;
  } catch {}
  return null;
}

function measure(filePath) {
  const raw = readFileSync(filePath);
  const minified = minify(filePath);
  const gzipped = gzipSync(minified, { level: 9 });
  const brotlid = brotli(minified);

  return {
    file: filePath,
    raw: raw.length,
    minified: minified.length,
    gzip: gzipped.length,
    brotli: brotlid?.length ?? null,
  };
}

function printTable(label, results) {
  const cols = ['File', 'Raw', 'Min', 'Min+gz', 'Min+br'];
  const rows = results.map(r => [
    basename(r.file),
    fmt(r.raw),
    fmt(r.minified),
    fmt(r.gzip),
    r.brotli ? fmt(r.brotli) : '—',
  ]);

  // Column widths
  const widths = cols.map((c, i) =>
    Math.max(c.length, ...rows.map(r => r[i].length))
  );

  const line = widths.map(w => '─'.repeat(w + 2)).join('┼');
  const row = (cells) => cells.map((c, i) => ` ${c.padEnd(widths[i])} `).join('│');

  console.log(`\n${label}`);
  console.log('┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐');
  console.log('│' + row(cols) + '│');
  console.log('├' + line + '┤');
  rows.forEach(r => console.log('│' + row(r) + '│'));

  // Totals row
  const totals = ['TOTAL',
    fmt(results.reduce((s, r) => s + r.raw, 0)),
    fmt(results.reduce((s, r) => s + r.minified, 0)),
    fmt(results.reduce((s, r) => s + r.gzip, 0)),
    results[0].brotli !== null
      ? fmt(results.reduce((s, r) => s + (r.brotli ?? 0), 0))
      : '—',
  ];
  console.log('├' + line + '┤');
  console.log('│' + row(totals) + '│');
  console.log('└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘');
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('\nMillet size report');
console.log('Measuring with: esbuild (minify) + zlib (gzip level 9)');
console.log('Make sure esbuild is installed: npm i -D esbuild');

const milletResults = filesToMeasure.map(f => measure(resolve(f)));
printTable('📦 Millet', milletResults);

if (compareDir) {
  // Try to find CSS + JS files in the compare directory
  const { readdirSync } = await import('fs');
  const entries = readdirSync(compareDir);
  const compareFiles = entries
    .filter(f => /\.(css|js)$/.test(f) && !/\.min\./.test(f))
    .map(f => resolve(compareDir, f));

  if (compareFiles.length) {
    const compareResults = compareFiles.map(f => measure(f));
    printTable(`📦 ${basename(compareDir)}`, compareResults);

    // Delta summary
    const milletGzip = milletResults.reduce((s, r) => s + r.gzip, 0);
    const otherGzip  = compareResults.reduce((s, r) => s + r.gzip, 0);
    const delta = milletGzip - otherGzip;
    const pct = ((delta / otherGzip) * 100).toFixed(1);
    const sign = delta < 0 ? '' : '+';
    console.log(`\nΔ Millet vs ${basename(compareDir)}: ${sign}${fmt(delta)} (${sign}${pct}%) min+gz\n`);
  } else {
    console.log(`No .css/.js files found in ${compareDir}`);
  }
}
