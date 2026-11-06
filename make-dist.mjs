// Copyright 2026 NextBeacon LLC. All rights reserved.
// Makes dist/: only the files a visitor should get, plus the security headers file the host reads.
// The host runs:  node build-site.mjs && node make-dist.mjs   and serves dist/
// Every file or folder at the top of this project must be named in PUBLISH or LEAVE_OUT below;
// an unnamed one stops the build, so nothing is published or dropped by accident.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'dist');

const PUBLISH = [
  'index.html', 'help.html', 'privacy.html', 'terms.html', 'thanks.html', 'beacon.html', 'compare', 'fonts',
  'page.css', 'logo.png', 'og.png', 'tea-tag.webp',
  'favicon.ico', 'favicon.png', 'favicon-48.png', 'favicon-96.png', 'favicon-192.png', 'apple-touch-icon.png',
  'robots.txt', 'sitemap.xml',
];
const LEAVE_OUT = [
  'index.src.html', 'build-site.mjs', 'make-dist.mjs', 'make-og.mjs', 'og-card.html',
  'notfound.html', // published as 404.html, the page the host shows for an address that does not exist
  'CNAME', '.nojekyll', '.gitignore', '.git', 'dist', 'node_modules',
];

const here = fs.readdirSync(dir);
const unnamed = here.filter((f) => !PUBLISH.includes(f) && !LEAVE_OUT.includes(f));
if (unnamed.length) throw new Error('make-dist: name these in PUBLISH or LEAVE_OUT first: ' + unnamed.join(', '));
const missing = PUBLISH.filter((f) => !here.includes(f));
if (missing.length) throw new Error('make-dist: listed in PUBLISH but not found: ' + missing.join(', '));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of PUBLISH) fs.cpSync(path.join(dir, f), path.join(out, f), { recursive: true });
fs.copyFileSync(path.join(dir, 'notfound.html'), path.join(out, '404.html'));

// The pages carry their scripts inside the page. The content policy allows exactly those scripts, by their
// fingerprint, and nothing else, so a script somebody managed to inject would not run.
const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) pages.push(p);
  }
})(out);
const hashes = new Set();
const connect = new Set();
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  if (/<script[^>]*\ssrc=/i.test(html)) throw new Error('make-dist: ' + path.relative(out, p) + ' loads a script file; add it to the policy by hand');
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) throw new Error('make-dist: ' + path.relative(out, p) + ' has an inline event handler (onclick and the like); the policy would block it');
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(m[1])) continue; // data, never run
    // a browser reads every line ending as a plain newline before it fingerprints the script, so do the same
    hashes.add("'sha256-" + crypto.createHash('sha256').update(m[2].replace(/\r\n?/g, '\n'), 'utf8').digest('base64') + "'");
    for (const u of m[2].matchAll(/["'](https:\/\/[a-z0-9.-]+)["'/]/gi)) if (/fetch\(/.test(m[2])) connect.add(u[1]);
  }
}
const csp = [
  "default-src 'self'",
  "script-src 'self' " + [...hashes].join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' " + [...connect].join(' '),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ').replace(/\s+;/g, ';');

const headers = `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
`;
fs.writeFileSync(path.join(out, '_headers'), headers);

const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`dist: ${count(out)} files, ${pages.length} pages, ${hashes.size} page scripts allowed, connects to: ${[...connect].join(', ') || 'nothing'}`);
