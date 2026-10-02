# 学习资料库

资料库仅通过 `/library/` URL 访问，不出现在博客头部、首页或全局搜索中。可把这个地址保存在浏览器书签里。它以 `src/data/library.json` 为清单，按更新日期展示资料；进入资料库后，可以搜索标题、简介、主题与标签。未收录资料时显示空状态，不生成示例条目。

资料库首页使用 `noindex,nofollow` 元信息，资料库路径也从 sitemap 排除，以减少搜索引擎收录。这些设置不是访问权限：知道 URL 的人仍可访问页面。后续原样导入的独立 HTML 若也需要避免索引，应在自己的 `<head>` 中加入 `<meta name="robots" content="noindex,nofollow">`。

每份资料的 HTML、样式、脚本和图片放在 `public/library/<slug>/`，构建后原样输出。资料链接使用完整页面导航，因此可以保留原文档的布局与交互，不受博客样式影响；用浏览器返回即可回到资料库。

## 首批收录

- PR-Agent：`/library/pr-agent-learning/pr-agent-learning.html`
- K8sGPT：`/library/k8sgpt-learning/k8sgpt-learning.html`

这两份资料的样式和脚本都内嵌在 HTML 中，没有额外资源依赖。博客副本保留正文与交互，添加不索引元信息，修正 PR-Agent 到 K8sGPT 的册间跳转；尚未收录的 Markdown 补充笔记与本地草稿链接改为普通文本。来源文件没有修改。后续更新时也需处理这些链接。

资料可以从不同设备阅读；文档内的学习进度、笔记仍保存在当前浏览器，不会随网站同步到其他设备。

## 导入单个 HTML

在仓库根目录运行：

```powershell
node scripts/import-learning.mjs --source "D:\hwan-repo\hwan-resume\content\learning\k8sgpt-learning.html" --slug k8sgpt-learning --title "K8sGPT 研读手册" --description "从 Kubernetes 概念到分析器实现的学习记录。" --topic Kubernetes --tags "Go,开源" --dry-run
```

`--dry-run` 只检查并列出文件。确认选中的内容后，移除该参数执行导入。脚本复制文件，保留来源目录；现有资料的 slug 和目标目录不会被覆盖。默认日期取北京时间当天，也可以用 `--updated 2026-10-02` 指定。

上述 K8sGPT 示例还链接了几份 Markdown 笔记和上层目录的草稿，检查会提示这些依赖。实际导入前需先整理公开版本、选定依赖或移除相应链接。

单文件默认只选中 HTML 本身。如果它引用同目录的 `assets/`，加上 `--include assets`。相对路径会保持原样，入口也保留原文件名。

## 导入包含多个页面的资料

先选择所需 HTML 与依赖目录，不把生成脚本、备份和校验产物带入网站。例如：

```powershell
node scripts/import-learning.mjs --source "D:\ai-chat\system-design-map" --slug system-design-map --title "系统设计学习手册" --description "按场景整理系统设计的核心问题与实现思路。" --topic 系统设计 --tags "架构,学习笔记" --include "*.html" --include assets --entry index.html --dry-run
```

`--include` 可以重复，支持相对文件、目录和文件名中的 `*`，例如 `--include "pages/*.html"`。指定目录会复制其中的文件与子目录，文件的相对位置不会变化。目录默认入口是 `index.html`；其他入口用 `--entry` 指定。如果来源目录只包含准备发布的静态资料，可以使用 `--all`。它会跳过 `.git` 和 `node_modules`。

脚本会检查完整 HTML 文档的 `href`、`src`、`poster`、跳转入口及 CSS 的静态引用，缺少文件时停止导入。它拒绝符号链接、目录联接、越出资料目录的相对路径和 `file:` / 盘符引用。JavaScript 动态请求、模块依赖、动态注入的 HTML 片段与外部 CDN 仍需要在浏览器里确认；它们没有被改写。根路径 `/assets/...` 也按网站根目录解析，最好改成资料目录内的相对路径再导入。

## 清单与更新

导入后会追加这样的记录（这是格式说明，不是已发布条目）：

```json
{
  "slug": "document-slug",
  "title": "资料标题",
  "description": "一两句简介。",
  "topic": "主题",
  "tags": ["标签"],
  "updatedAt": "2026-10-02",
  "entry": "index.html"
}
```

标题、简介、主题和标签直接在 `src/data/library.json` 修改。更新文档内容时编辑对应的 `public/library/<slug>/`，同步修改 `updatedAt`；导入工具不提供自动覆盖。删除资料时移除清单记录和对应目录。

## 检查与发布

1. 运行 `npm run build` 和 `git diff --check`。
2. 使用 `npm run preview`，检查资料库、入口、内部导航、图片、脚本和移动端布局。
3. 一并提交清单与 `public/library/<slug>/`，按照博客现有 GitHub Pages 流程发布。

GitHub Pages 上的资料是公开静态网页，通过链接可直接访问，没有私人资料权限控制。仅收录准备公开的文档；文档中的本机绝对路径、需要后端的请求不能直接迁移到静态站点。外部 CDN 保持原有依赖，若需要离线可用，应先把资源下载到文档自己的目录并改成相对引用。

资料库不会扫描电脑、上传任意目录或自动发布。后续提供文档路径后，可先检查选中文件与依赖，再用上述工具整理收录。
