import { prisma } from "@nishchinte/db";
import { requireCustomerUser } from "../session/customer";
import type { UserIdentity, AuthActionResult } from "../types";

/**
 * Customer Identities / Multi-Provider Linker
 */
export const customerIdentities = {
  list: async (): Promise<UserIdentity[]> => {
    const current = await requireCustomerUser();
    const records = await prisma.customerIdentity.findMany({
      where: { customerId: current.id },
      orderBy: { createdAt: "asc" },
    });

    return records.map((id: any) => ({
      identity_id: id.id,
      id: id.providerId,
      user_id: id.customerId,
      provider: id.provider,
      identity_data: id.identityData as Record<string, unknown> | null,
      is_verified: id.isVerified,
      email: id.email || (id.provider === "email" ? id.providerId : null),
      last_sign_in_at: id.lastSignInAt?.toISOString?.() || id.lastSignInAt || null,
      created_at: id.createdAt?.toISOString?.() || id.createdAt,
      updated_at: id.updatedAt?.toISOString?.() || id.updatedAt,
    }));
  },

  link: async (params: {
    provider: string;
    providerId: string;
    email?: string;
    identityData?: Record<string, unknown>;
    isVerified?: boolean;
  }): Promise<UserIdentity> => {
    const current = await requireCustomerUser();
    const now = new Date();
    const created = await prisma.customerIdentity.create({
      data: {
        customerId: current.id,
        provider: params.provider,
        providerId: params.providerId,
        email: params.email || (params.provider === "email" ? params.providerId : null),
        identityData: params.identityData
          ? (params.identityData as any)
          : undefined,
        isVerified: params.isVerified ?? false,
        verifiedAt: params.isVerified ? now : null,
        lastSignInAt: now,
      } as any,
    });

    if (params.isVerified) {
      const updateData: any = { isVerified: true, confirmedAt: now };
      if (params.provider === "phone") updateData.phoneConfirmedAt = now;
      if (params.provider === "email") updateData.emailConfirmedAt = now;

      await prisma.customer.update({
        where: { id: current.id },
        data: updateData,
      });
    }

    return {
      identity_id: created.id,
      id: created.providerId,
      user_id: created.customerId,
      provider: created.provider,
      identity_data: created.identityData as Record<string, unknown> | null,
      is_verified: created.isVerified,
      email: (created as any).email || (created.provider === "email" ? created.providerId : null),
      last_sign_in_at: created.lastSignInAt?.toISOString?.() || created.lastSignInAt || null,
      created_at: created.createdAt?.toISOString?.() || created.createdAt,
      updated_at: created.updatedAt?.toISOString?.() || created.updatedAt,
    };
  },

  verify: async (params: {
    provider: string;
    providerId?: string;
  }): Promise<AuthActionResult<boolean>> => {
    const current = await requireCustomerUser();
    const now = new Date();

    try {
      await prisma.customerIdentity.updateMany({
        where: {
          customerId: current.id,
          provider: params.provider,
          ...(params.providerId ? { providerId: params.providerId } : {}),
        },
        data: {
          isVerified: true,
          verifiedAt: now,
        },
      });

      // Update provider-level timestamp on customer
      const updateData: any = { isVerified: true, confirmedAt: now };
      if (params.provider === "phone") updateData.phoneConfirmedAt = now;
      if (params.provider === "email") updateData.emailConfirmedAt = now;

      await prisma.customer.update({
        where: { id: current.id },
        data: updateData,
      });

      return { ok: true, data: true };
    } catch (error: any) {
      console.error("customerIdentities.verify error:", error);
      return { ok: false, error: "Failed to verify identity." };
    }
  },

  unlink: async (provider: string) => {
    const current = await requireCustomerUser();
    await prisma.customerIdentity.deleteMany({
      where: { customerId: current.id, provider },
    });
    return { ok: true };
  },
};
