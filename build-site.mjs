// Builds C:\RoleRadar\site\index.html (the page GitHub hosts) from index.src.html.
// Edit index.src.html, then run: node build-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
let src = fs.readFileSync(path.join(dir, 'index.src.html'), 'utf8');
const pick = (re) => { const m = src.match(re); if (!m) return ''; src = src.replace(m[0], ''); return m[0]; };
const SOCIAL = /<meta (?:property="og:|name="twitter:)[^>]*>\s*/g;
const head = [pick(/<title>[\s\S]*?<\/title>\s*/), pick(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/), pick(/<meta name="description"[^>]*>\s*/),
  ...(src.match(SOCIAL) || []), ...(src.match(/<link [^>]*>\s*/g) || [])].join('');
src = src.replace(SOCIAL, '').replace(/<link [^>]*>\s*/g, '');
const styles = (src.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
src = src.replace(styles, '');
const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '')}${styles}
</head>
<body>
${src.trim()}
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), out);
console.log('wrote index.html', out.length, 'bytes');
