import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** 包裹 async 路由，将异常交给 Express 错误中间件（兼容 Express 5 与旧写法） */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
