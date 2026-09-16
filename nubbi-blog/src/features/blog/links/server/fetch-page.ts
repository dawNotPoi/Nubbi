import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolvePublicAddress } from "./public-address";

type PageResponse = { html: string } | { redirect: string };
const MAX_BYTES = 192 * 1024;

/**
 * 固定连接至已验证 IP，仅读取有限 HTML，不携带 Cookie 或认证信息。
 * @param url 当前跳转地址。
 * @param signal 所有重定向共享的超时信号。
 * @returns HTML 头部或下一跳地址。
 */
async function readPage(url: URL, signal: AbortSignal): Promise<PageResponse> {
  const { address, family } = await resolvePublicAddress(url, signal);
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const outgoing = request(
      {
        hostname: address,
        family,
        servername: url.hostname,
        agent: false,
        port: url.protocol === "https:" ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        signal,
        headers: {
          Host: url.host,
          Accept: "text/html",
          "Accept-Encoding": "identity",
          "User-Agent": "NubbiBlogPreview/1.0",
        },
      },
      (response) => {
        if (
          [301, 302, 303, 307, 308].includes(response.statusCode || 0) &&
          response.headers.location
        ) {
          resolve({ redirect: response.headers.location });
          response.destroy();
          return;
        }
        if (
          response.statusCode !== 200 ||
          !/text\/html|application\/xhtml\+xml/i.test(
            response.headers["content-type"] || "",
          ) ||
          (response.headers["content-encoding"] &&
            response.headers["content-encoding"] !== "identity")
        ) {
          reject(new Error("目标页面无法解析"));
          response.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        /** 只保留头部，避免为预览下载整篇网页。 */
        const finish = (): void =>
          resolve({ html: Buffer.concat(chunks).toString("utf8") });
        response.on("data", (chunk: Buffer) => {
          const part = chunk.subarray(0, MAX_BYTES - size);
          chunks.push(part);
          size += part.length;
          if (
            size >= MAX_BYTES ||
            Buffer.concat(chunks)
              .toString("utf8")
              .toLowerCase()
              .includes("</head>")
          ) {
            finish();
            response.destroy();
          }
        });
        response.on("end", finish);
        response.on("error", reject);
      },
    );
    outgoing.on("error", reject);
    outgoing.end();
  });
}

/**
 * 每次重定向重新校验公网地址，并限制总时长与跳转次数。
 * @param href 外部 HTTP(S) 地址。
 * @returns 有限长度的网页 HTML。
 */
export async function fetchPreviewPage(href: string): Promise<string> {
  let url = new URL(href);
  const signal = AbortSignal.timeout(4500);
  for (let hop = 0; hop <= 3; hop++) {
    const result = await readPage(url, signal);
    if ("html" in result) return result.html;
    url = new URL(result.redirect, url);
  }
  throw new Error("页面跳转次数过多");
}
