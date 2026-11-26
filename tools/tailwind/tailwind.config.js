/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./content/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        secondary: '#4f46e5',
        accent: '#3b82f6',
        success: '#10b981',
        warning: '#d97706',
        danger: '#ef4444',
        light: '#f3f4f6',
        dark: '#1f2937'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      }
    }
  },
  // 运行时动态切换 / 拼接出来的类，构建期扫描不到，必须显式声明
  safelist: [
    // 统计周期按钮
    { pattern: /^(bg|text|border)-(gray|primary|emerald|orange|amber|rose|blue)-(50|100|200|500|600|700)$/ },
    // 心情按钮激活态
    { pattern: /^(bg|text|border)-(blue|green|amber|rose|emerald|gray)-(50|100|200|300|500|600|700)$/ },
    'shadow-sm', 'shadow-md', 'shadow-lg',
    'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-primary',
    'text-white', 'text-primary', 'text-gray-500', 'text-gray-600', 'text-gray-700',
    'border-blue-500', 'border-rose-500', 'bg-rose-100', 'bg-blue-100',
    'hover:bg-gray-100', 'hover:text-gray-700',
    // 面板切换
    'bg-white', 'text-primary', 'text-gray-600', 'text-gray-700',
    // body tab 激活态
    'bg-white', 'text-primary', 'shadow-sm',
    // 水量按钮
    'bg-blue-500', 'bg-blue-600', 'text-white', 'border-blue-300',
    // 咖啡配置
    'bg-amber-500', 'bg-amber-600', 'bg-amber-100', 'text-amber-700',
    // 进度环
    'bg-emerald-500', 'bg-orange-500', 'bg-amber-500',
    // 心情
    'bg-blue-100', 'text-blue-700', 'bg-green-100', 'text-green-700',
    'bg-amber-100', 'text-amber-700', 'bg-rose-100', 'text-rose-700',
    // 通用状态
    'text-green-600', 'text-orange-600', 'text-emerald-600', 'text-red-500',
    'text-4xl', 'font-bold', 'font-medium', 'mb-2', 'text-gray-500',
    'text-emerald-600', 'text-orange-600',
    'absolute', 'left-1/2', 'top-2', 'text-3xl',
    // toast
    'bg-gray-900', 'text-white'
  ],
  plugins: []
};
