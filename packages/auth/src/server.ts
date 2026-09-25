// Re-export all isomorphic types, schemas, crypto utilities, config builders
export * from "./index";

// Universal OTP Engine & DB Verification
export {
  createAndSendOtp,
  verifyOtp,
  normalizeIdentifier,
  getAuthCapabilities,
} from "./otp";

// Session & Token Rotation Managers
export * from "./session";

// ServerAuth Unified Singleton & Request Scope
export {
  ServerAuth,
  auth,
  createRequestAuth,
  adminAuth,
  customerAuth,
  customerAddresses,
  customerIdentities,
} from "./server/auth";
export type { RequestBoundAuth } from "./server/auth";
