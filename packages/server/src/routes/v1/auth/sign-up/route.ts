import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { CustomerSignUpInput } from "@nishchinte/auth";

/**
 * POST /auth/sign-up
 * Customer registration.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    const body = (await req.json()) as CustomerSignUpInput;

    const result = await ctx.auth.customer.signUp(body);
    if (!result.ok) {
      const status = result.code === "AUTHLESS_MODE" ? 403 : 400;
      return CiferResponse.json({ ok: false, error: result.error, code: result.code }, { status });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /auth/sign-up error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Sign up failed" },
      { status: 500 },
    );
  }
}
