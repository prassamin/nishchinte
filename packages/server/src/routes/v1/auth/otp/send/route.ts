import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
 
/**
 * POST /auth/otp/send
 * Dispatches an OTP verification code.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      identifier?: string;
      channel?: "SMS" | "EMAIL" | "WHATSAPP" | "VOICE";
      purpose?: string;
      metadata?: Record<string, unknown>;
    };

    const targetPhone = body.phone || body.identifier;
    if (!targetPhone) {
      return CiferResponse.json(
        { ok: false, error: "Phone number or email is required" },
        { status: 400 },
      );
    }

    const result = await ctx.auth.customer.signInWithOtp({
      phone: targetPhone,
      channel: body.channel || "SMS",
      metadata: body.metadata,
    });

    if (!result.ok) {
      const status = result.code === "AUTHLESS_MODE" ? 403 : result.code === "RATE_LIMITED" ? 429 : 400;
      return CiferResponse.json({ ok: false, error: result.error, code: result.code }, { status });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /auth/otp/send error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to send verification code" },
      { status: 500 },
    );
  }
}
