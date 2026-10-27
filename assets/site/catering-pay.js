/* Cape Island Café: catering payment calculator (no card data is collected on this page). */
(function () {
  var f = document.getElementById('cp-form');
  if (!f) return;
  var amt = document.getElementById('cp-amount');
  var custom = document.getElementById('cp-custom');
  var customWrap = document.getElementById('cp-custom-wrap');
  var out = { a: document.getElementById('cp-s-amt'), t: document.getElementById('cp-s-tip'), tot: document.getElementById('cp-s-tot') };
  var err = document.getElementById('cp-err');
  var payWrap = document.getElementById('cp-pay');
  var msg = document.getElementById('cp-msg');
  var url = (window.CATERING_PAY_URL || '').trim();
  var money = function (n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var num = function (s) { var v = parseFloat(String(s || '').replace(/[$,\s]/g, '')); return isFinite(v) ? v : NaN; };

  function calc() {
    var a = num(amt.value);
    var sel = f.querySelector('input[name="tip"]:checked');
    var mode = sel ? sel.value : '0';
    customWrap.hidden = mode !== 'custom';
    var tip = 0;
    if (a > 0) {
      if (mode === 'custom') { var c = num(custom.value); tip = c > 0 ? c : 0; }
      else tip = Math.round(a * parseFloat(mode)) / 100;
    }
    var ok = a > 0;
    var total = ok ? Math.round((a + tip) * 100) / 100 : 0;
    out.a.textContent = money(ok ? a : 0);
    out.t.textContent = money(tip);
    out.tot.textContent = money(total);
    return { ok: ok, amount: a, tip: tip, total: total };
  }

  if (url) {
    payWrap.innerHTML = '<button class="btn btn-order btn-lg" type="submit" id="cp-paybtn">Pay with Square<span class="sr-only"> (opens in a new tab)</span></button>';
  } else {
    payWrap.innerHTML = '<p class="cp-soon" role="status">Online payment coming soon. To pay for your catering order, email <a href="mailto:CapeIslandCafe@gmail.com?subject=Catering%20payment">CapeIslandCafe@gmail.com</a> or call <a href="tel:+17742475263">774-247-5263</a>.</p>';
  }

  f.addEventListener('input', function () { calc(); err.textContent = ''; });
  f.addEventListener('change', calc);
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = calc();
    if (!r.ok) { err.textContent = 'Please enter the amount shown on your invoice (more than $0).'; amt.focus(); return; }
    if (!url) return;
    var t = r.total.toFixed(2);
    window.open(url, '_blank', 'noopener');
    var text = 'Square is opening in a new tab. When it asks for an amount, enter <strong>' + money(r.total) + '</strong>';
    if (r.tip > 0) text += ' (includes your ' + money(r.tip) + ' tip, so skip the tip on Square)';
    text += '.';
    var done = function (copied) { msg.innerHTML = text + (copied ? ' We copied ' + t + ' to your clipboard.' : ''); msg.hidden = false; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  calc();
})();
