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
  x.d
    .querySelector("#match-form")
    .dispatchEvent(
      new x.w.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.match(x.d.querySelector("#match-result").textContent, /Best match/);
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
