import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import type { CustomerAddressInput } from "@nishchinte/auth";

/**
 * PATCH /auth/addresses/:id
 * Updates an existing delivery address.
 */
export async function PATCH(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.customer.requireUser();
    const addressId = req.params.id;
    const body = (await req.json()) as Partial<CustomerAddressInput>;

    const result = await ctx.auth.customer.addresses.update(addressId, body);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("PATCH /auth/addresses/:id error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to update address" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}

/**
 * DELETE /auth/addresses/:id
 * Deletes a delivery address.
 */
export async function DELETE(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.customer.requireUser();
    const addressId = req.params.id;

    const result = await ctx.auth.customer.addresses.delete(addressId);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("DELETE /auth/addresses/:id error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to delete address" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}

/**
 * POST /auth/addresses/:id
 * Sets the address as default when requested with { action: "setDefault" }.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    await ctx.auth.customer.requireUser();
    const addressId = req.params.id;

    const result = await ctx.auth.customer.addresses.setDefault(addressId);
    if (!result.ok) {
      return CiferResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return CiferResponse.json(result);
  } catch (error: any) {
    console.error("POST /auth/addresses/:id error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to set default address" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}
