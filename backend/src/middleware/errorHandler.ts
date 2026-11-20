import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/errors';
import { createErrorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json(createErrorResponse(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    res
      .status(400)
      .json(createErrorResponse(ErrorCode.VALIDATION, '请求参数不合法', err.issues));
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(createErrorResponse(ErrorCode.VALIDATION, '请求体不是合法 JSON'));
    return;
  }

  logger.error('未处理的错误', { method: req.method, path: req.path, error: err });
  res.status(500).json(createErrorResponse(ErrorCode.INTERNAL, '服务器内部错误'));
}
