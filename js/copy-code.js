// Wrap Prism <pre> blocks in a chrome frame: dots · language · copy
document.addEventListener('DOMContentLoaded', function () {
  function langFromPre(pre) {
    if (pre.getAttribute('data-language')) {
      return pre.getAttribute('data-language');
    }
    var cls = pre.className || '';
    var m = cls.match(/language-([\w+#.-]+)/i);
    if (m) return m[1];
    var code = pre.querySelector('code');
    if (code) {
      var c = code.className || '';
      m = c.match(/language-([\w+#.-]+)/i);
      if (m) return m[1];
    }
    return '';
  }

  /**
   * Hexo puts .line-numbers-rows inside <code>. Absolute positioning
   * relative to <code> is fragile; reparent rows onto <pre> so the
   * gutter sits in pre's left padding and never overlays code.
   */
  function fixLineNumberRows(pre) {
    var rows = pre.querySelector('.line-numbers-rows');
    if (!rows) return;
    if (rows.parentNode !== pre) {
      pre.appendChild(rows);
    }
    pre.classList.add('ln-fixed');
  }

  function copyText(text, btn) {
    var done = function () {
      btn.textContent = '已复制';
      btn.classList.add('is-copied');
      setTimeout(function () {
        btn.textContent = '复制';
        btn.classList.remove('is-copied');
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
  }

  document.querySelectorAll('pre').forEach(function (pre) {
    // Always reparent line-number gutters first (even if already framed)
    fixLineNumberRows(pre);

    if (pre.closest('.code-frame')) return;
    // Skip empty / decorative pre
    if (!pre.textContent || !pre.textContent.trim()) return;

    var frame = document.createElement('div');
    frame.className = 'code-frame';

    var toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';

    var dots = document.createElement('span');
    dots.className = 'code-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = '<i></i><i></i><i></i>';

    var lang = langFromPre(pre);
    var langEl = document.createElement('span');
    langEl.className = 'code-lang';
    langEl.textContent = lang || 'code';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.title = '复制代码';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.innerText : pre.innerText;
      // Strip trailing line-number artifacts if any
      copyText(text, btn);
    });

    toolbar.appendChild(dots);
    toolbar.appendChild(langEl);
    toolbar.appendChild(btn);

    var parent = pre.parentNode;
    parent.insertBefore(frame, pre);
    frame.appendChild(toolbar);
    frame.appendChild(pre);

    // Remove any old floating copy button inside pre
    pre.querySelectorAll('.copy-btn').forEach(function (old) {
      old.remove();
    });
  });
});
