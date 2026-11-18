"""Keep the Spanish versions of the public pages in step with the English.

For each public page this:
  1. lists every piece of English text on it   -> tools/strings/<page>.en.json
  2. reads the Spanish for those pieces from    tools/strings/<page>.es.json
  3. reports any piece with no Spanish yet (it shows in English on the site)
  4. writes the file the site loads             -> js/es/<page>.js

To translate a new or edited piece: run this, look up the missing code in
<page>.en.json, add the same code with its Spanish to <page>.es.json, run again.

Run from the site folder:  python tools/translations.py
"""
import functools, html, http.server, json, os, pathlib, re, subprocess, sys, tempfile, threading

PAGES = ['index', 'tours', 'how-it-works', 'about', 'testimonials', 'tour-videos', 'faq', 'safety', 'contact']
BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Microsoft\Edge\Application\msedge.exe']
browser = next((b for b in BROWSERS if os.path.exists(b)), None)
if not browser:
    sys.exit('Could not find Chrome or Edge.')

strings = pathlib.Path('tools/strings'); strings.mkdir(exist_ok=True)
out = pathlib.Path('js/es'); out.mkdir(exist_ok=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory='.'))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:%d/tools/extract.html?page=' % server.server_address[1]

tags = lambda s: sorted(re.findall(r'<[^>]+>', s))
problems = 0
with tempfile.TemporaryDirectory() as tmp:
    for name in PAGES:
        dom = subprocess.run([browser, '--headless=new', '--disable-gpu', '--virtual-time-budget=6000',
                              '--user-data-dir=' + os.path.join(tmp, 'p'), '--dump-dom', base + name + '.html'],
                             capture_output=True, timeout=120).stdout.decode('utf-8', 'replace')
        m = re.search(r'<pre id="out">JSON:(.*?)</pre>', dom, re.S)
        if not m:
            sys.exit('Could not read ' + name + '.html')
        en = json.loads(html.unescape(m.group(1)))
        (strings / (name + '.en.json')).write_text(json.dumps(en, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
        es_file = strings / (name + '.es.json')
        es = json.loads(es_file.read_text(encoding='utf-8')) if es_file.exists() else {}
        missing = [k for k in en if not es.get(k)]
        broken = [k for k in en if es.get(k) and tags(en[k]) != tags(es[k])]
        for k in broken:
            print('  %s %s: the Spanish does not keep the same <tags> as the English' % (name, k))
        use = {k: es[k] for k in en if es.get(k) and k not in broken}
        (out / (name + '.js')).write_text(
            '/* Spanish for %s.html. Made by tools/translations.py from tools/strings/%s.es.json: edit that file, not this one. */\n'
            'window.ILL_LANG.apply(%s);\n' % (name, name, json.dumps(use, ensure_ascii=False, separators=(',', ':'))),
            encoding='utf-8', newline='\n')
        problems += len(missing) + len(broken)
        print('%-14s %3d pieces, %3d in Spanish, %d missing%s' % (name, len(en), len(use), len(missing),
              (': ' + ', '.join(missing[:6]) + (' …' if len(missing) > 6 else '')) if missing else ''))
print('All pages fully translated.' if not problems else '%d pieces still show in English.' % problems)
