/* Autopilot Offices: hero and anatomy
 *
 * One continuous experience:
 *   video, wall break, workspace reveal, hero, scroll, spin and settle,
 *   layer separation, anatomy, Day 1 Standard.
 *
 * The model is five top-down planes stacked in CSS 3D. Because they are real
 * planes in 3D space, the spin and the exploded view are genuine rather than
 * faked with scaling. Everything that moves is a transform or an opacity.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 860px)');

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeIO(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeO(t) { return 1 - Math.pow(1 - t, 3); }
  function rad(d) { return d * Math.PI / 180; }

  /* ------------------------------------------------------------ elements */
  var model = $('#model');
  var wrap = $('#modelWrap');
  var outline = $('#outline');
  var heroUi = $('#heroUi');
  var nav = $('#nav');
  var anatIntro = $('#anatIntro');
  var day1 = $('#day1');
  var card = $('#card');
  var layers = $$('.layer');
  var lbls = $$('.lbl');

  /* four invisible anchors on each plane. Their screen positions tell the
     labels where the left and right edges of each layer currently are. */
  var CORNERS = [[0, 0], [1400, 0], [0, 900], [1400, 900]];
  var anchors = layers.map(function (layer) {
    return CORNERS.map(function (c) {
      var a = doc.createElement('i');
      a.style.cssText = 'position:absolute;width:0;height:0;left:' + c[0] + 'px;top:' + c[1] + 'px;pointer-events:none';
      layer.appendChild(a);
      return a;
    });
  });

  var COPY = lbls.map(function (l) {
    return { num: $('.lbl__num', l).textContent, title: $('h3', l).textContent, txt: $('p', l).textContent };
  });

  /* ------------------------------------------------------------ timeline
     Layers 2 to 5 lift one after another. Each lift raises that layer and
     everything above it, so the stack opens like a drawer rather than blowing up. */
  var STEP_START = [0, 0, .12, .25, .38, .51];
  var STEP_DUR = .10;
  var DAY1_START = .70;
  var DIM_END = .74;

  /* ------------------------------------------------------------ layout */
  var S = { vw: 0, vh: 0, mobile: false, hero: {}, anat: {}, gap: 0 };

  function layout() {
    S.vw = window.innerWidth;
    S.vh = window.innerHeight;
    S.mobile = phone.matches;
    root.style.setProperty('--vh', S.vh + 'px');

    /* the plan is 1400 x 900. Projected, a spun and tilted plan covers about
       1657 x 833 plan units, which is what these scales fit to the screen. */
    var gapScreen;
    if (!S.mobile) {
      var fit = Math.min(S.vw * .52 / 1657, S.vh * .52 / 833);
      /* in the hero the model sits right of centre so the headline has clear air;
         it travels to the middle as it turns into the anatomy view */
      S.hero = { scale: fit, tilt: 58, spin: -36, x: S.vw * .085, y: -S.vh * .03 };
      S.anat = { scale: fit * 1.04, tilt: 63, spin: -396, x: 0, y: S.vh * .07 };
      gapScreen = S.vh * .08;
    } else {
      var fm = S.vw * .98 / 1571;
      S.hero = { scale: fm, tilt: 52, spin: -36, x: 0, y: -S.vh * .17 };
      S.anat = { scale: fm * .94, tilt: 50, spin: -396, x: 0, y: S.vh * .035 };
      gapScreen = S.vh * .056;
    }
    S.gap = gapScreen / (S.anat.scale * Math.sin(rad(S.anat.tilt)));
    anatTop = S.vh;
  }
  var anatTop = 0;

  /* ------------------------------------------------------------ input */
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || S.mobile) return;
      tmx = (e.clientX / S.vw) * 2 - 1;
      tmy = (e.clientY / S.vh) * 2 - 1;
    }, { passive: true });
  }

  /* ------------------------------------------------------------ the frame */
  var cur = 0;
  var revealStart = null;
  var lastZ = [];
  var lastActive = -1;
  var lastDim = null;
  var lastSolid = null;

  function frame(now) {
    var target = window.pageYOffset;
    cur += (target - cur) * (reduce ? 1 : .13);
    if (Math.abs(target - cur) < .1) cur = target;

    mx += (tmx - mx) * .06;
    my += (tmy - my) * .06;

    var t1 = clamp(cur / S.vh, 0, 1);
    var e = easeIO(t1);
    var pB = clamp((cur - S.vh) / (S.vh * 5), 0, 1);

    /* reveal, driven by time so it holds the same beat as the wall */
    var reveal = revealStart === null ? 0 : easeO(clamp((now - revealStart) / 1500, 0, 1));
    if (root.classList.contains('revealed') && revealStart === null) reveal = 1;

    /* pose: spin, tilt and travel */
    var h = S.hero, a = S.anat;
    var calm = reduce ? 0 : 1 - e;
    var spin = lerp(h.spin, a.spin, reduce ? 0 : e) + (reduce ? 0 : mx * 2.4 * calm);
    if (reduce) spin = lerp(h.spin, a.spin + 360, e);
    var tilt = lerp(h.tilt, a.tilt, e) + (reduce ? 0 : 11 * Math.sin(Math.PI * e)) - (reduce ? 0 : my * 2 * calm);
    var scale = lerp(h.scale, a.scale, e) * lerp(.9, 1, reveal);
    var y = lerp(h.y, a.y, e) + (reduce ? 0 : Math.sin(now / 1150) * 7 * calm);
    var x = lerp(h.x, a.x, e);
    model.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + scale.toFixed(4) +
      ') rotateX(' + tilt.toFixed(2) + 'deg) rotateZ(' + spin.toFixed(2) + 'deg)';

    /* hero furniture leaves as the model turns */
    var heroFade = 1 - clamp(t1 * 3, 0, 1);
    heroUi.style.opacity = heroFade.toFixed(3);
    heroUi.style.visibility = t1 > .6 ? 'hidden' : 'visible';
    outline.style.opacity = (reveal * (1 - clamp(t1 * 2.2, 0, 1))).toFixed(3);
    outline.style.transform = 'translate3d(' + (lerp(h.x + S.vw * .02, a.x, e) - mx * 16 * calm).toFixed(1) + 'px,' +
      (-50 + (-t1 * 9)).toFixed(2) + '%,0)';

    /* anatomy furniture arrives once the model has settled */
    var introIn = clamp((t1 - .75) / .25, 0, 1);
    var d = clamp((pB - DAY1_START) / .12, 0, 1);
    /* the heading steps aside before the layers reach it */
    var introOut = 1 - clamp((pB - .04) / .09, 0, 1);
    anatIntro.style.opacity = (introIn * introOut).toFixed(3);
    anatIntro.style.transform = 'translate3d(0,' + ((1 - introIn) * 18).toFixed(1) + 'px,0)';
    day1.style.opacity = d.toFixed(3);
    day1.style.transform = 'translate3d(0,' + ((1 - d) * 24).toFixed(1) + 'px,0)';
    day1.classList.toggle('on', d > .6);

    /* layer separation */
    var z = 0, active = 1;
    var stackZ = [];
    for (var i = 1; i <= 5; i++) {
      if (i > 1) {
        var sep = easeIO(clamp((pB - STEP_START[i]) / STEP_DUR, 0, 1));
        z += sep * S.gap;
        if (pB >= STEP_START[i]) active = i;
      }
      stackZ[i] = z + (i - 1) * 1.5;
    }
    if (pB < .04) active = 0;
    for (var k = 1; k <= 5; k++) {
      var zz = stackZ[k].toFixed(2);
      if (lastZ[k] !== zz) {
        layers[k - 1].style.transform = 'translateZ(' + zz + 'px)';
        lastZ[k] = zz;
      }
    }

    /* the active layer stays bright; the rest step back until the overview */
    var dimOn = pB > .05 && pB < DIM_END;
    var dimKey = dimOn ? active : 0;
    if (dimKey !== lastDim) {
      layers.forEach(function (l, idx) { l.classList.toggle('is-dim', dimOn && idx + 1 !== active); });
      lastDim = dimKey;
    }

    /* labels and the phone card */
    if (active !== lastActive) {
      lbls.forEach(function (l, idx) {
        var n = idx + 1;
        l.classList.toggle('on', active >= n);
        l.classList.toggle('is-quiet', dimOn && active !== n);
      });
      if (active > 0) {
        var c = COPY[active - 1];
        $('#cardNum').textContent = c.num;
        $('#cardTitle').textContent = c.title;
        $('#cardTxt').textContent = c.txt;
      }
      lastActive = active;
    } else {
      lbls.forEach(function (l, idx) { l.classList.toggle('is-quiet', dimOn && active !== idx + 1); });
    }
    if (card) {
      var cardOn = active > 0 && d < .5 ? 1 : 0;
      card.style.opacity = cardOn;
      card.style.transform = 'translate3d(0,' + (cardOn ? 0 : 14) + 'px,0)';
    }

    if (!S.mobile && t1 > .9 && pB < 1.001) placeLabels();

    var solid = cur > 40;
    if (solid !== lastSolid) { nav.classList.toggle('is-solid', solid); lastSolid = solid; }

    window.requestAnimationFrame(frame);
  }

  /* hang each label off the edge of its layer */
  function placeLabels() {
    for (var i = 0; i < 5; i++) {
      var pts = anchors[i].map(function (el) {
        var r = el.getBoundingClientRect();
        return { x: r.left, y: r.top };
      });
      var right = lbls[i].classList.contains('lbl--r');
      var p = pts[0];
      for (var j = 1; j < 4; j++) {
        if (right ? pts[j].x > p.x : pts[j].x < p.x) p = pts[j];
      }
      var tx = right ? p.x : p.x - 300;
      tx = clamp(tx, 6, S.vw - 306);
      lbls[i].style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + (p.y - 9).toFixed(1) + 'px,0)';
    }
  }

  /* ------------------------------------------------------------ the opening */
  var timers = [];
  function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }

  function startIntro() {
    if (reduce) { finish(true); return; }

    var v = $('#introVideo');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var base = S.mobile ? 'hero-portrait' : (S.vw * dpr >= 1440 ? 'hero-1080' : 'hero-720');

    /* offer both formats and let the browser take the first it can decode */
    [['.webm', 'video/webm; codecs="vp9"'], ['.mp4', 'video/mp4']].forEach(function (f) {
      var s = doc.createElement('source');
      s.src = 'assets/video/' + base + f[0];
      s.type = f[1];
      v.appendChild(s);
    });
    v.muted = true;
    v.load();

    var begun = false;
    function begin() {
      if (begun) return;
      begun = true;
      schedule();
    }
    v.addEventListener('playing', begin, { once: true });
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* the poster frame stands in */ });
    later(begin, 1400);        // if the video cannot play, the poster carries the beat
  }

  /* video, then the wall forms, then it breaks. Phones get a shorter beat. */
  function schedule() {
    var T = S.mobile ? 1000 : 2000;
    later(function () { root.classList.add('forming'); }, T - 280);
    later(function () {
      root.classList.add('broken');
    }, T + 150);
    later(function () {
      root.classList.add('revealed');
      revealStart = performance.now();
    }, T + 400);
    later(function () { root.classList.add('ready'); }, T + 1150);
    later(function () { root.classList.remove('intro'); }, T + 1800);
    later(function () { $('#intro').hidden = true; }, T + 2900);
  }

  function finish(instant) {
    timers.forEach(window.clearTimeout);
    timers = [];
    if (instant) root.classList.add('no-anim');
    root.classList.add('forming', 'broken', 'revealed', 'ready');
    root.classList.remove('intro');
    $('#intro').hidden = true;
    revealStart = null;
    if (instant) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { root.classList.remove('no-anim'); });
      });
    }
  }

  var skip = $('#skipIntro');
  if (skip) skip.addEventListener('click', function () { finish(true); });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('intro')) finish(true);
  });

  /* ------------------------------------------------------------ links */
  /* the hero choices open the layer that delivers that offering */
  $$('.choose a[data-target]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var p = parseFloat(a.getAttribute('data-target'));
      window.scrollTo({ top: S.vh + p * S.vh * 5, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------ go */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  layout();
  window.addEventListener('resize', layout, { passive: true });
  startIntro();
  window.requestAnimationFrame(frame);
})();
