const BASE_URL = '/api/v1';
const AUTH_STORAGE_KEY = 'family-auth';

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
  body?: unknown;
}

/** 从持久化 store 中读取 token（避免与 store 循环依赖） */
function readToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = readToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body: { code?: number; message?: string; data?: unknown; details?: unknown } = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }

  if (!response.ok || (body.code !== undefined && body.code !== 0)) {
    throw new ApiError(
      body.code ?? -1,
      body.message ?? `请求失败（${response.status}）`,
      response.status,
      body.details,
    );
  }

  return body.data as T;
}
