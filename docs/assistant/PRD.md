# Assistant 模块 PRD

## 模块目标

Assistant 是 Nubbi 仓库内可独立部署的个人 AI 助手，提供 Expo 手机端、备用 Web 端和独立 API。它支持 OpenAI-compatible API Key 与 ChatGPT 订阅两种模型来源，并由 Assistant API 统一管理本地 Skill、HTTP MCP 和工具审批。

## 目录边界

| 目录 | 职责 |
| --- | --- |
| `assistant/api` | 会话、模型 Provider、Codex App Server、HTTP MCP、Skill 与审批运行时 |
| `assistant/web` | 浏览器备用聊天与设置界面 |
| `assistant/mobile` | Expo + React Native Android/iOS 客户端 |
| `assistant/config` | 模型和 MCP 配置示例；运行时配置不提交 |
| `assistant/skills` | Assistant 可发现的本地 Agent Skill |

Nubbi `mcp/` 仍是独立 MCP Server。Assistant 只能通过 Streamable HTTP 调用它，不得导入 `mcp/` 或 `server/` 的内部代码。

### API 框架

- Assistant API 使用 NestJS 组织 HTTP 接口，`AppModule` 只负责装配 Controller、Guard、Filter 和启动生命周期服务。
- Controller 负责路由、Zod 请求校验和 HTTP 状态映射；Agent Runtime、模型、MCP 与存储继续保持框架无关，不依赖 NestJS 注入容器。
- 模型与 MCP 配置接口统一使用 `ConfigAccessGuard` 校验设置管理密钥，业务方法不得重复读取请求头。
- 全局异常 Filter 保持 `{ message }` 错误响应兼容；已知业务状态使用 NestJS HTTP Exception 明确表达。
- Assistant API 使用 NestJS 的 Fastify Adapter，不保留 Express Router、中间件或 Response 依赖。
- 消息生成接口需要感知客户端断开并逐条发送命名 SSE 事件，因此只在传输边界使用 Node 原生 `ServerResponse`；其他 JSON Controller 返回普通对象，由 NestJS 统一序列化。
- 数据库连接和未结束 Run 清理在 NestJS 开始监听前完成，初始化失败时 API 不对外提供服务。

### 手机端 UI

- 通用按钮、表单输入、开关和选择控件优先使用 Expo SDK 对齐版本的 `@expo/ui` Universal 组件，由 iOS SwiftUI 和 Android Jetpack Compose 提供原生表现。
- 聊天气泡、流式消息、Markdown、消息输入区和工具调用状态保持 React Native 自定义实现，以满足聊天交互和跨端一致性要求。
- 图标继续使用 `lucide-react-native`；安全区域统一由 `react-native-safe-area-context` 管理。

## 请求链路

```text
Expo / Assistant Web
        |
        v
Assistant REST + SSE API
        |
        +--> LangGraph 编排 --> OpenAI-compatible Chat Completions
        |          |
        |          +--> Skill 激活 --> MCP 审批与执行
        |
        +--> Codex App Server --> ChatGPT subscription
                    |
                    +--> assistant/skills（extraRoots）
                    +--> dynamicTools --> 审批 --> Assistant HTTP MCP Client
```

ChatGPT 登录和订阅凭据只由 Assistant API 所在机器上的 Codex CLI 管理。手机端、Web 端和 MCP Server 都不会获得该凭据。

## Agent 编排

1. OpenAI-compatible 模式由 LangGraph 状态图编排，模型请求继续通过 Assistant 的模型 Provider 发出。
2. 首期图节点包含模型决策、工具分发、Skill 激活、MCP 审批与执行、结果收敛；节点之间只传递显式类型化状态。
3. Assistant 的 Tool Gateway 继续负责 MCP 发现、凭据、审批和调用，编排器不得把 MCP URL、Header 或 Token 写入模型上下文。
4. 单次运行必须限制模型轮次；达到上限、用户停止或请求中断后，以可展示的终止结果结束并清理待审批项。
5. SSE 事件和持久化消息结构保持 Provider 无关，客户端不感知 LangGraph 节点实现。
6. Codex 订阅模式首期继续作为独立专业执行器运行；后续多 Agent 编排通过统一执行器接口接入，不在 LangGraph 内重复实现 Codex 自身的 Agent 循环。
7. 后续在状态图上增加任务规划、专业 Agent、结果校验与文档落地节点；涉及副作用的工具调用始终经过 Assistant 审批边界。

## 用户流程

### 首次连接

1. 手机端输入可从手机网络访问的 Assistant API 地址。
2. 客户端请求 `/api/health` 验证服务。
3. API 地址保存在客户端本地存储；设置管理密钥保存在系统安全存储。

### 模型配置

