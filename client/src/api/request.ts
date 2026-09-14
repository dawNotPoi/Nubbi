import { authClient } from "@/utils/auth";

const baseUrl = import.meta.env.VITE_API_URL;

// 获取认证 token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const session = await authClient.getSession();
    return session.data?.session.token || null;
  } catch {
    return null;
  }
};

export default async function request<T>(
  url: string,
  body?: any,
  method = "post",
  init?: any,
): Promise<{
  code: 0 | 1;
  data: T;
  message: string;
}> {
  //header文件由外部传入，设置json格式会导致不兼容formdata
  // 获取认证 token
  const token = await getAuthToken();
  const config = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), // 添加认证头
    },
    ...init,
  };
  if (body) config.body = JSON.stringify(body);
  const pathUrl = url.startsWith("/") ? url : "/" + url;

  try {
    const response = await fetch(baseUrl + pathUrl, config);

    // 处理认证失败的情况
    if (response.status === 401) {
      // 清除本地认证信息
      await authClient.signOut();
      // 重定向到登录页面
      const returnTo = encodeURIComponent(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
      window.location.href = `/login?returnTo=${returnTo}`;
      throw new Error("认证失败，请重新登录");
    }

    return await response.json();
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
}

export async function requestWithNoJson<T>(
  url: string,
  body?: any,
  method = "post",
  init?: any,
): Promise<{
  code: 0 | 1;
  data: T;
  message: string;
}> {
  const token = await getAuthToken();
  //header文件由外部传入，设置json格式会导致不兼容formdata
  const config = {
    method,
    credentials: "include",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }), // 添加认证头
    },
    ...init,
  };
  if (body) config.body = body;
  const pathUrl = url.startsWith("/") ? url : "/" + url;
  return fetch(baseUrl + pathUrl, config).then((res) => res.json());
}

export function Get<T = any>(
  url: string,
  params?: { [key: string]: any },
  options?: any,
): Promise<{
  code: 0 | 1;
  data: T;
  message: string;
}> {
  const pathUrl = url.startsWith("/") ? url : "/" + url;
  let ResultUrl = baseUrl + pathUrl;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      // 支持数组和基本类型
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    if (searchParams.toString()) {
      ResultUrl += `?${searchParams.toString()}`;
    }
  }

  return fetch(ResultUrl, {
    method: "GET",
    credentials: "include",
    ...options,
  }).then((res) => res.json());
}

export function getWebData() {
  return request("admin/info", null, "get");
}
