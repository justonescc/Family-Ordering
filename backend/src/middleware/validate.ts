import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

interface ParsedBag {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

const PARSED_KEY = Symbol('familyOrdering.parsed');

function bag(req: Request): ParsedBag {
  const record = req as unknown as Record<symbol, ParsedBag>;
  const existing = record[PARSED_KEY];
  if (existing) {
    return existing;
  }
  const created: ParsedBag = {};
  Object.defineProperty(req, PARSED_KEY, {
    value: created,
    enumerable: false,
    configurable: true,
  });
  return created;
}

/**
 * Zod 校验。body 直接回写；query/params 在 Express 5 中是只读 getter，
 * 因此挂到独立字段，用 parsedQuery / parsedParams 读取。
 */
export function validateRequest(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    if (source === 'body') {
      req.body = result.data;
    } else {
      bag(req)[source] = result.data;
    }
    next();
  };
}

export function parsedBody<T>(req: Request): T {
  return req.body as T;
}

export function parsedQuery<T>(req: Request): T {
  return bag(req).query as T;
}

export function parsedParams<T>(req: Request): T {
  return bag(req).params as T;
}
