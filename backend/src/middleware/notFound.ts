import type { Request, Response } from 'express';
import { ErrorCode } from '../utils/errors';
import { createErrorResponse } from '../utils/response';

export function notFound(req: Request, res: Response): void {
  res
    .status(404)
    .json(createErrorResponse(ErrorCode.NOT_FOUND, `接口不存在: ${req.method} ${req.originalUrl}`));
}
