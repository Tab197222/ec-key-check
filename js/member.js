/* member.html?id=…: one member's full profile, for approved members. */
App.start(async function () {
  var sb = App.sb, t = App.t, esc = App.esc;
  var root = document.getElementById('member');
  var id = new URLSearchParams(location.search).get('id') || '';
  var u = await App.requireUser();

  var r = await sb.from('member_details').select('*').eq('id', id).maybeSingle();
  var p = r.data;
  if (!p) {
    var me = await App.myProfile(u.id);
    var approved = me && (me.status === 'approved' || me.is_admin);
    root.innerHTML = '<p class="notice">' + esc(t(approved ? 'not_found' : 'need_approval')) +
      (approved ? '' : ' <a href="account.html">' + esc(t('profile_h')) + '</a>') + '</p>';
    return;
  }

  var m = await sb.from('media').select('*').eq('owner', id).eq('approved', true)
    .order('is_main', { ascending: false }).order('created_at');
  var media = m.data || [];
  var urls = await App.signed(media.map(function (x) { return x.path; }));
  document.title = p.first_name + ' | iLoveLatins';

  root.innerHTML =
    '<h1>' + esc(p.first_name) + ', ' + p.age + '</h1>' +
    '<p class="lead">' + esc(p.city) + ', ' + esc(p.country) + '</p>' +
    '<div class="gallery">' + media.map(function (x) {
      var src = esc(urls[x.path] || '');
      return x.kind === 'photo'
        ? '<img src="' + src + '" alt="">'
        : '<video src="' + src + '" controls preload="metadata" playsinline></video>';
    }).join('') + '</div>' +
    (p.about ? '<p class="about">' + esc(p.about) + '</p>' : '') +
    (id === u.id ? '' :
      '<div class="actions">' +
      '<a class="btn" href="messages.html?to=' + encodeURIComponent(id) + '">' + esc(t('message')) + '</a>' +
      '<button class="btn btn-quiet" type="button" id="report">' + esc(t('report')) + '</button>' +
      '<button class="btn btn-quiet" type="button" id="block">' + esc(t('block')) + '</button>' +
      '</div><p class="form-status" id="out" role="status"></p>');

  if (id === u.id) return;
  var out = document.getElementById('out');
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
