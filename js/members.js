/* members.html: the public grid of approved profiles. */
App.start(async function () {
  var sb = App.sb, t = App.t, esc = App.esc;
  var grid = document.getElementById('grid');
  var filters = document.getElementById('filters');
  var u = await App.user();
  var me = u ? await App.myProfile(u.id) : null;
  filters.gender.value = me && me.gender === 'woman' ? 'man' : 'woman';

  async function load() {
    grid.innerHTML = '<p>' + esc(t('loading')) + '</p>';
    var q = sb.from('public_cards').select('*').eq('gender', filters.gender.value)
      .order('created_at', { ascending: false }).limit(60);
    var city = filters.city.value.trim().replace(/[%_,()]/g, '');
    if (city) q = q.ilike('city', '%' + city + '%');
    var age = filters.age.value.split('-');
    if (age.length === 2) q = q.gte('age', +age[0]).lte('age', +age[1]);
    var r = await q;
    if (r.error) throw r.error;
    var rows = r.data || [];
    if (!rows.length) {
      grid.innerHTML = '<p class="notice">' + esc(t('none_yet')) +
        (u ? '' : ' <a href="join.html">' + esc(t('join_free')) + '</a>') + '</p>';
      return;
    }
    var urls = await App.signed(rows.map(function (p) { return p.photo; }));
    grid.innerHTML = rows.map(function (p) {
      var src = urls[p.photo];
      return '<a class="member-card" href="member.html?id=' + encodeURIComponent(p.id) + '">' +
        (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="no-photo"></span>') +
        '<strong>' + esc(p.first_name) + ', ' + p.age + '</strong>' +
        '<span>' + esc(p.city) + ', ' + esc(p.country) + '</span></a>';
    }).join('');
  }

  document.getElementById('login-note').hidden = !!u;
  filters.addEventListener('submit', function (e) { e.preventDefault(); load(); });
  filters.gender.addEventListener('change', load);
  filters.age.addEventListener('change', load);
  await load();
});
