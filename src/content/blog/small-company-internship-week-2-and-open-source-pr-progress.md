---
title: "小厂实习 Week 2:从0开始的项目全栈开发初探以及开源pr推进"
description: "记录小厂实习第二周:需求梳理、Kratos + MongoDB 的全栈初探，以及 k8sgpt 中两个已合并 PR 和两个推进中 PR。"
pubDate: 2026-08-21
tags: ["实习", "开源", "Kubernetes", "周记"]
category: "Weekly"
featured: false
draft: false
---

这周实习和开源两边都有明显进展。实习从产品原型进入了真正的全栈开发;开源里我在 k8sgpt 的两个小 fix 被合并了，又新开了两个 PR 在等 review。

## 这周的项目开发

上周刚来的那三天，因为产品实习生还没到，leader 先让我自己搞了一下原型。当时也确实没了解过相关的东西，所以做出来的东西很粗糙简略。

这周新的产品实习来了，而且还是个研二的校友，难绷——结果我工位那一排坐了三个人都是同校校友 🤣。产品来了之后，才真正体会到研发跟产品"撕逼"的痛苦 😭。

前两天主要是讨论项目功能、对清需求，等产品做好原型图和文档。第三天才开始正式开发。

进了项目才发现公司用的框架主要是 kratos，之前在 KubeVela 那边见过但一直没深入了解;数据库用的也不是 MySQL 而是 MongoDB。可能是项目内部使用、比较简单的原因吧，总之这套技术栈对我都还算陌生。不过代码基本都是 AI 写的，所以心智负担不是很大，还好有 Cursor Pro 和 GPT Pro 的加持。

Cursor 可以选前端比较强的模型（比如 Opus 5 或者 Grok 4.6）来写前端 UI，比傻逼 GPT-5.6-sol 写的垃圾前端好看很多。GPT 做前端是真的不敢恭维，只能说一言难尽。所以分工上就明确了很多:spec 文档和后端实施文档让 5.6-sol 来写，luna 来编码。还好 token 管够，开发的这三天每天 GPT 都要烧三亿以上的 token，还不算 Cursor 上写前端耗的，加起来差不多一天五六亿 token 了。这个量应该还算常规，不过要是自己花钱烧的话，肯定烧不起 🤡。

项目本身是公司内部用来激励员工的一个商城类项目，规模不大，就内部几十个人用。所以高并发、海量数据这些都不用考虑太深，主要得把业务逻辑梳理清楚——因为这个商城跟常规商城在业务上有些不同，系统还要接一些公司内部的其他 SDK 和组件，所以理清业务链路、集成接入外部功能，还是得想清楚。

## 开源:两个 Merged，两个在 Review

之前提的那两个 issue 被 maintainer 认可了，我又提了两个小 fix 的 PR 并已被 merge，主要是两个 Analyzer 的小 bug 修复。

跟上周偏向"补齐遗漏的扫描范围"不太一样，这周的改动更多是处理一些接近真实运行状态的边缘情况——正常操作触发了误报，或者失败状态下数字对得上却漏报，这些都免不了要稍微了解 Kubernetes 资源的状态机。

### [\#1741:ConfigMap 引用扫描补上 projected volume 来源](https://github.com/k8sgpt-ai/k8sgpt/pull/1741)

ConfigMap Analyzer 之前只统计了 `volumes[].configMap` 这一处直接引用。

但一个 ConfigMap 完全可以通过 `projected.sources[].configMap` 这种方式被引用，典型的例子就是 `kube-root-ca.crt`——它是 kubelet 通过默认的 service-account projected volume 给每个 Pod 自动挂载的。由于这个来源没被统计到，凡是只通过 projected volume 引用的 ConfigMap 都会被误报成"未使用"。

这次修改遍历了 `volume.Projected.Sources[].ConfigMap`，同时保留原先对直接引用的统计，并补充了针对 projected 场景的回归测试。

### [\#1740:副本数匹配时仍能上报 Deployment 滚动更新超时](https://github.com/k8sgpt-ai/k8sgpt/pull/1740)

Deployment Analyzer 之前只拿 `spec.replicas` 和 `status.readyReplicas` 比数量。

但滚动更新失败时，旧的 ReplicaSet 往往还保持在 Ready 状态，于是副本数是匹配的，而 `Progressing=False / ProgressDeadlineExceeded` 其实已经记录了超时——这类失败之前被完全漏掉了。

这次改成按 condition 的 type 来判断 Progressing 状态，超时时把 reason 和 message 一起带上上报，而 `Progressing=True`（健康或仍在进行中）则不报。

这周自己也新开了两个 PR 在等 review:

### [\#1743:补 healthy rollout 期间的副本不匹配误报](https://github.com/k8sgpt-ai/k8sgpt/pull/1743)

反过来补一种情况:滚动更新正常进行时，如果 controller 还没观察到最新 generation、或者 `Available` 和 `Progressing` 同时为 True，就不该把它当成副本不匹配。现有的 `Progressing=False / 超时` 失败仍然保留上报。

### [\#1747:把 NetworkPolicy 的 Pod 查找限定到政策自身所在命名空间](https://github.com/k8sgpt-ai/k8sgpt/pull/1747)

之前 cluster 级分析时，一个命名空间里的 policy 可能因为匹配到另一个命名空间里同名的 Pod，而掩盖了"该命名空间内其实没有 Pod 被选中"的诊断。

## 一点体会

这两个礼拜连下来，对这套 Analyzer 的套路也熟了一些:每个资源都是"先看 spec、再看 status conditions、逐个 condition 类型判断"。

而最容易出错的地方其实不在逻辑本身，而在自己对底层 API 语义的理解够不够。比如 Gateway 的 condition 是 map 不是数组、Job 是看终态而不是看 failed 计数、projected volume 的 source 结构等。

这些知识平时面试八股里未必讲得到，但恰恰是只有读懂真实代码、跑过真实测试才会真正理解的东西。