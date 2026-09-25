import { adminAuth } from "./admin";
import { customerAuth } from "./customer";
import { createRequestAuth, type RequestBoundAuth } from "./request-auth";
import {
  createAndSendOtp,
  verifyOtp,
  normalizeIdentifier,
} from "../otp";
import { generateNumericOtp } from "../crypto/otp";

export type { RequestBoundAuth };
export { createRequestAuth };
export { adminAuth } from "./admin";
export { customerAuth } from "./customer";
export { customerAddresses } from "./addresses";
export { customerIdentities } from "./identities";
export { isCustomerVerified } from "../session/customer";

/**
 * Unified ServerAuth provides comprehensive authentication & session operations
 * for both Internal Admins and End-Customers, modeled after Supabase Auth (GoTrue).
 */
export class ServerAuth {
  /**
   * Binds auth operations to an incoming request/context.
   */
  public fromRequest(reqOrCtx: any): RequestBoundAuth {
    return createRequestAuth(reqOrCtx);
  }

  /**
   * Universal Shared OTP Engine (SMS, Email, WhatsApp, Voice)
   */
  readonly otp = {
    send: createAndSendOtp,
    verify: verifyOtp,
    normalizeIdentifier,
    generateNumericOtp,
  };

  /**
   * Admin & Staff Operations (RBAC & Platform Management)
   */
  readonly admin = adminAuth;

  /**
   * Customer / End-User Auth Operations (Supabase-style Storefront Realm)
   */
  readonly customer = customerAuth;
}

/**
 * Singleton instance of ServerAuth.
 */
export const auth = new ServerAuth();
