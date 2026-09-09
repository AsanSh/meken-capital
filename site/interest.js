/* Declared interest ("анкета заинтересованности").
   Prototype storage only: records stay in this browser and are handed to the
   manager as a prepared letter. A production build must persist them server-side
   together with the consent text, timestamp and IP. */
(function (root) {
  'use strict';
  const KEY = 'meken-interest-v1';
  const MAILBOX = 'partner@meken.im';
  const LIMIT = 60;
  const MAX_AMOUNT = 1000000000;
  const WINDOWS = [
    {id: '3d', days: 3, label: 'В течение 3 дней', labelEn: 'Within 3 days', short: '3 дня', shortEn: '3 days'},
    {id: '7d', days: 7, label: 'В течение недели', labelEn: 'Within a week', short: 'неделя', shortEn: 'a week'},
    {id: '14d', days: 14, label: 'В течение двух недель', labelEn: 'Within two weeks', short: '2 недели', shortEn: '2 weeks'}
  ].map(Object.freeze);
  const SOURCES = ['market', 'club', 'flow', 'cabinet', 'admin'];
  const CONSENTS = [
    'Готов внести указанную сумму по первому требованию управляющего в заявленный срок, если проект будет открыт и устроит меня после изучения документов.',
    'Понимаю, что анкета не является переводом средств, договором или обязательством сторон: обязательства возникают только после подписания договора конкретной сделки.'
  ];

  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
  const money = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(Math.round(n)) + ' сом';
  const windowOf = id => WINDOWS.find(w => w.id === id) || null;
  const windowLabel = (id, lang) => { const w = windowOf(id); return w ? (lang === 'en' ? w.labelEn : w.label) : '—'; };
  const windowShort = (id, lang) => { const w = windowOf(id); return w ? (lang === 'en' ? w.shortEn : w.short) : '—'; };
  const text = (value, max) => typeof value === 'string' && value.trim().length && value.trim().length <= max ? value.trim() : null;

  function storage() {
    try {
      const store = root.localStorage;
      if (!store) return null;
      store.getItem(KEY);
      return store;
    } catch { return null; }
  }
  function newId() {
    try { if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID(); } catch { /* fall through */ }
    return 'int-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function clean(record) {
    if (!record || typeof record !== 'object') return null;
    const amount = Number(record.amount);
    const projectId = text(record.projectId, 40);
    const projectTitle = text(record.projectTitle, 160);
    const name = text(record.name, 100);
    const contact = text(record.contact, 160);
    if (!projectId || !projectTitle || !name || !contact) return null;
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
    if (!windowOf(record.window)) return null;
    if (record.onDemand !== true || record.notContract !== true) return null;
    const note = typeof record.note === 'string' ? record.note.trim().slice(0, 600) : '';
    const created = typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt))
      ? record.createdAt : new Date().toISOString();
    return {
      id: text(record.id, 64) || newId(),
      projectId, projectTitle, amount,
      window: record.window,
      name, contact, note,
      source: SOURCES.includes(record.source) ? record.source : 'market',
      demo: record.demo === true,
      onDemand: true, notContract: true,
      createdAt: created
    };
  }
  function validate(input) {
    const amount = Number(input && input.amount);
    if (!text(input && input.projectId, 40)) return 'Выберите проект.';
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) return 'Укажите примерную сумму участия целым числом.';
    if (amount > MAX_AMOUNT) return 'Сумма выглядит нереалистичной. Проверьте значение.';
    if (!windowOf(input && input.window)) return 'Выберите срок готовности внести сумму.';
    if (!text(input && input.name, 100)) return 'Укажите имя и фамилию.';
    if (!text(input && input.contact, 160)) return 'Укажите контакт для связи.';
    if (!(input && input.onDemand === true && input.notContract === true)) return 'Подтвердите оба пункта под формой.';
    return '';
  }
  function list() {
    const store = storage();
    if (!store) return [];
    let raw;
    try { raw = JSON.parse(store.getItem(KEY) || '[]'); } catch { return []; }
    if (!Array.isArray(raw)) return [];
    return raw.map(clean).filter(Boolean).slice(0, LIMIT);
  }
  function write(items) {
    const store = storage();
    if (!store) return false;
    try { store.setItem(KEY, JSON.stringify(items.slice(0, LIMIT))); return true; } catch { return false; }
  }
  function add(input) {
    const error = validate(input);
    if (error) return {ok: false, error};
    const record = clean({...input, id: newId(), createdAt: new Date().toISOString()});
    if (!record) return {ok: false, error: 'Проверьте заполненные поля.'};
    const items = [record, ...list()];
    return {ok: true, record, stored: write(items)};
  }
  function remove(id) {
    const items = list().filter(item => item.id !== id);
    write(items);
    return items;
  }
  function clear() { write([]); }
  function totals(items) {
    const rows = Array.isArray(items) ? items : list();
    return {
      count: rows.length,
      amount: rows.reduce((sum, item) => sum + item.amount, 0),
      projects: new Set(rows.map(item => item.projectId)).size,
      people: new Set(rows.map(item => item.name.toLowerCase())).size
    };
  }
  function byProject(items) {
    const rows = Array.isArray(items) ? items : list();
    const map = new Map();
    for (const item of rows) {
      const entry = map.get(item.projectId) || {projectId: item.projectId, title: item.projectTitle, amount: 0, count: 0, soonest: null};
      entry.amount += item.amount;
      entry.count += 1;
      const days = (windowOf(item.window) || {days: 99}).days;
      if (entry.soonest === null || days < entry.soonest) entry.soonest = days;
      map.set(item.projectId, entry);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }
  function letter(record) {
    return [
      'Здравствуйте! Подтверждаю заинтересованность в проекте Meken Capital.', '',
      `Проект: ${record.projectTitle}`,
      `Примерная сумма участия: ${money(record.amount)}`,
      `Готовность внести по первому требованию: ${windowLabel(record.window).toLowerCase()} после открытия сделки`,
      `Имя: ${record.name}`,
      `Контакт: ${record.contact}`,
      `Комментарий: ${record.note || 'нет'}`, '',
      'Подтверждения:', ...CONSENTS.map(line => `— ${line}`), '',
      `Дата анкеты: ${record.createdAt}`
    ].join('\n');
  }
  function letterAll(items) {
    const rows = Array.isArray(items) ? items : list();
    if (!rows.length) return '';
    const sum = totals(rows);
    return [
      'Здравствуйте! Ниже мой заявленный интерес по проектам Meken Capital.', '',
      ...rows.map((item, index) => `${index + 1}. ${item.projectTitle} — ${money(item.amount)}, ${windowLabel(item.window).toLowerCase()} после открытия сделки`),
      '',
      `Итого: ${money(sum.amount)} по ${sum.projects} проект(ам).`,
      `Имя: ${rows[0].name}`,
      `Контакт: ${rows[0].contact}`, '',
      'Подтверждения:', ...CONSENTS.map(line => `— ${line}`), '',
      `Дата анкеты: ${new Date().toISOString()}`
    ].join('\n');
  }
  function mailto(body, subject) {
    return `mailto:${MAILBOX}?subject=${encodeURIComponent(subject || 'Заявленный интерес — Meken Capital')}&body=${encodeURIComponent(body)}`;
  }
  function csv(items) {
    const rows = Array.isArray(items) ? items : list();
    const escape = value => `"${String(value).replace(/"/g, '""')}"`;
    return [['Инвестор', 'Контакт', 'Проект', 'Сумма, сом', 'Готовность', 'Источник', 'Дата'].map(escape).join(';')]
      .concat(rows.map(item => [item.name, item.contact, item.projectTitle, item.amount, windowLabel(item.window), item.source, item.createdAt].map(escape).join(';')))
      .join('\n');
  }

  root.MekenInterest = Object.freeze({
    KEY, MAILBOX, LIMIT, MAX_AMOUNT,
    WINDOWS, CONSENTS,
    money, escape, windowLabel, windowShort, windowOf,
    validate, list, add, remove, clear, totals, byProject,
    letter, letterAll, mailto, csv
  });
})(typeof window === 'object' ? window : globalThis);
