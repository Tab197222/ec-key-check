/* messages.html: conversation list on one side, the open conversation on the other. */
App.start(async function () {
  var sb = App.sb, t = App.t, esc = App.esc;
  var $ = function (id) { return document.getElementById(id); };
  var u = await App.requireUser();
  var open = new URLSearchParams(location.search).get('to');
  var names = {};
  var shown = -1;

  async function loadList() {
    var r = await sb.rpc('my_conversations');
    var rows = r.data || [];
    rows.forEach(function (c) { names[c.other] = c.first_name; });
    if (open && !names[open]) {
      var p = await sb.from('member_details').select('first_name').eq('id', open).maybeSingle();
      if (p.data) {
        names[open] = p.data.first_name;
        rows.unshift({ other: open, first_name: names[open], last_body: '', unread: 0 });
      }
    }
    $('list').innerHTML = rows.length ? rows.map(function (c) {
      return '<button type="button" data-id="' + esc(c.other) + '"' + (c.other === open ? ' aria-current="true"' : '') + '>' +
        '<strong>' + esc(c.first_name) + (c.unread > 0 ? ' <span class="tag">' + c.unread + '</span>' : '') + '</strong>' +
        '<span>' + esc((c.last_body || '').slice(0, 60)) + '</span></button>';
    }).join('') : '<p class="form-small">' + esc(t('no_convos')) + '</p>';
  }

  async function loadThread(force) {
    if (!open || !names[open]) { $('thread-box').hidden = true; return; }
    $('thread-box').hidden = false;
    $('with').innerHTML = '<a href="member.html?id=' + encodeURIComponent(open) + '">' + esc(names[open]) + '</a>';
    var r = await sb.from('messages').select('*')
      .or('and(sender.eq.' + u.id + ',recipient.eq.' + open + '),and(sender.eq.' + open + ',recipient.eq.' + u.id + ')')
      .order('created_at').limit(300);
    var rows = r.data || [];
    if (force || rows.length !== shown) {
      shown = rows.length;
      $('thread').innerHTML = rows.map(function (m) {
        return '<div class="bubble ' + (m.sender === u.id ? 'mine' : 'theirs') + '">' + esc(m.body) +
          '<time>' + new Date(m.created_at).toLocaleString(App.lang(), { dateStyle: 'medium', timeStyle: 'short' }) + '</time></div>';
      }).join('');
      $('thread').scrollTop = $('thread').scrollHeight;
      if (rows.some(function (m) { return m.recipient === u.id && !m.read_at; })) await sb.rpc('mark_read', { other: open });
    }
    await checkAllowed();
  }

  async function checkAllowed() {
    var r = await sb.rpc('message_block_reason', { to_id: open });
    var reason = r.data;
    $('send').querySelector('button').disabled = !!reason;
    $('send').body.disabled = !!reason;
    $('why').innerHTML = reason
      ? esc(t('r_' + reason)) + (reason === 'limit' ? ' <a href="membership.html">' + esc(t('upgrade')) + '</a>' : '')
      : '';
    $('why').hidden = !reason;
  }

  $('list').addEventListener('click', async function (e) {
    var b = e.target.closest('button[data-id]');
    if (!b) return;
    open = b.dataset.id;
    history.replaceState(null, '', 'messages.html?to=' + encodeURIComponent(open));
    await loadList(); await loadThread(true);
  });

  $('send').addEventListener('submit', async function (e) {
    e.preventDefault();
    var body = this.body.value.trim();
    if (!body || !open) return;
    var r = await sb.from('messages').insert({ sender: u.id, recipient: open, body: body });
    if (r.error) { await checkAllowed(); return; }
    this.reset();
    await loadThread(true); await loadList();
  });

  await loadList();
  await loadThread(true);
  // Check for new messages every 15 seconds while the page is open.
  setInterval(function () { if (!document.hidden) { loadList(); loadThread(false); } }, 15000);
});
