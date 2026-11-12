/* member.html?id=…: one member's full profile, for approved members. */
App.start(async function () {
  var sb = App.sb, t = App.t, esc = App.esc;
  var root = document.getElementById('member');
  var id = new URLSearchParams(location.search).get('id') || '';
  var u = await App.requireUser();
  var me = await App.myProfile(u.id);

  var r = await sb.from('member_details').select('*').eq('id', id).maybeSingle();
  var p = r.data;
  if (!p) {
    var approved = me && (me.status === 'approved' || me.is_admin);
    root.innerHTML = '<p class="notice">' + esc(t(approved ? 'not_found' : 'need_approval')) +
      (approved ? '' : ' <a href="account.html">' + esc(t('profile_h')) + '</a>') + '</p>';
    return;
  }

  var m = await sb.from('media').select('*').eq('owner', id).eq('approved', true)
    .order('is_main', { ascending: false }).order('created_at');
  var media = m.data || [];
  var urls = await App.signed(media.map(function (x) { return x.path; }));
  var mine = id === u.id;
  var liked = false;
  if (!mine) {
    var l = await sb.from('likes').select('liked').eq('liker', u.id).eq('liked', id).maybeSingle();
    liked = !!l.data;
  }
  document.title = p.first_name + ' | iLoveLatins';

  root.innerHTML =
    '<div class="profile-head">' +
    '<h1>' + esc(p.first_name) + ', ' + p.age + '</h1>' +
    '<p class="lead">' + esc(p.city) + ', ' + esc(p.country) + '</p>' +
    '<p class="card-badges">' + App.badges(p) + '</p></div>' +
    '<div class="gallery">' + media.map(function (x) {
      var src = esc(urls[x.path] || '');
      return x.kind === 'photo'
        ? '<img src="' + src + '" alt="">'
        : '<video src="' + src + '" controls preload="metadata" playsinline></video>';
    }).join('') + '</div>' +
    App.facts(p) +
    (p.about ? '<p class="about">' + esc(p.about) + '</p>' : '') +
    (mine ? '' :
      '<div class="actions">' +
      '<button class="btn btn-like" type="button" id="like" aria-pressed="' + liked + '">' + esc(t(liked ? 'liked' : 'like')) + '</button>' +
      '<a class="btn" href="messages.html?to=' + encodeURIComponent(id) + '">' + esc(t('message')) + '</a>' +
      '<button class="btn btn-quiet" type="button" id="report">' + esc(t('report')) + '</button>' +
      '<button class="btn btn-quiet" type="button" id="block">' + esc(t('block')) + '</button>' +
      '</div>') +
    (me && me.is_admin
      ? '<div class="actions owner-tools"><button class="btn btn-quiet" type="button" id="verify">' +
        esc(t(p.verified ? 'unmark_verified' : 'mark_verified')) + '</button></div>'
      : '') +
    '<p class="form-status" id="out" role="status"></p>';

  var out = document.getElementById('out');

  if (me && me.is_admin) {
    document.getElementById('verify').addEventListener('click', async function () {
      var res = await sb.from('profiles').update({ verified: !p.verified }).eq('id', id);
      if (res.error) return App.say(out, res.error.message, true);
      location.reload();
    });
  }
  if (mine) return;

  document.getElementById('like').addEventListener('click', async function () {
    var b = this;
    b.disabled = true;
    var res = liked
      ? await sb.from('likes').delete().eq('liker', u.id).eq('liked', id)
      : await sb.from('likes').insert({ liker: u.id, liked: id });
    b.disabled = false;
    if (res.error) return App.say(out, res.error.message, true);
    liked = !liked;
    b.setAttribute('aria-pressed', liked);
    b.textContent = t(liked ? 'liked' : 'like');
  });
  document.getElementById('report').addEventListener('click', async function () {
    var reason = (prompt(t('report_prompt')) || '').trim();
    if (!reason) return;
    var res = await sb.from('reports').insert({ reporter: u.id, reported: id, reason: reason.slice(0, 1000) });
    App.say(out, res.error ? res.error.message : t('reported'), !!res.error);
  });
  document.getElementById('block').addEventListener('click', async function () {
    if (!confirm(t('block_confirm'))) return;
    var res = await sb.from('blocks').upsert({ blocker: u.id, blocked: id });
    App.say(out, res.error ? res.error.message : t('blocked'), !!res.error);
  });
});
