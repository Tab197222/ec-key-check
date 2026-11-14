App.start(async function () {
  var sb = App.sb, t = App.t, esc = App.esc;
  var $ = function (id) { return document.getElementById(id); };
  var LIMITS = {
    photo: { types: ['image/jpeg', 'image/png', 'image/webp'], max: 10 * 1024 * 1024 },
    video: { types: ['video/mp4', 'video/quicktime', 'video/webm'], max: 50 * 1024 * 1024 }
  };

  var u = await App.requireUser();
  var DETAILS = ['looking_for', 'height_cm', 'english', 'religion', 'has_children', 'wants_children'];
  document.querySelectorAll('#profile [data-opts]').forEach(function (sel) { sel.innerHTML = App.options(sel.dataset.opts); });

  /* ----- height: feet and inches, or centimetres; either one fills in the other ----- */
  var hf = document.querySelector('#profile [name=height_ft]');
  var hi = document.querySelector('#profile [name=height_in]');
  var hc = document.querySelector('#profile [name=height_cm]');
  hf.innerHTML = '<option value="">ft</option>' + [4, 5, 6, 7].map(function (n) { return '<option value="' + n + '">' + n + '′</option>'; }).join('');
  hi.innerHTML = '<option value="">in</option>' + Array.from({ length: 12 }, function (_, n) { return '<option value="' + n + '">' + n + '″</option>'; }).join('');
  function heightFromFeet() {
    if (!hf.value) { hc.value = ''; return; }
    hc.value = Math.round((+hf.value * 12 + (+hi.value || 0)) * 2.54);
  }
  function heightFromCm() {
    var cm = +hc.value;
    if (!cm) { hf.value = ''; hi.value = ''; return; }
    var inches = Math.round(cm / 2.54);
    var ft = Math.floor(inches / 12);
    if (ft < 4 || ft > 7) return;
    hf.value = String(ft); hi.value = String(inches % 12);
  }
  hf.addEventListener('change', heightFromFeet);
  hi.addEventListener('change', heightFromFeet);
  hc.addEventListener('input', heightFromCm);
  var profile = null, media = [], sub = null;
  var form = $('profile');

  /* ----- password reset link lands here ----- */
  if (App.recovery) $('recover').hidden = false;
  $('recover').addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = this.querySelector('.form-status');
    var r = await sb.auth.updateUser({ password: this.password.value });
    if (r.error) return App.say(out, r.error.message, true);
    this.reset(); App.say(out, t('saved'));
  });

  /* ----- status and profile form ----- */
  function renderProfile() {
    var note = $('status');
    note.textContent = t(profile ? 'st_' + profile.status : 'st_none');
    note.className = 'notice' + (profile && profile.status === 'approved' ? ' good' : '');
    if (new URLSearchParams(location.search).get('paid')) note.textContent += ' ' + t('paid_thanks');

    if (profile) {
      form.gender.value = profile.gender;
      form.first_name.value = profile.first_name;
      form.birthdate.value = profile.birthdate;
      form.city.value = profile.city;
      form.country.value = profile.country;
      form.about.value = profile.about;
      DETAILS.forEach(function (k) { form[k].value = profile[k] == null ? '' : profile[k]; });
      heightFromCm();
    }
    var v = $('verify-note');
    v.hidden = !profile || profile.status !== 'approved';
    v.className = 'notice' + (profile && profile.verified ? ' good' : '');
    v.innerHTML = profile && profile.verified
      ? '<span class="badge-verified">✓ ' + esc(t('verified')) + '</span> ' + esc(t('verified_note'))
      : esc(t('get_verified'));
    var locked = !!profile && profile.status !== 'draft';
    form.querySelectorAll('[name=gender]').forEach(function (r) { r.disabled = locked; });
    form.birthdate.disabled = locked;
    $('locked').hidden = !locked;
    $('media-box').hidden = !profile;
    $('member-box').hidden = !profile;
    $('submit').hidden = !profile || ['draft', 'rejected'].indexOf(profile.status) < 0;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = form.querySelector('.form-status');
    var row = {
      first_name: form.first_name.value.trim(),
      city: form.city.value.trim(),
      country: form.country.value.trim(),
      about: form.about.value.trim()
    };
    DETAILS.forEach(function (k) {
      var val = form[k].value.trim();
      row[k] = val === '' ? null : (k === 'height_cm' ? +val : val);
    });
    if (!profile || profile.status === 'draft') {
      row.gender = form.gender.value;
      row.birthdate = form.birthdate.value;
    }
    var r = profile
      ? await sb.from('profiles').update(row).eq('id', u.id).select().single()
      : await sb.from('profiles').insert(Object.assign({ id: u.id }, row)).select().single();
    if (r.error) return App.say(out, r.error.message, true);
    profile = r.data;
    renderProfile(); renderMembership();
    App.say(out, t('saved'));
  });

  /* ----- photos and videos ----- */
  async function loadMedia() {
    var r = await sb.from('media').select('*').eq('owner', u.id).order('created_at');
    media = r.data || [];
    var urls = await App.signed(media.map(function (m) { return m.path; }));
    $('media').innerHTML = media.map(function (m) {
      var src = esc(urls[m.path] || '');
      var canMain = m.kind === 'photo' && !m.is_main && (m.approved || profile.status !== 'approved');
      return '<figure class="media-item">' +
        (m.kind === 'photo'
          ? '<img src="' + src + '" alt="">'
          : '<video src="' + src + '" controls preload="metadata" playsinline></video>') +
        '<figcaption>' +
        (m.is_main ? '<span class="tag">' + esc(t('main')) + '</span>' : '') +
        (!m.approved && profile.status !== 'draft' ? '<span class="tag wait">' + esc(t('waiting')) + '</span>' : '') +
        (canMain ? '<button type="button" class="link" data-main="' + m.id + '">' + esc(t('make_main')) + '</button>' : '') +
        '<button type="button" class="link" data-remove="' + m.id + '">' + esc(t('remove')) + '</button>' +
        '</figcaption></figure>';
    }).join('');
  }

  async function upload(files, kind) {
    var out = $('media-status');
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (LIMITS[kind].types.indexOf(f.type) < 0) { App.say(out, f.name + ' ' + t('bad_type'), true); continue; }
      if (f.size > LIMITS[kind].max) { App.say(out, f.name + ' ' + t('too_big'), true); continue; }
      App.say(out, t('uploading') + ' ' + f.name + '…');
      var ext = (f.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
      var path = u.id + '/' + crypto.randomUUID() + ext;
      var up = await sb.storage.from('media').upload(path, f, { contentType: f.type });
      if (up.error) { App.say(out, up.error.message, true); continue; }
      var row = await sb.from('media').insert({ owner: u.id, path: path, kind: kind });
      if (row.error) {
        await sb.storage.from('media').remove([path]);
        App.say(out, row.error.message, true);
        break;
      }
      App.say(out, '');
    }
    await loadMedia();
  }
  $('photo-input').addEventListener('change', function () { upload(this.files, 'photo'); this.value = ''; });
  $('video-input').addEventListener('change', function () { upload(this.files, 'video'); this.value = ''; });

  $('media').addEventListener('click', async function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.remove) {
      var m = media.find(function (x) { return x.id === b.dataset.remove; });
      await sb.storage.from('media').remove([m.path]);
      await sb.from('media').delete().eq('id', m.id);
    } else if (b.dataset.main) {
      await sb.from('media').update({ is_main: false }).eq('owner', u.id).eq('is_main', true);
      await sb.from('media').update({ is_main: true }).eq('id', b.dataset.main);
    }
    await loadMedia();
  });

  $('submit').addEventListener('click', async function () {
    var out = $('media-status');
    var r = await sb.from('profiles').update({ status: 'pending' }).eq('id', u.id).select().single();
    if (r.error) return App.say(out, r.error.message, true);
    profile = r.data;
    renderProfile(); await loadMedia();
    App.say(out, t('submitted'));
    sb.functions.invoke('notify-admin').catch(function () {});
  });

  /* ----- membership ----- */
  function active() {
    return sub && ['active', 'trialing'].indexOf(sub.status) >= 0 &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  }
  async function renderMembership() {
    if (!profile) return;
    var box = $('member-text');
    $('upgrade').hidden = $('billing').hidden = true;
    if (profile.gender === 'woman') { box.textContent = t('free_woman'); return; }
    var r = await sb.from('subscriptions').select('*').eq('user_id', u.id).maybeSingle();
    sub = r.data;
    if (active()) {
      box.textContent = t('plan_active') + ' ' +
        (sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString(App.lang()) : '') + '.';
    } else {
      box.textContent = (sub && sub.stripe_subscription_id ? t('plan_ended') + ' ' : '') + t('plan_free');
      $('upgrade').hidden = false;
    }
    $('billing').hidden = !(sub && sub.stripe_customer_id);
  }
  $('billing').addEventListener('click', async function () {
    var r = await sb.functions.invoke('billing-portal');
    if (r.data && r.data.url) location.href = r.data.url;
    else App.say($('member-status'), 'Could not open billing. Contact Sam.', true);
  });

  /* ----- leave ----- */
  $('logout').addEventListener('click', async function () {
    await sb.auth.signOut(); location.href = 'index.html';
  });
  $('delete').addEventListener('click', async function () {
    if (active()) return alert(t('delete_sub'));
    if (!confirm(t('delete_confirm'))) return;
    if (media.length) await sb.storage.from('media').remove(media.map(function (m) { return m.path; }));
    var r = await sb.rpc('delete_my_account');
    if (r.error) return alert(r.error.message);
    await sb.auth.signOut(); location.href = 'index.html';
  });

  profile = await App.myProfile(u.id);
  renderProfile();
  if (profile) { await loadMedia(); await renderMembership(); }
  // After paying, Stripe's confirmation can take a few seconds to arrive.
  if (new URLSearchParams(location.search).get('paid')) {
    var tries = 0;
    var timer = setInterval(async function () {
      await renderMembership();
      if (active() || ++tries > 8) clearInterval(timer);
    }, 4000);
  }
});
