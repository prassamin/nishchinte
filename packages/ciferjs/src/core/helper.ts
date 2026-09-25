import type { RouteHandler, RouteHandlerResult } from "./types";
import type { CiferRequest } from "./request";
import type { CiferContext, CiferContextMap } from "./context";

/**
 * Type-helper that provides automatic autocomplete for route handlers without manual type annotations.
 *
 * @example
 * ```typescript
 * import { defineRoute, CiferResponse } from "ciferjs";
 *
 * export const GET = defineRoute(async (req, ctx) => {
 *   return CiferResponse.json({ status: "ok" });
 * });
 * ```
 */
export function defineRoute<
  TParams = Record<string, string | string[]>,
  TServices extends Record<string, any> = CiferContextMap,
  TReturn = unknown,
>(
  handler: (
    req: CiferRequest,
    ctx: CiferContext<TParams, TServices>,
  ) => RouteHandlerResult<TReturn>,
): RouteHandler<TParams, TServices, TReturn> {
  return handler;
}