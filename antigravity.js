/* Antigravity — поле точек, отталкивающихся от курсора. Ванильный 2D-канвас. */
(function () {
  'use strict';

  var CONFIG = {
    mount: '#antigravity',
    density: 11000,
    maxCount: 420,
    minLength: 1,
    maxLength: 3,
    thickness: 1.3,
    repelRadius: 140,
    repelForce: 0.55,
    friction: 0.86,
    returnForce: 0.012,
    drift: 0.15,
    colorLight: 'rgba(17, 18, 20, 0.16)',
    colorDark: 'rgba(255, 255, 255, 0.20)',
    disableUnder: 700
  };

  function init() {
    var host = document.querySelector(CONFIG.mount);
    if (!host) { setTimeout(init, 150); return; }
    if (host.dataset.agReady === '1') return;
    host.dataset.agReady = '1';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    if (window.innerWidth < CONFIG.disableUnder) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
    host.appendChild(canvas);

    var ctx = canvas.getContext('2d', { alpha: true });
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var points = [], w = 0, h = 0, raf = null, visible = true;
    var pointer = { x: -9999, y: -9999, active: false };
    var color = CONFIG.colorLight;

    function readTheme() {
      color = document.body.getAttribute('data-theme') === 'dark' ? CONFIG.colorDark : CONFIG.colorLight;
    }

    function build() {
      var rect = host.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(CONFIG.maxCount, Math.round((w * h) / CONFIG.density));
      points = [];
      for (var i = 0; i < count; i++) {
        var x = Math.random() * w, y = Math.random() * h;
        points.push({
          ox: x, oy: y, x: x, y: y, vx: 0, vy: 0,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.6,
          len: CONFIG.minLength + Math.pow(Math.random(), 1.6) * (CONFIG.maxLength - CONFIG.minLength),
          angle: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.12
        });
      }
    }

    function frame(time) {
      raf = requestAnimationFrame(frame);
      if (!visible || !points.length) return;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = CONFIG.thickness;
      ctx.lineCap = 'round';
      var t = time * 0.001, rr = CONFIG.repelRadius, rr2 = rr * rr;
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        var driftX = Math.sin(t * p.speed + p.phase) * CONFIG.drift;
        var driftY = Math.cos(t * p.speed * 0.8 + p.phase) * CONFIG.drift;
        if (pointer.active) {
          var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < rr2 && d2 > 0.01) {
            var d = Math.sqrt(d2), falloff = 1 - d / rr, f = falloff * falloff * CONFIG.repelForce;
            p.vx += (dx / d) * f * 10;
            p.vy += (dy / d) * f * 10;
          }
        }
        p.vx += (p.ox - p.x) * CONFIG.returnForce;
        p.vy += (p.oy - p.y) * CONFIG.returnForce;
        p.vx *= CONFIG.friction;
        p.vy *= CONFIG.friction;
        p.x += p.vx + driftX;
        p.y += p.vy + driftY;
        var a = p.angle + Math.sin(t * p.speed * 0.35 + p.phase) * 0.5 + p.spin * t;
        var hx = Math.cos(a) * p.len * 0.5, hy = Math.sin(a) * p.len * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - hx, p.y - hy);
        ctx.lineTo(p.x + hx, p.y + hy);
        ctx.stroke();
      }
    }

    window.addEventListener('mousemove', function (e) {
      var rect = host.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener('mouseout', function () {
      pointer.active = false; pointer.x = -9999; pointer.y = -9999;
    }, { passive: true });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (window.innerWidth < CONFIG.disableUnder) {
          cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, w, h); points = [];
          return;
        }
        build();
        if (!raf) raf = requestAnimationFrame(frame);
      }, 200);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(host);
    }
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { build(); });
      ro.observe(host);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) { raf = requestAnimationFrame(frame); }
    });

    readTheme();
    new MutationObserver(readTheme).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

    if (reduced.addEventListener) {
      reduced.addEventListener('change', function (e) {
        if (e.matches) { cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, w, h); }
      });
    }

    build();
    raf = requestAnimationFrame(frame);
  }

  init();
})();
