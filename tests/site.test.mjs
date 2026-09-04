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
const context = { window: {} };
vm.runInNewContext(readFileSync(join(root, 'demo-data.js'), 'utf8'), context);
const data = context.window.MekenDemo;

test('demo contains six frozen coherent periods, no financial return claims', () => {
  assert.equal(data.length, 6);
  assert.ok(Object.isFrozen(data));
  data.forEach((item, index) => {
    assert.ok(Object.isFrozen(item));
    assert.ok(item.progress >= 0 && item.progress <= 100);
    assert.ok(item.stages >= 0 && item.stages <= 12);
    assert.ok(item.reports > 0);
    assert.ok(item.stage && item.next && item.date.includes('2026'));
    assert.ok(!('roi' in item) && !('returns' in item));
    if (index) {
      assert.ok(item.progress >= data[index - 1].progress);
      assert.ok(item.stages >= data[index - 1].stages);
      assert.ok(item.reports >= data[index - 1].reports);
    }
  });
});

test('initial homepage values match the last demo period', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const last = data.at(-1);
  for (const [id, value] of [['metric-progress', last.progress], ['metric-stages', last.stages], ['metric-reports', last.reports], ['period-date', last.date]]) {
    assert.ok(html.includes(`id="${id}">${value}<`), id);
  }
  assert.match(html, /Учебная модель/);
  assert.match(html, /не подтверждённые результаты/);
});

test('all local page links, assets and fragment targets resolve', () => {
  for (const file of files.filter(file => file.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const value = match[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(value)) continue;
      const [path, hash] = value.split('#');
      const target = path ? resolve(dirname(file), path.split('?')[0]) : file;
      assert.ok(existsSync(target), `${file}: missing ${value}`);
      if (hash && target.endsWith('.html')) {
        assert.ok(readFileSync(target, 'utf8').includes(`id="${hash}"`), `${file}: missing fragment ${value}`);
      }
    }
  }
});

test('all first-party scripts parse', () => {
  for (const file of files.filter(file => file.endsWith('.js') && !file.includes('/vendor/'))) {
    assert.doesNotThrow(() => new vm.Script(readFileSync(file, 'utf8')), file);
  }
});
