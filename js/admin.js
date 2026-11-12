/* admin.html: approve or reject profiles and uploads, read reports. Only for is_admin accounts. */
App.start(async function () {
  var sb = App.sb, esc = App.esc;
  var $ = function (id) { return document.getElementById(id); };
  var u = await App.requireUser();
  var me = await App.myProfile(u.id);
  if (!me || !me.is_admin) {
    document.querySelector('[data-app]').innerHTML = '<p class="notice">This page is for the site owner only.</p>';
    return;
  }

  function age(d) {
    var b = new Date(d), n = new Date();
    var a = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
    return a;
  }
  function mediaHtml(list, urls, withButtons) {
    return '<div class="gallery small">' + list.map(function (m) {
      var src = esc(urls[m.path] || '');
      return '<figure class="media-item">' +
        (m.kind === 'photo' ? '<img src="' + src + '" alt="">' : '<video src="' + src + '" controls preload="metadata"></video>') +
        (withButtons ? '<figcaption><button class="link" data-ok-media="' + m.id + '">Approve</button>' +
          '<button class="link" data-del-media="' + m.id + '" data-path="' + esc(m.path) + '">Remove</button></figcaption>' : '') +
        '</figure>';
    }).join('') + '</div>';
  }

  async function load() {
    // Profiles waiting for approval
    var p = await sb.from('profiles').select('*').eq('status', 'pending').order('created_at');
    var pending = p.data || [];
    var ids = pending.map(function (x) { return x.id; });
    var m = ids.length ? await sb.from('media').select('*').in('owner', ids).order('created_at') : { data: [] };
    var media = m.data || [];
    var urls = await App.signed(media.map(function (x) { return x.path; }));
    $('pending').innerHTML = pending.length ? pending.map(function (x) {
      var mine = media.filter(function (y) { return y.owner === x.id; });
      return '<article class="card review">' +
        '<h3>' + esc(x.first_name) + ', ' + age(x.birthdate) + ' (' + esc(x.gender) + ')</h3>' +
        '<p>' + esc(x.city) + ', ' + esc(x.country) + '</p>' +
        (x.about ? '<p class="about">' + esc(x.about) + '</p>' : '') +
        mediaHtml(mine, urls, false) +
        '<div class="actions"><button class="btn" data-approve="' + x.id + '">Approve profile and all uploads</button>' +
        '<button class="btn btn-quiet" data-reject="' + x.id + '">Reject</button></div></article>';
    }).join('') : '<p class="form-small">Nothing waiting.</p>';

    // New uploads from members who are already live
    var n = await sb.from('media').select('*, profiles!inner(first_name, status)')
      .eq('approved', false).eq('profiles.status', 'approved').order('created_at');
    var fresh = n.data || [];
    var urls2 = await App.signed(fresh.map(function (x) { return x.path; }));
    $('uploads').innerHTML = fresh.length
      ? fresh.map(function (x) {
          return '<div><p class="form-small">' + esc(x.profiles.first_name) + '</p>' + mediaHtml([x], urls2, true) + '</div>';
        }).join('')
      : '<p class="form-small">Nothing waiting.</p>';

    // Reports
    var r = await sb.from('reports').select('*, reporter_p:profiles!reports_reporter_fkey(first_name), reported_p:profiles!reports_reported_fkey(id, first_name)')
      .eq('resolved', false).order('created_at');
    var reps = r.data || [];
    $('reports').innerHTML = reps.length ? reps.map(function (x) {
      return '<article class="card review"><p><strong>' + esc(x.reporter_p.first_name) + '</strong> reported ' +
        '<a href="member.html?id=' + x.reported_p.id + '">' + esc(x.reported_p.first_name) + '</a>: ' + esc(x.reason) + '</p>' +
        '<div class="actions"><button class="btn btn-quiet" data-resolve="' + x.id + '">Mark as dealt with</button>' +
        '<button class="btn btn-quiet" data-reject="' + x.reported_p.id + '">Take profile down</button></div></article>';
    }).join('') : '<p class="form-small">No open reports.</p>';

    // Tour deposits, newest first
    var dp = await sb.from('deposits').select('*').eq('status', 'paid').order('paid_at', { ascending: false }).limit(100);
    var deps = dp.data || [];
    $('deposits').innerHTML = deps.length ? '<div class="table-wrap"><table class="deposits"><thead><tr>' +
      '<th>Paid</th><th>Tour</th><th>Name</th><th>Email</th><th>Phone</th><th>Amount</th></tr></thead><tbody>' +
      deps.map(function (x) {
        return '<tr><td>' + new Date(x.paid_at).toLocaleDateString() + '</td><td>' + esc(x.tour_label) + '</td><td>' +
          esc(x.name) + (x.message ? '<br><span class="form-small">' + esc(x.message) + '</span>' : '') + '</td><td><a href="mailto:' +
          esc(x.email) + '">' + esc(x.email) + '</a></td><td>' + esc(x.phone) + '</td><td>$' + (x.amount_cents / 100) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
      : '<p class="form-small">No deposits yet.</p>';
  }

  document.querySelector('[data-app]').addEventListener('click', async function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    b.disabled = true;
    var d = b.dataset;
    if (d.approve) {
      await sb.from('media').update({ approved: true }).eq('owner', d.approve);
      await sb.from('profiles').update({ status: 'approved' }).eq('id', d.approve);
    } else if (d.reject) {
      if (!confirm('Reject this profile? It will be hidden from the site.')) { b.disabled = false; return; }
      await sb.from('profiles').update({ status: 'rejected' }).eq('id', d.reject);
    } else if (d.okMedia) {
      await sb.from('media').update({ approved: true }).eq('id', d.okMedia);
    } else if (d.delMedia) {
      await sb.storage.from('media').remove([d.path]);
      await sb.from('media').delete().eq('id', d.delMedia);
    } else if (d.resolve) {
      await sb.from('reports').update({ resolved: true }).eq('id', d.resolve);
    }
    await load();
  });

  await load();
});
