# SVG 文字转路径

把 SVG 里的 `<text>` 转成 `<path>`，消除对系统字体的依赖 —— 这样在
Windows / Linux / 任何没有装该字体的机器上都能得到完全一致的渲染。

## 为什么需要

README 里的手写元素（便签、开篇句）原本用 `font-family="Hannotate SC"`。
`Hannotate SC` 是 macOS 自带字体，别的平台没有，会回退到系统默认字体，
手写效果直接消失。

转成路径后，SVG 内部自带轮廓，**不依赖任何字体**。

## 用法

```bash
python3 tools/svg-text2path/text2path.py <要转换的 svg...>
```

依赖：`pip3 install fonttools`

## 支持的字体

| family | 文件 | 位置 |
|---|---|---|
| `Hannotate SC` | Hannotate.ttc | `/System/Library/AssetsV2/**` |
| `HanziPen SC` | Hanzipen.ttc | `/System/Library/AssetsV2/**` |
| `Kaiti SC` | Kaiti.ttc | `/System/Library/AssetsV2/**` |

Regular 与 Bold 两个字重都支持（`<tspan font-weight="700">` 会被识别）。

## 体积

字形轮廓比 `<text>` 大（一个 20 字的中文句子约 80 KB），
但相比仓库里 22 MB 的截图只占 0.5%，值得。

## 注意

- 转换后文字不可再编辑、不可再换内容 —— 要改内容得改 SVG 源再重新转换
- 转换器只处理静态文本（无自动换行），字体装饰用的短句够用
