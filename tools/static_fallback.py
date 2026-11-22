"""Write the phone number, tour dates and video list into the page files themselves.

The site's script (js/site.js) fills these in from js/data.js when a page loads. Search
tools, link previews and AI assistants often read a page WITHOUT running its script, and
would see no phone number and no dates. This writes a copy into the HTML so they do.
Visitors notice no change: the script still replaces the copy with fresh content.

**Run this after changing tours, videos or contact details in js/data.js:**
    python tools/static_fallback.py
    python tools/translations.py     (the Spanish must follow any changed text)

What it does:
  1. Contact links: adds the real link (tel:, sms:, mailto:, WhatsApp, YouTube) to every
     data-phone / data-sms / data-email / data-whatsapp / data-yt-channel link that has
     none, and writes the number, email or opening hours into the ones that are empty.
     It does not change a link that already has one, so after changing the phone number
     or email in js/data.js, search the pages for the old value as well.
  2. Tour cards and videos: opens each page in Chrome, lets the script run, and copies
     what it wrote into the page, between <!--fallback--> marks (replaced on each run).
"""
import functools, html, http.server, io, glob, json, os, pathlib, re, subprocess, sys, tempfile, threading

data = io.open('js/data.js', encoding='utf-8').read()


def value(name):
    m = re.search(r"\b%s:\s*'([^']*)'" % name, data)
    if not m:
        sys.exit('Could not find %s in js/data.js' % name)
    return m.group(1)


PHONE, PHONE_LINK, EMAIL = value('phoneDisplay'), value('phoneLink'), value('email')
LINKS = {  # attribute: (address, words to put in an empty link)
    'data-phone': ('tel:' + PHONE_LINK, PHONE),
    'data-sms': ('sms:' + PHONE_LINK, PHONE),
    'data-email': ('mailto:' + EMAIL, EMAIL),
    'data-whatsapp': (value('whatsappGroup'), 'WhatsApp'),
    'data-yt-channel': (value('youtubeChannel'), 'YouTube'),
}
HOURS = {'en': value('hours'), 'es': value('hours_es')}


def contact(text, lang='en'):
    """Fill in contact links in a page, or in one piece of a page's text."""
    def link(m):
        tag, empty = m.group(1), m.group(2)
        for attr, (href, words) in LINKS.items():
            if re.search(r'\b%s\b' % attr, tag):
                if 'href=' not in tag:
                    tag = re.sub(r'\b%s(="")?' % attr, lambda a: a.group(0) + ' href="%s"' % href, tag, count=1)
                return tag + (words + '</a>' if empty else '')
        return m.group(0)
    text = re.sub(r'(<a\b[^>]*>)(\s*</a>)?', link, text)
    return re.sub(r'(<span\b[^>]*\bdata-hours\b[^>]*>)\s*(</span>)', lambda m: m.group(1) + HOURS[lang] + m.group(2), text)


if __name__ == '__main__':
    BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
                r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
                r'C:\Program Files\Microsoft\Edge\Application\msedge.exe']
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        sys.exit('Could not find Chrome or Edge.')

    # 1. contact links
    for path in sorted(glob.glob('*.html')):
        s = io.open(path, encoding='utf-8').read()
        s2 = contact(s)
        if s2 != s:
            io.open(path, 'w', encoding='utf-8', newline='\n').write(s2)
            print('contact details written into', path)

    # 2. tour cards and videos
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass

    class Server(http.server.ThreadingHTTPServer):
        def handle_error(self, request, client_address): pass  # the browser closing early is not an error

    server = Server(('127.0.0.1', 0), functools.partial(Quiet, directory='.'))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:%d/tools/prerender.html?page=' % server.server_address[1]
    box = re.compile(r'(<(\w+)\b[^>]*\bdata-(?:tours|next-tour|videos)\b[^>]*>)(?:<!--fallback-->.*?<!--/fallback-->)?', re.S)

    with tempfile.TemporaryDirectory() as tmp:
        for path in sorted(glob.glob('*.html')):
            s = io.open(path, encoding='utf-8').read()
            if not box.search(s):
                continue
            dom = subprocess.run([browser, '--headless=new', '--disable-gpu', '--virtual-time-budget=9000',
                                  '--user-data-dir=' + os.path.join(tmp, 'p'), '--dump-dom', base + path],
                                 capture_output=True, timeout=120).stdout.decode('utf-8', 'replace')
            m = re.search(r'<pre id="out">JSON:(.*?)</pre>', dom, re.S)
            if not m:
                sys.exit('Could not read ' + path)
            made = json.loads(html.unescape(m.group(1)))
            if len(made) != len(box.findall(s)):
                sys.exit('Unexpected number of tour/video boxes in ' + path)
            parts = iter(made)

            def fill(b):
                tag = b.group(1)
                if 'data-keep' not in tag:           # data-keep: js/lang.js leaves these words alone
                    tag = tag[:-1] + ' data-keep>'
                inner = re.sub(r'[?&]v=\d+', '', next(parts))            # version stamps on links
                inner = re.sub(r'<!--.*?-->', '', inner, flags=re.S).replace('\n', ' ')
                return tag + '<!--fallback-->' + inner + '<!--/fallback-->'
            s2 = box.sub(fill, s)
            if s2 != s:
                io.open(path, 'w', encoding='utf-8', newline='\n').write(s2)
                print('tours/videos written into', path)
    print('done. Now run: python tools/translations.py')
