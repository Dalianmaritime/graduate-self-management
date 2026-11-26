# 风格 3 · 手写实验笔记风（Demo）

这是 README 视觉风格的备选方案 demo，**尚未启用** —— 仓库当前使用的是「明亮杂志风」。

## 看效果

```bash
# 在仓库根目录
python3 -m http.server 8000
# 打开 http://localhost:8000/docs/style3-demo/index.html
```

## 为什么手写风在 GitHub 上很难做

GitHub 的 README 渲染环境有三处限制：

| 限制 | 影响 |
|---|---|
| **剥离 `<style>` 标签** | 不能写自定义 CSS，只能用内联 `style` 属性 |
| **给所有 `<table>` 加边框** | 布局用的表格会留下外框，得逐格写 `border:0` 绕过 |
| **图片加边框与圆角** | SVG 装饰需要自己处理边界 |

所以这个风格靠「手绘 SVG 素材 + 表格嵌套 + 内联样式」实现，
素材在 `docs/handwriting/`（12 个 SVG，全部手绘路径）。

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
