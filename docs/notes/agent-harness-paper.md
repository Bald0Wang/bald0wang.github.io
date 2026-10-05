# Harness Engineering：11 个编码 Agent 的解剖报告

> 📖 读书笔记 · 信息来源：X 用户 [Yarchi（@undefinedKi）](https://x.com/undefinedKi) 2026-10-03 的[这条推文](https://x.com/undefinedKi/status/2106479763636302271)（转发链条起点为[原推](https://x.com/undefinedKi/status/2106479644354474463)）
> 📄 论文原文：arXiv [2609.00006](https://arxiv.org/abs/2609.00006) · [PDF 直链](https://arxiv.org/pdf/2609.00006)
> 整理于 2026-10-05 · 译文为个人学习摘要，版权归原作者

## 推文翻译

**原推**（该推文的完整观点）：

> 这可能是今年关于 AI Agent 最有用的一篇论文。
>
> Wavestone AI Lab 的团队拆解了 Claude Code、Codex 以及另外 9 个编码 Agent，找出了每个优秀 Agent 赖以构建的**七件套蓝图**。
>
> 他们的定义：**Agent = 模型 + Harness（驾驭层）**。全部 11 个 Agent 都在构建这个 harness。

**跟推**（本笔记来源链接指向的这条）：

> 论文：arxiv.org/pdf/2609.00006

## 论文信息

- **标题**：《Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems》（驾驭层工程：编码 Agent 的解剖、架构与演化——十一个系统的源码研究）
- **作者**：Paul Barbaste、Tristan Darrigol、Germain Vu、Tom Wiltberger（InclusiveBrains / Wavestone AI Lab），2026 年 7 月
- **研究对象**：11 个生产级编码 harness——Claude Code、Codex CLI、Gemini CLI、Mistral Vibe、OpenHands、Aider、Mini-SWE-Agent、Hermes、Pi、OpenCode、**OpenClaw**，外加首个「元 harness」Omnigent 作对照

## 核心定义与摘要翻译

> **Agent 就是「模型 + harness」**：harness 是那个把 LLM 与真实世界耦合起来的运行时——通过循环、工具、上下文管理、安全控制、编排和扩展 surface。「Harness engineering」（驾驭层工程）作为一门学科在 2026 年初被命名，本文为这门年轻的学科给出了迄今最全面的实证基础。

论文对 11 个系统做了源码级解剖，映射出**七个标准子系统**（每个都给出最小与最大实现），并沉淀出 13 条横切观察与 29 个复现设计模式。

![七个子系统与 90 行最小实现](/images/agent-harness-blueprint.jpg)

*论文配图：七个子系统的最小观测形态（Agent loop / LLM 集成 / 工具与动作 / 记忆与上下文 / 安全与权限 / 编排 / 可扩展性），右侧是 Claude Code、Codex、Gemini CLI 等大多数系统共用的迭代循环：Prompt → LLM Call → Execute → Observe。*

约 90 行的 `harness.py` 最小形态：`loop()`（调用→执行→观察→重复）、单一模板的 `llm.call()`、只有 bash 一个工具、完整保留的消息历史、`guard()` 步数与成本限制、**刻意不做子 Agent**、任意匹配对象皆可插入的 plugins。

## 最有意思的发现

- **约 400 万行 Python/TypeScript/Rust 中**：没有任何一个 Agent 运行时导入通用 Agentic 框架，也没有任何一个用向量嵌入检索代码——这个领域靠**手写 async 循环 + 确定性检索**运转；
- **Skills 的采用率（9/11）超过了 MCP（8/11）**；ACP 出现在 6 个系统中，并带来第三个新角色：harness hosting（驾驭层托管）；
- **纵向对照样本**：原有一批系统被重新 pin 而非替换，同一个季度内的 source diff 显示——**趋同正在变成模仿**，行为策略正从提示词散文迁移到配置文件；
- **论文主旨**：2026 年上半年，编码 harness 完成了从「工具」到「平台」的转身；
- 结尾给出 18 条设计建议和一个 90 行的最小可用 harness。

## 我的一点延伸

被拆解的 11 个系统里有 **OpenClaw**——就是我写过安装教程的那只「小龙虾🦞」，可以对照论文的七件套去看看它的实现取舍。论文的「模型 + harness」二分也和我给 [good-harness](https://github.com/Fyuan0206/good-harness)（"给 AI 装马鞍"教程）提 PR 时琢磨的问题完全同频：**决定 Agent 上限的往往不是模型本身，而是那层把模型接住真实世界的运行时。**

- [返回笔记目录](/notes/)
