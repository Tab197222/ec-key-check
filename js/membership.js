/* membership.html: plan choice and Stripe checkout. */
App.start(async function () {
  var sb = App.sb, t = App.t;
  var out = document.getElementById('plan-status');
  var u = await App.user();
  var me = u ? await App.myProfile(u.id) : null;
  if (me && me.gender === 'woman') App.say(out, t('free_woman'));

  document.querySelectorAll('[data-plan]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!u) { location.href = 'join.html?next=membership.html'; return; }
      if (!me) { location.href = 'account.html'; return; }
      App.say(out, t('loading'));
      b.disabled = true;
      var r = await sb.functions.invoke('create-checkout', { body: { plan: b.dataset.plan } });
      b.disabled = false;
      var url = r.data && r.data.url;
      if (url) { location.href = url; return; }
      var msg = (r.data && r.data.error) || 'Payment could not start. Call or text Sam at 832-385-4161.';
      if (r.error && r.error.context && r.error.context.json) {
        try { msg = (await r.error.context.json()).error || msg; } catch (e) {}
      }
      App.say(out, msg, true);
    });
  });
});
