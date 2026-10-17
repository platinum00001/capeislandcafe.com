/* Cape Island Café: header nav (no libraries) */
(function () {
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('site-nav');
  var dds = document.querySelectorAll('.dd');
  function setNav(open) {
    if (!nav || !burger) return;
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', open);
  }
  function setDd(dd, open) {
    dd.classList.toggle('open', open);
    dd.querySelector('.dd-toggle').setAttribute('aria-expanded', String(open));
  }
  if (burger) burger.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  dds.forEach(function (dd) {
    var btn = dd.querySelector('.dd-toggle');
    btn.addEventListener('click', function (e) { e.stopPropagation(); setDd(dd, !dd.classList.contains('open')); });
    dd.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(dd.querySelectorAll('.dd-menu a'));
      var i = links.indexOf(document.activeElement);
      if (e.key === 'Escape') { setDd(dd, false); btn.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setDd(dd, true); (links[i + 1] || links[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setDd(dd, true); (links[i - 1] || links[links.length - 1]).focus(); }
    });
    dd.addEventListener('focusout', function (e) { if (!dd.contains(e.relatedTarget)) setDd(dd, false); });
  });
  document.addEventListener('click', function (e) { dds.forEach(function (dd) { if (!dd.contains(e.target)) setDd(dd, false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav && nav.classList.contains('open')) { setNav(false); burger.focus(); } });
  if (nav) nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
