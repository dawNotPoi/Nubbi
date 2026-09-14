import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { parseArgs } from "node:util";

/**
 * 已校验的初始化输入，不自动探测网卡或补入默认服务器地址。
 * @typedef {object} TurnInitializationOptions
 * @property {"local" | "production"} mode 本地验证或公网部署模式。
 * @property {string} address 浏览器实际可达的 IPv4。
 * @property {string} host 生成 STUN/TURN 地址时使用的主机名。
 * @property {boolean} tlsEnabled 是否要求提供 TLS 证书。
 */

/**
 * 检查不能作为生产公网映射地址的常见私网范围。
 * @param {string} address 已确认格式合法的 IPv4。
 * @returns {boolean} 是否属于本地、链路或运营商共享地址。
 */
function isPrivateAddress(address) {
  const [firstOctet, secondOctet] = address.split(".").map(Number);
  return firstOctet === 10 ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168) ||
    (firstOctet === 169 && secondOctet === 254) ||
    (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127);
}

/**
 * 读取并校验命令参数，不创建文件或生成密钥。
 * @returns {TurnInitializationOptions} 可以用于生成服务配置的显式输入。
 */
function readInitializationOptions() {
  const { values } = parseArgs({
    options: {
      mode: { type: "string" },
      address: { type: "string" },
      host: { type: "string" },
      tls: { type: "boolean" },
    },
  });
  const { mode, address } = values;
  if ((mode !== "local" && mode !== "production") || !address || isIP(address) !== 4) {
    throw new Error("用法：pnpm turn:init --mode local|production --address <实际IPv4> [--host <域名>] [--tls]");
  }

  const firstOctet = Number(address.split(".")[0]);
  if (firstOctet === 0 || firstOctet === 127 || firstOctet >= 224) {
    throw new Error("请使用本机局域网或服务器公网 IPv4，不使用环回地址。");
  }
  if (mode === "production" && isPrivateAddress(address)) {
    throw new Error("生产模式必须填写服务器对外映射的公网 IPv4。");
  }

  // 不单独指定域名时使用用户刚刚传入的地址，而不是隐式回退到 localhost。
  const host = values.host ?? address;
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host)) {
    throw new Error("host 必须是可解析到此服务器的域名或 IPv4。");
  }
  return { mode, address, host, tlsEnabled: Boolean(values.tls) };
}

/**
 * 组装 coturn 和后端共用的字段；每次初始化只生成一份随机密钥。
 * @param {TurnInitializationOptions} options 已校验的初始化输入。
 * @returns {Record<string, string | number | boolean>} 包含密钥的环境配置，仅可交给文件写入步骤。
 */
function createEnvironmentSettings(options) {
  const { mode, address, host, tlsEnabled } = options;
  const turnUrls = [
    `turn:${host}:3478?transport=udp`,
    `turn:${host}:3478?transport=tcp`,
  ];
  if (tlsEnabled) turnUrls.push(`turns:${host}:5349?transport=tcp`);

  return {
    TURN_MODE: mode,
    TURN_EXTERNAL_IP: address,
    TURN_REALM: host,
    TURN_TLS_ENABLED: tlsEnabled,
    // 仅本地模式放行当前中继主机，生产配置不开放额外私网目标。
    TURN_ALLOWED_PEER_IP: mode === "local" ? address : "",
    MEETING_STUN_URLS: `stun:${host}:3478`,
    MEETING_TURN_URLS: turnUrls.join(","),
    MEETING_TURN_SECRET: randomBytes(32).toString("hex"),
    // 初始容量不是服务器性能承诺；带宽字段单位为字节/秒，生成后按实际规格调整。
    TURN_USER_QUOTA: 12,
    TURN_TOTAL_QUOTA: 120,
    TURN_MAX_BPS: 1048576,
    TURN_BPS_CAPACITY: 12500000,
  };
}

/**
 * 写入独立环境文件，已有文件必须由用户手动调整，避免轮换运行中的密钥。
 * @param {Record<string, string | number | boolean>} settings 已组装的共享环境配置。
 * @returns {void} 文件只写一次；失败不输出配置内容。
 */
function writeEnvironmentFile(settings) {
  const warning = "# 此文件包含密钥，不得提交。地址由初始化命令显式指定。\n";
  const lines = Object.entries(settings).map(([name, value]) => `${name}=${value}`);
  const content = warning + lines.join("\n") + "\n";
  writeFileSync(new URL("../../turn/.env", import.meta.url), content, {
    flag: "wx",
    mode: 0o600,
  });
}

/**
 * @returns {void} 按校验、生成、写入的顺序初始化，日志只说明结果，不输出密钥。
 */
function configureTurn() {
  const options = readInitializationOptions();
  const settings = createEnvironmentSettings(options);
  writeEnvironmentFile(settings);
  console.log("已生成 turn/.env（密钥未输出）。确认配额与带宽后运行 pnpm turn:up，再重启后端。");
}

try {
  configureTurn();
} catch (error) {
  const isExistingFile = error instanceof Error && "code" in error && error.code === "EEXIST";
  const message = isExistingFile
    ? "turn/.env 已存在，未覆盖。请手动调整现有配置。"
    : error instanceof Error ? error.message : "初始化 TURN 配置失败。";
  console.error(message);
  process.exitCode = 1;
}
