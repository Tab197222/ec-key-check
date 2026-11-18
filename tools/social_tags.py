"""Add share-preview tags to every public page.

These tags give Facebook, WhatsApp, Instagram, X and iMessage a title, a
description and a picture to show when someone pastes a link to the site.
The title and description are copied from each page's own <title> and
description, so edit those and run this again to refresh the tags.

Private pages (marked noindex) are skipped.
When the site moves to ilovelatins.com, change SITE below and run it again.
Run from the site folder:  python tools/social_tags.py
"""
import io, glob, re, time

SITE = 'https://tab197222.github.io/ec-key-check/'
IMAGE = 'assets/photos/banner-dream-come-true.jpg'
IMAGE_SIZE = (1400, 788)
IMAGE_ALT = 'Sam with a smiling woman: iLoveLatins makes your dream come true'

START = '  <!-- share preview: made by tools/social_tags.py -->\n'
END = '  <!-- end share preview -->\n'
block = re.compile(re.escape(START) + r'.*?' + re.escape(END), re.S)
title = re.compile(r'<title>(.*?)</title>', re.S)
description = re.compile(r'[ \t]*<meta name="description" content="(.*?)">\n')


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
    clean = block.sub('', s)
    t, d = title.search(clean), description.search(clean)
    if 'content="noindex"' in clean or not t or not d:
        s2 = clean
    else:
        url = SITE if path == 'index.html' else SITE + path
        tags = START + ''.join('  ' + line + '\n' for line in [
            '<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="iLoveLatins">',
            '<meta property="og:title" content="%s">' % t.group(1).strip().replace('"', '&quot;'),
            '<meta property="og:description" content="%s">' % d.group(1),
            '<meta property="og:url" content="%s">' % url,
            '<meta property="og:image" content="%s">' % (SITE + IMAGE),
            '<meta property="og:image:width" content="%d">' % IMAGE_SIZE[0],
            '<meta property="og:image:height" content="%d">' % IMAGE_SIZE[1],
            '<meta property="og:image:alt" content="%s">' % IMAGE_ALT,
            '<meta name="twitter:card" content="summary_large_image">',
        ]) + END
        s2 = clean[:d.end()] + tags + clean[d.end():]
    if s2 != s:
        write(path, s2)
        print('tagged', path)
print('done')
