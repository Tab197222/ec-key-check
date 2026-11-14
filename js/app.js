/* Shared code for the member pages: connection, language, small helpers. */
window.App = (function () {
  var cfg = window.ILL_CONFIG || {};
  // A password-reset link arrives with this marker; read it before the client clears it.
  var recovery = /type=recovery/.test(location.hash);
  var ready = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  var sb = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

  /* ---------- language ---------- */
  var STR = {
    en: {
      setup: 'Member sign-up is being set up. To join now, call or text Sam at 832-385-4161.',
      lang: 'Español',
      loading: 'Loading…',
      // join
      tab_signup: 'Create account', tab_login: 'Log in',
      email: 'Email', password: 'Password', password_hint: 'At least 8 characters.',
      adult: 'I am 18 or over, and I will only upload photos and videos of myself.',
      signup_btn: 'Create my account', login_btn: 'Log in', forgot: 'Forgot your password?',
      check_email: 'Check your email and press the confirmation link to finish creating your account.',
      reset_sent: 'If that email has an account, a reset link is on its way.',
      need_email: 'Type your email above first.',
      // account
      st_none: 'Fill in your profile below to get started.',
      st_draft: 'Your profile is a draft. Add at least one photo, then send it for approval.',
      st_pending: 'Your profile is waiting for approval. You will be able to browse and message once it is approved.',
      st_approved: 'Your profile is live.',
      st_rejected: 'Your profile was not approved. Update it and send it again, or contact Sam.',
      profile_h: 'Your profile', i_am: 'I am', man: 'A man', woman: 'A woman',
      first_name: 'First name', birthdate: 'Date of birth', city: 'City', country: 'Country',
      about: 'About you, and who you hope to meet', save: 'Save profile', saved: 'Saved.',
      locked: 'To change these after sending your profile, contact Sam.',
      media_h: 'Photos and videos',
      media_hint: 'Up to 8 photos (JPG, PNG or WebP, 10 MB each) and 2 videos (MP4, MOV or WebM, 50 MB each). Each one is checked before other members see it.',
      add_photo: 'Add photos', add_video: 'Add a video', uploading: 'Uploading',
      main: 'Main photo', make_main: 'Make main', remove: 'Remove', waiting: 'Waiting for approval',
      too_big: 'is too large.', bad_type: 'is not a supported file type.',
      submit: 'Send my profile for approval', submitted: 'Sent. You will hear back soon.',
      member_h: 'Membership',
      free_woman: 'Membership is free for women. You have full access.',
      plan_free: 'You are on the free plan: one message a week.',
      plan_active: 'Your membership is active until',
      plan_ended: 'Your membership has ended.',
      upgrade: 'See membership plans', billing: 'Manage billing or cancel',
      paid_thanks: 'Thank you. Your membership will show here within a minute.',
      logout: 'Log out', delete: 'Delete my account',
      delete_confirm: 'Delete your account, profile, photos, videos and messages for good?',
      delete_sub: 'Cancel your membership first with "Manage billing or cancel", then delete your account.',
      new_password: 'Choose a new password', set_password: 'Save new password',
      // members
      show: 'Show', women: 'Women', men: 'Men', city_filter: 'City', any_age: 'Any age',
      none_yet: 'No profiles to show here yet. Approved profiles appear on this page.',
      join_free: 'Join free', login_to_view: 'Log in to see full profiles and send messages.',
      need_approval: 'Full profiles open once your own profile is approved.',
      not_found: 'This profile is not available.',
      message: 'Send a message', report: 'Report', block: 'Block',
      report_prompt: 'What is wrong with this profile?', reported: 'Reported. Thank you.',
      block_confirm: 'Block this member? You will no longer be able to message each other.', blocked: 'Blocked.',
      // messages
      no_convos: 'No conversations yet. Open a profile and send a message.',
      write: 'Write a message', send: 'Send',
      r_not_approved: 'You can message once your profile is approved.',
      r_unavailable: 'This member is not available for messages.',
      r_limit: 'Free members can send one message a week. Upgrade for unlimited messages.',
      // membership
      choose: 'Choose', current: 'Your current plan', login_first: 'Log in or create an account first.',
      already: 'You already have an active membership.',
      // profile details
      details_h: 'About me', height: 'Height', or: 'or', has_children: 'Children', wants_children: 'Wants children',
      religion: 'Religion', english: 'English', looking_for: 'Looking for', any: 'Any', choose_one: 'Choose…',
      verified: 'Verified', verified_note: 'Sam has checked this person is real.',
      get_verified: 'Get a Verified badge: send Sam a selfie holding a paper with today’s date and your first name, by WhatsApp or email. Verified profiles get more replies.',
      online: 'Online now', today: 'Active today', week: 'Active this week',
      mark_verified: 'Mark as verified', unmark_verified: 'Remove verified badge',
      // likes
      like: 'I’m interested', liked: 'Interested ✓', mutual: 'You like each other',
      likes_h: 'Likes', who_likes_me: 'Who likes me', i_like: 'People I like',
      likes_count: 'members like you.', likes_upgrade: 'Upgrade to see who they are.',
      no_likes: 'Nobody yet. A complete profile with good photos gets more likes.',
      no_i_like: 'You haven’t liked anyone yet. Open a profile and press “I’m interested”.',
      // translation
      translate: 'Translate', original: 'Show original', translating: 'Translating…',
      translate_failed: 'Translation is not available right now.',
      locked_preview: 'New message: upgrade to read',
      locked_bubble: 'Message locked',
      locked_one: 'sent you a message. Become a member to read it and reply.',
      locked_many: 'sent you {n} messages. Become a member to read them and reply.',
      unlock_btn: 'Upgrade to read',
      unread_badge: 'unread messages'
    },
    es: {
      setup: 'El registro de miembros se está configurando. Para unirte ahora, llama o escribe a Sam al 832-385-4161.',
      lang: 'English',
      loading: 'Cargando…',
      tab_signup: 'Crear cuenta', tab_login: 'Entrar',
      email: 'Correo electrónico', password: 'Contraseña', password_hint: 'Mínimo 8 caracteres.',
      adult: 'Tengo 18 años o más y solo subiré fotos y videos míos.',
      signup_btn: 'Crear mi cuenta', login_btn: 'Entrar', forgot: '¿Olvidaste tu contraseña?',
      check_email: 'Revisa tu correo y pulsa el enlace de confirmación para terminar de crear tu cuenta.',
      reset_sent: 'Si ese correo tiene una cuenta, el enlace para cambiar la contraseña va en camino.',
      need_email: 'Escribe primero tu correo arriba.',
      st_none: 'Completa tu perfil para empezar.',
      st_draft: 'Tu perfil es un borrador. Agrega al menos una foto y envíalo para aprobación.',
      st_pending: 'Tu perfil está esperando aprobación. Podrás ver perfiles y enviar mensajes cuando sea aprobado.',
      st_approved: 'Tu perfil está publicado.',
      st_rejected: 'Tu perfil no fue aprobado. Actualízalo y envíalo de nuevo, o contacta a Sam.',
      profile_h: 'Tu perfil', i_am: 'Soy', man: 'Hombre', woman: 'Mujer',
      first_name: 'Nombre', birthdate: 'Fecha de nacimiento', city: 'Ciudad', country: 'País',
      about: 'Cuéntanos de ti y a quién te gustaría conocer', save: 'Guardar perfil', saved: 'Guardado.',
      locked: 'Para cambiar estos datos después de enviar tu perfil, contacta a Sam.',
      media_h: 'Fotos y videos',
      media_hint: 'Hasta 8 fotos (JPG, PNG o WebP, 10 MB cada una) y 2 videos (MP4, MOV o WebM, 50 MB cada uno). Revisamos cada archivo antes de que otros miembros lo vean.',
      add_photo: 'Agregar fotos', add_video: 'Agregar un video', uploading: 'Subiendo',
      main: 'Foto principal', make_main: 'Hacer principal', remove: 'Quitar', waiting: 'Esperando aprobación',
      too_big: 'es demasiado grande.', bad_type: 'no es un tipo de archivo permitido.',
      submit: 'Enviar mi perfil para aprobación', submitted: 'Enviado. Pronto tendrás respuesta.',
      member_h: 'Membresía',
      free_woman: 'La membresía es gratis para mujeres. Tienes acceso completo.',
      plan_free: 'Tienes el plan gratis: un mensaje por semana.',
      plan_active: 'Tu membresía está activa hasta',
      plan_ended: 'Tu membresía terminó.',
      upgrade: 'Ver planes de membresía', billing: 'Administrar pago o cancelar',
      paid_thanks: 'Gracias. Tu membresía aparecerá aquí en un minuto.',
      logout: 'Salir', delete: 'Eliminar mi cuenta',
      delete_confirm: '¿Eliminar para siempre tu cuenta, perfil, fotos, videos y mensajes?',
      delete_sub: 'Primero cancela tu membresía en "Administrar pago o cancelar" y luego elimina tu cuenta.',
      new_password: 'Elige una contraseña nueva', set_password: 'Guardar contraseña',
      show: 'Mostrar', women: 'Mujeres', men: 'Hombres', city_filter: 'Ciudad', any_age: 'Cualquier edad',
      none_yet: 'Todavía no hay perfiles aquí. Los perfiles aprobados aparecen en esta página.',
      join_free: 'Unirme gratis', login_to_view: 'Entra para ver perfiles completos y enviar mensajes.',
      need_approval: 'Los perfiles completos se abren cuando tu propio perfil sea aprobado.',
      not_found: 'Este perfil no está disponible.',
      message: 'Enviar mensaje', report: 'Reportar', block: 'Bloquear',
      report_prompt: '¿Qué problema tiene este perfil?', reported: 'Reportado. Gracias.',
      block_confirm: '¿Bloquear a este miembro? Ya no podrán enviarse mensajes.', blocked: 'Bloqueado.',
      no_convos: 'Todavía no tienes conversaciones. Abre un perfil y envía un mensaje.',
      write: 'Escribe un mensaje', send: 'Enviar',
      r_not_approved: 'Podrás enviar mensajes cuando tu perfil sea aprobado.',
      r_unavailable: 'Este miembro no está disponible para mensajes.',
      r_limit: 'Los miembros gratis pueden enviar un mensaje por semana. Mejora tu plan para mensajes ilimitados.',
      choose: 'Elegir', current: 'Tu plan actual', login_first: 'Primero entra o crea una cuenta.',
      already: 'Ya tienes una membresía activa.',
      details_h: 'Sobre mí', height: 'Estatura', or: 'o', has_children: 'Hijos', wants_children: 'Quiere hijos',
      religion: 'Religión', english: 'Inglés', looking_for: 'Busca', any: 'Cualquiera', choose_one: 'Elige…',
      verified: 'Verificado', verified_note: 'Sam comprobó que esta persona es real.',
      get_verified: 'Obtén la insignia de Verificado: envía a Sam una selfie sosteniendo un papel con la fecha de hoy y tu nombre, por WhatsApp o correo. Los perfiles verificados reciben más respuestas.',
      online: 'En línea', today: 'Activo hoy', week: 'Activo esta semana',
      mark_verified: 'Marcar como verificado', unmark_verified: 'Quitar verificado',
      like: 'Me interesa', liked: 'Te interesa ✓', mutual: 'Se gustan mutuamente',
      likes_h: 'Me gusta', who_likes_me: 'A quién le gustas', i_like: 'Personas que me gustan',
      likes_count: 'miembros están interesados en ti.', likes_upgrade: 'Mejora tu plan para ver quiénes son.',
      no_likes: 'Nadie todavía. Un perfil completo con buenas fotos recibe más interés.',
      no_i_like: 'Todavía no has marcado a nadie. Abre un perfil y pulsa «Me interesa».',
      translate: 'Traducir', original: 'Ver original', translating: 'Traduciendo…',
      translate_failed: 'La traducción no está disponible ahora.',
      locked_preview: 'Mensaje nuevo: mejora tu plan para leerlo',
      locked_bubble: 'Mensaje bloqueado',
      locked_one: 'te envió un mensaje. Hazte miembro para leerlo y responder.',
      locked_many: 'te envió {n} mensajes. Hazte miembro para leerlos y responder.',
      unlock_btn: 'Mejorar para leer',
      unread_badge: 'mensajes sin leer'
    }
  };
  var lang = localStorage.getItem('ill_lang') ||
    ((navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en');
  if (new URLSearchParams(location.search).get('soy') === 'mujer') lang = 'es';

  function t(key) { return STR[lang][key] || STR.en[key] || key; }
  function translate(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
  }
  function langButton() {
    var b = document.querySelector('[data-lang-toggle]');
    if (!b) return;
    b.textContent = t('lang');
    b.addEventListener('click', function () {
      localStorage.setItem('ill_lang', lang === 'es' ? 'en' : 'es');
      var u = new URL(location.href); u.searchParams.delete('soy'); location.href = u.toString();
    });
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function say(el, text, isError) {
    if (!el) return;
    el.className = 'form-status' + (isError ? ' error' : '');
    el.textContent = text || '';
  }
  async function user() {
    var r = await sb.auth.getSession();
    return r.data.session ? r.data.session.user : null;
  }
  async function requireUser() {
    var u = await user();
    if (!u) {
      location.replace('join.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
      return new Promise(function () {}); // never resolves: the page is navigating away
    }
    return u;
  }
  async function myProfile(uid) {
    var r = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    return r.data;
  }
  // Turns stored file paths into temporary viewable links.
  async function signed(paths) {
    var out = {};
    paths = paths.filter(Boolean);
    if (!paths.length) return out;
    var r = await sb.storage.from('media').createSignedUrls(paths, 3600);
    (r.data || []).forEach(function (d) { if (d.signedUrl) out[d.path] = d.signedUrl; });
    return out;
  }
  /* ---------- profile detail labels ---------- */
  var OPTS = {
    has_children: { no: ['No children', 'Sin hijos'], yes_home: ['Has children, living at home', 'Tiene hijos que viven en casa'], yes_away: ['Has children, not at home', 'Tiene hijos que no viven en casa'] },
    wants_children: { yes: ['Wants children', 'Quiere hijos'], no: ['Doesn’t want children', 'No quiere hijos'], maybe: ['Maybe wants children', 'Tal vez quiere hijos'] },
    religion: { catholic: ['Catholic', 'Católica'], christian: ['Christian', 'Cristiana'], other: ['Other religion', 'Otra religión'], none: ['Not religious', 'No religiosa'] },
    english: { none: ['No English', 'No habla inglés'], basic: ['Basic English', 'Inglés básico'], conversational: ['Conversational English', 'Inglés conversacional'], fluent: ['Fluent English', 'Inglés fluido'], native: ['Native English', 'Inglés nativo'] },
    looking_for: { dating: ['Dating', 'Citas'], serious: ['A serious relationship', 'Una relación seria'], marriage: ['Marriage', 'Matrimonio'], friendship: ['Friendship', 'Amistad'] }
  };
  function opt(field, value) {
    var o = OPTS[field] && OPTS[field][value];
    return o ? o[lang === 'es' ? 1 : 0] : '';
  }
  // <option> list for a select, with a blank first choice.
  function options(field, blankKey) {
    return '<option value="">' + esc(t(blankKey || 'choose_one')) + '</option>' +
      Object.keys(OPTS[field]).map(function (k) { return '<option value="' + k + '">' + esc(opt(field, k)) + '</option>'; }).join('');
  }
  function badges(p) {
    return (p.verified ? '<span class="badge-verified" title="' + esc(t('verified_note')) + '">✓ ' + esc(t('verified')) + '</span>' : '') +
      (p.activity ? '<span class="activity activity-' + esc(p.activity) + '">' + esc(t(p.activity)) + '</span>' : '');
  }
  function heightText(cm) {
    if (!cm) return '';
    var inches = Math.round(cm / 2.54);
    return cm + ' cm (' + Math.floor(inches / 12) + '′' + (inches % 12) + '″)';
  }
  // The profile facts as a list, skipping anything not filled in.
  function facts(p) {
    var rows = [];
    if (p.looking_for) rows.push([t('looking_for'), opt('looking_for', p.looking_for)]);
    if (p.height_cm) rows.push([t('height').replace(' (cm)', ''), heightText(p.height_cm)]);
    if (p.english) rows.push([t('english'), opt('english', p.english)]);
    if (p.has_children) rows.push([t('has_children'), opt('has_children', p.has_children)]);
    if (p.wants_children) rows.push([t('wants_children'), opt('wants_children', p.wants_children)]);
    if (p.religion) rows.push([t('religion'), opt('religion', p.religion)]);
    return rows.length ? '<dl class="facts">' + rows.map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    }).join('') + '</dl>' : '';
  }

  /* ---------- "last active": at most once every 2 minutes ---------- */
  async function touch() {
    try {
      var last = +sessionStorage.getItem('ill_seen') || 0;
      if (Date.now() - last < 120000) return;
      if (!(await user())) return;
      sessionStorage.setItem('ill_seen', Date.now());
      await sb.rpc('touch_last_seen');
    } catch (e) { /* not important enough to show */ }
  }

  /* ---------- unread messages: a number next to "My account" in the menu, updated instantly ---------- */
  async function unreadBadge() {
    try {
      var u = await user();
      var link = document.querySelector('.nav a[href="account.html"]');
      if (!u || !link) return;
      var show = async function () {
        var r = await sb.rpc('my_unread_count');
        var n = r.data || 0;
        var b = link.querySelector('.nav-badge');
        if (!n) { if (b) b.remove(); return; }
        if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; link.appendChild(b); }
        b.textContent = n > 99 ? '99+' : n;
        b.setAttribute('aria-label', n + ' ' + t('unread_badge'));
      };
      await show();
      sb.channel('badge-' + u.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_pings', filter: 'user_id=eq.' + u.id }, show)
        .subscribe();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) show(); });
    } catch (e) { /* the badge is a nicety */ }
  }

  function start(fn) {
    document.documentElement.lang = lang;
    translate();
    langButton();
    var root = document.querySelector('[data-app]');
    if (!ready) {
      var fallback = document.querySelector('[data-fallback]');
      if (fallback) { fallback.hidden = false; if (root) root.closest('section').remove(); }
      else if (root) root.innerHTML = '<p class="notice">' + esc(t('setup')) + '</p>';
      return;
    }
    touch();
    unreadBadge();
    Promise.resolve(fn()).catch(function (e) {
      console.error(e);
      if (root) root.insertAdjacentHTML('afterbegin', '<p class="form-status error">' + esc(e.message || e) + '</p>');
    });
  }

  return { opt: opt, options: options, badges: badges, facts: facts, heightText: heightText,
    sb: sb, ready: ready, recovery: recovery, t: t, translate: translate, esc: esc, say: say, lang: function () { return lang; },
    user: user, requireUser: requireUser, myProfile: myProfile, signed: signed, start: start };
})();
