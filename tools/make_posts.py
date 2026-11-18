"""Turn each card in tools/social-cards.html into a picture in assets/social/.

Uses Chrome (or Microsoft Edge) to photograph each card, then saves it as a JPG.
Needs the Pillow library once:  pip install pillow
Run from the site folder:  python tools/make_posts.py
"""
import os, pathlib, re, subprocess, sys, tempfile, time
from PIL import Image

BROWSERS = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Microsoft\Edge\Application\msedge.exe']
browser = next((b for b in BROWSERS if os.path.exists(b)), None)
if not browser:
    sys.exit('Could not find Edge or Chrome.')

page = pathlib.Path('tools/social-cards.html').resolve()
names = re.findall(r'data-name="([^"]+)"', page.read_text(encoding='utf-8'))
out = pathlib.Path('assets/social')
out.mkdir(parents=True, exist_ok=True)

with tempfile.TemporaryDirectory() as tmp:
    for i, name in enumerate(names, 1):
        shot = os.path.join(tmp, name + '.png')
        subprocess.run([browser, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--force-device-scale-factor=1', '--window-size=1080,1350',
                        '--virtual-time-budget=8000', '--user-data-dir=' + os.path.join(tmp, 'profile'),
                        '--screenshot=' + shot, page.as_uri() + '?n=%d' % i],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
        for _ in range(60):  # the browser can return a moment before the file is written
            if os.path.exists(shot) and os.path.getsize(shot):
                break
            time.sleep(0.5)
        time.sleep(0.5)
        img = Image.open(shot).convert('RGB')
        if img.size != (1080, 1350):
            img = img.crop((0, 0, 1080, 1350))
        img.save(out / (name + '.jpg'), quality=90, optimize=True)
        print('made', name + '.jpg', img.size)
