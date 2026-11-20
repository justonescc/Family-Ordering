# 日志约定

- 统一使用 `src/utils/logger.ts`，禁止散落 `console.log`（调试可用 `logger.debug`，生产自动静音）。
- 级别：`debug`（开发细节）、`info`（启动、关键动作）、`warn`（可恢复异常）、`error`（未处理异常）。
- 生产输出单行 JSON（`ts/level/message/meta`），便于日志收集；开发输出可读文本。

## 该记什么

- 服务启动/关闭（端口、信号）。
- 未处理异常：`logger.error('未处理的错误', { method, path, error })`。

## 不该记什么

- 业务错误（AppError）不记 error（由响应返回给调用方）。
- 任何口令、token、密码等敏感值。
