"""Build the Humanverse v3 prototype into a single HTML page.

Edit the sources in this folder, then run from the repository root:

    python3 prototype/src/build.py

That writes prototype/index.html (Polish by default, English in the language switch).

- body.html: page markup with the English copy; every translatable element has a data-i18n key.
- pl.json: Polish for the same keys. extra-en.json: English strings used only from JavaScript.
- work.json: the nine projects in the "Work" grid, one entry per project, in display order.
- prototype/media/: reel.mp4, and per project work/<id>-loop.mp4 (or .gif) and work/<id>-film.mp4.
  Missing files show a placeholder.
- Photos of people are not in the repository. Pass --photos with a JSON file that maps photo keys
  (team, kujawski, ...) to image files, together with --out pointing outside the repository.
"""
import argparse, html, json, os, re, shutil, sys

SRC = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.dirname(SRC)
ASSETS = os.path.join(SRC, 'assets')

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--out', default=PROTO, help='output folder (default: prototype/)')
ap.add_argument('--photos', help='JSON file that maps photo keys to image files')
ap.add_argument('--fragment', action='store_true',
                help='also write humanverse-v3.html without html/head/body tags, and files.json')
args = ap.parse_args()
OUT = os.path.abspath(args.out)
IN_REPO = OUT == PROTO
if args.photos and IN_REPO:
    sys.exit('Photos of people stay out of the repository: pass --out with a folder outside it.')
if not IN_REPO:
    for sub in ('img', 'media'):
        shutil.rmtree(os.path.join(OUT, sub), ignore_errors=True)
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)

read = lambda p: open(os.path.join(SRC, p), encoding='utf-8').read()
body = read('body.html')
css = read('styles.css')
engine = read('engine.js')
app = read('app.js')
work_js = read('work.js')
work = json.loads(read('work.json'))
extra_en = json.loads(read('extra-en.json'))

used_files = {}
def ship(rel):
    """Return rel if prototype/<rel> exists, copying it into the output when building elsewhere."""
    src = os.path.join(PROTO, rel)
    if not os.path.exists(src):
        return ''
    dst = os.path.join(OUT, rel)
    if not IN_REPO:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(src, dst)
    used_files[rel] = dst
    return rel

# ---- 1. reel and work grid from work.json ----
reel = ship(work['reel'])
body = body.replace('%%REEL%%', (f'<video class="reel-video" src="{reel}" muted autoplay loop playsinline preload="auto" '
                                 'data-i18n-attr="aria-label:reel.aria" aria-label="Humanverse showreel"></video>') if reel else '', 1)
esc = lambda t: html.escape(t, quote=False)
items, work_pl = [], {}
for pr in work['projects']:
    i = pr['id']
    loop = next((r for r in (f'media/work/{i}-loop.{e}' for e in ('mp4', 'webm', 'gif')) if ship(r)), '')
    film = next((r for r in (f'media/work/{i}-film.{e}' for e in ('mp4', 'webm')) if ship(r)), '')
    if loop.endswith('.gif'):
        m = f'<img class="work-loop" src="{loop}" alt="" loading="lazy" decoding="async">'
    elif loop:
        m = f'<video class="work-loop" src="{loop}" muted autoplay loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>'
    else:
        m = f'<span class="work-slate" aria-hidden="true"><b>{i}</b><small data-i18n="work.slate">Loop · 3 s</small></span>'
    items.append(f'''      <li class="work-item">
        <button class="work-tile" type="button" aria-haspopup="dialog" data-id="{i}" data-loop="{loop}" data-film="{film}">
          <span class="work-media">{m}</span>
          <span class="work-cap"><span class="work-title" data-i18n="work.{i}.t">{esc(pr['title']['en'])}</span><span class="work-sub" data-i18n="work.{i}.s">{esc(pr['sub']['en'])}</span></span>
        </button>
        <p class="work-desc" data-i18n="work.{i}.d" hidden>{esc(pr['desc']['en'])}</p>
      </li>''')
    work_pl.update({f'work.{i}.t': esc(pr['title']['pl']), f'work.{i}.s': esc(pr['sub']['pl']), f'work.{i}.d': esc(pr['desc']['pl'])})
body = body.replace('%%WORK_GRID%%', '<ul class="work-grid" role="list">\n' + '\n'.join(items) + '\n      </ul>', 1)

# ---- 2. English strings straight from the markup ----
EL = re.compile(r'<(?P<tag>[a-z0-9]+)(?P<attrs>[^>]*?\sdata-i18n="(?P<key>[^"]+)"[^>]*)>(?P<inner>.*?)</(?P=tag)>', re.S)
ATTR = re.compile(r'<[a-z0-9]+[^>]*\sdata-i18n-attr="(?P<spec>[^"]+)"[^>]*>', re.S)
en = {}
for m in EL.finditer(body):
    k, v = m.group('key'), m.group('inner').strip()
    if k in en and en[k] != v:
        sys.exit(f'duplicate key with different text: {k}')
    en[k] = v
for m in ATTR.finditer(body):
    tag = m.group(0)
    for pair in m.group('spec').split(';'):
        attr, key = pair.split(':', 1)
        am = re.search(r'\s' + re.escape(attr) + r'="([^"]*)"', tag)
        if am and key not in en:
            en[key] = am.group(1)
for k, v in extra_en.items():
    en.setdefault(k, v)
pl = json.loads(read('pl.json'))
pl.update(work_pl)
missing = [k for k in en if k not in pl]
print('strings:', len(en), '| missing in pl.json:', missing[:20], len(missing))

