/**
 * Curated open-source contributions, shared by the home page panel and /about.
 * Dates are upstream merge dates verified on GitHub; keep both pages in sync
 * by editing this module only.
 */

export interface CuratedPr {
  number: number;
  /** Upstream commit-style title, shown on /about and in link tooltips. */
  title: string;
  /** Merge date in ISO format (YYYY-MM-DD). */
  date: string;
}

export interface CuratedTopic {
  title: string;
  description: string;
  prs: CuratedPr[];
}

export interface CuratedRepo {
  repo: string;
  name: string;
  stack: string;
  note: string;
  topics: CuratedTopic[];
}

export const featuredRepos: CuratedRepo[] = [
  {
    repo: 'thedotmack/claude-mem',
    name: 'claude-mem',
    stack: 'TypeScript · SQLite · Chroma',
    note: 'Agent 的跨会话持久记忆引擎',
    topics: [
      {
        title: '语义检索的召回与分页',
        description: '修复语义检索在过滤、合并与分页边界丢失结果的问题：翻页不再重复首页，被过滤器挤掉的语义候选按有界预算扩宽，FTS 在同主题词被全部丢弃时按词频有界补回。',
        prs: [
          { number: 4617, title: 'fix(search): paginate semantic memories after filtering and merging', date: '2026-10-12' },
          { number: 4956, title: 'fix(sqlite): preserve bounded matches in topic-focused FTS recall', date: '2026-10-22' },
          { number: 4960, title: 'fix(search): widen filtered semantic candidates before pagination', date: '2026-10-22' },
        ],
      },
      {
        title: '记忆写入与来源保真',
        description: '显式笔记写入向量库时保留 Codex/Cursor 来源；标题去重不再吞掉原生笔记的修订内容；跨天暂存的事件保留真实捕获时间；导入的记忆挂回目标会话身份。',
        prs: [
          { number: 4613, title: 'fix(worker): preserve spooled memory capture timestamps', date: '2026-10-12' },
          { number: 4699, title: 'fix(import): attach restored memories to existing session identities', date: '2026-10-12' },
          { number: 4705, title: 'fix(memory): preserve native note revisions with title dedup enabled', date: '2026-10-12' },
          { number: 4708, title: 'fix(memory): preserve source when indexing explicit notes', date: '2026-10-12' },
        ],
      },
      {
        title: '索引与托管端的并发正确性',
        description: '托管端记忆生成用精确锁围栏，被回收的迟到响应不再覆盖新结果；SQLite 到 Chroma 的回填与转发按行串行化，旧快照不再覆盖新记忆；会话上下文先按类别选取再限额。',
        prs: [
          { number: 4620, title: 'fix(context): select server observations and summaries before limiting', date: '2026-10-12' },
          { number: 4731, title: 'fix(chroma): serialize memory projections and refresh queued rows', date: '2026-10-13' },
          { number: 4739, title: 'fix(server): fence reclaimed memory generation attempts', date: '2026-10-13' },
        ],
      },
    ],
  },
  {
    repo: 'The-PR-Agent/pr-agent',
    name: 'PR-Agent',
    stack: 'Python · LiteLLM · A2A',
    note: '开源代码审查 Agent',
    topics: [
      {
        title: '模型上下文预算',
        description: '/ask_line 在发送请求前按实际模型重新计算 Prompt，裁剪历史并保留当前问题。',
        prs: [{ number: 2862, title: 'fix(ask-line): enforce conversation history token budget', date: '2026-08-28' }],
      },
      {
        title: '分块容错与恢复',
        description: '保留成功分块，提供可选的失败分块补跑；按顺序汇总结果，并恢复模型部署配置。',
        prs: [
          { number: 2829, title: 'fix(suggestions): retain successful chunks after partial failure', date: '2026-08-28' },
          { number: 3324, title: 'feat(improve): recover failed chunks with fallback models', date: '2026-09-14' },
        ],
      },
      {
        title: '上下文准备性能',
        description: '在同一请求中复用 Diff 预处理与 Token 计数，切换备用模型时单独准备。',
        prs: [{ number: 3291, title: 'perf(review): reuse prepared diff chunks', date: '2026-09-11' }],
      },
      {
        title: 'A2A 多轮上下文',
        description: '在同一用户与会话范围内恢复 PR / Diff 上下文，继续处理后续任务。',
        prs: [{ number: 3643, title: 'fix(mosaico): retain A2A context across follow-up tasks', date: '2026-09-23' }],
      },
      {
        title: '预算外文件的如实上报',
        description: '/improve 因 token 或调用预算跳过部分变更文件时，在覆盖说明中列出被排除的文件，而不是输出看起来完整的结果。',
        prs: [{ number: 3645, title: 'fix(improve): report files omitted from suggestion coverage', date: '2026-09-24' }],
      },
    ],
  },
  {
    repo: 'k8sgpt-ai/k8sgpt',
    name: 'k8sgpt',
    stack: 'Go · Kubernetes',
    note: 'Kubernetes 智能诊断工具',
    topics: [
      {
        title: '新增资源分析器',
        description: '新增 ValidatingAdmissionPolicy 与 ResourceClaim 分析器，识别类型检查告警与缺失引用。',
        prs: [
          { number: 1765, title: 'feat: add ValidatingAdmissionPolicy analyzer', date: '2026-09-14' },
          { number: 1768, title: 'feat: add ResourceClaim analyzer for missing DeviceClasses', date: '2026-09-26' },
        ],
      },
      {
        title: '引用与使用的误报修复',
        description: 'ConfigMap 分析器补充扫描 init 容器与 projected 卷来源；NetworkPolicy 的 Pod 匹配限定在策略所在命名空间；RoleBinding 按 roleRef.kind 解析 ClusterRole 引用。',
        prs: [
          { number: 1722, title: 'fix: scan init containers for ConfigMap usage', date: '2026-08-11' },
          { number: 1741, title: 'fix: scan projected volume sources for ConfigMap usage', date: '2026-08-19' },
          { number: 1747, title: 'fix: scope NetworkPolicy pod lookup to policy namespace', date: '2026-09-25' },
          { number: 1755, title: 'fix: resolve ClusterRole references in RoleBindings', date: '2026-09-14' },
        ],
      },
      {
        title: 'Deployment 状态诊断',
        description: '结合状态更新与 Progressing 条件，减少正常滚动更新误报，并补充发布超时诊断。',
        prs: [
          { number: 1740, title: 'fix: report Deployment ProgressDeadlineExceeded when replica counts still match', date: '2026-08-19' },
          { number: 1743, title: 'fix: ignore in-progress Deployment replica mismatches', date: '2026-09-25' },
        ],
      },
      {
        title: '工作负载状态边界',
        description: 'ReplicaSet 在已有部分副本时也上报 ReplicaFailure；StatefulSet 分析器尊重非零起始 ordinal，从正确的 Pod 序号开始检查。',
        prs: [
          { number: 1750, title: 'fix: report ReplicaFailure regardless of replica count', date: '2026-09-14' },
          { number: 1759, title: 'fix: honor StatefulSet start ordinals', date: '2026-10-07' },
        ],
      },
    ],
  },
];

