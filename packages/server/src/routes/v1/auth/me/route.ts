import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { UpdateCustomerAttributes } from "@nishchinte/auth";

/**
 * GET /auth/me
 * Returns current customer and admin auth state for client providers and account views.
 */
export async function GET(req: CiferRequest, ctx: CiferContext) {
  try {
    const admin = await ctx.auth.admin.getUser();
    const customer = await ctx.auth.customer.getUser();
    const profile = customer ? await ctx.auth.customer.getUserProfile() : null;
    const mode = ctx.auth.customer.mode;

    const capabilities = ctx.auth.customer.getCapabilities();

    return CiferResponse.json({
      ok: true,
      admin,
      customer,
      profile,
      capabilities,
      customerAuthMode: mode,
      isAuthless: mode === "authless",
      isStrictAuth: mode === "auth",
      isHybrid: mode === "hybrid",
    });
  } catch (error: any) {
    console.error("GET /auth/me error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to fetch session state" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /auth/me
 * Updates current authenticated customer profile data.
 */
export async function PATCH(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.customer.requireUser();
    const body = (await req.json()) as UpdateCustomerAttributes;

    const result = await ctx.auth.customer.updateUser(body);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("PATCH /auth/me error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to update profile" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}
