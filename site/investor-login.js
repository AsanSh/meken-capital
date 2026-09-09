(function () {
  "use strict";
  const form = document.getElementById("investor-login-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document
      .getElementById("investor-email")
      .value.trim()
      .toLowerCase();
    const password = document.getElementById("investor-password").value;
    const error = document.getElementById("login-error");
    if (email === "investor@meken.im" && password === "MekenInvestor!") {
      sessionStorage.setItem("meken-investor-auth", "ok");
      location.href = "investor.html";
      return;
    }
    error.hidden = false;
    error.textContent = "Проверьте email и пароль тестового доступа.";
  });
})();
