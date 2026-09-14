# Nubbi Assistant

Nubbi Assistant 是一个以手机 App 为主要入口的个人 AI 助手。手机端使用 Expo + React Native，服务端负责会话、模型调用、本地 Skill、HTTP/stdio MCP 和按工具语义执行的审批策略。

## 项目结构

- `mobile`：Android/iOS 客户端（Expo + React Native）
- `web`：桌面浏览器备用客户端
- `api`：NestJS + Fastify API、自有 Agent Loop、Codex App Server 和 MCP 调用
- `shared`：私有 workspace 包，提供三端协议、SSE 解析及平台无关客户端逻辑
- `config`：服务端模型与 MCP 运行配置
- `skills`：本地 Agent Skill
- `data`：独立 Codex 登录数据；会话和 Run 事件存储在 MongoDB

## 启动服务

运行环境需要 Node.js 20 或更高版本。

```powershell
Copy-Item assistant/.env.example assistant/.env
Copy-Item assistant/config/mcp.example.json assistant/config/mcp.json
pnpm install
pnpm dev:assistant
```

在 `assistant/.env` 中设置 MongoDB 和 `CONFIG_ADMIN_TOKEN`。`MONGO_URI` 必须显式填写，可以从 `server/.env` 复制远程连接，但运行时不会读取主服务配置或使用默认地址；未填写时启动失败。Assistant 始终通过 `ASSISTANT_MONGO_DB_NAME` 使用独立数据库，默认是 `NubbiAssistant`。`CONFIG_ADMIN_TOKEN` 只用于保护模型登录与 MCP 管理接口，不是模型 API Key。

- Web：`http://localhost:5174`
- API：`http://localhost:8787`

本地后端日志会附加 `绝对路径:行号:列号`，在 VS Code 集成终端中可按住 Ctrl 点击跳转到日志调用处。继续使用 Nest 的 `Logger.log(...)` 或 `new Logger("模块名")` 即可；新增日志不要使用 `console.log`，它不会经过统一日志器。`NODE_ENV` 未设置或为 `development` 时启用定位，`production` 和 `test` 时不采集调用位置。框架内部日志不附加业务源码位置，错误日志仍保留原始异常堆栈。

## 手机真机测试

1. 在 Android 或 iPhone 安装 Expo Go。
2. 电脑和手机连接同一个局域网。
3. 在项目根目录运行 `pnpm dev:assistant:api`。
4. 另开终端运行 `pnpm dev:assistant:mobile`，用手机扫描二维码。
5. App 首次打开时输入电脑局域网地址，例如 `http://192.168.1.10:8787`。

手机中的 `localhost` 指向手机本身。连接失败时，确认 Windows 防火墙允许 Node.js 或 TCP 端口 `8787` 入站。

## 模型配置

在手机 App 的“设置 → 模型”中选择一种来源：

### OpenAI-compatible API

- 填写 Base URL 和 API Key。
- 从 Provider 的 `/models` 接口获取模型，或手动填写模型 ID。
- API Key 只保存在 `assistant/config/model.json`，读取配置时不会返回明文。

### ChatGPT 订阅

1. 确认 Assistant API 所在设备已安装 `codex` CLI，建议使用与当前项目验证版本兼容的最新版。
2. 选择“ChatGPT 订阅”，点击“登录 ChatGPT”。
3. App 会打开浏览器并显示一次性设备代码；在浏览器完成登录。
4. App 自动轮询登录结果，并在成功后加载可用模型。
5. 选择模型并保存配置。

ChatGPT 登录凭据位于 `assistant/data/codex/` 的独立 `CODEX_HOME`，不会发送到手机，也不会写入 `model.json`。ChatGPT 订阅不能导出为 OpenAI API Key，本项目通过 Codex App Server 使用订阅能力。

## Skill

每个 Skill 放在 `assistant/skills/<skill-name>/SKILL.md`。API 启动 Codex App Server 时，会把 `assistant/skills` 注册为额外 Skill 根目录；订阅模式由 Codex 自动发现和按需加载，API Key 模式使用 Assistant 自己的 Skill 激活工具。

## MCP 配置

MCP 支持 Streamable HTTP 和 stdio。在“设置 → MCP”中选择传输方式并填写：

- 名称和 ID
- HTTP：MCP URL，例如 `https://example.com/mcp`；请求头，例如 `Authorization: Bearer ${NUBBI_MCP_TOKEN}`
- stdio：服务端本地命令、参数、工作目录及环境变量；进程运行在 Assistant API 所在设备，不在手机上
- 启用状态

HTTP 请求头和 stdio 配置中的环境变量占位符 `${ENV_NAME}` 由 Assistant API 进程展开。直接填写的 Token 保存在忽略提交的 `assistant/config/mcp.json`。连接按配置复用，空闲后回收。

MCP 请求始终由 Assistant API 发出，不是由手机或外部模型公司发出。订阅模式只把工具名和 JSON Schema 暴露给 Codex；URL、Header 和 Token 不进入 Codex 配置。

## 工具审批

