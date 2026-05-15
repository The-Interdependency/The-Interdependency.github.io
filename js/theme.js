(function () {
  const themes = {
    forest: {
      label: 'Forest',
      vars: { '--bg':'#0b1110','--panel':'#121b18','--panel2':'#18231f','--text':'#f3f6f0','--muted':'#bac8be','--soft':'#d8e8dc','--accent':'#b9f6ca','--gold':'#ffd98a','--line':'rgba(255,255,255,.15)' },
      bodyBg: 'radial-gradient(circle at top left, rgba(185,246,202,.18), transparent 34rem), radial-gradient(circle at top right, rgba(255,217,138,.12), transparent 30rem), #0b1110'
    },
    ember: {
      label: 'Ember',
      vars: { '--bg':'#160d0b','--panel':'#241714','--panel2':'#301f19','--text':'#fff4ec','--muted':'#dfb9a9','--soft':'#ffe1d1','--accent':'#ffb36b','--gold':'#ffd27f','--line':'rgba(255,226,209,.18)' },
      bodyBg: 'radial-gradient(circle at top left, rgba(255,128,64,.20), transparent 34rem), radial-gradient(circle at top right, rgba(255,210,127,.13), transparent 30rem), #160d0b'
    },
    dusk: {
      label: 'Dusk',
      vars: { '--bg':'#10101d','--panel':'#19192a','--panel2':'#22223a','--text':'#f4f0ff','--muted':'#c8c1dc','--soft':'#e5ddff','--accent':'#c7b7ff','--gold':'#ffe08a','--line':'rgba(244,240,255,.16)' },
      bodyBg: 'radial-gradient(circle at top left, rgba(199,183,255,.20), transparent 34rem), radial-gradient(circle at top right, rgba(255,224,138,.11), transparent 30rem), #10101d'
    },
    daylight: {
      label: 'Daylight',
      vars: { '--bg':'#f7f1e7','--panel':'#fffaf1','--panel2':'#efe3d2','--text':'#201813','--muted':'#65574f','--soft':'#3a302a','--accent':'#176d5b','--gold':'#8a5a00','--line':'rgba(32,24,19,.18)' },
      bodyBg: 'radial-gradient(circle at top left, rgba(23,109,91,.13), transparent 34rem), radial-gradient(circle at top right, rgba(138,90,0,.12), transparent 30rem), #f7f1e7'
    }
  };

  const storageKey = 'wayseer-theme';
  const root = document.documentElement;

  function applyTheme(name) {
    const theme = themes[name] || themes.forest;
    Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value));
    document.body.style.background = theme.bodyBg;
    document.body.dataset.theme = name;
    try { localStorage.setItem(storageKey, name); } catch (error) {}
  }

  function buildSwitcher() {
    if (document.getElementById('wayseer-theme-switcher')) return;
    const wrap = document.createElement('section');
    wrap.id = 'wayseer-theme-switcher';
    wrap.setAttribute('aria-label', 'Color scheme selector');
    wrap.innerHTML = '<span>Color</span>' + Object.entries(themes).map(([key, theme]) => '<button type="button" data-theme-choice="' + key + '">' + theme.label + '</button>').join('');
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-theme-choice]');
      if (!button) return;
      applyTheme(button.dataset.themeChoice);
      updatePressed();
    });
    updatePressed();
  }

  function updatePressed() {
    const active = document.body.dataset.theme || 'forest';
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === active));
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    #wayseer-theme-switcher{position:fixed;right:1rem;bottom:1rem;z-index:9999;display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;max-width:min(92vw,520px);padding:.45rem;border:1px solid var(--line,rgba(255,255,255,.18));border-radius:999px;background:color-mix(in srgb,var(--panel,#121b18) 88%,transparent);box-shadow:0 18px 60px rgba(0,0,0,.28);backdrop-filter:blur(14px);font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--muted,#bac8be)}
    #wayseer-theme-switcher button{min-height:32px;border:1px solid var(--line,rgba(255,255,255,.18));border-radius:999px;background:transparent;color:var(--text,#f3f6f0);padding:.35rem .6rem;cursor:pointer;font:700 12px/1 ui-sans-serif,system-ui,sans-serif}
    #wayseer-theme-switcher button[aria-pressed="true"]{background:var(--accent,#b9f6ca);color:var(--bg,#0b1110);border-color:transparent}
    #wayseer-theme-switcher button:focus-visible{outline:3px solid var(--gold,#ffd98a);outline-offset:3px}
    @media(max-width:640px){#wayseer-theme-switcher{left:.75rem;right:.75rem;bottom:.75rem;border-radius:18px;justify-content:center}body{padding-bottom:5.5rem}}
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function () {
    let saved = 'forest';
    try { saved = localStorage.getItem(storageKey) || 'forest'; } catch (error) {}
    applyTheme(saved);
    buildSwitcher();
  });
})();
