/* likes.html: who likes me, and people I like. */
App.start(async function () {
  var sb = App.sb, t = App.t, esc = App.esc;
  var $ = function (id) { return document.getElementById(id); };
  var u = await App.requireUser();
  var me = await App.myProfile(u.id);
  if (!me || (me.status !== 'approved' && !me.is_admin)) {
    document.querySelector('[data-app]').innerHTML = '<p class="notice">' + esc(t('need_approval')) +
      ' <a href="account.html">' + esc(t('profile_h')) + '</a></p>';
    return;
  }

  async function cards(rows, extra) {
    var urls = await App.signed(rows.map(function (p) { return p.photo; }));
    return '<div class="member-grid">' + rows.map(function (p) {
      var src = urls[p.photo];
      return '<a class="member-card" href="member.html?id=' + encodeURIComponent(p.id) + '">' +
        (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="no-photo"></span>') +
        '<span class="card-badges">' + App.badges(p) + (extra ? extra(p) : '') + '</span>' +
        '<strong>' + esc(p.first_name) + ', ' + p.age + '</strong>' +
        '<span>' + esc(p.city) + ', ' + esc(p.country) + '</span></a>';
    }).join('') + '</div>';
  }

  // Who likes me
  var r = await sb.rpc('who_likes_me');
  if (r.error && /upgrade/.test(r.error.message)) {
    var c = await sb.rpc('likes_me_count');
    var n = c.data || 0;
    $('likes-me').innerHTML = '<p class="notice"><strong class="big-count">' + n + '</strong> ' + esc(t('likes_count')) +
      (n ? ' ' + esc(t('likes_upgrade')) + ' <a class="btn" href="membership.html">' + esc(t('upgrade')) + '</a>' : '') + '</p>';
  } else if (r.error) {
    throw r.error;
  } else if (!(r.data || []).length) {
    $('likes-me').innerHTML = '<p class="form-small">' + esc(t('no_likes')) + '</p>';
  } else {
    $('likes-me').innerHTML = await cards(r.data, function (p) {
      return p.mutual ? '<span class="badge-mutual">♥ ' + esc(t('mutual')) + '</span>' : '';
    });
  }

  // People I like
  var mine = await sb.from('likes').select('liked').eq('liker', u.id).order('created_at', { ascending: false });
  var ids = (mine.data || []).map(function (x) { return x.liked; });
  if (!ids.length) {
    $('i-like').innerHTML = '<p class="form-small">' + esc(t('no_i_like')) + '</p>';
  } else {
    var pc = await sb.from('public_cards').select('*').in('id', ids);
    var byId = {};
    (pc.data || []).forEach(function (p) { byId[p.id] = p; });
    $('i-like').innerHTML = await cards(ids.map(function (i) { return byId[i]; }).filter(Boolean));
  }
});
