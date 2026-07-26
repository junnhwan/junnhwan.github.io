/**
 * Lightweight shell helpers only (no content hiding).
 * - scroll progress bar
 */
(function () {
  var reduce =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setProgress() {
    var el = document.getElementById('scroll-progress');
    if (!el) return;
    if (reduce) {
      el.style.display = 'none';
      return;
    }
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    el.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
  }

  document.addEventListener('DOMContentLoaded', function () {
    setProgress();
    window.addEventListener('scroll', setProgress, { passive: true });
    window.addEventListener('resize', setProgress, { passive: true });
  });
})();
