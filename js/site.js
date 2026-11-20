(function () {
  // The version number stamped on this script's link (?v=…); added to the site's own page links below.
  var VERSION = '';
  try { VERSION = new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (e) {}
  var D = window.ILL;
  var C = D.contact;
  var page = location.pathname.split('/').pop() || 'index.html';

  /* Language: English or Spanish. The choice is kept on this phone or computer.
     js/lang.js swaps in the Spanish words of the public pages; the words this
     file writes itself (menu, footer, tour cards, forms) are in the list below. */
  var lang = null;
  try { lang = localStorage.getItem('ill_lang'); } catch (e) {}
  if (new URLSearchParams(location.search).get('soy') === 'mujer' && !lang) {
    lang = 'es'; // she arrived from a Spanish invitation: stay in Spanish on the next pages too
    try { localStorage.setItem('ill_lang', 'es'); } catch (e) {}
  }
  if (lang !== 'es' && lang !== 'en') lang = (navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  var ES = {
    'Tours': 'Tours', 'Testimonials': 'Testimonios', 'Members': 'Miembros', 'Membership': 'Membresía',
    'About Sam': 'Sobre Sam', 'Questions': 'Preguntas', 'Contact': 'Contacto', 'My account': 'Mi cuenta',
    'Join free': 'Únete gratis', 'Menu': 'Menú', 'Close': 'Cerrar',
    'Hosted singles tours to Colombia since 2000.': 'Tours para solteros en Colombia desde el año 2000.',
    'Call or text': 'Llama o escribe a', 'Follow us': 'Síguenos',
    'Tour dates': 'Fechas de los tours', 'Reserve a tour': 'Reservar un tour', 'How it works': 'Cómo funciona',
    'Tour videos': 'Videos de los tours', 'Messages': 'Mensajes', 'Likes': 'Me gusta', 'Help': 'Ayuda',
    'Safety': 'Seguridad', 'All rights reserved.': 'Todos los derechos reservados.',
    'Package: ': 'Paquete: ', 'non-refundable deposit holds your place': 'depósito no reembolsable que aparta tu lugar',
    'Pay deposit': 'Pagar depósito', 'Reserve': 'Reservar',
    'Not a hosted tour.': 'No es un tour con anfitrión.', ' No deposit and nothing to book.': ' Sin depósito y sin nada que reservar.',
    'Ask Sam about it': 'Pregúntale a Sam',
    'Online reservations have closed.': 'Las reservas en línea ya cerraron.', ' Ask Sam about a late place.': ' Pregúntale a Sam por un lugar de última hora.',
    'Call or text Sam': 'Llama o escribe a Sam', 'Next tour you can reserve': 'Próximo tour que puedes reservar',
    'New tour dates are being set. Call or text Sam at ': 'Estamos definiendo las nuevas fechas. Llama o escribe a Sam al ',
    ' to hear them first.': ' para enterarte primero.',
    'No tours are open for reservations right now': 'No hay tours abiertos para reservar en este momento',
    'Payment received: you have paid in full. A confirmation email is on its way, and Sam will be in touch soon.':
      'Pago recibido: pagaste el total. Te llegará un correo de confirmación, y Sam se pondrá en contacto pronto.',
    'Payment received. Your place is reserved, and a confirmation email is on its way. Sam will be in touch soon.':
      'Pago recibido. Tu lugar está reservado y te llegará un correo de confirmación. Sam se pondrá en contacto pronto.',
    'Payment was cancelled, so nothing was charged. You can try again below.':
      'El pago se canceló, así que no se cobró nada. Puedes intentarlo de nuevo abajo.',
    'Pay $': 'Paga $', ' today': ' hoy', 'Pay $250 deposit': 'Paga el depósito de $250',
    'Online payment is not available right now. Call or text Sam at ': 'El pago en línea no está disponible en este momento. Llama o escribe a Sam al ',
    'Opening the secure payment page…': 'Abriendo la página de pago seguro…',
    'Payment could not start.': 'No se pudo iniciar el pago.',
    ' You can also call or text Sam at ': ' También puedes llamar o escribir a Sam al ',
    'Play video: ': 'Reproducir video: '
  };
  function T(s) { return lang === 'es' && ES[s] ? ES[s] : s; }
  // Pages whose own words change with the language (the owner's helper pages are English only).
  var bilingual = /^(join|members|member|membership|messages|likes|account|admin|index|tours|how-it-works|about|testimonials|tour-videos|faq|safety|contact)\.html$/.test(page);

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function day(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function range(t) {
    var a = day(t.start), b = day(t.end);
    var same = a.getMonth() === b.getMonth();
    if (lang === 'es') return a.getDate() + (same ? '' : ' ' + MESES[a.getMonth()] + ' ') + '–' + (same ? '' : ' ') + b.getDate() + ' ' + MESES[b.getMonth()];
    return MONTHS[a.getMonth()] + ' ' + a.getDate() + '–' + (same ? '' : MONTHS[b.getMonth()] + ' ') + b.getDate();
  }
  // A tour or video's own words: data.js can give a Spanish version as name_es, blurb_es and so on.
  function L(o, k) { return (lang === 'es' && o[k + '_es']) || o[k]; }
  function label(t) { return L(t, 'name') + ', ' + range(t) + ', ' + day(t.start).getFullYear(); }

  // past = finished, info = a date only (not bookable), closed = inside the booking cutoff,
  // open = can be reserved online
  function status(t) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (day(t.end) < today) return 'past';
    if (t.bookable === false) return 'info';
    var cutoff = day(t.start); cutoff.setDate(cutoff.getDate() - D.bookingCutoffDays);
    return today > cutoff ? 'closed' : 'open';
  }
  var upcoming = D.tours.filter(function (t) { return status(t) !== 'past'; })
    .sort(function (a, b) { return day(a.start) - day(b.start); });
  var open = upcoming.filter(function (t) { return status(t) === 'open'; });

  /* ---------- header and footer ---------- */

  function switchLang() {
    var next = lang === 'es' ? 'en' : 'es';
    try { localStorage.setItem('ill_lang', next); } catch (e) {}
    var u = new URL(location.href); u.searchParams.delete('soy');
    // An owner's helper page has no Spanish: go to the sign-up page, which does.
    location.href = next === 'es' && !bilingual ? 'join.html' : u.toString();
  }

  var links = [
    ['tours.html', T('Tours')],
    ['testimonials.html', T('Testimonials')],
    ['members.html', T('Members')],
    ['membership.html', T('Membership')],
    ['about.html', T('About Sam')],
    ['faq.html', T('Questions')],
    ['contact.html', T('Contact')],
    ['account.html', T('My account')]
  ];
  var header = document.querySelector('[data-header]');
  if (header) {
    header.className = 'site-header';
    header.innerHTML =
      '<div class="wrap">' +
      '<a class="logo" href="index.html"><img src="assets/logo.png" alt="iLoveLatins home" width="768" height="205"></a>' +
      '<button class="lang-btn" type="button" lang="' + (lang === 'es' ? 'en' : 'es') + '">' + (lang === 'es' ? 'English' : 'Español') + '</button>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav">' + T('Menu') + '</button>' +
      '<nav class="nav" id="nav" aria-label="Main">' +
      links.map(function (l) {
        return '<a href="' + l[0] + '"' + (page === l[0] ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
      }).join('') +
      '<a class="btn" href="join.html">' + T('Join free') + '</a>' +
      '</nav></div>' +
      // A Spanish reader on an English-only page: say so, and point women to the Spanish sign-up.
      (lang === 'es' && !bilingual ? '<p class="lang-note" lang="es">Esta página está en inglés. ¿Eres mujer? <a href="join.html?soy=mujer">Crea tu perfil gratis, en español</a>.</p>' : '');
    header.querySelector('.lang-btn').addEventListener('click', switchLang);
    var toggle = header.querySelector('.nav-toggle');
    var nav = header.querySelector('.nav');
    toggle.addEventListener('click', function () {
      var on = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', on);
      toggle.textContent = T(on ? 'Close' : 'Menu');
    });
  }

  /* social media logo buttons: footer, home page and Contact page */
  var S = D.social || {};
  var icons = {
    Facebook: '<path fill="#fff" d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"/>',
    Instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="12" cy="12" r="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17" cy="7" r="1.2" fill="#fff"/>',
    YouTube: '<rect x="2" y="5.5" width="20" height="13" rx="4" fill="#fff"/><path fill="#f00" d="M10 9v6l5.2-3z"/>'
  };
  var follow = [['Facebook', S.facebook], ['Instagram', S.instagram], ['YouTube', D.youtubeChannel]]
    .filter(function (s) { return s[1]; })
    .map(function (s) {
      return '<a class="social-' + s[0].toLowerCase() + '" href="' + esc(s[1]) + '" target="_blank" rel="noopener" ' +
        'aria-label="iLoveLatins on ' + s[0] + '" title="' + s[0] + '">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' + icons[s[0]] + '</svg></a>';
    });
  var followRow = follow.length ? '<p class="follow"><span>' + T('Follow us') + '</span>' + follow.join('') + '</p>' : '';
  document.querySelectorAll('[data-social]').forEach(function (el) { el.outerHTML = followRow; });

  var footer = document.querySelector('[data-footer]');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="wrap"><div class="footer-grid">' +
      '<div><img src="assets/logo.png" alt="iLoveLatins" width="768" height="205">' +
      '<p>' + T('Hosted singles tours to Colombia since 2000.') + '</p>' +
      '<p>' + T('Call or text') + ' ' + esc(C.name) + ': <a href="tel:' + C.phoneLink + '">' + C.phoneDisplay + '</a><br>' +
      '<a href="mailto:' + C.email + '">' + C.email + '</a></p>' +
      followRow + '</div>' +
      '<div><h3>' + T('Tours') + '</h3><ul>' +
      '<li><a href="tours.html">' + T('Tour dates') + '</a></li>' +
      '<li><a href="tours.html#reserve">' + T('Reserve a tour') + '</a></li>' +
      '<li><a href="how-it-works.html">' + T('How it works') + '</a></li>' +
      '<li><a href="tour-videos.html">' + T('Tour videos') + '</a></li>' +
      '<li><a href="testimonials.html">' + T('Testimonials') + '</a></li></ul></div>' +
      '<div><h3>' + T('Members') + '</h3><ul>' +
      '<li><a href="join.html">' + T('Join free') + '</a></li>' +
      '<li><a href="members.html">' + T('Members') + '</a></li>' +
      '<li><a href="messages.html">' + T('Messages') + '</a></li>' +
      '<li><a href="likes.html">' + T('Likes') + '</a></li>' +
      '<li><a href="membership.html">' + T('Membership') + '</a></li>' +
      '<li><a href="account.html">' + T('My account') + '</a></li></ul></div>' +
      '<div><h3>' + T('Help') + '</h3><ul>' +
      '<li><a href="about.html">' + T('About Sam') + '</a></li>' +
      '<li><a href="faq.html">' + T('Questions') + '</a></li>' +
      '<li><a href="safety.html">' + T('Safety') + '</a></li>' +
      '<li><a href="contact.html">' + T('Contact') + '</a></li></ul></div>' +
      '</div><p class="legal">© 2000–' + new Date().getFullYear() + ' iLoveLatins. ' + T('All rights reserved.') +
      '<button class="link lang-foot" type="button">' + (lang === 'es' ? 'Read this site in English' : 'Leer este sitio en español') + '</button></p></div>';
    footer.querySelector('.lang-foot').addEventListener('click', switchLang);
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
  document.querySelectorAll('[data-hours]').forEach(function (el) { el.textContent = L(C, 'hours'); });

  /* ---------- tour tickets ---------- */
  function ticket(t, hero) {
    var st = status(t);
    var facts = '';
    if (t.packagePrice) facts += '<li>' + T('Package: ') + esc(t.packagePrice) + '</li>';
    if (t.hotel) facts += '<li>' + esc(L(t, 'hotel')) + '</li>';
    var stub;
    if (st === 'open') {
      var href = t.depositLink || ('tours.html?tour=' + encodeURIComponent(t.id) + '#reserve');
      stub =
        '<div class="ticket-deposit">$' + D.deposit + '<small>' + T('non-refundable deposit holds your place') + '</small></div>' +
        '<a class="btn" href="' + esc(href) + '">' + T(t.depositLink ? 'Pay deposit' : 'Reserve') + '</a>';
    } else if (st === 'info') {
      stub =
        '<p class="ticket-note"><strong>' + T('Not a hosted tour.') + '</strong>' + T(' No deposit and nothing to book.') + '</p>' +
        '<a class="btn btn-quiet" href="tel:' + C.phoneLink + '">' + T('Ask Sam about it') + '</a>';
    } else {
      stub =
        '<p class="ticket-note"><strong>' + T('Online reservations have closed.') + '</strong>' + T(' Ask Sam about a late place.') + '</p>' +
        '<a class="btn btn-quiet" href="tel:' + C.phoneLink + '">' + T('Call or text Sam') + '</a>';
    }
    return '<article class="ticket' + (hero ? ' ticket-hero' : '') + (st === 'closed' ? ' closed' : '') + (st === 'info' ? ' info' : '') + '">' +
      '<div class="ticket-main">' +
      (hero ? '<p class="ticket-label">' + T('Next tour you can reserve') + '</p>' : '') +
      '<div class="ticket-dates">' + range(t) + ' <span class="ticket-year">' + day(t.start).getFullYear() + '</span></div>' +
      '<h3 class="ticket-name">' + esc(L(t, 'name')) + '</h3>' +
      '<div class="ticket-city">' + esc(t.city) + (t.city === 'Barranquilla' ? ', Colombia' : '') + '</div>' +
      (hero ? '' : '<p class="ticket-blurb">' + esc(L(t, 'blurb')) + '</p>') +
      (facts ? '<ul class="ticket-facts">' + facts + '</ul>' : '') +
      '</div><div class="ticket-stub">' + stub + '</div></article>';
  }

  var next = document.querySelector('[data-next-tour]');
  if (next) {
    var pick = open[0] || upcoming.filter(function (t) { return status(t) !== 'info'; })[0];
    next.innerHTML = pick ? ticket(pick, true)
      : '<p>' + T('New tour dates are being set. Call or text Sam at ') + '<a href="tel:' + C.phoneLink + '">' + C.phoneDisplay + '</a>.</p>';
  }
  document.querySelectorAll('[data-tours]').forEach(function (el) {
    el.innerHTML = upcoming.length
      ? upcoming.map(function (t) { return ticket(t, false); }).join('')
      : '<p>' + T('New tour dates are being set. Call or text Sam at ') + '<a href="tel:' + C.phoneLink + '">' + C.phoneDisplay + '</a>' + T(' to hear them first.') + '</p>';
  });

  var select = document.querySelector('[data-tour-select]');
  if (select) {
    var wanted = new URLSearchParams(location.search).get('tour');
    select.innerHTML = open.map(function (t) {
      return '<option value="' + esc(t.id) + '"' + (t.id === wanted ? ' selected' : '') + '>' + esc(label(t)) + '</option>';
    }).join('');
    if (!open.length) select.innerHTML = '<option value="">' + T('No tours are open for reservations right now') + '</option>';
  }

  /* ---------- $250 tour deposit: card payment on Stripe ---------- */
  var dep = document.getElementById('deposit-form');
  if (dep) {
    var cfg = window.ILL_CONFIG || {};
    var out = document.getElementById('deposit-status');
    var result = document.getElementById('deposit-result');
    var back = new URLSearchParams(location.search).get('deposit');
    if (back === 'paid') {
      result.textContent = new URLSearchParams(location.search).get('kind') === 'full'
        ? T('Payment received: you have paid in full. A confirmation email is on its way, and Sam will be in touch soon.')
        : T('Payment received. Your place is reserved, and a confirmation email is on its way. Sam will be in touch soon.');
    } else if (back === 'cancelled') {
      result.className = 'form-status error';
      result.textContent = T('Payment was cancelled, so nothing was charged. You can try again below.');
    }
    // "Reserve" on a price card: pick that package in the form and jump to it.
    function pickPackage(value) {
      for (var i = 0; i < dep.package.options.length; i++) {
        if (dep.package.options[i].value === value) { dep.package.selectedIndex = i; return true; }
      }
      return false;
    }
    document.querySelectorAll('[data-package]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        pickPackage(b.getAttribute('data-package'));
        var pay = b.getAttribute('data-payment');
        if (pay) dep.querySelector('[name=payment][value=' + pay + ']').checked = true;
        payLabel();
        document.getElementById('reserve').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        setTimeout(function () { dep.name.focus({ preventScroll: true }); }, 400);
      });
    });
    var askedFor = new URLSearchParams(location.search).get('package');
    if (askedFor) pickPackage(askedFor);
    // The button says exactly what will be charged.
    function payLabel() {
      var full = dep.querySelector('[name=payment][value=full]').checked;
      var opt = dep.package.options[dep.package.selectedIndex];
      document.getElementById('pay-btn').textContent = full ? T('Pay $') + opt.getAttribute('data-price') + T(' today') : T('Pay $250 deposit');
    }
    dep.package.addEventListener('change', payLabel);
    dep.querySelectorAll('[name=payment]').forEach(function (r) { r.addEventListener('change', payLabel); });
    payLabel();
    dep.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (dep.querySelector('.hp input').value) return; // spam trap
      var btn = dep.querySelector('button[type=submit]');
      var opt = dep.tour.options[dep.tour.selectedIndex];
      if (!dep.tour.value) return;
      if (!cfg.supabaseUrl) {
        out.className = 'form-status error';
        out.textContent = T('Online payment is not available right now. Call or text Sam at ') + C.phoneDisplay + '.';
        return;
      }
      btn.disabled = true;
      out.className = 'form-status';
      out.textContent = T('Opening the secure payment page…');
      try {
        var r = await fetch(cfg.supabaseUrl + '/functions/v1/create-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey },
          body: JSON.stringify({
            tour_id: dep.tour.value, tour_label: opt.textContent,
            package: dep.package.value, payment: dep.querySelector('[name=payment]:checked').value,
            name: dep.name.value, email: dep.email.value, phone: dep.phone.value, message: dep.message.value
          })
        });
        var d = await r.json();
        if (d.url) { location.href = d.url; return; }
        throw new Error(d.error || T('Payment could not start.'));
      } catch (err) {
        btn.disabled = false;
        out.className = 'form-status error';
        out.textContent = err.message + T(' You can also call or text Sam at ') + C.phoneDisplay + '.';
      }
    });
  }

  /* ---------- tour videos: a thumbnail until pressed, then the YouTube player ---------- */
  document.querySelectorAll('[data-videos]').forEach(function (el) {
    var max = +el.getAttribute('data-videos') || D.videos.length;
    el.innerHTML = D.videos.slice(0, max).map(function (v) {
      return '<figure class="yt"><button type="button" class="yt-play" data-yt="' + esc(v.id) + '" data-title="' + esc(L(v, 'title')) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">' +
        '<span class="yt-icon" aria-hidden="true"></span><span class="sr">' + T('Play video: ') + esc(L(v, 'title')) + '</span></button>' +
        '<figcaption><strong>' + esc(L(v, 'title')) + '</strong><br>' + esc(L(v, 'when')) + '</figcaption></figure>';
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
    var es = function () { return form.getAttribute('data-lang') === 'es' || (lang === 'es' && window.ILL_LANG && window.ILL_LANG.translated); };
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
        var btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        fetch(D.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) {
            btn.disabled = false;
            if (!r.ok) {
              return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || ''); });
            }
            form.reset();
            out.textContent = es()
              ? 'Enviado. Sam te responderá pronto.'
              : 'Sent. Sam will reply by phone or email.';
          })
          .catch(function (err) {
            btn.disabled = false;
            out.className = 'form-status error';
            out.textContent = (err && err.message ? err.message + ' ' : '') +
              (es() ? 'También puedes escribir o llamar a Sam: ' : 'You can also call or text Sam: ') + C.phoneDisplay + '.';
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

  /* ---------- links to the site's own pages carry the version, so browsers never show an old copy ---------- */
  function freshen(root) {
    if (!VERSION || !root.querySelectorAll) return;
    root.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (/^(https?:|mailto:|tel:|sms:|#|javascript:)/i.test(href) || !/^[\w\-\/]*\.html(?:[?#]|$)/.test(href) || /[?&]v=/.test(href)) return;
      var hash = '', i = href.indexOf('#');
      if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
      a.setAttribute('href', href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VERSION + hash);
    });
  }
  freshen(document);
  if (window.MutationObserver) {
    new MutationObserver(function (changes) {
      changes.forEach(function (c) { c.addedNodes.forEach(function (n) { if (n.nodeType === 1) { freshen(n); if (n.matches && n.matches('a[href]')) freshen(n.parentNode); } }); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- slideshows: one big photo at a time, arrows, swipe, changes every 5 seconds ---------- */
  document.querySelectorAll('[data-slideshow]').forEach(function (box) {
    var track = box.querySelector('.slides');
    var n = track.children.length, i = 0, timer = null;
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function go(k) {
      i = (k + n) % n;
      track.scrollTo({ left: track.clientWidth * i, behavior: still ? 'auto' : 'smooth' });
    }
    box.querySelector('.prev').addEventListener('click', function () { go(i - 1); restart(); });
    box.querySelector('.next').addEventListener('click', function () { go(i + 1); restart(); });
    track.addEventListener('scroll', function () { i = Math.round(track.scrollLeft / track.clientWidth); });
    function restart() {
      clearInterval(timer);
      if (!still) timer = setInterval(function () { if (!document.hidden) go(i + 1); }, 5000);
    }
    box.addEventListener('mouseenter', function () { clearInterval(timer); });
    box.addEventListener('mouseleave', restart);
    restart();
  });

  /* ---------- private hit counter: one view per page load, one visit per browser session ---------- */
  (function () {
    var cfg = window.ILL_CONFIG || { supabaseUrl: 'https://fdhntvzctkdojldxduan.supabase.co', supabaseKey: 'sb_publishable_PVHHl1T18HF3j0kgm94Jkw_alwORgIA' };
    if (!cfg.supabaseUrl || /^(localhost|127\.)/.test(location.hostname)) return;
    if (/^(admin|account|messages|likes|member|posts|invites)\.html$/.test(page)) return; // owner and private member pages
    try { if (localStorage.getItem('ill_owner')) return; } catch (e) {} // this browser belongs to an owner
    var newVisit = false;
    try { newVisit = !sessionStorage.getItem('ill_visit'); sessionStorage.setItem('ill_visit', '1'); } catch (e) {}
    function count(p, visit) {
      fetch(cfg.supabaseUrl + '/rest/v1/rpc/count_view', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey },
        body: JSON.stringify({ p: p, new_visit: visit })
      }).catch(function () {});
    }
    count(page, newVisit);

    // Where the visit came from, counted once per visit under a made-up page name
    // such as "from-instagram.html" (the approvals page shows these separately).
    // A link ending in ?from=instagram names its own source; otherwise the
    // address of the page the visitor came from is used.
    if (newVisit) {
      var q = new URLSearchParams(location.search);
      var src = (q.get('from') || q.get('utm_source') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
      if (!src) {
        var ref = '';
        try { ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; } catch (e) {}
        if (!ref || ref === location.hostname) src = 'direct';
        else if (/instagram\./.test(ref)) src = 'instagram';
        else if (/facebook\.|fb\.(com|me)$|messenger\./.test(ref)) src = 'facebook';
        else if (/youtube\.|youtu\.be/.test(ref)) src = 'youtube';
        else if (/whatsapp\.|wa\.me/.test(ref)) src = 'whatsapp';
        else if (/google\./.test(ref)) src = 'google';
        else if (/bing\.|duckduckgo\.|yahoo\./.test(ref)) src = 'other-search';
        else if (/(^|\.)t\.co$|twitter\.|x\.com$/.test(ref)) src = 'x';
        else if (/tiktok\./.test(ref)) src = 'tiktok';
        else src = 'other-site';
      }
      count('from-' + src + '.html', false);
    }
  })();
})();
