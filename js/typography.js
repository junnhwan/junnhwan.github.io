function initLucideIcons() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons({
      attrs: {
        'stroke-width': 1.6,
      },
    });
  }
}

$(document).ready(function () {
  initLucideIcons();
});
