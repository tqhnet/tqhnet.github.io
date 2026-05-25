(function () {
  const saved = localStorage.getItem("nce-theme");
  const dark =
    saved === "dark" ||
    (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");

})();
