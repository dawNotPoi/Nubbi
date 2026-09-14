# 项目内 TURN 服务

使用固定版本 coturn 独立容器，不在 Node.js 中实现中继。后端只校验入会权限并签发短期凭证；媒体由浏览器直接发往 coturn，不经过 HTTP API。

## 本地启动

先启动 Docker Desktop 的 Linux 引擎，在项目根目录执行：

```bash
# 将地址替换成本机真实局域网 IPv4，不要原样使用示例地址。
pnpm turn:init --mode local --address 192.168.1.100
pnpm turn:check
pnpm turn:up
pnpm dev:server
```

初始化生成被 Git 忽略的 `turn/.env` 和随机 256 位密钥，不输出密钥，也不会覆盖现有配置。文件已存在时请手动修改；不要反复生成不同密钥给两端。

`--address` 必须显式指定，不自动猜测网卡；Windows 可用 `ipconfig` 查找 Wi-Fi/以太网 IPv4。避免使用 `127.0.0.1`、Docker 虚拟网卡地址或容器名 `turn`：浏览器需要能访问这个地址。

本地模式仅额外允许中继主机自身的地址作为私网目标，以支持双方都走本机中继；其他私网目标仍被拒绝。普通局域网直连不受此 TURN 规则影响。

浏览器页面仍需 HTTPS 或 `localhost` 安全上下文；手机访问普通 `http://局域网IP` 可能无法申请摄像头，和 TURN 是否运行是两回事。Docker Desktop 的 UDP/NAT/回环行为依平台不同，本地失败应分别验证端口映射和两台设备，不承诺等同于生产网络。

## 一起部署

在服务器上首次初始化生产配置（与本地配置分开，不上传本地密钥）：

```bash
pnpm turn:init --mode production --address <真实公网IPv4> --host <TURN域名>
```

现有 `scripts/deploy-docker.sh` 在部署后端且发现 `turn/.env` 时，自动构建、校验并启动 coturn。代码或配置未变化时不会因为后端重启而再次主动停止 TURN；中继自身升级仍可能中断通话，安排维护窗口。

也可以自行启动整套服务：

```bash
docker compose --profile meeting up -d --build
```

Compose 要求至少 v2.24（可选 `env_file` 支持）。未初始化 TURN 的环境保持原有部署范围；此时 `docker compose up` 不会启动 `meeting` profile。

GitHub Actions 会把 `turn/` 的代码改动纳入后端发布；发布包排除 `turn/.env` 和证书，服务器切换发布目录时保留已有文件。首次部署前必须在服务器创建配置，CI 不会猜公网 IP、替你申请证书或随机轮换已有密钥。

## 地址、端口与 TLS

容器端口和宿主机端口保持一致：

| 端口 | 用途 |
|------|------|
| `3478/udp`、`3478/tcp` | STUN/TURN 客户端入口 |
| `49160–49200/udp` | 媒体中继分配端口 |
| `5349/tcp` | 开启 TLS 后的 TURN TLS 入口 |

云安全组、系统防火墙和上游 NAT 均需放行；NAT 必须保持中继端口一对一映射。`TURN_EXTERNAL_IP` 是浏览器可达的公网地址，不是容器私有 IP。这套配置面向单 IPv4 中继；多网卡/多公网映射需要专门调整。

普通 HTTP 反向代理不能代理这些 UDP/TURN 端口。若 TURN 域名经过 CDN，应使用能直达中继的 DNS 记录或专门支持 TURN 的四层服务。

需要 TLS 时，把与 TURN 域名匹配的证书链和私钥放到：

```text
turn/certs/tls.crt
turn/certs/tls.key
```

初始化时增加 `--tls`。已有配置则设置 `TURN_TLS_ENABLED=true`，并在 `MEETING_TURN_URLS` 中添加 `turns:你的域名:5349?transport=tcp`。文件必须可被容器 UID/GID `65534` 读取，私钥不要设为所有用户可读；缺少证书时启动会失败，不会静默降级。证书更新后执行 `docker compose restart turn` 重新加载。

## 后端如何读取

`turn/.env` 是自托管 TURN 的配置来源：Compose 同时注入后端和 coturn；本地 `pnpm dev:server` 也会读取它。它优先于 `server/.env` 中重复的 TURN 字段，显式进程环境仍优先。不要同时在外部环境覆盖成不同密钥。

`MEETING_TURN_SECRET` 只用于 HMAC 签名，不会发送给浏览器。不要运行并分享包含完整环境值的 `docker compose config` / `docker inspect` 输出；静态检查用 `docker compose --profile meeting config --quiet`。

配额与带宽在 `turn/.env` 中显式设置：初始化值为每临时用户名 12 个分配、总计 120 个分配、每分配 1 MiB/s、全局 12,500,000 字节/s（入出方向分别计）。这是初始限制，不代表服务器实际拥有该带宽；按服务器规格调整。中继端口池只有 41 个端口，实际容量也受端口池制约。临时用户名可能随凭证刷新变化，不能将该配额当成永久账户限额。

## 检查与关闭

```bash
pnpm turn:logs
docker compose ps turn
pnpm turn:down
```

`turn:down` 只停止 TURN，不停止网站、数据库或其他服务。

`turn:check` 仅验证配置字段和证书文件；容器健康检查仅验证本地 STUN 响应。上线验收还需验证有效凭证能分配中继、无效凭证被拒绝，以及两端强制中继时实际有媒体数据流量；候选列表出现 `relay` 不能单独证明媒体通路已打通。
