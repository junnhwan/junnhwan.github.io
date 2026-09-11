---
title: "Weekly5 Part I：PR-Agent 分片 Review 与异步处理的优化，以及一点碎碎念"
description: "记录这周在 PR-Agent 合并的 8 个 PR 和 ag2 的 1 个修复，涉及大 Diff 分片 review 的完善、异步处理中的阻塞与取消、解析细节和性能优化。"
pubDate: 2026-09-11
tags: ["开源", "Agent", "AI工程", "周记"]
category: "Weekly"
featured: false
draft: false
---

## 写在前面

> 提示：前面写了一堆废话纯碎碎念，比较消极悲观，可以跳过。

又到周末了，这周过完其实小厂实习也一个月了，但是说实话，真的没感觉有什么收获，这个公司的氛围挺好的，同事都挺友好，没有什么被push的压力，福利感觉也还行，零食什么的很多，还有每周体验一次不同的下午茶都很美味。

但是呢？当我反思我有什么能写在简历上的实习经历这个板块的内容的时候，我又沉默了，在这种环境下，当我在一段实习过程中，我还得为找下一段实习考虑。公司负责的项目全是 gpt5.6 写的，自己基本没怎么看过代码，review也是让AI 去 review，测试环境出了什么问题就让AI改... 虽然不可否认的是，随着AI的飞速进步，除非那种特别有历史包袱的需要牵扯很多其他项目内部历史上下文背景的，几乎全流程全部交给AI几乎是必然的。

所以我在实习公司这一个月其实就是这样一直循环往复，其实就是纯纯的许愿式编程，而且负责的项目也没什么复杂的，确实只是纯纯CRUD，要包装真的没什么能包装的，真的就是小儿科使用场景，没什么内容能包装上简历。

此外，这周真的一直感觉到莫名的焦虑烦躁，**一边是牛客、xhs上各种今年27届秋招的惨状...** **一边是看着跟自己同届的28届的各种晒中大厂实习offer...** 让我怀疑自己是否真的能走下去，每每看到这些社媒上的信息我只有剩下无尽的焦虑、自卑，感觉根本看不到自己的未来，到了明年秋招我是不是会走一条完全不同的道路？跟开发一点关系都没有？说实话要说对开发真的有什么热爱吗，其实真的没有，只是想讨口饭吃罢了，但是你要说转行能到什么其他行业吗，我也说不出来，感觉自己真的不是很会打交道，像什么产品、销售、运营之类的，感觉我面试这些岗位的话，可能没几分钟就被面试官认为不合适了吧... **我一直在哭**

碎碎念废话确实扯太多了，还是按照之前写的几篇weekly复盘一下这周的一些 pr，一个是 ag2（是一个python写的多Agent框架，定位是"AgentOS"？可以上github搜一下，4.9k+ stars的那个） 这个项目的一个小fix，是关于流式响应失败重试的逻辑fix，此外就是 PR-Agent 了，主要是关于分片 diff Review 的一些fix还有性能优化，以及异步处理的优化，下面就开始分别讲一下。

## 大 Diff 分片 Review 的完善

PR-Agent 在处理大 Diff 时，会把文件拆成多个 chunk 分别发给模型。这周有三个 PR 都和这条路径有关。

