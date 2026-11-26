# 风格 3 · 手写实验笔记风（Demo）

这是 README 视觉风格的备选方案 demo，**尚未启用** —— 仓库当前使用的是「明亮杂志风」。

## 看效果

```bash
# 在仓库根目录
python3 -m http.server 8000
# 打开 http://localhost:8000/docs/style3-demo/index.html
```

## 为什么手写风在 GitHub 上很难做

**实测结论（2026-11）**：GitHub README 的 HTML sanitizer 只保留极少数 `style` 属性
——`vertical-align`、`max-width`、`width`、`min-width`、`display` 等。

被剥离的包括：

| 被剥离 | 后果 |
|---|---|
| `font-family` | 手写字体失效，中文回退成斜体 |
| `background-color` | 便签底色、卡片底色失效 |
| `color` | 强调色失效 |
| `padding` / `border` | 内边距与描边失效，元素挤在一起 |
| `text-align` | 对齐失效 |

同时 GitHub 还会**剥离 `<style>` 标签**，并给所有 `<table>` 加边框。

### 因此：视觉必须做进 SVG

这是本项目摸索出的唯一可行路径 —— **所有视觉效果画进 SVG 文件，README 只用 `<img>` 引用**。
SVG 内部不受 sanitizer 影响，字体、底色、投影、撕角全部保留。

`docs/handwriting/` 下的 SVG 就是这样做的：

- 文字用 `<text font-family="Hannotate SC, ...">`（macOS 自带中文手写体）
- 底色、撕角、投影用 `<path>` / `<filter>`
- README 里只有一行 `<img src="docs/handwriting/xxx.svg">`

> 注意：`Bradley Hand`、`Chalkboard`、`Brush Script` 这些拉丁手写字体**没有中文字形**，
> 中文会回退并被渲染成斜体。中文手写要用 `Hannotate SC` / `HanziPen SC` /
> `Kaiti SC` / `STKaiti` / `Xingkai SC`。

### 本 demo 的局限

demo 里的双栏布局、便签、虚线卡片用了内联 `style`，**这些在真实 GitHub 上会被剥离**。
它展示的是设计意图，不是最终效果。仓库当前 README 已改用 SVG 承载，可以直接看线上效果。

## 相对当前风格的取舍

| | 明亮杂志风（当前） | 手写实验笔记风 |
|---|---|---|
| 专业度 | 高 | 中 |
| 个性 | 中 | **强** |
| 信息密度 | 高 | 中 |
| 窄屏适配 | 好 | **较差**（表格需横向滚动） |
| 维护成本 | 低 | 高（每个装饰都要手绘 SVG） |

## 素材清单

`docs/handwriting/` 下 12 个 SVG：

- `underline-wave.svg` / `underline-short.svg` —— 手绘下划线
- `arrow-curve.svg` / `arrow-down.svg` —— 手绘箭头
- `circle-mark.svg` —— 手绘圈选
- `box-tick.svg` / `checkmark.svg` / `crossmark.svg` —— 手绘勾叉
- `note-sticky.svg` / `tape.svg` —— 便签与胶带
- `tab-label.svg` —— 页签标签
- `sparkles.svg` —— 装饰星光
