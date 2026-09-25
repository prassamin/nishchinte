import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { CreateUserAttributes, InternalUserRole } from "@nishchinte/auth";

/**
 * GET /admin/team
 * Lists team members.
 */
export async function GET(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.admin.requireUser();
    const role = (req.query.get("role") as InternalUserRole) || undefined;
    const search = req.query.get("search") || undefined;

    const result = await ctx.auth.admin.listUsers({ role, search });
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("GET /admin/team error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to load team members" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}

/**
 * POST /admin/team
 * Creates a new team member.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.admin.requireUser();
    const body = (await req.json()) as CreateUserAttributes;

    const result = await ctx.auth.admin.createUser(body);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /admin/team error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to create team member" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}
