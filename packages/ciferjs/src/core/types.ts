import type { Context } from "hono";
import type { CiferRequest } from "./request";
import type { CiferResponse } from "./response";
import type { CiferContext, CiferContextMap } from "./context";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

export const HTTP_METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
] as const;

export type RouteHandlerResult<T = unknown> =
  | Response
  | CiferResponse
  | T
  | Promise<Response | CiferResponse | T>;

export type RouteHandler<
  TParams = Record<string, string | string[]>,
  TServices extends Record<string, any> = CiferContextMap,
  TReturn = unknown,
> = (
  req: CiferRequest,
  ctx: CiferContext<TParams, TServices>,
) => RouteHandlerResult<TReturn>;

export interface RouteModule {
  GET?: RouteHandler<any, any, any>;
  POST?: RouteHandler<any, any, any>;
  PUT?: RouteHandler<any, any, any>;
  DELETE?: RouteHandler<any, any, any>;
  PATCH?: RouteHandler<any, any, any>;
  OPTIONS?: RouteHandler<any, any, any>;
  HEAD?: RouteHandler<any, any, any>;
  default?: any;
}

export type MiddlewareHandler<
  TParams = Record<string, string | string[]>,
  TServices extends Record<string, any> = CiferContextMap,
> = (
  req: CiferRequest,
  ctx: CiferContext<TParams, TServices>,
  next: () => Promise<Response>,
) => Promise<Response | CiferResponse | void>;

export interface CiferOptions<
  TContext extends Record<string, any> = CiferContextMap,
> {
  /**
   * Custom directory path containing route files.
   * Defaults to auto-resolving `./routes` or `src/routes`.
   */
  routesDir?: string;
  /**
   * Base path prefix for all auto-discovered routes.
   * @default ""
   */
  basePath?: string;
  /**
   * Whether to run in development mode with live route reloading and cache busting.
   * Defaults to `process.env.NODE_ENV !== "production"`.
   */
  dev?: boolean;
  /**
   * Custom context provider hook to inject global services into `ctx`.
   */
  context?: (honoCtx: Context) => TContext | Promise<TContext>;
}

export type InferCiferContext<T> = T extends { _contextType: infer C }
  ? C
  : CiferContext;
