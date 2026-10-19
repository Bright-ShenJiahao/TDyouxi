"""塔防 DEMO 打包：把 src 里的素材内嵌进模板，生成 public/index.html。
用法：python3 src/build.py
"""
import base64, io, json, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(D)

def uri(img, fmt='WEBP', q=92):
    b = io.BytesIO(); img.save(b, fmt, quality=q)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()

def fit(name, w):
    im = Image.open(os.path.join(D, name))
    return im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)

IMG = {
    'map':   uri(Image.open(os.path.join(D, 'map_cn.jpg')).convert('RGB'), 'JPEG', 90),
    'hall':  uri(fit('hall.png', 480)),
    'tower': uri(fit('tower.png', 260)),
    'pt':    'data:image/png;base64,' + base64.b64encode(open(os.path.join(D, 'px_taoist.png'), 'rb').read()).decode(),
    'pz':    'data:image/png;base64,' + base64.b64encode(open(os.path.join(D, 'px_zombie.png'), 'rb').read()).decode(),
}
tpl = open(os.path.join(D, 'td_template.html'), encoding='utf-8').read()
out = tpl.replace('/*ASSETS*/', 'const IMG=' + json.dumps(IMG) + ';')
dst = os.path.join(ROOT, 'public', 'index.html')
os.makedirs(os.path.dirname(dst), exist_ok=True)
open(dst, 'w', encoding='utf-8').write(out)
print('wrote', dst, len(out) // 1024, 'KB')
