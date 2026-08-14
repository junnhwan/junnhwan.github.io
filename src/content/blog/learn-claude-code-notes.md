---
title: "learn-claude-code 学习记录"
description: "通过拆解 mini coding agent 的实现机制，深入学习 AI Agent 开发中的核心要点与架构设计。"
pubDate: 2026-06-21
tags: ["Agent", "Claude Code", "AI工程", "源码剖析"]
category: "AI & Agents"
featured: true
draft: false
---

## Prologue

这篇blog来记录学习 [learn-claude-code](https://learn.shareai.run/) 的过程笔记，主要是为了通过学习一个mini coding agent来学习agent开发的一些相关知识点，记录内容主要是一些我自认为比较重要的，如果有比较简略的还需看原网站进行补充。

整体学习路径总览

![image-20260622184129156](/images/posts/image-20260622184129156.png)

## s08 Context Compact

> 四层压缩管线策略，先便宜后贵

关于cc的上下文治理

* applyToolResult**Budget**()，先看有没有大的工具结果（超过某个阈值就算大，具体看源码），让大结果落盘不一次性读
* **snip**Compact()，裁剪中间消息，举个教学版的例子就是，只保留头部3条以及尾部47条
* **micro**Compact()，指的是旧的工具结果用占位表示，如果需要知道这个信息，可以在占位语句提示模型re-run这个tool（例如：Earlier tool result compacted. Re-run if needed）
* context**Collapse**（），上下文折叠
* autoCompact（），就是一次LLM API调用，进行摘要，是最贵的决策，会消耗token

简单讲就是 budget -> snip -> micro -> collapse，触发阈值就compact\_history

下面附一张网站的讲解，关于cc对read的tradeoff：

![image-20260621173336607](/images/posts/image-20260621173336607.png)

关于cc的压缩的Prompt：

* 强调compact过程**不能调用工具**，只输出文本，在开头和结尾都会强调：`CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.`
* 要求模型**先分析再总结**，分析的包裹在<analysis>标签中，正式的摘要在<summary>中，analysis最后会被剥离

## s09 Memory

> 压缩会丢失细节，但是记忆不会，文件仓库 + 索引 + 按需加载 → 跨压缩、跨会话的知识积累

四类记忆：

* user ，人物画像，你是谁
* feedback，怎么做事，用户提出的什么rules
* project，正在做什么
* reference，在哪找东西

四种动作：

* 存储，.memory / \*.md文件（yaml frontmatter，name/desc/type）和 MEMORY.md 索引
* 加载，SYSTEM prompt常驻索引MEMORY.md，LLM side-query选文件
* 提取，每轮结束LLM提取偏好/约束（检索已有，避免重复）
* 整理，文件大于某阈值，去重/合并/剪枝，cc把这种机制叫做Dream，实际的门控是这四层：时间间隔、扫描节流、会话数、文件锁

下面补充说明一下Dream的四层门控：

![image-20260621192030373](/images/posts/image-20260621192030373.png)

## s13 Background Tasks

> 任务 —— 后台线程跑命令，异步执行，不阻塞主循环，完成后以tool\_result的形式注入通知

如何触发：

在这个教程中，是通过关键词来触发启动后台任务的，如下：

```python
def is_slow_operation(tool_name: str, tool_input: dict) -> bool:
    """Fallback heuristic: commands likely to take > 30s."""
    if tool_name != "bash":
        return False
    cmd = tool_input.get("command", "").lower()
    slow_keywords = ["install", "build", "test", "deploy", "compile",
                     "docker build", "pip install", "npm install",
                     "cargo build", "pytest", "make"]
    return any(kw in cmd for kw in slow_keywords)
```

而在cc中，它的Bash工具schema有个`run_in_background`的bool参数，由模型自己判断是否这个命令要后台运行

后台执行与生命周期：

把工具调用包装成一个worker函数，放在`daemon`线程执行，后台任务都有唯一id，还没完成之前用占位语句来表示：`[Background task {bg_id} started] Result will be available when complete.`

> 关于**daemon线程**，这个含义是，如果是daemon，主线程退出的同时这个daemon会被强行杀掉；如果不是daemon，主线程退出时会等它跑完，否则不会退。
>
> 其实就是**生命周期**的管理，看整个程序退出时，要不要等这个后台线程跑完
>
> 关于**bg\_id**的作用，这个个人认为应该是因为后台执行这个做法把一次工具调用拆成了**“启动started”**和**“完成completed”**两个不连续的事件，所以要一个唯一标识来将二者重新认成同一件事

通知收集：

后台任务完成，会收集结果并格式化用`<task_notification>`包裹来通知

实际运行流程可表示如下：

![image-20260622184048805](/images/posts/image-20260622184048805.png)

关于cc中的实现：

cc中没有用多线程，是在一个Node.js/Bun单线程循环中，其“后台”只是不“await”，是通过stdout/stderr重定向到文件，让进程独立运行

cc中命令队列的通知格式是结构化的xml：

```xml
<task_notification>
  <status>completed</status>
  <summary>Background command "npm test" completed (exit code 0)</summary>
</task_notification>
```

## s15 Agent Teams

> 团队 —— 多Agent协作，靠`jsonl`文件收件箱 + 队友线程

先看一下 这里 Multi-Agent跟之前的SubAgent的区别，见如下表格：

![image-20260622184026524](/images/posts/image-20260622184026524.png)

实现原理：

1. `MessageBus`，文件收件箱

Leader和每个队友都有各自的jsonl文件收件箱，发消息就是往通信对象的jsonl append一行json，读消息就是读取文件+删除（消费式）

2. `spawn_teammate_thread`，启动队友

每个队友抛在daemon线程中，有自己的system prompt、messages、简化的工具集，完成后自动汇报，例如`BUS.send(name, "lead", summary)`把结果发给leader

3. Lead的inbox注入，每轮主循环结束后Lead检查收件箱有没有新的队友消息

举个例子有如下Agent协作流程图：

![image-20260622184004661](/images/posts/image-20260622184004661.png)

---

cc实现：

* cc的实现还有个权限冒泡机制更为严谨，说明如下图：

![image-20260622183819220](/images/posts/image-20260622183819220-1782124703413-1.png)

* 15种结构化消息：

![image-20260622183738571](/images/posts/image-20260622183738571.png)

* 没有中央消息总线，就是文件系统：cc的收件箱实现是直接写其他Agent的inbox（路径：`~/.claude/teams/{teamName}/inboxes/{agentName}.json`），同时要用**文件锁保证并发安全**
* 队友生命周期：

![image-20260622183720460](/images/posts/image-20260622183720460.png)

* Team Config团队配置

![image-20260622183703208](/images/posts/image-20260622183703208.png)

## s16 Team Protocols

> 协议 —— Agent 之间的结构化握手，request-response模式驱动协商

上一节还有个队友生命周期`（Lead → 队友）`的问题，假设做到一半想要停止队友，有可能队友文件写到一半被杀了，所以就需要关机握手与消息约定，让队友收尾后退出，也就是**团队协议**，每个人都要遵守。还有计划审批`（队友 → Lead）`，也需要协议来沟通确认。

这一节新增三个 func，**ProtocolState**（请求状态追踪）、**dispatch\_message**（按消息类型路由到处理器）、**match\_response**（通过 request\_id 关联回复与请求，含类型校验）

实现原理：

1. ProtocolState 请求状态

这是协议握手的一个核心数据结构，如果了解计网的话对这些字段应该不陌生，是很经典的一个请求-响应的数据模型

```python
@dataclass
class ProtocolState:
    request_id: str      *# 唯一 ID，如 "req_004281"*
    type: str            *# "shutdown" | "plan_approval"*
    sender: str          *# 发起方*
    target: str          *# 接收方*
    status: str          *# pending | approved | rejected*
    payload: str         *# 计划文本或关机原因*
    created_at: float    *# 时间戳*

pending_requests: dict[str, ProtocolState] = {}
```

`request_id`是贯穿一次协议握手的key，请求带出去，回复收回来

下面是以关机为例的一个完整链路：

![image-20260622183603273](/images/posts/image-20260622183603273.png)

2. dispatch\_messages 按消息类型路由

新增协议类型的话就新增一个if分支

```python
def handle_inbox_message(name, msg, messages):
    msg_type = msg.get("type", "message")
    req_id = msg.get("metadata", {}).get("request_id", "")

    if msg_type == "shutdown_request":
        BUS.send(name, "lead", "Shutting down.", "shutdown_response",
                 {"request_id": req_id, "approve": True})
        return True   *# 停止循环*

    if msg_type == "plan_approval_response":
        approve = msg["metadata"].get("approve", False)
        messages.append({"role": "user",
            "content": "[Plan approved]" if approve else "[Plan rejected]"})
    return False       *# 继续循环*
```

3. match\_response 类型校验

校验响应类型是否匹配请求类型

```python
def match_response(response_type, request_id, approve):
    state = pending_requests.get(request_id)
    if not state:
        return
    if state.type == "shutdown" and response_type != "shutdown_response":
        return  *# type mismatch, skip*
    if state.type == "plan_approval" and response_type != "plan_approval_response":
        return
    if state.status != "pending":
        return  *# already resolved, skip duplicate*
    state.status = "approved" if approve else "rejected"
```

4. consume\_lead\_inbox 统一inbox消费
5. idle\_loop 队友等待（轮询）而不是退出

cc实现：

如下图：

![image-20260622183933510](/images/posts/image-20260622183933510.png)

## s17 Autonomous Agents

> 自治 —— 不依赖Lead分配，空闲时轮询，有活就干

前两节都是要Lead自己分配任务手动assign给队友，这节要实现队友自组织，自己发现、认领、完成

## s18 Worktree Isolation

> 隔离 —— 并行执行的任务隔离，worktree 按ID绑定管目录

## s19 MCP Tools

> 插件 —— 外部能力通过标准协议接入，Agent 发现、组装、调用 mcp tools ，不需要知道tools是谁写的

## s20 Comprehensive Agent Turn

> 综合 —— 将前面学习的综合起来，在**一个**循环中，挂**多个**不同机制：工具、权限、记忆、任务、团队、插件

一个长期工作的coding agent需要：

* 工具分发和权限边界
* hooks 扩展点
* todo 计划和任务图
* 技能、记忆、系统 prompt 组装
* 压缩和错误恢复
* 后台任务和 cron 调度
* 团队、协议、自治认领
* worktree 隔离
* MCP 外部工具接入

总览图：

![image-20260622183459610](/images/posts/image-20260622183459610.png)

```
Text用户输入
  → UserPromptSubmit hooks
  → cron/background 通知注入
  → context compact
  → memory + skills + MCP 状态组装 system prompt
  → LLM
  → has tool_use block?
      否 → Stop hooks → 返回
      是 → PreToolUse hooks + permission
          → TOOL_HANDLERS / MCP handlers / background dispatch
          → PostToolUse hooks
          → tool_result / task_notification 回 messages
          → 下一轮
```
