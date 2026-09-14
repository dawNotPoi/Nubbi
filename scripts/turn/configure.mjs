import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { parseArgs } from "node:util";

/** @param address 显式输入的 IPv4。@returns 是否属于本地、链路或运营商共享地址。 */
function isPrivateAddress(address) {
  const [first, second] = address.split(".").map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) || (first === 169 && second === 254) ||
    (first === 100 && second >= 64 && second <= 127);
}

/** @returns 无；地址必须由用户给出，随机密钥只写入被忽略的配置文件，不覆盖现有文件。 */
function configureTurn() {
  const { values } = parseArgs({ options: { mode: { type: "string" }, address: { type: "string" }, host: { type: "string" }, tls: { type: "boolean" } } });
  const { mode, address, tls } = values;
  if (!["local", "production"].includes(mode) || isIP(address ?? "") !== 4) {
    throw new Error("用法：pnpm turn:init --mode local|production --address <实际IPv4> [--host <域名>] [--tls]");
  }
  const first = Number(address.split(".")[0]);
  if (first === 0 || first === 127 || first >= 224) throw new Error("请使用本机局域网或服务器公网 IPv4，不使用环回地址。");
  if (mode === "production" && isPrivateAddress(address)) throw new Error("生产模式必须填写服务器对外映射的公网 IPv4。");
  const host = values.host ?? address;
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host)) throw new Error("host 必须是可解析到此服务器的域名或 IPv4。");
  const urls = [`turn:${host}:3478?transport=udp`, `turn:${host}:3478?transport=tcp`];
  if (tls) urls.push(`turns:${host}:5349?transport=tcp`);
  const settings = {
    TURN_MODE: mode, TURN_EXTERNAL_IP: address, TURN_REALM: host, TURN_TLS_ENABLED: Boolean(tls),
    TURN_ALLOWED_PEER_IP: mode === "local" ? address : "",
    MEETING_STUN_URLS: `stun:${host}:3478`, MEETING_TURN_URLS: urls.join(","), MEETING_TURN_SECRET: randomBytes(32).toString("hex"),
    TURN_USER_QUOTA: 12, TURN_TOTAL_QUOTA: 120, TURN_MAX_BPS: 1048576, TURN_BPS_CAPACITY: 12500000,
  };
  const content = "# 此文件包含密钥，不得提交。地址由初始化命令显式指定。\n" + Object.entries(settings).map(([name, value]) => `${name}=${value}`).join("\n") + "\n";
  writeFileSync(new URL("../../turn/.env", import.meta.url), content, { flag: "wx", mode: 0o600 });
  console.log("已生成 turn/.env（密钥未输出）。确认配额与带宽后运行 pnpm turn:up，再重启后端。");
}

try { configureTurn(); } catch (error) {
  console.error(error?.code === "EEXIST" ? "turn/.env 已存在，未覆盖。请手动调整现有配置。" : error.message);
  process.exitCode = 1;
}
