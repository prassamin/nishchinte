import type { User, UserIdentity } from "../types";

/**
 * Converts a raw database customer record (with identities) to 1:1 Supabase User structure.
 */
export function formatSupabaseUser(customer: any): User {
  if (!customer) throw new Error("Customer record required");

  const identities: UserIdentity[] = (customer.identities || []).map((id: any) => ({
    identity_id: id.id,
    id: id.providerId,
    user_id: customer.id,
    identity_data: id.identityData || {},
    provider: id.provider,
    is_verified: id.isVerified ?? false,
    email: id.email || (id.provider === "email" ? id.providerId : customer.email) || null,
    last_sign_in_at: id.lastSignInAt?.toISOString?.() || id.lastSignInAt || null,
    created_at: id.createdAt?.toISOString?.() || id.createdAt,
    updated_at: id.updatedAt?.toISOString?.() || id.updatedAt,
  }));

  const providers = Array.from(new Set(identities.map((i) => i.provider)));
  const primaryProvider =
    providers[0] || (customer.phone ? "phone" : "email");

  const phoneIdentity = identities.find((i) => i.provider === "phone");
  const emailIdentity = identities.find((i) => i.provider === "email");

  const phoneVerified =
    !!phoneIdentity?.is_verified ||
    !!customer.phoneConfirmedAt;

  const emailVerified =
    !!emailIdentity?.is_verified ||
    !!customer.emailConfirmedAt;

  const app_metadata = {
    provider: primaryProvider,
    providers: providers.length > 0 ? providers : [primaryProvider],
    ...(customer.rawAppMetaData as Record<string, any> || {}),
  };

  const user_metadata = {
    avatar_url: customer.avatarUrl || null,
    email: customer.email || null,
    email_verified: emailVerified,
    full_name: customer.name || null,
    name: customer.name || null,
    phone_verified: phoneVerified,
    ...(customer.rawUserMetaData as Record<string, any> || {}),
  };

  return {
    id: customer.id,
    aud: customer.aud || "authenticated",
    role: customer.role || "authenticated",
    email: customer.email || null,
    email_confirmed_at: customer.emailConfirmedAt?.toISOString?.() || null,
    phone: customer.phone || "",
    phone_confirmed_at: customer.phoneConfirmedAt?.toISOString?.() || null,
    confirmed_at: customer.confirmedAt?.toISOString?.() || null,
    last_sign_in_at: customer.lastSignInAt?.toISOString?.() || null,
    app_metadata,
    user_metadata,
    identities,
    created_at: customer.createdAt?.toISOString?.() || customer.createdAt,
    updated_at: customer.updatedAt?.toISOString?.() || customer.updatedAt,
    is_anonymous: customer.isAnonymous ?? false,
  };
}

/**
 * Reconstructs a Supabase User object statelessly from verified JWT claims (Zero DB Query).
 */
export function formatUserFromJwtClaims(payload: any): User {
  const email = payload.email || payload.user_metadata?.email || null;
  const phone = payload.phone || payload.user_metadata?.phone || "";
  const app_metadata = payload.app_metadata || {
    provider: phone ? "phone" : "email",
    providers: [phone ? "phone" : "email"].filter(Boolean),
  };
  const user_metadata = payload.user_metadata || {
    name: payload.name || payload.user_metadata?.name || null,
    full_name: payload.name || payload.user_metadata?.full_name || null,
    avatar_url: payload.avatarUrl || payload.user_metadata?.avatar_url || null,
    email: email,
    email_verified: !!payload.email_confirmed_at || !!payload.user_metadata?.email_verified,
    phone_verified: !!payload.phone_confirmed_at || !!payload.user_metadata?.phone_verified,
  };

  return {
    id: payload.sub || payload.id,
    aud: payload.aud || "authenticated",
    role: payload.role || "authenticated",
    email,
    email_confirmed_at: payload.email_confirmed_at || null,
    phone,
    phone_confirmed_at: payload.phone_confirmed_at || null,
    confirmed_at: payload.confirmed_at || null,
    last_sign_in_at: payload.last_sign_in_at || null,
    app_metadata,
    user_metadata,
    identities: payload.identities || [],
    created_at: payload.created_at || (payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString()),
    updated_at: payload.updated_at || (payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString()),
    is_anonymous: payload.is_anonymous ?? false,
  };
}
