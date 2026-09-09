const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require(
  process.env.MEKEN_JSDOM_PATH || "jsdom",
);
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../site");
function boot() {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "investor.html"), "utf8"),
    { url: "http://localhost/investor.html", runScripts: "outside-only" },
  );
  const w = dom.window;
  w.sessionStorage.setItem("meken-investor-auth", "ok");
  w.Element.prototype.scrollIntoView = function () {};
  w.eval(fs.readFileSync(path.join(root, "concepts/model.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "interest.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "investor.js"), "utf8"));
  const d = w.document;
  return {
    dom,
    w,
    d,
    click: (s) => {
      const el = d.querySelector(s);
      assert.ok(el, "missing " + s);
      el.click();
    },
    set: (s, v) => {
      const el = d.querySelector(s);
      assert.ok(el, "missing " + s);
      el.value = v;
      el.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
    submit: (s) =>
      d
        .querySelector(s)
        .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })),
  };
}
test("investor login rejects incorrect credentials and accepts the local test account", () => {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "login.html"), "utf8"),
    {
      url: "http://localhost/login.html",
      runScripts: "outside-only",
      virtualConsole: new VirtualConsole(),
    },
  );
  const w = dom.window,
    d = w.document;
  w.eval(fs.readFileSync(path.join(root, "investor-login.js"), "utf8"));
  d.querySelector("#investor-password").value = "wrong";
  d.querySelector("form").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.equal(d.querySelector("#login-error").hidden, false);
  d.querySelector("#investor-password").value = "MekenInvestor!";
  d.querySelector("form").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.equal(w.sessionStorage.getItem("meken-investor-auth"), "ok");
  dom.window.close();
});
test("cabinet exposes all eight investor capabilities", () => {
  const x = boot();
  assert.equal(x.d.querySelectorAll(".side-link").length, 8);
  for (const view of [
    "portfolio",
    "matching",
    "dataroom",
    "timeline",
    "voting",
    "calendar",
    "settings",
  ]) {
    x.click(`[data-view="${view}"]`);
    assert.ok(x.d.querySelector("#view").textContent.length > 40);
  }
  x.dom.window.close();
});
test("currency, language, matching, data room and vote are interactive", () => {
  const x = boot();
  x.click("#currency-toggle");
  assert.match(x.d.querySelector("#view").textContent, /\$/);
  x.click("#language-toggle");
  assert.match(x.d.querySelector("#view").textContent, /Your portfolio/);
  x.click('[data-view="matching"]');
  x.submit("#match-form");
  assert.match(x.d.querySelector("#view").textContent, /Best match/);
  x.click('[data-view="dataroom"]');
  x.click('[data-room="house"]');
  assert.match(x.d.querySelector("#room-card h2").textContent, /Ala-Archa/);
  x.click('[data-view="voting"]');
  x.click('[data-vote="yes"]');
  assert.match(x.d.querySelector("#personal-vote").textContent, /yes/);
  x.dom.window.close();
});
test("notification center tracks unread messages and preferences persist", () => {
  const x = boot();
  x.click("#notification-button");
  assert.equal(x.d.querySelector("#notification-panel").hidden, false);
  x.click('[data-read="1"]');
  assert.equal(x.d.querySelector("#notification-count").textContent, "3");
  x.click("#read-all");
  assert.equal(x.d.querySelector("#notification-count").hidden, true);
  x.click('[data-view="settings"]');
  const pref = x.d.querySelector('[data-pref="project"]');
  pref.click();
  assert.equal(pref.checked, false);
  x.dom.window.close();
});

function fillInterest(x, over) {
  const values = {
    window: "3d",
    name: "Асан Ширгебаев",
    contact: "asan@example.com",
    consents: true,
    ...over,
  };
  x.d.querySelector("#interest-window").value = values.window;
  x.d.querySelector("#interest-name").value = values.name;
  x.d.querySelector("#interest-contact").value = values.contact;
  if ("amount" in values) x.d.querySelector("#interest-amount").value = values.amount;
  x.d.querySelector("#interest-ondemand").checked = values.consents;
  x.d.querySelector("#interest-notcontract").checked = values.consents;
  x.submit("#interest-form");
}
test("matching ranks the real project catalogue and lets one project be picked", () => {
  const x = boot();
  x.click('[data-view="matching"]');
  assert.equal(x.d.querySelectorAll(".match-card").length, 6);
  x.set("#match-goal", "flow");
  x.set("#match-term", "long");
  x.submit("#match-form");
  assert.match(x.d.querySelector(".match-card b").textContent, /арендным потоком/);
  assert.equal(x.d.querySelector("#interest-form"), null);
  x.click('[data-pick="rent"]');
  assert.ok(x.d.querySelector("#interest-form"));
  assert.equal(x.d.querySelector("#interest-project").value, "rent");
  assert.equal(x.d.querySelectorAll(".match-card.picked").length, 1);
  x.dom.window.close();
});
test("the questionnaire refuses to record interest without an amount, a window and consents", () => {
  const x = boot();
  x.click('[data-view="matching"]');
  x.click('[data-pick="materials"]');
  fillInterest(x, { window: "", consents: false });
  assert.equal(x.d.querySelector("#interest-error").hidden, false);
  fillInterest(x, { consents: false });
  assert.match(x.d.querySelector("#interest-error").textContent, /Подтвердите/);
  fillInterest(x, { amount: 10 });
  assert.match(x.d.querySelector("#interest-error").textContent, /сумму/);
  x.dom.window.close();
});
test("a recorded declaration is totalled, listed, mailed and removable", () => {
  const x = boot();
  x.click('[data-view="matching"]');
  x.click('[data-pick="materials"]');
  fillInterest(x, { amount: 700000, window: "7d" });
  assert.equal(x.d.querySelector("#interest-error"), null);
  assert.match(x.d.querySelector("#interest-letter").value, /Арматура/);
  assert.match(x.d.querySelector("#interest-letter").value, /в течение недели/);
  assert.ok(x.d.querySelector("#interest-mail").href.startsWith("mailto:partner@meken.im"));
  assert.match(x.d.querySelector("#view").textContent, /Мой заявленный интерес/);
  assert.equal(x.d.querySelectorAll(".deal-table tbody tr").length, 1);
  x.click('[data-view="overview"]');
  assert.match(x.d.querySelector(".metric-grid").textContent, /Заявленный интерес/);
  assert.match(x.d.querySelector(".metric-grid").textContent, /700\s000/);
  x.click('[data-view="matching"]');
  x.click("[data-drop-interest]");
  assert.doesNotMatch(x.d.querySelector("#view").textContent, /Мой заявленный интерес/);
  x.dom.window.close();
});
