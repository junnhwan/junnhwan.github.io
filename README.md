# junnhwan's Blog

基于 **Astro 5 + Tailwind CSS + React** 构建的现代极客个人技术博客与知识库。

在线访问：[https://junnhwan.github.io](https://junnhwan.github.io)

---

## ✨ 特性亮点

* 🚀 **极速性能**：Astro 零运行时 JS 架构，毫秒级页面加载；
* 🎨 **Bento 网格与流光美学**：深空碳黑与霓虹青绿主题、磨砂玻璃拟态、卡片呼吸流光；
* 💻 **内置交互式 Web Terminal (CLI)**：支持 `whoami`、`skills`、`posts`、`projects`、`clear` 等命令与快捷键一键唤起；
* ⚡ **全站 Command Palette (`⌘K`)**：支持全键盘驱动的全局模糊搜索与页面瞬时跳转；
* 📝 **Content Collections 文章系统**：原生支持 Markdown / MDX，自动估算阅读时长、生成文章目录（TOC）；
* 💻 **Mac 风格代码高亮**：带一键复制、语言徽章与精致窗口栏；
* 🤖 **自动化部署**：通过 GitHub Actions 自动编译发布至 GitHub Pages。

---

## 🛠️ 本地开发与写作

### 1. 启动本地开发服务器

```bash
npm install
npm run dev
```

在浏览器打开 `http://localhost:4321` 即可享受毫秒级热重载预览。

### 2. 发布新文章

只需在 `src/content/blog/` 目录下新建一个 `.md` 或 `.mdx` 文件：

```markdown
---
title: "你的文章标题"
description: "文章一句话简述"
pubDate: 2026-08-15
tags: ["Agent", "Go", "架构"]
category: "AI & Agents"
featured: false
draft: false
---

这里开始书写你的正文 Markdown 内容...
```

提交并推送到 GitHub `main` 分支后，GitHub Actions 将自动完成构建上线。

---

## 📦 项目架构

```
├── .github/workflows/   # GitHub Actions 自动部署流水线
├── public/              # 静态公共资源（图片、favicon 等）
├── src/
│   ├── components/      # UI 组件（Terminal, SkillMatrix, CommandPalette, BentoGrid...）
│   ├── content/         # 文章内容集合 (blog/*.md)
│   ├── layouts/         # 基础页面模版
│   ├── pages/           # 页面路由（/blog, /projects, /archive, /about 等）
│   ├── styles/          # 全局 Tailwind 与动画样式
│   └── utils/           # 辅助函数（阅读时长、日期格式化等）
├── astro.config.mjs     # Astro 配置文件
└── tailwind.config.mjs  # Tailwind CSS 视觉系统配置
```
