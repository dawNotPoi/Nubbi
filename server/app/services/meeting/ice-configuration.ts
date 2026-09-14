import { createHmac } from "node:crypto";
import env from "@/lib/env";

/** 可公开给已授权成员的 ICE 配置，不包含 TURN 共享密钥。 */
export type MeetingIceServer = {
  urls: string[];
  username?: string;
  /** 临时认证值，不是长期共享密钥。 */
  credential?: string;
};
const CREDENTIAL_LIFETIME_SECONDS = 3600;

/**
 * @param raw 逗号分隔的地址。@param protocol 允许的协议。@returns 校验后的地址列表。
 */
function parseIceServerUrls(raw: string | undefined, protocol: RegExp): string[] {
  const urls = raw?.split(",").map((url) => url.trim()).filter(Boolean) ?? [];
  if (urls.some((url) => !protocol.test(url) || /[\s@]/.test(url))) {
    throw new Error("会议 ICE 服务器配置无效");
  }
  return urls;
}

/**
 * 按 coturn 的 REST 凭证约定签名，只返回可临时使用的认证信息。
 * @param userId 已授权的用户 ID。
 * @param sharedSecret 与 coturn 一致的长期密钥，仅用于服务端签名。
 * @returns 含到期时间的用户名及对应 HMAC 密码，不含共享密钥。
 */
function createTurnCredentials(userId: string, sharedSecret: string): { username: string; credential: string } {
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + CREDENTIAL_LIFETIME_SECONDS;
  const username = `${expiresAtSeconds}:${userId}`;
  const credential = createHmac("sha1", sharedSecret).update(username).digest("base64");
  return { username, credential };
}

/**
 * 每次授权入会或媒体重建时生成当前成员专属的 ICE 配置。
 * @param userId 已授权的用户 ID，不能直接使用客户端自报身份。
 * @returns 临时 ICE 配置；空配置允许局域网直连但不承诺跨网可用。
 */
export function createMeetingIceConfiguration(userId: string): MeetingIceServer[] {
  const stunUrls = parseIceServerUrls(env.MEETING_STUN_URLS, /^stuns?:[^/]+$/);
  const turnUrls = parseIceServerUrls(env.MEETING_TURN_URLS, /^turns?:[^/]+$/);
  const sharedSecret = env.MEETING_TURN_SECRET;
  if (Boolean(turnUrls.length) !== Boolean(sharedSecret)) {
    throw new Error("MEETING_TURN_URLS 和 MEETING_TURN_SECRET 必须同时配置");
  }
  const iceServers: MeetingIceServer[] = stunUrls.length ? [{ urls: stunUrls }] : [];
  if (turnUrls.length && sharedSecret) {
    iceServers.push({ urls: turnUrls, ...createTurnCredentials(userId, sharedSecret) });
  }
  return iceServers;
}
