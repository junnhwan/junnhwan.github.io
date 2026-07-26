// Sticky post TOC: smooth jump + active section highlight
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var root = document.getElementById('post-toc');
    if (!root) return;

    var nav = root.querySelector('.post-toc-nav');
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a.toc-link[href^="#"]')) : [];
    if (!links.length) {
      // hide empty shell
      root.hidden = true;
      return;
    }

    var header = document.getElementById('site-header');
    function headerOffset() {
      return (header ? header.offsetHeight : 64) + 16;
    }

    function idFromHref(href) {
      try {
        return decodeURIComponent(href.replace(/^#/, ''));
      } catch (e) {
        return href.replace(/^#/, '');
      }
    }

    var entries = links
      .map(function (a) {
        var id = idFromHref(a.getAttribute('href') || '');
        var el = id ? document.getElementById(id) : null;
        return el ? { a: a, el: el, id: id } : null;
      })
      .filter(Boolean);

    function setActive(id) {
      links.forEach(function (a) {
        var on = idFromHref(a.getAttribute('href') || '') === id;
        a.classList.toggle('is-active', on);
        if (on) {
          var li = a.closest('li');
          if (li && nav) {
            var top = li.offsetTop;
            var bottom = top + li.offsetHeight;
            var viewTop = nav.scrollTop;
            var viewBottom = viewTop + nav.clientHeight;
            if (top < viewTop + 8) nav.scrollTop = Math.max(0, top - 12);
            else if (bottom > viewBottom - 8) nav.scrollTop = bottom - nav.clientHeight + 12;
          }
        }
      });
    }

    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = idFromHref(a.getAttribute('href') || '');
        var el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        var y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset();
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        setActive(id);
        if (history.replaceState) {
          history.replaceState(null, '', '#' + encodeURIComponent(id).replace(/%/g, function (m) {
            // keep readable hash for CJK when possible
            return m;
          }));
          try {
            history.replaceState(null, '', '#' + id);
          } catch (err) {
            /* ignore */
          }
        }
      });
    });

    function onScroll() {
      if (!entries.length) return;
      var probe = window.pageYOffset + headerOffset() + 8;
      var current = entries[0].id;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].el.offsetTop <= probe) current = entries[i].id;
        else break;
      }
      setActive(current);
    }

    var ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          onScroll();
          ticking = false;
        });
      },
      { passive: true }
    );

    // Mobile collapsible
    var toggle = root.querySelector('.post-toc-toggle');
    var card = root.querySelector('.post-toc-card');
    if (toggle && card) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () {
        var open = !card.classList.contains('is-collapsed');
        card.classList.toggle('is-collapsed', open);
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        var label = toggle.querySelector('.post-toc-toggle-text');
        if (label) label.textContent = open ? '展开' : '收起';
      });
    }

    // Initial hash / first item
    if (location.hash) {
      var hid = idFromHref(location.hash);
      if (document.getElementById(hid)) setActive(hid);
      else onScroll();
    } else {
      onScroll();
    }
  });
})();
