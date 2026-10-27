/* Cape Island Café: catering order form (FormSubmit free form-to-email + mailto fallback). */
(function () {
  var f = document.getElementById('co-form');
  var money = function (n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var num = function (s) { var v = parseFloat(String(s || '').replace(/[$,\s]/g, '')); return isFinite(v) ? v : NaN; };
  var KEY = 'cicCateringDeposit';

  // Thank-you state + deposit hand-off to the pay section
  var params = new URLSearchParams(location.search);
  var dep = num(params.get('deposit'));
  if (!(dep > 0)) { try { dep = num(localStorage.getItem(KEY)); } catch (e) {} }
  var thanks = document.getElementById('thanks');
  if (thanks && (location.hash === '#thanks' || params.get('ordered'))) {
    thanks.hidden = false;
    if (dep > 0) thanks.querySelector('a').insertAdjacentHTML('beforebegin', 'Your 50% deposit is <strong>' + money(dep) + '</strong>. ');
    setTimeout(function () { thanks.focus(); }, 50);
  }
  if (dep > 0 && (location.hash === '#thanks' || params.get('ordered') || params.get('deposit'))) {
    var payAmt = document.getElementById('cp-amount');
    if (payAmt && !payAmt.value) payAmt.value = dep.toFixed(2);
  }
  if (!f) return;

  var ITEMS = ['Mini ham & cheese croissants', 'Mini quiches', 'Mini danishes', 'Mini muffins', 'Scones', 'Baguette caprese'];
  var box = document.getElementById('co-items');
  ITEMS.forEach(function (name, i) {
    var id = 'co-it-' + i;
    box.insertAdjacentHTML('beforeend',
      '<div class="co-item"><label for="' + id + '"><input type="checkbox" id="' + id + '" data-item="' + name.replace(/&/g, '&amp;') + '"> ' + name.replace(/&/g, '&amp;') + '</label>' +
      '<label class="sr-only" for="' + id + '-q">Quantity of ' + name.replace(/&/g, '&amp;') + '</label>' +
      '<input type="number" id="' + id + '-q" min="1" step="1" value="50" inputmode="numeric"></div>');
  });

  var amt = document.getElementById('co-amount'), err = document.getElementById('co-err');
  function calc() {
    var a = num(amt.value), ok = a > 0;
    var d = ok ? Math.round(a * 50) / 100 : 0, b = ok ? Math.round((a - d) * 100) / 100 : 0;
    document.getElementById('co-s-amt').textContent = money(ok ? a : 0);
    document.getElementById('co-s-dep').textContent = money(d);
    document.getElementById('co-s-bal').textContent = money(b);
    return { ok: ok, a: a, d: d, b: b };
  }
  function items() {
    return Array.prototype.map.call(box.querySelectorAll('input[type=checkbox]:checked'), function (c) {
      var q = document.getElementById(c.id + '-q').value || '50';
      return q + ' x ' + c.getAttribute('data-item');
    });
  }
  function validate() {
    var r = calc(), first = null, msgs = [];
    ['co-name', 'co-email', 'co-phone', 'co-date'].forEach(function (id) {
      var el = document.getElementById(id);
      var bad = !el.value.trim() || !el.checkValidity();
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) { msgs.push(document.querySelector('label[for="' + id + '"]').textContent.replace(' *', '')); first = first || el; }
    });
    amt.setAttribute('aria-invalid', r.ok ? 'false' : 'true');
    if (!r.ok) { msgs.push('Order amount (more than $0)'); first = first || amt; }
    if (!items().length && !document.getElementById('co-other').value.trim()) { msgs.push('at least one item or a special request'); first = first || box.querySelector('input'); }
    err.textContent = msgs.length ? 'Please fill in: ' + msgs.join(', ') + '.' : '';
    if (first) first.focus();
    return msgs.length ? null : r;
  }
  function fill(r) {
    document.getElementById('co-dep-field').value = r.d.toFixed(2);
    document.getElementById('co-bal-field').value = r.b.toFixed(2);
    document.getElementById('co-items-field').value = items().join('; ') || '(see special request)';
    try { localStorage.setItem(KEY, r.d.toFixed(2)); } catch (e) {}
  }
  amt.addEventListener('input', calc);
  f.addEventListener('input', function () { if (err.textContent) err.textContent = ''; });
  f.addEventListener('submit', function (e) {
    var r = validate();
    if (!r) { e.preventDefault(); return; }
    fill(r);
    document.getElementById('co-next').value = 'https://capeislandcafe.com/catering.html?ordered=1&deposit=' + r.d.toFixed(2) + '#thanks';
  });
  document.getElementById('co-mailto').addEventListener('click', function (e) {
    e.preventDefault();
    var r = validate(); if (!r) return; fill(r);
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var body = ['New catering order', '', 'Name: ' + v('co-name'), 'Email: ' + v('co-email'), 'Phone: ' + v('co-phone'),
      'Pickup date: ' + v('co-date'), 'Pickup time: ' + (v('co-time') || '-'), 'Guests: ' + (v('co-guests') || '-'), '',
      'Items:', items().map(function (s) { return '- ' + s; }).join('\n') || '-', '', 'Other / special request: ' + (v('co-other') || '-'), '',
      'Order amount: ' + money(r.a), 'Deposit (50%): ' + money(r.d), 'Balance at pickup: ' + money(r.b)].join('\n');
    location.href = 'mailto:CapeIslandCafe@gmail.com?subject=' + encodeURIComponent('New catering order') + '&body=' + encodeURIComponent(body);
  });
  calc();
})();