OpenAI-compatible 与 ChatGPT 订阅模式共用 `ToolExecutor`。参数必须先通过 JSON 对象解析和 JSON Schema 校验；无效参数直接返回工具错误，不进入审批或执行。MCP 声明 `readOnlyHint=true` 且不具有破坏性的工具会自动执行；创建、修改、破坏性工具以及缺少 annotations 的工具会向当前客户端发送一次性审批事件。用户可以查看 Server、工具名和参数，选择“允许一次”或“拒绝”。审批不会被永久记住，超时或停止生成会自动拒绝。

只读工具最多四路并发，写工具串行；排队中的操作支持取消，不自动重试写操作。Nubbi 笔记的专用审批文案位于 `api/src/integrations/nubbi`，不进入通用执行器。

## Agent Runtime

每条用户消息创建一个带 `runId` 的任务，由 `RunCoordinator` 协调。Runtime 负责并发、取消、事件发布及结果保存；同一对话只运行一个任务，不同对话可以并发。

- `AgentExecutor.executeRun()` 执行完整任务：自有 Loop 和 Codex 各有一个实现。Codex 是完整任务执行器，不是单轮模型适配器。
- `ModelAdapter.generateTurn()` 仅生成模型一轮：接收统一消息及工具定义，返回有序内容块、工具调用、结束原因和用量，通过回调发布流式增量。
- 模型连接配置在 Runtime 组装适配器时注入，Agent Loop 不接收密钥、Base URL 或厂商协议字段。协议续接数据只由适配器解释，不混入前端消息。

已输出的文本、推理和工具记录按事件顺序保存，失败与取消也保留已产生的内容。流式断流、截断与正常结束分开处理。用量按模型轮次汇总；未报告时保留未知值，不按字符数伪造精确 token。Codex 模式当前未采集供应商用量，返回 `null`。

语义事件保存在 Assistant 独立 MongoDB 数据库的 `run_events` 集合，最终消息和对话保存在 `conversations` 集合。开发阶段不迁移旧的本地 JSON/JSONL 数据。可以通过以下接口查看运行记录：

- `GET /api/conversations/:id/runs`
- `GET /api/runs/:runId/events`

生成任务通过 `POST /api/conversations/:id/generations/stop` 按对话停止，不提供全局停止接口。

实时文本增量不会写入 Run 日志，MCP URL、Header、Token 和模型密钥也不会进入事件或模型上下文。

内置 `conversation-summary` Skill 可将当前对话整理为固定结构的 Markdown。用户要求落地时，Agent 会从全部已启用 MCP 中自行选择合适的文档工具；它不绑定 Nubbi，也没有独立预览页面。写入动作仍需按工具执行器的策略审批。

## 代码阅读顺序

1. `shared/src/contracts`：先读持久化消息、配置、审批和运行事件。客户端临时消息的 `running` 状态位于 `shared/src/client/message-state.ts`，不进入数据库协议。
2. `api/src/features/conversations` → `api/src/runtime/run-coordinator.ts` → `execute-run.ts`：跟踪 HTTP 请求如何成为任务、如何取消和保存结果。其他业务模块同样按 Controller、Service、Repository 分工。
3. `api/src/agent/agent-loop.ts` → `api/src/llm/model-adapter.ts` → `llm/chat-completions`：理解协议无关循环和单轮适配器的边界。请求转换、响应累积与共享 SSE 分帧分别实现。
4. `api/src/tools` → `api/src/integrations`：工具定义、校验、审批、调度与执行分开；MCP 管连接/发现/调用，Codex 管进程/RPC/线程/通知/动态工具，通过注入接口存取线程信息。
5. `shared/src/client/chat-session.ts` → 两端 `features/chat`：共同状态机处理请求身份、运行身份、工具结果匹配及用量归并；Web/Mobile 各自提供 React Hook 和视图，不共享平台组件。
6. 两端 `features/settings`、Web `features/trace`：设置表单、账号状态、运行事件归并、历史请求和回放控制按职责拆分。

公共包通过 `@nubbi/assistant-shared/contracts`、`/streaming`、`/client` 三个入口使用，不依赖 React、React Native、NestJS 或数据库。Web 注入浏览器 `fetch`，Mobile 注入 `expo/fetch`；密钥存取和弹窗留在各平台。仓库内源码使用 `.ts`/`.tsx` 导入，原有启动命令不变。

## 本地检查

在仓库根目录执行：

```powershell
pnpm build:assistant
pnpm --filter nubbi-assistant-web lint
```

第一条命令构建 Web 并检查 API、Mobile 类型。实际对话、MCP 连通性、Codex 登录续接和手机交互需要本机配置及真实运行环境，类型检查和离线打包不能替代这些验证。仓库不维护新增测试文件；模拟回归使用仓库外临时脚本，避免真实模型和写工具调用。

## 构建安装包

Expo Go 适合快速真机调试。发布 APK/AAB 或 IPA 可使用 EAS Build：

```powershell
cd assistant/mobile
pnpm dlx eas-cli build --platform android
pnpm dlx eas-cli build --platform ios
```

iOS 本机构建需要 macOS 和 Xcode；EAS 可执行云构建，但仍需要 Apple 开发者签名。
