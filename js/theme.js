import { THEME_KEY } from "./config.js";

export function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function updateThemeButton() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const dark = isDarkTheme();
  btn.textContent = dark ? "☀️" : "🌙";
  btn.title = dark ? "切换日间模式" : "切换夜间模式";
  btn.setAttribute("aria-label", btn.title);
}

export function setTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(THEME_KEY, "light");
  }
  updateThemeButton();
}

export function initTheme() {
  updateThemeButton();
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    setTheme(!isDarkTheme());
  });
}
