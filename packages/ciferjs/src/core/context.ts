import type { Context } from "hono";

/**
 * Extendable global interface for CiferContext services.
 * Can be augmented anywhere via:
 * ```typescript
 * declare module "ciferjs" {
 *   interface CiferContextMap {
 *     db: PrismaClient;
 *     config: NishchinteConfig;
 *     storage: StorageClient;
 *   }
 * }
 * ```
 */
export interface CiferContextMap {}

/**
 * Base implementation of CiferContext.
 */
export class CiferContextBase<
  TParams = Record<string, string | string[]>,
  TServices extends Record<string, any> = CiferContextMap,
> {
  public readonly params: TParams;
  public readonly services: TServices;

  constructor(
    c: Context,
    params: TParams = {} as TParams,
    services: TServices = {} as TServices,
  ) {
    this.params = params;
    this.services = services;

    // Automatically bind any custom services directly onto the context instance for convenient access
    if (services && typeof services === "object") {
      Object.assign(this, services);
    }
  }
}

/**
 * Strongly-typed CiferContext combining base execution context,
 * dynamic URL params, and all global/injected services.
 */
export type CiferContext<
  TParams = Record<string, string | string[]>,
  TServices extends Record<string, any> = CiferContextMap,
> = CiferContextBase<TParams, TServices> & TServices;

export const CiferContext = CiferContextBase as unknown as new <
  TParams = Record<string, string | string[]>,
  TServices extends Record<string, any> = CiferContextMap,
>(
  c: Context,
  params?: TParams,
  services?: TServices,
) => CiferContext<TParams, TServices>;
