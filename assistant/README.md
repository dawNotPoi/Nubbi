# Nubbi Assistant

Nubbi Assistant 是一个以手机 App 为主要入口的个人 AI 助手。手机端使用 Expo + React Native，服务端负责会话、模型调用、本地 Skill、远程 HTTP MCP 和逐次工具审批。

## 项目结构

- `mobile`：Android/iOS 客户端（Expo + React Native）
- `web`：桌面浏览器备用客户端
- `api`：Express API、LangGraph Agent 编排、Codex App Server 和 MCP 调用
- `config`：服务端模型与 MCP 运行配置
- `skills`：本地 Agent Skill
- `data`：本地会话与独立 Codex 登录数据

## 启动服务

运行环境需要 Node.js 20 或更高版本。

```powershell
Copy-Item assistant/.env.example assistant/.env
Copy-Item assistant/config/mcp.example.json assistant/config/mcp.json
pnpm install
pnpm dev:assistant
```

在 `assistant/.env` 中设置 `CONFIG_ADMIN_TOKEN`。它只用于保护模型登录与 MCP 管理接口，不是模型 API Key。

- Web：`http://localhost:5174`
- API：`http://localhost:8787`

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

## HTTP MCP 配置

MCP 仅支持 Streamable HTTP。在“设置 → MCP”中填写：

- 名称和 ID
- MCP HTTP URL，例如 `https://example.com/mcp`
- 请求头，例如 `Authorization: Bearer ${NUBBI_MCP_TOKEN}`
- 启用状态

请求头支持 `${ENV_NAME}` 占位符，由 Assistant API 进程读取环境变量。直接填写的 Token 保存在忽略提交的 `assistant/config/mcp.json`。

MCP 请求始终由 Assistant API 发出，不是由手机或外部模型公司发出。订阅模式只把工具名和 JSON Schema 暴露给 Codex；URL、Header 和 Token 不进入 Codex 配置。

## 工具审批

OpenAI-compatible 与 ChatGPT 订阅模式调用 MCP 前都会向当前客户端发送一次性审批事件。用户可以查看 Server、工具名和参数，选择“允许一次”或“拒绝”。只有批准后，Assistant API 才会请求 MCP；审批不会被永久记住，超时或停止生成会自动拒绝。

## 构建安装包

Expo Go 适合快速真机调试。发布 APK/AAB 或 IPA 可使用 EAS Build：

```powershell
cd assistant/mobile
pnpm dlx eas-cli build --platform android
pnpm dlx eas-cli build --platform ios
```

iOS 本机构建需要 macOS 和 Xcode；EAS 可执行云构建，但仍需要 Apple 开发者签名。
