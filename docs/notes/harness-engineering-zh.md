---
title: Harness Engineering 中文全译
---

# 《Harness（驾驭层）工程：编码 Agent 的解剖、架构与演化》中文全译

> 📄 原文：*Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems* · Paul Barbaste, Tristan Darrigol, Germain Vu, Tom Wiltberger（InclusiveBrains / Wavestone AI Lab）· arXiv [2609.00006](https://arxiv.org/abs/2609.00006) · [PDF](https://arxiv.org/pdf/2609.00006)
> 🔑 原文以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 授权发布，本中文翻译遵循同一许可、以相同方式共享。
> 🤖 全译由 AI（ZCode）辅助完成、经人工校订整理于 2026-10-05；导读与要点版见 [Harness Engineering 笔记](/notes/agent-harness-paper)。参考文献列表从略（见原文）；推文信息源见[原推](https://x.com/undefinedKi/status/2106479644354474463)。

## Harness（驾驭层）工程：编码智能体的解剖、架构与演化——对十一个系统的源码研究

原题：*Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems*

arXiv:2609.00006v1 [cs.SE]，2026 年 7 月 15 日 · 许可协议：CC BY 4.0

**作者**

- **Paul Barbaste**（Inclusive Brains；Wavestone AI Lab）——领衔作者兼通讯作者
- **Tristan Darrigol**（Wavestone AI Lab）
- **Germain Vu**（Wavestone AI Lab）
- **Tom Wiltberger**（Wavestone AI Lab）

（2026 年 7 月）

### 摘要

智能体（agent）是模型加上 harness：harness 是通过循环、工具、上下文管理、安全控制、编排与扩展面把 LLM 与外部世界耦合起来的运行时。Harness 工程作为一门学科于 2026 年初得名，研究的就是这个运行时的设计与演化。本文为这门年轻的学科提供了迄今最全面的实证基础。本文是对十一个生产级编码 harness 的源码解剖：Claude Code（Anthropic）、Codex CLI（OpenAI）、Gemini CLI（Google）、Mistral Vibe（Mistral）、OpenHands、Aider、Mini-SWE-Agent、Hermes（Nous Research）、Pi、OpenCode 与 OpenClaw，外加 Omnigent（Databricks）——据我们所知的第一个 meta-harness（元驾驭层）——作为对照点加以分析。本文界定 harness 是什么，绘制其七个标准子系统并给出每个子系统的最小实现与最大实现，然后沿这些子系统逐一解剖全部十一个系统。本文不做基准测试，也不搞排名；它描述并比较这些系统是如何构建的。

这次审计产出 13 条横切观察和一份收录 29 个反复出现的设计模式的目录。两项「缺席」在语料库扩容三倍后依然成立：在约四百万行 Python、TypeScript 与 Rust 代码中，没有任何智能体运行时导入通用 agentic 框架（LangChain、LangGraph、AutoGen 或其他十余个；Gemini CLI 连 Google 自家的那两个也不使用），也没有任何系统用向量嵌入检索代码；这个领域依靠手写的异步循环与确定性检索（ripgrep、tree-sitter、glob、自动发现的 Markdown 上下文文件）运转。扩展性标准之争已见分晓：SKILL.md skills 在采用率上领先 MCP（9/11 对 8/11），并出现了注册表、信任分级与语料库中首批由智能体撰写的 skills；ACP 已随六个系统发布，并获得了第三种角色——harness 托管（harness hosting），OpenHands 可将 Claude Code、Codex 或 Gemini CLI 作为可互换的后端运行。

由于最初的八个系统是被重新钉定版本而非替换，本研究还包含一个受控的纵向样本：同一批 harness，跨一个季度进行源码差异比对。差异显示趋同正在变成模仿（Codex 逐字采用 Claude Code 的 hook 词汇表，并发布了可导入其会话与设置的导入器；OpenHands 读取 Claude Code 的插件格式），行为策略正从提示词散文迁移到配置，而 4 月版中有三条观察结论需要就地作出实质性修订。

这些线索汇聚成论文的论题：2026 年上半年，编码 harness 完成了从工具到平台的转变。harness 变成了可导入的 SDK，而框架厂商则开始发布 harness；市场（marketplace）、转换成本工具与企业治理层相继出现；智能体变成了通过 OpenAI 兼容端点即可寻址的模型；一个 meta-harness 如今在同一个 API 背后编排十一个厂商 harness（本语料库中有一半在其中），重新实现其中代价高昂的部分，并对专有部分进行套利。论文最后给出 18 条锚定在所观察代码上的设计建议，以及一个实现了其中十条的 90 行最小可行 harness 脚手架。

**关键词**：harness 工程、编码智能体、LLM 智能体、智能体架构、平台化、工具使用、多智能体系统、MCP、智能体技能

## 1 引言

智能体是模型加上 harness。模型提供智能；harness 通过循环、工具、上下文管理、安全控制、编排与扩展面，把这种智能变成工作。在短短五个月里，harness engineering 从厂商博客文章中铸造的一个短语，成长为一门拥有从业者指南、正式定义、自动化演化系统以及自己在 arXiv 上的谱系的学科（第 2.1 节）。这门学科尚缺的是一部参考：一份立足于生产源码、讲清 harness 究竟是什么、由什么构成、该领域领先实现彼此有何不同的论述。本文就是这部参考，而且它带着一个论题到来：harness 已经不再是一件工具，而是变成了一个平台。

现有文献两个目标都未达到。基准测试综述报告分数（通常是 SWE-Bench [1]）而不触及架构；概念分类学 [5, 6] 描述模式而不涉及实现；唯一一项并行的源码级分类研究 [34] 把界定该领域前沿的厂商原生系统排除在外。没有一项工作触及那些决定 harness 是否可靠、可扩展、可部署的工程决策：循环如何构造、工具如何定义与沙箱化、安全如何强制执行、上下文如何配给。也没有任何工作追问这个品类本身正走向何方。

我们在源码层面研究十一个系统，全部钉定在 2026 年 7 月的发布版本上。其中四个是主要商业 LLM 提供商的旗舰产品：Claude Code（Anthropic，TypeScript，经由一份流传的源码快照）、Codex CLI（OpenAI，Rust）、Gemini CLI（Google，TypeScript）与 Mistral Vibe（Mistral AI，Python）。另外七个是开源项目，覆盖该领域的完整光谱：OpenHands（事件溯源 SDK，自 2026 年年中起也充当对手 harness 的宿主）、Aider（十三种多态编辑格式）、Mini-SWE-Agent（100 行的研究地板）、Hermes（GitHub 上增长最快的 harness，带自我改进的技能循环）、Pi（走最小核心路线的逆潮者）、OpenCode（star 数最多的专用编码智能体，拥有语料库中最彻底的客户端/服务器架构），以及 OpenClaw（多通道网关，我们的非 SWE 对照点）。第十二个系统 Omnigent（Databricks）是首个 meta-harness，即架在其他系统之上的编排层，作为第二个对照点加以分析。由于其中八个系统在本研究 2026 年 4 月版中已被审计过，它们被保留的快照构成了一个受控纵向样本：同一批 harness，跨一个季度做源码差异比对。

本文做出七项贡献。第一项是这门学科的参考解剖学（第 2 节）：harness 的定义及其谱系与边界情形，以及七个标准子系统的组件地图——每个子系统都标注观察到的最小实现与最大实现——论文其余部分即组织于这张地图之上。在这张地图上，论文对十一个 harness 构建了系统性的源码级比较；这是第一个覆盖全部四个厂商原生系统、两个采用最广的开源 harness 以及每个系统标志性能力的语料库（表 4）。审计产出 13 条横切观察与一份收录 29 个反复出现模式的目录，其中若干模式系首次在此记录：智能体维护的记忆管线（agent-maintained memory pipelines）、停止即校验守卫（verify-on-stop guards）、谱系压缩（lineage compaction）、会话树版本控制（session-tree version control）、日志即队列的循环（log-as-queue loops）、语法感知的命令授权（syntax-aware command permissioning）、缓存方言扇出（cache-dialect fanout），以及 harness 模仿（harness mimicry）。

由于最初的八个系统是被重新钉定而非替换，研究还包含一项纵向分析（第 14.5 节）：以源码度量的九十天 harness 演化，其间趋同变成模仿（hook 词汇表被逐字复制、插件格式被采纳、会话导入器被发布），模式沿语料库向下扩散，行为策略从提示词散文迁移到配置。两项经验性「缺席」在十一系统规模上确立，并在语料库扩容三倍后依然成立：没有任何智能体运行时使用通用 agentic 框架，也没有任何系统对代码使用基于嵌入的检索；它们的历史性化解存在于 harness 与框架的融合之中。这场融合通向平台转向论题（第 14 节），并以具名工件为证：harness SDK 与框架构建的 harness 收敛于同一形态、带供应链安全的插件与技能市场、跨厂商会话导入器、移动设备管理（MDM）治理、「智能体即模型」网关（agent-as-a-model gateway），以及对首个 meta-harness 的源码级分析。最后，全部分析凝结成一部从业者指南：18 条设计建议，每条都锚定于一条被引用的观察和一个实现了它的系统；另附一个 90 行的最小可行 harness 脚手架，它直接实现其中十条，并与其余各条兼容。

论文其余部分安排如下。第 2 节定义 harness 及其七个子系统。第 3 节综述相关工作与 2026 年格局。第 4 节阐述方法论；第 5 节给出系统概览。第 6–12 节在整个语料库上解剖七个子系统。第 13 节把横切观察串联起来。第 14 节展开平台转向论题，包括 meta-harness 与纵向分析。第 15 节讨论意涵与局限。第 16 节把分析提炼为 18 条设计建议与 90 行脚手架。第 17 节收束全文。

## 2 什么是 Harness？

在比较各实现之前，我们先确定研究对象。本节界定 harness，追溯这一术语的短暂历史，把它与常被混淆的概念区分开，并列出语料库中每个 harness 都以某种形式实现的七个子系统。初入此领域的读者读完本节，应当确切知道 harness 是什么、由什么构成；论文其余部分将逐格对照生产源码来证实这张地图。

### 2.1 定义与谱系

> 智能体是模型加上 harness。harness 是模型之外的一切：将 LLM 与世界耦合起来的运行时——它的循环、它的工具、它的上下文、它的安全控制、它的编排，以及它的扩展面。Harness 工程就是设计并演化这个运行时的学科。

一行代数式 Agent = Model + Harness 由 Trivedy 在 2026 年初的 LangChain 工程系列文章中推广开来 [28]，而 harness engineering 一词则在 2026 年 2 月进入流通：最初由 Mitchell Hashimoto 顺带使用，随后由 Trivedy 在 LangChain 的 Deep Agents 工作语境中给出定义并加以阐发 [29]。

> 注 1：这段渊源有一处令人愉快的讽刺：这个术语是在 LangChain 内部被命名和定义的，而这家框架厂商的库在本语料库的每一个 harness 运行时中都缺席（观察 13.2）。LangChain 对这种缺席的回应不是游说他人采用，而是发布了自己的 harness——基于 LangGraph 构建的 Deep Agents [37]——它独立收敛到本语料库所记录的那些惯例上：带渐进式披露（progressive disclosure）的 SKILL.md skills、AGENTS.md 记忆、子智能体生成，以及一个待办规划工具。第 14.2 节将回到框架与 harness 之间的这种双向通行。

数周之内，这门学科就获得了自己的从业者文献：Böckeler 面向编码智能体用户的 harness 工程指南 [30]（4 月）、O'Reilly 与独立作者的综述（6 月），以及社区策展的模式目录。学术浪潮沿着同样的弧线而至：Lin 等人的 Agentic Harness Engineering [85] 将 harness 演化自动化；HARBOR [35] 针对基准测试优化 harness；Wang 等人把代码本身重塑为 harness 的基底 [36]；Rombaut 对十三个开源脚手架的源码分类学 [34] 是本研究在方法论上最近的亲缘（第 3.3 节将其十二个维度映射到我们的七个子系统）；Macedo [33] 则首次给出该概念的操作性定义，推导出何者可算作 harness 的充要条件。我们采纳 Macedo 的定义核心——包裹语言模型、把它变成能在仓库上行动的智能体的那一层——并以第 2.3 节的子系统分解加以扩展；定义类文献对这种分解有所示意，但尚未在生产源码中落地。

### 2.2 Harness 不是什么

这个术语的用法颇为松散，四个边界情形解释了大部分混淆 [33]。

- **harness 不完全是 scaffold（脚手架）。** 这两个词在实践中几近同义，本文也从自身早先的词汇中继承了「scaffold」。在区分有用之处，scaffold 指结构性代码（循环、注册表），harness 指嵌入这些代码的成品运行时工件：Mini-SWE-Agent 的 scaffold 是 100 行 Python；Claude Code 的 harness 则是一个带终端 UI、权限系统与插件生态的产品。
- **harness 不是 agentic 框架。** 框架（LangChain、AutoGen、CrewAI）是开发者导入来构建智能体的库；harness 则是开发者置身其中工作的运行时。这一区分在 2025 年还算干净，到 2026 年正在消解——而且是双向消解——这正是第 14.2 节的主题。
- **harness 不是评测 harness。** SWE-bench 的「harness」包裹一个智能体，驱使它去完成任务；智能体 harness 包裹一个模型，驱使它去行动。同一个词，包裹的方向相反。
- **harness 不是编排器。** 编排器（或 meta-harness，见第 14.4 节）自上而下协调一个或多个 harness，自身不实现任何编辑循环。Omnigent 编排十一个厂商 harness——其中五个是本文研究的系统——自身却不实现任何编辑循环；它是关于 harness 的证据，而不是 harness 之一。

### 2.3 七个子系统

语料库中的每个系统，从 100 行的研究基线到百万行的生产级 CLI，都必须对同样这七个子系统表明立场（图 1）——哪怕那个立场是刻意的缺席。它们是第 4 节的分析维度 D1–D7，但我们认为，它们也是这个工件本身的标准解剖：最小实现显示每个子系统可以收缩到多小——其中一例（编排）收缩为刻意的缺席——最大实现则显示每个子系统中十年工程余量之所在。表 1 绘出这幅解剖：每个子系统做什么、观察到的最小与最大形态，以及本文在哪里解剖它。

图 1 的构成要素：

- 接口层（Interface Layer）：TUI / IDE / SDK / server
- Agent Loop（智能体循环）
- LLM Integration（LLM 集成）
- Memory & Context（记忆与上下文）
- Tool & Action System（工具与动作系统）
- Safety & Permissions（安全与权限）
- Extensibility（可扩展性）：hooks / skills / plugins / MCP
- Orchestration（编排）：sub-agents / protocols

> **图 1**：编码智能体 harness 的标准解剖：围绕智能体循环的七个子系统，外加人类与程序借以驱动 harness 的接口层。语料库中全部十一个系统都以不同的复杂度实现了这些子系统；表 1 给出每个子系统的观察范围。

> **表 1**：编码智能体 harness 的组件地图：七个子系统，以及语料库中观察到的最小与最大实现。

| 子系统 | 职责 | 最小形态 | 最大形态 | 节 |
|---|---|---|---|---|
| Agent loop（智能体循环） | 交替进行推理与动作执行；掌握停止条件与失败恢复 | Mini-SWE-Agent：对单个 bash 工具的线性 while 循环 | OpenHands：建立在持久事件日志上的事件溯源会话，支持并行动作批处理 | 6 |
| LLM integration（LLM 集成） | 对接各提供商的协议；组装提示词；管理缓存、思考与路由 | Mini-SWE-Agent：一次 LiteLLM 调用、一个 Jinja 模板 | Hermes：五个自研传输层、29 个提供商档案；Codex：服务器下发的模型目录 | 7 |
| Tools & actions（工具与动作） | 定义并执行智能体能做的事，首当其冲是文件编辑 | Mini-SWE-Agent：只有 bash | Claude Code：43 个带延迟加载的类型化工具；Codex：工具调用作为 V8 执行的代码 | 8 |
| Memory & context（记忆与上下文） | 配给上下文窗口；跨轮次与会话持久化知识 | Mini-SWE-Agent：无界线性历史 | Codex：智能体维护的跨会话记忆管线；Gemini CLI：基于图的上下文蒸馏 | 9 |
| Safety & permissions（安全与权限） | 决定什么能运行、什么要询问、什么被禁止；隔离执行 | Mini-SWE-Agent：成本与步数限制 | Codex：策略规则 + LLM 审批审查器 + 三平台 OS 沙箱 | 10 |
| Orchestration（编排） | 生成并协调子智能体；与其他智能体连接 | Aider：无（设计上即为单智能体） | Claude Code：递归组合；Omnigent：跨厂商协调（元层） | 11 |
| Extensibility（可扩展性） | 让用户与生态系统能力得以扩展：配置、hooks、skills、插件、MCP | Mini-SWE-Agent：结构化类型（Python 协议） | Pi：一切皆扩展的运行时；Codex：市场分发的插件 | 12 |

与这七个子系统并列的还有两个横切面：其一是接口层（TUI、CLI 标志、IDE 协议、HTTP 服务器、SDK），人类与程序通过它驱动 harness；其二是会话基底（转录记录、持久化、恢复/分叉），若干子系统共享之。两者贯穿语料库分析反复出现，而接口层尤其承载着第 14 节的平台化论证。

### 2.4 最小 Harness

上面的分解说明了 harness 由什么构成；却没有说明每个部件需要多少。语料库中就有一个位于地板上的存在性证明：Mini-SWE-Agent 用大约 100 行实现了全部七个子系统——一个 while 循环、一个模板、一个工具、一份消息列表、两条限制、没有编排，以及作为其全部扩展故事的结构化类型——而且它报告的 SWE-bench Verified 成绩与比它大三个数量级的系统处于同一区间。

> 注 2：自报数字，模型与日期各不相同；方法论方面的告诫见第 15 节。即便打上这些折扣，论点依然成立：地板很低。

第 16 节将以一个 90 行的最小可行 harness 闭合这个循环，从业者可以直接复制并加以特化。把这块地板与生产系统区分开的，不是任务完成能力，而是本文记录的其余一切：安全、恢复、成本管理、可扩展性，以及——越来越重要的——第 14 节的那些平台面。

---

## 3 相关背景与工作

### 3.1 LLM 驱动的代码智能体

将 LLM 用作自主编码智能体的理念随着 SWE-Bench [1] 的出现而兴起，该基准由需要端到端解决的真实 GitHub issue 构成。SWE-Agent [2] 引入了智能体-计算机接口（Agent-Computer Interface, ACI），为 LLM 提供专用的文件查看与编辑工具。CodeAct 范式 [3] 主张将智能体动作统一为可执行代码，并论证这种方式可以涵盖离散的工具调用。ReAct [4] 确立了「推理-行动」循环（reasoning-action loop），它支撑着当前大多数智能体架构。

此后出现了第二波面向软件工程（SWE）的智能体。AutoCodeRover [44] 用 AST 感知的检索与基于谱的错误定位（spectrum-based fault localization）取代基于文本的搜索。MASAI [48] 将 issue 解决流水线分解为模块化的子智能体，并在 SWE-Bench Lite 上报告了考虑成本的实验结果。MAGIS [47] 与 CodeR [46] 都为 issue 解决形式化了基于角色的多智能体协作（MAGIS 采用 Manager/Custodian/Developer/QA 角色划分；CodeR 采用显式任务图）。Lingma SWE-GPT [49] 将基座模型与软件工程（SE）过程循环联合训练，这是我们在第 7 节中考察的「模型-智能体协同设计」的一个实例。SWE-Search [52] 在智能体轨迹之上叠加蒙特卡洛树搜索（延续了 Tree of Thoughts [70] 与 LATS [73] 开创的基于搜索的推理路线，Plan-and-Solve [71] 是其中更简单的先导），而 Diversity-Empowers-Intelligence [53] 则在元策略之下对异构智能体进行集成。在设计谱系的另一端，Agentless [51] 报告称，一条固定的「定位/修复/验证」流水线在 SWE-Bench Lite 上可与智能体循环相媲美——在讨论智能体化的复杂性是否必要时，这是一个有用的制衡观点。OpenHands 平台论文 [45] 为我们在第 6 节中审计其源代码的系统提供了经过同行评审的依据。

与本研究同期，Lin 等人 [85] 提出了 Agentic Harness Engineering（AHE），利用可观测性驱动的反馈自动演化智能体 harness（驾驭层）——包括工具、中间件、记忆与子智能体配置。从一个与 Mini-SWE-Agent 相当的仅 bash 起点出发，其系统在 SWE-Bench Verified 上达到 71.9%，且演化出的 harness 可跨模型家族迁移。其组件级消融实验为我们通过源代码分析独立得出的架构侧重点提供了定量证据：工具、中间件与长期记忆承载了提升，而仅靠系统提示词则不然。

### 3.2 智能体架构综述

先前关于智能体架构的工作 [5, 6, 66] 已识别出包括工具使用、记忆管理与规划在内的常见模式。多智能体维度由 Guo 等人 [67] 详细梳理；面向 SWE 的子集由 Liu 等人 [68] 绘制；AgentBench [69] 提供了标准的跨领域评测 harness。这些综述在概念层面展开，描述存在哪些组件，而非这些组件如何实现。本研究通过将架构分析落实于具体实现来补充它们，表明「相同的」模式（例如工具使用）在实践中允许相当大的差异。

### 3.3 同期的源代码分类学研究

与本研究在方法论上最接近的是 Rombaut 的 Inside the Scaffold [34]，它与我们的 4 月版同期开发：这是对十三个开源编码智能体脚手架（scaffold）在固定 commit 上进行的源代码分类学，组织为三层十二个维度（控制架构；工具/环境接口；资源管理），并给出了一个有用的发现：大多数智能体组合使用多种循环原语（ReAct、generate-test-repair、plan-execute、retry、树搜索），而非只实现其中一种。两项研究是互补而非重复的。Rombaut 的语料库仅限开源系统，偏向面向基准的流水线（AutoCodeRover、Agentless、Moatless Tools、DARS、Prometheus、SWE-agent），并因 Claude Code 未公开源代码而明确将其排除。我们的语料库则在源代码层面覆盖了全部四个厂商原生的 harness（包括流传的 Claude Code 快照）、网关与元 harness 这两个对照点，以及最新的大规模采用系统（Hermes、Pi），并将分析扩展到其分类学未触及的维度：执行隔离之外的权限与安全架构、多智能体编排、可扩展性表面（hooks、skills、插件、MCP）、提示词内容、智能体间协议，以及第 14.5 节与第 14 节的纵向与平台分析。他的十二个维度与我们七个子系统的对应关系如下：控制循环策略、循环驱动器与控制流实现细化了我们的 D1；工具集设计、编辑/补丁格式与工具发现策略细化 D3；上下文检索范式、状态管理、上下文压缩与持久记忆细化 D4；执行隔离对应我们 D5 中「隔离」的那一半；多模型路由是我们 D2 中的一个单元格。凡是他的术语比我们更锐利之处（循环原语组合），我们都予以采用。

### 3.4 面向软件工程的多智能体系统

近期工作已探索了面向软件工程的多智能体协作。MetaGPT [7] 为不同的智能体分配专门化角色（产品经理、架构师、工程师）。独立开发的 ChatDev [50] 围绕聊天链（chat-chain）通信组织起一条角色扮演式的开发流水线。AutoGen [8] 提供了多智能体对话的框架。Magentic-One [9] 实现了带有专门化子智能体的编排者（orchestrator）模式。具体到编码领域，MAGIS [47] 与 CodeR [46] 将角色分解与任务图相结合，Chain-of-Agents [72] 则让子智能体在长输入上按序处理。本研究中的若干系统融入了多智能体模式，使得可以在单一领域内对这些方法进行直接比较。

### 3.5 语言模型中的工具使用

Toolformer [10] 证明了 LLM 能够学会使用外部工具。Gorilla [11] 表明，在提供文档的情况下，LLM 能够生成准确的 API 调用。ToolLLM [58] 将工具使用评测扩展到 16,000+ 个真实世界的 API，AnyTool [59] 则展示了面向大型 API 表面的分层工具路由。Model Context Protocol（MCP）[12] 提出了将 LLM 连接到外部工具与数据源的标准接口。本文的分析发现，MCP 已成为跨系统的可扩展性标准，被所研究的十一个系统中的八个采用（全部四个厂商原生智能体，以及 OpenHands、Hermes、OpenCode 和 OpenClaw）。

### 3.6 厂商撰写的工程指导

与学术综述互补的一条线索，是主要 LLM 厂商直接发布的工程指导。2024 年 12 月至 2025 年 9 月间，Anthropic 发布了四篇文章，共同阐明了一套连贯的智能体设计哲学：

- 《Building Effective Agents》[16]：将「工作流」（workflows，预定义代码路径）与「智能体」（agents，LLM 主导的动态过程）进行对比，列举了五种可组合的模式（提示词链 prompt chaining、路由 routing、并行化 parallelization、编排者-工作者 orchestrator-workers、评估者-优化者 evaluator-optimizer），并明确警示不要使用通用智能体框架；
- 《Effective Context Engineering for AI Agents》[19]：将「提示词工程」重新表述为「上下文工程」，记录了长窗口中的上下文腐化（context rot）现象，并推荐一种偏向通过 grep/tail/文件系统进行即时（just-in-time, JIT）检索的混合方法，同时承认预索引检索可以在特定用例中补充 JIT 方法；
- 《Writing Effective Tools for AI Agents》[18]：建立在《Building Effective Agents》[16] 引入的智能体-计算机接口（ACI）概念之上，建议将工具整合为「少量精心设计的」高信号操作，并报告了通过对工具描述进行提示词工程在 SWE-Bench 上取得的提升；
- 《How We Built Our Multi-Agent Research System》[17]：一篇案例研究，报告称采用并行子智能体的编排者-工作者架构在内部评估中超出单智能体基线 90.2%，但消耗的 token 约为单次聊天交互的 15 倍（该比较针对的是简单聊天基线，而非优化过的单智能体流水线）。

作为一个整体来读，这四篇文章勾勒出一个规范性框架，预见了我们后来在各厂商系统之间观察到的许多模式。我们将其作为参考基线，用以评估所研究系统在源代码层面的决策（尤其参见第 15.1 节）。

### 3.7 2026 年的 harness 格局

本文研究的语料库是从一个增长速度远超追踪它的文献的领域中刻意抽取的样本。为本修订版（2026 年 7 月）进行的一次市场摸底发现，除本文分析的系统之外，还有二十多个处于活跃维护状态的编码智能体 harness；表 2 列出了其中最重要的。自本研究初版（2026 年 4 月）以来的三项进展重塑了语料库所处的背景。[注 1]

> **注 1**：本小节中的格局事件取自截至 2026-07-10 的厂商公告、发布说明与仓库元数据；与针对语料库的论断不同，它们未经源代码验证。

**每家厂商现在都发布自己的 harness，市场正在整合。**

除了我们深入分析的四个厂商原生系统之外，GitHub 的 Copilot CLI 于 2026 年 2 月正式发布（GA），Amazon 将其 Q Developer CLI 并入规格驱动的 Kiro 品牌，xAI 于 2026 年 5 月发布了 Grok Build [26]——值得注意的是，这是一个闭源二进制文件（据其发布产物所示为 Rust），其文档描述了对开放生态惯例的全面采纳：AGENTS.md 上下文文件、MCP 服务器、skills、hooks，以及用于编辑器嵌入的 ACP 服务器模式。整合随之而来：SpaceX 于 2026 年 2 月收购 xAI，并于 6 月宣布以 600 亿美元收购 Cursor（Anysphere）；Google 于 5 月宣布 Gemini CLI 将向 Antigravity CLI 过渡，随后在 6 月 18 日终止了面向消费者层级的 Gemini CLI 服务（企业版 Gemini Code Assist 许可仍保留访问与更新）。Google 的这次过渡与其说是品牌重塑，不如说是一次许可证转向：Gemini CLI 采用 Apache-2.0 许可证、在开放环境中开发至约 10.5 万星，而 Antigravity CLI 则以闭源 Go 二进制形式发布、没有公开源代码——因此，在厂商开放开发的三个语料库系统（Codex、Gemini CLI、Mistral Vibe）中，如今有一个已经有了闭源后继者，而我们选取的 v0.50.0 版本锁定捕捉到了这一厂商原生 harness 谱系最后一个重要的开源状态。换言之，harness 层已不再是空白地带：它是厂商购买、重塑品牌并加以管控的战略基础设施。

**开源领域有其自身的引力中心。**

OpenCode [24] 现在是 GitHub 上星标数最多的专用编码智能体（约 18.4 万星），Hermes [22] 则按星标累积速度计增长最快（发布后五个月内达到约 21.2 万星；计数截至 2026-07-10，与表 2 一致）；二者均在本次修订中进入我们的语料库，同时进入的还有 Pi [23]——与之相反的「最小核心」逆流的典型代表。Block 于 2026 年 4 月将其 Rust harness Goose 捐赠给 Linux 基金会的 Agentic AI 基金会，这是我们在该领域识别出的首个供应商中立治理案例。一个社区项目 Claw Code [27] 用 Python 和 Rust 重新实现了 Claude Code 的架构，自称是基于与我们 Claude Code 分析所依据的同一次 2026 年 3 月源代码曝光而来的净室（clean-room）衍生作品，数天之内达到约 10 万星——这表明 harness 架构本身就足以引发社区兴趣，而不仅仅是模型访问权。一波平行的中国厂商 harness（阿里巴巴的 Qwen Code，一个 Gemini CLI 分支；Moonshot 的 Kimi CLI；字节跳动的 Trae Agent）将开放权重模型的发布与各自的 CLI 绑定。与此同时，该领域的开创性系统之一 Aider 进入事实上的社区维护模式（最后一次稳定版发布为 2026 年 2 月），其架构开发在社区分支（aider-ce）中继续。

**一个元层出现了。**

Databricks 于 2026 年 6 月开源了 Omnigent [25]：一个编排层，将整个 harness（Claude Code、Codex、OpenCode、Hermes、Pi、Cursor）视为通用 API 之下可互换的组件，并增加了跨 harness 策略、统一的操作系统沙箱以及可共享的多设备会话。第 14.4 节将其作为本文的第二个对照点进行分析；它的存在本身就是第 14.1 节平台化论证的一个数据点。

表 2：更广泛的编码智能体 harness 格局（2026 年 7 月，均为本研究语料库之外的系统）。星标数为截至 2026-07-10 的近似 GitHub 星标数；闭源系统以「—」标注。

| Harness | 厂商 | 开源 | 星标数 | 说明 |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Google | ✗ | — | 2026 年 5 月宣布为 Gemini CLI 的后继者；闭源 Go 二进制；消费者服务于 6 月 18 日被关停 |
| Copilot CLI | GitHub/Microsoft | ✗ | — | 2026 年 2 月 GA；autopilot 与 fleet 模式；与 GitHub 深度集成 |
| Grok Build | xAI (SpaceX) | ✗ | — | 2026 年 5 月；Rust；计划优先（plan-first）的循环；ACP 服务器；AGENTS.md/MCP/skills |
| Cursor CLI | Anysphere | ✗ | — | 终端中与 IDE harness 的对等；600 亿美元 SpaceX 收购待完成 |
| Kiro CLI | Amazon/AWS | ✗ | — | 原 Q Developer；以规格驱动开发为定位 |
| Cline | Cline Bot Inc. | ✓ | 约 6.4 万 | IDE 安装量超 500 万；plan/act 工作流；Roo/Kilo 分支家族 |
| Goose | Block / Linux 基金会 | ✓ | 约 2.9 万 | Rust；原生 MCP；2026 年 4 月捐赠给 Agentic AI 基金会 |
| Claw Code | 社区 | ✓ | 约 10 万+ | 自称对 Claude Code 的净室式 Python/Rust 重实现 |
| Crush | Charmbracelet | ✓ | 约 2.6 万 | Go 原生、支持 LSP 的 TUI；源自原 opencode（Go）谱系 |
| Qwen Code | 阿里巴巴 | ✓ | 约 2.6 万 | 面向 Qwen coder 模型的 Gemini CLI 分支 |
| Kimi CLI | Moonshot AI | ✓ | 约 9000 | Skills、MCP、「智能体群」（agent swarm）并行 |
| Trae Agent | 字节跳动 | ✓ | 约 1.2 万 | 对研究友好的 Python CLI 智能体 |
| Droid | Factory AI | ✗ | — | 2025 年 9 月 Terminal-Bench SOTA；聚焦企业 CI |
| Amp | Sourcegraph | ✗ | — | 广告支持的免费层；deep 模式研究工作流 |
| Continue CLI | Continue.dev | ✓ | 约 3 万 | 多表面（IDE+CLI）；聚焦本地化与隐私 |

---

## 4 方法论

### 4.1 系统选择

本研究覆盖十一个 harness（驾驭层）外加一个 meta-harness（元驾驭层）对比点，其入选依据是它们沿三个轴向的分布：设计哲学、成熟度与市场地位（表 3）；3.7 节将这一语料置于 2026 年 7 月更广阔的领域图景之中。该集合为每个主要商业 LLM 提供商各收录一个 agent（Anthropic 的 Claude Code、OpenAI 的 Codex、Google 的 Gemini CLI [21]、Mistral 的 Mistral Vibe [20]），另加七个占据不同研究与生产生态位的开源项目——其中包括本修订版新增的三个系统：Hermes（增长最快的开源 harness）、Pi（极简内核的反潮流者）与 OpenCode（star 数最多的专用编码 agent，具有独特的 client/server 分离架构）；延续自前版的开源系统为 OpenHands [13]、Aider [14]、Mini-SWE-Agent [15] 与 OpenClaw。它横跨三种编程语言（Python、TypeScript、Rust）、三个数量级的代码规模，以及从研究基线到完全产品化 CLI 工具的多种设计哲学。所有快照均重新固定（re-pin）到 2026 年 7 月可获得的最新版本（原系统的 2026 年 4 月快照保留用于纵向比较，14.5 节同时利用两批快照）。

表 3：系统选择标准。前十一行构成研究语料；Omnigent 仅作为 meta-harness 对比点加以分析。

| 系统 | 提供方 | 语言 | 版本 | 入选理由 |
|---|---|---|---|---|
| OpenHands | OpenHands（原 All-Hands-AI） | Python | V1 SDK v1.34.0（2026 年 7 月） | 成熟的模块化框架 |
| Aider | 社区（P. Gauthier） | Python | v0.86.3.dev（2026 年 5 月；维护模式） | 多态编辑策略 |
| Claude Code | Anthropic | TypeScript | 源码快照 2026 年 3 月（二进制 2.1.206，2026 年 7 月） | Anthropic 的旗舰 agent |
| Codex | OpenAI | Rust | rust-v0.144.1（2026 年 7 月） | OpenAI 的旗舰 agent |
| Gemini CLI | Google | TypeScript | v0.50.0（2026 年 7 月） | Google 的旗舰 agent |
| Mistral Vibe | Mistral AI | Python | v2.19.1（2026 年 7 月） | Mistral 的旗舰 agent |
| Mini-SWE-Agent | 普林斯顿/斯坦福 | Python | v2.4.5（2026 年 7 月） | 极简主义研究基线 |
| Hermes | Nous Research | Python | 0.18.2（rel. 2026.7.7.2，2026 年 7 月） | 自我改进的 skills；个人/SWE 混合 harness |
| Pi | earendil-works（M. Zechner） | TypeScript | v0.80.6（2026 年 7 月） | 极简内核、极致可扩展性 |
| OpenCode | Anomaly（原 SST） | TypeScript | v1.17.18（2026 年 7 月） | client/server 架构；star 数最多的专用编码 agent |
| OpenClaw | 社区 | TypeScript | v2026.6.11（2026 年 7 月） | 对比点：多渠道助手 |
| Omnigent | Databricks | Python | v0.4.0（2026 年 7 月） | 对比点：harness 之上的 meta-harness |

**OpenClaw 作为外部对比点。** OpenClaw 是该集合中的离群者。其 README 将它描述为个人 AI 助手网关（personal AI assistant gateway），而非编码 agent；它覆盖 20 多个消息平台（WhatsApp、Slack、Discord、Signal、iMessage、Matrix 等），且不自带任何原生代码编辑工具（见表 7，其中 OpenClaw 的条目为 N/A）。OpenClaw 并不亲自编写代码，而是通过插件（opencode、kimi-coding、github-copilot、copilot-proxy）把编码任务委托给专用的 SWE agent。将其纳入作为外部对比点有三个理由。其一，它的插件架构（260 个 SDK 文件、清单驱动的发现机制、严格的 import 边界）能把 SWE 特有的可扩展性模式与属于更广泛 agentic-platform 类别的模式区分开来。其二，它采用了与 SWE 优先 agent 相同的横切标准（ACP 会话生成、MCP、agentskills.io Skills），提供了一个非 SWE 参照系，用以检验趋同论断。其三，它展示了网关-委托模式：一个消费而非实现编码能力的多渠道助手。Hermes 则介于两个类别之间：与 OpenClaw 相同，它也是多渠道个人助手网关（Telegram、Discord、Slack、WhatsApp、Signal、CLI），但与 OpenClaw 不同的是，它自带完整的原生编码工具集，因此我们将其视为语料成员而非对比点，并在关键处标注其混合属性。凡采用率统计对 OpenClaw 的纳入敏感之处，我们同时报告 11 系统口径与 10 个编码 harness 口径。将趋同论断严格理解为针对编码 agent 的读者，应采用 10 系统的数字。

**Omnigent 作为 meta-harness 对比点。** Omnigent（Databricks，2026 年 6 月开源 [25]）并非编码 harness，而是位于 harness 之上的编排层：它把 Claude Code、Codex、Cursor、OpenCode、Hermes、Pi 以及自定义 YAML 定义的 agent 包裹在统一 API 之后，并添加跨 harness 策略、统一的 OS 沙箱与可共享的多设备会话。由于它并未实现自己的编辑循环，若将其与语料一起按七个维度打分将是一种范畴错误；因此 14.4 节将其作为证据，用来分析哪些 harness 能力正在向元层迁移。

### 4.2 分析维度

每个系统沿七个维度进行分析：

- (D1) Agent 循环设计；
- (D2) LLM 集成与模型–agent 协同设计；
- (D3) 工具与动作系统；
- (D4) 记忆与上下文管理；
- (D5) 安全与权限模型；
- (D6) 多 agent 编排；
- (D7) 可扩展性机制。

所有版本均截至 2026 年 7 月（确切的版本固定点见表 3）；对于从本研究 2026 年 4 月版延续而来的八个系统，我们保留了 4 月快照并与 7 月快照做差分，14.5 节报告了三个月的 harness 演化在源码层面呈现的面貌。代码规模数字是在固定快照上测得的近似行数，用于按数量级为系统定位；它们在不同统计口径之间不可复现。

## 5 系统概览

表 4 给出了十一个系统的高层对比。语料横跨三个数量级的代码规模、三种编程语言，以及根本不同的设计哲学；最后一列标注每个系统的「招牌能力」（signature）——即截至 2026 年 7 月，语料中没有任何其他系统以相同形式实现的能力。

> 注 4：本研究 4 月版曾逐系统列出 SWE-Bench Verified 分数。我们已将其从对比表中移除：可得的数字均为自报值，来自不同的模型代次与配置，且若干数字早于系统当前的默认设置。留档起见，2026 年春季的自报数字为：OpenHands 77.6%、Mini-SWE-Agent 74%+、Claude Code 72.7%、Codex 69.1%（均为 SWE-Bench Verified）；其余系统未发布可比较的数字——Pi 明确征集真实会话数据，「而非玩具基准」。

表 4：十一个系统的高层对比及各系统的招牌能力。本表及其他标注 7 月日期的表格中，Claude Code 的单元格反映的是 2026 年 3 月的源码快照（我们所能获得的最新源码）；实际发布的二进制（2.1.206，2026 年 7 月）可能有所不同。

| 系统 | 语言 | 规模 | 提供方 | 工具 | 多 agent | 沙箱 | UI | 招牌能力 |
|---|---|---|---|---|---|---|---|---|
| OpenHands | Python | 中等 | 多提供商 | 25+ | 有 | Docker/Apptainer/远程 | Web+CLI+SDK | 资源锁定的并行工具；以 ACP 后端身份承载竞争对手的 harness |
| Aider | Python | 小型 | 多提供商 | 13 种格式 | 无 | 无 | CLI | 13 种多态编辑格式；语料中唯一的排序式 repo map |
| Claude Code | TS | 大型 | Anthropic | 43 | 有 | 可选启用的运行时 + worktree | CLI | 延迟工具加载；共享提示词缓存的 fork；被他人复制的参照系 |
| Codex | Rust | 特大型 | OpenAI | 25–30 | 有 | 原生（3 种 OS） | CLI/TUI | agent 维护的跨会话记忆；工具调用作为 V8 执行的代码 |
| Gemini CLI | TS | 特大型 | Google | 35+ | 有 | 原生（3 种 OS） | CLI/TUI | 将模型路由作为运行时调度；语料中唯一的 A2A 服务器 |
| Mistral Vibe | Python | 小型 | Mistral+ | 12+ | 有 | worktree 可选 | CLI/TUI | 中间件管道循环；经 ACP 暴露 rewind |
| Mini-SWE-Agent | Python | 微型 | 多提供商 | 1 | 无 | Docker+ | CLI | 100 行下限：以最小化方式实现全部七个子系统 |
| Hermes | Python | 特大型 | 多提供商（自有） | 69 | 有 | 6 种可插拔后端 | CLI/TUI/Web + 28 渠道 | 自我改进的 skill 循环；lineage 压缩；停止时验证 |
| Pi | TS | 中等 | 多提供商，35 家 | 7 | 可扩展 | 无（设计使然） | CLI/TUI | 一切皆扩展的内核；会话树版本控制 |
| OpenCode | TS | 大型 | 多提供商 | 17 | 有 | 无（策略层面） | client/server | client/server 式 harness；语法感知的命令权限控制 |
| OpenClaw | TS | 大型 | 多提供商 | 109+ | 有 | 无 | 多渠道 | 网关委托；每次回复前的 Active-Memory 子 agent |

「规模」为定性描述，反映系统主源码树中数量级意义上的代码库规模：Tiny（约 5 K LoC）、Small（约 20–40 K）、Medium（约 80–110 K）、Large（约 500 K+）、Very large（约 600 K+，其中 Codex 在 7 月快照中约 1.1 M 行 Rust）。这些数字在不同语言与统计口径之间不可直接比较；报告它们只是为了在简约–能力轴上为系统定位。

**观察 1。** 这十一个系统在代码规模上横跨三个数量级，而面向的任务相近，但循环的精巧程度并不能预测基准表现。Mini-SWE-Agent 的极简线性循环取得了与 OpenHands 的事件溯源对话引擎处于同一区间的报告结果，尽管后者仅循环编排一项就投入了多得多的代码。生产系统中的大部分代码量所处理的关注点都与任务完成正交：安全、用户体验、可扩展性——以及日益增多的客户端与传输层：OpenCode 约五分之三的非测试源码是其 TUI、Web、桌面与 SDK 客户端而非 harness 本体，而 Codex 的 7 月代码树则为 app-server 传输、插件和一个实时语音层投入了六位数行数的代码——任何基准都不会去度量这些。

## 6 Agent 循环设计

agent 循环是在 LLM 推理与动作执行之间交替的核心控制流，是每个 SWE agent 的架构支柱。我们在所研究的系统中识别出三种不同的范式。

### 6.1 Agent 循环范式分类

全部十一个系统都实现了 ReAct [4] 模式的变体，但各实现在复杂度、并发性与状态管理上差异极大。我们识别出三种范式：迭代式行动-观察（九个系统）、反思增强（Aider，Hermes 则把同样的功能移入循环的停止条件），以及协调者-工作者（叠加在迭代循环之上，在 Claude Code 与 Codex 中是规范做法，在 Hermes 中由配置开启）。Rombaut 的并发分类法 [34] 给出了有用的更细粒度观点：大多数生产级循环是对原语（ReAct、generate-test-repair、plan-execute、retry）的组合而非单一实现；如今四家提供商原生系统全部自带的计划模式（第 10 节）就是把 plan-execute 嫁接到 ReAct 之上。

围绕这一子系统的领域词汇仍在铸造之中。Loop engineering（循环工程）一词于 2026 年 6 月开始流通，正处于本研究的两次快照之间：Steinberger（OpenClaw 的原作者）把这一转变浓缩为一句广为流传的格言——别再给编码 agent 写提示词，要「设计出能提示你的 agent 的循环」[31]；数日后 Osmani 为这一实践命名并搭建了框架，赋予循环一个由触发器、拓扑、验证器与停止规则组成的解剖学结构 [32]。这个新造词与本节的主题是互补关系而非同义：harness engineering 构建的是下文剖析的内层「行动–观察」循环，而 loop engineering 则从外部把该循环组合成自我维系的外层循环，无需人类逐轮撰写提示词即可提示、验证并重跑 agent。两个学科的接缝在语料中已可见一斑，即外层验证循环模式（表 12）：OpenHands 的 /goal 端点在每次运行结束后运行一个 LLM 裁判，随后要么重新提示要么停止；Hermes 的 verify-on-stop 守卫则否决内层循环自身的退出——这些 harness 特性的唯一目的，就是在内层循环之外再闭合一个外层循环。

### 6.2 迭代式行动-观察循环

最常见的模式遵循「提示词构建 → LLM 推理 → 工具执行 → 观察收集」的循环。九个系统实现了这一模式，各具特色。

**OpenHands：事件溯源对话引擎。** OpenHands 的循环——自 2026 年年中的重构起，位于 software-agent-sdk 仓库而非应用仓库——是一个事件溯源（event-sourced）对话引擎：LocalConversation 驱动 Agent.step()，每个事件都追加到持久化的 EventLog（通过 FileStore 每事件一个文件，采用基于 flock 的加锁，并经 SecretRegistry 做密钥脱敏），而 LLM 眼中的历史是活动分支的缓存投影。会话状态是一棵带可移动头指针的树，因此重放、分叉与分支导航都是一等公民。每次 step() 发起一次 LLM 调用，但会把响应中的所有工具调用作为一个动作批执行——可选地经由 ParallelToolExecutor 并行执行，它受 tool_concurrency_limit 与一个以每个工具所声明资源（文件、终端会话、浏览器）为键的资源锁管理器约束，因此只有争用同一资源的调用才会串行化（下文 Claude Code 段落及表 18 将此与 Claude Code 的布尔式划分相对照）。StuckDetector 在重构中完整保留：与 V0 代码库相同的五种失败场景（重复的行动-观察对、重复的出错动作、独白循环、交替模式、上下文窗口错误循环），如今阈值可配置且默认启用。

**Claude Code：带并发工具批处理的流式循环。** Claude Code 的循环响应经 Server-Sent Events（SSE）流式传输，并带有细粒度的事件处理（content_block_start、content_block_delta、content_block_stop）。其最具特色的功能是智能工具批处理（intelligent tool batching）：工具调用经由单遍 reduce 算法按并发安全性划分成批。工具默认 isConcurrencySafe=false（安全的默认值），必须显式选择加入并行执行。只读工具（grep、glob、文件读取）是安全的；写入工具（edit、bash）则不然。当 LLM 同时请求多个独立读取时，该设计能显著降低延迟。

**Codex：Tokio 异步状态机。** Codex 的循环以 Rust 实现，是一个基于 Tokio 的异步状态机。Session 结构体通过来自 OpenAI Responses API 的流式 ResponseItem 事件（从 SSE 或 WebSocket 流帧反序列化）来编排回合，工具调用经 FuturesOrdered 处理以实现有序并行执行，如今已重构进专门的 ToolCallRuntime。关键入口点：Codex::spawn() 创建新会话，submit_with_id() 提交操作，next_event() 为流式响应提供非阻塞的事件读取（曾经单体的 codex.rs 已被拆分为 session/ 模块和一个 CodexThread 抽象，但这些入口点保留了下来）。

**Mini-SWE-Agent：极简线性循环。** Mini-SWE-Agent 实现了最简单的变体（代码清单 1）：

```python
def run(self, task):
    self.add_messages(model.format_message(
        "system", render_template(system_template)))
    self.add_messages(model.format_message(
        "user", render_template(instance_template, task=task)))
    while True:
        result = self.step()
        if result.role == "exit":
            return result

def step(self):
    self.query()
    return self.execute_actions()

def query(self):
    self.check_limits()
    self.n_calls += 1
    msg = self.model.query(self.messages)
    self.add_messages(msg)

def execute_actions(self):
    for action in msg["extra"]["actions"]:
        obs = self.env.execute(action)  # subprocess.run()
        self.add_messages(
            model.format_observation_messages(obs))
```

代码清单 1：Mini-SWE-Agent 的 agent 循环（精简版；省略了 v2.4.5 中存在的格式错误处理、成本/时间记账与轨迹保存）。

这里没有状态机、没有事件溯源、也没有并发机制。消息列表线性且无界增长，完全依赖 LLM 的原生上下文窗口。这种极简主义是刻意的：该设计有意把 LLM 能力与 agent 脚手架复杂度隔离开，以检验一方能在多大程度上替代另一方。不过连这条下限也在上移：v2.4 系列加入了单次运行的现实时间（wall-clock）上限与连续畸形动作响应的上限——循环如今在连续 N 次格式错误后中止，而非无限循环——因此语料中的极简系统也获得了一个极简的卡死检测器。

**Mistral Vibe：中间件管道循环。** Mistral Vibe 的循环是一个 Python async/await 迭代循环，其中回合级策略被抽离为可组合的中间件管道（middleware pipeline）。核心会话循环驱动标准的「提示词 → LLM → 工具」循环，但每次迭代会先走过一叠中间件的前置回合检查，然后随事件完成将其产出给调用方。开箱即用六个中间件：TurnLimitMiddleware、PriceLimitMiddleware（每会话成本上限）、TokenLimitMiddleware（会话总 token 上限，2.9 系列加入）、AutoCompactMiddleware（在 token 阈值处触发摘要）、ContextWarningMiddleware（会话接近上下文窗口上限时告警）与 ReadOnlyAgentMiddleware（为只读 agent 档位屏蔽写入工具）；用户取消则通过 is_user_cancellation_event() 检查内联处理，而非作为中间件。单个 LLM 响应内的工具调用通过把每个工具 spawn 为 asyncio.create_task() 并在完成时产出事件来并发执行，是 Codex 的 FuturesOrdered 的更细粒度变体。中间件设计在语料中独一无二。新的回合级策略无需修改循环体即可加入，同一个循环仅凭替换中间件组合就能驱动六个已注册的 agent 档位（default、plan、accept-edits、auto-approve、explore、lean）；第七个 chat 档位不为 CLI 会话注册，而是由 ACP 层为 IDE 集成动态注册。与此同时，计划模式已从仅靠提示词变成结构性设计：专用 plans 目录下的计划文件是该档位唯一可写目标，exit_plan_mode 工具发出 PlanReviewRequestedEvent，对切回可写入档位的转换加以闸控。

**Gemini CLI：带混合循环检测的异步生成器循环。** Gemini CLI 的循环以 TypeScript 实现为异步生成器。每次迭代向 UI 产出类型化的 ServerGeminiStreamEvent 元组，经 ModelRouterService 运行当前模型，通过 @google/genai SDK 流式接收响应，并经由一个状态机 Scheduler 分发函数调用，让每个工具走完 Validating → Executing → Completed/Errored。一个独特之处是 LoopDetectionService，它是混合式而非纯确定性的：SHA-256 哈希以低代价捕捉常见失败模式（五次完全相同的工具调用或十段完全相同的内容块即中止循环），而在单个提示词内经过三十个回合后，一个基于 LLM 的自检会以自适应间隔运行——这种两层设计与 OpenHands 手工枚举的五种场景形成对照。会话回合上限（默认 100）提供硬顶，十一个生命周期钩子事件（BeforeAgent/AfterAgent、BeforeModel/AfterModel、BeforeToolSelection、PreCompress 等）让扩展得以检查或否决循环。调度器并行执行工具调用，且自 v0.45 起按并发安全性划分：改动文件的工具（edit、write_file）与 update_topic 被强制串行执行，而且——语料中独一无二——模型自身也拿到一个并发旋钮：每个工具 schema 上自动注入的 wait_for_previous 布尔值，模型可借其将任意调用串行化。调度器经 outputUpdateHandler 回调把工具的实时输出流式传给 UI，让用户看到长时间运行的命令的进展。

**Hermes：带停止守卫的预算循环。** Hermes 在每个用户回合内运行单个迭代式工具调用循环，受线程安全的 IterationBudget 约束（默认 90；execute_code 占用的迭代可获返还；预算耗尽时还有最后一次宽限调用供模型做总结）。使它与众不同的不是循环体而是它的出口：十一个枚举的回合退出原因，以及两个可否决过早最终答案的停止守卫。verify-on-stop 守卫在本回合改动了代码文件却未产出新鲜验证证据时，会把纯文本响应改写为一次继续（continuation）——这正是反思循环的功能，只是从循环内部移到了停止条件上，而成本只是其一小部分。卡死检测对工具名加排序后的 JSON 参数做哈希（SHA-256），两次相同失败后告警、八次后停止——但硬停止出厂即关闭：默认姿态是把告警附加到工具结果上，相信模型会自我纠正。工具批只有在每个调用都只读安全、或按路径限定且前缀互不重叠时，才在八个 worker 的线程池上并行；回合中途的用户转向（steering）被拼接进最后一个工具结果，置于防注入标记之后。

**Pi：带转向队列的函数式内核。** Pi 的循环是语料中仅次于 Mini-SWE-Agent 的最纯粹迭代实现：一个约 790 行的函数式内核，没有规划器、没有反思步骤、没有回合上限、没有卡死检测，也没有成本急停开关——循环一直运行到模型停止调用工具为止，而这些缺席全都是成文的设计拒绝。两个原语尤为突出。其一，运行中的用户输入是一等公民：steer() 队列在当前回合的工具调用之后注入消息，而 followUp() 仅在 agent 本将停止时才排空。其二，工具调用默认经 Promise.all 并行执行，配有一个以 realpath 为键的逐文件修改队列来串行化编辑，以及一个独特的截断投毒守卫（truncation-poisoning guard）：当助手消息在长度上限处被截断时，其所有工具调用一律判失败、不予执行，因为抢救式解析出的流式参数可能在暗中不完整却仍通过校验。恢复机制是分层的而非枚举式的：一份约 40 种模式的瞬时错误重试白名单，以及上下文溢出时的一次性「压缩后重试」。

**OpenCode：日志即队列的循环。** OpenCode 的循环是一个字面意义上的 while(true)，但有一个不寻常的转折：消息日志兼任工作队列。待处理的子 agent 生成与压缩不是控制流分支，而是持久化的消息部件，循环每次迭代从中出队一个——这使循环在进程重启后能轻松续跑，因为队列本身就是对话记录。没有默认步数上限（maxSteps 默认为 infinity）；达到配置的上限时，harness 会追加一条宣布工具已禁用的助手消息，而不是抛出错误。卡死检测是单条启发式，且一如其风格地经由权限系统路由：连续三次字节级相同的工具调用会触发一个 doom_loop 权限询问，而非自动中止——由用户而非 harness 来判断这种重复是否是 bug。并行工具调用在没有 harness 上限的情况下并发执行，重试位于 harness 层并采用感知 retry-after 的指数退避；上下文溢出绝不重试——直接切换为压缩。

### 6.3 反思增强循环

Aider 以反思机制扩展了基本循环。run_one() 方法实现了一个嵌套循环：每次 LLM 响应之后，系统应用编辑，然后检查 lint 错误（经一个三阶段 Python 管道：语法检查 → 编译检查 → flake8）、测试失败以及未解决的文件提及。若检测到问题，reflected_message 会带着纠正性上下文重新调用 LLM，直至可配置的上限（默认 3 次反思）。

其 linter 集成尤为值得关注：它使用 grep_ast 的 TreeContext 来展示错误行周边的代码上下文，为 LLM 的修正提供精确的定位信息。

Aider 仍是唯一主循环呈反思形态的系统，但语料中已长出三个结构上的表亲：Gemini CLI 的 edit 工具以一个 LLM「编辑修复器」子调用收尾，用于修复失败的匹配（8.4 节）；OpenCode 把 LSP 诊断回灌进每一次编辑结果；Hermes 的 verify-on-stop 守卫则在回合出口处执行一次反思检查，而非每轮迭代一次。这一模式是语言模型自我纠错研究脉络——Reflexion [54]、Self-Refine [55]、CRITIC [56] 与 Self-Debug [57]——在野外的实例化，而这条脉络此前基本停留在学术文献中。Aider 的贡献在于集成：lint 与测试信号作为那些论文所理论化的纠正性反馈，被回灌进循环。关于其停止条件的一点说明：Aider 根本没有工具调用循环——回合在补全流结束时结束，run_one 在没有待处理反思或达到上限时退出；它从不检查 end_turn 结束原因。

### 6.4 协调者-工作者模式

Claude Code 与 Codex 支持一种协调者模式，由父 agent 编排多个工作者 agent；Hermes 把同样的形态置于配置之后（orchestrator 角色加 spawn-depth 设置即可解锁嵌套委托树，另外还有一个独立的 Kanban 蜂群模式，以子进程方式在 SQLite 黑板上运行「规划根 → 工作者 → 验证者」）。这是迭代循环之上的一个叠加层，增加了分层派发机制。

在 Claude Code 中，协调者经 AgentTool 生成子 agent，每个子 agent 获得一个分叉的上下文，带有隔离的 AbortController、克隆的文件状态缓存以及被抑制的权限对话框。工作者经 <task-notification> XML 块把结果传回，协调者在委派下一阶段之前先综合各项发现。工作流结构为：研究 → 综合 → 实现 → 验证。

在 Codex 中，子 agent 经 AgentControl::spawn_agent() 生成，获得专属的 ThreadId，并通过类型化的 Mailbox 通道通信。每个线程维护自己的历史，SpawnAgentForkMode 控制上下文继承（FullHistory 或 LastNTurns(N)）。

多 agent 编排的详细分析推迟到第 11 节。

### 6.5 对比分析

图 2 对比了三种范式。

- (a) 迭代式：提示词 → LLM 调用 → 执行 → 观察
- (b) 反思式：提示词 → LLM 调用 → 应用编辑 → Lint/测试 → 反思？（是 / 否）
- (c) 协调者式：协调者 → 工作者 1 / 工作者 2 / 工作者 3 → 综合

图 2：三种 agent 循环范式：(a) 迭代式行动-观察（OpenHands、Claude Code、Codex、Gemini CLI、Mistral Vibe、Mini-SWE-Agent、Hermes、Pi、OpenCode；OpenClaw 为事件驱动变体），(b) 反思增强（Aider），(c) 叠加在 (a) 之上的协调者-工作者（Claude Code、Codex；Hermes 中由配置开启）。

表 5 对循环特征进行了详细对比。

表 5：十一个系统的 agent 循环特征详表。

| 系统 | 循环类型 | 并发性 | 卡死检测 | 停止条件 |
|---|---|---|---|---|
| OpenHands | 事件溯源会话 | 并行批（资源锁；limit 默认 1） | 5 种场景 | State=FINISHED |
| Aider | 生成器 + 反思 | 顺序 | 反思次数上限 | 流结束且无待处理反思 |
| Claude Code | 流式 + 批处理 | 按安全性划分 | 无（人工） | end_turn |
| Codex | Tokio 异步状态机 | FuturesOrdered | 无 | end_turn |
| Gemini CLI | 异步生成器 + 调度器 | 并行；编辑强制串行；模型可见的 wait_for_previous | 混合：SHA-256 + 30 回合后 LLM 检查 | end_turn / 100 |
| Mistral Vibe | 异步 + 中间件 | asyncio.create_task | 中间件（回合/价格/token/压缩） | end_turn |
| Mini-SWE-Agent | 线性 while | 顺序 | 步数上限；格式错误上限；现实时间 | exit 消息 |
| Hermes | 带停止守卫的预算 while | 并行批（8 worker，安全性门控） | SHA-256 调用签名（先告警） | 文本响应，除非 verify-on-stop 否决；90 次迭代预算 |
| Pi | 函数式 while + steer/followUp 队列 | Promise.all；逐文件修改队列 | 无（设计使然） | end_turn（无上限） |
| OpenCode | 日志即队列的 while(true) | 并行，无上限 | Doom-loop → 权限询问 | 无工具调用；steps ?? Infinity |
| OpenClaw | 事件驱动 ACP | RPC 隔离 | 速率限制 | 会话结束 |

---

## 7 LLM 集成与模型–Agent 协同设计

Agent 脚手架如何与其底层 LLM 相关联，是整个系统中最具分量的设计决策之一。语料库横跨了从单一供应商紧耦合到完全供应商无关的完整区间，而在此谱系上的位置直接决定了脚手架可用的优化手段。

### 7.1 供应商抽象谱系

十一个系统采用了五种截然不同的策略：

**单一供应商紧耦合（Anthropic、OpenAI、Google）。** Claude Code 独用 Anthropic SDK（`@anthropic-ai/sdk`）；Codex 使用 OpenAI Responses API 并配 WebSocket 流式传输；Gemini CLI 使用 `@google/genai` SDK，并在企业部署中额外耦合 Vertex AI。这些系统难以更换供应商：Claude Code 依赖 Claude 专属特性（extended thinking、带静态/动态边界的 prompt caching、`tool_use` block 格式）；Codex 依赖 OpenAI Responses API 的线上协议格式，并为每一代 GPT 维护模型专属提示词——截至 2026 年年中，这些提示词以服务端 model-catalog 数据的形式在运行时刷新交付，而非编译进客户端的模板（见 7.2 节）；Gemini CLI 运行一个 ModelRouterService，经由一条可插拔策略链（fallback、override、approval-mode、三个分类器策略——其中之一可经托管的 LiteRT-LM 运行时对本地 Gemma 模型运行——以及 default），把每个请求分派到某个 Gemini 变体。在我们两次快照之间，路由器的目标集合整整跨越了一个模型世代：gemini-3(.1)-pro-preview 与 GA 版 gemini-3.1-flash-lite 现已是默认解析目标，Gemma 4 模型可被路由，而 2.5 家族仅作为「无 preview 访问权限」时的回退存活——这证明路由层的存在恰恰是为了吸收模型更迭，使循环免于随之更迭。

**供应商优先、通用回退（Mistral）。** Mistral Vibe 介于紧耦合与完全抽象之间：一个工厂在 MistralBackend（使用官方 mistralai SDK）与 GenericBackend 之间做选择，后者支持 Anthropic、Vertex、OpenAI 兼容端点，以及自 v2.9 起的 OpenAI Responses 端点。Mistral 后端利用 Mistral 专属特性（`reasoning_effort` 枚举，由模型的五级 thinking 字段映射而来；ThinkChunk 流块被解析进独立的 `reasoning_content` 字段），通用后端则提供一条可移植的逃生通道。这与基于 LiteLLM 的系统哲学不同：Mistral Vibe 并不对称对待所有供应商，而是以更深的集成优待自家供应商，把其余供应商当回退。

**经由抽象层的多供应商。** OpenHands、Aider 与 Mini-SWE-Agent 都以 LiteLLM 作为通用抽象，支持跨供应商的 100+ 模型。这带来快速的模型切换，但引入了对 LiteLLM 供应商映射的依赖。Aider 走得最远：其模型注册表带有 350+ 模型的逐模型元数据——edit format、weak model 名称、cache control、额外 API 参数、reasoning tag 处理。OpenHands 则在抽象层之上叠加了自己的路由：一个按用量键控的 LLMRegistry、一个存放命名配置的独立 LLMProfileStore、可插拔的 RouterLLM 实现以及回退策略——于是「基于 LiteLLM」不再意味着功能最简。

**经由自有传输实现的多供应商。** 本修订版新增的三个系统占据了 4 月版四分谱系中不存在的位置：完整的多供应商支持且不用任何抽象库，供应商矩阵全部手工构建，并被锤炼到与厂商原生集成同等的深度。Hermes 在 29 个声明式 ProviderProfile 插件背后内置五个传输实现（chat-completions、Anthropic Messages、Bedrock Converse、Codex Responses，以及一个进程外的 Codex app-server）——profile「由传输层读取，而不是接收 20 多个布尔开关」——并配有从 models.dev 拉取的 3,800+ 模型元数据。Pi 在 35 个内置供应商之间手写了九套线上协议实现，以约 20 个逐模型兼容性怪癖开关（包括面向 OpenAI 兼容主机的十种 thinkingFormat 方言）把逐供应商条件代码的成本一次性、集中地付清——而且它使出了语料库中最大胆的耦合技巧：harness（驾驭层）拟态（harness mimicry）。在 Claude Pro/Max OAuth token 上，它整体呈现 Claude Code 的身份（"You are Claude Code" 系统提示词开场、beta headers，乃至规范工具名的大小写——在传输层被重新大小写），以搭乘消费级订阅；并以同样的方式对接 ChatGPT 套餐的 Codex 后端。OpenCode 把流式传输与工具分派委托给 Vercel 的 AI SDK 和 models.dev 注册表——这是语料库中唯一一个内部 LLM 管道采用第三方 SDK 的系统——然后把协同设计集中在一个约 1,400 行的逐供应商变换矩阵里（按发布日期门控的 reasoning 档位、逐模型温度默认值、六种同时存在的提示词缓存方言），甚至能在运行时从注册表字段安装新供应商。

**混合插件式。** OpenClaw 实现了可插拔的供应商系统，为 10+ 供应商提供第一方适配器，特性包括 auth profile 轮换、用于故障转移的 last-good 追踪，以及降级密钥的冷却过期。

**观察 2。** 供应商原生优化——缓存边界、extended thinking、reasoning effort、模型专属提示词——的门槛并非紧耦合；门槛在于由谁支付逐供应商条件代码的成本。Claude Code 在一个 Blake2b 哈希出的缓存边界处切分提示词，静态前缀以 global 作用域跨会话缓存（fork 模式的子 Agent 还会逐字节精确继承父提示词）；Codex 保留逐代提示词（现以服务端 model-catalog 数据交付）和一个由 `thread_id` 派生的 prompt-cache key；Gemini CLI 的 ModelRouterService 把每个请求分派给最便宜的、足够胜任的 Gemini 变体。但现在有三个多供应商系统从谱系的另一端演练同一张菜单——刻意而集中地支付条件代码成本：Hermes 手写五个传输实现，配以供应商无关的缓存标记和逐位精确的前缀规范化，甚至能命中本地 llama.cpp 的 KV 缓存；Pi 放置带 TTL 分级的显式 `cache_control` 断点，并把每轮缓存未命中浪费的美元当作一等公民指标来审计；OpenCode 同时发出六个供应商的缓存方言，并把系统提示词塑形为至多两条消息（默认一条）以匹配缓存槽位。基于 LiteLLM 的系统（OpenHands、Aider、Mini-SWE-Agent）部分地演练了这张菜单（表 17），其中 OpenHands 通过缓存分级的提示词组装与可插拔路由缩小了差距。紧耦合仍然独有的收益是服务端协同演化：Codex 的脚手架行为——提示词、reasoning 档位、工具模式，乃至多 Agent 工具的生成——如今由供应商的 catalog 端点随每次模型发布重新调校，而无需发布客户端。供应商耦合的内涵已从「能力」转向「谁控制更新循环」。

### 7.2 提示词工程架构

十一个系统的提示词构建策略差异巨大。表 6 汇总了各种方法。

表 6：十一个系统的提示词工程架构。

| 系统 | 架构 | 组成区块 | 缓存 | 模板 |
|---|---|---|---|---|
| OpenHands | 带缓存层级的 PromptRegistry | 18 个命名的静态区块（Soul、Role、Security 等）+ 动态区块 | STATIC/DYNAMIC 双块组装；`cache_control` 标记 | Python；.j2 逃生通道 |
| Aider | 多态 CoderPrompts | 按 edit format 分设的提示词、repo-map、示例 | Anthropic 标记 | Python 类 |
| Claude Code | 带边界的模块化区块 | 12–15 个命名区块，静态/动态切分 | Blake2b 哈希、边界标记 | TypeScript |
| Codex | 服务端交付的逐模型提示词 | Capabilities、personality（用户模板化）、AGENTS.md、规划 | `thread_id` 缓存键 | Model-catalog 数据（捆绑回退） |
| Gemini CLI | PromptProvider + 能力门控 | 基础、工具、GEMINI.md（global/proj/ext）、IDE 上下文、memory、skills | 无（模型变更时重建） | TS 片段（modern/legacy） |
| Mistral Vibe | 逐 Agent 提示词 + A/B 变体 | 基础、工具、git status、日期、subagent 名册、scratchpad、AGENTS.md 内容、agent 覆盖、skills | git status 缓存 | Markdown 文件（GrowthBook 选定变体） |
| Mini-SWE-Agent | Jinja2 一次性渲染 | `system_template`、`instance_template` | Anthropic 标记 | YAML 内嵌 |
| Hermes | 三层组装（stable/context/volatile），每会话构建一次 | 约 15 个指导区块，按模型家族门控 | `system_and_3` 标记 + 逐位精确前缀规范化 | Python 常量 |
| Pi | 单个约 170 行构建器；工具片段随活动工具集协变 | Persona、工具、去重指南、项目上下文、skills XML、日期、cwd | `cache_control` 断点 + TTL 分级 + 浪费审计 | TS 拼接 |
| OpenCode | 按模型家族的提示词矩阵（按 model-id 子串分 9 套基础提示词） | 基础、env 区块、AGENTS.md、MCP 指令、skills 目录 | 六方言断点；`promptCacheKey` = sessionID；system 封顶 2 条消息 | .txt 文件 |
| OpenClaw | ACP 转译器 | 会话配置、工具列表、thinking level | 逐供应商 | 运行时配置 |

**Gemini CLI：能力门控片段与层级化记忆。** Gemini CLI 的 PromptProvider 由以下内容组装系统提示词：按模型能力选择的基础指令（`isModernModel ? snippets : snippets.legacy`）、来自注册表的 tool/function 声明，以及在三个作用域发现、层级化合并的 GEMINI.md 文件集合（全局 `~/.gemini/`、扩展提供的、项目本地 `.gemini/`）。IDE 诊断与打开文件的 diff 经 IDE companion 包在会话中途注入；持久事实由模型直接用普通编辑工具编辑 GEMINI.md 或私有的逐项目 MEMORY.md 索引来写入——系统提示词声明不存在 save_memory 工具（见 9.6 节）。与 Claude Code 不同，提示词在每次模型变更时重建，但不按静态/动态缓存边界切分——Gemini 目前不提供请求级提示词缓存，缓存摊销交由 API 服务器承担。

**Mistral Vibe：逐 Agent Markdown 提示词。** Mistral Vibe 的提示词以纯 Markdown 文件存放；只有 explore 与 lean profile 附带专用系统提示词，plan、accept-edits 与 auto-approve 则通过覆盖复用默认的 cli.md。一个通用系统提示词构建器把基础提示词与自动生成的工具描述、一个 Git 上下文区块（`git log --oneline -N --decorate` 与 `git status --porcelain` 的输出，已缓存）以及 agent 专属覆盖层组合起来，因此 plan 与 explore 子 Agent 会得到与默认 Agent 完全不同的系统提示词，而无需任何代码分支。Skill 描述动态追加。这种逐 Agent 特化比 Claude Code 的「共享提示词 + 子 Agent 提示词覆盖」更细粒度，并在结构上类似 Codex 的按模型模板——只是键从模型世代换成了 agent profile。

**Claude Code：带缓存边界的模块化组装。** Claude Code 的提示词由十余个命名区块组装而成，以 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 标记分界。边界之前的区块（identity、system rules、task guidance、tool patterns、tone）是静态的，经 Blake2b 哈希、以 `scope: 'global'` 缓存。边界之后的区块（session guidance、memory、environment、MCP instructions、language、scratchpad）是动态的，经带记忆化（memoization）的 `systemPromptSection()` 逐轮计算。这一设计把提示词缓存失效降到最低：静态前缀（占绝大多数 token）跨轮次乃至跨子 Agent（经 fork 时刻的 `renderedSystemPrompt` 共享）取得高缓存命中率。

**Codex：作为服务端交付数据的逐模型提示词。** Codex 为每个模型世代维护独立提示词，且交付机制本身也在协同演化：早期版本编译进客户端的 Markdown 模板仍留在代码树中，但代码已不再引用——实际生效的提示词以模型清单（`models.json`，捆绑作回退，并从远程 `/models` 端点以 ETag 缓存刷新）的 `base_instructions` 字段交付。7 月版清单覆盖从 GPT-5.2 到一个 GPT-5.6 家族，且提示词是「personality 模板化」的：一个 `{{ personality }}` 变量由用户可选变体（friendly/pragmatic）填充。提示词内容跨世代有可测量的漂移：GPT-5.2 的提示词以版本身份开场（"You are GPT-5.2 running in the Codex CLI…"）并带有明确的 no-commit 与禁止引用规则；GPT-5.5 的提示词以 "You are Codex, a coding agent based on GPT-5…" 开场（5.6 家族进一步缩短为 "You are Codex, an agent based on GPT-5"），扩展出一段内容丰富的 Personality 小节，并把 no-commit 规则与反过度打磨指令整体丢弃。行为政策正从提示词散文迁移到功能开关：一个 `codex_git_commit` 标志现在管辖提交行为。7.3 节将回到这一「变薄」现象。

**OpenHands：带缓存层级的提示词注册表。** OpenHands 以一个由受保护、有序的 PromptSection 对象构成的 PromptRegistry 取代了原来的 Jinja2 PromptManager，这些对象被分入 `CacheTier.STATIC` 与 `DYNAMIC` 两桶，渲染为双块系统消息，其静态前缀保持逐字节稳定以供供应商提示词缓存——与 Claude Code 相同的静态/动态缓存边界设计，却是从一个基于 LiteLLM 的多供应商系统内部独立得出的。随附 18 个命名的静态区块（Soul、Role、Memory、Security、SecurityRiskAssessment、VersionControl 等），Jinja 模板仅作为逃生通道存活。

**Hermes：逐位精确前缀的三层组装。** Hermes 每会话构建一次提示词，分三层——stable、context、volatile——约 15 个指导区块按模型家族门控（tool-use 强制区块发给 GPT/Codex/Gemini/Grok/Qwen/DeepSeek 模型、绝不发给 Claude，代码注释援引了观察到的逐模型失败案例）。缓存经济学驱动细节：单一 `system_and_3` 策略放置四个 `cache_control` 断点，且提示词前缀被逐位精确规范化（工具调用 JSON 的排序紧凑重序列化、仅到日期的时间戳、冻结的记忆快照），使本地 llama.cpp 与 vLLM 的 KV 缓存也能跨轮命中。

**Pi：一个小构建器，随工具集协变。** Pi 的整个系统提示词是一个约 170 行的构建器，发出 30–40 行内容：persona、工具列表、去重的逐工具指南片段（每个工具贡献 `promptSnippet` / `promptGuidelines`，因此提示词随活动工具集协变）、来自 AGENTS.md 的 `<project_context>`、一个 `<available_skills>` XML 索引、日期与 cwd。几乎所有行为政策都被刻意省略，交给用户提供的上下文文件与扩展。

**OpenCode：模型家族提示词矩阵。** OpenCode 按 model-id 子串分派九套基础提示词之一——claude、gpt-、gemini 等各有专用 .txt 提示词、语域各异（Claude 提示词以 "You are OpenCode, the best coding agent on the planet." 开场）——把 Codex 的逐代模板推广为跨厂商版本。组装刻意把系统提示词封顶为两条消息（默认一条；插件扩展后的提示词会被折叠回上限），以匹配它同时以六种供应商方言发出的前两个缓存断点槽位。

**Aider：多态提示词。** Aider 的提示词系统独一无二：其 13 个注册 edit format（architect、ask、context、diff、diff-fenced、editor-diff、editor-diff-fenced、editor-whole、help、patch、udiff、udiff-simple、whole）各有一个专属 CoderPrompts 子类，定义针对该格式的系统提示词、示例与提醒。[^5] 工厂模式（`Coder.create()`）依据模型元数据选择格式。提示词动态包含：文件内容、token 受限的仓库地图（经 tree-sitter 符号抽取生成）、聊天历史，以及格式专属的编辑指令。

[^5]: 三个函数调用型 coder 仍留在代码树中但未注册——一个在 `coders/__init__.py` 中被注释掉，另两个从未被 import——因此 `Coder.create()` 恰好解析出 13 种格式；4 月版曾不一致地报告为 14。

**Mini-SWE-Agent：一次性模板。** Mini-SWE-Agent 使用嵌入 YAML 配置文件的 Jinja2 模板，在会话开始时渲染一次。模板变量包括系统信息（`platform.uname()`）、模型统计（`n_model_calls`、`model_cost`）与任务描述。一个值得注意的细节：默认模板包含 OS 专属指令（如 macOS 的 `sed -i ''`）。

### 7.3 提示词内容与修辞风格

上一小节考察了提示词如何组装（缓存边界、模板、层级合并）。现在转向它们实际说了什么：每个脚手架投射的 persona、它向模型发出的显式指令，以及它用来让这些指令真正钉住的修辞手法。我们通读了每个系统的规范系统提示词，并提取出反复出现的维度。若干模式证明在原本互不相干的代码库之间是趋同的。

**身份与 persona。** Persona 开场从简到繁。Mini-SWE-Agent 最简："You are a helpful assistant that can interact with a computer"——而 Pi 的内层 agent 库比它还简（"You are a helpful assistant."），编码层只加上 "You are an expert coding assistant operating inside pi, a coding agent harness."。OpenHands 加了一个角色："You are OpenHands agent, a helpful AI assistant that can interact with a computer to solve tasks"——如今包在一个从用户可覆盖的 SOUL.md 加载的 `<SOUL>` 区块里。Codex 的 GPT-5.2 提示词对模型耦合最为直言："You are GPT-5.2 running in the Codex CLI, a terminal-based coding assistant"——GPT-5.5 世代抛弃了这一开场，改为 "You are Codex, a coding agent based on GPT-5…"（5.6 家族进一步缩短为 "an agent based on GPT-5"），并配上一段内容丰富的 Personality 小节。OpenCode 按模型改变 persona：Claude、Codex 与 Meta 模型被告知 "You are OpenCode, the best coding agent on the planet,"，而默认世系得到的是朴实的 "an interactive CLI tool that helps users with software engineering tasks."。Hermes 分层叠加一个总体身份（"You are Hermes Agent…created by Nous Research…prioritize being genuinely useful over being verbose"）与仅在自动检测到时才注入的编码姿态："Operate like a careful senior engineer."。Mistral Vibe 在 4 月版以抱怨既往行为的开场（"CRITICAL: Users complain you are too verbose"）著称，如今以一份正式的指令层级契约开场：七个优先级（critical ≫ user ≫ repo AGENTS.md ≫ user AGENTS.md ≫ prompt defaults ≫ skills/MCP ≫ external-data-as-data）——把提示词注入防御表达为一种排序，而非一纸禁令。Aider 完全不用 persona，改用角色断言："Act as an expert software developer. Always use best practices when coding."。Claude Code 介于两极之间：简短开场，随后在后续区块中详细展开。

**冗长控制。** 十一份提示词中有九份含显式的冗长指令，但实现差别极大。OpenCode 如今是语料库中最激进的提示词："You MUST answer concisely with fewer than 4 lines…One word answers are best"，还配有 `<example>` 区块（"user: what is 2+2? assistant: 4"）——不过值得注意的是，其 Claude 专属提示词反而丢掉了回退世系保留的量化规则。Mistral Vibe 保留 150 词预算（"Most tasks need under 150 words of prose"）与结构优先规则（"Structure first. Prose after, if at all"）。Claude Code 的响应长度规则是量化的（工具间更新 ≤ 25 词，回合结束摘要 ≤ 100 词）——不过我们的再审计发现，该数字区块作为 A/B 实验仅对 Anthropic 内部构建启用；外部用户收到的是定性指导。Codex 在 5.2 世代是定性的（"concise, direct, and friendly"）；5.6 提示词把冗长折叠进 Personality 小节，而 5.5 保留自己的长度规则。Hermes 是定性的（"Be concise: lead with the change or answer, not a preamble"），Pi 极简（单条 bullet："Be concise in your responses"），Aider 要求在任何补丁之前 "a few short sentences"。Mini-SWE-Agent 以结构而非言语达到同一目标：每轮恰好一个 THOUGHT 块加一条 bash 命令。OpenHands 独自把冗长大体留给模型：其基础提示词对长度只字未提，不过其 GPT-5 家族模型专属区块确实要求简洁回复与短 preamble。

**禁用短语与禁止的表层形式。** Mistral Vibe 开创了禁用短语清单；其重写后的提示词把 4 月的两份清单合并为一份："No filler words: 'robust', 'elegant', 'seamless', 'powerful', 'Great!', 'Absolutely!', 'Of course!', 'Happy to help!'"——直接试图压制 LLM 的语域口头禅。OpenCode 现在运行语料库的第二份禁语清单，且依模型而异：其 GPT 提示词禁用 "Done —" 与 "Got it," 之类的开场白，连同 emoji 与 em dash。Mistral Vibe 还保留着语料库中最严格的 emoji 禁令："No emoji of any kind. No smiley faces, icons, flags, or Unicode symbols…This applies to prose, code comments, and commit messages."。Claude Code 是条件式的（"Only use emojis if the user explicitly requests it"）；OpenCode 在其 Claude、default、Meta 与 Trinity 提示词中携带完全相同的条件规则，而其 GPT 提示词干脆全禁 emoji，其 GPT-4 时代的 beast 提示词反而指示用 emoji 状态标记；Gemini CLI、Mini-SWE-Agent、Aider、Hermes 与 Pi 对 emoji 只字不提。Codex 的 5.2 提示词禁用一种 CLI 专属表层形式——形如 `[F:README.md L5-L14]` 的行内引用（带括号引用符号）——因为 Codex 终端无法渲染它们；该规则在 5.5/5.6 提示词中缺席。

**反过度打磨指令。** 一个近乎普遍的模式：脚手架告诉模型不要扩大请求。Claude Code："Don't add features, refactor code, or make 'improvements' beyond what was asked"，另有一条针对投机性抽象的独立 bullet。Mistral Vibe（自 4 月起改写措辞但实质保留）："Change minimally…Don't touch what wasn't asked. Unused imports may have side effects. Redundant-looking code may be load-bearing. When fixing X, leave Y alone."。Codex（5.2 世代）："Do not attempt to fix unrelated bugs. … Fix the problem at the root cause rather than applying surface-level patches"——5.4 提示词中缺席，5.6 彻底丢弃。OpenHands："NEVER create multiple versions of the same file with different suffixes (e.g., `file_test.py`、`file_fix.py`、`file_simple.py`)."。OpenCode："NEVER create files unless they're absolutely necessary."。Hermes：不做请求之外的顺手重构、重命名或重排版。趋同令人瞩目——六个独立开发的脚手架预判了同一种失败模式（LLM 在欠规约的请求上过度交付），并以虽非逐字照搬、却在修辞上同构的措辞回应。Pi 是刻意的例外：其提示词不含此类指令，政策整体委托给用户提供的 AGENTS.md 与扩展。

**先读后改与先验证后声称。** 三个提示词把读代码作为改代码的前提。Claude Code："In general, do not propose changes to code you haven't read."。Mistral Vibe 在两次快照之间强化了其版本："Never edit a file you have not read in this session. Do not edit a file in the same turn you first read it—read, then act on the next turn."。OpenCode 的编辑工具描述声称有强制执行（"This tool will error if you attempt an edit without reading the file"）——但该工具源码中不存在任何运行时读取追踪；描述言过其实，这提醒我们：提示词文本是行为愿望，而非机制。Claude Code 另外禁止虚假成功声称——"Never claim 'all tests pass' when output shows failures, never suppress or simplify failing checks (tests, lints, type errors) to manufacture a green result"——该区块与其词数预算一样，先随内部构建交付；Hermes 则是唯一把同一要求机制化的系统，靠 6 节的 verify-on-stop 守卫加一条普适的反编造指令（"NEVER substitute plausible-looking fabricated output…"）。其余系统把这当作隐含要求。

**Git 提交政策：一场消散的趋同。** 在 2026 年 4 月，这是语料库中最紧密的修辞趋同：每一个提到 git 的提示词都禁止自主提交。到 7 月，图景已分裂为三种立场。禁令在 Claude Code（"NEVER commit changes unless the user explicitly asks you to"）、OpenCode（"NEVER commit changes unless the user explicitly asks"）、Hermes（"don't commit, push, or rewrite history unless asked, and never read, print, or commit secrets"）与 Codex 的 5.2 世代提示词中存续。Mistral Vibe 反转了立场：它删除了带标签的 "Never Commit" 硬规则（changelog 写着 "Loosened the no-git-commit constraint"），如今反而主动指示模型如何提交，并强制 Co-Authored-By 签名 trailer。OpenHands 从未持有可供反转的提交禁令——其 `<VERSION_CONTROL>` 区块早在窗口期之前就在教授提交机制与 co-author trailer——同时在单独的 `<PULL_REQUESTS>` 区块中把 push 与创建 pull request 门控在用户显式请求上。而 Codex 最新的提示词把规则整体删除：GPT-5.6 指令中不含任何 "commit" 字样。一个 `codex_git_commit` 标志曾短暂管辖提交署名行为，但在 7 月快照中已退役（未使用）——该指令干脆离开了提示词。保持普适的是外层边界：语料库中没有提示词允许自主 push、force-push 或改写历史。换言之，4 月的提交趋同并非稳定的工程结论，而是信任校准的一次快照——而信任在一个季度内发生了可测量的移动。

**强调标记。** 语料库呈现三种截然不同的提示词内强调约定。Claude Code、Codex、OpenHands 与 OpenCode 行内使用大写标签：IMPORTANT:、CRITICAL:、NEVER（OpenCode 另在运行时注入 `<system-reminder>` XML）。Mini-SWE-Agent 使用类 XML 标签（`<important>…</important>`），Pi 仅把 XML 用作数据定界符，Hermes 则把 MUST / NEVER 大写与对勾/叉号范例对组合——其 XML 标记的强制区块只发给 GPT/Codex 与 Grok 模型。Aider 几乎不用——其强制力来自补丁格式示例而非强调性散文（补丁格式指令中残留一个稀疏的 IMPORTANT:）。Mistral Vibe 走得最远：CRITICAL: 标签与 Hard Rules 区块都不复存在；强调如今完全结构化，是一份显式的可覆盖性契约，带有命名的 "Critical instructions—not overridable" 与 "Overridable defaults" 区块。对比之下可见三个流派：修辞性强调（大写标签）、结构性强调（命名规则区块与优先级契约）、示例驱动强调（范例对与格式样例），多数系统至少结合其中两种。

**工具使用哲学。** 工具指导的具体程度各异。Claude Code 坚持专用工具优先于 shell："Do NOT use the Bash tool to run commands when a relevant dedicated tool is provided. … Using dedicated tools allows the user to better understand and review your work."。Codex 为并行优化："Parallelize tool calls whenever possible—especially file reads."。Aider 的指令是格式机械性的："Your entire response containing the patch MUST start with *** Begin Patch on a line by itself. … Each file MUST appear only once in the patch."。Mini-SWE-Agent 最受限：每轮恰好一个 bash 块，目录与环境变更以行内前缀完成（`MY_VAR=val cd /path && …`），因为每次调用都在新子 shell 中运行。

**显著缺席之物。** 十一个提示词没有一个包含显式的有害请求拒答语言。没有任何形如 "if the user asks you to do X, refuse and explain why" 的指令——唯一具有拒答形状的文本涉及操作风险（破坏性 git 操作、secrets 卫生、危险 shell 模式），而非政策层面的危害。语料库中最接近的是拒答礼仪：OpenCode 的默认提示词继承了早期 Claude Code 的措辞，指示模型若拒答，不要说教缘由（"keep your response to 1-2 sentences"）——针对拒答的风格指导，而拒答的理由从未陈述。对滥用的安全防护完全委托给底层模型的预训练与任何供应商侧政策层。这是一个值得注意的设计选择：生产级脚手架，即便是捆绑自家供应商的那些，也不在系统提示词中重复对齐工作——且该发现在又跨三家供应商与社区世系之后，仍以 11/11 成立。

**观察 3。** 提示词修辞在工程经验趋同处趋同，然后随信任校准而变薄。反过度打磨语言以近乎同构的措辞出现在六个独立开发的脚手架中，而禁止自主提交规则在 2026 年 4 月是普遍的。到 7 月，语料库展示了这些规则的生命周期：Mistral Vibe 把提交禁令反转为带强制 co-author trailer 的提交指导（OpenHands 一路都在教授提交机制），Codex 最新模型世代把提交规则与反过度打磨指令一并从提示词中删除——当模型内化这些规范时，行为政策随之变薄。三种修辞策略如今并存：harness 强制的政策散文（Claude Code、OpenCode、Hermes）、结构性契约（Mistral Vibe 的七级指令层级与可覆盖性区块），以及近乎完全委托给用户上下文（Pi 的 30 行提示词）。按模型条件化的修辞已成为一个独立的轴：Hermes 按模型家族门控强制区块并附以援引观察到的逐模型失败的注释，OpenCode 维护九套逐家族提示词、其严格度随接收者而变。十一个系统共同的稳定不变量：任何地方都没有政策级拒答语言——对齐工作从不在 harness 提示词中重复。

### 7.4 流式传输与响应处理

响应处理策略横跨很宽的范围：

- **Claude Code**：SSE，带细粒度事件（`content_block_start/delta/stop`、`message_delta`）。经 thinking blocks 支持 extended thinking，`budget_tokens` 可配置。
- **Codex**：WebSocket + SSE 回退。ResponseItem 事件从 JSON-RPC 解析。`generate=false` 的连接预热。轮次状态经 `x-codex-turn-state` header 维护。
- **Gemini CLI**：`@google/genai` SDK 的 `chat.sendMessageStream()`，带一个四次尝试的流中重试循环（`MidStreamRetryOptions`），可从内容、网络与无效流错误中恢复。把 SDK 包进自定义 GeminiChat 类，以绕过一个 function-response 校验 bug。在响应记录时刻把 extended-thinking parts 排除在持久化历史之外，使其不污染未来的缓存查找。
- **Mistral Vibe**：Mistral SDK 的 `stream_async()` 聚合 LLMChunk 块；ThinkChunk 块被路由进独立的 `reasoning_content` 字段。跨流产出聚合用量统计。
- **Aider**：token 级流式传输，配 mdstream 做富终端渲染。带指数退避的重试循环；以 assistant prefill 续传来处理 FinishReasonLength。
- **Mini-SWE-Agent**：完整响应（无流式）。最简方案；依赖模型原生补全。
- **OpenHands**：经 LiteLLM 包装器的 SSE，现有一等公民流式（一个 `LLM.stream` 字段与经 `on_token` 回调转发的 token delta）外加一条 OpenAI Responses 路径。为 Anthropic 模型支持提示词缓存标记。
- **Hermes**：五个自有传输实现；一个约 23 值的 FailoverReason 枚举驱动分类恢复（压缩 vs. 轮换凭证 vs. 回退链 vs. 中止）。
- **Pi**：九个线上协议实现，带一个用于流式工具参数的 partial-json 抢救解析器——与 6 节的截断守卫配套，因为被抢救出的参数可能在尚不完整时通过校验。
- **OpenCode**：Vercel AI SDK 的 streamText 掌管分派；token 粒度的 part delta 被持久化并由嵌入式服务器经 SSE 重新供给，因此每个客户端（TUI、web、IDE）重放同一条流。
- **OpenClaw**：针对文本、thought 与工具调用的 ACP delta 事件；供应商专属传输流处理底层的 SSE/WebSocket 层。

### 7.5 高级 API 特性

单一供应商系统利用了多供应商抽象无法利用的特性：

Claude Code 的 extended-thinking 集成暴露一个 `budget_tokens` 参数，控制模型在响应前进行多少内部推理；虽然 LiteLLM 确实透传 Anthropic 的 thinking block，但要把 `budget_tokens` 作为脚手架的一等旋钮呈现，在任何多供应商设计中仍需 Anthropic 专属条件代码。

Codex 的 reasoning-effort 枚举横跨 minimal / low / medium / high / xhigh，2026 年年中扩展了 max 与 ultra——且 ultra 不只是更多推理：模型目录将其描述为「maximum reasoning with automatic sub-agent task delegation」（最大推理并自动进行子 Agent 任务委派）——一个会改变编排行为的推理力度档位，为语料库中独此一家。

Mistral Vibe 的逐模型 thinking 字段如今横跨五级（off / low / medium / high / max），映射到 Mistral 的 `reasoning_effort` 枚举；Pi 则把整个图景规范化到统一的七级量表之后，再经十种逐 API thinkingFormat 方言翻译。

Codex 经由一个由会话 ThreadId 派生的 `prompt_cache_key` 实现提示词缓存（并为 delegate 与 guardian 会话提供显式覆盖钩子）；这比 Claude Code 的 Blake2b 哈希静态/动态边界更轻量。

Aider 的视觉支持值得一提：当活动模型的 `supports_vision` 属性被设置时（经 LiteLLM 元数据），Aider 接受聊天中的图片文件、处理 MIME 类型并传给模型。该支持按模型门控而非无条件，因此在表 17 中标为 "Opt."；Mistral Vibe 在 v2.14–2.18 加入视觉一列（TUI @-mentions、剪贴板粘贴、ACP 行内图片块），Mini-SWE-Agent 保留一条可选加入、默认关闭的多模态路径（一个 `multimodal_regex` 把带标记的内容展开为图片块），因此语料库中没有任何系统是无条件纯文本的。

Gemini CLI 暴露 extended thinking（剥离 thought parts 以保持缓存干净），然后经由 ModelRouterService 自己路由模型选择；把逐请求模型选择当作分类器驱动的运行时调度来对待，这在语料库中仍然独一无二（OpenHands 的 RouterLLM profile 按配置路由，而非逐查询分类），如今更扩展到一个托管的设备端运行时（一个 `gemini gemma` 命令组会置备一个本地 LiteRT-LM 服务器，路由链可把本地 Gemma 模型用作其查询分类器）。

可观测性方面，Gemini CLI 在逐 token 成本核算之外还发出 OpenTelemetry traces。Mistral Vibe 也用 OpenTelemetry 检测其 agent 循环、工具执行与 hooks（`agent_span` / `tool_span` / `hook_span` 异步上下文管理器，配 OTLP exporter 与 GenAI 语义约定属性）；Pi 贡献了语料库中最不寻常的可观测性指标：逐轮缓存未命中美元浪费审计，为每一次可避免的缓存失效定价。

---

## 8 工具与动作系统

工具系统定义了 agent 究竟能做什么：它能调用哪些动作、这些动作如何被执行。在我们研究的每一个成熟 agent 中，这个子系统都占去了工程投入的很大一部分。

### 8.1 工具数量谱系

图 3 展示了从极简到极繁的工具设计谱系。各系统从单一的 bash 工具一直延伸到包含媒体处理与渠道集成的 109+ 个工具——Pi 把稀疏端做成一种哲学（内置七个工具、默认暴露四个、其余皆为扩展），Hermes 则把通用端推到 69 个内置工具，藏在一个 toolset 层之后，由该层界定每个平台的模型实际能看到什么。

图 3 的谱系（极简 → 极繁）：1 Mini-SWE-Agent（仅 bash）→ 7 Pi（默认 4 个）→ 12 Mistral Vibe（编辑格式）→ 13 Aider（模型预设）→ 17 OpenCode（+ code mode）→ 25 OpenHands（+ agents、tasks）→ 27 Codex → 35 Gemini CLI → 43 Claude Code → 69 Hermes（toolset 限定可见范围）→ 109 OpenClaw（+ 渠道）。

**图 3**：工具数量谱系（2026 年 7 月）。数字表示不同内置工具或编辑格式的数量；OpenHands 与 Codex 的数字是默认暴露面（其完整目录达到 30+）。Pi 内置 7 个、默认暴露 4 个；Hermes 注册 69 个，但通过一个 toolset 层按平台限定可见性。

### 8.2 工具接口架构

工具接口的范围从几乎没有抽象——Mini-SWE-Agent 把一切通过单次 shell 调用发送（`subprocess.Popen(shell=True)`，仅包了一层用于在超时时杀死进程组）——到丰富的类型化契约。Claude Code 的 43 个工具各自把校验、权限检查、并发安全与 UI 渲染声明为彼此独立的接口关注点。Codex 用 Rust trait 对象实现运行时多态——注册表存储 `Arc<dyn CoreToolRuntime>`（其中 `CoreToolRuntime: ToolExecutor`），该抽象如今被抽取为独立的 `codex-tools` crate，与 code mode 及扩展共享。Gemini CLI 通过一个状态机 Scheduler 路由调用，让每次调用依次走过确定性的 Validating → Executing → Completed/Errored 阶段。Mistral Vibe 增加了经 tree-sitter 解析的 bash——一条基于 `asyncio.create_subprocess_shell` 的执行路径，在派生进程前用 `tree_sitter_bash` 校验命令结构——以及细粒度权限作用域（命令模式、文件模式、URL 白名单、目录包含关系）。Hermes 的单例注册表把注册与暴露分开：69 个工具在导入时自注册，toolset 层界定各平台模型的可见范围，逐工具可用性探测（30 秒 TTL 加 last-good 宽限窗口）防止一个不稳定的 docker 版本把整个 toolset 剥掉，而一个强制转换（coercion）层负责修复 schema 漂移（`"42"` → `42`），其动机来自对开源模型实际输出的观察。Pi 给它的七个工具各配一个可插拔的 Operations 接口（`BashOperations`、`EditOperations` 等）——这是唯一的远程化接缝，SSH、容器与 micro-VM 扩展经它迁移执行位置而不必触碰工具本身。OpenCode 用 Effect schema 注册了 17 个第一方工具，并按模型切换工具面：GPT 系模型得到 Codex 的 `apply_patch` DSL 移植版，并完全失去 `edit` / `write`（见 8.4 节）。这一谱系体现了「简单 vs 能力」之轴：接口面越大，安全保证越多，但工程成本也越高。

### 8.3 延迟工具加载

Claude Code 引入了延迟工具加载：标记为 `shouldDefer = true` 的工具不进入初始系统提示词。LLM 通过 `ToolSearchTool` 按需发现它们，该工具支持关键词搜索与直接选择（`select:<tool_name>`）。这显著缩小了提示词体积：43 个工具中初始只加载核心子集。延迟工具集通过 `getDeferredToolsCacheKey()` 缓存，集合变化时失效。

4 月版把这一点当作 Claude Code 独有；到 7 月，它已成为一个正在扩散的模式，出现了多个独立实现。Codex 用 `defer_loading` 标志标记工具（默认是 MCP 工具），并提供一个由覆盖工具规格的 BM25 词汇索引支撑的 `tool_search` 工具——同样的提示词经济学，只是用排序检索取代了子串匹配。Hermes 用一个阈值把这一思想泛化：当 MCP 与插件 schema 将超过上下文窗口的 10% 时，它们折叠成三个桥接工具（`tool_search` / `tool_describe` / `tool_call`），由一个内联的 BM25 引擎检索。OpenCode 对 skills 采用延迟加载（目录只列出名称与描述；由原生 skill 工具取回正文），并把其实验性 code mode 视为 MCP 目录延迟：不暴露每个 MCP 工具，而是用一个 `execute` 工具对着目录运行模型编写的脚本。相比之下，Mistral Vibe 的 `defer_mcp` 标志只为了降低延迟而推迟启动时的 MCP 连接，并不推迟提示词可见性——一旦集成完成，每个 MCP 工具都对模型可见，因此我们不再把它归入提示词级延迟模式。

### 8.4 文件编辑策略

文件编辑是 SWE agent 的核心动作。十一个系统实现了八种本质上不同的策略，汇总于表 7。

**表 7**：十一个系统的文件编辑策略（2026 年 7 月）。

| 系统 | 格式 | 匹配 | 回退 | 创新 |
|------|------|------|------|------|
| Claude Code | 精确字符串替换 | 文件内唯一子串 | 报错并附上下文 | Zod schema 校验 |
| Codex | `*** Begin/End Patch` | 统一 diff hunk | hunk 级重试 | 自定义 patch DSL；Lark 文法约束变体 |
| Aider | 13 种格式（SEARCH/REPLACE、udiff、diff-fenced 等） | 精确 → 模糊（dmp） | 相似行建议 | RelativeIndenter |
| OpenHands | `str_replace_editor`（5 个命令）+ `apply_patch` + Gemini 移植的 edit | 精确唯一匹配 | 错误消息 | `undo_edit`；三种并存的编辑方言 |
| Gemini CLI | `edit`（旧/新字符串）+ `write_file` | 级联：精确 → 灵活 → 正则 → 模糊 | LLM「edit fixer」子调用修复该对 | LLM 辅助的编辑修复 |
| Mistral Vibe | 精确 `edit`（旧/新字符串、`replace_all`）+ 仅创建的 `write_file` | 精确唯一子串 | 有歧义时报工具错误 | 已从模糊 SEARCH/REPLACE 迁出（4 月 → 7 月） |
| Mini-SWE-Agent | 经 bash 使用 sed/awk | 基于正则 | shell 报错 | 无（模型驱动） |
| Hermes | 单一 patch 工具：SEARCH/REPLACE + V4A DSL（+ `write_file`） | 9 策略模糊链（精确 → … → block-anchor 0.50/0.70 → context-aware 0.80） | 最接近行建议；3 次失败后升级为 `write_file` | 两阶段「先校验后应用」；后端透明的 shell 文件操作 |
| Pi | 多编辑精确替换（`edits[]`，拒绝重叠） | 精确 → Unicode/空白规范化（无相似度阈值） | 唯一性引导错误 | 字节保真叠加；执行前异步 diff 预览 |
| OpenCode | 按模型条件化：`apply_patch` DSL（GPT 系）或 SEARCH/REPLACE `edit`（其他） | 9 级 replacer 级联（Levenshtein 0.65）/ 4 轮 patch 放宽 | 「未找到」与「有歧义」分别报错 | 编辑方言在注册表中按模型切换；结果附带 LSP 诊断 |
| OpenClaw | 不适用 | 不适用 | 不适用 | 不是代码编辑器 |

编辑版图在两次快照之间发生了重组。4 月版把 Mistral Vibe 与 Gemini CLI 描述为一对「按程度多态」（polymorphic-by-degree）的组合——粗糙的整文件工具加模糊的细粒度 patch 工具。这两半都没能活过这个季度。Mistral Vibe 干脆删除了 SEARCH/REPLACE 工具，收敛到 Claude Code 的精确唯一子串契约（带 `replace_all` 逃生口，`write_file` 现在只允许创建新文件）：这是一例罕见且可观察到的生产级 harness（驾驭层）在编辑策略簇之间迁移的案例，也证明更强的模型会把最优点从工具侧的漂移容忍推向严格契约。[^6] 细看之下，Gemini CLI 的 `edit` 是一个旧/新字符串工具，带级联匹配器（精确 → 空白灵活 → 正则 → 模糊），其尽头是其他系统都没有的东西：一个 LLM「edit fixer」子调用，依据模型给出的指令修复失败的旧/新对——这是语料库中首个工具内 LLM 辅助的编辑修复。

[^6]: 4 月版还夸大了旧机制：复审显示，v2.7.5 的 ≥ 0.90 模糊匹配器只为错误消息生成「closest match」（最接近匹配）诊断；它从未真正应用过模糊编辑。

**模糊级联家族及其可见的谱系。** 在 Mistral Vibe 离开的地方，两个新来者带着语料库中最精细的漂移容忍到来，它们的源代码记录了这套机制的来历。OpenCode 的九级 replacer 级联（精确 → 行修剪 → block-anchor → 空白/缩进/转义规范化 → 上下文感知，在 Levenshtein 0.65 下运行并带不相称匹配守卫）的头部注释致谢了 Cline 与 Gemini CLI 的评测；Hermes 的九策略链则标注着「inspired by OpenCode」。编辑机制如今拥有了可见的跨 harness 谱系——经由继承实现的趋同，而不只是各自重新发现。Pi 占据了第三个位置：完全不用相似度阈值，只做 Unicode/空白规范化（NFKC、智能引号、行尾空白），替换在规范化空间中计算，再逐行叠加回原始字节，因此未触及的行保留其精确的原始空白——另外工具执行前会渲染一个异步 diff 预览。

Aider 的 RelativeIndenter 仍值得特别关注。它用 Unicode 标记（默认：左箭头 ←，选择它是为了避免与文件内容冲突）把绝对缩进转换为相对变化。`make_relative()` 方法跟踪相邻行之间的缩进差，`make_absolute()` 重建原始缩进。这使编辑块能跨不同缩进层级工作——这是其他系统的常见失败模式。再结合基于 `diff_match_patch` 的模糊匹配（阈值 0.95，距离 500），它构成了一条稳健的编辑流水线。

**观察 4.** 文件编辑策略是 SWE agent 代码修改准确性最重要的决定因素之一，而模型感知的多态已不再是 Aider 独有。Aider 通过 prompt 类工厂（prompt-class factory）按模型选择编辑格式；OpenCode 通过工具注册表达成同样的洞见，按模型切换工具集（GPT 系模型得到 Codex 风格的 patch DSL，并完全失去字符串替换工具）。语料库的编辑机制如今显示出明确的跨 harness 谱系（Hermes 的匹配器「inspired by OpenCode」；OpenCode 的级联致谢 Cline 与 Gemini CLI），并且处于可见的运动之中：Mistral Vibe 在一个季度内从模糊 SEARCH/REPLACE 迁移到 Claude Code 式精确匹配，而 Gemini CLI 增加了 LLM 辅助的编辑修复。Aider 的 RelativeIndenter 仍是缩进敏感匹配上最精妙的解法。

### 8.5 执行与沙箱

表 8 详细比较了各沙箱方案。

**表 8**：执行沙箱机制（2026 年 7 月）。

| 系统 | 机制 | 隔离级别 | 投入 |
|------|------|----------|------|
| OpenHands | 工作区抽象：Docker、Apptainer、远程 API、云端工作区（KVM 直通在应用侧） | 进程 + 文件系统 + 网络 | 大量 |
| Codex | Bubblewrap（vendored、树内编译）+ Landlock 遗留回退（Linux）、Seatbelt（macOS）、受限令牌（Windows） | OS 级命名空间 + 文件系统 + 网络 | 大量 |
| Gemini CLI | Docker / Bubblewrap / gVisor / LXC（Linux）、经 `sandbox-exec` 的 Seatbelt（macOS）、受限令牌（Windows）；TOML 策略 | OS 级 + 按模式策略 + 环境变量清洗 | 中等 |
| Claude Code | 可选启用的 OS 沙箱，经 Anthropic 的 sandbox-runtime（Bubblewrap/Seatbelt）并带网络限制；git worktree 实现分支隔离 | OS 级（可选）+ 文件系统 | 中等 |
| Mini-SWE-Agent | Docker、Singularity、Bubblewrap（可插拔） | 可配置 | 轻量 |
| Hermes | 六个可插拔执行后端（local、Docker、SSH、Singularity、Modal、Daytona）；local 后端 = 策略下限，无 OS 原语 | 按后端而定（容器/VM）；本地无 | 委托式 |
| Mistral Vibe | 无 OS 级；可选 `--worktree` 分支隔离 | 文件系统（分支级，可选） | 无 |
| Pi | 无内置，附有书面理由；经逐工具 Operations 接缝的可选扩展（Anthropic sandbox-runtime、QEMU micro-VM） | 默认无 | 无（扩展空间） |
| OpenCode | 无（权限规则 + tree-sitter 命令解析；shadow-git 检查点；树内的「sandbox」指 worktree） | 无 | 无（仅策略） |
| Aider | 无（直接本地执行） | 无 | 无 |
| OpenClaw | 无（本地网关执行） | 无 | 无 |

Codex 是语料库中最认真的沙箱投入，如今打包为一个专门的沙箱 crate。在 Linux 上它运行 Bubblewrap——自 2026 年年中起 vendored 并在源码树内编译、经 C FFI 调用——实现命名空间隔离（`--ro-bind`、`--unshare-net`、`--unshare-user`、`--unshare-pid`），Landlock 则降级为 feature flag 之后的遗留回退。在 macOS 上它通过 `/usr/bin/sandbox-exec` 驱动 Seatbelt profile。在 Windows 上它使用受限令牌进程。受保护路径（`.git`、`.agents`、`.codex`）即使位于可写根目录内也会被重新标记为只读。其结果是无需承担容器运行时开销的 OS 级隔离。

Gemini CLI 加入 Codex，成为第二个跨平台沙箱实现。

Gemini CLI 的 SandboxManager 实现了与 Codex 相同的三平台栈：Linux 上用 Docker 或 Bubblewrap，macOS 上经 `/usr/bin/sandbox-exec` 用 Seatbelt，Windows 上用受限令牌进程。Codex 把策略烘焙进 Starlark execpolicy 规则（第 10 章），Gemini CLI 则叠加了基于 TOML 的按模式沙箱策略（plan / default / accepting_edits），并在每条命令运行前对提供商凭据做环境变量清洗（针对 `TOKEN` / `SECRET` / `KEY` / `AUTH` / `CREDENTIAL` 的名称模式正则、一份拒绝清单，以及 GitHub 令牌值正则）。Gemini CLI 的沙箱投入明显轻于 Codex，因为它复用 Node 的子进程 API 与操作系统自带的二进制，而不是自己实现底层命名空间管道；Codex 为更大的足迹付出代价——vendored Bubblewrap 集成与 Rust 原生命名空间控制。4 月版曾观察到语料库中最大的两个系统恰好也是仅有的两个自带跨平台沙箱的系统，并追问这一相关性是否是结构性的；扩充后的语料库给出了否定回答：Hermes（约 642K 行）不带任何 OS 级隔离原语，把遏制委托给六个可插拔执行后端，而把安全预算投向内容承载型威胁；OpenCode（约 578K 行）则只有策略。

规模预示着某种大额安全投入，但不特指沙箱；第 10 章描绘了各系统转而把投入花在了哪里。

## 9 记忆与上下文管理

我们考察的每个 agent 最终都会撞上同一个问题：对话超出了上下文窗口。文献提供了两大类解决方案：分层记忆架构（如 MemGPT [74]，在上下文内工作集与外部存储之间搬运数据）与提示词压缩方法（如 LLMLingua [75]，在文本到达模型之前先将其缩短）。语料库中的十一个系统实现了四种实用策略（图 4），下面按复杂度大致递增的顺序介绍。

### 9.1 策略分类

图 4 的谱系（简单 → 复杂）：

- 线性（不修剪）：Mini-SWE-Agent
- 摘要（递归对半）：Aider、OpenClaw
- 凝结（10 → 3 个 condenser）：OpenHands
- 压缩（阈值触发）：Claude Code、Codex、Gemini CLI、Mistral Vibe、Hermes、Pi、OpenCode

**图 4**：按复杂度排序的记忆管理策略。十一个系统中的七个——四个厂商原生 harness 与本次修订新增的全部三个系统——都收敛于阈值触发的 LLM 压缩（compaction）：这是生产级上下文管理的事实标准，不过每个新加入者都把它与其他策略的特征杂交（迭代式摘要合并、可插拔引擎、会话树基底）。

### 9.2 线性历史（Mini-SWE-Agent）

Mini-SWE-Agent 完全不尝试管理上下文。完整的消息列表无界增长，依赖 LLM 原生上下文窗口（在 Claude 4 家族上最高 1M token）。这种简单性带来了完美的可复现性与直接的轨迹分析——对一个研究基线系统而言，这是有意为之的选择。

### 9.3 递归摘要（Aider）

Aider 的 `ChatSummary` 类实现了一种递归对半算法。当消息历史超过 `max_tokens`（默认 1024）时，它按 token 数把消息切成两半，完整保留尾部（最近的 50%）。头部经一次 LLM 调用生成摘要（`summarize_all()`）。若摘要 + 尾部合计仍超限，该过程递归至多 3 层。可配置一个单独的「弱模型」（如 GPT-3.5-turbo）来做低成本的摘要。

### 9.4 可插拔凝结（OpenHands）

OpenHands 通过抽象基类 `Condenser` 率先实现了可插拔的记忆管理。V0 应用自带十个实现；V1 SDK 把这一动物园收敛为三个（`NoOpCondenser`、`LLMSummarizingCondenser`、`PipelineCondenser`），构建在 `RollingCondenser` 基类之上——一次意味深长的简化，绝大多数专用变体被证明没有必要。这次收敛带来两项升级：凝结本身是事件溯源的（日志中记录 `CondensationRequest` / `Condensation` 事件，因此压缩历史可以重放），且 condenser 兼作错误恢复——上下文窗口溢出与畸形历史错误会触发一次凝结而不是崩溃。摘要 condenser 还在事件数阈值之外增加了 token 计数触发器（`max_tokens`），使 OpenHands 与下文的阈值压缩家族对齐。

### 9.5 阈值压缩（七个系统）

Claude Code 的压缩在运行中的 token 估计值进入模型有效上下文窗口下方的缓冲区时触发（`AUTOCOMPACT_BUFFER_TOKENS` = 13,000，另有一个环境变量可覆盖的百分比阈值用于测试）。流程：(1) 从消息中剥离图像（替换为 `[image]` 标记），(2) 按 API 轮次给消息分组，(3) 调用 LLM 生成对话摘要，(4) 创建一条 `SystemCompactBoundaryMessage`，把压缩前历史与摘要分开。压缩后清理最多恢复 5 个文件（`POST_COMPACT_TOKEN_BUDGET` = 50,000），并把 skills 截断到每个 skill 25,000 token 的预算。

Codex 经专用的 `/responses/compact` 端点同时支持本地进程内摘要与云端摘要，`model_auto_compact_token_limit` 控制摘要何时触发（单独的 `/memories/trace_summarize` 端点服务于 9.6 节的记忆流水线）；远程压缩 v2 路径与按线程的 rollout token 预算（带剩余预算提醒与预算耗尽时中止回合）在 2026 年春季版本中加入。

**Gemini CLI：多阶段上下文流水线。** Gemini CLI 的上下文管理比简单压缩更精细。在顶层，ChatCompressionService 在历史超过模型 token 上限的 50% 时触发，调用 Gemini 生成状态快照，并逐字保留最近 30% 的历史（现在压缩前会先触发一次 token 预算截断预处理与一个 `PreCompress` 钩子）。在此之下，一个专门的 context-processors 模块实现了带可插拔处理器（滚动摘要、节点蒸馏、节点截断、blob 降级、工具屏蔽、状态快照）的多阶段上下文蒸馏流水线，并在 v0.43–0.45 中整合为一个 ContextManager：它在工作缓冲区中维护一张「原始 vs 活跃」上下文图，经一个带迟滞触发阻尼的编排器运行各处理器，并用一个按实测 API token 计数校准的自适应 token 计算器取代了静态的每 token 字符数估计。另一个独立的 ContextCompressionService 跟踪逐文件压缩级别（FULL、PARTIAL、SUMMARY、EXCLUDED），粒度比 Claude Code 的压缩/未压缩二元划分更细；可插拔的 `AgentHistoryProvider` 接口允许扩展替换为自己的压缩逻辑。

**Mistral Vibe：中间件触发，如今两层且可响应触发。** Mistral Vibe 的 `AutoCompactMiddleware` 在每个回合前检查 `context_tokens >= auto_compact_threshold`；压缩例程本身已抽取为一个 CompactionManager，自 4 月以来增加了三项改进：压缩后的状态是一个上下文信封，把先前的用户消息与摘要一并重新注入（因此原始任务目标能在重置后存活）；缓存友好的主摘要会回退到一个专用的无工具摘要器；同一例程还会在回合中途溢出上下文窗口时响应式触发。经由中间件流水线做的集成在架构上仍然比循环内检查更干净：压缩只是又一种回合策略。Mistral Vibe 的配套 RewindManager 为每条用户消息创建文件系统级检查点，支持带可选文件恢复的回退——现在可以 fork 到新会话，并经 ACP 暴露，让 IDE 客户端能驱动回退。曾经独一无二的检查点如今有了更细粒度的同类：OpenCode 为每个项目维护一个 shadow git 仓库（在真实 worktree 之上用独立的 `--git-dir`），在 pre-stream、step 开始与 step 结束时快照，产出逐步的 patch 片段以及对话加文件系统的完整回退。

**Hermes：谱系式压缩。** Hermes 落在阈值家族（在上下文的 50% 减去 max-tokens、下限 64K 时触发；保护前三条消息外加一个带 token 预算的尾部；迭代式辅助模型摘要封顶于 min(上下文的 5%, 12K token)），但加入了一个其他系统都没有的构造：压缩不重写转录——它终结会话。每次压缩关闭当前 SQLite 会话（`end_reason='compression'`）并轮换到由 `parent_session_id` 链接的子会话；谱系辅助函数沿祖先链遍历，会话检索会跨谱系去重。上下文管理与会话持久化合为同一个机制，任何历史都不会被销毁。引擎可插拔（一个 ContextEngine ABC），与 OpenHands 的 condenser 体系遥相呼应。

**Pi：会话树之上的压缩。** Pi 在 contextWindow − 16,384 token 时触发（保留最近 20K），并从其他策略借来两个特征：摘要是迭代合并的——更新提示词重新摄取前一次摘要，而不是从头重新摘要（递归摘要特征）；一个 `session_before_compact` 钩子让扩展可以否决或整体替换结果（可插拔凝结特征）。其独特基底是会话本身：一棵只追加的 JSONL 树，每个条目带有 `id` / `parentId`，一个可移动的叶指针定义活跃分支。`/tree` 导航、`/fork` 与 `/clone` 把其他 harness 拆成三个独立特性来实现的东西（检查点、回退、替代性探索）统一为一体，且放弃一个分支时可选择生成一段 LLM 分支摘要拼接进新位置，探索因此永不丢失——代价是文件系统状态不被恢复，这是一个明示的取舍。累积的 `<read-files>` / `<modified-files>` 列表作为结构化记忆跨压缩持久保留。

**OpenCode：锚定的增量摘要。** OpenCode 在 `limit.input` 减去保留输出余量处触发，用 chars/4 估算（整棵代码树中不存在任何分词器），并产出语料库中最显式的增量摘要：前一次摘要在 `<previous-summary>` 块中传回，由一个隐藏的、拒绝所有工具的 compaction agent 合并（指令是「preserve still-true details, remove stale details」，即保留仍成立的细节、移除过时细节），写入规定的 Markdown 分节（Objective / Important Details / Work State / Next Move / Relevant Files）。保留两轮用户消息的逐字尾部；可选开启的修剪软删除旧工具输出，保护最新的 40K token，且仅当可回收量超过 20K 时才触发。

### 9.6 持久记忆流水线

本研究的 4 月版还能用每个系统一句话来描述跨会话记忆：这里一个 Markdown 上下文文件，那里一个转录存储。三个月后，持久记忆成了厂商原生系统差异化最激烈的地方，而各设计在单一轴线上的分歧极具启发性：谁来写记忆，谁来审。

Codex 运行着最自主的设计。一个后台两阶段流水线从最近的会话 rollout 中抽取结构化记忆（逐 rollout 的 LLM 抽取写入 SQLite 状态数据库，带租约式任务、重试退避与机密脱敏），然后把它们固化到 git 基线化的 `~/.codex/memories/` 根目录下的文件系统工件中——固化由一个沙箱化的内部子 agent 执行（无审批、无网络、仅本地写入），审阅对象是 git 风格的工作区 diff。记忆注入新会话时带引用跟踪与基于使用量的排序。Codex 因此是语料库中第一个由 agent 而不是由代码维护长期记忆的系统；一个实验性的「chronicle」sidecar 把同一套机制延伸到被动屏幕上下文。

Gemini CLI 则朝相反的治理方向移动。它 4 月时代可调用的 `save_memory` 工具已经消失——系统提示词现在直白地声明不存在这样的工具——取而代之的是：(a) 模型直接用普通编辑工具修改 GEMINI.md 或私有的每项目 MEMORY.md 索引；(b) 一个异步的 skill 抽取子 agent，挖掘已完成的会话转录，把规范的 patch 文件产出到每项目 `.inbox/` 中，由用户经 `/memory` 审阅并应用。Codex 让 agent 自主固化记忆，Gemini CLI 则在抽取与持久化之间插入一个由人把关的审阅收件箱——语料库中唯一这样的设计。

Hermes 刻意让持久记忆保持极小且缓存友好：两个限长的 Markdown 文件（MEMORY.md，2,200 字符；USER.md，1,375），以冻结快照形式注入，因此会话中途的写入只落盘，不会使提示词缓存失效。对话召回是确定性的——一个 `session_search` 工具查询由触发器维护的 SQLite FTS5 表（BM25，外加面向中日韩文字的 trigram 索引），「no LLM calls anywhere」（任何地方都不调用 LLM）——embedding 只存在于可选的记忆插件中。OpenClaw 自带一个 Active Memory 插件（我们顺带记录在案：自前一版所审计的 4 月发布起它就已存在），在主回复之前立即运行一个专用记忆子 agent，另有更早的可选 LanceDB 对话记忆扩展。OpenHands 把记忆折入其上下文文件约定：一个 `<MEMORY>` 提示词小节指示模型把持久事实写进 AGENTS.md 本身。Claude Code 为每个项目持久化 Markdown 事实的记忆目录；Pi 与 Mini-SWE-Agent 刻意不持久化会话基底之外的任何东西。

**观察 5.** 持久记忆已取代压缩，成为上下文工程的前沿。压缩设计已经收敛（十一个系统中七个使用阈值触发的 LLM 摘要，且越来越多地采用增量合并）；如今区分这一领域的是记忆写入路径。四种治理模型并存：agent 维护（Codex：一个沙箱化子 agent 在 git 基线化存储上固化记忆）、人工把关（Gemini CLI：抽取子 agent 写入补丁收件箱，用户经 `/memory` 审阅）、模型直写但有界（Hermes：字符数封顶的 Markdown 快照，按会话冻结以保证缓存卫生；OpenHands、Claude Code：上下文文件约定）、回合前 agent 召回（OpenClaw 的 Active Memory 子 agent）。值得注意的是，十一个系统中没有任何一个把基于 embedding 的检索用作主要记忆基底——观察 13.2 的确定性检索结论从代码延伸到了记忆，SQLite 全文检索（Hermes）是生产环境的上限。

### 9.7 仓库上下文

除对话历史之外，agent 还必须管理代码上下文：

- **Aider RepoMap**：基于 Tree-sitter 的符号索引，配合 diskcache（SQLite v4）——仍是语料库中唯一带排序的仓库地图。符号按与当前对话的相关度排序。token 预算是自适应的（`map_tokens`，默认 1024），大仓库另有 `map_mul_no_files` 乘数。
- **Claude Code 记忆系统**：经专用 claudemd 子系统自动发现 CLAUDE.md 文件（managed、user 与 project 三种作用域，从工作目录出发遍历），作为嵌套记忆附件注入并去重；独立的 memdir 机制管理每项目的持久自动记忆目录。
- **Codex 指令**：层级化的 AGENTS.md 指令——准确地说，是从项目根到工作目录的逐级拼接（嵌套内容追加在最后，因此「优先级」只靠位置成立），外加 `AGENTS.override.md` 逃生口以及可配置的根标记与回退文件名。
- **Gemini CLI 上下文文件**：三作用域的 GEMINI.md 合并（global、extension、project），受文件夹信任门控；另经工具输出 JIT 注入子目录上下文文件，并有私有的 MEMORY.md 项目索引。
- **Mistral Vibe JIT 发现**：提示词中放顶层 AGENTS.md（user 与 project 作用域），且自 v2.19 起，当 `read_file` 触及其下方文件时，嵌套的 AGENTS.md 会即时浮现。
- **Hermes 带威胁扫描的层级**：先找到先赢的遍历（`.hermes.md` / `HERMES.md` 直到 git 根，然后 AGENTS.md、CLAUDE.md、`.cursorrules`）；每个上下文文件都扫描提示词注入模式，命中即整体屏蔽；一个子目录提示跟踪器把每目录上下文文件追加进工具结果，缓存中的提示词保持原样。
- **Pi 祖先遍历**：AGENTS.md / CLAUDE.md 从 cwd 到根收集进 `<project_context>` 标签；仓库控制的配置（扩展、skills）的加载受信任门控，但上下文文件无论如何都会加载——这是一处有文档记载的、对注入面的有意接受。
- **OpenCode 拉取式附加**：AGENTS.md / CLAUDE.md / CONTEXT.md 向上遍历（首个文件名优先），外加远程 URL 指令文件；嵌套的 AGENTS.md 在 read 工具触及其下方文件时惰性附加。
- **OpenHands 第三方摄取**：skills 子系统把 AGENTS.md、`.cursorrules` 与每目录嵌套的 AGENTS.md 摄取为作用域规则——一个系统读取另外三个生态的约定。
- **OpenClaw 转录**：按 agent/会话持久化的 JSONL 转录文件，位于 `~/.openclaw/agents/<agentId>/sessions/<sessionKey>.jsonl`。

---

## 10 安全与权限模型

安全机制的重要性与赋予 Agent 的自主性成正比。最近的一系列学术工作将威胁模型形式化：通过文件或网页内容实施的间接提示词注入 [77]、作为注入攻击与防御之动态评估环境的 AgentDojo [76]、R-Judge [78] 等风险意识基准，以及 ToolSword [79] 对工具使用安全失效模式的编目。语料库覆盖范围很广：从基本没有安全控制的系统，到多层安全架构。

### 10.1 Claude Code：三层权限系统

Claude Code 实现了架构上最优雅的安全系统，共三层（图 5）：

```
Layer 3：交互式用户对话框（approve / reject / edit）   ← 最慢、最可靠
Layer 2：基于 LLM 的权限分类器（allow / ask / deny）
Layer 1：静态 Hook 规则（PreToolUse 模式匹配）         ← 最快、上下文最少
```

*图 5：Claude Code 的三层权限系统。*

对后台（background）与被 fork 的子 Agent，只有第 1–2 层可用——它们本应发出的提示词会被解析为拒绝——而默认的前台子 Agent 仍可浮出交互式对话框。无法裁决的情形会升级给父协调者。拒绝跟踪机制按会话统计权限拒绝次数；达到 N 次拒绝后，系统回退为弹窗询问。每个异步 Agent 维护本地拒绝状态，以防跨 Agent 污染。

### 10.2 Codex：带原生沙箱的四层权限栈

四月版将 Codex 的安全机制描述为两项——策略规则加 OS 沙箱——并将其审批闸门形容为「近乎不可见」。七月快照显示为四层，其中两层正向 Claude Code 的设计收敛：

**第 1 层：执行策略（Starlark，而非 TOML）。**

可执行规则（execpolicy/）以 Starlark 编写：prefix_rule(pattern=[…], decision="allow|prompt|forbidden", match=[…], not_match=[…]) 与 network_rule(…) 等函数，从 CODEX_HOME/rules/ 与各配置层专属的 rules 目录加载。（脚注 7：四月版曾把这些规则呈现为 TOML；那是我们早先审计中的错误——策略语言一直是 Starlark。）一个独特细节：规则可携带内联的 match / not_match 示例并在解析时校验——相当于策略文件内的可执行测试用例。

```starlark
prefix_rule(
  pattern = ["git", "status"],
  decision = "allow",
  match = [["git", "status"], ["git", "status", "--short"]],
  not_match = [["git", "push"]],
)
network_rule(
  protocol = "https",
  host = "*.github.com",
  decision = "allow",
)
```

*清单 2：Codex 执行策略示例（Starlark）。*

**第 2 层：生命周期 Hook。**

一个 hooks crate 暴露外部 Hook，其事件词汇表几乎逐字取自 Claude Code：PreToolUse、PermissionRequest、PostToolUse、PreCompact、SessionStart、UserPromptSubmit、SubagentStart、SubagentStop、Stop——外加一个 Claude Code 没有对应物的 PostCompact 事件——并输出 block/allow 决策。14.5 节将此讨论为语料库中最清晰的案例：一家厂商原生 harness 采纳另一家的扩展接口作为事实标准。

**第 3 层：Guardian，LLM 审批复核器。**

当一条命令需要用户批准时，一个专用的 Guardian 会话会依据策略提示词重新评估确切的既定动作（紧凑转录重建、严格 JSON 裁决），在超时或输出畸形时失效关闭（fail closed），并携带按轮次计的拒绝熔断器。四月版针对 Claude Code 做出的「没有 LLM 分类器」对比不再成立：两个厂商原生旗舰现在都实现了「静态规则 → LLM 分类器 → 交互式/OS 兜底」模式。一个面向用户的协作模式选择器（Plan/Default 预设，遮蔽模型、推理努力程度与开发者指令）为这场收敛画上句点：全部四个厂商原生系统现在都自带只读规划模式。

**第 4 层：原生 OS 沙箱。**

沙箱实现横跨三个平台：

- Linux：内置（vendored）于代码树中的 Bubblewrap（经 C FFI 调用），只读文件系统（--ro-bind / /）、经 --bind 指定的可写根目录、网络命名空间隔离（--unshare-net）、用户/PID 命名空间隔离；Landlock 降级为遗留回退方案。
- macOS：经 /usr/bin/sandbox-exec 使用 Seatbelt profile，允许/拒绝规则可配置。
- Windows：受限令牌（restricted-token）进程，基于 ACL 的读写限制。

**观察 6.** OS 级沙箱是语料库中代码开销最大的能力之一，而且它是一种选择，而非规模的必然结果。四月语料库暗示了一种规模相关性（其中最大的两个系统正是它的两个跨平台沙箱实现者）；扩充后的语料库打破了这一规律。Hermes 是此处最大的系统之一，却不带任何 OS 级隔离原语：它把遏制（containment）委托给六个可插拔执行后端，而把安全预算花在内容承载型威胁上（promptware 扫描——对提示词注入载荷做模式匹配——、Skills 供应链、以及在 --yolo 下依然生效的命令策略底线）。规模相当的 OpenCode 走纯策略路线，投资于语法感知的命令权限控制而非隔离。Pi 则把「不做」作为安全论据记录在案：进程内的部分沙箱「很容易被误解为安全边界」。仍然成立的是成本一面：凡构建了原生沙箱之处（Codex、Gemini CLI；Claude Code 将 Anthropic 可复用的 sandbox-runtime 包装为可选启用项），都是数千行级别的可观投入——而 14.4 节将展示元 harness（harness 即「驾驭层」）在更高一层把同一笔账再付一遍。

### 10.3 OpenHands：集成式纵深防御

OpenHands 可插拔的 SecurityAnalyzer 框架在 V1 SDK 中大幅成熟。V0 时代的 Invariant 分析器已不复存在；当前组合是 LLMSecurityAnalyzer（Agent 对每个动作的 security_risk 自评，系统提示词指示它填写该参数）与 GraySwanAnalyzer（外部对抗式 API），再加上两个新的确定性分析器——PatternSecurityAnalyzer 与 PolicyRailSecurityAnalyzer，后者基于 shell-AST 解析，内置 fetch-to-exec、raw-disk-op、catastrophic-delete 等命名轨道（rail）。EnsembleSecurityAnalyzer 以「最坏情况胜出」的方式融合各裁决，失效的子分析器一律失效关闭为 HIGH。LOW/MEDIUM/HIGH/UNKNOWN 风险枚举保留；确认机制现在是一个策略对象（AlwaysConfirm / NeverConfirm / ConfirmRisky）。提示词侧补齐了双向注入防御：源自仓库的上下文被包裹在 <UNTRUSTED_CONTENT> 标记中，且有一段专门的提示词讲授风险评估协议。

### 10.4 OpenClaw：基于作用域的授权

OpenClaw 实现基于作用域的授权：以 operator 与 node 两种连接角色作用于带命名空间的作用域（operator.read / write / admin / pairing /…）。网关强制每方法的作用域要求。其他安全机制包括：按 IP/token 的固定窗口限流、SSRF 策略强制、带配对审批工作流的 DM 白名单、面向浏览器动作与插件动作的 exec 审批闸门，以及聊天净化。2MB 的 MAX_PROMPT_BYTES 上限提供 DoS 防护（CWE-400）。

### 10.5 Gemini CLI：四种审批模式加跨平台沙箱

Gemini CLI 叠加两个互补的安全机制。其一，ApprovalMode 枚举把每次工具调用归入四种模式之一：

- PLAN：只读；模型可见完整工具列表，但只能调用读取类工具（Glob、Read、Grep 等）。其回复以计划形式呈现，用户必须显式批准才能退出规划模式。
- DEFAULT：每次工具调用弹交互式审批对话框；用户可批准一次、始终批准或拒绝。
- AUTO_EDIT：编辑操作自动批准，而 shell 及其他有副作用的工具仍需弹窗；面向本地代码的快速迭代。
- YOLO：所有动作自动批准。仅面向 CI/脚本化使用。

其二，SandboxPolicyManager 强制执行基于 TOML 的按模式策略：哪些路径可读/可写、哪些网络主机可达、哪些环境变量被清除。这一组合在结构上与 Codex 的「策略即代码 + 沙箱」栈相似，但又在其上叠加了一个显式的用户侧模式选择器——一项 Codex 后来已通过其协作模式预设采纳的人机工学。独立的 isTrustedFolder() 检查依据目录是否在用户信任列表中，进一步放宽或收窄上下文发现范围，构成第四层可选加入的粒度。在我们两次快照之间，发布节奏由策略引擎与供应链加固主导——headless 模式下受信任门控的 .env 加载、带 core-tools 允许列表的 shell 命令校验、Skill 安装的路径穿越检查——印证了观察 10.2 的论断：在最大的系统中，安全吸收了不成比例的工程份额。

### 10.6 Mistral Vibe：权限作用域模式加 Agent 档案门控

Mistral Vibe 没有 OS 沙箱（新增可选的 --worktree 标志现可提供分支级隔离），但以比其他无沙箱系统更细粒度的权限模型作为补偿。每次工具调用都按一个层级依次检查：

1. Agent 档案（agent-profile）级别的工具级权限设置（ALWAYS、ASK、NEVER）。
2. 工具专属校验器（如 resolve_file_tool_permission 对路径做模式匹配），外加默认的只读命令允许列表，自动放行 ls / cat / grep 一类命令。
3. 用户声明的 shell Hook（hooks.toml，before_tool），可在权限评估之前拒绝调用或改写其输入。
4. 运行时添加的会话规则——「始终允许」授权现可跨会话持久化。
5. 呈现给用户的交互式审批回调，除非设置了 bypass_tool_permissions（由 auto_approve 更名而来）。

Agent 档案内置安全分级：plan 与 chat 档案为 SAFE（只读）；default 为 NEUTRAL；accept-edits 为 DESTRUCTIVE；auto-approve 为 YOLO。工具也可覆盖 Agent 默认：无论何种档案，write_file 对敏感模式（.env 文件）强制 ASK。没有基于 LLM 的风险分类器，也没有 OS 级隔离；安全化约为显式的逐模式匹配、Hook 与用户提示。

### 10.7 Hermes：在 YOLO 下依然生效的策略底线

Hermes 把沙箱问题反了过来：这个语料库中最大的 Python 系统不带任何 OS 级隔离原语——其工具目录树中找不到 Seatbelt、Landlock、seccomp 或 Bubblewrap——而是把隔离委托给六个可插拔执行后端。在本地后端上，安全是大规模的「策略即代码」：一个 3,200 行的审批模块，其文档宣称「config.yaml 即安全策略」。它的层次：用户 deny-glob；一条十二模式的强硬底线（rm -rf /、mkfs、向块设备 dd、fork 炸弹、shutdown），在 --yolo 下依然生效——YOLO 环境变量在模块导入时即被冻结，正是为了让被提示词注入的 Skill 无法在运行时把它翻转；47 个危险命令模式，在去混淆变体上匹配（去除引号拼接、折叠命令替换、锚定命令位置）；一个外部 Rust 内容扫描器（Tirith，经 cosign 验证安装）；以及一个可选的辅助 LLM 闸门（_smart_approve：temperature 0、最多 16 token、APPROVE/DENY/ESCALATE——其代码注明致谢 Codex 的 Smart Approvals）。其独特威胁模型是内容承载型：对上下文文件、记忆写入、MCP 工具描述与 Skill 安装做 promptware 扫描（带 builtin/trusted/community 信任分级与隔离区）；始终封锁云元数据端点的 SSRF 防护；不可信工具结果以 <untrusted_tool_result> 定界符包裹，并对形近字符做去武装（defanging）。容器后端完全跳过危险命令层——直到宿主 bind-mount 把它重新带入。显著缺席项：没有按工具的 allow/ask/deny 矩阵，也没有只追加审计日志。

### 10.8 Pi：把「缺失」记录在案作为安全论据

Pi 是语料库中唯一一个把安全基础设施的缺失作为设计原则明文记录的系统：其安全文档主张，进程内的部分沙箱「很容易被误解为安全边界」，宣称经由上下文文件的提示词注入不可防护，并让内置工具以调用用户的权限无条件执行。唯一的内置闸门是项目信任（project trust）：仓库可控的配置（扩展、Skills、提示词、主题）只从受信任路径加载，按规范化路径以最近祖先查找判定——文档明确指出这「不是沙箱」，且上下文文件照常加载。权限控制是把「策略即代码」按字面落实：tool_call 扩展事件暴露可变的工具参数与一个 {block, reason} 否决，参考权限闸门示例用约 80 行用户空间代码实现了常见的「正则 + 确认」流程（rm -rf、sudo、chmod 777）；需要隔离时，经逐工具的 Operations 接缝以扩展形式接入（Anthropic 的 sandbox-runtime、一个 QEMU 微虚拟机）。只追加的会话树兼任完整的审计轨迹。

### 10.9 OpenCode：语法感知的权限控制，默认宽放

OpenCode 是仅次于 Hermes 的第二大无 OS 级隔离系统（其代码中的「sandbox」指 git worktree），其默认姿态与 Codex 相反：项目内 "*": allow，ask 仅保留给 external_directory 访问、.env 读取与 doom loop。其独特的投入是语法感知的命令权限控制：每条 bash 命令都以 web-tree-sitter 解析（bash 与 PowerShell 语法）；确切的命令文本即成为 ask 模式，而「始终允许」授权由一个约 130 条目、明确由 LLM 生成的命令元数（arity）字典界定范围（git → 2，npm run → 3），产出诸如 git commit * 的授权而非一刀切批准；操纵文件的命令会解析其参数路径，项目外路径触发 external_directory ask。权限规则（{permission, pattern, action}，glob 通配符下后匹配者胜）按 defaults → 内置 Agent → 用户配置 → 单 Agent → 单会话分层，而对某工具拒绝 "*" 会把它从 LLM 的视野中彻底移除——工具可用性本身就由权限派生。一个并行的 v2 引擎反转为默认拒绝，并把批准持久化到 SQLite；headless 运行自动拒绝所有 ask。没有危险命令黑名单，也没有风险分类器。

### 10.10 极简安全（Aider、Mini-SWE-Agent）

Aider 提供交互式确认模式，但没有自动化风险评估。不过，其带三阶段 Python linting（语法 → 编译 → flake8）的反思循环在错误扩散之前将其捕获，提供了隐式安全。

Mini-SWE-Agent 仅实现资源限制作为安全机制——step_limit、cost_limit，以及（v2.4 系列新增）墙钟时间上限与连续格式错误上限，外加可选的交互式确认模式——足以支撑基准评测，但不足以用于生产。

## 11 多 Agent 编排

十一个系统中有九个支持多 Agent 执行，且其架构分歧巨大。这是语料库中分布最分散的维度，因此我们在这里比其他章节着墨更多。

### 11.1 多 Agent 分类法

我们识别出六种不同的多 Agent 模式：

1. **单 Agent（无多 Agent）**：Mini-SWE-Agent、Aider——以及 Pi 的核心（不带 spawn 或 task 工具；其子 Agent 生活在扩展空间，见下）。
2. **顺序委派**：Mistral Vibe（父 Agent 经 task 工具生成一个子 Agent 并等待其完成）。
3. **并行子会话**：OpenHands（task 与 delegate 工具把子任务运行为独立会话，在线程中并发），OpenCode（task 创建运行同一循环的子会话；一条消息中的多次调用并发执行）。
4. **带 fan-out 的层级线程树**：Codex（专用线程、由 fork 模式控制的继承、按模型的工具代际、map-reduce 式 fan-out、持久化的父/子拓扑）。
5. **递归组合**：Claude Code（Agent 以可组合的方式生成子 Agent，fork 共享提示词缓存）。
6. **注册表 + 跨进程协议**：Gemini CLI（命名 Agent 定义置于对称的本地/远程会话协议之后，远程 Agent 经 A2A），OpenClaw（ACP 会话生成），Hermes 的 Kanban swarm（基于 SQLite 黑板的子进程）。

表 9 提供详细对比；图 6 让各模式的形状一目了然。

*表 9：九个多 Agent 系统的多 Agent 编排（Pi 经其参考扩展实现）。*

| 系统 | 机制 | 隔离 / 继承 | 通信 | 深度 / 并行 | 工具过滤 |
|---|---|---|---|---|---|
| OpenHands | task + delegate 工具 → 独立会话 | 每个子 Agent 全新事件日志；指标同步回传 | 摘要返回；会话树导航 | 支持嵌套 / 并发线程 | Markdown frontmatter（tools、skills、permission mode） |
| Claude Code | AgentTool + 上下文 fork | fork 上下文（6 个维度）；共享渲染后的提示词 | 返回值 + XML 通知 | 递归 / 真并行 | 16 工具白名单 |
| Codex | spawn_agent v1/v2（按模型） | 线程树；SpawnAgentForkMode | 带邮箱投递阶段的会话输入队列；类型化 InterAgentCommunication 记录 | 深度跟踪 / 并行 + CSV fan-out | 继承 + 过滤；TOML 角色（explorer、awaiter） |
| Gemini CLI | invoke_agent 工具；注册表定义 | 每实例隔离注册表 | 对称本地/远程会话协议；A2A RPC | 扁平 + 远程 / 轮内顺序 | 按定义的 toolConfig |
| Mistral Vibe | task 工具 → 新 AgentLoop | 全新配置 + 会话目录；继承权限存储、scratchpad、hooks | 事件转发 | 1 跳 / 顺序 | 仅限标记 subagent 的档案（explore） |
| Hermes | delegate_task 进程内 fork；Kanban swarm 子进程 | 全新上下文、自有任务 id；继承 provider/凭据，无历史 | 生成时给定目标；流式事件；摘要返回；SQLite 黑板（swarm） | 默认 1，orchestrator 角色解锁嵌套 / 3 并发（池） | 与父工具集取交集 + 6 工具黑名单 |
| Pi（扩展） | 扩展 spawn `pi --mode json -p` OS 进程 | 硬进程隔离；全新上下文 | 解析子进程 JSONL stdout 取进度/成本 | 无上限（无计数器）/ 池 4、最多 8；顺序链 | 子进程 --tools 标志来自 agent frontmatter |
| OpenCode | task 工具 → 子 Session（同一循环） | parentID 会话；子继承父的 deny + 外部目录规则 | `<task_result>` XML；后台结果注入为合成用户消息 | 递归默认关闭，可选开启且无上限 / 并行 | 权限规则集（deny "*" 隐藏工具） |
| OpenClaw | ACP 会话生成 | 子进程；全新会话 | ACP delta 事件 | 递归 / 并行（RPC） | 会话作用域 |

图 6（六种模式示意）：

- **(1) 单 Agent**：Mini-SWE-Agent、Aider、Pi core——Agent 行动–观察（act–observe），无 spawn 工具。
- **(2) 顺序委派**：Mistral Vibe——父 Agent → 子 Agent（task）→ 摘要；父阻塞等待；一次只一个子 Agent。
- **(3) 并行子会话**：OpenHands、OpenCode——父 Agent → 会话 A / 会话 B 并发；历史各自独立。
- **(4) 层级线程树**：Codex——根线程 → 线程 → 线程……；fork 模式；深度跟踪；CSV fan-out。
- **(5) 递归组合**：Claude Code——Agent → 子 Agent → 子子 Agent……；fork 上下文；任何 Agent 都能生成 Agent；共享提示词缓存。
- **(6) 注册表 + 协议**：Gemini CLI、OpenClaw、Hermes swarm——父 Agent → 注册表（Agent 定义）→ 远程 Agent；按名调用；跨进程边界；A2A / ACP / SQLite 黑板。

*图 6：上列分类法中六种多 Agent 编排模式的示意图。红色节点为生成者，蓝色节点为被生成者，绿色为定义注册表；实线箭头表示生成或调用，虚线箭头表示返回结果。各面板下方的系统是该模式在语料库中的代表（表 9）。*

### 11.2 深入剖析：Claude Code 的递归组合

Claude Code 的多 Agent 架构是所研究系统中最精密的。它支持三个层级的协调：临时（ad-hoc）子 Agent、类型化 Agent 定义，以及完整的协调者模式。

#### 11.2.1 Agent 定义系统

Agent 经由一个 JSON/Zod schema 定义，其中指定：描述、提示词、可选的工具白名单/黑名单、模型选择、轮次上限、权限模式、MCP 服务器绑定、隔离级别、后台执行标志，以及 Skills。

Agent 定义按优先级层级加载：内置 Agent → 插件 Agent → 用户设置 → 项目设置 → 标志设置 → 策略/受管 Agent。后到的来源覆盖先到的。内置 Agent 包括 Explore（快速代码库搜索）、Plan（架构设计）与 VerificationAgent（测试执行）。

#### 11.2.2 上下文分叉

当经 AgentTool 生成子 Agent 时，父上下文沿六个维度分叉：

1. **AbortController**：新控制器链接到父（父中止 → 子中止，反之不然）。
2. **文件状态缓存**：克隆 LRU 缓存以防并发突变。
3. **权限提示**：对异步 Agent 抑制（shouldAvoidPermissionPrompts = true）。
4. **App 状态**：对异步 Agent 置为 no-op，防止对已死会话的突变。
5. **拒绝跟踪**：全新的本地状态（拒绝不在全局累积）。
6. **工具决策**：每个 Agent 全新的 Map（无跨 Agent 污染）。

一个关键优化是提示词缓存共享：父的 renderedSystemPrompt 在 fork 时冻结并逐字传给子。这确保提示词缓存命中在 fork/恢复边界上得以维持，防止 GrowthBook 特性门控的分歧使缓存失效。

#### 11.2.3 协调者模式

启用后（经环境变量或特性门控），一个 Lead Agent 编排若干 Worker（图 7）：

```
              Coordinator（Lead Agent）
               spawn      spawn      spawn
     Worker 1（Research） Worker 2（Implement） Worker 3（Verify）
     16 工具（白名单）    16 工具（白名单）     16 工具（白名单）
  Coordinator 工具：AgentTool、SendMessageTool
  Worker 工具：Bash、Read、Edit、Grep、Glob、…
```

*图 7：Claude Code 协调者模式架构。Worker 获得 16 工具的白名单，并经 XML 通知上报。*

Worker 被限制在 16 工具白名单（ASYNC_AGENT_ALLOWED_TOOLS）内：FileRead、WebSearch、TodoWrite、Grep、WebFetch、Glob、两个 shell 工具（Bash 与 PowerShell）、FileEdit、FileWrite、NotebookEdit、Skill、SyntheticOutput、ToolSearch、EnterWorktree 与 ExitWorktree。协调者在委派下一阶段之前先综合 Worker 的发现，遵循结构化工作流：Research → Synthesis → Implementation → Verification。

### 11.3 深入剖析：Codex 线程树模型

Codex 的多 Agent 架构围绕三个核心抽象构建：

- **AgentControl**：生成与管理子 Agent 的中央控制平面。
- **AgentRegistry**：在会话树中跟踪所有存活 Agent，维护 LiveAgent 元数据结构体。

**生成流程（Spawn Flow）。** spawn_agent_internal() 函数预留一个生成槽位，继承父的沙箱与执行策略，从来源解析 fork 模式与元数据，以适当的历史（完整、截断或全新）创建线程，并发出 session-started 通知。

**SpawnAgentForkMode。** 一个独特特性是 SpawnAgentForkMode，它控制子 Agent 继承多少对话历史：

- FullHistory：继承全部消息（完整上下文）。
- LastNTurns(N)：只继承最近 N 轮（缩减上下文）。

消息过滤（keep_forked_rollout_item()）只保留 system/developer/user 消息与最终的 assistant 回答，滤除中间的工具调用与推理。这种选择性继承防止子 Agent 上下文膨胀。

**Agent 间通信。** 早期版本的专用 mailbox 模块已并入会话的输入队列：Agent 间消息经由带邮箱投递阶段的 InputQueue activity 流动，承载为类型化的 InterAgentCommunication 记录（Spawn / Message / Followup / Result）。两代工具并存——multi_agents（spawn/wait/send_message/interrupt/list）与 multi_agents_v2（spawn/wait/send_input/resume_agent/close_agent）——由模型元数据中的 multi_agent_version 字段按模型选择；父/子拓扑由专门的 agent-graph-store crate 持久化。父经 AgentStatus 枚举监控子状态。

**Fan-Out 与声明式角色。** 在 spawn 与 mailbox 之外，Codex 还长出了 map-reduce 式编排：spawn_agents_on_csv 在共享的 JSON-schema 结果契约下、经并发归一化与运行时上限约束，为每行 CSV 启动一个子 Agent，并经 report_agent_job_result 把结果折回。子 Agent 由声明式 TOML 角色定型（内置 explorer 与 worker 角色在代码树中处于启用状态；一个 awaiter 角色文件仍在但目前未注册），作为高优先级配置层生效——这是 Codex 对 Claude Code Agent 定义的回应——而委派本身由模型治理：ultra 推理档位将最大推理与自动任务委派耦合，可配置的委派模式（disabled / explicit-request-only / proactive）作用于线程与轮次两级。

### 11.4 OpenHands：会话树上的并行委派

V0 时代的 AgentDelegateAction（顺序、一次一个被委派者、共享事件流）已不复存在。V1 SDK 经工具委派：一个 TaskTool，其形态明显酷似 Claude Code（prompt、subagent_type、description、resume），配一个 TaskManager 为每个任务创建独立会话（自有事件日志、指标同步回传）；以及一个 DelegateTool，其 spawn / delegate 命令在线程中并发运行被委派的任务。子 Agent 声明为带 YAML frontmatter 的 Markdown 文件（name、description、model、tools、skills、hooks、MCP 配置、permission mode、condenser），位于 project/user/builtin/plugin 层级——内置的有 code-explorer、bash-runner 与 web-researcher（外加一个通用默认）——且明确支持嵌套。在委派层之上还有一个 scaffold 级外循环：/goal 端点在每轮运行后让一个 LLM 评审（judge）审视转录，或注入后续提示词，或以完成状态停止，并辅以精化迭代上限可配置的可插拔 critic。

### 11.5 Mistral Vibe 顺序子 Agent 委派

Mistral Vibe 的多 Agent 支持刻意保持简单：父 Agent 调用 task 工具，后者以所请求的 Agent 档案（如 explore）构造一个全新的 AgentLoop 实例，在进程内运行至完成，并把子 Agent 的 AssistantEvent 输出与 ToolResultEvent 摘要返回给父。一个守卫强制只有标记为「subagent」的档案（目前仅 explore）可被委派，防止意外递归升级到具备写能力的档案。每个子 Agent 获得全新的 VibeConfig、自己的会话目录与独立的消息历史，隔离程度与 Codex 的线程树相当，但代价是牺牲真并行：父在 await 上阻塞直至子 Agent 退出。架构的简单性（一个工具、顺序、进程内）意味着 Mistral Vibe 位于多 Agent 光谱的简单一端——是语料库中除「全无委派」之外最简单的委派，令人想起 OpenHands 已退役的 V0 AgentDelegateAction。

### 11.6 Gemini CLI：注册表、对称会话协议与 A2A

Gemini CLI 的多 Agent 模型分跨两层。本地侧，AgentRegistry 保存命名 Agent 定义——带必备 YAML frontmatter 的 Markdown 文件——从 user、project 与 extension 作用域加载。例如内置的 generalist Agent，授予访问全部已注册工具的权限，运行预算为 10 分钟、20 轮。调用经 /agent 斜杠命令、@agent-name 提示词记法，或——自 v0.39 的子 Agent 统一起——一个可由模型调用的 invoke_agent 工具，每次运行获得隔离的工具注册表。调用路径已被抽象到一个 Agent 会话协议之后，本地与远程实现对称：由进程内执行器支撑的注册表条目与由远程 A2A Agent 支撑的条目，经同一接口驱动。

Gemini CLI 与语料库中所有其他系统的分野在于 packages/a2a-server 模块——Google 的 Agent-to-Agent（A2A）协议的实验性实现。A2A 之于 Agent 间通信，犹如 MCP 之于工具集成：一个 JSON-RPC 标准，让一个 Agent 进程发现另一个、向其认证并交换消息——后者可能位于不同机器、由不同厂商构建。Gemini CLI 的 A2A 服务器让远程编排者驱动一个本地 Gemini CLI 实例，如同它是注册在案的本地 Agent——如今还经协议上报用量元数据以做跨厂商资源核算——打开了跨厂商多 Agent 拓扑的大门，语料库中没有其他系统原生支持这一点（14.4 节的元 harness 恰是从外部构建此类拓扑）。

### 11.7 Hermes：受控委派、Swarm 与 Mixture-of-Agents

Hermes 是默认扁平的委派，向上留有两个逃生口。delegate_task 在线程池上以进程内方式构建子 Agent：全新会话、聚焦的系统提示词、只返回摘要、工具集与父取交集（「子 Agent 不得获得父所缺的工具」），外加一个六工具黑名单（不许递归、不许用户交互、不许记忆写入、不许排程）。默认保守——三个并发子任务、50 次迭代预算、深度 1——但 role="orchestrator" 配置加 spawn-depth 设置可解锁嵌套树，编排者提示词块明确「以 OpenClaw 的 buildSubagentSystemPrompt 为蓝本」。后台委派返回一个句柄，并经完成队列作为全新一轮重新进入，而非在中途拼接——这是一个保提示词缓存的选择。在此之上是进程级一层：Kanban swarm 以独立的 hermes -p <profile> 子进程运行 planning-root → 并行 worker → verifier → synthesizer，经一个 SQLite 看板与结构化 JSON 评论黑板协调——以共享数据库而非协议或信道实现协调者-工人。第三个叠加层 /moa 把顾问式参考模型 fan-out（最多八个并发），其输出为主模型的下一轮迭代「调味」。

### 11.8 Pi：子 Agent 作为扩展，舰队作为包

Pi 核心没有 spawn 或 task 工具——子 Agent 是其扩展论点的旗舰示范，以约 1,000 行的示例交付。每次调用都 spawn 一个独立的 `pi --mode json -p --no-session` OS 进程，由构造获得硬上下文隔离；父解析子的 JSONL stdout 以聚合进度与成本。一个工具提供三种形态：single、parallel（worker 池为 4，最多 8 个任务）与带 {previous} 替换的 chain。Agent 定义是 Markdown 加 frontmatter，经子的 --tools 标志过滤工具；没有深度计数器，也没有运行中途的父子消息传递。在单进程之上，一个实验性 orchestrator 包以 RPC 模式监管 Pi 实例舰队，并向一个托管协调者注册在线状态——是多实例管理，而非循环内协调者。值得注意的是，Pi 真正做多 Agent 时，落在跨进程 JSONL 而非进程内原语上——13.3 节会回到这个数据点。

### 11.9 OpenCode：能力由权限派生的子会话

OpenCode 的子 Agent 是子会话，而非独立引擎：task 工具创建一个带 parentID 的 Session，运行同一循环，可经 task_id 恢复，只返回以 `<task_result>` XML 包裹的最终 assistant 文本；后台结果作为合成用户消息注入。Agent 与模式统一于一个 schema（mode: primary|subagent|all）：内置的有 build、plan（除 plan 文件外拒绝编辑）、general、只读的 explore，外加隐藏的 compaction / title / summary 工具 Agent——plan 模式是一个权限规则集加一个 `<system-reminder>` 注入，而非架构性叠加。工具可用性处处由权限派生（对某工具拒绝 "*" 会把它从 LLM 视野中移除），遏制是不对称的：子只继承父的 deny 规则。递归默认关闭（task 对子自动拒绝），但可按 Agent 选择性开启，且无数字深度上限；自定义 Agent 来自配置、Markdown 文件，或——独一无二地——LLM 生成（对 {identifier, whenToUse, systemPrompt} 调 generateObject）。

### 11.10 OpenClaw 基于会话的编排

OpenClaw 的多 Agent 模型截然不同：它经由一个 ACP（Agent Client Protocol，Zed/Google 面向编辑器的 JSON-RPC 标准，见 agentclientprotocol.com，并非 IBM 更早的同名 Agent Communication Protocol）转换器运作，把 Gateway 线协议桥接到 Agent 进程。子 Agent 以带 RPC 绑定的子进程生成。每个 Agent 拥有自己的会话，转录以 JSONL 持久化。通信经 ACP delta 事件（文本、思考、工具调用）发生，而非共享内存。限流器（MAX_PROMPT_BYTES = 2MB）提供 DoS 防护。

**观察 7.** 协调者-工人（coordinator-worker）模式在语料库中独立涌现：见于全部四个厂商原生系统（Claude Code、Codex、Gemini CLI、Mistral Vibe），见于 OpenHands（会话树上的并行委派）、Hermes（配置门控的 orchestrator 角色加基于 SQLite 黑板的子进程 swarm——一种新颖的协调基底）、OpenCode（并发子会话），以及协议层的 OpenClaw。此处我们对 coordinator-worker 取广义：任何「父生成工人」式的委派；第 6 节更窄的规定性叠加仅适用于 Claude Code、Codex 与（门控的）Hermes。如此多独立开发的代码库收敛到同一层级形状，是趋同进化的有力证据——尽管这种收敛应限定于把多 Agent 建入核心的系统：Pi 是一个刻意以单 Agent 出货的生产级 SWE harness，把子 Agent 降级到扩展空间。各实现在优化目标上的分歧颇具启发性：Claude Code fork 上下文并在子之间共享提示词缓存（成本）；Codex 构建带类型化 Agent 间记录、按模型工具代际与 CSV fan-out 的深度跟踪线程树（隔离与规模）；Gemini CLI 把调用抽象到对称的本地/远程会话协议之后（可移植性）；Mistral Vibe 在进程内顺序运行子 Agent（简单性）；Hermes 取工具集交集并默认把递归列入黑名单（遏制）。Hadfield 等人 [17] 把 orchestrator-worker 描述为「涉及重度并行化、信息超出单一上下文窗口、并需对接众多复杂工具的有价值任务」的自然模式——这也恰是对长程编码会话的贴切描述。

### 11.11 编排管线：Claude Code 与 Codex 对比

Claude Code 与 Codex 是两个占主导的商业编码 Agent，各自代表其厂商生态中的最先进水平。二者从用户请求到任务完成的端到端编排管线，采取了非常不同的设计立场。表 18 突出了关键分歧。

该表揭示出两种自洽的哲学，且二者差距在我们两次快照之间可测量地缩小了。Claude Code 是「组合式-规定性」的：它强制结构化阶段（Research → Synthesis → Implementation → Verification），经工具白名单限制子 Agent 能力，递归组合 Agent，并围绕提示词缓存经济学激进优化。Codex 曾是「沙箱式-涌现性」的——安全在 OS 层保证，工作流组织交给模型——但它也长出了自己的规定性结构：带 Plan 预设的面向用户协作模式选择器、声明式子 Agent 角色、深度跟踪的生成控制，以及一个映照 Claude Code 中间权限层的 Guardian 分类器；与此同时，Claude Code 的 Hook 词汇与插件格式已成为 Codex 的接口（14.5 节）。二者在真实世界基准上都产出强劲结果；残留的哲学差异在于安全在哪里得到保证（OS 强制 vs. 分层复核），而非工作流如何组织。

---

## 12 扩展机制

语料中的每个系统都提供扩展点，只是所用的机制颇为不同。

### 12.1 插件架构

OpenClaw 提供了语料中最成熟的插件架构——而且自 2026 年春季发布起，它还是外置化的：官方 provider 与 channel 插件已切换为带 manifest-first 元数据的独立一等 npm 包，把模型目录与路由表移出了核心。插件由清单驱动（`openclaw.plugin.json`），在工作区目录中发现，经 jiti 动态加载，并通过类型化的 SDK 契约注册：

- Channel 插件：实现 ChannelEntry（receive、send、status、configure）。
- Provider 插件：实现 ProviderEntry（推理流）。
- Skill 插件：经能力系统注册。

系统强制执行严格的导入边界：扩展的生产代码只允许导入公开的 plugin-SDK 表面与本地 API barrel；直接导入 `src/**` 被禁止。

不过，在清单驱动插件阵营里，OpenClaw 已不再独行者。在我们两次快照之间，Codex 的插件架构大幅扩张：市场添加管线（GitHub、git、本地路径、URL）、可由模型调用的会话内审批工具（`request_plugin_install`）、`.claude-plugin` 格式兼容以及工作区级共享，加入了本已存在的插件管理器；插件贡献工具、skills 与生命周期 hooks。

OpenHands 的插件系统把这种趋同摆到了明面上：其插件捆绑 skills、hooks、MCP 配置、agents 与命令，其清单加载器接受带有 `plugin.json` 的 `[".plugin", ".claude-plugin"]` 目录——它刻意读取 Claude Code 的插件格式，是语料中最清晰的「经由采用达成的互操作」案例。

Claude Code 自身经一套 JSON/Zod schema 支持内置、自定义与插件三类来源的 MCP 服务器（用于外部工具）、skills（用于专用工作流）与 agent 定义（用于自定义 agent 类型）（11.2 节）。

Pi 把整个问题重新安置：扩展是运行时加载的 TypeScript 模块，面向一个约含 33 个类型化事件的 API，覆盖会话生命周期、工具拦截（阻断与就地参数改写）、整段上下文重写，以及——少见地——对 provider 原始 I/O 动手术（`before_provider_request`、`after_provider_response`）；仓库自带 78 个示例，逐项对照即是其他 harness（驾驭层）的内置功能，多数只有 1–16 KB，经包管理器分发（`pi install npm:…|git:…`）。

OpenCode 的插件是返回约 20 个类型化 hooks 的异步函数（`chat.params`、`tool.execute.before/after`、`tool.definition` 重写、多步 OAuth 认证流），为获得确定性而按顺序执行；自定义工具根本无需插件——任何 `.opencode/tool/*.ts` 的导出都会成为一个工具。

**Gemini CLI：扩展 + 斜杠命令 + 早期 MCP 采用。**

Gemini CLI 提供显式的 ExtensionLoader 接口，由 GeminiCLIExtension 类型支撑。扩展可以贡献自定义工具（通常经 MCP）、斜杠命令、hooks、skills 与 GEMINI.md 片段，并从 `~/.gemini/extensions/` 目录中发现。Gemini CLI 是 MCP 的早期采用者，对 stdio 派生的本地服务器、SSE 连接与 Streamable HTTP 传输提供一等实现，并内置认证 provider（`google-credentials`、OAuth）。其 MCP 支持超出工具，延伸到 prompts 与 resources（更完整的 MCP 规范），这是多数其他系统的适配器所省略的。斜杠命令（`/agent`、`/mcp`、`/skill`、`/memory`、`/help`）本身也可经 skill 元数据扩展，允许扩展注册新命令。

**Mistral Vibe：Skills、MCP、自定义工具、Agents 与 Hooks。**

Mistral Vibe 的扩展面已增长到五条正交轴。Skills 遵循 agentskills.io 规范 [43]：每个 skill 是一个目录，内含带 YAML frontmatter 的 SKILL.md，从 `.agents/skills/`、`.vibe/skills/`、`~/.vibe/skills/`、`~/.agents/skills/` 及任何用户配置的路径发现——如今还补充了内置 skills（包括一个向 harness 自我记录文档的「自我认知」skill）与一个从托管目录安装带版本 skills 的远程注册表客户端。跨系统的完整对比见 12.5 节。MCP 服务器以 `[[mcp_servers]]` 块声明，支持 `http`、`streamable-http` 与 `stdio` 传输，工具以 `{server_name}_{tool_name}` 设定命名空间，权限管理与内置工具完全一致；这一层在两次快照之间成熟为一个受管集成面——由 TUI 驱动的 OAuth 登录流（`/mcp add|login|logout|status`）、一个精选的托管 Mistral「连接器」注册表，以及一个 MCP sampling 处理器，让已连接的服务器能借用 Mistral Vibe 的 LLM 后端完成自己的补全——这是语料中其他系统均未实现的反向依赖。自定义工具可经基于路径的发现（`tool_paths`）添加；自定义系统提示词放在 `~/.vibe/prompts/{prompt_id}.md`；自定义 agents 放在 `~/.vibe/agents/{agent_name}.toml`，并配有一个对基础配置做深合并（deep-merge）覆盖的机制——基础配置本身如今也是一个显式配置层栈（默认值、用户 TOML、受信任项目的 `.vibe/config.toml`、`VIBE_*` 环境变量、运行时覆盖、agent profile）的一部分。第五条轴是面向用户的生命周期 hooks：在 `hooks.toml` 中声明的 `before_tool` / `after_tool` / `post_agent_turn` shell hooks 可以拒绝一次工具调用、改写其输入或追加上下文——这是 Claude Code 的 `PreToolUse` / `PostToolUse` 在结构上的直系同类，叠加在内部中间件管线之上（而非取代它）。

### 12.2 基于协议的接口

Mini-SWE-Agent 使用 Python Protocol 实现结构化子类型：任何实现了 Model、Agent 或 Environment 协议的类都可以在无需继承的情况下被替换。这是最轻量的扩展机制：无需注册、无需清单、无需 SDK，只需符合接口。

### 12.3 配置驱动的扩展性

Aider 的模型注册表包含 350+ 个模型的逐模型元数据：编辑格式、弱模型名称、缓存控制设置、额外 API 参数、reasoning tag 处理与编辑器模型配置。这种数据驱动的方式使得无需修改代码即可支持新模型。

Codex 的分层 TOML 配置如今向上延伸到用户层之上：移动设备管理（MDM）、主机级系统与企业云端下发各层作为基础默认值进入，位于用户（`config.toml` 加命名 profile）、项目（`.codex` 目录）与会话旗标各作用域之下；与此同时，一个单独组装的需求/约束引擎（由同样的 MDM、系统与云来源供数）负责校验，并可硬性限制较低各层能设置的内容。这是语料中最面向企业治理的配置模型。

Mistral Vibe 如今镜像了这种分层做法（六层由一个带逐字段合并策略的 ConfigBuilder 合并），使显式配置层栈成为两个系统共有的模式。

OpenClaw 的配置系统是语料中最复杂的：一个经 Zod 校验、含数百个嵌套结构的 `openclaw.json`，外加一个为所有捆绑 channel 生成校验规则的大型自动生成 TypeScript 文件，旁边还有一个手工维护的 schema 帮助界面。

### 12.4 模型上下文协议（MCP）

MCP 仍是横切的扩展机制，由 Claude Code、Codex、Gemini CLI、Mistral Vibe、OpenHands、Hermes、OpenCode 与 OpenClaw 支持——11 个系统中的 8 个（编码优先的 10 个中的 7 个）。

OpenHands 经 `MCPToolAction` / `MCPToolObservation` 事件类型实现 MCP，由单一的 MCPServer 模型校验四种传输（`stdio`、`http`、`streamable-http`、`sse`），认证是一等能力，直至带令牌状态的完整 OAuth 流。

Hermes 的支持近乎完整（stdio/Streamable HTTP/SSE、resources、prompts、sampling、elicitation、OAuth；仅忽略 prompt 列表变更通知），且 Hermes 本身就是一个 MCP 服务器，与 OpenClaw 的 channel 桥比肩。

OpenCode 覆盖工具、prompts、resources 与 resource templates，支持 OAuth 动态客户端注册（sampling 与 elicitation 被显式禁用，并留下跟踪 issue 的注释）。

语料中唯一有原则的坚持者是 Pi，其文档断然拒绝 MCP——「用 README 构建 CLI 工具」——把 skills 加 shell 作为其明确阐述的线上协议替代方案。

### 12.5 Skills：正在成形的能力包标准

与 MCP 并行，语料中出现了第二种横切的扩展机制：skills。MCP 标准化的是智能体如何与一个外部工具进程对话；skills 标准化的是智能体如何把一个专业知识单元打包成一个可发现的目录（说明、可选脚本、可选工具白名单、元数据），这个目录可以放进项目或用户主目录，由智能体在发现时拾取。Mitra 等人 [80] 从训练一侧框定了同一思想：skills 是智能体流（agentic flows）中的可教授单元。十一个系统中有九个实现了某种形式的 skills 系统；只有 Aider 与 Mini-SWE-Agent 未实现（表 10）。

表 10：十一个系统的 Skills 支持情况。「规范 / 加载」列指对 agentskills.io 规范（SKILL.md + YAML frontmatter，必填 name / description）的符合程度。

| 系统 | Skills? | 发现路径 | 调用方式 | 规范 / 加载 |
| --- | --- | --- | --- | --- |
| Claude Code | ✓ | `.claude/skills/`、`~/.claude/skills/`，另在文件被编辑时按 `paths` frontmatter 门控动态发现 | SkillTool（延迟）；MCP prompts 经按 `name` 的 uniqBy 去重 | 自定义（路径门控扩展）；急切 + 按需混合 |
| Codex | ✓ | `core-skills/` 与 `skills/` 根目录；插件提供的 skill 根目录 | `skills/list` app-server RPC + TUI `$` 提及；隐式调用检测 | 自定义 Rust；元数据在随上下文规模伸缩的 token 预算内急切加载，正文在 `$` 提及或检测到调用时注入；skills 声明 MCP/env 依赖，由 Codex 自动安装 |
| Gemini CLI | ✓ | `~/.gemini/skills/`、`.gemini/skills/`、`.agents/skills/`，另含内置 skills（`skill-creator`、`antigravity-support`）；优先级为工作区 > 用户 > 内置 | ActivateSkill 工具把 skill 包入 XML 并附 available_resources 树；权限确认 UI | 与 agentskills.io 对齐，带 `isBuiltin` 扩展；启动时急切遍历；安装经路径穿越加固 |
| Mistral Vibe | ✓ | `.agents/skills/`、`.vibe/skills/`、`~/.vibe/skills/`、`~/.agents/skills/`、用户 `skill_paths`；项目发现受信任门控 | `skill` 工具（延迟）；用户 `/skill-name` 调用物化为合成工具调用 | 完全符合 agentskills.io；远程注册表客户端（带版本目录）；内置「自我认知」skill |
| OpenHands | ✓ | `{workdir,git-root}/.agents/skills/`、`.openhands/skills/`（+遗留 microagents）；用户侧等价路径 + 托管安装 | 元数据置于 `<available_skills>`；正文按需经内置 `invoke_skill` 工具取用 | agentskills.io 标志；渐进式披露；文件触碰时的 PathTrigger 规则；服务端 CRUD/同步/市场 API；把 AGENTS.md/.cursorrules 吸收为作用域规则 |
| Hermes | ✓ | `~/.hermes/skills/`（由 72 个捆绑 skill 播种；Skills Hub 另可安装 102 个官方 skill）+ 只读 `external_dirs` | 三层渐进披露：提示词内索引 → `skill_view` → 链接资产；skills 兼作斜杠命令 | 兼容 agentskills.io；信任分级的 Skills Hub（builtin/trusted/community），带预安装扫描与隔离；经 `skill_manage` 自我创作 |
| Pi | ✓ | `~/.pi/agent/skills/`、`~/.agents/skills/`、`.pi/skills/`、`.agents/skills/`（自 cwd 至 git 根）、包、`--skill`；项目路径受信任门控 | 无专用工具：`<available_skills>` XML 索引；正文经普通 read 工具加载；`/skill:name` 展开 | agentskills.io，刻意宽松（仅警告，仍加载）；`disable-model-invocation` 门控 |
| OpenCode | ✓ | 配置目录下的 `{skill,skills}/**/SKILL.md`、`~/.claude/skills`、`.claude/`、`.agents/` 向上遍历、额外路径、远程 URL 注册表（带版本的 `index.json` 缓存） | 原生 skill 工具（延迟：目录仅列出 name+description） | agentskills.io 字段集；逐 skill 权限门控 |
| OpenClaw | ✓ | `~/.openclaw/skills/`、`.agents/skills/`、插件提供、`skills.load.extraDirs` 配置 | 以 XML 注入系统提示词；`/skills` 斜杠命令列出可用项 | 兼容 agentskills.io；经 `metadata.openclaw.requires`（`bins`、`env`、OS）门控；受治理安装（Skill Workshop 审批流、来源经核验的 ClawHub） |
| Aider | ✗ | — | — | — |
| Mini-SWE-Agent | ✗ | — | — | — |

**在 SKILL.md 格式与 `.agents/skills/` 路径上的趋同。**

这一格式在九个采用者中基本通用：一个以 skill 命名的目录，内含带 YAML frontmatter 的 SKILL.md 文件（至少有 `name` 与 `description`，常带 `paths`、`requires` 或 `user-invocable` 等可选字段）。`.agents/skills/` 这一 agentskills.io 的规范位置作为发现路径被六个系统接受（Mistral Vibe、Gemini CLI、OpenClaw、OpenHands、Pi、OpenCode），各厂商专属的家目录（`~/.claude/skills/`、`~/.gemini/skills/`、`~/.vibe/skills/`、`~/.hermes/skills/`、`~/.pi/agent/skills/`、`~/.openclaw/skills/`）与项目本地等价路径并存。最锋利的互操作数据点：OpenCode 刻意搜索竞争对手的家目录——其发现列表包含 `~/.claude/skills` 与 `.claude/` 目录，因此为 Claude Code 安装的 skills 无需修改即可在 OpenCode 中工作。

**Skills 与 MCP：平局已破。**

MCP 与 skills 作用于不同的层。MCP 是一种线上协议，供智能体与一个单独运行的进程对话，后者暴露工具、prompts 与 resources；skills 是一种文件系统约定，用于打包智能体直接读取的「说明 + 脚本」包。二者可以组合：Claude Code 的 skill 注册表对看似 skills 的 MCP 供给 prompts 去重，Mistral Vibe 则反向组合，让 MCP 服务器经 sampling 借用它的 LLM，而 skills 来自托管注册表。4 月时两项标准在采用率上以 6/8 打平；扩充后的 7 月语料打破了平局，倒向 skills 一侧——skills 9/11、MCP 8/11——因为 Pi 实现了 agentskills.io 却断然拒绝 MCP。「Skills 取代 MCP」如今是一种被明确阐述的立场，而非共存。

**延迟加载成为主导模式。**

与 Claude Code 的延迟工具加载（8.3 节）相呼应，九个采用者中有八个如今只急切加载 skill 元数据，正文按需获取——或经专用工具（SkillTool、ActivateSkill、`skill`、OpenHands 的 `invoke_skill`），或经 `$` 提及与隐式调用检测（Codex），或经三层披露链（Hermes），或者最简地，经普通 read 工具对着 XML 索引取（Pi）。4 月时还是急切离群点的 OpenHands 随 V1 SDK 转向了渐进式披露；OpenClaw 仍是唯一的急切加载者，以资格门控作为补偿，使不合格的 skill 永远到不了提示词。

**门控与条件激活。**

架构上最有趣的变体是条件激活。OpenClaw 的 skills 声明运行时要求（PATH 上的二进制、环境变量、OS 家族）并在加载时过滤，防止「如何使用 kubectl」在没有它的机器上污染提示词。Claude Code 的 `paths` frontmatter 在模型触碰匹配文件（经 Read、Edit 或 Write 工具）时激活 skill；OpenHands 如今以文件触碰时注入的 PathTrigger 规则实现了同一思想——把 skills 与 [19] 的 JIT 上下文哲学联姻。这是对 MCP 的结构性超越：MCP 对每个已连接服务器一视同仁，无论其工具与当前任务是否相关。

**Skills 长出供应链——也长出了作者。**

分发在一个季度内走向专业化。远程注册表现在存在于四个系统中（Mistral Vibe 的托管目录客户端、OpenCode 的带版本索引缓存的 URL 注册表、Hermes 的 Skills Hub、OpenHands 的市场 API），而分发带来了供应链安全：Hermes 施行信任分级、安装前静态扫描、隔离与依赖检查；OpenClaw 让安装经过带来源核验的审批工作流；Gemini CLI 对 skill 安装做了路径穿越加固；Codex 自动安装 skill 声明的 MCP 服务器依赖（可选先经提示确认）。更引人注目的是，skills 已拥有非人类作者：Hermes 的后台审查 agent 从已完成的任务创建并修补 skills（由一位策展者维护合集），Gemini CLI 的抽取子 agent 把会话挖掘成 skill 补丁供收件箱审阅。能力包层正在以惊人速度获得包管理器经济学——注册表、来源证明，以及如今自动生成的包。

**观察 8.** Skills 已超越 MCP，成为语料中采用最广的扩展标准：9/11 个系统实现 SKILL.md 包（只有 Aider 与 Mini-SWE-Agent 缺席），MCP 为 8/11，4 月的平局被 Pi 明确的「要 skills、不要 MCP」立场打破。三个二阶发展标志着这一层的成熟：延迟加载已成为近乎普遍的策略（9 个采用者中的 8 个）；条件激活（Claude Code 的 `paths`、OpenHands 的 PathTrigger、OpenClaw 的 `requires`）把 JIT 上下文工程推进到扩展层；供应链已然浮现——四个系统有托管注册表、Hermes 有信任分级与隔离、OpenClaw 有来源核验——并伴随首批由 agent 创作的 skills（Hermes 的自改进循环、Gemini CLI 的抽取收件箱）。

## 13 横切观察与启示

### 13.1 架构模式目录

表 11 与表 12 编录了在十一个系统中识别出的 29 个反复出现的设计模式：4 月版的 17 个（成员已更新），加上由扩充语料贡献或使之定型的 12 个。

表 11：29 个反复出现的架构模式编录（1/2）：4 月版的 17 个，成员更新至 2026 年 7 月。

| 模式 | 描述 | 使用者 |
| --- | --- | --- |
| 事件溯源（Event Sourcing） | 动作/观察追加到持久化事件日志 | OpenHands、Pi（会话日志即树）、OpenCode（日志即队列；v2 表） |
| 策略即代码（Policy-as-Code） | 安全规则以可执行配置表达 | Codex（Starlark，带内联校验示例）、Claude Code（hooks）、Gemini CLI（TOML 模式）、Hermes（config-as-policy + 硬性底线）、OpenCode（rulesets）、Pi（extension hooks） |
| 递归组合（Recursive Composition） | 智能体以分叉/链接的上下文生成子智能体 | Claude Code、Codex、OpenHands、OpenClaw；Hermes 中需配置开启，OpenCode 中为可选项 |
| 多态编辑（Polymorphic Edits） | 按模型感知选择编辑格式/工具集 | Aider（提示词工厂）、OpenCode（工具注册表） |
| 延迟加载（Deferred Loading） | 工具/skills 对提示词隐藏，按需发现 | Claude Code、Codex（BM25 `tool_search`）、Hermes（BM25 桥接工具），+ 8 个 skills 实现 |
| 模板方法（Template Method） | 基类定义流程，子类覆写解析/格式化 | Aider（Coder）、OpenHands（Agent） |
| 协议接口（Protocol Interfaces） | 结构化子类型/接口接缝，支撑可插拔组件 | Mini-SWE-Agent、Pi（每工具的 Operations 远程化接缝） |
| LLM 摘要（LLM Summarization） | LLM 压缩对话历史 | 9 个系统（除 Mini-SWE-Agent 外全部；Aider 为部分支持） |
| 卡滞检测（Stuck Detection） | 自动检测智能体的重复行为 | OpenHands（5 种场景）、Gemini CLI（哈希+LLM 混合）、Hermes（先警告的签名）、OpenCode（doom-loop 询问）、Mini-SWE-Agent（格式错误上限） |
| 反思循环（Reflection Loop） | 带 lint/测试反馈的内部自我纠正循环 | Aider；近亲：Gemini CLI（edit fixer）、OpenCode（LSP 反馈） |
| 提示词缓存（Prompt Caching） | 面向缓存边界的提示词结构或会话键复用 | Claude Code、Codex、OpenHands（缓存分层）、Hermes（前缀规范化）、Pi（断点+TTL）、OpenCode（方言扇出） |
| 上下文分叉（Context Forking） | 克隆父状态以隔离子智能体 | Claude Code、Codex、Hermes（共享缓存的后台分叉） |
| 中间件管线（Middleware Pipeline） | 与循环主体正交、可组合的轮次级策略 | Mistral Vibe |
| JIT 仓库上下文（JIT Repo Context） | 自动发现的分层 Markdown 上下文文件 + 按需注入 | Claude Code、Codex、Gemini CLI、Mistral Vibe、Hermes、Pi、OpenCode、OpenHands |
| Skills（能力包，capability bundles） | 带 YAML frontmatter 的 SKILL.md 目录 | 9 个系统（除 Aider、Mini-SWE-Agent 外全部） |
| 条件激活（Conditional Activation） | skills/工具按环境或文件路径门控 | Claude Code（`paths`）、OpenHands（PathTrigger）、OpenClaw（`requires`） |
| 轮次级检查点（Turn-Level Checkpoint） | 带回溯与文件还原的文件系统快照 | Mistral Vibe（每条用户消息）、OpenCode（shadow-git，每步）、Hermes（shadow-git 存储）、Pi（仅对话） |

表 12：29 个反复出现的架构模式编录（2/2）：7 月语料新增的 12 个模式。

| 模式 | 描述 | 使用者 |
| --- | --- | --- |
| 智能体维护的记忆（Agent-Maintained Memory） | 后台子智能体抽取并整合跨会话记忆 | Codex（两阶段，git 基线）；Gemini CLI 中为人工门控变体（补丁收件箱） |
| 外层验证循环（Outer Verification Loop） | 脚手架层的评判/守卫在轮次循环之外验证完成度 | OpenHands（`/goal` judge + critics）、Hermes（停止时验证） |
| 自改进 Skill 循环（Self-Improving Skill Loop） | 智能体编写、修补并策展自己的能力包 | Hermes；部分实现：Gemini CLI（skill 抽取收件箱） |
| 谱系压缩（Lineage Compaction） | 以会话轮换形式进行的压缩，带可检索的祖先链 | Hermes |
| 会话树版本控制（Session-Tree Version Control） | 只追加的条目树配可移动头指针；支持分叉/回溯/分支摘要 | Pi；OpenHands（对话树） |
| 最小内核 / 扩展宿主（Minimal-Core / Extension-Host） | 安全、沙箱、子智能体、计划模式迁移到运行时事件总线 | Pi |
| 客户端/服务器 harness（Client/Server Harness） | 内嵌 API 服务器；每个 UI（TUI、web、IDE、CI）都是客户端 | OpenCode；OpenHands（agent-server） |
| 模型族提示词矩阵（Model-Family Prompt Matrix） | 按模型族/代际分发不同的基础提示词 | Codex（服务器目录）、OpenCode（9 份提示词）、Hermes（门控块） |
| 缓存方言扇出（Cache-Dialect Fanout） | 同时发出所有提供商的缓存控制方言 | OpenCode |
| 语法感知的命令权限控制（Syntax-Aware Command Permissioning） | 命令经解析（tree-sitter），授权按参数元数限定作用域 | OpenCode；Mistral Vibe（解析校验）、Hermes（去混淆匹配） |
| 不可信内容定界（Untrusted-Content Delimiting） | 工具/网页结果以污点标记包裹并对分隔符去武装 | Hermes、OpenHands（`<UNTRUSTED_CONTENT>`） |
| harness 模仿（Harness Mimicry） | 客户端呈现第一方 harness 的身份（请求头、提示词开头、工具名大小写），以搭乘其订阅制 OAuth 后端 | Pi（Anthropic OAuth 上的 Claude Code 身份；ChatGPT 套餐的 Codex 后端） |

### 13.2 双重缺席：没有智能体框架，没有代码 RAG

两项被更广泛的 LLM 应用文献视为任何生产级智能体之核心的技术，结果在全部十一个系统中均告缺席。[^8] 对本分析而言，缺席至少与在场同样富有信息量。

[^8]: 我们原本预期会在这些开源项目中找到至少一些 LangChain 或其他框架的使用。这种整齐划一令我们吃惊；寻找反例的工作（vendored 依赖、动态导入、经转译的 TypeScript 构建）持续了数周，我们才接受这一结果。7 月的复审在全部十二棵源码树上重复了清单与导入扫描，包括语料新增的三个系统与元 harness。

**缺席之一：智能体框架。**

每一份依赖清单都被检查，每一棵源码树都被 grep，以寻找广泛部署的智能体框架的导入：LangChain、LangGraph、LlamaIndex、AutoGen、CrewAI、Pydantic AI、Genkit、Haystack agents、Semantic Kernel、Google 的 ADK，以及若干更小的库（Smolagents、Swarm、Agno）。在约 400 万行 Python、TypeScript 与 Rust 中，没有任何生产智能体代码路径导入其中任何一个——这一结果在两个方向上都值得玩味：Gemini CLI 连 Google 自家的两个框架（Genkit、ADK）都不用；Hermes 中仅有的「LangChain」字符串位于捆绑的 skill 文档里，教智能体了解用户可能如何使用向量数据库。

两个边界情形需要精确表述。Aider 附带一个可选的、与框架沾边的扩展：其 `/help` 命令可安装 llama-index，对 aider 自身的文档运行 doc-RAG——这是可选的功能依赖，而非 agent 循环编排。而 OpenCode 把其内部的 LLM/工具管线委托给 Vercel 的 AI SDK——一个提供商抽象层，不是智能体编排框架，但它是语料中第一个内部循环管线干脆就是第三方 SDK 的系统（一个自研替代客户端藏在开关之后，暗示这一依赖是过渡性的）。

每一个循环都以宿主语言的原生原语手工打造：asyncio（OpenHands、Mistral Vibe、Hermes）、阻塞式同步 Python（Aider、Mini-SWE-Agent）、Promise/async-iterator（Claude Code、Gemini CLI、Pi、OpenCode、OpenClaw）、Tokio（Codex）。每一个工具注册表都围绕 Pydantic、Zod、TypeBox、Effect Schema 或 Rust enum 定制构建。每一个提示词模板都是纯 Markdown、Jinja2 或字符串拼接。

**缺席之二：面向代码的检索增强生成（RAG）。**

一项平行搜索覆盖了向量库依赖（Chroma、Pinecone、Weaviate、Qdrant、Milvus、FAISS、LanceDB、sqlite-vec、向量模式下的 Elasticsearch）、嵌入库，以及名称匹配 embedding、vector_store、vectordb、rag 或 retrieval 的目录或文件。就代码检索而言，结论未变，且如今覆盖十一个系统：零。所有例外都关乎对话记忆，而这里 7 月的图景确实变了：OpenClaw 的默认记忆插件（memory-core）如今运行混合的 sqlite-vec KNN + FTS5/BM25 搜索，嵌入默认开启（provider 默认 OpenAI；本地 GGUF 模型为可选项；4 月时代的 LanceDB 扩展作为可选插件存续），使 OpenClaw 成为唯一一个嵌入默认开启的系统——用于聊天召回，从不用于读取源码树。Hermes 在规模化下展示了相反的选择：其核心的既往对话搜索刻意采用词法（由触发器维护的 SQLite FTS5，BM25 加上面向 CJK 的 trigram 分词，「任何地方都不调用 LLM」），嵌入仅限于可选的记忆插件。

十一个系统以什么替代 RAG 做代码检索，汇总于表 13。

表 13：各系统替代基于向量的 RAG 所用的代码检索机制（2026 年 7 月）。

| 系统 | 是否使用嵌入 | 代码检索机制 |
| --- | --- | --- |
| OpenHands | 否 | GrepTool / GlobTool + 终端；上下文文件摄取（AGENTS.md、.cursorrules）；tree-sitter 已从 SDK 中移除 |
| Aider | 仅 `/help` 可选扩展（对 aider 自身文档做 doc-RAG） | RepoMap：tree-sitter 符号抽取，配受 token 预算约束的 PageRank 式排序 |
| Claude Code | 否 | ripgrep 关键词搜索 + BashTool + 按需文件 Read；CLAUDE.md 自动发现 |
| Codex | 否 | Rust 原生文件搜索；AGENTS.md 从仓库根到 cwd 的拼接 |
| Gemini CLI | 否 | 内置 ripgrep + glob 工具；GEMINI.md 自动发现；MEMORY.md 项目索引；JIT 子目录上下文 |
| Mistral Vibe | 否 | ripgrep + tree-sitter（bash 解析）+ 文件系统搜索；git status 注入；JIT 嵌套 AGENTS.md |
| Mini-SWE-Agent | 否 | 经 shell 工具的 grep 搜索 |
| Hermes | 仅可选的记忆插件 | ripgrep 支撑的 `search_files`；会话历史之上的 SQLite FTS5（BM25 + trigram）；LSP 仅用于写后诊断；无 repo map |
| Pi | 否 | `grep` / `find` 工具背后自动下载的 ripgrep + fd 二进制（取最新发布版；优先系统自带二进制）；祖先上溯的上下文文件；会话搜索是确定性线性扫描 |
| OpenCode | 否 | 内置 ripgrep（`grep` / `glob`，100 条结果上限）；约 25 个自动下载的 LSP 服务器提供诊断（无持久索引）；惰性附加嵌套 AGENTS.md |
| OpenClaw | 默认混合记忆搜索（sqlite-vec KNN + FTS5/BM25；默认 OpenAI 嵌入器，本地 GGUF 可选），仅用于对话记忆，绝不用于代码 | 代码检索不适用（N/A）；标准文件系统 API |

**双重缺席为何重要。**

第一项缺席印证了智能体设计者自己给出的建议。Schluntz 与 Zhang 的 Building Effective Agents [16] 提醒，框架「往往会制造额外的抽象层，遮蔽底层的提示词与响应，使其更难调试」，并建议从原始 SDK 调用起步。该建议发表于 2024 年 12 月；我们于 2026 年进行的源码审计显示，每一家商业提供商都照做了。值得指出的是，同一时期，更广泛的 Python LLM 应用社区仍在持续投入框架抽象。生产级 SWE 智能体似乎运行在与通用 LLM 应用不同的复杂度预算上。一旦智能体要改动真实源码，手工编写、可调试的代码便胜过可复用抽象，因为故障模式（静默的提示词损坏、不透明的缓存、版本不兼容的工具 schema）的代价已高到无法耸肩了事。

第二项缺席与 Rajasekaran 等人 [19]（2025 年 9 月）的最新指导一致，他们偏好「即时」（just-in-time, JIT）检索，同时推荐一种混合方案：「我们并不把整库信息背下来，而是引入文件系统、收件箱、书签之类的外部组织与索引系统，按需检索相关信息。」这篇博文并未断然否定预索引检索，但其各项实用建议都指向 JIT 方法。语料中的每个系统都遵循这一路径，尽管面向代码的仓库级检索是被充分研究过的领域：RepoCoder [60]、RepoBench [61] 与 CrossCodeEval [62] 都为代码构建检索管线，Long Code Arena [64] 提供相匹配的长上下文评测。Wang 等人的 CodeRAG-Bench [63] 提出的正是本节的问题——「检索能否增强代码生成？」——并发现收益在不同任务间高度可变：对文档查阅与库使用场景收益可观，而对模型已具备充分参数化知识的任务则收益微弱或不存在。这种收益的不一致性，或许有助于解释为何生产级 SWE 智能体干脆跳过 RAG 层，而不去投入任务相关的检索路由。原因是领域特有的。代码携带稠密的确定性结构元数据——文件路径、语言服务器、tree-sitter 解析、类型信息——语义相似度检索无法复制这些（而 RepoAgent [65] 与 Aider 的 RepoMap 这类结构感知工具直接利用了它们）。代码每分钟都在变化，预索引的嵌入几乎从构造上就是陈旧的。每个编码环境都已自带一个近乎最优的检索系统，即 ripgrep、find 与 glob。在典型的 SWE 智能体任务上，RAG 只增加运营成本（嵌入计算、向量库维护、漂移管理）而不提供边际价值。

**观察 9.** 两项被更广泛的 LLM 应用文献视为核心的技术在全部十一个系统中缺席——这一发现经受住了三倍语料扩张与为期三个月的复审。没有任何系统在智能体运行时中使用通用智能体框架（检查了 LangChain、LangGraph、AutoGen、CrewAI 及其他十余个；Gemini CLI 连 Google 自家的两个也未用）；每个循环都以宿主语言的异步原语手工编写，OpenCode 用提供商抽象 SDK 做内部管线是最接近的边界情形。没有任何系统使用向量嵌入 RAG 做代码检索；全部依赖 ripgrep、tree-sitter、glob 与自动发现的 Markdown 上下文文件，而在需要对话规模召回之处，生产答案是词法搜索（Hermes 的 SQLite FTS5），或者恰好在一个默认配置中（OpenClaw），对聊天历史——而非源码树——使用混合嵌入。生产级 harness 的复杂度预算不同于通用 LLM 应用：当故障模式是改动真实代码时，可调试性与提示词透明度胜过框架复用。14.2 节为这一缺席给出历史性的解答。

**观察 10.** Anthropic 的 Effective Agents 工程系列（2024 年 12 月至 2025 年 9 月）所描述的架构模式，与四个提供商原生系统的架构高度吻合，而这些系统是彼此独立构建的。这究竟反映了共同的经验现实、公开指南的影响，还是二者兼有，是一个开放问题。

### 13.3 智能体间协议：对外采用，对内进程内

双重缺席关乎两项根本不出现在语料中的技术。智能体间协议（ACP、A2A）则呈现又一种模式——而且这是两次快照之间变动最大的维度。ACP 如今作为一等的生产依赖或实现，出现在十一个系统中的六个里：Mistral Vibe（`agent-client-protocol==0.10.1`，经该协议暴露会话分叉、工作区信任与 rewind）、OpenClaw（网关翻译器）、OpenCode（`opencode acp` 经 stdio 提供 agent 侧服务）、Hermes（ACP 适配器与注册表模块）、OpenHands（一个 ACPAgent 类，下文讨论）与 Gemini CLI（其 A2A 模块是承担网格角色的另一套协议）。语料之外，xAI 的 Grok Build 发布首日即带文档化的 ACP 服务器模式（3.7 节；厂商文档记载，未经源码验证）。语料内的这些采用无一属于实验性质。

有趣的是它的摆放位置——ACP 如今占据三种彼此有别的架构角色：

1. 编辑器 ↔ 智能体（向外服务端）。ACP 的 LSP 角色 [41]：Zed、JetBrains 及其他 IDE 像驱动语言服务器那样驱动本地智能体。Mistral Vibe、OpenCode、Hermes、OpenClaw 与 Grok Build 都服务于这一边界。
2. 智能体即后端（向内宿主）。4 月时无人担任的角色：OpenHands 的 ACPAgent 把自己的 `step()` 委托给外部 ACP 服务器，附有指向固定版本 `claude-agent-acp`、`codex-acp` 与 `gemini --acp` 二进制的 provider 元数据——对手 harness 成了 OpenHands 对话内可互换的大脑。14.4 节的元 harness 以同样方式驱动其 Goose 与 Qwen 适配器（并在驱动 Kiro 的 TUI 时接入其 ACP 权限流），Hermes 则把一个 ACP 智能体当作模型传输层来消费（GitHub Copilot 的 CLI 作为聊天后端）。为编辑器而造的协议，结果成了托管的接口。
3. 跨厂商网格（A2A [42]）。在语料中仍是 Gemini CLI 独有：远程编排器把本地 Gemini CLI 作为多厂商拓扑中的一个节点来驱动，如今线路上还传带用量元数据。

表 14 列出每个多智能体系统在主智能体与其自身子智能体之间使用的通信机制，以及各自的协议角色。

表 14：主智能体 ↔ 子智能体通信与协议布局（2026 年 7 月）。

| 系统 | 主 ↔ 子智能体通信 | 协议角色 | 子智能体是否跨进程？ |
| --- | --- | --- | --- |
| Claude Code | AgentTool 函数调用 + 上下文分叉 + XML 通知 | 智能体层无（ACP 由单独的适配器二进制提供服务） | 否 |
| Codex | 带邮箱阶段（mailbox phases）的会话输入队列；类型化记录 | 智能体层无（`codex-acp` 适配器在进程外） | 否 |
| Gemini CLI | `invoke_agent`，位于本地/远程会话协议之后 | A2A 服务器（网格角色） | 否（内部） |
| Mistral Vibe | `task` 工具，进程内 asyncio | ACP 服务器（编辑器角色；经协议提供 rewind） | 否 |
| OpenHands | Task/delegate 工具，并发线程 | ACP 客户端/宿主：对手 harness 充当 `step()` 后端 | 否（自身子智能体） |
| Hermes | 进程内线程分叉；swarm 经由 SQLite 黑板的子进程 | ACP 服务器（面向编辑器）与客户端（以 Copilot CLI 为模型后端） | swarm：是（数据库，而非协议） |
| Pi | 扩展派生 OS 进程，stdio 上的 JSONL | 用于嵌入的专有 JSONL RPC（约 30 个命令）；设计上不含 ACP/A2A/MCP | 是（扩展；JSONL，而非 ACP） |
| OpenCode | `task` 工具，进程内子会话 | ACP 服务器（agent 侧，stdio ndjson） | 否 |
| OpenClaw | 经 RPC 派生 ACP 会话（子进程） | 同一 ACP，既向内也向外 | 是 |

4 月版「向内/向外」的划分以更精致的形式存续。就协调自身子智能体而言，九个多智能体系统中的八个仍使用进程内原语，或在跨进程时使用标准协议之外的东西：Pi 的扩展派生操着朴素 JSONL 的 OS 进程，Hermes 的 swarm 经 SQLite 黑板协调。变化在于对整只 harness 的向内消费：把对手智能体托管为可替换后端——OpenHands 的 ACP 托管、Hermes 的「ACP 即模型传输」、元 harness 的适配器舰队——是 4 月尚不存在的生产模式，而 ACP 是其通用语。Pi 补上最后一笔细微差别：它拒绝标准协议，却为同样的嵌入角色发明了专有的向外 RPC——这证明即便标准被拒之门外，向外的协议压力也是真实存在的。

**观察 11.** 智能体间协议的布局已从两角色故事（向外：编辑器集成与网格；向内：没有）演化为三角色故事。ACP 已随十一个系统中的六个出货，如今承担：(1) 其设计初衷的编辑器 ↔ 智能体边界；(2) 协议设计简报之外的角色——harness 托管，OpenHands 由此把 Claude Code、Codex 或 Gemini CLI 当作可互换的 `step()` 后端运行，Hermes 则把一个 ACP 智能体当作模型传输层来消费；(3) 经由 A2A——目前仍仅 Gemini CLI——的跨厂商网格。对 harness 自身的子智能体而言，九个多智能体系统中的八个仍使用进程内原语，或在跨进程时使用标准协议之外的东西（Pi 的 JSONL 扩展、Hermes 的 SQLite 黑板 swarm）；OpenClaw 的 ACP 派生是唯一经标准协议路由子智能体协调的案例。给从业者的建议随之更明确：构建一个 ACP 服务器（它现在能同时为你带来编辑器、宿主与元编排器）；把子智能体留在进程内；并把 A2A 视为对跨厂商网格的押注——其规模化需求尚未得到验证。

### 13.4 权衡框架

我们将五条基本权衡轴形式化：

**轴 1：简单性 vs. 能力。**

据报道，Mini-SWE-Agent 的极简脚手架在 SWE-Bench Verified 上取得 74%+，而代码库大得多的 Codex 报告为 69.1%。这些数字不可直接比较（底层模型不同、评测运行不同、部署配置不同：Mini-SWE-Agent 无沙箱而 Codex 有沙箱），我们不据此得出正面对比的结论。这一差距在定性上说明的是：Codex 多出的代码并未投入原始的任务完成逻辑，而是有相当大的份额用于安全（跨平台沙箱）、用户体验（TUI、流式）、扩展性（MCP、插件）与健壮性。在条件匹配的情况下，生产级脚手架能否在同一基准上产生可度量的提升，是一个本研究不予回答的开放问题（关于效度威胁，见第 15 节）。

**轴 2：安全 vs. 自主。**

拥有更多安全基础设施的系统（Codex、Claude Code）对智能体动作施加更多摩擦。安全较少的系统（Mini-SWE-Agent、Aider）执行更快，但若无额外防护则不适合企业部署。

**轴 3：提供商耦合 vs. 不可知性。**

Claude Code 与 Codex 利用提供商特有功能（提示词缓存、extended thinking、面向特定模型的提示词），代价是厂商锁定。基于 LiteLLM 的系统为提供商灵活性牺牲这些优化。

**轴 4：单体 vs. 模块化。**

Codex 的 126 个 crate、百万行规模的 Rust 工作区为类型安全与性能而优化。Mini-SWE-Agent 的单文件智能体最大化可理解性。Pi 把整条轴移进运行时组合：极简核心加扩展事件总线。OpenClaw 的插件 SDK 与 OpenCode 的客户端/服务器拆分，分别成就了可扩展性与可嵌入性。这条谱系上的每个点位服务于不同的用户群体。

**轴 5：脚手架复杂度 vs. 模型能力。**

这是最具哲学趣味的一条轴。Mini-SWE-Agent 有竞争力的基准成绩表明，当前模型已有足够能力在极简脚手架下取得成功。生产系统在脚手架上投入，不是因为模型完成任务需要它，而是因为用户需要它来获得安全、可靠性与工作流集成。

---

## 14 平台化转向

前几节把 harness（驾驭层）当作一件人工制品来剖析。本节要论证的是：这件人工制品已经改变了范畴——在 2025 年至 2026 年年中之间，编码智能体 harness 完成了一次从工具到平台的转向——成为一个拥有自身扩展生态、包经济学、治理层与切换成本的运行时，而且自 2026 年 6 月起，还拥有了自己的元层（meta-layer）。本研究的四月版曾以「CLI 即框架假说」的名义提出了这一论断的谨慎版本。此后积累的证据——在语料库自身的源码树里、在厂商 SDK 里、在市场里——使我们得以把它作为一个论题来陈述。

### 14.1 从假说到论题：CLI 即框架

对 LangChain、AutoGen 等框架缺席的标准解读（Observation 13.2）是：生产级 harness 不需要框架。但还有第二种解读：它们不需要框架，是因为 harness 本身就是框架——它是开发者交付软件所经由的默认编排层，而不只是他们查询的一个工具。

想一想一个框架传统上提供什么：一个循环、一个工具注册表、一个记忆层、一个配置面、一个扩展机制。本研究所考察的每一个生产系统中，上述每一项都存在。Claude Code 提供流式 ReAct 循环、43 个注册工具、基于压缩的记忆管理器、由 CLAUDE.md 驱动的配置、用于集成的 MCP 与用于能力包的 Skills——而 Codex、Gemini CLI、Mistral Vibe、Hermes 与 OpenCode 也都如此，各自以自己的习语实现（Pi 匹配除 MCP 之外的每一个要素——它明确拒绝 MCP，转而采用 CLI 工具加其扩展总线）。区别在于，这个「框架」不是开发者导入自己代码中的库，而是开发者在其内部工作的运行时。开发者的「程序」是一个自然语言任务加上一棵 Markdown 文件树（CLAUDE.md、AGENTS.md、GEMINI.md、SKILL.md），它们配置智能体的行为、工具访问与领域知识。「API」是文件系统、终端与 git。

来自语料库的四个趋同信号支持这一解读。

**信号 1：Skills 作为声明式程序。**十一个系统中有九个实现了 Skills（Observation 12.5）：包含一个带有指令、可选脚本与元数据的 SKILL.md 的目录。一个 skill 在功能上就是为 LLM 运行时而非 CPU 运行时编写的程序。它声明智能体应该做什么（SKILL.md 正文）、何时激活（Claude Code 的 `paths` frontmatter、OpenHands 的 `PathTrigger` 规则、OpenClaw 的 `requires`），以及可以使用哪些工具。这是传统框架中插件的结构性类似物，只不过编程语言是英语加 YAML frontmatter——而且这一层现在有了注册表、供应链安全与智能体作者（第 12.5 节）。

**信号 2：Hooks 与事件总线作为扩展基座。**四月时，面向用户的生命周期 hook 还是 Claude Code 的独有特性。到七月，它们已成为占主导地位的扩展基座——十一个系统中有九个，只有 Aider 与 Mini-SWE-Agent 弃权：Codex 提供的 hook 事件名与 Claude Code 的逐字相同；OpenHands 把 `pre_tool_use` / `post_tool_use` / `stop` hook 接入 `Agent.step()`，并允许一个智能体充当 hook 处理器；Mistral Vibe 在其内部中间件管线之外增加了 `hooks.toml` shell hook（拒绝、重写输入、追加上下文）；Gemini CLI 向扩展暴露十一个循环生命周期事件；Pi 本身就是事件总线，拥有约 33 个类型化事件，横跨工具拦截到原始 provider I/O；OpenCode 的插件是返回二十个类型化 hook 的函数。这与 Web 框架和构建系统沿用数十年的扩展模型相同，只是应用到了 LLM 执行循环上。开发者不是在为智能体编写；他们是在智能体内部编写。

**信号 3：工具与工作流之间边界的消失。**在传统开发工作流中，开发者写代码、跑测试、读日志、提交、开 PR，这些都是离散步骤。在 harness 工作流中，这些步骤通过自然语言指令委派给智能体，并经由智能体的工具系统执行。智能体循环就是工作流引擎：Claude Code 的协调器阶段、Codex 的 `update_plan` 工具与 `/goal` 工作流、OpenHands 经裁判（judge）审计的目标循环。当开发者输入一个任务，智能体便派生子智能体、分派工具、管理上下文并产出结果——此时 CLI 已经吞并了构建系统、任务运行器与 IDE 的角色。

**信号 4：harness 作为服务面。**四月之后最清晰的信号：harness 现在提供的是平台的接口。OpenCode 内嵌一个发布 OpenAPI 规范与生成式 SDK 的 HTTP 服务器，每一个 UI——TUI、桌面、Web、IDE 插件、CI action——都是它的客户端。OpenHands 通过 OpenAI 兼容网关暴露会话，因此任何能调用 chat-completions 端点的工具都能驱动一个智能体：智能体即模型。Mistral Vibe 把本地会话传送（teleport）到托管运行时；Claude Code 将其 SDK 与托管的 Managed Agents API 配对。一个拥有客户端、SDK 与托管层的运行时，不是带生态的工具；它是带分发的平台。

### 14.2 harness–框架合流

如果 harness 就是框架，这两类人工制品就应当合流——而在 2026 年，它们正在合流，从两个方向都清晰可见（表 15）。

表 15：harness–框架合流（2026 年 7 月）：具名、带版本、可安装的人工制品。

| 方向 | 人工制品 | 说明 |
|---|---|---|
| harness → 框架 | Claude Agent SDK [38] | 「Claude Code 即库」：同样的工具、循环、上下文管理、hooks 与子智能体，可在 Python/TypeScript 中导入；外加托管的 Managed Agents API |
| harness → 框架 | openai-codex SDK | `pip install openai-codex`：启动 Codex 线程、运行轮次、流式传输进度、控制工作区访问；Python/TypeScript，随 Codex 仓库一同发布 |
| harness → 框架 | OpenHands agent SDK | V1 重构即是一次 SDK 化：智能体变为 `openhands-sdk` / `openhands-tools` 包，外加一个 agent server |
| harness → 框架 | Pi packages / OpenCode SDK | `pi-agent-core` 可导入 + RPC 模式；在内嵌服务器之上生成 `@opencode-ai/sdk` |
| 框架 → harness | Deep Agents [37] | LangChain 构建在 LangGraph 之上的 harness：todo 规划、带权限的虚拟文件系统、子智能体、带渐进式披露的 SKILL.md skills、AGENTS.md 记忆 |
| 框架 → harness | Pydantic AI Harness [39] | pydantic-ai 的「电池」：可组合的能力（文件系统、Rust 沙箱化解释器中的 code mode），把一个框架智能体变成编码智能体 |
| 框架 → harness | Strands harness-sdk [40] | 以仓库名呈现的合流：一个框架组织把「智能体 harness 本身」作为 SDK 发布 |

两个方向都汇聚到同一种人工制品形态——循环 + 工具 + skills + 子智能体 + hooks + MCP + 会话——无论起点是终端产品还是编排库。这种趋同本身就是一种验证：当 LangChain——Observation 13.2 记录了它在每一个 harness 运行时中缺席的那个框架——最终构建出一个 harness 时，它独立采用了语料库的惯例（SKILL.md 渐进式披露、AGENTS.md 记忆、子智能体派生、todo 规划）。而下一小节的元 harness 则从上方补全了这幅图景：其基线安装把 `claude-agent-sdk` 与 `openai-agents` 作为生产依赖导入——2026 年一个编排层所依赖的「框架」，正是这些 harness SDK。2025 年代框架的双重缺席由此获得历史性的解决：harness 没有采纳那些框架；它们取代了框架，自身变得可导入，并把「我该用哪个智能体框架？」的问题变成了「你已经在运行哪个 harness？」

### 14.3 平台经济学：市场、切换成本、治理

九十天窗口期内的三项发展，是教科书式的平台经济学。

**市场。**Codex 长出了一个插件市场（GitHub/git/URL 来源、对话内安装审批、工作区共享）；四个系统中出现了 skills 注册表，带有信任层级、来源（provenance）验证与隔离（第 12.5 节）；OpenClaw 把其官方插件外置到了 npm。能力分发如今拥有了应用商店式的机制——也包括应用商店的安全病理，SkillProbe 对已发布 skills 的审计即为例证 [89]。

**切换成本。**Codex 为 Claude Code 的磁盘状态提供了一流的导入器：它检测 `~/.claude/projects` 的会话 JSONL 文件，把它们转换为一个导入账本（import ledger）之下的 Codex rollout 条目，并主动提出把 `~/.claude/settings.json` 翻译成 `~/.codex/config.toml`。厂商为彼此的会话存储编写导入器，标志着平台竞争已进入「用户数据成为护城河」的阶段——而反向力量同样清晰可见：OpenCode 读取 Claude Code 的 skills 目录，OpenHands 读取 Claude Code 的插件清单并直接托管竞争对手的 harness，而元 harness 则把每一家厂商的锁定机制套利进自己的适配器面。

**企业治理。**Codex 的配置栈如今延伸到用户之上——MDM 管理的偏好设置、主机级系统文件与企业云端下发的捆绑包，既喂给基础默认值，也喂给一个可以硬性限制用户与项目作用域所能设定内容的约束引擎。与此同时，Google 宣布 Gemini CLI 将过渡为以 Antigravity 为品牌的 CLI——闭源，而 Gemini CLI 本身是 Apache-2.0（第 3.7 节）——并撤回了其消费者免费层；SpaceX–xAI 合并加上宣布的 600 亿美元 Cursor 收购案（截至 2026 年 7 月仍待定）则把 harness 层定价在了收购级别。治理层、设门槛的分级与收购级定价是平台的签名，而不是独立工具的签名。

### 14.4 元 harness 层

Omnigent [25] 不是第十二个 harness；它是一场赌注：harness 已经成为商品化组件，持久的价值在其上一层。Databricks 于 2026 年 6 月将其开源（Apache 2.0，总计约 100 万行，其中约 31.2 万行生产级 Python）：一个四层进程拓扑（server ⇄ host 守护进程 ⇄ runner ⇄ 每会话 harness 子进程），其适配器边界按明确设计是 Omnigent 自身公共 REST API 的递归子集。它的注册表提供 23 个规范 harness 适配器（外加 16 个别名与一个社区入口点组），覆盖 Claude Code、Codex、Cursor、OpenCode、Hermes、Pi、Goose、Qwen、Kimi、Kiro、Copilot 与 Antigravity，并被形式化为五种集成模式（`sdk-in-process`、`cli-subprocess`、`acp-subprocess`、`native-tui`、`native-server`）——且所声明的能力会对照一套一致性基准（conformance bench）进行核对（探测基本轮次、工具调用、流式传输、中断、模型覆盖、策略拒绝），四个旗舰 SDK 适配器已落地实时验证，其余为尽力而为的声明。harness 像硬件一样被测试。

在这条边界之上，元层增加了任何单一 harness 都不提供的四样东西。

**组合（Composition）**：注册表中的任何 harness 都可以作为任何其他 harness 的子智能体会话被寻址，因此一个 Claude 大脑的编排器可以把工作派给 Codex，再让 Cursor 评审它。

**跨 harness 策略（Cross-harness policy）**：一个三层的策略平面（session → agent → admin；六个阶段；CEL (Common Expression Language)、Python 或 LLM 分类器评估器；跨会话的每用户预算），通过每家厂商自己的扩展机制在异构 harness 上强制执行——Claude Code hooks、Cursor hooks、Hermes hooks、ACP 权限请求——并带有 fail-closed 语义。Observation 7.1 的那些锁定机制，从上一层看就成了一块适配器面。

**统一的沙箱与出口（egress）栈**：Linux 上的 bubblewrap 加 seccomp，macOS 上生成的 Seatbelt 配置，Windows 上的 Job Objects——与语料库在 Codex 内部记录的架构相同，在元层重新实现；外加一个 L7 MITM 出口代理（自有 CA、按主机规则、默认拒绝），其中托管着一个无密钥凭证代理（secretless credential proxy）：真实令牌从不进入沙箱，合成的占位符在传输途中被兑换成凭证——Codex 也提供同样的设计（其 `network-proxy` crate），而这里把它提升到元层、覆盖所有被包裹的 harness。

**可共享会话（Shareable sessions）**：服务器持久化的对话转录，带多设备同步、ACL 授权、评审评论、fork，以及会话中途切换 harness。

同样富有信息量的是它不做什么：它不实现编辑循环、不实现仓库上下文、不实现编辑应用策略——解剖学中的 D3/D4 核心被留在界线之下——而且它不假装各 harness 是等价的：按 harness 划分的能力记录、厂商特定的 webhook 端点、一个 Claude 特有的 `todos` 字段，以及一个 Codex 独有的 goal-mode 扩展，都按设计从「公共」API 中泄漏出来。它的旗舰示例 Polly 是一个跨厂商的协调者-工作者系统：一个 Claude Code 大脑的编排器，自己不写一行代码，把工作扇出到六个厂商 harness（每个任务一个 git worktree），并在其编排器提示词中强制跨厂商评审——评审者必须来自与实现者不同的厂商（机制层护栏约束的是扇出与爆炸半径，而非厂商身份）。连它的克制也有信息量：沙箱化被有意地不一致应用（它用自己的沙箱 exec 包裹 Claude CLI，但对 Codex 则委托其原生沙箱模式），这是 OS 级隔离抗拒被析取为共享服务的证据。而双重缺席在元层同样成立：一百万行代码中没有智能体框架、没有 RAG——除非把它的两个基线依赖 `claude-agent-sdk` 与 `openai-agents` 算在内，而这恰恰是第 14.2 节的论点。

### 14.5 harness 演化的九十天

由于四月版的八个系统是被重新钉定（re-pinned）而非替换，语料库包含了一个受控的纵向样本：同样的 harness，跨一个季度做源码 diff。四个乐章刻画了这个窗口。

**趋同变成了模仿。**四月的趋同大多是独立再发现；七月的趋同可以追溯到出处。Codex 逐字采用了 Claude Code 的 hook 事件词汇表及其 plan 模式的人机工学；OpenHands 采用了 Claude Code 的插件清单格式、其任务工具签名及其静态/动态缓存边界；OpenCode 读取 Claude Code 的 skills 目录；Hermes 的源码注释鸣谢 OpenCode（编辑匹配器）、Codex（智能审批）、OpenClaw（编排器提示词）与 Goose（上下文提示）。跨 harness 的谱系，如今就写在代码本身里。

**模式沿语料库向下扩散。**延迟工具加载从一个系统增至三个（外加七个 skills 变体）；只读 plan 模式从两个增至全部四个 provider 原生系统；LLM 审批分类器从一个（Claude Code）增至两个（Codex 的 Guardian）；轮次级检查点从一个（Mistral Vibe）增至三个；安全感知调度器分区从一个增至两个。在这个领域，一项竞争性独特点的半衰期如今以周计。

**策略从散文中迁出。**本季度最清晰的修辞趋势（Observation 7.3）：Codex 最新的模型提示词删除了禁止提交与反镀金（gold-plating）规则，转而采用 feature flags；Mistral Vibe 删除了其「Never Commit」硬规则，把提示词重新奠基在一个七级优先级契约上，并在服务端做 A/B 测试；OpenHands 则教授提交的机制。随着模型内化规范、harness 长出治理面，行为策略正从提示词（模型读取它的地方）迁往配置（平台执行它的地方）。

**树本身以平台速度移动。**Codex 的工作区在一个季度内几乎翻倍（62.1 万 → 约 112 万行 Rust，89 → 126 个 crate）——memories、Guardian、市场插件、code mode、实时语音；Mistral Vibe 增长 77%（3.56 万 → 6.3 万行）；OpenHands 重构为 SDK，其应用仓库变成了自动化控制中心；Gemini CLI 宣布品牌转向并为免费层加设门槛；Aider——这个领域的先驱——归于社区维护，窗口期内只有 18 次提交。四月版的三条观察需要就地实质性修订——耦合二分法（Observation 7.1）、规模暗示沙箱的相关性（Observation 10.2）、协议位次故事（Observation 13.3）——每一条都被九十天前尚不存在、或我们当时看不到的证据所纠正。方法论教训可以推广：在这个领域，清单式断言（工具数量、特性格、版本钉定）以周为单位衰减，而结构性断言（循环分类学、子系统解剖、那些缺席）迄今被证明是持久的。我们在本版中相应地把两者分开了。

**Observation 12.** 编码智能体 harness 在 2026 年上半年完成了其平台转向，而转向的每一层如今在源码中可见：扩展基座（hooks、skills、插件）在所有生产系统中趋同；能力分发获得了市场、注册表、信任层级与智能体作者。厂商为彼此的磁盘状态编写导入器，并配备 MDM 级治理层；harness 变成了可导入的 SDK，而框架厂商则发布了 harness（第 14.2 节的合流）；智能体本身变成了可在 OpenAI 兼容端点之后被寻址的模型；而一个元 harness 如今在一个 API 之后编排一支由十一家厂商 harness 组成的舰队——本文研究的系统中有五个位列其中——重新实现每家的昂贵部分（沙箱、策略），套利每家的专有部分（hooks、会话存储）。这个领域的竞争单位不再是智能体循环；而是环绕它的生态系统表面。

## 15 讨论

### 15.1 Anthropic「有效智能体」系列作为实证验证

2024 年 12 月至 2025 年 9 月间，Anthropic 发布了四篇就智能体设计给出规范性指导的工程文章：Building Effective Agents [16]、Effective Context Engineering for AI Agents [19]、Writing Effective Tools for AI Agents [18]，以及案例研究 How We Built Our Multi-Agent Research System [17]。贯穿这四篇文章，一种连贯的设计哲学浮现出来：偏好手写循环而非框架抽象；偏好一小组高信号工具而非包裹一切的 API；偏好即时（just-in-time）结构检索而非预索引 RAG；偏好编排者-工作者模式而非扁平单体；对智能体的规划保持透明；以及把显式的上下文预算当作一门工程学科。

十一个独立开发的系统（其中只有 Claude Code 来自 Anthropic）与这些处方一一对应：

- 「除非必要，不要使用框架」[16]：11 个系统中有 0 个在智能体运行时中使用 LangChain、LangGraph、AutoGen、CrewAI、ADK、LlamaIndex、Pydantic AI、Genkit 或 Semantic Kernel（Observation 13.2）。
- 「ACI 与 HCI 同等重要」[16]（该概念源自此文；Aizawa 等 [18] 以实用的工具建议对其加以扩展）与「少量深思熟虑的工具」[18]：Aider 的 13 种多态编辑格式、Claude Code 的延迟工具加载、Codex 的自定义补丁格式、Hermes 的九策略编辑链、OpenCode 的模型条件工具面，全都是重度的 ACI 投资（Observation 8.4）。
- 「即时检索优于 RAG」[19]：11 个系统中有 0 个对代码使用向量嵌入；全部使用 `grep`、tree-sitter、glob 与文件系统，外加自动发现的 Markdown 上下文文件（Observation 13.2）。
- 「对可并行、跨上下文的任务采用编排者-工作者」[17]：出现在 Claude Code（递归组合）、Codex（扇出式线程树）、Gemini CLI（registry + 会话协议）、Mistral Vibe（`task` 工具）、OpenHands（并行委派）、Hermes（编排者角色 + swarm）与 OpenCode（并发子会话）中（Observation 11.10）。
- 「在派生子智能体之前，把计划保存到外部记忆」[17]：Claude Code 的 CLAUDE.md、Gemini CLI 的计划文件与 MEMORY.md 项目索引、Codex 的 AGENTS.md 层级及其由智能体维护的 memories 根。
- 长视野任务的「压缩 + 结构化笔记 + 子智能体」[19]：全部四个 provider 原生系统——以及全部三个新来者——都实现了这三者。
- 「多智能体系统使用的 token 约为聊天的 15 倍」[17]（相对于单个聊天基线，而非单智能体管线）：这正是 Claude Code 的提示词缓存共享 fork 机制、Hermes 的缓存共享后台 fork 与仅摘要返回、以及 Gemini CLI 的思维剥离（记录响应时把扩展思考文本排除在持久化历史之外，使其永不重新进入缓存）背后的动机。没有这些优化，成本将令人望而却步。

这份指导中有一处张力应当指出。Hadfield 等 [17] 提醒说：「大多数编码任务中，真正可并行的任务比研究少，而且 LLM 智能体尚不擅长实时协调与委派其他智能体。」本研究十一个系统中的七个（把 OpenClaw 的协议层变体算上则八个）仍然专门为编码工作流实现了协调者-工作者模式。细看之下，观察到的模式大多用于广度优先的探索阶段（并行代码库研究），而非并行实现——一旦分析单位从系统整体转移到单个工作流阶段，这与 Hadfield 等的告诫是一致的。

### 15.2 极简主义论证

Mini-SWE-Agent 以最小脚手架和单一 `bash` 工具取得了有竞争力的自报基准成绩（SWE-Bench Verified 上 74%+），这削弱了「丰富的工具生态是必要的」这一假设。这一发现呼应了 CodeAct [3] 的论证：可执行代码吞并离散的工具动作。仅就基准评估而言，生产系统中的大部分脚手架结果都是开销。

反方论证是：基准只衡量价值主张中狭窄的切片。生产系统（Claude Code、Codex、Gemini CLI、Mistral Vibe、OpenHands）在基准不予奖励的方面重金投入：

- **安全**：防止对用户代码库的破坏性动作。
- **用户体验**：流式响应、丰富的终端 UI、进度跟踪。
- **可扩展性**：支持自定义工具、MCP 服务器、插件。
- **健壮性**：处理边缘情况、卡死检测、错误恢复。
- **成本管理**：提示词缓存、上下文压缩、模型选择。

这些关注点对 SWE-Bench 不可见，却对生产采用至关重要。

### 15.3 作为架构的安全

安全是语料库中分歧最大的维度。Codex 采取纵深防御：OS 级沙箱加策略即代码加审批工作流，安全从一开始就被当作主要的工程关注，而非事后补丁。Gemini CLI 处于光谱上类似但更轻的位置：一个跨平台沙箱（复用 OS 二进制）加四种显式审批模式（PLAN/DEFAULT/AUTO_EDIT/YOLO）与按模式的 TOML 策略。Claude Code 的三层系统（hooks → 分类器 → 对话）介于纯自动化与人类监督之间。Mistral Vibe 的权限作用域层级（命令/文件/URL 模式加 agent-profile 门）比 Aider 的二元确认更细粒度，但没有 OS 级强制。OpenHands 的可插拔 SecurityAnalyzer 框架允许把规则式分析与 LLM 分析组合起来。

四月版观察到，语料库中两个最大的系统（Codex，当时 62.1 万行；Gemini CLI，56.8 万行）也恰是它的两个跨平台沙箱实现者，并把这一相关性解读为结构性的。扩充后的语料库证伪了结构性解读，同时保留了成本论断：Hermes 与 OpenCode 规模相当，却零 OS 级隔离，分别把安全预算花在内容承载威胁与权限粒度上（Observation 10.2）。仍然为真的是：凡内置原生沙箱之处，它都是 harness 中代码最昂贵的组件之一——Codex 把 bubblewrap vendored 进了自己的源码树，而元 harness 在上一层把整张账单重新付了一遍（第 14.4 节）。Aider 与 Mini-SWE-Agent 的最小安全面对其目标用例（面向可信用户的开发者工具）是可辩护的，但限制了它们在企业或自动化部署情境中的适用性。

### 15.4 模型–智能体协同设计论题

智能体脚手架与基础模型之间的耦合是双向的。

**模型塑造智能体。**Codex 的按模型提示词——如今是服务端下发的目录数据，横跨 GPT-5.2 至 5.6 家族，带按模型工具模式与多智能体工具世代（tool generations）——明确表明：脚手架设计必须随模型能力演化，而且厂商打算在不发布客户端版本的情况下驱动这种演化。Claude Code 的扩展思考集成（预算 token、思考块）利用了 Claude 特有的推理特性。Gemini CLI 的 ModelRouterService 把模型选择本身当作运行时调度决策，把每个请求派给最便宜的够用 Gemini 变体——并在一个季度内吸收了一次完整的模型世代切换（默认 2.5 → 3.x）；同一思想在 Hybrid LLM [84]、RouteLLM [83] 与 FrugalGPT 级联 [82] 中被形式化研究。Mistral Vibe 的 `reasoning_effort` 映射与 ThinkChunk 解析利用了 Mistral 的推理枚举。Aider 的模型感知编辑格式选择把编辑策略适配到每个模型的输出模式；OpenCode 在其工具注册表中重新推导了同一思想（GPT 家族模型得到补丁 DSL，其他模型得到字符串替换），并配有一套九提示词的模型家族矩阵。OpenHands 提供模型特定的工具预设（default、gemini、gpt5、planning）——协同设计甚至触及了一个多 provider 系统的工具面。

**智能体塑造模型使用。**Claude Code 的延迟工具加载减少了提示词 token，改变了模型的有效上下文窗口。Claude Code 的提示词缓存边界拆分系统提示词以最大化缓存命中——围绕缓存经济学构建提示词，一如围绕逻辑组织；Gim 等 [81] 为这背后隐含假设的模块化注意力复用策略提供了系统层面的依据。Gemini CLI 在响应记录时把扩展思考轨迹排除在持久化历史之外，使其永不泄漏进未来的缓存查找（并在认证切换时剥离 thought signatures）。Mistral Vibe 的中间件管线让每轮 token 预算策略与循环体正交组合。OpenHands 的 condenser 有选择地遗忘事件，塑造模型「记得」什么。

**启示。**四个 provider 原生系统（Claude Code、Codex、Gemini CLI、Mistral Vibe）可以同时优化耦合的两侧，让提示词、工具与特性和模型更新同步演化——Codex 最字面意义上如此，靠的是其服务端下发的模型目录。四月版曾推断：多 provider 系统因此必须按最小公分母设计；扩充后的语料库表明该推断过强。Hermes、Pi 与 OpenCode 证明：只要有意且集中地支付按 provider 条件代码的成本（Observation 7.1）——按模型怪癖元数据、provider-profile 插件、变换矩阵——多 provider 基座也能达到 provider 原生的完整优化菜单。多 provider 系统无法复制的是更新循环：只有厂商能在模型发布日当天在服务端重新调校脚手架行为。Mistral Vibe 的「provider 优先加通用回退」设计与自有传输（owned-transports）立场都仍是可行的中间道路，区别只在于由谁承担维护负担。

### 15.5 脚手架–能力前沿（一个指导性直觉）

我们以一个指导性直觉而非正式假说来收尾：在固定的任务分布与固定的模型下，脚手架复杂度与观察到的任务成功率似乎描出一条大致呈凹形的曲线。一个智能体根本无法运作的地板（无循环、无工具、无记忆、无结果）；一个陡峭的早期增益区——加入一小组结构元素（`bash` 工具、读写工具、一个 Markdown 上下文文件）便使成功率迅速上升；以及一个收益递减的平台期——进一步的脚手架工作在运营关切（安全、UX、可扩展性）而非完成率上得到回报。我们把这一图景命名为脚手架–能力前沿（scaffold–capability frontier），并将其视为有待检验的假说，而非设计空间的已证属性。

文献中两个独立的结果与这一图景一致，但并不确证它。Mini-SWE-Agent 以刻意极简的脚手架报告 SWE-Bench Verified 上约 74%+，这暗示：对前沿模型上的 SWE-Bench 风格任务，地板已经远低于多数生产脚手架。Lin 等 [85] 报告其 Agentic Harness Engineering (AHE) 系统——从与 Mini-SWE-Agent 相当的仅 bash 种子出发，利用可观测性驱动的反馈自动演化 harness——在 SWE-Bench Verified 上达到 71.9%。其组件级消融发现，结构化的 harness 元素承载了改进（tools +3.3 pp，middleware +2.2 pp，long-term memory +5.6 pp），而仅系统提示词反而使性能回退（−2.3 pp）；演化出的 harness 还能跨四个模型家族迁移。我们把这读作启发性证据：结构化脚手架比散文级的提示词策略更可移植——这与我们在架构（而非权重）层面关于模型–智能体协同设计的讨论一致。

一个操作性定义至少需要：一个固定任务分布 T、一个固定模型 M、一个脚手架复杂度度量（LoC、工具数、结构特性数，或某种加权组合），以及一个目标成功率 p。那么「(T,M,p) 的最小可行脚手架」就是：在 M 上于 T 中经验成功率超过 p 的那些脚手架复杂度值的下包络。本文不产出这样的测量。这样做需要一项受控的跨系统运行研究，而本文有意回避（见第 15 节「效度威胁」）。我们把脚手架–能力前沿标记为后续实证工作的问题，并指出：相关的最小值几乎必然随以下因素变化：

- **任务复杂度**：多文件重构可能比单文件 bug 修复需要更精密的工具支持。
- **安全要求**：企业部署需要基准不衡量的脚手架。
- **交互模式**：长时运行的交互式会话受益于短基准运行所不需要的记忆管理。

### 15.6 效度威胁

这种形状的研究有实实在在的局限，值得把它们明确说出来。

本分析基于源码阅读，而非运行时测量。我们不声称知道这些系统有多快；我们声称知道它们如何被构造。本文报告基准数字之处，数字来自系统自己的文档，而最后一位小数并不是有趣的部分。

支撑架构比较的定性打分涉及判断。我们试图把每个分数锚定在具体的实现细节上，并欢迎任何阅读同样代码库却给出不同打分的人提出异议。我们刻意避免行号引用，并把所有代码规模数字标定为 2026 年 7 月的钉定点：语料库中每个系统都在活跃开发，更精细的精度在论文被读到时就会过时。所有版本都钉定到确切的 release tag 与 commit（表 3），2026 年 4 月的快照为第 14.5 节的纵向比较而保留；而且——那个季度给我们的直接教训——我们如今区分有日期的清单式断言与预期持久的结构性断言。四月版的三条观察在本版中依据新证据被实质性修订；修订已就地整合，并在出现处标明。

Claude Code 分析是可复现性上最薄弱的一环。它依据的是 2026 年 3 月公开流传的一个源码快照，而非官方发布版本；此后 shipping 二进制已有长足演化（我们追踪其 changelog 层面的演化，但不把 changelog 声明当作源码证据）。架构性断言应当仍可对照公共的 claude-agent-sdk 与 shipping 二进制的行为来检验，但我们承认与其他十个系统的不对称——后者的源码树可以从公共 Git 历史轻易重新推导。

框架缺席的发现（Observation 13.2）很强，但在结构上是保守的。我们检查了依赖清单，并在三种语言上执行了 import grep——两次，间隔三个月，横跨包括元 harness 在内的十二棵源码树；我们没有追踪内部 fork、经动态 `importlib` / `require` 加载的插件，或转译后的发行版。原则上，一家公司可能经由我们未检查的代码路径，在生产 SWE 智能体内部使用 LangChain。我们会惊讶，但不会震惊。

Anthropic 指导到观察的映射（Observation 13.2）是启发性的，但本身并不确立因果。正确的后续工作是对每家厂商工程师的访谈；我们没有做。

我们还对每个系统独立进行比较，而非在共享任务集上运行全部十一个系统。一项正面对垒的执行研究会把部分定性打分变成可测量的量。它也将耗费比本文高一个数量级的精力；我们选择了可行的范围。

---

## 16 设计建议：实践者指南

前面各章是描述性的，编目了十一个生产级 harness（驾驭层）实际包含的内容。本章是规定性的：我们把各项观察提炼为可操作的建议，供设计新 coding agent 的工程师参考。每条建议都引用支持它的观察，点名实现它的系统，并指出可能证明其他选择合理的权衡。当语料与 Anthropic 的 Effective Agents 系列 [16, 19, 18, 17] 一致时，我们把这种一致标注为跨来源验证；当语料与该系列存在分歧或有所扩展时，我们同样注明。这些建议按子系统分组，排序大致遵循实践者在引导（bootstrap）一个 agent 时会依次遇到的顺序。

### 16.1 循环架构

**建议 1：从一个线性的 while 循环开始；只有当正交的回合级策略出现时，才升级为中间件管线。** 证据：观察 5（循环的复杂程度不能预测基准性能）；Mini-SWE-Agent 的 50 行线性循环在 SWE-Bench Verified 上报告了 74%+ 的成绩（自报数据；见表 4 的脚注）。升级路径：一旦你需要三个或更多相互独立的回合级策略（回合上限、成本上限、自动压缩、上下文预算警告、只读模式），就采用 Mistral Vibe 的中间件管线模式——每个策略成为一个可组合的中间件，而不是循环体内的一条新分支。

### 16.2 提供商耦合

**建议 2：如果你自己发布基础模型，就与自家提供商紧耦合，并为可移植性暴露一个通用回退适配器；如果你不发布，提供商原生优化仍是可选项——改为为每模型元数据投入预算。** 证据：观察 7.1。Mistral Vibe 的「提供商优先 + 通用回退」仍是厂商模式。对于多提供商 harness，Pi 的每模型兼容性怪癖标志、Hermes 的声明式提供商配置档案、OpenCode 的转换矩阵都表明：缓存断点、思考层级与推理力度（reasoning effort）都可以从一个抽象层触达——代价是一个需要持续维护的按提供商调节层（conditioning layer），一次性、集中地支付。

### 16.3 工具设计

**建议 3：从只有一个 bash 工具起步。只有在观察到具体失败模式时才添加更多工具。** 证据：Mini-SWE-Agent 的单工具设计在几乎没有工具基础设施的情况下在 SWE-Bench 上报告了 74%+（自报数据）；Aizawa 等人 [18] 提醒「更多工具并不总是带来更好的结果」。一个常见的递进次序是：当 bash 输出截断成为问题时，添加 read_file 与 write_file；当 bash + find / rg 显得笨拙时，添加 grep / glob；当整文件写入浪费 token 时，添加 search_replace。

**建议 4：当你的工具数量超过约 15 个时，采用延迟工具加载。** 证据：Claude Code 的 shouldDefer 标志加 ToolSearchTool 把初始提示词缩减了约 40%；Codex 独立收敛到 defer_loading 标志加按 BM25 排序的 tool_search；Hermes 在 schema 将超过上下文窗口 10% 时，把溢出的 MCP 目录折叠为三个经 BM25 搜索的桥接工具。低于约 15 个工具时，这种间接层不值得引入的复杂度；高于它，提示词膨胀就变得难以承受。

### 16.4 文件编辑

**建议 5：让编辑工具契约与你的模型层级匹配：前沿模型用精确唯一子串替换，开放或较弱模型用模糊级联——无论哪种情况，都在工具层处理漂移，绝不依赖行号。** 证据：观察 8.4。前沿模型阵营已收敛到精确契约（Claude Code；Mistral Vibe 于 2026 年年中删除了它的 SEARCH/REPLACE 工具并收敛到精确匹配；Pi 只添加 Unicode/空白规范化加字节保真覆盖层）。容忍漂移的阵营服务于更广的模型范围（OpenCode 在 Levenshtein 0.65 的九级联、Hermes 的九策略链、Aider 的 RelativeIndenter）。Gemini CLI 的 LLM 编辑修复子调用是正在兴起的第三选项：用模型而非阈值来修复匹配。避免基于行号的编辑：模型在行号上的漂移比在上下文匹配上更严重。

### 16.5 记忆与上下文

**建议 6：在项目、用户与扩展三个作用域自动发现分层 Markdown 上下文文件——同时也要读取邻居的文件名。** 证据：全部十一个管理仓库上下文的系统都收敛到这一模式，且最新的几个读取多种约定（Hermes：自有文件，随后是 AGENTS.md、CLAUDE.md、.cursorrules；OpenCode：AGENTS.md/CLAUDE.md/CONTEXT.md 加远程 URL；OpenHands 把三个生态的文件摄取为带作用域的规则）。把顶层内容注入系统提示词顶部附近，在工具触及嵌套文件所在子树时即时（just-in-time）呈现这些文件（Mistral Vibe、OpenCode、Hermes、Gemini CLI），并让模型持久化持久事实——通过直接编辑、有界快照文件，或人工审核的收件箱（观察 9.6）。

**建议 7：在低于模型上下文窗口的固定缓冲处实现阈值压缩；逐字保留最近的尾部；增量合并摘要而非重新摘要；并把同一例程同时接到溢出时的被动触发上。** 证据：Claude Code 在低于 13K token 缓冲时触发，并在事后恢复文件；Gemini CLI 在 50% 处压缩并保留最后 30%；Pi 与 OpenCode 把前一次摘要传回以供合并（锚定/迭代式摘要），从而保住从零重新摘要会丢失的早期决策；Mistral Vibe 把先前的用户消息重新注入压缩后的信封，并在回合中途的 ContextTooLong 错误上复用同一例程；OpenHands 把溢出错误路由进浓缩处理。激进压缩防范上下文腐烂（context rot）[19]；保守保留让近期推理保持连贯。

**建议 8：不要在代码之上构建 RAG。改用 ripgrep、glob、tree-sitter 符号提取与文件系统遍历。** 证据：观察 13.2；0/11 个系统用向量嵌入做代码检索；Rajasekaran 等人 [19] 在实践中支持 JIT 检索，且他们的所有具体建议都指向确定性工具。代码拥有语义相似度无法复制的丰富确定性结构（路径、语言服务器、tree-sitter 解析），而且代码逐分钟变化，会让嵌入过时。

### 16.6 按部署场景划分的安全架构

**建议 9：对于开发者工具（半受信任）场景：实现三模式批准系统（PLAN / DEFAULT / YOLO），辅以权限作用域模式。** 证据：Gemini CLI 的 PLAN/DEFAULT/YOLO 模式；Mistral Vibe 的 4 层权限层级（工具级 + 工具特定 + 会话规则 + 交互式回调）；这与人类开发者分诊风险的方式相符。

**建议 10：对于企业 / 共享 / 自动化场景：实现 OS 级沙箱，配合策略即代码与逐 agent 审计轨迹。** 证据：观察 10.2；Codex 与 Gemini CLI 出厂自带原生跨平台沙箱（Linux 上 Bubblewrap——Codex 的是内嵌（vendored）版本——macOS 上 Seatbelt、Windows 上受限 token），而 Claude Code 把 Anthropic 可复用的 sandbox-runtime 封装为可选启用项。Gemini CLI 的实现表明：只要复用 OS 二进制（Node child_process 或等价物）而不是从零编写命名空间管道，这一成本是可以容忍的。

**建议 11：无论哪个层级，都把安全规则固化为数据或专用策略文件，而不是命令式代码——如果你支持 YOLO 模式，要在它下面保留一道底线。** 证据：Codex 的 Starlark execpolicy 规则（带解析期校验的内联示例）、Claude Code 的 PreToolUse 钩子、Gemini CLI 的每模式 TOML、OpenCode 的最后匹配生效（last-match-wins）规则集。Hermes 补充了底线教训：它的十二条强硬模式在 --yolo 下仍然生效，旁路标志在模块导入时被冻结，因此被注入的内容无法在运行时翻转它。策略即代码能在重构中存活，并且独立于循环实现而可审计。

### 16.7 多 agent 编排

**建议 12：保持单 agent，直到你能指出一个具体的广度优先探索阶段——并行上下文隔离在那里明显胜过串行搜索。** 证据：Hadfield 等人 [17] 提醒，多 agent 系统消耗的 token 约为聊天基线的 15 倍，且「大多数编码任务中真正可并行的任务比研究少」；Mistral Vibe 的 task 工具向子 agent 委派（其提示词鼓励并行启动多个），这对大多数编码工作流已经足够。

**建议 13：交付一个 ACP 服务器：它不再只是编辑器集成——它让你的 harness 能被宿主与元编排器消费。让你自己的子 agent 保持在进程内。** 证据：观察 13.3。一个 ACP 服务器现在能同时覆盖三类受众：IDE（Zed、JetBrains）、承载 harness 的宿主（OpenHands 把 Claude Code / Codex / Gemini CLI 作为可互换的 ACP 后端运行），以及元 harness（Omnigent 经 ACP 驱动 Goose 与 Qwen）。十一个语料系统中有六个交付了它。对于 agent ↔ agent 网状拓扑，A2A 仍只是 Gemini CLI 独家的押注——可辩护，但未被证实。对于你自己运行时内的主 agent ↔ 子 agent 协调，两者都不要采用（见建议 12）：生产系统用的是进程内原语，即便是跨进程的例外（Pi 的 JSONL 扩展、Hermes 的 SQLite 黑板群集）在该角色上也避开了标准协议。

### 16.8 可扩展性

**建议 14：用 Skills 承载能力模板（工作流、领域知识、程序性配方），用 MCP 承载外部集成（Slack、数据库、内部 API）——按这一优先次序。** 证据：观察 12.5：skills 的采用率现已领先 MCP（9/11 对 8/11），发现是跨厂商的（OpenCode 读取 ~/.claude/skills），分发则有了注册表与来源验证。MCP 仍是运行外部进程的正确层；Pi 展示了可辩护的极简立场（skills 加带 README 的 CLI 工具，不采用 MCP）。如果你安装第三方 skills，把它们当作软件包对待：信任层级、扫描与隔离（Hermes）是正在成形的基线 [89]。

### 16.9 不该构建什么（反模式）

**建议 15：不要把 LangChain、LangGraph、AutoGen、CrewAI、LlamaIndex、Pydantic AI、Genkit、Google ADK 或 Semantic Kernel 用作 agent 运行时。** 证据：观察 13.2；语料中 0/11 个生产 harness 使用这些框架——Gemini CLI 连 Google 自家的都跳过了。Schluntz & Zhang [16] 明确警告：「框架常常制造额外的抽象层，遮蔽底层的提示词与响应，使其更难调试。」使用裸 SDK 调用——或者，2026 年的推论（第 14.2 节）：如果你想要一个「带电池」的起点，harness SDK（Claude Agent SDK、openai-codex、openhands-sdk）如今就是框架层，语料中的模式已内建其中。

**建议 16：不要为代码构建向量嵌入检索层。** 证据：观察 13.2；0/11 个系统这样做。确实出现的嵌入服务于对话记忆（OpenClaw 的默认混合搜索；Hermes 的可选插件），而 Hermes 表明词法 SQLite FTS5 在 64.2 万行规模上足以胜任该角色。如果你相信你的领域需要语义代码检索，请先在留出的任务集上证明它优于 ripgrep + tree-sitter，然后再添加那套基础设施。

**建议 17：不要把每个上游 SaaS API 一一包装成工具。** 证据：Aizawa 等人 [18]：「我们观察到的一个常见错误，是那些仅仅包装既有软件功能或 API 端点的工具。」应当改为整合。

**建议 18：不要过度工程化卡死检测——但请交付那些廉价的上限，它们只花十几行代码。** 证据：Claude Code 与 Codex 至今没有交付自动化卡死检测，却交付了生产质量的 agent。不过底线在移动：连 Mini-SWE-Agent 现在也限制了连续畸形响应与墙钟时间；OpenCode 的死循环检查是一个「三次相同调用」计数器，被路由到权限询问；Hermes 对调用签名做哈希，但交付时禁用硬停止、信任警告。OpenHands 的五场景 StuckDetector 与 Gemini CLI 的混合 hash+LLM 服务仍属平台级投资。

### 16.10 最小可行 harness

作为具体起点，代码清单 3 用约 90 行 Python 勾勒了一个最小可行 harness，组合了上述推荐模式：线性循环（Mini-SWE-Agent）、中间件式策略（Mistral Vibe）、四工具表面（bash、read、write、search_replace）、分层 Markdown 上下文自动发现（全部四个提供商原生系统），以及阈值压缩（Claude Code / Gemini CLI / Mistral Vibe）。它不是拿来即用的库；它是一个供复制与特化的脚手架。

```python
from __future__ import annotations

import asyncio, json, pathlib, subprocess
from dataclasses import dataclass, field
from typing import Any, Protocol

# ---- Provider abstraction (Recommendation 2): provider-first fallback ---------
class Model(Protocol):
    async def complete(self, messages: list[dict], tools: list[dict]) -> dict: ...

# ---- Tools (Recommendation 3): bash + 3 file tools ---------------------------
def _truncate(s: str, n: int = 25_000) -> str:
    return s if len(s) <= n else s[:n] + "\n...[truncated]"

def tool_bash(cmd: str) -> str:
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
    return _truncate(f"exit={r.returncode}\nstdout:\n{r.stdout}\nstderr:\n{r.stderr}")

def tool_read_file(path: str, offset: int = 0, limit: int = 2000) -> str:
    lines = pathlib.Path(path).read_text().splitlines()
    return _truncate("\n".join(f"{i+1:4}: {ln}" for i, ln in enumerate(lines[offset:offset+limit])))

def tool_write_file(path: str, content: str) -> str:
    pathlib.Path(path).write_text(content); return f"wrote {len(content)} bytes"

def tool_search_replace(path: str, search: str, replace: str) -> str:
    p = pathlib.Path(path); text = p.read_text()
    if text.count(search) != 1:
        return f"ERROR: search string occurs {text.count(search)}x; must be unique"
    p.write_text(text.replace(search, replace, 1)); return "OK"

TOOLS = {"bash": tool_bash, "read_file": tool_read_file,
         "write_file": tool_write_file, "search_replace": tool_search_replace}

# ---- Hierarchical Markdown context (Recommendation 6) ------------------------
def discover_context(cwd: pathlib.Path = pathlib.Path.cwd()) -> str:
    parts = []
    for p in reversed([cwd, *cwd.parents]):  # root-to-leaf
        md = p / "AGENTS.md"
        if md.exists():
            parts.append(f"<ctx path='{md}'>\n{md.read_text()}\n</ctx>")
    return "\n".join(parts)

# ---- Middleware pipeline (Recommendation 1) ----------------------------------
@dataclass
class Agent:
    model: Model
    messages: list = field(default_factory=list)
    n_turns: int = 0
    cost: float = 0.0
    max_turns: int = 50
    max_cost: float = 5.00
    compact_at_tokens: int = 120_000

    def _token_estimate(self) -> int:
        return sum(len(json.dumps(m)) for m in self.messages) // 4

    async def _check_limits(self):
        if self.n_turns >= self.max_turns: raise StopIteration(f"max_turns={self.max_turns}")
        if self.cost >= self.max_cost: raise StopIteration(f"max_cost=${self.max_cost:.2f}")

    async def _maybe_compact(self):  # Recommendation 7
        if self._token_estimate() < self.compact_at_tokens: return
        summary = await self.model.complete(
            self.messages + [{"role": "user",
                              "content": "Summarize the conversation. Preserve decisions and unresolved issues."}],
            tools=[])
        # Preserve system + last 30% of turns verbatim, drop the middle (Gemini pattern)
        keep = max(4, int(len(self.messages) * 0.30))
        self.messages = [self.messages[0],
                         {"role": "assistant", "content": summary["content"]}] + self.messages[-keep:]

    async def run(self, task: str) -> str:
        self.messages = [
            {"role": "system", "content": f"You are a SWE agent.\n\n{discover_context()}"},
            {"role": "user", "content": task},
        ]
        tool_schemas = [{"name": n, "description": f.__doc__ or n} for n, f in TOOLS.items()]
        while True:
            await self._check_limits(); await self._maybe_compact()
            resp = await self.model.complete(self.messages, tools=tool_schemas)
            self.n_turns += 1; self.cost += resp.get("cost", 0.0)
            self.messages.append(resp)
            if not resp.get("tool_calls"): return resp.get("content", "")
            for call in resp["tool_calls"]:  # serial execution
                try: out = TOOLS[call["name"]](**call["args"])
                except Exception as e: out = f"ERROR: {type(e).__name__}: {e}"
                self.messages.append({"role": "tool", "tool_call_id": call["id"],
                                      "content": _truncate(str(out))})
```

代码清单 3：一个最小可行 harness，约 90 行 Python。示意性脚手架，并非生产代码。

上面的脚手架刻意省略了语料显示存在分歧的特性：沙箱（建议 9–10 取决于部署场景）、多 agent（建议 12 建议暂缓）、MCP/Skills（建议 14 属于可扩展性而非核心）。从这里开始，先度量 [17]，只添加你观察到的失败模式所要求的最小功能。

**观察 13。** 代码清单 3 的 90 行最小可行 agent 直接实现了 18 条建议中的 10 条，且与其余 8 条兼容。它做到这一点不需要任何框架依赖、没有 RAG、没有向量存储、没有多 agent 编排、也没有沙箱——这与双重缺席（观察 13.2）以及 [16] 的「从简单开始」原则相吻合。我们不加证明地猜想：这个脚手架跑在前沿模型上会达到 Mini-SWE-Agent 的 SWE-Bench 水平，而要超越那些数字，主要是模型能力问题（观察 5），而非脚手架问题。

## 17 结论与未来工作

本文呈现了对十一个 LLM 驱动的 coding harness 的源代码级解剖——每个主要商业 LLM 提供商各一个（Claude Code/Anthropic、Codex/OpenAI、Gemini CLI/Google、Mistral Vibe/Mistral），外加七个开源设计——连同元 harness 对照点、对一个季度演化的纵向 diff，以及对本领域转向平台这一进程的记述。

### 17.1 关键要点

1. **架构很重要，但并非以当前话语所暗示的方式。** agent 循环的复杂程度不能预测基准性能（Mini-SWE-Agent 的 50 行循环报告了前沿区间的成绩）。但它确实能预测生产就绪度：安全基础设施、用户体验、可扩展性——以及日益增多的客户端与传输层，如今最大的系统把大部分体量都放在那里。

2. **模型–agent 关系是共同演化的，耦合关乎更新循环，而非能力。** 提供商原生优化（缓存边界、思考预算、模型特定提示词、路由）从耦合光谱的两端都被行使：厂商系统原生地做，Hermes、Pi 与 OpenCode 则从多提供商基底出发，集中支付每提供商的调节成本。只有厂商保留的是服务器端的共同演化——Codex 在每次模型发布时从一个目录端点重新调整提示词、推理层级乃至其多 agent 工具，无需客户端更新。

3. **安全在架构上是昂贵的——而且是一种选择，不是规模的后果。** Codex 的跨平台沙箱（现在带有内嵌的 bubblewrap）仍然是一项基准测试从不衡量的可观投资，而元 harness 在上一层把同一张账单再付一遍。但四月版中「规模蕴含沙箱」的相关性已被打破：Hermes 与 OpenCode 属于最大的系统却零 OS 级隔离，转而把钱花在内容携带型威胁防御与语法感知的权限控制上。

4. **多 agent 编排已收敛到分层模式，而各协议找到了第三个角色。** 协调者–工作者形态如今出现在七个系统中。ACP 不仅服务于编辑器 ↔ agent 边界（六个语料采用者），还扮演了其设计使命之外的角色：harness 托管（harness hosting），OpenHands 将 Claude Code、Codex 或 Gemini CLI 作为可互换后端运行。A2A 仍是 Gemini CLI 独有的跨厂商网状押注。九个多 agent 系统中有八个，其子 agent 协调保持在进程内。

5. **可扩展性标准已有定论：skills 领先。** Skills（9/11 系统）在 Pi 打破平局时反超 MCP（8/11）——Pi 实现 agentskills.io 的同时断然拒绝 MCP。skills 层获得了注册表、信任层级、来源验证、跨厂商发现（OpenCode 读取 ~/.claude/skills），以及第一批 agent 作者（Hermes 的自我改进循环、Gemini CLI 的提取收件箱）。

6. **双重缺席是真实的、经再次验证的，如今也有了历史解释。** 在十一个系统、约四百万行代码中，没有任何 agent 运行时使用通用 agentic 框架，也没有任何系统在代码上使用 RAG——全部依赖手写的异步循环与确定性结构检索。这一缺席在三倍语料扩充与一次为期三个月的再审计中依然成立，印证了 Anthropic 已发布的指导 [16, 19] 与独立的 AHE 结果 [85]。它的消解方式正是第 14.2 节的 harness–框架合流。

7. **Anthropic 有效 agent 系列预见到了我们观察到的架构。** 2024 年 12 月至 2025 年 9 月间发布的四篇工程文章，与我们在十一个独立开发的系统中所记录的模式紧密对应。这究竟反映了共同的经验现实、被指导塑造的设计，还是二者兼有，是一个本身就值得追究的问题。

8. **这份分析可以直接付诸行动。** 第 16 节为构建新 harness 的实践者提炼了 18 条具体的、有证据锚定的设计建议，外加一个直接实现其中十条的 90 行最小可行 harness 脚手架（代码清单 3）。加上源代码审计，据我们所知，这是该学科第一份基于证据的实践指南，且并非出自单一厂商的白皮书。

9. **平台转向不再是假设。** 四月版谨慎地作为「CLI 即框架」假设提出的内容，第 14 节现已记录为一项已完成的转向：harness 以可导入 SDK 的形式交付，而框架厂商则交付 harness（第 14.2 节的合流）；能力分发拥有了市场、注册表、信任层级 [89] 与 agent 作者；厂商为彼此的磁盘上状态编写导入器，并暴露 MDM 级（移动设备管理）治理；agent 本身作为 OpenAI 兼容端点背后的模型是可寻址的；一个元 harness 在单一 API 之后编排十一个厂商 harness——其中包括本文研究的五个系统（第 14.4 节）。周边生态的数据指向同一方向：MCP 的 8000+ 服务器生态与应用商店式的策展病态 [86]；skills 被形式化为可组合包 [87] 并配有类 npm 的包管理器 [88]；22–29% 的 GitHub 项目带有 agent 痕迹 [91]；以及把开发定义为编排的「SE 3.0」框架 [92]。开发者不再用框架编程，而是在框架之中编程，观察 7.1 的厂商锁定正在演变为操作系统与 IDE 一向产生的那类结构性锁定 [90]——而元层已经在就此套利。harness 将聚合为少数主导平台、碎片化为可互操作的运行时，还是从上方被商品化，是下一年的竞争性问题；三种结局的架构前提今天都已在源代码之中。

### 17.2 未来工作

从我们的分析中浮现出若干方向：

- **统一评估框架**：在正确性之外同时评估安全性、用户体验、成本效率与可扩展性，弥合基准性能与生产就绪度之间的鸿沟。
- **参考架构规范**：把我们识别的模式（事件溯源、策略即代码、上下文分叉、延迟工具加载、中间件管线、基于哈希的循环检测、JIT 仓库上下文）形式化为可复用的架构框架。
- **策略即代码系统的安全策略形式化验证**：为「在给定策略配置下允许哪些 agent 行为」建立保证。
- **模型–agent 共同演化的实证研究**：追踪 agent 脚手架如何跨模型世代变化，并量化模型特定优化的性能影响。Lin 等人的 AHE 系统 [85] 表明自动 harness 演化已属可行；纵向研究现在可以追踪自动演化的脚手架与手工打造的脚手架在各模型世代间的对比。
- **跨系统基准套件**：在受控条件下于全部十一个系统上运行相同任务，使我们识别的架构权衡可以直接比较。
- **agent 间协议采用研究**：追踪 ACP 的三种角色（编辑器集成、harness 托管，以及——经 A2A——跨厂商网状拓扑），并测量托管 harness 拓扑（如 OpenHands 的 ACP 后端与 Omnigent 的适配器机群）的开销。
- **纵向延续**：四月/七月快照对使本研究成为时间序列；按季度重新固定版本，就能以定量而非轶事的方式度量模式扩散半衰期、提示词瘦身与平台化轨迹。
- **元 harness 经济学**：自上而下的商品化（第 14.4 节）能否持久地捕获价值，以及 harness 能力的一致性基准（conformance-bench）方法是否会成为标准接口。
- **Anthropic–业界对齐的因果分析**：通过访谈、设计文档考古与提交历史相关性，把公开指导的影响与趋同式工程区分开来。

## 致谢与 AI 使用披露

本文在 Anthropic 的 Claude（经由 Claude Code CLI）的大量协助下写成，该工具既用于源代码分析，也用于撰写稿件。架构性发现、观察、模式与建议在被保留进论文之前，均对照所引用的代码库进行了核实。任何残留错误归咎于我们。

本披露遵循 ACL、NeurIPS、ICML 与 IEEE 新兴的作者身份政策。本文的价值——如果有的话——在于它对这十二个代码库所说的内容；全文引用的具名模块、工具与版本锁定应能让任何读者独立验证这些主张。

我们感谢十二个被研究系统的维护者与贡献者在开放中工作。没有他们把源代码开放供检视的决定，本文不可能完成。

## 附录 A 详细对照表

本附录汇集正文中引用的信息密度最高的逐系统对照表：十一个系统提示词的修辞内容（表 16）、高级 API 特性矩阵（表 17），以及 Claude Code 对 Codex 的正面对决管线比较（表 18）。

**表 16：十一个系统提示词的修辞内容（2026 年 7 月）**

| 系统 | 详简规则 | 反过度打磨 | 提交策略 | Emoji 规则 | 强调风格 |
|---|---|---|---|---|---|
| Claude Code | 量化（≤ 25/100 词；内部 A/B） | 明确 | 除非被要求，否则不提交 | 条件式 | IMPORTANT: / NEVER 标签 |
| Codex | 定性（5.2）；人格驱动（5.6） | 明确（5.2）；已删除（5.6） | 不提交（5.2）；特性开关（5.6） | 无 | NEVER 标签 |
| Gemini CLI | 经片段门控 | 隐式 | 隐式 | 无 | 特性门控的小节 |
| Mistral Vibe | 严格（< 150 词） | 明确 | 相反：预期提交，带签名尾注 | 严格禁止 | 可覆盖性契约（结构层面） |
| OpenHands | 无 | 明确（按文件后缀） | 教授提交操作；push/PR 受门控 | 无 | XML 角色标签 |
| Aider | “few short sentences”（几句短句） | 隐式 | 静默 | 静默 | 格式示例 |
| Mini-SWE-Agent | 结构性（每回合 1 条命令） | 静默 | 静默 | 静默 | `<important>` XML |
| Hermes | 定性（“lead with the change”，先讲改动） | 明确 | 除非被要求，否则不提交/推送/改写 | 无 | MUST / NEVER + 示例对；模型门控的 XML |
| Pi | 单条要点（“Be concise”，要简洁） | 静默（委派） | 静默（委派） | 静默 | 仅 XML 数据标签 |
| OpenCode | 量化（< 4 行；依模型而定） | 明确 | 除非被要求，否则不提交 | 条件式；GPT 提示词中禁止 | IMPORTANT: / NEVER + `<system-reminder>` |
| OpenClaw | 按 agent 而定 | 继承 | 继承 | 继承 | 按 agent 而定 |

**表 17：各系统使用的高级 API 特性（2026 年 7 月）**

| 系统 | 提示词缓存 | 扩展思考 | 推理力度 | 模型路由 | WebSocket | 视觉 | 成本追踪 |
|---|---|---|---|---|---|---|---|
| OpenHands | 部分（缓存层级 + 标记） | ✓ | ✓ | ✓（RouterLLM） | ✗ | ✓ | 按模型 |
| Aider | 部分 | ✗ | ✗ | ✗ | ✗ | 可选 | Tok+$ |
| Claude Code | 完整（Blake2b 边界） | ✓ | ✗ | ✗ | ✗ | ✓ | Tok+$ |
| Codex | 部分（thread_id 键） | ✗ | ✓（至 max/ultra） | ✗ | ✓ | ✓ | 按回合 |
| Gemini CLI | ✗（服务器端） | ✓ | ✗ | ✓（router） | ✗ | ✓ | OTel/Tok+$ |
| Mistral Vibe | 部分 | ✓ | ✓（5 级） | ✗ | ✗ | ✓ | OTel/每会话 |
| Mini-SWE-Agent | 部分 | ✗ | ✗ | ✗ | ✗ | 可选 | litellm |
| Hermes | 完整（提供商无关标记 + 前缀规范化） | ✓ | ✓（5 级，逐提供商转译） | 仅故障转移链 | ✗ | ✓ | Tok+$，带类型化来源 |
| Pi | 完整（断点 + TTL 层级 + 浪费审计） | ✓（7 级量表） | ✓（10 种方言） | ✗（设计使然） | ✓（Codex 后端） | ✓ | Tok+$，分级定价 |
| OpenCode | 完整（6 方言扇出 + 会话键） | ✓ | ✓（日期门控变体） | 仅小模型选择 | 实验性标志 | ✓ | Tok+$（Decimal） |
| OpenClaw | 部分 | ✓ | ✗ | ✗ | ✓ | ✓ | 按提供商 |

**表 18：正面对决管线比较：Claude Code 对 Codex**

| 阶段 | Claude Code | Codex |
|---|---|---|
| 提示词组装 | 12–15 个具名小节。静态前缀（身份、规则、工具）经 Blake2b 哈希缓存；动态后缀（环境、记忆、MCP）每回合重算。SYSTEM_PROMPT_DYNAMIC_BOUNDARY 分隔两者。 | 每模型提示词作为服务器下发的目录数据（models.json 的 base_instructions，远程刷新并带内嵌回退）；人格模板化。AGENTS.md 经根到 cwd 的拼接注入（嵌套内容追加在后）。 |
| 工具暴露 | 43 个工具，但初始只加载一个子集。延迟工具经 ToolSearchTool 按需发现（关键词搜索 + select: 语法）。把提示词 token 减少约 40%。 | 25–30 个内建工具；schema 经 create_tools_json_for_responses_api() 转换为 OpenAI Function 格式。延迟加载现已镜像：defer_loading 标志（默认对 MCP 工具）+ BM25 排序的 tool_search。 |
| API 协议 | Anthropic Messages API。SSE 流式，带 content_block_{start,delta,stop} 事件。扩展思考经 budget_tokens。 | OpenAI Responses API。WebSocket 为主，SSE 回退。连接预热（generate=false）。回合状态经 x-codex-turn-state 头传递。推理力度（minimal–xhigh，另有 max/ultra；ultra 增加自动委派）。 |
| 工具分发 | partitionToolCalls()：单遍 reduce 按 isConcurrencySafe() 分区。连续的安全工具批量执行；不安全工具单独执行。经信号量最多 10 路并发。 | 经专用 ToolCallRuntime 的 FuturesOrdered；每工具 supports_parallel 标志（默认 false）门控一个执行锁——并发不安全的工具独占运行。 |
| 权限 | 3 层：(1) PreToolUse 钩子（静态模式匹配），(2) LLM 风险分类器，(3) 交互式对话框。子 agent 跳过第 3 层。 | 4 层：(1) ExecPolicy Starlark 规则，(2) 生命周期钩子（Claude Code 兼容词汇），(3) Guardian LLM 审批审查者（fail-closed），(4) OS 级沙箱强制执行。 |
| 执行 | 宿主执行，可选启用 OS 沙箱（Anthropic sandbox-runtime：Bubblewrap/Seatbelt、网络限制、dangerouslyDisableSandbox 逃生口）；git worktree 做分支隔离。 | 沙箱内执行。内嵌 Bubblewrap（Linux；Landlock 旧版回退）、Seatbelt（macOS）、受限 token（Windows）。 |
| 压缩 | 当剩余上下文低于 AUTOCOMPACT_BUFFER_TOKENS（13K）时触发，另有环境变量可覆盖的百分比阈值。图像剥离、按 API 轮次的消息分组、LLM 摘要、SystemCompactBoundaryMessage。事后清理：恢复 5 个文件（50K token 预算）。 | model_auto_compact_token_limit 可配置。经 /responses/compact 进行本地或云端压缩；rollout token 预算带回合中止。 |

---

> 参考文献列表未收录，请见[原文](https://arxiv.org/abs/2609.00006)。

- [返回笔记目录](/notes/)
