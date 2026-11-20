# 二次开发溯源说明

本文件记录本仓库与上游项目的关系、基线版本、改动范围与逐项清单，供追溯与复核使用。

---

## 上游项目

| 项 | 内容 |
|---|---|
| 仓库 | [Echo253/Graduate-self-management-records](https://github.com/Echo253/Graduate-self-management-records) |
| 作者 | **Echo253** |
| Star / Fork | 46 stars · 2 forks |
| 默认分支 | `html-v1`（另有 `nextjs-app-v2`） |
| 创建 / 最后推送 | 2026-04-03 / 2026-04-20 |
| 许可 | 上游仓库**未附带 LICENSE 文件**，原始代码版权归 Echo253 所有 |
| 说明 | 上游包含两个版本：v1 网页打开即用；v2（感谢 **tktogether**）为 Next.js 全栈应用 |

本仓库是上游仓库的 **GitHub 官方 fork**（`fork: true`，`parent` = 上游仓库），
父子关系在 GitHub 数据模型中建立，而非仅在文档中声明。

---

## 分支与基线

| 分支 | 来源 | 状态 |
|---|---|---|
| `html-v1` | 上游原样 | **未做任何改动**，SHA `2db66b0`，文件体积 3,282,323 bytes / 3,082 行 |
| `nextjs-app-v2` | 上游原样 | **未做任何改动**，SHA `dae980d` |
| `main` | 本仓库 | 二次开发主线，基线为 `html-v1` |

改动基准可直接在 GitHub 查看：
<https://github.com/Dalianmaritime/graduate-self-management/compare/html-v1...main>

---

## 规模对比

| 指标 | 上游 `html-v1` | 本仓库 `main` | 变化 |
|---|---:|---:|---:|
| 文件体积 | 3,282,323 B（3.13 MB） | 4,195,432 B（4.00 MB） | +913,109 B（+27.8%） |
| 总行数 | 3,082 | 6,599 | +3,517 |
| 差异行数 | — | 4,228 | — |
| CSS（`<style>` 合计） | 2.6 KB | 154.8 KB | +152.2 KB（×60） |
| JS（内联 `<script>`） | 3,152.1 KB | 3,860.4 KB | +708.3 KB |
| 内嵌 base64 背景图 | 2,288.3 KB | 2,288.3 KB | 未变 |
| 新增自定义 CSS 类 | — | 24 个 | — |

体积增长主要来自设计系统层、命令面板与图表配置的扩充；
内嵌背景图字节未变，仍是体积大头（约占 55%）。

---

## 改动清单

### 一、新增功能

| 模块 | 内容 |
|---|---|
| 科研进度看板 | 里程碑按 **计划 / 进行中 / 卡住 / 完成** 四态流转；卡住可标注阻塞原因与下一步动作，下一步一键转待办 |
| 截止日倒计时 | 投稿、会议、组会节点集中管理，首页显示最近一个 |
| 提醒机制 | 喝水间隔提醒 + 自定义闹钟；支持 `每天 / 工作日 / 仅一次`；提醒文案可用 `{work}` 占位符插入当天已工作时长 |
| 每日三问 | 今天推进了什么 / 卡在哪 / 明天第一件事，输入即自动保存 |
| 咖啡因代谢曲线 | 按 5 小时半衰期（`halfLife = 300` 分钟）估算体内残余量，结合入睡时间给出睡眠影响判断 |
| GPT 批量导入 | 粘贴整段文本，自动识别待办 / 里程碑 / 截止日 / 三问 |
| 周回顾 | 汇总最近 7 天工时、项目、里程碑、待办、身体数据与三问，一键复制 |
| 心情记录 | 首页心情坞，点击即记录 |

### 二、统计口径重做

上游的图表与底部汇总卡各自计算区间，导致两者数值对不上。

- 新增 `getStatsRangeDates()` / `getStatsRangeLabel()`，模块级 `statsPeriod` 统一驱动
- 新增三周期：**本周 / 近 30 天 / 近 12 个月**
- 切换区块时不再重置为「本周」（上游行为）
- 底部补口径说明文字
- 7 个图表实例统一改为「已存在则原地 `update()`」，不再每次切页重建（避免重播入场动画）

### 三、界面与设计系统

新增 440 行独立 `<style id="design-system">` 层，与业务逻辑分离。

- **设计令牌**：颜色、圆角、四级阴影（`--sh-1`…`--sh-4`）、四级动效时长（`--d-1`…`--d-4`）、统一缓动 `--ease`
- **24 个自定义类**：
  `panel` `panel-soft` `btn` `btn--primary` `btn--ghost` `btn--glass` `btn--ok` `btn--warn` `btn--danger`
  `btn--sm` `btn--md` `btn--lg` `hero-dock` `hero-scrim` `stat-ring` `stat-ring__val`
  `cmdk-panel` `cmdk-item` `cmdk-key` `todo-check` `todo-row` `strike-sweep`
  `board-card` `project-chip`
- **Hero 重构**：遮罩层 + 标题玻璃板 + 心情坞
- **侧栏**：conic-gradient 进度环 + 导航滑动指示器

### 四、交互与动效

| 动效 | 实现 |
|---|---|
| ⌘K 命令面板 | 18 条命令（导航 5 / 操作 10 / 统计 3），模糊匹配；无匹配时降级为「添加待办：\<输入\>」 |
| 区块切换 | 错落入场 |
| 弹窗 / Toast | 淡入上浮 |
| 汇总数字 | 滚动计数 |
| 待办勾选 | 绘制对勾 + 删除线扫过 |
| 计时器 | 呼吸脉冲（`timer-live`） |

### 五、图表中性化

- 统计页 15 处彩色底块 → `bg-gray-50` + `border-gray-200`
- 只给数据系列上色，卡片底色保持中性
- 建立 5 个指标色族：工作 emerald / 休息 orange / 咖啡 brown / 饮水 blue / 运动 rose
- 项目色板保留

### 六、布局修正

- 看板由自适应改为**横向滚动 + 固定列宽**（`flex: 1 0 260px`，独立 CSS 块 `#board-scroll-style`）
- 窄屏下四列均可横向浏览，不再挤压变形

### 七、缺陷修复

| 缺陷 | 修复 |
|---|---|
| `break-all` 切断英文单词 | 改 `break-words`（8 处业务代码） |
| 摄入 / 运动记录未转义 | `updateIntakeDisplay` / `updateExerciseDisplay` 补 `escapeHtml` |
| `btn-shadow` 使用 `theme('colors.primary.700')` 而 `primary` 是扁平字符串 | 该 utility 类从未生成，按钮一直无投影；删除失效规则 |
| 统计口径不一致 | 见上文「二」 |

### 八、工程质量

新增 `tools/` 验证脚本（基于 headless Chrome CDP，驱动真实页面）：

| 脚本 | 作用 |
|---|---|
| `tools/seed.js` | 生成两周样例数据，schema 与页面一致 |
| `tools/smoke.js` | 17 项交互冒烟：心情、待办勾选动画、弹窗开合、Toast、命令面板执行与跳转、统计周期切换与图表实例复用、计时器状态与脉冲、控制台零异常 |
| `tools/verify-stats.js` | 三区间统计口径回归：不信任页面结果，从种子数据按区间**独立复算**再逐项比对 |

统计期望值全部由种子数据实时复算，不写死任何数字，因此任何一天运行都成立。

---

## 致谢

- **Echo253** —— 上游 `Graduate-self-management-records` 的原始实现，本项目的一切基础
- **tktogether** —— 上游 Next.js v2 版本贡献者
- 上游项目 46 位 star 与 2 位 fork 使用者的关注

本仓库的二次开发部分版权归 Charile_Hao (Dalianmaritime)，以 MIT 发布。
`html-v1` 与 `nextjs-app-v2` 两个分支完整保留上游原始内容，未作任何修改。
