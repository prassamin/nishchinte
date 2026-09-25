import { prisma } from "@nishchinte/db";
import { requireCustomerUser, getCustomerUser } from "../session/customer";
import type {
  CustomerAddressItem,
  CustomerAddressInput,
  AuthActionResult,
} from "../types";
import { customerAddressSchema } from "../types";

/**
 * Customer Address Book Management
 */
export const customerAddresses = {
  list: async (customerId?: string): Promise<CustomerAddressItem[]> => {
    const targetId = customerId || (await getCustomerUser())?.id;
    if (!targetId) return [];

    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: targetId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return addresses.map((a) => ({
      id: a.id,
      customerId: a.customerId,
      name: a.name,
      phone: a.phone,
      division: a.division,
      district: a.district,
      upazila: a.upazila,
      streetAddress: a.streetAddress,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  },

  create: async (
    input: CustomerAddressInput,
  ): Promise<AuthActionResult<CustomerAddressItem>> => {
    const current = await requireCustomerUser();
    const parsed = customerAddressSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid address",
      };
    }

    try {
      if (parsed.data.isDefault) {
        await prisma.customerAddress.updateMany({
          where: { customerId: current.id },
          data: { isDefault: false },
        });
      }

      const created = await prisma.customerAddress.create({
        data: {
          customerId: current.id,
          name: parsed.data.name.trim(),
          phone: parsed.data.phone.trim(),
          division: parsed.data.division || null,
          district: parsed.data.district || null,
          upazila: parsed.data.upazila || null,
          streetAddress: parsed.data.streetAddress.trim(),
          postalCode: parsed.data.postalCode || null,
          isDefault: parsed.data.isDefault || false,
        },
      });

      return { ok: true, data: created };
    } catch (error: any) {
      console.error("customerAddresses.create error:", error);
      return { ok: false, error: "Failed to save address." };
    }
  },

  update: async (
    addressId: string,
    input: Partial<CustomerAddressInput>,
  ): Promise<AuthActionResult<CustomerAddressItem>> => {
    const current = await requireCustomerUser();
    try {
      const existing = await prisma.customerAddress.findFirst({
        where: { id: addressId, customerId: current.id },
      });
      if (!existing) {
        return { ok: false, error: "Address not found." };
      }

      if (input.isDefault) {
        await prisma.customerAddress.updateMany({
          where: { customerId: current.id },
          data: { isDefault: false },
        });
      }

      const updated = await prisma.customerAddress.update({
        where: { id: addressId },
        data: {
          name: input.name?.trim(),
          phone: input.phone?.trim(),
          division: input.division,
          district: input.district,
          upazila: input.upazila,
          streetAddress: input.streetAddress?.trim(),
          postalCode: input.postalCode,
          isDefault: input.isDefault,
        },
      });

      return { ok: true, data: updated };
    } catch (error: any) {
      console.error("customerAddresses.update error:", error);
      return { ok: false, error: "Failed to update address." };
    }
  },

  delete: async (addressId: string): Promise<AuthActionResult<boolean>> => {
    const current = await requireCustomerUser();
    try {
      const existing = await prisma.customerAddress.findFirst({
        where: { id: addressId, customerId: current.id },
      });
      if (!existing) return { ok: false, error: "Address not found." };

      await prisma.customerAddress.delete({ where: { id: addressId } });
      return { ok: true, data: true };
    } catch (error: any) {
      console.error("customerAddresses.delete error:", error);
      return { ok: false, error: "Failed to delete address." };
    }
  },

  setDefault: async (
    addressId: string,
  ): Promise<AuthActionResult<boolean>> => {
    const current = await requireCustomerUser();
    try {
      await prisma.customerAddress.updateMany({
        where: { customerId: current.id },
        data: { isDefault: false },
      });
      await prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
      return { ok: true, data: true };
    } catch (error: any) {
      console.error("customerAddresses.setDefault error:", error);
      return { ok: false, error: "Failed to set default address." };
    }
  },
};
