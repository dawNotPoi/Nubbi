import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 项目自行维护中文 Agent 规范，避免开发命令反复改写文档。
  agentRules: false,
  /**
   * 保留 Dawn 的旧首页入口。
   * @returns 兼容旧链接的重定向规则。
   */
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: true }];
  },
};

export default nextConfig;