export interface SideRepos {
  repo: string;
  prs: { number: number; title: string }[];
}

export const moreRepos: SideRepos[] = [
  {
    repo: 'The-PR-Agent/pr-agent',
    prs: [
      { number: 3011, title: 'GitHub Review 提交后触发命令' },
      { number: 2993, title: 'CodeCommit 多目标 PR 审查' },
    ],
  },
  {
    repo: 'k8sgpt-ai/k8sgpt',
    prs: [
      { number: 1725, title: 'Job 重试成功后的状态诊断' },
      { number: 1737, title: '按类型识别 Gateway 状态条件' },
    ],
  },
  { repo: 'ag2ai/ag2', prs: [{ number: 3216, title: '流式输出后的重试边界' }] },
  { repo: 'kubevela/kubevela', prs: [{ number: 7303, title: 'TraitDefinition 准入冲突校验' }] },
];

// Short labels for the home page panel; falls back to the upstream title.
const PR_LABELS: Record<number, string> = {
  4960: '过滤后扩宽语义候选',
  4956: 'FTS 同主题词有界补回',
  4739: '记忆生成加锁围栏',
  4731: '向量回填按行串行化',
  4708: '笔记索引保留来源',
  4705: '去重保留笔记修订',
  4699: '导入记忆挂回会话',
  4620: '上下文分类先选取再限额',
  4613: '保留跨天捕获时间戳',
  4617: '语义检索先合并再分页',
  3645: '上报被预算排除的文件',
  1768: '新增 ResourceClaim 分析器',
  1759: 'StatefulSet 起始 ordinal',
  1755: 'RoleBinding 引用解析',
  1750: 'ReplicaFailure 独立上报',
  1747: 'NetworkPolicy 限定命名空间',
  1743: '忽略滚动更新中的副本差异',
  1741: '扫描 projected 卷引用',
  1722: '扫描 init 容器引用',
  3643: 'A2A 会话保留 PR 上下文',
  3324: '失败分块用备用模型补跑',
  1765: '新增 ValidatingAdmissionPolicy 分析器',
  3291: '复用已准备的 Diff 分块',
};

export interface RecentPr {
  repo: string;
  name: string;
  number: number;
  title: string;
  label: string;
  date: string;
  url: string;
}

/** The newest curated merges across repos, newest first. */
export const recentMergedPrs: RecentPr[] = featuredRepos
  .flatMap((repo) => repo.topics.flatMap((topic) => topic.prs.map((pr) => ({ ...pr, repo: repo.repo, name: repo.name }))))
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 3)
  .map(({ repo, name, number, title, date }) => ({
    repo,
    name,
    number,
    title,
    label: PR_LABELS[number] ?? title,
    date,
    url: `https://github.com/${repo}/pull/${number}`,
  }));
