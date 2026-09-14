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
6. Codex 请求调用动态工具时，Assistant API 创建待审批事件并通过 SSE 发给当前客户端。
7. 用户批准后，Assistant API 才调用 HTTP MCP；拒绝、超时或会话终止时返回拒绝结果。
8. MCP 配置变更会使现有 Codex 会话绑定失效，下一条消息使用最新工具集启动新线程。

### 对话

1. 客户端创建或选择对话，通过 SSE 发送消息并接收增量事件。
2. OpenAI-compatible 模式由 LangGraph 状态图执行；ChatGPT 订阅模式由 Codex App Server 执行线程和轮次。
3. 文本、Skill、工具状态、审批结果和错误作为消息 part 回传并持久化。
4. 第一版同一时间只允许一个生成任务。
5. 客户端断开、用户停止生成或审批超时后，API 终止对应轮次并清理待审批项。

## 审批事件协议

| 事件/接口 | 方向 | 用途 |
| --- | --- | --- |
| `approval-request` | SSE API → 客户端 | 展示 Server、工具名和参数，携带一次性审批 ID |
| `POST /api/approvals/:id` | 客户端 → API | 提交 `approved: true/false` |
| `approval-resolved` | SSE API → 客户端 | 更新审批结果并关闭交互界面 |

审批 ID 只在当前待处理调用中有效。重复提交、未知 ID 或已结束审批必须返回冲突或不存在。

## 配置与数据

| 文件 | 内容 | Git |
| --- | --- | --- |
| `assistant/.env` | API 端口、设置管理密钥、可选 MCP Header 环境变量 | 忽略 |
| `assistant/config/model.json` | 当前 Provider、模型、OpenAI API Key、系统提示词 | 忽略 |
| `assistant/config/mcp.json` | HTTP MCP URL、Headers、启用状态 | 忽略 |
| `assistant/data/conversations.json` | 本地会话及 Codex thread ID | 忽略 |
| `assistant/data/codex/` | 独立 Codex 登录态和运行数据 | 忽略 |

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
- 支持本地 Agent Skill、Streamable HTTP MCP 和逐次工具审批。
- 支持 Android/iOS Expo 客户端和备用 Web 客户端。
- 不伪造或导出 ChatGPT API Key；订阅能力依赖本机已安装且兼容的 Codex CLI。
- 本期仅审批 Assistant 动态 MCP 调用，不开放 Codex 文件写入或命令提权审批。