1. 用户使用设置管理密钥解锁模型设置。
2. OpenAI-compatible 模式填写 Base URL、API Key、模型和系统提示词。
3. ChatGPT 订阅模式通过 Codex device-code 流程登录，并从 Codex App Server 获取可用模型。
4. OpenAI API Key 只写入 `assistant/config/model.json`，读取接口不返回明文。
5. ChatGPT 凭据只写入 `assistant/data/codex` 下的独立 `CODEX_HOME`，不进入模型配置文件。

### Skill

1. API 启动 Codex App Server 后，将 `assistant/skills` 注册为 `skills/extraRoots`。
2. Skill 使用标准 `SKILL.md` 格式，由 Codex 在对话中按描述自动发现和加载。
3. OpenAI-compatible 模式继续使用现有 Assistant Skill 提示词机制。

### MCP 配置与审批

1. 用户新增 MCP 名称、ID、Streamable HTTP URL 和请求头。
2. 可测试连接、查看工具数量、启停、编辑或删除 Server。
3. Assistant API 负责工具发现和调用；手机端和模型 Provider 均不直接访问 MCP。
4. MCP 请求头支持字面值，也支持由 API 进程展开的 `${ENV_NAME}`。
5. ChatGPT 订阅模式把已启用的 MCP 工具声明为 Codex `dynamicTools`，不复制 MCP URL 或 Token 到 Codex 配置。
6. Codex 与 OpenAI-compatible 请求调用动态工具时，统一交给 Tool Gateway 校验参数和判断审批策略。
7. 只读工具可自动执行；其他工具必须由用户批准后调用，拒绝、超时或会话终止时返回拒绝结果。
8. MCP 配置变更会使现有 Codex 会话绑定失效，下一条消息使用最新工具集启动新线程。

### 对话

1. 客户端创建或选择对话，通过 SSE 发送消息并接收增量事件。
2. OpenAI-compatible 模式由 LangGraph 状态图执行；ChatGPT 订阅模式由 Codex App Server 执行线程和轮次。
3. 文本、Skill、工具状态、审批结果和错误作为消息 part 回传并持久化。
4. 工具调用以独立 part 随助手消息持久化，与对话绑定；历史对话加载时按消息原样还原完整调用链，无需额外接口。
5. 同一对话同一时间只允许一个生成任务，不同对话可以并发。
6. 客户端断开、用户停止生成或审批超时后，API 终止对应轮次并清理待审批项。

## 审批事件协议

| 事件/接口 | 方向 | 用途 |
| --- | --- | --- |
| `approval-request` | SSE API → 客户端 | 展示 Server、工具名和参数，携带一次性审批 ID |
| `POST /api/approvals/:id` | 客户端 → API | 提交 `approved: true/false` |
| `approval-resolved` | SSE API → 客户端 | 更新审批结果并关闭交互界面 |

审批 ID 只在当前待处理调用中有效。重复提交、未知 ID 或已结束审批必须返回冲突或不存在。

## 工具调用链路展示

Web 端对话内以紧凑卡片展示每次工具调用，参考 DeepSeek Harness 的消息流样式：

- 卡片头部：状态标记（运行中 / 成功 / 失败）+ Server / 工具名 + 耗时（`durationMs`，历史消息缺失时不展示）。
- 参数区：JSON 可折叠展示，默认收起；过大参数由服务端截断为 preview。
- 结果区：可折叠展示，失败结果以错误色呈现。
- 运行中卡片显示进度标记，结束后由 `tool-result` 事件更新为终态。

数据与扩展性约定：

- 每次调用以 `callId` 为唯一键，贯穿 `tool-start` / `tool-result` 事件与持久化 tool part；未来新增按 Run 回放链路时，可直接按 `conversationId + runId` 聚合 `run_events` 或按 `callId` 关联消息 part，无需迁移历史数据。
- 链路展示只读依赖已持久化的消息 part 与 `run_events`，不新增专用存储。

## 配置与数据

| 文件 | 内容 | Git |
| --- | --- | --- |
| `assistant/.env` | API 端口、MongoDB 连接、设置管理密钥、可选 MCP Header 环境变量 | 忽略 |
| `assistant/config/model.json` | 当前 Provider、模型、OpenAI API Key、系统提示词 | 忽略 |
| `assistant/config/mcp.json` | HTTP MCP URL、Headers、启用状态 | 忽略 |
| MongoDB `conversations` | 会话、消息及 Codex thread ID | 独立数据库 |
| MongoDB `run_events` | Runtime 语义事件 | 独立数据库 |
| `assistant/data/codex/` | 独立 Codex 登录态和运行数据 | 忽略 |

Assistant 使用与 Nubbi Server 相同的 MongoDB 服务地址，但通过 `ASSISTANT_MONGO_DB_NAME` 选择独立数据库，默认数据库名为 `NubbiAssistant`。本地仓库运行时，Assistant 自身未配置 `MONGO_URI` 才读取 `server/.env` 中的同名变量作为回退；部署时仍可独立配置。Assistant 不导入 Server 的数据库模块，也不读取 Server 的业务集合。开发阶段不迁移或兼容旧的 `conversations.json` 和 `runs.jsonl`。

