import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { SignOutOptions } from "@nishchinte/auth";

/**
 * POST /auth/sign-out
 * Signs out customer or admin session with configurable scope (local, others, global).
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    let options: SignOutOptions = { scope: "local" };
    try {
      const body = (await req.json()) as SignOutOptions;
      if (body?.scope) options = body;
    } catch {
      // Body optional
    }

    await ctx.auth.customer.signOut(options);
    return CiferResponse.json({ ok: true, message: "Signed out successfully" });
  } catch (error: any) {
    console.error("POST /auth/sign-out error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Sign out failed" },
      { status: 500 },
    );
  }
}
