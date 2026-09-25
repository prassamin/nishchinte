import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { CustomerPasswordSignInInput } from "@nishchinte/auth";

/**
 * POST /auth/sign-in
 * Customer password-based sign in.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    const body = (await req.json()) as CustomerPasswordSignInInput;

    const result = await ctx.auth.customer.signInWithPassword(body);
    if (!result.ok) {
      const status = result.code === "AUTHLESS_MODE" ? 403 : 400;
      return CiferResponse.json({ ok: false, error: result.error, code: result.code }, { status });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /auth/sign-in error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Sign in failed" },
      { status: 500 },
    );
  }
}
