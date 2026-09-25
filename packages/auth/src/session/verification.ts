import type { User, CustomerVerificationChannel } from "../types";
import { getConfig } from "@nishchinte/config";

/**
 * Evaluates whether a customer user meets specific verification requirement channel(s).
 *
 * Pure validation logic operating on Supabase-compatible User claims and identity objects.
 * Zero database dependency — 100% client, edge, and server safe.
 *
 * - "phone": Customer MUST have verified phone (phone_confirmed_at / phone_verified / identity).
 * - "email": Customer MUST have verified email (email_confirmed_at / email_verified / identity).
 * - ["phone", "email"]: Customer MUST have BOTH phone AND email verified.
 * - "any": Customer is verified if ANY channel is verified.
 */
export function isCustomerVerified(
  user: User | null | undefined,
  required?: CustomerVerificationChannel[] | CustomerVerificationChannel,
): boolean {
  if (!user) return false;

  const config = getConfig();
  const effectiveRequired =
    required ?? config.auth?.customer?.verification?.required ?? "phone";

  if (effectiveRequired === "any") {
    const isPhoneVerified = Boolean(
      user.phone_confirmed_at ||
      user.user_metadata?.phone_verified ||
      user.identities?.some((i) => i.provider === "phone" && i.is_verified)
    );
    const isEmailVerified = Boolean(
      user.email_confirmed_at ||
      user.user_metadata?.email_verified ||
      user.identities?.some((i) => i.provider === "email" && i.is_verified)
    );
    const isOtherVerified = Boolean(
      user.confirmed_at ||
      user.identities?.some((i) => i.is_verified)
    );
    return isPhoneVerified || isEmailVerified || isOtherVerified;
  }

  const channels = Array.isArray(effectiveRequired)
    ? effectiveRequired
    : [effectiveRequired];

  for (const ch of channels) {
    if (ch === "phone") {
      const isPhoneVerified = Boolean(
        user.phone_confirmed_at ||
        user.user_metadata?.phone_verified ||
        user.identities?.some((i) => i.provider === "phone" && i.is_verified)
      );
      if (!isPhoneVerified) return false;
    } else if (ch === "email") {
      const isEmailVerified = Boolean(
        user.email_confirmed_at ||
        user.user_metadata?.email_verified ||
        user.identities?.some((i) => i.provider === "email" && i.is_verified)
      );
      if (!isEmailVerified) return false;
    } else if (ch === "any") {
      const hasAny = Boolean(
        user.phone_confirmed_at ||
        user.email_confirmed_at ||
        user.confirmed_at ||
        user.user_metadata?.phone_verified ||
        user.user_metadata?.email_verified ||
        user.identities?.some((i) => i.is_verified)
      );
      if (!hasAny) return false;
    } else {
      // Custom provider identity check (e.g. "google", "whatsapp")
      const isCustomVerified = Boolean(
        user.identities?.some((i) => i.provider === ch && i.is_verified)
      );
      if (!isCustomVerified) return false;
    }
  }

  return true;
}
