(() => {
  'use strict';
  const data = window.MekenDemo;
  if (!data) return;
  const $ = id => document.getElementById(id);
  document.querySelectorAll('[data-enhanced]').forEach(el => { el.hidden = false; });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = document.querySelector('.city-scene');
  const phase = $('city-phase');
  const motion = $('motion-toggle');
  let motionOff = reduced.matches;
  let entrance;
  let phaseTouched = false;
  let selected = 5;
  let chart;

  function setPhase(value) {
    const amount = Math.max(0, Math.min(100, Number(value)));
    scene.style.setProperty('--built', `${amount}%`);
    phase.value = String(amount);
    const label = amount < 25 ? 'Идея' : amount > 75 ? 'Готовый объект' : 'Строительство';
    phase.setAttribute('aria-valuetext', `${label}, ${Math.round(amount)}% визуального перехода`);
    document.querySelectorAll('[data-phase]').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === label)));
  }
  function syncMotion() {
    motion.textContent = motionOff ? 'Включить движение' : 'Остановить движение';
    motion.setAttribute('aria-pressed', String(motionOff));
    document.body.classList.toggle('motion-off', motionOff);
    if (motionOff) {
      cancelAnimationFrame(entrance);
      scene.style.transform = '';
    }
    if (chart) chart.options.animation = motionOff ? false : { duration: 450 };
  }
  motion.hidden = false;
  motion.addEventListener('click', () => { motionOff = !motionOff; syncMotion(); });
  reduced.addEventListener('change', () => { motionOff = reduced.matches; syncMotion(); });
  phase.addEventListener('input', () => { phaseTouched = true; cancelAnimationFrame(entrance); setPhase(phase.value); });
  document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => {
    phaseTouched = true; cancelAnimationFrame(entrance); setPhase(button.dataset.phase);
  }));
  setPhase(50);
  syncMotion();
  // Wait for both visual layers before revealing the city. Images remain useful without JS.
  Promise.all([...scene.querySelectorAll('img')].map(img => img.decode().catch(() => {}))).then(() => {
    if (motionOff || phaseTouched) return;
    const start = performance.now();
    function reveal(now) {
      if (motionOff) return;
      const elapsed = Math.min(1, (now - start) / 1600);
      setPhase(50 * (1 - Math.pow(1 - elapsed, 3)));
      if (elapsed < 1) entrance = requestAnimationFrame(reveal);
    }
    entrance = requestAnimationFrame(reveal);
  });
  let scrollFrame = false;
  window.addEventListener('scroll', () => {
    if (scrollFrame || motionOff) return;
    scrollFrame = true;
    requestAnimationFrame(() => {
      if (!motionOff) scene.style.transform = `translateY(${Math.min(window.scrollY * 0.08, 36)}px)`;
      scrollFrame = false;
    });
  }, { passive: true });

  if (window.Chart) {
    chart = new Chart($('progress-chart'), {
      type: 'line',
      data: { labels: ['апр', 'май', 'июн', 'июл', 'авг', 'сен'], datasets: [{
        data: data.map(item => item.progress), borderColor: '#c1f900', backgroundColor: '#c1f90018', fill: true,
        stepped: true, borderWidth: 2, pointRadius: [0,0,0,0,0,5], pointHoverRadius: 7, pointBackgroundColor: '#c1f900', pointBorderColor: '#080b0d', pointBorderWidth: 2
      }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: motionOff ? false : { duration: 450 },
        plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: context => `Готовность модели: ${context.raw}%` } } },
        scales: {
          x: { grid: { display: false }, border: { color: '#34383b' }, ticks: { color: '#a6aaac', font: { family: 'Inter', size: 12 } } },
          y: { min: 0, max: 100, border: { display: false }, grid: { color: '#ffffff14' }, ticks: { stepSize: 50, color: '#a6aaac', callback: value => `${value}%`, font: { family: 'Inter', size: 12 } } }
        }
      }
    });
  } else {
    $('progress-chart').hidden = true;
    const fallback = document.createElement('p');
    fallback.textContent = data.map(item => `${item.month}: ${item.progress}%`).join(' · ');
    document.querySelector('.chart-frame').append(fallback);
  }
  function selectMonth(index) {
    selected = index;
    const period = data[index];
    $('metric-progress').textContent = period.progress;
    $('metric-stages').textContent = period.stages;
    $('metric-reports').textContent = period.reports;
    $('period-date').textContent = period.date;
    $('period-summary').textContent = `${period.month}: ${period.stage.toLowerCase()}. Готовность модели — ${period.progress}%.`;
    document.querySelectorAll('[data-month]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.month) === index)));
    if (chart) {
      chart.data.datasets[0].data = data.map((item, i) => i <= index ? item.progress : null);
      chart.data.datasets[0].pointRadius = data.map((_, i) => i === index ? 5 : 0);
      chart.update();
    }
    $('progress-chart').setAttribute('aria-label', `Учебная модель на ${period.date}: готовность ${period.progress}%, завершено ${period.stages} из 12 этапов, отчётов ${period.reports}.`);
  }
  document.querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => selectMonth(Number(button.dataset.month))));
  const dialog = $('demo-report');
  function renderReport() {
    const period = data[selected];
    $('report-title').textContent = `${period.month} 2026`;
    $('report-stage').textContent = period.stage;
    $('report-next').textContent = period.next;
    const details = $('report-details');
    details.replaceChildren();
    for (const [label, value] of [['Дата среза', period.date], ['Готовность модели', `${period.progress}%`], ['Завершено этапов', `${period.stages} из 12`], ['Отчётов в модели', String(period.reports)]]) {
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      details.append(term, description);
    }
  }
  $('open-report').addEventListener('click', () => { renderReport(); dialog.showModal(); });
  $('close-report').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  $('download-report').addEventListener('click', () => {
    const period = data[selected];
    const body = ['MEKEN CAPITAL — ДЕМОНСТРАЦИОННЫЙ ОТЧЁТ', 'УЧЕБНЫЕ ДАННЫЕ. НЕ РЕАЛЬНЫЙ ОБЪЕКТ.', '', period.date, period.stage,
      `Готовность модели: ${period.progress}%`, `Завершено этапов: ${period.stages} из 12`, `Отчётов в модели: ${period.reports}`,
      '', `Следующий контрольный шаг: ${period.next}`, '', 'Не предложение об инвестировании. Нет реальных финансовых результатов и подтверждающих документов. Есть риск потери капитала.'
    ].join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', body], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `meken-demo-2026-${String(selected + 4).padStart(2, '0')}.txt`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
