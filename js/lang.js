/*
  Language for the public pages: English or Spanish.

  The pages are written in English. When a visitor has chosen Spanish, this file
  loads the page's Spanish words from js/es/<page>.json and swaps them in, piece by
  piece, before the rest of the site's scripts run.

  Each piece of English text (a heading, a paragraph, a button) is found by a short
  code made from its exact words. If the English is edited later, that one piece
  shows in English until its Spanish is added again:
      python tools/translations.py
  lists what is missing and rebuilds the Spanish files.
*/
(function () {
  var page = location.pathname.split('/').pop() || 'index.html';
  var lang = null;
  try { lang = localStorage.getItem('ill_lang'); } catch (e) {}
  // The language button reloads the page with ?lang=es or ?lang=en: that always wins.
  var asked = new URLSearchParams(location.search).get('lang');
  if (asked === 'es' || asked === 'en') { lang = asked; try { localStorage.setItem('ill_lang', asked); } catch (e) {} }
  if (new URLSearchParams(location.search).get('soy') === 'mujer' && !lang) {
    lang = 'es'; // she arrived from a Spanish invitation: stay in Spanish on the next pages too
    try { localStorage.setItem('ill_lang', 'es'); } catch (e) {}
  }
  if (lang !== 'es' && lang !== 'en') lang = (navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';

  var BLOCK = 'p,div,section,article,ul,ol,li,h1,h2,h3,h4,h5,h6,figure,figcaption,form,table,thead,tbody,tr,td,th,' +
    'details,summary,blockquote,label,header,footer,main,nav,aside,dl,dt,dd,fieldset,legend,select,option,button';
  var ATOM = 'input,textarea,img,video,iframe,svg';
  var ATTRS = ['placeholder', 'alt', 'title', 'aria-label'];

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function escText(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function code(s) { // a short code for a piece of text (FNV-1a)
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }
  var box = null;
  function plain(html) { box = box || document.createElement('textarea'); box.innerHTML = html; return box.value; }

  // Calls each(kind, node, english, attributeName) for every piece of text under root.
  function walk(el, each) {
    if (el.matches('script,style,noscript,[data-keep]')) return;
    if (el.matches(ATOM)) { attrs(el, each); return; }
    attrs(el, each);
    if (!el.querySelector(BLOCK + ',' + ATOM)) {
      var html = norm(el.innerHTML);
      if (/[A-Za-z]/.test(el.textContent)) each('html', el, html);
      el.querySelectorAll('*').forEach(function (c) { attrs(c, each); });
      return;
    }
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) { if (/[A-Za-z]/.test(n.nodeValue)) each('text', n, escText(norm(n.nodeValue))); }
      else if (n.nodeType === 1) walk(n, each);
    });
  }
  function attrs(el, each) {
    ATTRS.forEach(function (a) {
      var v = el.getAttribute(a);
      if (v && /[A-Za-z]/.test(v)) each('attr', el, escText(norm(v)), a);
    });
  }
  function pieces(doc, each) {
    var t = doc.querySelector('title');
    if (t) each('html', t, norm(t.innerHTML));
    walk(doc.body, each);
  }

  window.ILL_LANG = {
    lang: lang, page: page, translated: false,
    // Used by tools/extract.html to list every piece of English on a page.
    list: function (doc) {
      var out = {};
      pieces(doc, function (kind, node, en) { out[code(en)] = en; });
      return out;
    },
    // Swaps in a page's Spanish (the contents of js/es/<page>.json).
    apply: function (dict) {
      pieces(document, function (kind, node, en, attr) {
        var es = dict[code(en)];
        if (!es) return;
        if (kind === 'html') node.innerHTML = es;
        else if (kind === 'attr') node.setAttribute(attr, plain(es));
        else {
          var v = node.nodeValue;
          node.nodeValue = v.match(/^\s*/)[0] + plain(es) + v.match(/\s*$/)[0];
        }
      });
      document.documentElement.lang = 'es';
      window.ILL_LANG.translated = true;
    }
  };

  // The pages that have a Spanish file.
  var PAGES = /^(index|tours|how-it-works|about|testimonials|tour-videos|faq|safety|contact)\.html$/;
  if (lang === 'es' && PAGES.test(page)) {
    var v = '';
    try { v = new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (e) {}
    try {
      var x = new XMLHttpRequest();
      x.open('GET', 'js/es/' + page.replace('.html', '.json') + (v ? '?v=' + v : ''), false); // wait for it: the swap must happen before site.js runs
      x.send();
      if (x.status === 200) window.ILL_LANG.apply(JSON.parse(x.responseText));
    } catch (e) {}
  }
})();
