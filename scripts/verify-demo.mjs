import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const output = new URL('dist-demo/', root);
const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
assert.equal(config.outputDirectory, 'dist-demo');
assert.equal(config.framework, null);
assert.equal(config.buildCommand, 'npm run build:demo');
assert.ok(config.rewrites.every(r => ['/start', '/om', '/barn/demo', '/barn', '/admin', '/signin-with-chatgpt', '/signout-with-chatgpt'].includes(r.source)));
assert.ok(config.rewrites.every(r => r.destination === '/index.html'));

const publicFiles = await readdir(new URL('public/', root), { recursive: true });
const files = await readdir(fileURLToPath(output), { recursive: true, withFileTypes: true });
const names = files.filter(f => f.isFile()).map(f => relative(fileURLToPath(output), join(f.parentPath, f.name)).replaceAll('\\', '/'));
assert.ok(names.includes('index.html'));
assert.ok(names.some(n => /^assets\/.*\.js$/.test(n)));
assert.ok(names.some(n => /^assets\/.*\.css$/.test(n)));
for (const name of names) {
  assert.ok(name === 'index.html' || /^assets\/[^/]+\.(js|css)$/.test(name) || publicFiles.includes(name), `Unexpected public artifact: ${name}`);
  assert.ok(!/(^|\/)(server|db|api|drizzle|node_modules|\.openai)(\/|$)|\.sql$|\.map$|\.env/.test(name), `Private artifact: ${name}`);
  if (name.endsWith('.js')) {
    const source = await readFile(new URL(name, output), 'utf8');
    assert.ok(!/cloudflare:workers|oai-authenticated-user-id|INSERT INTO households/.test(source), `Server code in ${name}`);
  }
}
const html = await readFile(new URL('index.html', output), 'utf8');
assert.match(html, /<html lang="sv">/);
assert.match(html, /\/assets\/[^" ]+\.js/);
const manifest = JSON.parse(await readFile(new URL('demo-child.webmanifest', output), 'utf8'));
assert.equal(manifest.start_url, '/barn/demo');
for (const asset of ['autumn.webp', 'rewards/fika.png', 'rewards/glass.png', 'rewards/froosh.png', 'icon-192.png', 'icon-512.png']) {
  assert.ok(names.includes(asset), `Missing demo image: ${asset}`);
}
console.log(`Demo verified: ${names.length} public files, browser entry and assets present; no server/database artifacts.`);
