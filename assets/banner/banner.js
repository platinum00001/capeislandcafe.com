/* Cape Island Café: daytime video banner (v2). Self-contained, no globals. */
(function () {
  var hero = document.getElementById('cib-hero');
  if (!hero) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileMQ = window.matchMedia('(max-width: 767px)');
  var video = hero.querySelector('.cib-hero__video');
  var media = hero.querySelector('.cib-hero__media');
  var brand = hero.querySelector('.cib-hero__brand');
  var panel = hero.querySelector('.cib-hero__panel');
  var on = function (mq, fn) { mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn); };

  /* ---- video: right crop + poster per breakpoint; poster only for reduced motion ---- */
  function setVideo() {
    if (!video) return;
    var mobile = mobileMQ.matches, want = mobile ? 'm' : 'd';
    video.poster = mobile ? video.getAttribute('data-poster-mobile') : video.getAttribute('data-poster-desktop');
    if (reduce.matches) { video.removeAttribute('autoplay'); video.preload = 'none'; video.pause(); return; }
    if (video.getAttribute('data-variant') !== want) {
      var cur = video.getAttribute('data-variant');
      video.setAttribute('data-variant', want);
      if (cur) video.load(); /* first pass: the browser already picked the matching <source media> */
    }
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }
  setVideo();
  on(mobileMQ, setVideo);
  on(reduce, function () { setVideo(); parallax(); start(); });

  /* ---- gentle parallax while the banner is on screen ---- */
  var ticking = false;
  function parallax() {
    ticking = false;
    if (reduce.matches) { media.style.transform = brand.style.transform = panel.style.transform = ''; brand.style.opacity = ''; return; }
    var h = hero.offsetHeight, y = Math.max(0, Math.min(window.scrollY, h * 1.5)), t = Math.min(1, y / h);
    media.style.transform = 'translate3d(0,' + Math.min(y * 0.3, h * 0.11) + 'px,0)';
    brand.style.transform = 'translate3d(0,' + (y * 0.18) + 'px,0) scale(' + (1 - t * 0.1) + ')';
    brand.style.opacity = String(1 - t * 0.55);
    panel.style.transform = mobileMQ.matches ? '' : 'translate3d(0,' + (y * 0.08) + 'px,0)';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  window.addEventListener('resize', parallax);
  parallax();

  /* ---- rotating ticker (pauses on hover/focus and when the tab is hidden) ---- */
  var items = Array.prototype.slice.call(hero.querySelectorAll('.cib-ticker__item'));
  var dots = Array.prototype.slice.call(hero.querySelectorAll('.cib-ticker__dots i'));
  var i = 0, timer = 0, paused = false;
  function show(n) {
    items.forEach(function (el, k) {
      el.classList.toggle('is-on', k === n);
      el.classList.toggle('is-off', k === i && k !== n);
      el.setAttribute('aria-hidden', k === n ? 'false' : 'true');
    });
    dots.forEach(function (d, k) { d.classList.toggle('on', k === n); });
    var prev = i; i = n;
    setTimeout(function () { if (prev !== i) items[prev].classList.remove('is-off'); }, 650);
  }
  function tick() { if (!paused && !document.hidden) show((i + 1) % items.length); }
  function start() { clearInterval(timer); timer = setInterval(tick, reduce.matches ? 6000 : 3400); }
  panel.addEventListener('mouseenter', function () { paused = true; });
  panel.addEventListener('mouseleave', function () { paused = false; });
  panel.addEventListener('focusin', function () { paused = true; });
  panel.addEventListener('focusout', function () { paused = false; });
  if (items.length) { show(0); start(); }
})();
