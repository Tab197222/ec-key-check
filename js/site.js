(function () {
  var D = window.ILL;
  var C = D.contact;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function day(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function range(t) {
    var a = day(t.start), b = day(t.end);
    var same = a.getMonth() === b.getMonth();
    return MONTHS[a.getMonth()] + ' ' + a.getDate() + '–' + (same ? '' : MONTHS[b.getMonth()] + ' ') + b.getDate();
  }
  function label(t) { return t.name + ', ' + range(t) + ', ' + day(t.start).getFullYear(); }

  // past = finished, closed = inside the booking cutoff, open = can be reserved online
  function status(t) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (day(t.end) < today) return 'past';
    var cutoff = day(t.start); cutoff.setDate(cutoff.getDate() - D.bookingCutoffDays);
    return today > cutoff ? 'closed' : 'open';
  }
  var upcoming = D.tours.filter(function (t) { return status(t) !== 'past'; })
    .sort(function (a, b) { return day(a.start) - day(b.start); });
  var open = upcoming.filter(function (t) { return status(t) === 'open'; });

  /* ---------- header and footer ---------- */
  var page = location.pathname.split('/').pop() || 'index.html';
  var links = [
    ['tours.html', 'Tours'],
    ['members.html', 'Members'],
    ['membership.html', 'Membership'],
    ['about.html', 'About Sam'],
    ['faq.html', 'Questions'],
    ['contact.html', 'Contact'],
    ['account.html', 'My account']
  ];
  var header = document.querySelector('[data-header]');
  if (header) {
    header.className = 'site-header';
    header.innerHTML =
      '<div class="wrap">' +
      '<a class="logo" href="index.html"><img src="assets/logo.png" alt="iLoveLatins home" width="768" height="205"></a>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav">Menu</button>' +
      '<nav class="nav" id="nav" aria-label="Main">' +
      links.map(function (l) {
        return '<a href="' + l[0] + '"' + (page === l[0] ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
      }).join('') +
      '<a class="btn" href="join.html">Join free</a>' +
      '</nav></div>';
    var toggle = header.querySelector('.nav-toggle');
    var nav = header.querySelector('.nav');
    toggle.addEventListener('click', function () {
      var on = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', on);
      toggle.textContent = on ? 'Close' : 'Menu';
    });
  }

  var footer = document.querySelector('[data-footer]');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="wrap"><div class="footer-grid">' +
      '<div><img src="assets/logo.png" alt="iLoveLatins" width="768" height="205">' +
      '<p>Hosted singles tours to Colombia since 2000.</p>' +
      '<p>Call or text ' + esc(C.name) + ': <a href="tel:' + C.phoneLink + '">' + C.phoneDisplay + '</a><br>' +
      '<a href="mailto:' + C.email + '">' + C.email + '</a></p></div>' +
      '<div><h3>Tours</h3><ul>' +
      '<li><a href="tours.html">Tour dates</a></li>' +
      '<li><a href="tours.html#reserve">Reserve a tour</a></li>' +
      '<li><a href="how-it-works.html">How it works</a></li>' +
      '<li><a href="tour-videos.html">Tour videos</a></li></ul></div>' +
      '<div><h3>Members</h3><ul>' +
      '<li><a href="join.html">Join free</a></li>' +
      '<li><a href="members.html">Members</a></li>' +
      '<li><a href="messages.html">Messages</a></li>' +
      '<li><a href="likes.html">Likes</a></li>' +
      '<li><a href="membership.html">Membership</a></li>' +
      '<li><a href="account.html">My account</a></li></ul></div>' +
      '<div><h3>Help</h3><ul>' +
      '<li><a href="about.html">About Sam</a></li>' +
      '<li><a href="faq.html">Questions</a></li>' +
      '<li><a href="safety.html">Safety</a></li>' +
      '<li><a href="contact.html">Contact</a></li></ul></div>' +
      '</div><p class="legal">© 2000–' + new Date().getFullYear() + ' iLoveLatins. All rights reserved.</p></div>';
  }

  /* ---------- contact details ---------- */
  document.querySelectorAll('[data-phone]').forEach(function (a) {
    a.href = 'tel:' + C.phoneLink;
    if (!a.textContent.trim()) a.textContent = C.phoneDisplay;
  });
  document.querySelectorAll('[data-sms]').forEach(function (a) { a.href = 'sms:' + C.phoneLink; });
  document.querySelectorAll('[data-email]').forEach(function (a) {
    a.href = 'mailto:' + C.email;
    if (!a.textContent.trim()) a.textContent = C.email;
  });
  document.querySelectorAll('[data-whatsapp]').forEach(function (a) { a.href = C.whatsappGroup; });
  document.querySelectorAll('[data-hours]').forEach(function (el) { el.textContent = C.hours; });

  /* ---------- tour tickets ---------- */
  function ticket(t, hero) {
    var st = status(t);
    var facts = '';
    if (t.packagePrice) facts += '<li>Package: ' + esc(t.packagePrice) + '</li>';
    if (t.hotel) facts += '<li>Hotel: ' + esc(t.hotel) + '</li>';
    var stub;
    if (st === 'open') {
      var href = t.depositLink || ('tours.html?tour=' + encodeURIComponent(t.id) + '#reserve');
      stub =
        '<div class="ticket-deposit">$' + D.deposit + '<small>deposit holds your place</small></div>' +
        '<a class="btn" href="' + esc(href) + '">' + (t.depositLink ? 'Pay deposit' : 'Reserve') + '</a>';
    } else {
      stub =
        '<p class="ticket-note"><strong>Online reservations have closed.</strong> Ask Sam about a late place.</p>' +
        '<a class="btn btn-quiet" href="tel:' + C.phoneLink + '">Call or text Sam</a>';
    }
    return '<article class="ticket' + (hero ? ' ticket-hero' : '') + (st === 'closed' ? ' closed' : '') + '">' +
      '<div class="ticket-main">' +
      (hero ? '<p class="ticket-label">Next tour you can reserve</p>' : '') +
      '<div class="ticket-dates">' + range(t) + ' <span class="ticket-year">' + day(t.start).getFullYear() + '</span></div>' +
      '<h3 class="ticket-name">' + esc(t.name) + '</h3>' +
      '<div class="ticket-city">' + esc(t.city) + (t.city === 'Barranquilla' ? ', Colombia' : '') + '</div>' +
      (hero ? '' : '<p class="ticket-blurb">' + esc(t.blurb) + '</p>') +
      (facts ? '<ul class="ticket-facts">' + facts + '</ul>' : '') +
      '</div><div class="ticket-stub">' + stub + '</div></article>';
  }

  var next = document.querySelector('[data-next-tour]');
  if (next) {
    var pick = open[0] || upcoming[0];
    next.innerHTML = pick ? ticket(pick, true)
      : '<p>New tour dates are being set. Call or text Sam at <a href="tel:' + C.phoneLink + '">' + C.phoneDisplay + '</a>.</p>';
  }
  document.querySelectorAll('[data-tours]').forEach(function (el) {
    el.innerHTML = upcoming.length
      ? upcoming.map(function (t) { return ticket(t, false); }).join('')
      : '<p>New tour dates are being set. Call or text Sam at <a href="tel:' + C.phoneLink + '">' + C.phoneDisplay + '</a> to hear them first.</p>';
  });

  var select = document.querySelector('[data-tour-select]');
  if (select) {
    var wanted = new URLSearchParams(location.search).get('tour');
    select.innerHTML = open.map(function (t) {
      return '<option value="' + esc(label(t)) + '"' + (t.id === wanted ? ' selected' : '') + '>' + esc(label(t)) + '</option>';
    }).join('') + '<option value="Not sure yet">Not sure yet</option>';
  }

  /* ---------- tour videos: a thumbnail until pressed, then the YouTube player ---------- */
  document.querySelectorAll('[data-videos]').forEach(function (el) {
    var max = +el.getAttribute('data-videos') || D.videos.length;
    el.innerHTML = D.videos.slice(0, max).map(function (v) {
      return '<figure class="yt"><button type="button" class="yt-play" data-yt="' + esc(v.id) + '" data-title="' + esc(v.title) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">' +
        '<span class="yt-icon" aria-hidden="true"></span><span class="sr">Play video: ' + esc(v.title) + '</span></button>' +
        '<figcaption><strong>' + esc(v.title) + '</strong><br>' + esc(v.when) + '</figcaption></figure>';
    }).join('');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-yt]');
      if (!b) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.dataset.yt) + '?autoplay=1&rel=0';
      f.title = b.dataset.title;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      b.replaceWith(f);
      f.focus();
    });
  });
  document.querySelectorAll('[data-yt-channel]').forEach(function (a) { a.href = D.youtubeChannel; });

  /* ---------- forms ---------- */
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var out = form.querySelector('.form-status');
    var es = function () { return form.getAttribute('data-lang') === 'es'; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('.hp input').value) return; // spam trap
      var subject = form.getAttribute('data-form');
      var lines = [];
      form.querySelectorAll('[name]').forEach(function (f) {
        if (f.closest('.hp') || f.closest('[hidden]') || !f.value) return;
        lines.push(f.getAttribute('data-label') + ': ' + f.value);
      });
      out.className = 'form-status';

      if (D.formEndpoint) {
        var data = new FormData(form);
        data.append('_subject', subject);
        out.textContent = es() ? 'Enviando…' : 'Sending…';
        fetch(D.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error();
            form.reset();
            out.textContent = es()
              ? 'Enviado. Sam te responderá pronto.'
              : 'Sent. Sam will reply by phone or email.';
          })
          .catch(function () {
            out.className = 'form-status error';
            out.textContent = (es() ? 'No se pudo enviar. Escribe o llama a Sam: ' : 'That did not send. Call or text Sam instead: ') + C.phoneDisplay + '.';
          });
      } else {
        location.href = 'mailto:' + C.email + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\n'));
        out.textContent = es()
          ? 'Se abrió tu correo con el mensaje listo. Pulsa enviar para que le llegue a Sam.'
          : 'Your email app has opened with the message written. Press send there to deliver it to Sam.';
      }
    });
  });
})();
