import { NextRequest, NextResponse } from "next/server";

export type AdminMiddlewareFn = (
  request: NextRequest,
  response: NextResponse,
) =>
  | Promise<NextResponse | void | null | undefined>
  | NextResponse
  | void
  | null
  | undefined;

export interface DefaultAdminPanelPlugin {
  name: string;
  middleware?: AdminMiddlewareFn;
}

export type AdminPanelPlugin = DefaultAdminPanelPlugin;

/**
 * Default Admin Panel Plugin for Nishchinte.
 * Use this in `nishchinte.config.ts` to activate the default admin panel.
 *
 * @example
 * ```ts
 * import { defaultAdminPanel } from "@nishchinte/admin-panel/plugins";
 *
 * export default defineConfig({
 *   adminPanel: defaultAdminPanel(),
 * });
 * ```
 */

export function defaultAdminPanel(): DefaultAdminPanelPlugin {
  return {
    name: "default",
  };
}
