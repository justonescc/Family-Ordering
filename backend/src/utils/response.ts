/** 统一响应体：成功 code=0，失败为具体业务错误码 */
export interface SuccessBody<T> {
  code: 0;
  message: 'ok';
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorBody {
  code: number;
  message: string;
  details?: unknown;
}

export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
): SuccessBody<T> {
  return meta === undefined
    ? { code: 0, message: 'ok', data }
    : { code: 0, message: 'ok', data, meta };
}

export function createErrorResponse(
  code: number,
  message: string,
  details?: unknown,
): ErrorBody {
  return details === undefined ? { code, message } : { code, message, details };
}
