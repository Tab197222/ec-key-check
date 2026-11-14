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
        '<span>' + (c.last_body == null && c.last_at ? '🔒 ' + esc(t('locked_preview')) : esc((c.last_body || '').slice(0, 60))) + '</span></button>';
    }).join('') : '<p class="form-small">' + esc(t('no_convos')) + '</p>';
  }

  async function loadThread(force) {
    if (!open || !names[open]) { $('thread-box').hidden = true; return; }
    $('thread-box').hidden = false;
    $('with').innerHTML = '<a href="member.html?id=' + encodeURIComponent(open) + '">' + esc(names[open]) + '</a>';
    var r = await sb.rpc('get_thread', { other: open });
    var rows = r.data || [];
    var lockedCount = rows.filter(function (m) { return m.locked; }).length;
    $('unlock').hidden = !lockedCount;
    if (lockedCount) {
      $('unlock').innerHTML = '🔒 <strong>' + esc(names[open]) + '</strong> ' + esc(t(lockedCount === 1 ? 'locked_one' : 'locked_many').replace('{n}', lockedCount)) +
        ' <a class="btn" href="membership.html">' + esc(t('unlock_btn')) + '</a>';
    }
    if (force || rows.length !== shown) {
      shown = rows.length;
      originals = {};
      $('thread').innerHTML = rows.map(function (m) {
        var theirs = m.sender !== u.id;
        if (m.locked) {
          return '<div class="bubble theirs locked"><span class="body">🔒 ' + esc(t('locked_bubble')) + '</span>' +
            '<time>' + new Date(m.created_at).toLocaleString(App.lang(), { dateStyle: 'medium', timeStyle: 'short' }) + '</time>' +
            '<a class="link" href="membership.html">' + esc(t('unlock_btn')) + '</a></div>';
        }
        return '<div class="bubble ' + (theirs ? 'theirs' : 'mine') + '"><span class="body">' + esc(m.body) + '</span>' +
          '<time>' + new Date(m.created_at).toLocaleString(App.lang(), { dateStyle: 'medium', timeStyle: 'short' }) + '</time>' +
          (theirs ? '<button type="button" class="link translate" data-translate="' + m.id + '">' + esc(t('translate')) + '</button>' : '') +
          '</div>';
      }).join('');
      $('thread').scrollTop = $('thread').scrollHeight;
      if (rows.some(function (m) { return m.recipient === u.id && !m.read_at && !m.locked; })) await sb.rpc('mark_read', { other: open });
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

  /* ----- translation: a free public service, used only when the reader presses Translate ----- */
  var originals = {};
  async function translateText(text) {
    var target = App.lang() === 'es' ? 'es' : 'en';
    var source = target === 'es' ? 'en' : 'es';
    // The service takes up to about 500 characters at a time: split at spaces.
    var chunks = [], rest = text;
    while (rest.length > 450) {
      var cut = rest.lastIndexOf(' ', 450);
      if (cut < 100) cut = 450;
      chunks.push(rest.slice(0, cut)); rest = rest.slice(cut);
    }
    chunks.push(rest);
    var out = [];
    for (var i = 0; i < chunks.length; i++) {
      var r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(chunks[i]) +
        '&langpair=' + source + '|' + target + '&de=' + encodeURIComponent((window.ILL && ILL.contact.email) || ''));
      var d = await r.json();
      if (!d || d.responseStatus !== 200 || !d.responseData) throw new Error('translation failed');
      out.push(d.responseData.translatedText);
    }
    return out.join(' ');
  }
  $('thread').addEventListener('click', async function (e) {
    var b = e.target.closest('[data-translate]');
    if (!b) return;
    var body = b.parentNode.querySelector('.body');
    var key = b.dataset.translate;
    if (originals[key] != null) {
      body.textContent = originals[key]; delete originals[key];
      b.textContent = t('translate');
      return;
    }
    b.disabled = true; b.textContent = t('translating');
    try {
      var translated = await translateText(body.textContent);
      originals[key] = body.textContent;
      body.textContent = translated;
      b.textContent = t('original');
    } catch (err) {
      b.textContent = t('translate_failed');
    }
    b.disabled = false;
  });

  $('send').addEventListener('submit', async function (e) {
    e.preventDefault();
    var body = this.body.value.trim();
    if (!body || !open) return;
    var r = await sb.from('messages').insert({ sender: u.id, recipient: open, body: body }).select('id').single();
    if (r.error) { await checkAllowed(); return; }
    // Email the other person (the server decides whether an alert is needed).
    sb.functions.invoke('notify-message', { body: { message_id: r.data.id } }).catch(function () {});
    this.reset();
    await loadThread(true); await loadList();
  });

  await loadList();
  await loadThread(true);
  // New messages arrive instantly through a signal that carries no message text;
  // checking every 30 seconds as well covers a dropped connection.
  sb.channel('inbox-' + u.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_pings', filter: 'user_id=eq.' + u.id },
      function () { loadList(); loadThread(false); })
    .subscribe();
  setInterval(function () { if (!document.hidden) { loadList(); loadThread(false); } }, 30000);
});
