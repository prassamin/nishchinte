import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { UpdateUserAttributes } from "@nishchinte/auth";

/**
 * GET /admin/team/:id
 * Gets a single team member by ID.
 */
export async function GET(_req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.admin.requireUser();
    const id = Array.isArray(ctx.params.id) ? ctx.params.id[0] : ctx.params.id;
    if (!id) {
      return CiferResponse.json({ ok: false, error: "Missing ID parameter" }, { status: 400 });
    }

    const result = await ctx.auth.admin.getUserById(id);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 404 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("GET /admin/team/[id] error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to get team member" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}

/**
 * PATCH /admin/team/:id
 * Updates any attribute of a team member (role, status, password, profile).
 */
export async function PATCH(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.admin.requireUser();
    const id = Array.isArray(ctx.params.id) ? ctx.params.id[0] : ctx.params.id;
    if (!id) {
      return CiferResponse.json({ ok: false, error: "Missing ID parameter" }, { status: 400 });
    }
    const body = (await req.json()) as UpdateUserAttributes;

    const result = await ctx.auth.admin.updateUser(id, body);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("PATCH /admin/team/[id] error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to update team member" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}

/**
 * DELETE /admin/team/:id
 * Deletes or safely soft-deactivates a team member.
 */
export async function DELETE(_req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.admin.requireUser();
    const id = Array.isArray(ctx.params.id) ? ctx.params.id[0] : ctx.params.id;
    if (!id) {
      return CiferResponse.json({ ok: false, error: "Missing ID parameter" }, { status: 400 });
    }

    const result = await ctx.auth.admin.deleteUser(id);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("DELETE /admin/team/[id] error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to delete team member" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}
