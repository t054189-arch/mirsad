/* مِرصاد — خلفية ثلاثية الأبعاد.
   عارض صغير بلا مكتبات: شبكة أرضية بمنظور + قُبّة سلكية هي شعار
   المشروع نفسه في ثلاثة أبعاد. يقرأ ألوانه من متغيرات الثيم، فيتبدّل
   معها، ويتوقف عن الرسم متى غاب عن الشاشة أو خفتت الصفحة. */
(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- الهندسة ---------- */
  var R = 2.55;                 // نصف قطر القُبّة
  var MERIDIANS = 14, RINGS = [0.28, 0.55, 0.82], SEG = 14, RING_SEG = 44;
  var dome = [];                // مصفوفة من المسارات، كل مسار مصفوفة نقاط

  (function buildDome() {
    var i, j, th, ph, path;
    for (i = 0; i < MERIDIANS; i++) {
      th = (i / MERIDIANS) * Math.PI * 2;
      path = [];
      for (j = 0; j <= SEG; j++) {
        ph = (j / SEG) * (Math.PI / 2);
        path.push([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)]);
      }
      dome.push(path);
    }
    RINGS.forEach(function (f) {
      ph = f * (Math.PI / 2);
      path = [];
      for (j = 0; j <= RING_SEG; j++) {
        th = (j / RING_SEG) * Math.PI * 2;
        path.push([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)]);
      }
      dome.push(path);
    });
  })();

  var GRID = [];
  (function buildGrid() {
    var span = 11, step = 1.1, t;
    for (t = -span; t <= span; t += step) {
      GRID.push([[-span, 0, t], [span, 0, t]]);
      GRID.push([[t, 0, -span], [t, 0, span]]);
    }
  })();

  /* ---------- الكاميرا ---------- */
  var camDist = reduced ? 7.6 : 1.15;   // يبدأ قريبًا ثم يتراجع في المدخل
  var camY = 1.15, yaw = 0, focal = 0;
  var targetPX = 0, targetPY = 0, px = 0, py = 0;   // إزاحة المؤشر
  var W = 0, H = 0, cx = 0, cy = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // القُبّة تقف في الجهة المقابلة لعمود النص، فتتبدّل مع اتجاه القراءة
    var rtl = document.documentElement.getAttribute('dir') !== 'ltr';
    cx = W * (W < 760 ? 0.5 : (rtl ? 0.34 : 0.66));
    cy = H * 0.62;
    focal = Math.max(W, H) * 0.62;
  }

  function project(p) {
    var s = Math.sin(yaw), c = Math.cos(yaw);
    var x = p[0] * c - p[2] * s;
    var z = p[0] * s + p[2] * c;
    var zc = z + camDist;
    if (zc < 0.12) return null;
    var k = focal / zc;
    return [cx + (x + px) * k, cy - (p[1] - camY + py) * k, zc];
  }

  /* ---------- الألوان من الثيم ---------- */
  var colAccent = '234,213,184', colSoft = '168,159,146';
  function readColours() {
    var cs = getComputedStyle(document.documentElement);
    colAccent = toRGB(cs.getPropertyValue('--accent')) || colAccent;
    colSoft = toRGB(cs.getPropertyValue('--ink-soft')) || colSoft;
  }
  function toRGB(v) {
    v = (v || '').trim();
    var m = v.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      var n = parseInt(m[1], 16);
      return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
    m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    return m ? Math.round(+m[1]) + ',' + Math.round(+m[2]) + ',' + Math.round(+m[3]) : null;
  }

  /* ---------- الرسم ---------- */
  function strokePath(pts, rgb, base, closed) {
    var i, a, b, depth, alpha, drawn = false;
    ctx.beginPath();
    for (i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      a = project(pts[i]);
      b = project(pts[(i + 1) % pts.length]);
      if (!a || !b) { drawn = false; continue; }
      depth = (a[2] + b[2]) / 2;
      alpha = base * Math.max(0, Math.min(1, 1 - (depth - camDist + 3) / 13));
      if (alpha <= 0.004) { drawn = false; continue; }
      ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      drawn = true;
    }
    return drawn;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    GRID.forEach(function (l) { strokePath(l, colSoft, 0.2, false); });
    ctx.lineWidth = 1.25;
    dome.forEach(function (path) { strokePath(path, colAccent, 0.52, false); });
  }

  /* ---------- الحلقة ---------- */
  var running = false, visible = true, introStart = null, raf = 0;

  function frame(now) {
    raf = 0;
    if (introStart === null) introStart = now;
    var t = Math.min((now - introStart) / 2600, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    camDist = 1.15 + (7.6 - 1.15) * eased;
    yaw += 0.0026 - 0.0016 * eased;        // دوران سريع في البداية يهدأ بعدها
    px += (targetPX - px) * 0.05;
    py += (targetPY - py) * 0.05;
    draw();
    if (running && visible) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* ---------- الأحداث ---------- */
  window.addEventListener('resize', function () { resize(); if (reduced || !running) draw(); }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    if (reduced) return;
    targetPX = ((e.clientX / window.innerWidth) - 0.5) * -0.9;
    targetPY = ((e.clientY / window.innerHeight) - 0.5) * 0.5;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) { if (running) { raf = raf || requestAnimationFrame(frame); } } else { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  });

  // المشهد يخصّ الواجهة: يتلاشى ويتوقف عند تجاوزها
  var hero = document.getElementById('home');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        canvas.classList.toggle('is-off', !en.isIntersecting);
        if (en.isIntersecting) start(); else stop();
      });
    }, { threshold: 0 }).observe(hero);
  }

  resize();
  readColours();

  if (reduced) {
    // بلا حركة: إطار واحد ثابت من الموضع النهائي
    camDist = 7.6; yaw = 0.5;
    draw();
  } else {
    start();
  }

  window.MirsaadScene = {
    refresh: function () { readColours(); resize(); if (reduced || !running) draw(); },
    settle: function () {            // ينهي دوران المدخل فورًا عند التخطي
      introStart = performance.now() - 2600;
      camDist = 7.6;
    }
  };
})();
