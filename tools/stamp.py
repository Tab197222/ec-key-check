"""Stamp every page's script and stylesheet links with a fresh version number.

Browsers keep saved copies of js/ and css/ files. Changing the ?v= number after
an update makes every visitor's browser fetch the new files instead.
Run from the site folder before publishing:  python tools/stamp.py
"""
import io, glob, re, time

version = time.strftime('%Y%m%d%H%M')
pattern = re.compile(r'((?:src|href)="(?:js|css)/[^"?]+\.(?:js|css))(?:\?v=\d+)?"')


def write(path, text):
    # OneDrive can lock a file for a moment while it syncs: try again for up to 15 seconds.
    for _ in range(15):
        try:
            with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(text)
            return
        except OSError:
            time.sleep(1)
    raise OSError('could not write ' + path)


for path in sorted(glob.glob('*.html')):
    s = io.open(path, encoding='utf-8').read()
    s2 = s.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
                   '<script src="js/vendor/supabase.js"></script>')
    s2 = pattern.sub(lambda m: m.group(1) + '?v=' + version + '"', s2)
    if s2 != s:
        write(path, s2)
        print('stamped', path)
print('version', version)
