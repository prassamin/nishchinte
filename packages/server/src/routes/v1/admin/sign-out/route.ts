import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";

/**
 * POST /admin/sign-out
 * Admin sign out endpoint.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.admin.signOut();
    return CiferResponse.json({ ok: true, message: "Signed out successfully" });
  } catch (error: any) {
    console.error("POST /admin/sign-out error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
