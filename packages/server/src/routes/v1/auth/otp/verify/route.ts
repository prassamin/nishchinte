import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";

/**
 * POST /auth/otp/verify
 * Verifies an OTP code and sets the customer session cookies.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      identifier?: string;
      code: string;
      purpose?: string;
      name?: string;
      email?: string;
      metadata?: Record<string, unknown>;
    };

    const targetPhone = body.phone || body.identifier;
    if (!targetPhone || !body.code) {
      return CiferResponse.json(
        { ok: false, error: "Identifier and OTP code are required" },
        { status: 400 },
      );
    }

    const result = await ctx.auth.customer.verifyOtp({
      phone: targetPhone,
      code: body.code,
      purpose: body.purpose || "SIGN_IN",
      name: body.name,
      email: body.email,
      metadata: body.metadata,
    });

    if (!result.ok) {
      const status =
        result.code === "AUTHLESS_MODE"
          ? 403
          : result.code === "ACCOUNT_DEACTIVATED" || result.code === "ACCOUNT_SUSPENDED"
            ? 403
            : 400;
      return CiferResponse.json({ ok: false, error: result.error, code: result.code }, { status });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /auth/otp/verify error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Verification failed" },
      { status: 500 },
    );
  }
}
