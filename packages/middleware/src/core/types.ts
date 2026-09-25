import type { NextRequest, NextResponse } from "next/server";

/**
 * Standard Middleware Function signature in Nishchinte.
 * Receives the current request and the accumulated response pipeline.
 */
export type NishchinteMiddlewareFn = (
  request: NextRequest,
  response: NextResponse
) => Promise<NextResponse | void | null | undefined> | NextResponse | void | null | undefined;

export interface CreateMiddlewareOptions {
  /**
   * Explicit configuration object or dynamic getter. If omitted, `getConfig()` is used.
   */
  config?: unknown;

  /**
   * Whether to inject base origin, url, and path headers automatically.
   * @default true
   */
  baseHeaders?: boolean;

  /**
   * Custom middleware handler(s) to execute BEFORE auto-discovered plugin middlewares.
   */
  before?: NishchinteMiddlewareFn | NishchinteMiddlewareFn[];

  /**
   * Custom middleware handler(s) to execute AFTER auto-discovered plugin middlewares.
   */
  after?: NishchinteMiddlewareFn | NishchinteMiddlewareFn[];

  /**
   * Extra manual middlewares to append to the pipeline.
   */
  middlewares?: NishchinteMiddlewareFn[];
}
