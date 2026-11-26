#!/bin/bash
# 重新生成并注入 Tailwind 构建期 CSS
#
# 用法：
#   cd tools/tailwind
#   npm install        # 首次
#   ./build.sh
#
# 会自动把产物写回 研究生自我管理系统.html 的
# <style id="tailwind-build"> ... </style> 之间。
set -e
cd "$(dirname "$0")"

HTML="../../研究生自我管理系统.html"

if [ ! -d node_modules ]; then
  echo "安装依赖…"
  npm install
fi

echo "扫描 HTML…"
cp "$HTML" ./content.html

# 生成临时配置：content 指向单文件，其余（theme / safelist）原样继承
cat > tailwind.build.config.js <<'CFG'
const base = require('./tailwind.config.js');
module.exports = { ...base, content: ['./content.html'] };
CFG

npx tailwindcss -c tailwind.build.config.js -i input.css -o out.css --minify
echo "✅ 生成 out.css ($(wc -c < out.css) bytes)"

echo "注入主页面…"
node -e "
const fs = require('fs');
const html = fs.readFileSync('$HTML', 'utf8');
const css = fs.readFileSync('out.css', 'utf8').trim();
const startTag = '<style id=\"tailwind-build\">';
const i = html.indexOf(startTag);
if (i < 0) { console.error('找不到 <style id=\"tailwind-build\">'); process.exit(1); }
const j = html.indexOf('</style>', i);
const out = html.slice(0, i + startTag.length) + '\n' + css + '\n    ' + html.slice(j);
fs.writeFileSync('$HTML', out);
console.log('✅ 已注入主页面');
"

echo
echo "完成。文件大小：$(wc -c < "$HTML") bytes"
