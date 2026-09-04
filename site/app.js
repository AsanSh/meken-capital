/* Progressive enhancement only. No authentication or request delivery is simulated. */
(() => {
  'use strict';
  document.documentElement.classList.add('js-enabled');
  const en = document.documentElement.lang === 'en';
  const nav = document.querySelector('header nav');
  const header = document.querySelector('header');
  if (nav && header) {
    nav.id = 'primary-navigation';
    nav.setAttribute('aria-label', en ? 'Main navigation' : 'Основная навигация');
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'menu-toggle';
    toggle.textContent = en ? 'Menu' : 'Меню';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    header.querySelector('.wrap').append(toggle);
    const setMenu = open => {
      toggle.setAttribute('aria-expanded', String(open));
      header.classList.toggle('menu-open', open);
      toggle.textContent = open ? (en ? 'Close' : 'Закрыть') : (en ? 'Menu' : 'Меню');
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    header.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false); toggle.focus();
      }
    });
    document.addEventListener('click', event => { if (!header.contains(event.target)) setMenu(false); });
    const wide = window.matchMedia('(min-width: 1180px)');
    wide.addEventListener('change', () => setMenu(false));
    for (const link of header.querySelectorAll('.r .btn')) {
      const copy = link.cloneNode(true); copy.className = 'mobile-only'; nav.append(copy);
    }
    nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    for (const link of header.querySelectorAll('a')) {
      const target = new URL(link.href);
      if (!target.hash && (target.pathname === location.pathname || (target.pathname.endsWith('/index.html') && location.pathname === target.pathname.replace('index.html', '')))) {
        link.setAttribute('aria-current', 'page');
      }
    }
  }

  const form = document.querySelector('form[data-flow]');
  if (!form) return;
  form.querySelector('button[type="submit"]').disabled = false;
  const feedback = form.querySelector('[data-feedback]');
  const result = form.querySelector('[data-result]');
  const flow = form.dataset.flow;
  const draftKey = 'meken-invitation-draft-v1';
  const controls = [...form.querySelectorAll('input, textarea, select')];
  const message = (text, error = false) => {
    feedback.textContent = text; feedback.hidden = false;
    feedback.classList.toggle('is-error', error);
    feedback.setAttribute('role', error ? 'alert' : 'status');
  };
  const invalidateResult = () => { if (result) result.hidden = true; };
  for (const input of controls) {
    input.addEventListener('input', () => {
      input.setCustomValidity(''); input.removeAttribute('aria-invalid');
      feedback.hidden = true; invalidateResult();
    });
    input.addEventListener('change', invalidateResult);
    input.addEventListener('invalid', () => input.setAttribute('aria-invalid', 'true'));
  }
  const valid = () => {
    for (const input of controls) {
      if (input.required && input.type !== 'checkbox' && !input.value.trim()) {
        input.setCustomValidity('Заполните это поле.');
      } else input.setCustomValidity('');
    }
    if (!form.checkValidity()) {
      message('Проверьте обязательные поля и подтвердите согласия ниже.', true);
      form.reportValidity(); return false;
    }
    return true;
  };
  const readValues = () => Object.fromEntries(new FormData(form).entries());
  if (flow === 'invitation') {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (draft && Date.now() - draft.savedAt < 30 * 60 * 1000) {
        for (const key of ['name', 'city', 'contact']) {
          if (typeof draft[key] === 'string') form.elements.namedItem(key).value = draft[key];
        }
      }
      sessionStorage.removeItem(draftKey);
    } catch { /* Storage may be unavailable; the form still works. */ }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!valid()) return;
    const values = readValues();
    if (flow === 'intro') {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({name: values.name.trim(), city: values.city.trim(), contact: values.contact.trim(), savedAt: Date.now()}));
      } catch { /* Safe fallback: continue without prefilled fields. */ }
      location.assign('invite.html'); return;
    }
    if (flow === 'invitation') {
      const consentText = [...form.querySelectorAll('.chk')].map(label => label.textContent.trim());
      const body = [
        'Здравствуйте! Хочу запросить личное приглашение в Meken Capital.', '',
        `Имя: ${values.name.trim()}`, `Город и страна: ${values.city.trim()}`,
        `Контакт: ${values.contact.trim()}`, `Источник: ${values.source}`,
        `Интересует: ${values.interest?.trim() || 'Обсудить на встрече'}`, '',
        'Подтверждения:', ...consentText.map(text => `— ${text}`), '',
        `Дата подготовки письма: ${new Date().toISOString()}`,
        'Это запрос на разговор, не заявка на инвестирование.'
      ].join('\n');
      const emailLink = result.querySelector('[data-email-link]');
      emailLink.href = `mailto:partner@meke.capital?subject=${encodeURIComponent('Запрос приглашения — Meken Capital')}&body=${encodeURIComponent(body)}`;
      result.querySelector('textarea').value = body;
      result.hidden = false;
      message('Письмо подготовлено. Оно ещё не отправлено: откройте его в почте или скопируйте текст и отправьте вручную.');
      result.querySelector('h3').focus();
    }
  });
  const copy = form.querySelector('[data-copy]');
  if (copy) copy.addEventListener('click', async () => {
    const text = result.querySelector('textarea');
    try {
      await navigator.clipboard.writeText(text.value);
      message('Текст скопирован. Отправьте письмо на partner@meke.capital.');
    } catch {
      text.focus(); text.select();
      message('Текст выделен. Скопируйте его вручную и отправьте на partner@meke.capital.');
    }
  });
})();
