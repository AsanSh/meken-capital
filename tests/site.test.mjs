import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '../site');
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}
const files = walk(root);

test('all local page links, assets and fragment targets resolve', () => {
  for (const file of files.filter(file => file.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const value = match[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(value)) continue;
      const [path, hash] = value.split('#');
      // The server serves the site directory as the web root, so an absolute
      // reference such as /portal.css resolves against site/, not the filesystem.
      const target = path
        ? resolve(path.startsWith('/') ? root : dirname(file), '.' + (path.startsWith('/') ? path : '/' + path).split('?')[0])
        : file;
      assert.ok(existsSync(target), `${file}: missing ${value}`);
      // Hashes on the portal shell are client routes resolved by portal.js, not
      // element anchors; tests/portal.test.cjs covers that every route renders.
      if (hash && target.endsWith('.html') && !target.endsWith('app.html')) {
        assert.ok(readFileSync(target, 'utf8').includes(`id="${hash}"`), `${file}: missing fragment ${value}`);
      }
    }
  }
});

test('every shipped file is reachable through the server and every script parses', () => {
  const served = new Set(readFileSync(resolve(import.meta.dirname, '../server.mjs'), 'utf8')
    .match(/const publicFiles=new Set\(\[([^\]]*)\]\)/)[1]
    .match(/'([^']+)'/g).map(entry => entry.slice(1, -1)));
  const optional = new Set(['/CNAME']);
  for (const file of files) {
    const path = '/' + file.slice(root.length + 1);
    const reachable = served.has(path)
      || optional.has(path)
      || /^\/concepts\/assets\/(materials|house|apartment)\.webp$/.test(path);
    assert.ok(reachable, `${path} ships but the server never serves it`);
  }
  for (const file of files.filter(file => file.endsWith('.js'))) {
    assert.doesNotThrow(() => new vm.Script(readFileSync(file, 'utf8')), file);
  }
});
