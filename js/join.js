App.start(async function () {
  var sb = App.sb, t = App.t;
  var next = new URLSearchParams(location.search).get('next') || 'account.html';
  if (!/^[a-z-]+\.html(\?[^#]*)?$/.test(next)) next = 'account.html'; // only our own pages
  if (await App.user()) { location.replace(next); return; }

  var forms = { signup: document.getElementById('signup'), login: document.getElementById('login') };
  var tabs = document.querySelectorAll('[data-tab]');
  function show(name) {
    tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tab === name); });
    forms.signup.hidden = name !== 'signup';
    forms.login.hidden = name !== 'login';
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });
  if (location.hash === '#login' || new URLSearchParams(location.search).get('next')) show('login');

  var accountUrl = new URL('account.html', location.href).href;

  forms.signup.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = forms.signup.querySelector('.form-status');
    App.say(out, t('loading'));
    var r = await sb.auth.signUp({
      email: forms.signup.email.value.trim(),
      password: forms.signup.password.value,
      options: { emailRedirectTo: accountUrl }
    });
    if (r.error) return App.say(out, r.error.message, true);
    if (r.data.session) location.href = 'account.html';
    else { forms.signup.reset(); App.say(out, t('check_email')); }
  });

  forms.login.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = forms.login.querySelector('.form-status');
    App.say(out, t('loading'));
    var r = await sb.auth.signInWithPassword({
      email: forms.login.email.value.trim(),
      password: forms.login.password.value
    });
    if (r.error) return App.say(out, r.error.message, true);
    location.href = next;
  });

  document.getElementById('forgot').addEventListener('click', async function () {
    var out = forms.login.querySelector('.form-status');
    var email = forms.login.email.value.trim();
    if (!email) return App.say(out, t('need_email'), true);
    await sb.auth.resetPasswordForEmail(email, { redirectTo: accountUrl });
    App.say(out, t('reset_sent'));
  });
});
