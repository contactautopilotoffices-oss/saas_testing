(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- hero slideshow ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('.hero .slide'));
  var dotsBox = document.getElementById('heroDots');
  var index = 0, timer = null, DURATION = 6500;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
    if (dotsBox) {
      Array.prototype.forEach.call(dotsBox.children, function (d, n) {
        d.classList.toggle('is-active', n === index);
        d.setAttribute('aria-selected', n === index ? 'true' : 'false');
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
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Show image ' + (n + 1));
      b.setAttribute('aria-selected', n === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { show(n); start(); });
      dotsBox.appendChild(b);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  start();

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
  var tabs = document.querySelectorAll('.lc__tab');
  var panels = document.querySelectorAll('.lc__panel');
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function () {
      var step = tab.getAttribute('data-step');
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      Array.prototype.forEach.call(panels, function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-step') === step);
      });
    });
  });

  /* ---------- scroll reveal ---------- */
  var targets = document.querySelectorAll('.reveal, .sec-head, .lc, .checklist, .atlas__grid, .cols3, .loc__strip, .cases, .team, .cta__inner');
  if (!('IntersectionObserver' in window) || reduce) {
    Array.prototype.forEach.call(targets, function (t) { t.classList.add('in'); });
  } else {
    Array.prototype.forEach.call(targets, function (t) { t.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }
})();
