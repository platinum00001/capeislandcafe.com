/* Cape Island Café — homepage email signup -> Supabase RPC public.cafe_signup
   The publishable key below is safe for client-side use (insert-only RPC). */
(function () {
  var SUPABASE_URL = 'https://oiousqgzqcjanikglkxl.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_IJHa5taHcttV2DSZq45fWQ_bVbRDbA2';
  var forms = document.querySelectorAll('form.signup-form');
  Array.prototype.forEach.call(forms, function (form) {
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var trap = form.querySelector('input[name="website"]');
    var status = form.querySelector('.signup-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'signup-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
    }
    status.style.margin = '.6rem 0 0';
    var busy = false;
    function say(msg) { status.textContent = msg; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var email = (input.value || '').trim();
      if (trap && trap.value) { say('Thanks! You\u2019re on the list.'); form.reset(); return; }
      if (!email || (input.checkValidity && !input.checkValidity())) {
        say('Please enter a valid email address.');
        input.focus();
        return;
      }
      busy = true;
      button.disabled = true;
      var label = button.textContent;
      button.textContent = 'Signing you up\u2026';
      say('');
      fetch(SUPABASE_URL + '/rest/v1/rpc/cafe_signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({ p_email: email, p_source: form.getAttribute('data-source') || 'homepage' })
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        say('Thanks! You\u2019re on the list. Watch your inbox for our lunch specials.');
        button.textContent = 'You\u2019re signed up';
      }).catch(function () {
        say('Sorry, something went wrong. Please try again, or give us a call.');
        button.textContent = label;
        button.disabled = false;
        busy = false;
      });
    });
  });
})();
