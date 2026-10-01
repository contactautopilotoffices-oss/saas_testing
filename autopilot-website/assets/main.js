(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- hero slideshow ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('.hero .slide'));
  var dotsBox = document.getElementById('heroDots');
  var index = 0, timer = null, DURATION = 7600;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
    if (dotsBox) {
      Array.prototype.forEach.call(dotsBox.children, function (d, n) {
        d.classList.toggle('is-active', n === index);
        if (n === index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
  }
  function start() { if (!reduce && slides.length > 1) { stop(); timer = setInterval(function () { show(index + 1); }, DURATION); } }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  if (dotsBox && slides.length > 1) {
    slides.forEach(function (_, n) {
      var b = document.createElement('button');
      b.className = 'dot' + (n === 0 ? ' is-active' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show hero image ' + (n + 1));
      if (n === 0) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () { show(n); start(); });
      dotsBox.appendChild(b);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  start();


  /* ---------- hero background video ----------
     The stills are the poster and the fallback, so the hero is complete before
     any of this runs and stays complete if none of it does. The rendition is
     chosen from viewport, pixel density and the connection the browser reports,
     so a phone on a slow link is not sent the 1080p file. */
  (function heroVideo() {
    var v = document.getElementById('heroVideo');
    if (!v || reduce) return;

    var conn = navigator.connection || {};
    if (conn.saveData) return;                       // honour Data Saver
    if (/^(slow-)?2g$/.test(conn.effectiveType || '')) return;

    var w = window.innerWidth;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var portrait = w < 760 && window.innerHeight > window.innerWidth;

    var base;
    if (portrait) base = 'hero-portrait';
    else if (w * dpr >= 1440) base = 'hero-1080';
    else base = 'hero-720';

    // Offer both formats and let the browser pick the first it can decode.
    // Choosing one ourselves means a browser missing that codec gets nothing.
    [['.webm', 'video/webm; codecs="vp9"'], ['.mp4', 'video/mp4']].forEach(function (f) {
      var src = document.createElement('source');
      src.src = 'assets/video/' + base + f[0];
      src.type = f[1];
      v.appendChild(src);
    });

    v.preload = 'auto';
    v.muted = true;            // required for autoplay, and set before load()
    v.load();

    v.addEventListener('playing', function () { v.classList.add('is-playing'); stop(); });
    v.addEventListener('error', function () { v.classList.remove('is-playing'); start(); });

    function attempt() {
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay refused: stills remain */ });
    }
    if (v.readyState >= 3) attempt();
    else v.addEventListener('canplay', attempt, { once: true });

    // don't decode video the viewer cannot see
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) v.pause();
      else if (v.classList.contains('is-playing')) attempt();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (v.classList.contains('is-playing')) attempt(); }
        else v.pause();
      }, { threshold: 0.01 }).observe(v);
    }
  })();

  /* ---------- nav on scroll ---------- */
  var nav = document.getElementById('nav');
  function onScroll() { if (nav) nav.classList.toggle('is-solid', window.scrollY > 80); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  var toggle = document.getElementById('navToggle');
  var mobile = document.getElementById('mobileNav');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var open = mobile.hasAttribute('hidden');
      if (open) { mobile.removeAttribute('hidden'); } else { mobile.setAttribute('hidden', ''); }
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    });
    mobile.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        mobile.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
  }

  /* ---------- seamless client marquee ---------- */
  var track = document.getElementById('marqueeTrack');
  if (track) {
    track.innerHTML += track.innerHTML; // duplicate for a continuous loop
  }

  /* ---------- lifecycle tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.lc__tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.lc__panel'));

  function selectStage(step, focusTab) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-step') === String(step);
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;               // roving tabindex, one stop per tablist
      if (on && focusTab) t.focus();
    });
    panels.forEach(function (p) {
      p.classList.toggle('is-active', p.getAttribute('data-step') === String(step));
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectStage(tab.getAttribute('data-step')); });
    tab.addEventListener('keydown', function (e) {
      var k = e.key, next = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      selectStage(tabs[next].getAttribute('data-step'), true);
    });
  });

  /* the hero chips open the lifecycle stage that actually delivers that offering */
  Array.prototype.forEach.call(document.querySelectorAll('.chip[data-stage]'), function (chip) {
    chip.addEventListener('click', function () { selectStage(chip.getAttribute('data-stage')); });
  });

  /* ---------- scroll reveal ----------
     Headings wipe up behind a soft mask; everything else rises and fades.
     Siblings in a group are staggered so a section arrives as a sequence
     rather than all at once. Applied by script, so the page is fully
     readable at rest if this never runs. */
  function groups() {
    var out = [];
    // headings and their supporting copy
    Array.prototype.forEach.call(document.querySelectorAll('.sec-head'), function (h) {
      out.push(Array.prototype.filter.call(h.children, Boolean));
    });
    out.push([
      document.querySelector('.hero .eyebrow'),
      document.querySelector('.hero__title'),
      document.querySelector('.hero__sub'),
      document.querySelector('.chooser'),
      document.querySelector('.hero__cta')
    ]);
    // repeated items, staggered across the row
    ['.checklist li', '.col', '.case', '.member', '.loc', '.atlas__list li'].forEach(function (sel) {
      var items = document.querySelectorAll(sel);
      if (items.length) out.push(Array.prototype.slice.call(items));
    });
    // single blocks
    out.push([document.querySelector('.statement__line'), document.querySelector('.statement__sub')]);
    out.push([document.querySelector('.lc'), document.querySelector('.atlas__copy'),
              document.querySelector('.atlas__visual'), document.querySelector('.cta__inner'),
              document.querySelector('.standard__line'), document.querySelector('.trust__head')]);
    return out;
  }

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    // the gold hairline above each section head draws itself on arrival
    var ruleIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('drawn'); ruleIo.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    Array.prototype.forEach.call(document.querySelectorAll('.sec-head'), function (h) {
      ruleIo.observe(h);
    });

    groups().forEach(function (group) {
      var step = 0;
      group.forEach(function (el) {
        if (!el || el.classList.contains('reveal') || el.classList.contains('wipe')) return;
        var heading = /^H[1-3]$/.test(el.tagName);
        if (heading) {
          // wrap the text so the mask sits on the span, not on the observed box
          var inner = document.createElement('span');
          inner.className = 'wipe__i';
          while (el.firstChild) inner.appendChild(el.firstChild);
          el.appendChild(inner);
          el.classList.add('wipe');
        } else {
          el.classList.add('reveal');
        }
        el.style.setProperty('--d', (step * 0.085).toFixed(3) + 's');
        step++;
        io.observe(el);
      });
    });
  }

  /* ---------- gentle parallax on the hero photography ---------- */
  var heroMedia = document.querySelector('.hero__media');
  var hero = document.querySelector('.hero');
  if (heroMedia && hero && !reduce && window.innerWidth > 860) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, hero.offsetHeight);
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }
})();
