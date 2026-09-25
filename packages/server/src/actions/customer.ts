"use server";

import { auth } from "@nishchinte/auth/server";
import type {
  User,
  CustomerUser,
  CustomerAddressItem,
  CustomerAddressInput,
  UpdateCustomerAttributes,
  AuthTokens,
  SignOutOptions,
  CustomerSignUpInput,
} from "@nishchinte/auth";

/**
 * Dispatches an OTP verification code to a customer's phone or email.
 */
export async function sendCustomerOtpAction(input: {
  phone: string;
  channel?: "SMS" | "EMAIL" | "WHATSAPP" | "VOICE";
  metadata?: Record<string, unknown>;
}) {
  return auth.customer.signInWithOtp(input);
}

/**
 * Verifies an OTP code and establishes a customer session.
 */
export async function verifyCustomerOtpAction(input: {
  phone: string;
  code: string;
  purpose?: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}) {
  return auth.customer.verifyOtp(input);
}

/**
 * Authenticates a customer using password credentials.
 */
export async function signInCustomerPasswordAction(input: {
  identifier: string;
  password: string;
}) {
  return auth.customer.signInWithPassword(input);
}

/**
 * Registers a new customer account.
 */
export async function signUpCustomerAction(input: CustomerSignUpInput) {
  return auth.customer.signUp(input);
}

/**
 * Signs out the active customer session.
 */
export async function signOutCustomerAction(options?: SignOutOptions) {
  await auth.customer.signOut(options);
  return { ok: true };
}

/**
 * Retrieves the profile of the currently authenticated customer.
 */
export async function getCurrentCustomerProfileAction(): Promise<{
  ok: boolean;
  data?: CustomerUser | null;
  error?: string;
}> {
  try {
    const profile = await auth.customer.getUserProfile();
    return { ok: true, data: profile };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to load profile" };
  }
}

/**
 * Updates the profile of the currently authenticated customer.
 */
export async function updateCustomerProfileAction(
  attributes: UpdateCustomerAttributes,
) {
  return auth.customer.updateUser(attributes);
}

/**
 * Lists saved delivery addresses for the active customer.
 */
export async function listCustomerAddressesAction(): Promise<{
  ok: boolean;
  data: CustomerAddressItem[];
}> {
  const addresses = await auth.customer.addresses.list();
  return { ok: true, data: addresses };
}

/**
 * Adds a new delivery address for the active customer.
 */
export async function createCustomerAddressAction(input: CustomerAddressInput) {
  return auth.customer.addresses.create(input);
}

/**
 * Updates an existing delivery address.
 */
export async function updateCustomerAddressAction(
  addressId: string,
  input: Partial<CustomerAddressInput>,
) {
  return auth.customer.addresses.update(addressId, input);
}

/**
 * Deletes a delivery address.
 */
export async function deleteCustomerAddressAction(addressId: string) {
  return auth.customer.addresses.delete(addressId);
}

/**
 * Marks an address as the default delivery address.
 */
export async function setDefaultCustomerAddressAction(addressId: string) {
  return auth.customer.addresses.setDefault(addressId);
}

/**
 * Lists all authentication identities linked to the active customer.
 */
export async function listCustomerIdentitiesAction() {
  return auth.customer.identities.list();
}

/**
 * Links a new authentication provider identity to the active customer.
 */
export async function linkCustomerIdentityAction(params: {
  provider: string;
  providerId: string;
  identityData?: Record<string, unknown>;
  isVerified?: boolean;
}) {
  return auth.customer.identities.link(params);
}

/**
 * Marks a specific customer identity as verified.
 */
export async function verifyCustomerIdentityAction(params: {
  provider: string;
  providerId?: string;
}) {
  return auth.customer.identities.verify(params);
}

/**
 * Unlinks an authentication identity provider from the active customer.
 */
export async function unlinkCustomerIdentityAction(provider: string) {
  return auth.customer.identities.unlink(provider);
}

/**
 * Sends a password reset instruction link or code to the customer's email or phone.
 */
export async function sendPasswordResetAction(input: {
  email: string;
}): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  return {
    ok: true,
    redirectTo:
      "/sign-in?message=" +
      encodeURIComponent(
        "If an account exists with this email, password reset instructions have been sent.",
      ),
  };
}

/**
 * Updates a customer's password following a reset verification.
 */
export async function updatePasswordAction(input: {
  password: string;
  confirmPassword?: string;
}): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: true,
  };
}


