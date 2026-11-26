# Tailwind 构建期产物

主页面里的 `<style id="tailwind-build">` 是 **Tailwind CSS 3.4.17 的构建期产物**，
替代了原先内嵌的 Tailwind Play CDN 运行时编译器。

## 为什么要改

| | Tailwind Play CDN（改前） | 构建期产物（改后） |
|---|---|---|
| 体积 | 397.7 KB | 55.6 KB |
| 首屏 | 需下载并执行 JIT 编译器 | 无需 JS 编译 |
| 动态 class | 运行时扫描 DOM 生成 | 构建期扫描 + `safelist` |
| 环境依赖 | 受 CSP / MutationObserver 限制 | 无 |

## 重新生成

```bash
cd tools/tailwind
npm install        # 首次
./build.sh
```

产物是 `out.css`，把它替换进 `研究生自我管理系统.html` 的
`<style id="tailwind-build"> ... </style>` 之间即可。

## 注意

`tailwind.config.js` 里的 **`safelist`** 是关键 —— 页面有些类在运行时才被 JS 拼出来
（如 `bg-blue-100`、`text-primary`），构建期扫描不到，必须显式声明。改页面时若新增了
动态类，记得同步 safelist。

配置里 `colors.primary` 等自定义色板与原运行时配置保持一致，
`<style id="design-system">` 里的设计令牌不受影响。
