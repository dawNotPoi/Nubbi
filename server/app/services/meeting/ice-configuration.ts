import { createHmac } from "node:crypto";
import env from "@/lib/env";

/** 可公开给已授权成员的 ICE 配置，不包含 TURN 共享密钥。 */
export type MeetingIceServer = { urls: string[]; username?: string; credential?: string };
const CREDENTIAL_LIFETIME_SECONDS = 3600;

/** @param raw 逗号分隔的地址。@param protocol 允许的协议。@returns 校验后的地址列表。 */
function readUrls(raw: string | undefined, protocol: RegExp): string[] {
  const urls = raw?.split(",").map((url) => url.trim()).filter(Boolean) ?? [];
  if (urls.some((url) => !protocol.test(url) || /[\s@]/.test(url))) {
    throw new Error("会议 ICE 服务器配置无效");
  }
  return urls;
}

/** @param userId 已授权的用户 ID。@returns 临时 ICE 配置；空配置允许局域网直连但不承诺跨网可用。 */
export function createMeetingIceConfiguration(userId: string): MeetingIceServer[] {
  const stunUrls = readUrls(env.MEETING_STUN_URLS, /^stuns?:[^/]+$/);
  const turnUrls = readUrls(env.MEETING_TURN_URLS, /^turns?:[^/]+$/);
  if (Boolean(turnUrls.length) !== Boolean(env.MEETING_TURN_SECRET)) {
    throw new Error("MEETING_TURN_URLS 和 MEETING_TURN_SECRET 必须同时配置");
  }
  const servers: MeetingIceServer[] = stunUrls.length ? [{ urls: stunUrls }] : [];
  if (turnUrls.length && env.MEETING_TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + CREDENTIAL_LIFETIME_SECONDS}:${userId}`;
    const credential = createHmac("sha1", env.MEETING_TURN_SECRET).update(username).digest("base64");
    servers.push({ urls: turnUrls, username, credential });
  }
  return servers;
}
