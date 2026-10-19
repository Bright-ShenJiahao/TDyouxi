"""塔防打包：把 src 里的素材内嵌进模板，一次生成两个版本。

  public/index.html      正式版（给玩家）：去掉所有 DEV 块，不含调试功能，布局固定用默认值
  public/dev/index.html  开发版（只给自己调试）：去掉 REL 块，带调试模式，不被搜索引擎收录

模板标记（成对出现）：
  HTML：<!--DEV-->…<!--/DEV-->   <!--REL-->…<!--/REL-->
  JS / CSS：/*DEV*/…/*/DEV*/      /*REL*/…/*/REL*/

用法：python3 src/build.py
"""
import base64, io, json, os, re, sys
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(D)

def uri(img, fmt='WEBP', q=92):
    b = io.BytesIO(); img.save(b, fmt, quality=q)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()

def fit(name, w):
    im = Image.open(os.path.join(D, name))
    return im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)

def raw(name):
    return 'data:image/png;base64,' + base64.b64encode(open(os.path.join(D, name), 'rb').read()).decode()

IMG = {
    'map':   uri(Image.open(os.path.join(D, 'map_cn.jpg')).convert('RGB'), 'JPEG', 90),
    'hall':  uri(fit('hall.png', 480)),
    'tower': uri(fit('tower.png', 260)),
    'pt':    raw('px_taoist.png'),
    'pz':    raw('px_zombie.png'),
    'pg':    raw('px_ghost.png'),
    'pk':    raw('px_king.png'),
}
# 正式美术到了之后，把图片放进 src/ 并在这里登记即可自动替换占位（键名见 balance.js 里的 img）
for key, fname, w in [('tlei', 'tower_lei.png', 260), ('tpao', 'tower_pao.png', 260), ('twang', 'tower_wang.png', 260), ('tavern', 'tavern.png', 300)]:
    if os.path.exists(os.path.join(D, fname)):
        IMG[key] = uri(fit(fname, w))

# 脚本按顺序拼接；debug.js 只进开发版
SCRIPTS = ['config/balance.js', 'config/cards.js', 'config/layout.js', 'js/core.js', 'js/enemies.js', 'js/towers.js', 'js/hero.js', 'js/cards.js', 'js/ui.js']
DEV_SCRIPTS = ['js/debug.js']
def read(rel): return '\n/* ===== ' + rel + ' ===== */\n' + open(os.path.join(D, rel), encoding='utf-8').read()

def strip(text, drop):
    for o, c in [(f'<!--{drop}-->', f'<!--/{drop}-->'), (f'/*{drop}*/', f'/*/{drop}*/')]:
        text = re.sub(re.escape(o) + r'.*?' + re.escape(c), '', text, flags=re.S)
    keep = 'REL' if drop == 'DEV' else 'DEV'
    for m in (f'<!--{keep}-->', f'<!--/{keep}-->', f'/*{keep}*/', f'/*/{keep}*/'):
        text = text.replace(m, '')
    return text

tpl = open(os.path.join(D, 'td_template.html'), encoding='utf-8').read()
for tag in ('DEV', 'REL'):
    for o, c in [(f'<!--{tag}-->', f'<!--/{tag}-->'), (f'/*{tag}*/', f'/*/{tag}*/')]:
        if tpl.count(o) != tpl.count(c):
            sys.exit(f'标记不成对：{o} {tpl.count(o)} 个，{c} {tpl.count(c)} 个')

assets = 'const IMG=' + json.dumps(IMG) + ';'
rel_js = ''.join(read(f) for f in SCRIPTS)
dev_js = rel_js + ''.join(read(f) for f in DEV_SCRIPTS)
for src in (rel_js, dev_js):
    for tag in ('DEV', 'REL'):
        o, c = f'/*{tag}*/', f'/*/{tag}*/'
        if src.count(o) != src.count(c):
            sys.exit(f'脚本里标记不成对：{o}')
outs = {
    os.path.join(ROOT, 'public', 'index.html'): strip(tpl.replace('/*SCRIPTS*/', rel_js), 'DEV'),
    os.path.join(ROOT, 'public', 'dev', 'index.html'): strip(tpl.replace('/*SCRIPTS*/', dev_js), 'REL'),
}
for dst, html in outs.items():
    html = html.replace('/*ASSETS*/', assets)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, 'w', encoding='utf-8').write(html)
    print('wrote', os.path.relpath(dst, ROOT), len(html) // 1024, 'KB')

rel = outs[os.path.join(ROOT, 'public', 'index.html')]
for word in ('dbgbtn', 'dbgbar', 'drawDebug', 'localStorage', '调试模式', '导出布局', 'DBG.'):
    if word in rel:
        sys.exit(f'正式版里还残留调试内容：{word}')
print('check ok: 正式版不含调试代码')
