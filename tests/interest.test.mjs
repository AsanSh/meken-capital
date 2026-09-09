import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(resolve(import.meta.dirname, '../site/interest.js'), 'utf8');

function boot(seed) {
  let raw = seed === undefined ? null : JSON.stringify(seed);
  const context = {
    localStorage: {
      getItem: key => (key === 'meken-interest-v1' ? raw : null),
      setItem: (key, value) => { if (key === 'meken-interest-v1') raw = value; }
    },
    Intl, Date, Math, JSON, Number, Set, isNaN, encodeURIComponent
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return {api: context.MekenInterest, dump: () => (raw === null ? null : JSON.parse(raw))};
}
const filled = {
  projectId: 'materials', projectTitle: 'Арматура · осенняя партия', amount: 500000,
  window: '3d', name: 'A. Sadykov', contact: 'a@example.com',
  onDemand: true, notContract: true
};

test('a declaration needs a project, an amount, a window, contacts and both consents', () => {
  const {api} = boot([]);
  assert.match(api.validate({...filled, projectId: ''}), /проект/i);
  assert.match(api.validate({...filled, amount: 0}), /сумм/i);
  assert.match(api.validate({...filled, amount: 1.5}), /сумм/i);
  assert.match(api.validate({...filled, window: 'later'}), /срок/i);
  assert.match(api.validate({...filled, name: ' '}), /имя/i);
  assert.match(api.validate({...filled, contact: ''}), /контакт/i);
  assert.match(api.validate({...filled, onDemand: false}), /подтвердите/i);
  assert.match(api.validate({...filled, notContract: false}), /подтвердите/i);
  assert.equal(api.validate(filled), '');
});

test('only the three declared readiness windows exist and carry both languages', () => {
  const {api} = boot([]);
  assert.equal(api.WINDOWS.map(w => w.id).join('|'), '3d|7d|14d');
  assert.equal(api.WINDOWS.map(w => w.days).join('|'), '3|7|14');
  assert.equal(api.windowLabel('7d'), 'В течение недели');
  assert.equal(api.windowLabel('7d', 'en'), 'Within a week');
  assert.equal(api.windowLabel('nope'), '—');
});

test('accepted declarations persist, aggregate and expose who is ready for how much', () => {
  const {api, dump} = boot([]);
  assert.equal(api.add({...filled, onDemand: false}).ok, false);
  const first = api.add(filled);
  assert.equal(first.ok, true);
  assert.equal(first.stored, true);
  const second = api.add({...filled, projectId: 'rent', projectTitle: 'Помещение с арендным потоком', amount: 2500000, window: '14d'});
  assert.equal(second.ok, true);
  assert.equal(dump().length, 2);
  const totals = api.totals();
  assert.equal(totals.amount, 3000000);
  assert.equal(totals.projects, 2);
  assert.equal(totals.people, 1);
  const [top] = api.byProject();
  assert.equal(top.projectId, 'rent');
  assert.equal(top.amount, 2500000);
  assert.equal(top.soonest, 14);
  assert.equal(api.remove(first.record.id).length, 1);
  api.clear();
  assert.equal(api.list().length, 0);
});

test('stored records that lost a required field are dropped on read', () => {
  const {api} = boot([
    {...filled, id: 'a', createdAt: '2026-09-01T00:00:00.000Z'},
    {...filled, id: 'b', createdAt: '2026-09-01T00:00:00.000Z', onDemand: false},
    {...filled, id: 'c', createdAt: '2026-09-01T00:00:00.000Z', amount: -5},
    {...filled, id: 'd', createdAt: '2026-09-01T00:00:00.000Z', window: 'someday'},
    'not an object'
  ]);
  assert.equal(api.list().map(item => item.id).join('|'), 'a');
});

test('the prepared letter states the project, the amount and the on-demand window', () => {
  const {api} = boot([]);
  const {record} = api.add(filled);
  const body = api.letter(record);
  assert.match(body, /Арматура/);
  assert.match(body, /500\s000\sсом/);
  assert.match(body, /в течение 3 дней после открытия сделки/);
  assert.match(body, /не является переводом средств/);
  assert.ok(api.mailto(body).startsWith('mailto:partner@meken.capital?subject='));
  assert.match(api.letterAll(), /Итого: 500\s000\sсом/);
  assert.match(api.csv(), /"Инвестор";"Контакт";"Проект"/);
});

test('a browser without storage still validates and prepares the letter', () => {
  const {api} = boot(undefined);
  const context = api;
  assert.equal(typeof context.letter, 'function');
  const attempt = api.add(filled);
  assert.equal(attempt.ok, true);
});