[PR #3034](https://github.com/The-PR-Agent/pr-agent/pull/3034) 给 `/improve` 增加了每文件建议数上限。之前每个 chunk 独立生成代码建议，汇总之后，单个文件可能积累很多条。这次加了一个可选的 `max_suggestions_per_file`，在分数过滤和跨 chunk 汇总之后生效，保留得分最高的几条。默认值为 0，不改变原有行为。

[PR #3229](https://github.com/The-PR-Agent/pr-agent/pull/3229) 修复的是分片部分失败时的问题。大 Diff review 中，如果某个 chunk 请求失败，后续的 finding 解析逻辑可能会把之前成功 chunk 的结果也一并清除。这次修改在存在任意 chunk 失败时阻止 finding resolution，但保留成功 chunk 的 review 结果和合并输出。

[PR #3291](https://github.com/The-PR-Agent/pr-agent/pull/3291) 是一个性能优化，避免分片路径中重复准备 Diff。`PRReviewer` 在准备预测时已经转换和计算了文件 patch 的 Token，但 `get_pr_multi_diffs` 又重新获取并准备了一遍同样的 Diff。这次通过 request-scoped 的 `PreparedPRDiff` 复用已准备好的数据，复用限制在同一模型、Token handler 和行号格式内。fallback 路径仍各自准备数据。PR 描述中的离线 benchmark 显示 wall p50 下降约 32%。

这三个改动方向不同，但都围绕同一个前提：大 Diff 被拆成多个 chunk 之后，汇总和清理逻辑需要重新确认。

## 异步流程中的阻塞与取消

这周另一组改动和异步执行的正确性有关。

[PR #3107](https://github.com/The-PR-Agent/pr-agent/pull/3107) 修复了 `/ask` 处理图片 URL 时阻塞事件循环的问题。原来的图片 liveness 检查直接在 async handler 里同步调用 `requests.head()`，没有 timeout。如果图片服务器响应慢，整个事件循环都会被阻塞。这次改用 `asyncio.to_thread()` 把同步请求放到线程池，并设置了 5 秒超时。失败或 404 的处理逻辑不变。

[PR #3166](https://github.com/The-PR-Agent/pr-agent/pull/3166) 让 MOSAICO 的 A2A 任务可以被正确取消。A2A SDK 的取消流程是先取消 producer，再调用 executor 的 `cancel()` 回调。但在长任务开始后、第一个 artifact 产出前，还没有持久化的 Task 可以更新，取消信号无处可去。这次在进入长任务前先发布一个 `TASK_STATE_WORKING` 的 Task，并实现了 `cancel()` 回调，让 A2A 事件队列能收到 `TASK_STATE_CANCELED`。

[PR #3293](https://github.com/The-PR-Agent/pr-agent/pull/3293) 把 Asana ticket context 的获取从串行改成了并发。开启 ticket 分析后，`/review` 会在调用模型前获取最多三个 Asana 任务的上下文，原来是逐个 await。这次改成有界并发批量请求，结果按原始输入顺序消费，prompt 上下文不依赖完成顺序。父任务取消时也会显式取消并等待所有并发任务。PR 的离线 benchmark 显示 wall p50 下降约 68%。

这三个问题的共同点是，异步代码的正确性不只取决于"能不能跑通"，还包括是否阻塞了事件循环、取消信号能否传播、以及并发任务之间的资源清理。

## 解析细节与平台适配

[PR #3125](https://github.com/The-PR-Agent/pr-agent/pull/3125) 修复了 MOSAICO supplied-diff 解析中路径包含 ` b/` 的问题。原来的正则 `(?P<a>.+?) b/` 是非贪婪匹配，遇到路径中包含 ` b/` 时会在第一个匹配处截断，导致文件名解析错误。这次改为优先从 `---` 和 `+++` 文件头读取路径，没有时再回退到 `diff --git` 头。

[PR #3226](https://github.com/The-PR-Agent/pr-agent/pull/3226) 修复了 Bitbucket Cloud 的 persistent comment 链接丢失问题。Cloud provider 继承了基类的空 `get_comment_url()`，所以更新评论时渲染出来的链接是空的。这次实现了 `get_comment_url()`，从 Cloud comment 中取出 `comment.data["links"]["html"]["href"]`。

这两个都是比较小的修复，但都说明同一个问题：解析和适配层里，正则和继承的默认行为可能在边界条件下出错。

## ag2 的流式重试问题

除了 PR-Agent，这周也给 ag2 提了一个修复。

[PR #3216](https://github.com/ag2ai/ag2/pull/3216) 处理的是 `RetryMiddleware` 在流式输出已经开始后仍然重试的问题。如果一次 LLM 调用在已经输出了部分 `ModelMessageChunk` 之后失败，原来的逻辑仍然会重新发起一次完整请求。消费者会先看到失败 attempt 的部分内容，再看到成功 attempt 的完整内容。这次在每次 retryable attempt 中追踪是否已经发布了 chunk，如果已经发布，就不再重试，直接把异常抛出。失败发生在 chunk 发布之前的，仍然保留原有重试行为。

这个问题的核心是：流式输出一旦被消费者看到，就不能简单地当作"没发生过"。

## 一点体会

这周的 PR 可以分成两条线。一条是大 Diff 分片 review 的完善：限制每文件建议数、处理部分失败、复用已准备的数据。另一条是异步处理的正确性：不阻塞事件循环、让取消信号能传播、并发获取时保留顺序和清理资源。

这两条线最后指向的问题其实比较接近：当一个流程被拆成多个部分执行时，无论是 chunk 还是并发任务，都需要重新考虑汇总、失败和取消的边界。单独看每个部分都能正常运行，但组合起来之后，状态传递和资源清理是否正确，就需要单独验证。

这周也有两个性能优化 PR，但都没有改 prompt 或模型调用，更多是减少重复工作和把串行改成并发。benchmark 是 PR 描述里的离线数据，不代表实际生产环境的提升。

## 写在最后

这篇在前面写了一些自己最近的感受，比较悲观消极，看个乐吧，感觉没地方宣泄，只能通过博客来讲出来，可能会好受一点。周末和下周开始准备一下新的简历怎么写吧，多复盘一下开源还有自己的项目，还有尽量找一下实习能偷产出的地方？感觉很想开始找下家了，但是又要开始准备面试还是会有点后怕，对于面试的恐惧还是没完全脱敏。希望能逐渐对面试脱敏，找到更好的公司做自己想做的业务吧。。

