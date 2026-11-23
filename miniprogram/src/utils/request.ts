import Taro from '@tarojs/taro';

import { clearToken, getAuth } from '../stores/auth';

/**
 * Taro.request 统一封装：
 * - baseURL：环境变量 TARO_APP_API（默认本地后端）
 * - 自动注入 Authorization: Bearer <token>
 * - 响应按后端契约 {code,message,data} 解包，code!==0 抛 ApiError(message)
 * - HTTP 401：清 token 并跳登录页
 */

const BASE_URL = process.env.TARO_APP_API || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  header?: Record<string, string>;
  body?: unknown;
}

/** 未登录/登录过期 → 清 token 并回到登录页 */
function redirectToLogin(): void {
  clearToken();
  Taro.reLaunch({ url: '/pages/login/index' });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const header: Record<string, string> = { ...(options.header ?? {}) };
  if (options.body !== undefined) {
    header['Content-Type'] = 'application/json';
  }
  const token = getAuth().token;
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  let response: Taro.request.SuccessCallbackResult<unknown>;
  try {
    response = await Taro.request({
      url: `${BASE_URL}${path}`,
      method: options.method ?? 'GET',
      header,
      data: options.body,
    });
  } catch (error) {
    // 网络层失败：Taro.request reject 的通常是 errMsg 字符串
    throw new ApiError(-1, '网络请求失败，请稍后重试', 0, error);
  }

  const status = response.statusCode;
  const body = (response.data ?? {}) as {
    code?: number;
    message?: string;
    data?: unknown;
    details?: unknown;
  };

  if (status === 401) {
    redirectToLogin();
    throw new ApiError(
      body.code ?? -1,
      body.message ?? '登录已过期，请重新登录',
      status,
      body.details,
    );
  }

  if (status < 200 || status >= 300 || (body.code !== undefined && body.code !== 0)) {
    throw new ApiError(
      body.code ?? -1,
      body.message ?? `请求失败（${status}）`,
      status,
      body.details,
    );
  }

  return body.data as T;
}
