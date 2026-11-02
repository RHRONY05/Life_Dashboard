// Mockup helper (NOT app code): ?theme=dark|light forces a theme; renders Lucide icons.
(function () {
  var t = new URLSearchParams(location.search).get("theme");
  if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  window.addEventListener("DOMContentLoaded", function () {
    if (window.lucide) window.lucide.createIcons();
  });
})();
