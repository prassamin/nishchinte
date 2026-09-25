import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { CustomerAddressInput } from "@nishchinte/auth";

/**
 * GET /auth/addresses
 * Lists all saved delivery addresses for the authenticated customer.
 */
export async function GET(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.customer.requireUser();
    const addresses = await ctx.auth.customer.addresses.list();
    return CiferResponse.json({ ok: true, data: addresses });
  } catch (error: any) {
    console.error("GET /auth/addresses error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to load addresses" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}

/**
 * POST /auth/addresses
 * Creates a new delivery address for the authenticated customer.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.customer.requireUser();
    const body = (await req.json()) as CustomerAddressInput;

    const result = await ctx.auth.customer.addresses.create(body);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /auth/addresses error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to save address" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}
