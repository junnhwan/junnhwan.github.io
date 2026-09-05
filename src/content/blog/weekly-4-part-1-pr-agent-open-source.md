---
title: "Weekly4 Part I：PR-Agent 的功能完善与开源实践"
description: "记录这周在 PR-Agent 合并的四个 PR，涉及模型重试配置恢复、Skills 上下文、CodeCommit 多 Target 支持和 GitHub Review 事件处理。"
pubDate: 2026-09-05
tags: ["开源", "Agent", "AI工程", "周记"]
category: "Weekly"
featured: false
draft: false
---

这周继续在 [PR-Agent](https://github.com/The-PR-Agent/pr-agent) 做了一些贡献，一共有 4 个 PR 被合并。

上周的改动主要围绕可靠性问题，这周则更多是在已有功能上补充使用场景，包括为 `/ask` 接入 Skills 上下文、完善 CodeCommit 多 Target 的处理，以及支持 GitHub Review 事件触发自动命令。另外，也修复了一个模型重试后配置没有恢复的问题。

## 模型重试后的配置恢复

[PR #2929](https://github.com/The-PR-Agent/pr-agent/pull/2929) 修复的是模型 fallback 之后，deployment 配置没有恢复的问题。

PR-Agent 支持在主模型调用失败后切换到备用模型，每次尝试时也会设置对应的 `openai.deployment_id`。但原来的逻辑在重试结束后，没有恢复进入函数前的配置。

例如，主模型 A 调用失败，切换到备用模型 B 后成功返回。虽然这次调用正常完成了，但配置中留下的仍然是 B 的 deployment。下一次独立调用读取配置时，就可能把模型 A 和 B 的 deployment 配到一起。

修复的核心是保存原始配置，并在 `finally` 中恢复。简化后的逻辑如下：

```python
original_deployment = get_deployment()

try:
    return await retry_models()
finally:
    set_deployment(original_deployment)
```

这样无论备用模型调用成功、所有尝试都失败，还是任务被取消，配置都能恢复。

这个问题也说明，只验证一次 fallback 是否成功是不够的。测试还需要在第一次重试完成后，再发起一次独立调用，检查前一次操作是否影响了后续行为。

这次修复的范围主要是连续调用之间的状态残留，并没有重新设计全局配置的并发访问方式。

## 为 `/ask` 接入 Skills 上下文

[PR #2967](https://github.com/The-PR-Agent/pr-agent/pull/2967) 为顶层 `/ask` 增加了 Skills 上下文支持。

PR-Agent 之前已经支持在 `/review`、`/improve` 和 `/describe` 中使用预先配置的 `SKILL.md` 指导内容，但 `/ask` 还没有接入同样的能力。

因此，即使已经配置了安全检查、API 兼容性等方面的规范，用户通过 `/ask` 针对 PR 提问时，模型也无法参考这些内容。

这次修改复用了已有的 `get_skills_context()`，把经过 Token 限制的 Skills 内容传入 `/ask` 的 Prompt 模板，同时增加了一个配置项：

```toml
[skills]
apply_to_ask = true
```

这个配置默认关闭，也仍然受原有的 Skills 启用状态和 Token 预算限制。Skills 文件路径继续由部署方控制，仓库配置不能任意指定宿主机上的读取路径。

这里的 Skills 仍然是作为文本指导加入 Prompt，并没有增加工具调用循环。另外，`/ask_line` 的上下文包含代码片段和历史对话，有独立的预算处理，所以这次没有一起接入。

这个改动本身不算大，但需要考虑的不只是把内容加进 Prompt，还包括不同命令的上下文差异、配置权限，以及是否会改变已有用户的默认行为。

## CodeCommit 多 Target 的完整处理

[PR #2993](https://github.com/The-PR-Agent/pr-agent/pull/2993) 完善了 CodeCommit PR 中多个 Target 的处理。

CodeCommit 的 PR 数据通过 `pullRequestTargets[]` 提供仓库和提交比较信息，但原来的 provider 只读取第一个 Target。存在多个 Target 时，其余部分的文件变更就可能被遗漏。

这次修改除了遍历所有 Target 获取 Diff 和文件内容，还保留了每个 Target 对应的仓库与 commit 信息。

原因是这些信息不只在读取阶段有用。后面发布 review 评论和代码建议时，同样需要知道分析结果属于哪个 Target，否则就可能把结果发布到错误的比较范围。

整个过程可以简单理解为：

```text
读取各个 Target 的仓库和 commit 信息
→ 获取对应的 Diff 与文件内容
→ 分析变更
→ 根据 Target 信息发布评论和建议
```

普通 review 评论会按 Target 发布，代码建议则需要定位到包含对应文件的 Target，同时保留原来的单 Target 行为。

这部分和上周的平台适配问题有些相似：外部接口返回的数据即使能够正常读取，也不代表内部已经完整支持了它的语义。多个来源的数据汇总之后，后续操作仍然需要保留对应关系。

## GitHub Review 事件的自动命令触发

[PR #3011](https://github.com/The-PR-Agent/pr-agent/pull/3011) 增加了 GitHub 正式提交 Review 后触发自动命令的支持，同时覆盖 GitHub App 和 GitHub Action 两个入口。

之前这两个入口都没有处理 `pull_request_review` 的 `submitted` 事件，因此无法根据用户提交的 Review 自动执行配置好的 PR-Agent 命令。

现在可以按照 Review 状态和作者类型设置触发条件。例如，GitHub App 可以使用下面的配置：

```toml
[github_app]
review_states = ["changes_requested"]
review_author_types = ["User"]
review_commands = ["/review"]
```

当用户提交要求修改的 Review 时，就可以触发一次 `/review`。GitHub Action 也支持对应配置，但需要在 workflow 中订阅相应事件。

这里的 Review 事件只负责触发流程，实际执行的命令来自配置，不会把 Review 正文直接作为命令解析。

此外，新入口也需要沿用已有的检查，包括草稿 PR 处理、机器人保护，以及是否禁用自动反馈等。默认的 `review_commands` 为空，因此没有主动配置时，原来的行为不会改变。

增加事件处理分支只是其中一步，更重要的是让这个入口遵循项目原有的执行规则。

## 一点体会

这周几个 PR 涉及的模块不同，但都有一个比较接近的地方：在已有能力上增加一种使用场景之后，需要重新确认相关假设是否仍然成立。

模型重试要考虑结束后留下的状态；Skills 接入新的命令，要考虑上下文预算和配置权限；多个 Target 的处理，要保留数据来源；新增事件入口，也要接上已有的过滤逻辑。

这些问题没有涉及特别复杂的算法，更多是在理解调用过程和边界条件。一个功能单独看能够运行，放到完整流程中，还需要确认它和其他部分能否正确配合。
