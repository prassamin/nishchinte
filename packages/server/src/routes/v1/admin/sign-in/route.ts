import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";

/**
 * POST /admin/sign-in
 * Admin authentication endpoint.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    if (!body?.email || !body?.password) {
      return CiferResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    const result = await ctx.auth.admin.signIn({
      email: body.email,
      password: body.password,
    });

    if (!result.ok) {
      return CiferResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    return CiferResponse.json({
      ok: true,
      data: result.data,
      redirectTo: result.redirectTo ?? "/admin",
    });
  } catch (error: any) {
    console.error("POST /admin/sign-in error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