## 安全约束

- 模型、登录和 MCP 管理接口必须校验独立设置管理密钥。
- 模型 API Key、ChatGPT 凭据和 MCP Token 不返回客户端，也不进入提示词或工具参数。
- Codex 运行在独立空工作目录和只读沙箱中，默认不允许提权命令；Assistant 只开放显式注册的动态 MCP 工具。
- 生产环境使用 HTTPS 暴露 Assistant API 和 MCP。
- HTTP MCP URL 必须从 Assistant API 所在网络可访问。
- Assistant 不复用 Nubbi 用户 Session，也不绕过 Nubbi MCP Token 权限边界。

## 当前范围

- 支持 OpenAI-compatible Chat Completions + API Key。
- 支持 Codex CLI 的 ChatGPT device-code 登录与订阅模型。
- 支持本地 Agent Skill、Streamable HTTP MCP 和按工具语义执行的审批策略。
- 支持 Android/iOS Expo 客户端和备用 Web 客户端。
- 不伪造或导出 ChatGPT API Key；订阅能力依赖本机已安装且兼容的 Codex CLI。
- 本期仅审批 Assistant 动态 MCP 调用，不开放 Codex 文件写入或命令提权审批。

## 通用 Agent Runtime

Assistant 以 `RuntimeSession` 作为单次对话运行入口。Session 负责构建上下文、选择 Provider Executor、注册工具、发布事件、处理中止并提交最终消息；HTTP 路由只负责请求校验和 SSE 桥接。

- OpenAI-compatible 继续由 LangGraph 执行模型与工具循环。
- ChatGPT 订阅继续由 Codex App Server 执行 thread/turn，并通过相同 Tool Gateway 调用 MCP。
- 同一对话同一时间只允许一个 Run，不同对话可并发运行。
- 每个 Run 包含 `runId`、`conversationId`、`agentId` 和可选 `parentRunId`，首期只运行主 Agent。
- 生成任务只允许通过 `POST /api/conversations/:id/generations/stop` 按对话停止，不提供停止全部生成的兼容接口。

### Runtime 事件

所有运行事件携带 `eventId`、`runId`、`conversationId`、`sequence` 和 `timestamp`。事件覆盖 Run 生命周期、Skill 激活、工具调用、审批、工具结果与最终消息。`text-delta` 仅通过 SSE 实时发送，不写入运行日志；最终文本随消息和终止事件持久化。

`tool-result` 事件携带 `durationMs`（工具实际执行耗时，不含审批等待），同时写入持久化的 tool part；历史消息没有该字段时前端不展示耗时。事件携带 `callId`，客户端按 callId 关联 `tool-start` 与 `tool-result`，并发调用同一工具时不会错配。

语义事件以独立文档写入 MongoDB `run_events` 集合，会话与最终消息写入 `conversations` 集合。API 启动时，缺少终止事件的历史 Run 被追加标记为 `abandoned`，但不恢复模型请求或待审批操作。

### ContextBuilder

ContextBuilder 将已保存的消息转换成 Provider 无关上下文，保留用户与助手文本、Skill 记录和裁剪后的工具结果。默认预算为 60,000 字符，优先保留首个用户目标和最近消息；发生裁剪时必须加入明确提示。Codex thread 无法恢复时，使用该上下文重建新 thread 的首轮输入。

### Tool Gateway

Tool Gateway 是所有外部工具调用的唯一执行入口，统一负责工具查找、JSON Schema 参数校验、审批策略、调用、结果标准化和事件记录。

内置只读工具 `assistant_session_cache_stats`：模型可在对话中查询当前会话的 prompt 缓存命中率。数据来自模型 API usage 的 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`（如 DeepSeek），按对话累计持久化；返回 `{ hit_tokens, miss_tokens, hit_rate }`，`hit_rate` 为 0~1 浮点数。Provider 未返回缓存字段或 Codex 订阅模式（暂不采集 usage）时命中率返回 0。

- `readOnlyHint=true` 的工具可自动执行。
- 创建、修改、破坏性工具逐次审批。
- annotations 缺失或互相冲突时按写操作审批。
- 同一模型轮次的只读工具最多并发 4 个；写工具按声明顺序执行。
- 工具失败不自动重试，结构化错误交回模型处理。
- MCP URL、Header、Token 和模型密钥不得进入模型上下文、SSE 或 Run 日志。

### 对话总结 Skill

`conversation-summary` 是通用 Runtime 的首个落地示例。它在用户明确要求总结并保存当前对话时激活，生成包含用户目标、确认需求、关键决策、已完成事项、待办事项、风险问题、相关结果和下一步的 Markdown。

Skill 不绑定 Nubbi 或固定 MCP。Agent 根据可用工具描述和 Schema 选择文档创建或修改工具；用户未指定创建还是更新时先询问。写入仍经过 Tool Gateway 审批，没有可用文档工具时只在聊天中返回总结并说明未落地。
