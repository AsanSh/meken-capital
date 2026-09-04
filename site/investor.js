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
      `<section class="metric-grid"><article class="metric-card"><span>${t("Капитал в сделках", "Capital in deals")}</span><strong>${money(total)}</strong><small>3 ${t("структуры", "structures")}</small></article><article class="metric-card"><span>${t("Результат модели", "Modelled result")}</span><strong>+${money(result)}</strong><small>${t("не гарантия", "not guaranteed")}</small></article><article class="metric-card"><span>${t("Ближайшее событие", "Next event")}</span><strong>12 Sep</strong><small>${t("отчёт по партии", "batch report")}</small></article><article class="metric-card"><span>${t("Документы", "Documents")}</span><strong>14 / 16</strong><small>${t("2 ожидаются", "2 pending")}</small></article></section><div class="grid-2"><section class="card"><h2>${t("Активные сделки", "Active deals")}</h2>${dealRows()}</section><section class="card"><h2>${t("Ближайшие события", "Upcoming events")}</h2><div class="event"><time>12 Sep</time><div><b>${t("Отчёт о продаже", "Sales report")}</b><p>${t("Партия арматуры", "Rebar batch")}</p></div></div><div class="event"><time>18 Sep</time><div><b>${t("Голосование закрывается", "Vote closes")}</b><p>${t("Дом · Ала-Арча", "House · Ala-Archa")}</p></div></div><div class="event"><time>30 Sep</time><div><b>${t("Арендное распределение", "Rental distribution")}</b><p>${t("Помещение · 12 мкр", "Commercial unit · District 12")}</p></div></div></section></div>`
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
  function matching() {
    return (
      title(
        "02 / Matching",
        "Подберите формат участия",
        "Find your participation format",
        "Пять ответов формируют объяснимую рекомендацию, а не автоматическое инвестиционное решение.",
        "Five answers produce an explainable match, not an automated investment decision.",
      ) +
      `<section class="card"><form id="match-form" class="match-form"><label>${t("Цель", "Goal")}<select id="match-goal"><option value="earn">${t("Заработать на сделке", "Earn from a deal")}</option><option value="preserve">${t("Сохранить в реальном активе", "Preserve in a real asset")}</option><option value="flow">${t("Получать поток", "Receive cash flow")}</option></select></label><label>${t("Горизонт", "Horizon")}<select id="match-term"><option value="short">${t("До 6 месяцев", "Up to 6 months")}</option><option value="medium">7–24 ${t("месяца", "months")}</option><option value="long">${t("Более 24 месяцев", "Over 24 months")}</option></select></label><label>${t("Сумма", "Amount")}<input id="match-amount" type="number" min="100000" step="50000" value="1000000"></label><label>${t("Отношение к риску", "Risk tolerance")}<select id="match-risk"><option value="balanced">${t("Сбалансированное", "Balanced")}</option><option value="careful">${t("Осторожное", "Conservative")}</option><option value="growth">${t("Готов к колебаниям", "Growth")}</option></select></label><label>${t("Выплаты", "Payout preference")}<select id="match-pay"><option value="exit">${t("После выхода", "At exit")}</option><option value="regular">${t("Регулярно", "Recurring")}</option></select></label><button class="primary" type="submit">${t("Показать совпадение", "Show match")}</button></form><div id="match-result"></div></section>`
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
        const term = $("match-term").value,
          pay = $("match-pay").value,
          amount = Number($("match-amount").value);
        let deal =
          pay === "regular" || term === "long"
            ? deals[2]
            : term === "short"
              ? deals[0]
              : deals[1];
        $("match-result").innerHTML =
          `<article class="card match-result"><span class="tag">${t("Лучшее совпадение", "Best match")}</span><h2>${t(deal.name, deal.en)}</h2><p>${t("Почему: выбранный горизонт и формат выплат совпадают с циклом актива. Перед решением откройте Data Room и изучите риски.", "Why: your horizon and payout preference match this asset cycle. Review its Data Room and risks before deciding.")}</p><b>${t("Ваш ориентир", "Your range")}: ${money(amount)}</b></article>`;
      });
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
