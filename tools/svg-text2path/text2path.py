#!/usr/bin/env python3
"""
把 SVG 里的 <text> 元素转换成 <path>，消除对系统字体的依赖。

只处理静态文本（无自动换行、无复杂排版），足够 README 装饰用。
支持：font-family 映射、font-size、font-weight、fill、text-anchor、
      多个 <tspan> 片段（各自的 font-weight / fill）。
"""
import re, sys, glob, os
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTCollection, TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

# ---- 字体注册表：family 名 → (文件, 子字体索引 by weight) ----
FONT_FILES = {
    'Hannotate SC': glob.glob('/System/Library/AssetsV2/**/Hannotate.ttc', recursive=True),
    'HanziPen SC':  glob.glob('/System/Library/AssetsV2/**/Hanzipen.ttc', recursive=True),
    'Kaiti SC':     glob.glob('/System/Library/AssetsV2/**/Kaiti.ttc', recursive=True),
}
# 每族：regular 索引、bold 索引
FONT_INDEX = {
    'Hannotate SC': (0, 2),
    'HanziPen SC':  (0, 2),
    'Kaiti SC':     (0, 3),
}
SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)

_cache = {}

def load_font(family, bold):
    key = (family, bold)
    if key in _cache: return _cache[key]
    path = FONT_FILES.get(family, [None])[0]
    if not path:
        raise SystemExit(f'找不到字体: {family}')
    coll = TTCollection(path)
    idx = FONT_INDEX[family][1 if bold else 0]
    ft = coll.fonts[idx]
    _cache[key] = ft
    return ft

def glyph_path(ft, ch, dx, dy, scale):
    """取一个字符的轮廓，返回 path d 字符串（已按 scale 与位置变换）。"""
    cmap = ft.getBestCmap()
    gname = cmap.get(ord(ch))
    if not gname:
        return '', 0
    gs = ft.getGlyphSet()
    glyph = gs[gname]
    pen = SVGPathPen(gs, ntos=lambda v: f'{round(v)}')
    t = Transform(scale, 0, 0, -scale, dx, dy)   # 翻转 y（字体向上，SVG 向下）
    glyph.draw(TransformPen(pen, t))
    return pen.getCommands(), gs[gname].width * scale

def run_width(ft, text, scale):
    gs = ft.getGlyphSet()
    cmap = ft.getBestCmap()
    total = 0
    for ch in text:
        gname = cmap.get(ord(ch))
        if not gname: 
            total += ft['hmtx'].metrics['.notdef'][0] * scale
            continue
        total += gs[gname].width * scale
    return total

def parse_style(el):
    st = dict(kv.split(':', 1) for kv in (el.get('style') or '').split(';') if ':' in kv)
    st.update({k: v for k, v in el.attrib.items() if k not in ('style',)})
    return st

def convert_text(el, out_parent, out_defs):
    st = parse_style(el)
    family = (st.get('font-family') or 'Hannotate SC').split(',')[0].strip().strip("'\"")
    if family not in FONT_FILES:
        print(f'  跳过未知字体族: {family}', file=sys.stderr)
        return
    size = float(st.get('font-size', 16))
    fill = st.get('fill', '#000')
    anchor = st.get('text-anchor', 'start')
    x = float(st.get('x', 0)); y = float(st.get('y', 0))
    upem = load_font(family, False)['head'].unitsPerEm
    scale = size / upem

    # 收集片段：(文本, bold, fill)
    segs = []
    if el.text and el.text.strip():
        segs.append((el.text, '700' in (st.get('font-weight') or ''), fill))
    for ts in el.findall(f'{{{SVG_NS}}}tspan'):
        tst = parse_style(ts)
        tfill = tst.get('fill', fill)
        tbold = '700' in (tst.get('font-weight') or '') or 'bold' in (tst.get('font-weight') or '')
        segs.append((ts.text or '', tbold, tfill))
        if ts.tail and ts.tail.strip():
            segs.append((ts.tail, False, fill))

    total_w = 0
    for text, bold, _f in segs:
        ft = load_font(family, bold)
        total_w += run_width(ft, text, scale)

    if anchor == 'middle':
        cur = x - total_w / 2
    elif anchor == 'end':
        cur = x - total_w
    else:
        cur = x

    d_all = []
    for text, bold, seg_fill in segs:
        if not text: continue
        ft = load_font(family, bold)
        for ch in text:
            if ch == ' ':
                cur += run_width(ft, ' ', scale)
                continue
            d, adv = glyph_path(ft, ch, cur, y, scale)
            if d: d_all.append((d, seg_fill))
            cur += adv

    # 每个片段一个 path（填色不同）
    for d, seg_fill in d_all:
        p = ET.SubElement(out_parent, f'{{{SVG_NS}}}path')
        p.set('d', d)
        p.set('fill', seg_fill)

def convert_file(path):
    tree = ET.parse(path)
    root = tree.getroot()
    n = 0
    # 深度优先替换
    def walk(parent):
        nonlocal n
        for child in list(parent):
            tag = child.tag
            if tag == f'{{{SVG_NS}}}text':
                convert_text(child, parent, None)
                parent.remove(child)
                n += 1
            else:
                walk(child)
    walk(root)
    tree.write(path, encoding='utf-8', xml_declaration=True)
    return n

if __name__ == '__main__':
    for f in sys.argv[1:]:
        c = convert_file(f)
        print(f'  ✅ {f}: 转换 {c} 处 <text>')
