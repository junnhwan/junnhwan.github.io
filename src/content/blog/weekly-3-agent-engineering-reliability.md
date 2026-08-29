---
title: "Weekly3 浅谈 Agent 工程化中的可靠性问题"
description: "记录实习第三周的进展，以及在 PR-Agent 中围绕命令解析、第三方平台适配、上下文缓存、Token 限制和异步任务处理完成的可靠性修复。"
pubDate: 2026-08-28
tags: ["实习", "开源", "Agent", "AI工程", "周记"]
category: "Weekly"
featured: false
draft: false
---

这周实习方面暂时没有太多新的进展，主要还是继续熟悉项目和推进开发。

开源方面，这周主要在 [The-PR-Agent/pr-agent](https://github.com/The-PR-Agent/pr-agent) 做了一些修复，一共有 14 个 PR 被合并。简单讲一下这个开源项目，PR-Agent 是一个用于自动分析和审查 Pull Request 的 AI 工具，项目本身主要使用 Python，涉及 GitHub、GitLab、Bitbucket、Azure DevOps 等多个代码托管平台。

先说明一下，这些改动都有 AI 的参与，全部代码也是 AI 辅助完成的。我这周更多是围绕具体问题去确认修改范围、补充测试和整理相关逻辑，并没有真正完整读完整个项目。所以这篇文章不是什么源码深度分析，更多是把这些 PR 串起来之后，对 AI Agent 工程化问题的一些理解。

## AI Agent 其实也是一种后端服务

之前接触 AI Agent 时，容易把注意力放在模型、Prompt 和工具调用上。但从 PR-Agent 的代码来看，它本质上仍然是一个比较典型的后端服务：

```Plain
接收 Webhook 请求
→ 解析命令和配置
→ 获取 PR、Diff 和仓库上下文
→ 组装 Prompt
→ 调用模型
→ 处理失败、重试和并发
→ 把结果发布回代码托管平台
```

模型只是其中的一环，真正让系统变复杂的，还是上下文来源多、外部 API 不稳定、任务执行时间长，以及各种异常状态。

## 命令解析不能简单使用字符串分割

[PR #2813](https://github.com/The-PR-Agent/pr-agent/pull/2813) 修复的是 Webhook 自动命令中的参数解析问题。

例如下面这条命令：

```Plain
/review --pr_reviewer.extra_instructions="Focus on authentication and authorization"
```

如果直接按照空格切分，后面的配置就会被拆成多个参数。最开始想到的方式可能是使用 `shlex.split()`，但它会把引号去掉，之后再交给 YAML 解析时，`"true"`、`"null"` 和带有 `#` 的字符串又可能被解析成其他类型。

所以这里不仅要保留参数边界，还要保留用户是否显式使用了引号的信息。最后项目抽出了统一的命令准备逻辑，让六种 Webhook 适配器共用，而不是每个平台各自实现一遍。

这个问题看起来只是字符串处理，但实际上涉及输入协议、类型转换和跨平台代码复用。

## 第三方 API 返回的内容不能想当然

这周有几个 PR 都和不同代码托管平台的特殊行为有关。

[PR #2793](https://github.com/The-PR-Agent/pr-agent/pull/2793) 处理了仓库上下文文件读取时的错误分类。文件不存在时，返回空内容是合理的；但如果上游返回 500，就不能也当成空内容处理，否则系统可能把“请求失败”误认为“文件不存在”，甚至把错误结果缓存起来。

[PR #2810](https://github.com/The-PR-Agent/pr-agent/pull/2810) 处理了 GitLab 返回 `overflow=true` 的情况。此时接口虽然正常返回了结果，但返回的文件列表并不完整，需要使用 raw diff 再请求一次。

另外，Bitbucket Server 的文件移动使用 `MOVE` 表示，而原来的代码只处理了 `RENAME`；Azure DevOps 还可能返回 `changes=None`，或者返回不同形式的 SDK 对象。[PR #2801](https://github.com/The-PR-Agent/pr-agent/pull/2801) 和 [PR #2786](https://github.com/The-PR-Agent/pr-agent/pull/2786) 分别补上了这些情况。

这些问题让我感觉，第三方 API 适配层最重要的工作并不是把接口调用起来，而是把不同平台的语义转换成统一、可靠的内部数据。

## 上下文缓存和 Token 限制

Agent 的上下文通常不是固定的。PR-Agent 需要读取代码 diff、仓库中的规则文件、技能文件以及历史评论，这些内容都会影响最终 Prompt。

[PR #2856](https://github.com/The-PR-Agent/pr-agent/pull/2856) 修复了仓库上下文缓存键缺少分支来源的问题。同一个 PR，如果分别从目标分支和默认分支读取文件，结果可能完全不同，因此 `from_default_branch` 也必须加入缓存键。

[PR #2857](https://github.com/The-PR-Agent/pr-agent/pull/2857) 处理了 Skills 上下文缓存没有考虑配置变化的问题。技能是否启用、技能路径和最大 Token 数发生变化后，都应该重新计算上下文。

[PR #2862](https://github.com/The-PR-Agent/pr-agent/pull/2862) 则进一步处理了 `/ask_line` 的 Prompt 超限问题。历史评论是在运行过程中加载的，所以不能只在最开始估计 Token，而应该在最终 Prompt 生成之后再计算。如果超出限制，就从历史记录中截取合适长度的内容，同时保留代码片段和当前问题。

这部分和普通后端里的缓存设计、请求上下文管理比较像，只是缓存内容从数据库结果变成了 Prompt 上下文，限制条件又多了模型的上下文窗口和输出 Token 预算。

## 异步任务中的失败和取消

PR-Agent 中还有一组和异步任务有关的修复。

[PR #2829](https://github.com/The-PR-Agent/pr-agent/pull/2829) 处理了大 Diff 被拆成多个 chunk 并行请求时的部分失败问题。一个 chunk 失败时，不应该把其他已经成功的结果全部丢掉；只有所有 chunk 都失败，才交给外层的模型 fallback 逻辑重试。

[PR #2832](https://github.com/The-PR-Agent/pr-agent/pull/2832) 修复了 `asyncio.CancelledError` 被普通异常捕获的问题。任务取消和任务执行失败不是一回事，如果把取消信号吞掉，调用方就无法正确处理超时和任务终止。

另外，[PR #2827](https://github.com/The-PR-Agent/pr-agent/pull/2827) 保证被取消的等待任务能够释放去重计数，[PR #2833](https://github.com/The-PR-Agent/pr-agent/pull/2833) 则保证模型失败或任务取消时，临时发布的进度评论能够被清理。

这些问题其实和普通后端里的任务队列、资源释放、异常传播非常相似。只不过这里的任务变成了模型调用，临时资源变成了评论、计数器和并发任务。

## 一点体会

这周这些 PR 基本没有新增什么特别大的功能，更多是在处理一些“不太正常”的情况：

- 参数中出现引号；
- 第三方 API 返回部分结果；
- 文件不存在和服务器异常；
- 缓存配置发生变化；
- Prompt 在运行过程中变得过长；
- 并发任务中只有一部分失败；
- 异步任务被取消；
- 临时评论没有正常清理。

但这些情况恰恰决定了一个 Agent 能不能稳定运行。

其实从这些小修复能看出，AI Agent 工程本质上还是后端工程的一种延伸。请求解析、外部服务调用、缓存、异常处理、并发控制和资源清理这些问题并没有消失，只是核心业务从传统代码逻辑变成了“组织上下文并调用模型”。

目前我对 PR-Agent 整个项目还谈不上熟悉，这些改动也基本都是 AI 辅助下完成的。不过通过把这些 PR 放在同一条调用链上看，还是能更直观地理解 Agent 系统除了模型之外，还需要处理哪些工程问题。

## 写在最后

这周主要完成的是 PR-Agent 中一批可靠性相关的修复，内容涉及命令解析、第三方平台适配、上下文缓存、Token 限制和异步任务处理。

这些问题本身都不算特别复杂，但它们比较贴近真实系统运行时会遇到的情况。后面还是需要继续把这些代码真正看懂，不能只停留在 PR 被合并这一层。
