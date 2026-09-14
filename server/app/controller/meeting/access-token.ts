import env from "@/lib/env";
import { jwtVerify, SignJWT } from "jose";

/** 会议访问令牌的签发者与受众标识 */
const TOKEN_ISSUER = "nubbi-meeting";
const TOKEN_AUDIENCE = "nubbi-meeting-socket";
const tokenSecret = new TextEncoder().encode(env.BETTER_AUTH_SECRET);

/** 会议访问授权结果 */
export type MeetingAccessGrant = {
  accessToken: string;
  expiresInSeconds: number;
};

/** 会议访问令牌的载荷声明 */
export type MeetingAccessClaims = {
  meetingId: string;
  userId: string;
};

type MeetingAccessTokenInput = MeetingAccessClaims & {
  expiresAt: number;
};

/** 签发会议访问令牌（HS256 JWT，有效期到会议结束） */
export async function issueMeetingAccessToken(
  input: MeetingAccessTokenInput,
): Promise<MeetingAccessGrant> {
  const nowSeconds = Math.floor(Date.now() / 1_000);
  const expirationTime = Math.max(
    nowSeconds + 1,
    Math.ceil(input.expiresAt / 1_000),
  );
  const expiresInSeconds = expirationTime - nowSeconds;
  const accessToken = await new SignJWT({ meetingId: input.meetingId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(tokenSecret);

  return { accessToken, expiresInSeconds };
}

/** 校验会议访问令牌，失败返回 null */
export async function verifyMeetingAccessToken(
  token: string,
): Promise<MeetingAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, tokenSecret, {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.meetingId !== "string") return null;

    return {
      meetingId: payload.meetingId,
      userId: payload.sub,
    };
  } catch {
    return null;
  }
}