# ---- 3. inline the default language (Polish when complete) ----
default = 'en' if missing else 'pl'
D = pl if default == 'pl' else en
def sub_el(m):
    v = D.get(m.group('key'))
    return m.group(0) if v is None else '<' + m.group('tag') + m.group('attrs') + '>' + v + '</' + m.group('tag') + '>'
page_body = EL.sub(sub_el, body)
def sub_attr(m):
    tag = m.group(0)
    for pair in m.group('spec').split(';'):
        attr, key = pair.split(':', 1)
        if key in D:
            tag = re.sub(r'(\s' + re.escape(attr) + r'=")[^"]*(")', lambda mm: mm.group(1) + D[key].replace('"', '&quot;') + mm.group(2), tag)
    return tag
page_body = ATTR.sub(sub_attr, page_body)

# ---- 4. logos ----
uid = [0]
def svg(name, cls='', fills=None, label=None):
    s = open(os.path.join(ASSETS, name), encoding='utf-8').read().strip()
    uid[0] += 1
    s = re.sub(r'clip0_[0-9_]+', f'clip{uid[0]}', s)
    s = re.sub(r'\s(width|height)="[0-9.]+"', '', s, count=2)
    for a, b in (fills or {}).items():
        s = s.replace(f'fill="{a}"', f'fill="{b}"')
    attrs = (f' class="{cls}"' if cls else '') + (f' role="img" aria-label="{label}"' if label else ' aria-hidden="true" focusable="false"')
    return s.replace('<svg', '<svg' + attrs, 1)

hv_nav = svg('logo-humanverse.svg', 'wordmark', {'white': 'currentColor'}, 'Humanverse')
page_body = page_body.replace('<a class="brand" href="#top" aria-label="Humanverse">%%WORDMARK%%</a>', '<a class="brand" href="#top">' + hv_nav + '</a>', 1)
while '%%WORDMARK%%' in page_body:
    page_body = page_body.replace('%%WORDMARK%%', svg('logo-humanverse.svg'), 1)
page_body = page_body.replace('%%JEDEN%%', svg('logo-jeden.svg', 'brand-logo', {'white': '#0D0C12'}, 'jeden.ai'))
page_body = page_body.replace('%%ALTERCAST%%', svg('logo-altercast-big.svg', 'ac-logo', None, 'AlterCast'))
page_body = page_body.replace('%%HVLOGO%%', svg('logo-humanverse.svg', '', None, 'Humanverse'))
page_body = page_body.replace('%%JEDEN_FOOT%%', svg('logo-jeden.svg', '', None, 'jeden.ai'))

# ---- 5. photos and characters ----
photos = {}
if args.photos:
    base = os.path.dirname(os.path.abspath(args.photos))
    photos = {k: os.path.join(base, v) for k, v in json.load(open(args.photos, encoding='utf-8')).items()}
NAMES = {'kujawski': 'Krzysztof Kujawski', 'mazurkiewicz': 'Paweł Mazurkiewicz', 'czajkowski': 'Jarosław Czajkowski',
         'jonski': 'Daniel Joński', 'tyszkiewicz': 'Jan Tyszkiewicz', 'domagala': 'Monika Domagała-Szmidt',
         'dluzniewska': 'Paulina Dłużniewska', 'polanska': 'Iwona Polańska', 'soszynski': 'Piotr Soszyński',
         'trosinska': 'Ela Trosińska', 'grabarczyk': 'Bartosz Grabarczyk'}
def img_tag(key):
    src = photos.get(key)
    if not src or not os.path.exists(src):
        return ''
    dst = f'img/{key}{os.path.splitext(src)[1]}'
    shutil.copy(src, os.path.join(OUT, dst))
    used_files[dst] = os.path.join(OUT, dst)
    alt = D.get('team.alt', 'The Humanverse team') if key == 'team' else NAMES.get(key, '')
    return f'<img src="{dst}" alt="{alt}" loading="lazy" decoding="async">'
page_body = re.sub(r'%%IMG:([a-z-]+)%%', lambda m: img_tag(m.group(1)), page_body)
def char_tag(key):
    rel = ship(f'img/char-{key}.webp')
    return f'<img src="{rel}" alt="" loading="lazy" decoding="async">' if rel else ''
page_body = re.sub(r'%%CHAR:([a-z-]+)%%', lambda m: char_tag(m.group(1)), page_body)
assert '%%' not in page_body, re.findall(r'%%[^%]+%%', page_body)

# ---- 6. assemble ----
i18n = {'pl': pl, 'en': en}
head = ('<title>Humanverse v3</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,500;0,700;0,800;1,300&family=Space+Grotesk:wght@400;500;700&display=swap">\n'
        '<style>\n' + css + '</style>\n')
scripts = ('<script>window.HV_I18N = ' + json.dumps(i18n, ensure_ascii=False).replace('</', '<\\/') + ';</script>\n'
           '<script>\n' + app + '</script>\n<script>\n' + work_js + '</script>\n<script>\n' + engine + '</script>\n')
standalone = ('<!doctype html>\n<html lang="' + default + '">\n<head>\n<meta charset="utf-8">\n'
              '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + head +
              '</head>\n<body>\n' + page_body + '\n' + scripts + '</body>\n</html>\n')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(standalone)
if args.fragment:
    open(os.path.join(OUT, 'humanverse-v3.html'), 'w', encoding='utf-8').write(head + page_body + '\n' + scripts)
    json.dump({k: used_files[k] for k in sorted(used_files)}, open(os.path.join(OUT, 'files.json'), 'w'), indent=1)
print('default language:', default, '| page bytes:', len(standalone), '| files:', len(used_files), '->', OUT)
