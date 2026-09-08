(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    store = "meken-investor-state-v1",
    rate = 87.5;
  const seed = {
    currency: "KGS",
    lang: "ru",
    view: "overview",
    votes: {},
    preferences: {
      project: true,
      milestone: true,
      document: true,
      distribution: true,
    },
    notifications: [
      {
        id: 1,
        title: "Новый документ",
        en: "New document",
        body: "Добавлена оценка партии арматуры.",
        bodyEn: "Rebar batch valuation was added.",
        date: "Сегодня",
        dateEn: "Today",
        read: false,
      },
      {
        id: 2,
        title: "Этап завершён",
        en: "Milestone completed",
        body: "Поставка на склад подтверждена.",
        bodyEn: "Warehouse delivery was confirmed.",
        date: "Сегодня",
        dateEn: "Today",
        read: false,
      },
      {
        id: 3,
        title: "Открыто голосование",
        en: "Voting opened",
        body: "Смена подрядчика по проекту Ала-Арча.",
        bodyEn: "Contractor change for Ala-Archa project.",
        date: "Вчера",
        dateEn: "Yesterday",
        read: false,
      },
      {
        id: 4,
        title: "Распределение",
        en: "Distribution",
        body: "Опубликован расчёт за август.",
        bodyEn: "August distribution statement published.",
        date: "2 сен",
        dateEn: "Sep 2",
        read: false,
      },
    ],
  };
  let state;
  try {
    state = { ...seed, ...JSON.parse(localStorage.getItem(store) || "{}") };
    state.preferences = { ...seed.preferences, ...state.preferences };
    state.notifications = Array.isArray(state.notifications)
      ? state.notifications
      : seed.notifications;
    if (!["ru", "en"].includes(state.lang)) state.lang = "ru";
    if (!["KGS", "USD"].includes(state.currency)) state.currency = "KGS";
    if (!['overview', 'portfolio', 'matching', 'dataroom', 'timeline', 'voting', 'calendar', 'settings'].includes(state.view)) state.view = 'overview';
  } catch {
    state = JSON.parse(JSON.stringify(seed));
  }
  const deals = [
    {
      id: "steel",
      name: "Партия арматуры · Dordoi",
      en: "Rebar batch · Dordoi",
      structure: "Мурабаха",
      structureEn: "Murabaha",
      amount: 1500000,
      progress: 72,
      term: "4 мес.",
      termEn: "4 mo.",
      result: 126000,
      status: "Исполнение",
      statusEn: "Operating",
    },
    {
      id: "house",
      name: "Дом · Ала-Арча",
      en: "House · Ala-Archa",
      structure: "Мушарака + Истисна",
      structureEn: "Musharaka + Istisna",
      amount: 2800000,
      progress: 38,
      term: "24 мес.",
      termEn: "24 mo.",
      result: 504000,
      status: "Строительство",
      statusEn: "Construction",
    },
    {
      id: "rent",
      name: "Помещение · 12 мкр",
      en: "Commercial unit · District 12",
      structure: "Иджара",
      structureEn: "Ijara",
      amount: 1200000,
      progress: 100,
      term: "Долгосрочно",
      termEn: "Long term",
      result: 115200,
      status: "Аренда",
      statusEn: "Leased",
    },
  ];
  const catalog = (window.MekenPlatform && window.MekenPlatform.projects) || [];
  const economics = (window.MekenPlatform && window.MekenPlatform.economics) || null;
  const interest = window.MekenInterest || null;
  const esc = (value) => (interest ? interest.escape(value) : String(value == null ? "" : value));
  let declared = interest ? interest.list() : [];
  const answers = { goal: "earn", term: "short", amount: 1000000, risk: "balanced", pay: "exit" };
  let ranked = null,
    picked = null,
    letterText = "";
  const dictionary = {
    ru: {
      verified: "Профиль проверен",
      overview: "Обзор",
      portfolio: "Мои сделки",
      matching: "Подбор сделки",
      timeline: "Движение капитала",
      voting: "Голосования",
      calendar: "Календарь",
      settings: "Настройки",
      shariaNote:
        "Каждая сделка имеет отдельный актив, договор и проверку исламской структуры.",
      learn: "Разобраться в инструментах →",
      center: "Центр событий",
      notifications: "Уведомления",
      readAll: "Отметить всё прочитанным",
      portal: "Единый портал",
      marketplace: "Маркетплейс",
      investorClub: "Инвестклуб",
      workingCapital: "Оборотный капитал",
      logout: "Выйти",
      cabinetSection: "Раздел кабинета",
    },
    en: {
      verified: "Verified profile",
      overview: "Overview",
      portfolio: "My deals",
      matching: "Deal matching",
      timeline: "Capital movement",
      voting: "Voting",
      calendar: "Calendar",
      settings: "Settings",
      shariaNote:
        "Every deal has its own asset, contract and Islamic-structure review.",
      learn: "Explore Islamic instruments →",
      center: "Event center",
      notifications: "Notifications",
      readAll: "Mark all as read",
      portal: "Unified portal",
      marketplace: "Marketplace",
      investorClub: "Investor club",
      workingCapital: "Working capital",
      logout: "Sign out",
      cabinetSection: "Dashboard section",
    },
  };
  const t = (ru, en) => (state.lang === "ru" ? ru : en);
  const money = (value) =>
    state.currency === "KGS"
      ? new Intl.NumberFormat(state.lang === "ru" ? "ru-RU" : "en-US", {
          maximumFractionDigits: 0,
        }).format(value) + " KGS"
      : "$" +
        new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
          value / rate,
        );
  function save() {
    try {
      localStorage.setItem(store, JSON.stringify(state));
    } catch {
      toast(t("Настройки сохранены только до обновления страницы", "Settings are available until refresh"));
    }
  }
  function title(kicker, ru, en, copyRu, copyEn) {
    return `<div class="page-title"><div><span class="eyebrow">${kicker}</span><h1>${t(ru, en)}</h1><p>${t(copyRu, copyEn)}</p></div><span class="rate-note">${t("Справочный курс администратора", "Admin reference rate")}: 1 USD = ${rate} KGS</span></div>`;
  }
  function dealRows() {
    return deals
      .map(
        (d) =>
          `<div class="deal-mini"><div><b>${t(d.name, d.en)}</b><p>${t(d.structure, d.structureEn)} · ${t(d.status, d.statusEn)}</p><div class="progress"><i style="width:${d.progress}%"></i></div></div><strong>${money(d.amount)}<small>+ ${money(d.result)}</small></strong></div>`,
      )
      .join("");
  }
  function overview() {
    const total = deals.reduce((a, d) => a + d.amount, 0),
      result = deals.reduce((a, d) => a + d.result, 0);
    return (
      title(
        "Investor OS",
        "Портфель в движении",
        "Your portfolio in motion",
        "Не просто баланс: виден актив, договор, этап и следующее решение.",
        "More than a balance: see each asset, contract, milestone and next decision.",
      ) +
      `<section class="metric-grid"><article class="metric-card"><span>${t("Капитал в сделках", "Capital in deals")}</span><strong>${money(total)}</strong><small>3 ${t("структуры", "structures")}</small></article><article class="metric-card"><span>${t("Результат модели", "Modelled result")}</span><strong>+${money(result)}</strong><small>${t("не гарантия", "not guaranteed")}</small></article><article class="metric-card"><span>${t("Ближайшее событие", "Next event")}</span><strong>12 Sep</strong><small>${t("отчёт по партии", "batch report")}</small></article><article class="metric-card"><span>${t("Документы", "Documents")}</span><strong>14 / 16</strong><small>${t("2 ожидаются", "2 pending")}</small></article><article class="metric-card"><span>${t("Заявленный интерес", "Declared interest")}</span><strong>${money(interest ? interest.totals(declared).amount : 0)}</strong><small>${declared.length ? t("готов внести по первому требованию", "ready on first call") : t("анкета ещё не заполнена", "questionnaire not filled yet")}</small></article></section><div class="grid-2"><section class="card"><h2>${t("Активные сделки", "Active deals")}</h2>${dealRows()}</section><section class="card"><h2>${t("Ближайшие события", "Upcoming events")}</h2><div class="event"><time>12 Sep</time><div><b>${t("Отчёт о продаже", "Sales report")}</b><p>${t("Партия арматуры", "Rebar batch")}</p></div></div><div class="event"><time>18 Sep</time><div><b>${t("Голосование закрывается", "Vote closes")}</b><p>${t("Дом · Ала-Арча", "House · Ala-Archa")}</p></div></div><div class="event"><time>30 Sep</time><div><b>${t("Арендное распределение", "Rental distribution")}</b><p>${t("Помещение · 12 мкр", "Commercial unit · District 12")}</p></div></div></section></div>`
    );
  }
  function portfolio() {
    return (
      title(
        "01 / Portfolio",
        "Мои сделки",
        "My deals",
        "Каждая строка — отдельный актив и отдельная исламская договорная конструкция.",
        "Each row is a separate asset and Islamic contractual structure.",
      ) +
      `<table class="deal-table"><thead><tr><th>${t("Сделка", "Deal")}</th><th>${t("Структура", "Structure")}</th><th>${t("Участие", "Participation")}</th><th>${t("Срок", "Term")}</th><th>${t("Статус", "Status")}</th><th>${t("Модельный результат", "Modelled result")}</th></tr></thead><tbody>${deals.map((d) => `<tr><td><b>${t(d.name, d.en)}</b></td><td>${t(d.structure, d.structureEn)}</td><td>${money(d.amount)}</td><td>${t(d.term, d.termEn)}</td><td><span class="tag">${t(d.status, d.statusEn)}</span></td><td>+${money(d.result)}</td></tr>`).join("")}</tbody></table><p class="rate-note">${t("Показатели иллюстративные и не подтверждают фактическую доходность.", "Figures are illustrative and do not evidence actual returns.")}</p>`
    );
  }
  const som = (value) =>
    new Intl.NumberFormat(state.lang === "ru" ? "ru-RU" : "en-US", {
      maximumFractionDigits: 0,
    }).format(Math.round(value)) + (state.lang === "ru" ? " сом" : " KGS");
  const horizonOf = (p) => p.hold || p.months;
  const interestCap = (p) => Math.max(p.min, Math.min(p.max, p.capital - p.raised));
  const mineFor = (id) => declared.filter((item) => item.projectId === id);
  function scoreProject(p) {
    const h = horizonOf(p),
      reasons = [];
    let score = 0;
    if (answers.goal === "earn" && p.goal === "Заработать") { score += 3; reasons.push(["цель — заработать на сделке", "goal: earn from a deal"]); }
    if (answers.goal === "preserve" && p.goal === "Сохранить") { score += 3; reasons.push(["цель — сохранить в реальном активе", "goal: preserve in a real asset"]); }
    if (answers.goal === "flow" && p.recurring) { score += 3; reasons.push(["актив даёт регулярный поток", "the asset produces recurring flow"]); }
    if (answers.term === "short" && h <= 6) { score += 3; reasons.push(["цикл до 6 месяцев", "cycle under 6 months"]); }
    if (answers.term === "medium" && h > 6 && h <= 24) { score += 3; reasons.push(["горизонт 7–24 месяца", "7–24 month horizon"]); }
    if (answers.term === "long" && h > 24) { score += 3; reasons.push(["длинный горизонт", "long horizon"]); }
    if (answers.pay === "regular" && p.recurring) { score += 2; reasons.push(["выплаты в ходе владения", "payouts during the holding period"]); }
    if (answers.pay === "exit" && !p.recurring) { score += 2; reasons.push(["результат после выхода", "result at exit"]); }
    if (answers.risk === "careful" && (p.recurring || p.goal === "Сохранить")) { score += 2; reasons.push(["осторожный профиль", "conservative profile"]); }
    if (answers.risk === "growth" && p.goal === "Рост капитала") { score += 2; reasons.push(["ставка на рост капитала", "capital growth focus"]); }
    if (answers.risk === "balanced") score += 1;
    if (answers.amount >= p.min && answers.amount <= p.max) { score += 2; reasons.push(["ваша сумма попадает в диапазон участия", "your amount fits the participation range"]); }
    return { project: p, score, reasons };
  }
  function rankProjects() {
    ranked = catalog.map(scoreProject).sort((a, b) => b.score - a.score);
  }
  function matchCard(item) {
    const p = item.project,
      e = economics ? economics(p, p.min) : null,
      mine = mineFor(p.id);
    return `<article class="match-card${picked === p.id ? " picked" : ""}"><div class="match-head"><b>${p.title}</b><span class="tag">${p.sharia}</span></div><p class="match-meta">${p.location} · ${horizonOf(p)} ${t("мес.", "mo.")} · ${t(p.stage, p.stage)}</p>${e ? `<div class="match-metrics"><div><strong>${e.rate.toLocaleString(state.lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 1 })}%</strong><small>${t("инвестору по модели за цикл", "to investor per cycle, modelled")}</small></div><div><strong>${som(p.min)}</strong><small>${t("ориентир входа", "entry guide")}</small></div></div>` : ""}<p class="match-why">${t("Почему подходит", "Why it fits")}: ${item.reasons.length ? item.reasons.map((r) => t(r[0], r[1])).join(", ") : t("частичное совпадение по анкете", "partial match on your answers")}.</p>${mine.length ? `<p class="match-declared">${t("Вы заявили", "You declared")}: ${money(mine.reduce((a, b) => a + b.amount, 0))} · ${interest.windowLabel(mine[0].window, state.lang)}</p>` : ""}<button class="secondary" data-pick="${p.id}">${picked === p.id ? t("Проект выбран ✓", "Project selected ✓") : t("Выбрать этот проект", "Select this project")}</button></article>`;
  }
  function matchList() {
    if (!catalog.length)
      return `<section class="card"><p class="rate-note">${t("Каталог проектов недоступен: не загружен модуль каталога.", "The project catalogue is unavailable: its module did not load.")}</p></section>`;
    if (!ranked)
      return `<section class="card"><h2>${t("Каталог проектов", "Project catalogue")}</h2><p class="rate-note">${t("Ответьте на пять вопросов, чтобы увидеть подходящие проекты, либо выберите проект из полного каталога ниже.", "Answer the five questions to see matching projects, or pick one from the full catalogue below.")}</p><div class="match-grid">${catalog.map((p) => matchCard({ project: p, score: 0, reasons: [] })).join("")}</div></section>`;
    const best = ranked[0].score;
    return `<section class="card"><h2>${t("Подходящие проекты", "Matching projects")}</h2><p class="rate-note">${t("Порядок объясним: он строится из ваших ответов, а не из автоматического инвестиционного решения. Выберите проект, чтобы заявить интерес.", "The ranking is explainable: it follows your answers rather than an automated investment decision. Select a project to declare interest.")}</p><div class="match-grid">${ranked.map((item) => matchCard(item)).join("")}</div><p class="rate-note">${t("Лучшее совпадение", "Best match")}: ${ranked[0].project.title} (${best} ${t("баллов", "points")}).</p></section>`;
  }
  function interestForm() {
    if (!picked || !interest) return "";
    const p = catalog.find((x) => x.id === picked) || catalog[0];
    const cap = interestCap(p);
    const start = Math.min(Math.max(p.min, answers.amount), cap);
    return `<section class="card interest-card"><span class="eyebrow">${t("Анкета заинтересованности", "Interest questionnaire")}</span><h2>${t("Сколько вы готовы внести по первому требованию", "How much are you ready to commit on first call")}</h2><p class="interest-lead">${t("Укажите примерную сумму и срок, в который вы внесёте её после открытия сделки, если проект вам подойдёт. Платформа сейчас не принимает деньги — анкета нужна, чтобы управляющий видел реальный объём интереса.", "State the approximate amount and the window in which you would transfer it once the deal opens, if the project suits you. No money is collected now: the questionnaire simply shows the manager the real volume of interest.")}</p><form id="interest-form" class="match-form" novalidate><label>${t("Проект", "Project")} *<select id="interest-project">${catalog.map((x) => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${x.title}</option>`).join("")}</select></label><label>${t("Примерная сумма, сом", "Approximate amount, KGS")} *<input id="interest-amount" type="number" inputmode="numeric" step="1000" min="${p.min}" max="${cap}" value="${start}"></label><label>${t("Готов внести по первому требованию", "Ready to transfer on first call")} *<select id="interest-window"><option value="">${t("Выберите срок", "Choose a window")}</option>${interest.WINDOWS.map((w) => `<option value="${w.id}">${t(w.label, w.labelEn)}</option>`).join("")}</select></label><label>${t("Имя и фамилия", "Full name")} *<input id="interest-name" maxlength="100" autocomplete="name" value="${esc(declared[0] ? declared[0].name : "Асан Ширгебаев")}"></label><label>${t("Контакт для связи", "Contact")} *<input id="interest-contact" maxlength="160" placeholder="e-mail / +996 / @username" value="${esc(declared[0] ? declared[0].contact : "")}"></label><label class="wide">${t("Комментарий", "Comment")}<textarea id="interest-note" rows="2" maxlength="600" placeholder="${t("Что важно уточнить до решения", "What you want clarified before deciding")}"></textarea></label><label class="chk wide"><input type="checkbox" id="interest-ondemand"><span>${t(interest.CONSENTS[0], "I am ready to transfer the stated amount at the manager’s first call within the stated window, if the project opens and suits me after I review the documents.")}</span></label><label class="chk wide"><input type="checkbox" id="interest-notcontract"><span>${t(interest.CONSENTS[1], "I understand that this questionnaire is not a payment, a contract or a binding commitment: obligations arise only after the deal agreement is signed.")}</span></label><p class="form-error" id="interest-error" role="alert" hidden></p><button class="primary wide" type="submit">${t("Заявить интерес", "Declare interest")}</button></form><p class="rate-note">${t("Диапазон по проекту", "Project range")}: ${som(p.min)} — ${som(cap)}. ${t("Анкета хранится в этом браузере и готовит письмо управляющему.", "The questionnaire is stored in this browser and prepares a letter to the manager.")}</p></section>`;
  }
  function declaredBlock() {
    if (!interest) return "";
    const letterCard = letterText
      ? `<section class="card interest-letter"><h2>${t("Письмо управляющему готово", "The letter to the manager is ready")}</h2><p class="rate-note">${t("Отправьте его, чтобы ваш интерес попал в реестр управляющего.", "Send it so your interest reaches the manager’s register.")}</p><textarea id="interest-letter" rows="9" readonly>${esc(letterText)}</textarea><div class="vote-actions"><a class="secondary" id="interest-mail" href="${interest.mailto(letterText)}">${t("Открыть в почте", "Open in mail")}</a><button class="secondary" id="interest-copy">${t("Скопировать текст", "Copy text")}</button><button class="secondary" id="interest-dismiss">${t("Скрыть", "Hide")}</button></div></section>`
      : "";
    if (!declared.length) return letterCard;
    const sum = interest.totals(declared);
    return (
      letterCard +
      `<section class="card"><h2>${t("Мой заявленный интерес", "My declared interest")}</h2><div class="metric-grid"><article class="metric-card"><span>${t("Готов внести по первому требованию", "Ready on first call")}</span><strong>${money(sum.amount)}</strong><small>${t("сумма всех анкет", "across all questionnaires")}</small></article><article class="metric-card"><span>${t("Выбрано проектов", "Projects selected")}</span><strong>${sum.projects}</strong><small>${sum.count} ${t("анкет", "questionnaires")}</small></article><article class="metric-card"><span>${t("Ближайшая готовность", "Soonest window")}</span><strong>${Math.min(...declared.map((item) => interest.windowOf(item.window).days))} ${t("дн.", "days")}</strong><small>${t("после открытия сделки", "after the deal opens")}</small></article></div><table class="deal-table"><thead><tr><th>${t("Проект", "Project")}</th><th>${t("Сумма", "Amount")}</th><th>${t("Срок готовности", "Readiness window")}</th><th>${t("Анкета от", "Filed on")}</th><th></th></tr></thead><tbody>${declared.map((item) => `<tr><td><b>${esc(item.projectTitle)}</b></td><td>${money(item.amount)}</td><td><span class="tag">${interest.windowLabel(item.window, state.lang)}</span></td><td>${new Date(item.createdAt).toLocaleDateString(state.lang === "ru" ? "ru-RU" : "en-US")}</td><td><button class="text-link" data-drop-interest="${item.id}">${t("Убрать", "Remove")}</button></td></tr>`).join("")}</tbody></table><p class="rate-note">${t("Анкета не является офертой, договором или переводом средств: обязательства возникают только после подписания договора конкретной сделки.", "The questionnaire is not an offer, a contract or a payment: obligations arise only after the deal agreement is signed.")}</p></section>`
    );
  }
  function matching() {
    const selects = [
      ["match-goal", answers.goal],
      ["match-term", answers.term],
      ["match-risk", answers.risk],
      ["match-pay", answers.pay],
    ];
    const chosen = (id, value) => (selects.find((x) => x[0] === id)[1] === value ? "selected" : "");
    return (
      title(
        "02 / Matching",
        "Выберите проект и заявите интерес",
        "Pick a project and declare your interest",
        "Пять ответов сужают каталог до подходящих проектов. Дальше вы выбираете конкретный проект и указываете сумму, которую готовы внести по первому требованию — в течение 3 дней, недели или двух недель после открытия сделки.",
        "Five answers narrow the catalogue. Then you pick one project and state the amount you are ready to commit on first call — within 3 days, a week or two weeks after the deal opens.",
      ) +
      `<section class="card"><form id="match-form" class="match-form"><label>${t("Цель", "Goal")}<select id="match-goal"><option value="earn" ${chosen("match-goal", "earn")}>${t("Заработать на сделке", "Earn from a deal")}</option><option value="preserve" ${chosen("match-goal", "preserve")}>${t("Сохранить в реальном активе", "Preserve in a real asset")}</option><option value="flow" ${chosen("match-goal", "flow")}>${t("Получать поток", "Receive cash flow")}</option></select></label><label>${t("Горизонт", "Horizon")}<select id="match-term"><option value="short" ${chosen("match-term", "short")}>${t("До 6 месяцев", "Up to 6 months")}</option><option value="medium" ${chosen("match-term", "medium")}>7–24 ${t("месяца", "months")}</option><option value="long" ${chosen("match-term", "long")}>${t("Более 24 месяцев", "Over 24 months")}</option></select></label><label>${t("Сумма", "Amount")}<input id="match-amount" type="number" min="100000" step="50000" value="${answers.amount}"></label><label>${t("Отношение к риску", "Risk tolerance")}<select id="match-risk"><option value="balanced" ${chosen("match-risk", "balanced")}>${t("Сбалансированное", "Balanced")}</option><option value="careful" ${chosen("match-risk", "careful")}>${t("Осторожное", "Conservative")}</option><option value="growth" ${chosen("match-risk", "growth")}>${t("Готов к колебаниям", "Growth")}</option></select></label><label>${t("Выплаты", "Payout preference")}<select id="match-pay"><option value="exit" ${chosen("match-pay", "exit")}>${t("После выхода", "At exit")}</option><option value="regular" ${chosen("match-pay", "regular")}>${t("Регулярно", "Recurring")}</option></select></label><button class="primary wide" type="submit">${t("Показать подходящие проекты", "Show matching projects")}</button></form><div id="match-result"></div></section>` +
      matchList() +
      interestForm() +
      declaredBlock()
    );
  }
  function dataroom() {
    const docs = [
      [
        "Заключение по исламской структуре",
        "Islamic structure opinion",
        "PDF · проверено",
        "PDF · verified",
        "faq.html",
      ],
      [
        "Паспорт сделки и экономика",
        "Deal passport and economics",
        "PDF · версия 2",
        "PDF · version 2",
        "user-agreement.html",
      ],
      [
        "Право на актив / кадастр",
        "Asset title / cadastre",
        "PDF · проверено",
        "PDF · verified",
        "disclosure.html",
      ],
      [
        "Договор поставки и счета",
        "Supply contract and invoices",
        "ZIP · 8 файлов",
        "ZIP · 8 files",
        "disclosure.html",
      ],
      [
        "Фото и отчёт этапа",
        "Milestone photos and report",
        "PDF · 04.09.2026",
        "PDF · Sep 4, 2026",
        "track-record.html",
      ],
    ];
    return (
      title(
        "03 / Data Room",
        "Документы до решения",
        "Documents before decisions",
        "Выберите сделку и проверьте источник права, экономику, договоры и шариатское заключение.",
        "Choose a deal and review title, economics, contracts and its Sharia opinion.",
      ) +
      `<div class="section-tabs">${deals.map((d, i) => `<button class="${i ? "" : "active"}" data-room="${d.id}">${t(d.name, d.en)}</button>`).join("")}</div><section class="card" id="room-card"><h2>${t("Партия арматуры · пакет документов", "Rebar batch · document set")}</h2>${docs.map((d, i) => `<div class="doc-row"><b>${t(d[0], d[1])}</b><small>${t(d[2], d[3])}</small><span class="tag">${i === 3 ? t("На проверке", "Reviewing") : t("Доступен", "Available")}</span><a href="${d[4]}">${t("Открыть", "Open")} ↗</a></div>`).join("")}</section>`
    );
  }
  function timeline() {
    const phases = [
      [
        "03 июн",
        "Jun 03",
        "Капитал принят на отдельный счёт",
        "Capital received in segregated account",
        "+ " + money(1500000),
      ],
      [
        "05 июн",
        "Jun 05",
        "Оплата поставщику по договору",
        "Supplier paid under contract",
        "− " + money(1280000),
      ],
      [
        "12 июн",
        "Jun 12",
        "Товар принят на склад",
        "Goods received at warehouse",
        "0",
      ],
      [
        "28 авг",
        "Aug 28",
        "Получена первая оплата покупателя",
        "First buyer payment received",
        "+ " + money(640000),
      ],
      [
        "30 сен",
        "Sep 30",
        "Закрытие партии и распределение",
        "Batch close and distribution",
        "+ " + money(986000),
      ],
    ];
    return (
      title(
        "04 / Live timeline",
        "Где сейчас капитал",
        "Where the capital is now",
        "Хронология связывает каждое движение с реальным активом и подтверждающим документом.",
        "The timeline links every movement to a real asset and supporting document.",
      ) +
      `<div class="grid-2"><section class="card"><h2>${t("Партия арматуры · цикл 4 месяца", "Rebar batch · four-month cycle")}</h2><div class="timeline">${phases.map((p, i) => `<div class="timeline-item ${i === 4 ? "future" : ""}"><b>${t(p[0], p[1])} · ${t(p[2], p[3])}</b><p>${i === 4 ? t("Плановый этап", "Planned milestone") : t("Подтверждено документом", "Document verified")}</p></div>`).join("")}</div></section><section class="card"><h2>${t("Реестр движения", "Movement ledger")}</h2>${phases
        .slice(0, 4)
        .map(
          (p) =>
            `<div class="money-move"><div><b>${t(p[2], p[3])}</b><br><small>${t(p[0], p[1])}</small></div><b>${p[4]}</b></div>`,
        )
        .join("")}</section></div>`
    );
  }
  function voting() {
    const vote = state.votes.contractor || "";
    return (
      title(
        "05 / Governance",
        "Голосования и решения",
        "Votes and decisions",
        "Ваш голос сохраняется в журнале прототипа; реальный запуск потребует неизменяемого серверного журнала.",
        "Your vote is stored in this prototype log; production requires an immutable server-side audit trail.",
      ) +
      `<section class="card vote-card"><span class="tag">${t("Открыто до 18 сентября", "Open until September 18")}</span><h2>${t("Смена подрядчика кровельных работ", "Change roofing contractor")}</h2><p>${t("Причина: задержка 21 день. Новый подрядчик сохраняет бюджет, сокращает прогнозную задержку до 7 дней.", "Reason: 21-day delay. The proposed contractor keeps the budget and reduces forecast delay to 7 days.")}</p><div class="vote-actions"><button data-vote="yes" class="${vote === "yes" ? "selected" : ""}">${t("За", "Approve")} · 61%</button><button data-vote="no" class="${vote === "no" ? "selected" : ""}">${t("Против", "Reject")} · 14%</button><button data-vote="abstain" class="${vote === "abstain" ? "selected" : ""}">${t("Воздержаться", "Abstain")} · 9%</button></div></section><section class="card"><h2>${t("Журнал решений", "Decision log")}</h2><div class="decision-log">04.09.2026 · ${t("Голосование открыто управляющим", "Vote opened by manager")}</div><div class="decision-log" id="personal-vote">${vote ? t("Ваш выбор зафиксирован: " + vote, "Your choice is recorded: " + vote) : t("Ваш голос ещё не подан", "You have not voted yet")}</div></section>`
    );
  }
  function calendar() {
    return (
      title(
        "06 / Calendar",
        "Календарь участника",
        "Investor calendar",
        "Отчёты, голосования, плановые выплаты и контрольные точки по всем вашим сделкам.",
        "Reports, votes, planned distributions and milestones across your deals.",
      ) +
      `<section class="card"><div class="event"><time>12 Sep</time><div><b>${t("Отчёт о продаже партии", "Batch sales report")}</b><p>${t("Документ появится в Data Room", "Document will appear in Data Room")}</p></div></div><div class="event"><time>18 Sep</time><div><b>${t("Закрытие голосования", "Voting closes")}</b><p>${t("Дом · Ала-Арча", "House · Ala-Archa")}</p></div></div><div class="event"><time>30 Sep</time><div><b>${t("Плановое распределение аренды", "Planned rental distribution")}</b><p>${money(9600)} · ${t("до подтверждения расходов", "before expense confirmation")}</p></div></div><div class="event"><time>04 Oct</time><div><b>${t("Фотоотчёт стройки", "Construction photo report")}</b><p>${t("Этап: кровля", "Milestone: roofing")}</p></div></div></section>`
    );
  }
  function settings() {
    return (
      title(
        "07 / Preferences",
        "Настройки уведомлений",
        "Notification preferences",
        "Выберите события, о которых нужно сообщать. Настройки сохраняются в этом браузере.",
        "Choose which events should notify you. Settings are stored in this browser.",
      ) +
      `<section class="card"><h2>${t("Каналы событий", "Event categories")}</h2>${[
        ["project", "Новый проект", "New project"],
        ["milestone", "Этап сделки", "Deal milestone"],
        ["document", "Новый документ", "New document"],
        ["distribution", "Распределение", "Distribution"],
      ]
        .map(
          (x) =>
            `<label class="preference"><span><b>${t(x[1], x[2])}</b></span><input class="switch" type="checkbox" data-pref="${x[0]}" ${state.preferences[x[0]] ? "checked" : ""}></label>`,
        )
        .join("")}</section>`
    );
  }
  const renderers = {
    overview,
    portfolio,
    matching,
    dataroom,
    timeline,
    voting,
    calendar,
    settings,
  };
  function render() {
    document.documentElement.lang = state.lang;
    document
      .querySelectorAll("[data-i18n]")
      .forEach(
        (el) => (el.textContent = dictionary[state.lang][el.dataset.i18n]),
      );
    $("language-toggle").textContent = state.lang === "ru" ? "EN" : "RU";
    $("currency-toggle").textContent = state.currency === "KGS" ? "USD" : "KGS";
    $("view").innerHTML = renderers[state.view]();
    const mobileLabels = dictionary[state.lang];
    const optionKeys = {overview:'overview', portfolio:'portfolio', matching:'matching', dataroom:null, timeline:'timeline', voting:'voting', calendar:'calendar', settings:'settings'};
    Array.from($("mobile-view").options).forEach((option) => {
      if (optionKeys[option.value]) option.textContent = mobileLabels[optionKeys[option.value]];
    });
    document
      .querySelectorAll(".side-link")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.view === state.view),
      );
    $("mobile-view").value = state.view;
    bindView();
    renderNotices();
    save();
  }
  function bindView() {
    const form = $("match-form");
    if (form)
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        answers.goal = $("match-goal").value;
        answers.term = $("match-term").value;
        answers.risk = $("match-risk").value;
        answers.pay = $("match-pay").value;
        const amount = Number($("match-amount").value);
        answers.amount = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : answers.amount;
        rankProjects();
        if (picked && !ranked.some((item) => item.project.id === picked)) picked = null;
        render();
        toast(t("Каталог отсортирован по вашим ответам", "Catalogue ranked by your answers"));
      });
    const project = $("interest-project");
    if (project)
      project.addEventListener("change", () => {
        picked = project.value;
        render();
      });
    const declare = $("interest-form");
    if (declare)
      declare.addEventListener("submit", (e) => {
        e.preventDefault();
        submitInterest();
      });
  }
  function submitInterest() {
    const p = catalog.find((x) => x.id === $("interest-project").value) || catalog[0];
    const cap = interestCap(p);
    const input = {
      projectId: p.id,
      projectTitle: p.title,
      amount: Number($("interest-amount").value),
      window: $("interest-window").value,
      name: $("interest-name").value,
      contact: $("interest-contact").value,
      note: $("interest-note").value,
      source: "cabinet",
      onDemand: $("interest-ondemand").checked,
      notContract: $("interest-notcontract").checked,
    };
    let error = interest.validate(input);
    if (!error && (input.amount < p.min || input.amount > cap))
      error = t(
        `Укажите сумму от ${som(p.min)} до ${som(cap)}.`,
        `Enter an amount between ${som(p.min)} and ${som(cap)}.`,
      );
    const box = $("interest-error");
    box.hidden = !error;
    box.textContent = error;
    if (error) return;
    const saved = interest.add(input);
    if (!saved.ok) {
      box.hidden = false;
      box.textContent = saved.error;
      return;
    }
    declared = interest.list();
    letterText = interest.letter(saved.record);
    answers.amount = saved.record.amount;
    picked = null;
    render();
    toast(
      saved.stored
        ? t(
            `Интерес зафиксирован: ${money(saved.record.amount)} · ${interest.windowLabel(saved.record.window, state.lang).toLowerCase()}`,
            `Interest recorded: ${money(saved.record.amount)} · ${interest.windowLabel(saved.record.window, state.lang).toLowerCase()}`,
          )
        : t(
            "Интерес показан, но браузер его не сохранил — отправьте письмо сейчас",
            "Interest is shown but the browser did not store it — send the letter now",
          ),
    );
  }
  function renderNotices() {
    const unread = state.notifications.filter((n) => !n.read).length;
    $("notification-count").textContent = unread;
    $("notification-count").hidden = !unread;
    $("notification-list").innerHTML = state.notifications
      .map(
        (n) =>
          `<article class="notice-row ${n.read ? "" : "unread"}"><small>${state.lang === "ru" ? n.date : n.dateEn}</small><b>${state.lang === "ru" ? n.title : n.en}</b><p>${state.lang === "ru" ? n.body : n.bodyEn}</p>${n.read ? "" : `<button data-read="${n.id}">${t("Прочитано", "Mark read")}</button>`}</article>`,
      )
      .join("");
  }
  function copyLetter() {
    const box = $("interest-letter");
    if (!box) return;
    const clip = navigator.clipboard;
    if (!clip || !clip.writeText) {
      box.focus();
      box.select();
      toast(t("Текст выделен — скопируйте вручную", "Text selected — copy it manually"));
      return;
    }
    clip.writeText(box.value).then(
      () => toast(t("Текст скопирован", "Text copied")),
      () => toast(t("Скопируйте текст вручную", "Copy the text manually")),
    );
  }
  function toast(text) {
    $("toast").textContent = text;
    $("toast").hidden = false;
    setTimeout(() => ($("toast").hidden = true), 2200);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.view) {
      state.view = b.dataset.view;
      render();
    }
    if (b.dataset.pick) {
      picked = picked === b.dataset.pick ? null : b.dataset.pick;
      letterText = "";
      render();
      if (picked) {
        const card = $("interest-form");
        if (card) card.scrollIntoView({ block: "start" });
      }
    }
    if (b.dataset.dropInterest) {
      declared = interest.remove(b.dataset.dropInterest);
      render();
      toast(t("Анкета убрана из списка", "Questionnaire removed"));
    }
    if (b.id === "interest-dismiss") {
      letterText = "";
      render();
    }
    if (b.id === "interest-copy") copyLetter();
    if (b.dataset.room) {
      document
        .querySelectorAll("[data-room]")
        .forEach((x) => x.classList.toggle("active", x === b));
      const deal = deals.find((d) => d.id === b.dataset.room);
      $("room-card").querySelector("h2").textContent =
        t(deal.name, deal.en) + " · " + t("пакет документов", "document set");
    }
    if (b.dataset.vote) {
      state.votes.contractor = b.dataset.vote;
      save();
      render();
      toast(t("Голос сохранён", "Vote saved"));
    }
    if (b.dataset.read) {
      state.notifications.find((n) => n.id === Number(b.dataset.read)).read =
        true;
      renderNotices();
      save();
    }
    if (b.id === "language-toggle") {
      state.lang = state.lang === "ru" ? "en" : "ru";
      render();
    }
    if (b.id === "currency-toggle") {
      state.currency = state.currency === "KGS" ? "USD" : "KGS";
      render();
    }
    if (b.id === "notification-button") {
      $("notification-panel").hidden = false;
      b.setAttribute("aria-expanded", "true");
    }
    if (b.id === "close-notifications") {
      $("notification-panel").hidden = true;
      $("notification-button").setAttribute("aria-expanded", "false");
    }
    if (b.id === "read-all") {
      state.notifications.forEach((n) => (n.read = true));
      renderNotices();
      save();
    }
    if (b.id === "logout") {
      sessionStorage.removeItem("meken-investor-auth");
      location.href = "login.html";
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "mobile-view") {
      state.view = e.target.value;
      render();
    }
    if (e.target.dataset.pref) {
      state.preferences[e.target.dataset.pref] = e.target.checked;
      save();
      toast(t("Настройки сохранены", "Preferences saved"));
    }
  });
  render();
})();
