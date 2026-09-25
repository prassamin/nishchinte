// Types and Validation Schemas (Client & Server Safe)
export * from "./types";

// Configuration & Pluggable Auth Helpers
export { defineJwtAuthConfig } from "./config";

// Cryptographic Primitives & Utilities (Browser / Edge / Node Safe)
export { signJwt, verifyJwt, getSecretKey } from "./crypto/jwt";
export {
  hashPassword,
  verifyPassword,
  DEFAULT_SALT_ROUNDS,
} from "./crypto/password";
export {
  generateNumericOtp,
  generateRandomToken,
  generateSalt,
  hashOtpCode,
  verifyOtpCode,
  hashToken,
} from "./crypto/otp";

// Cookies & Session Constants
export { setAuthCookie, getAuthCookie, removeAuthCookie } from "./cookies";

// Edge & Next.js Middleware Matchers & Session Verification
export {
  updateAuthSession,
  isAdminRoute,
  isAdminPublicRoute,
  isCustomerAuthPageRoute,
  isCustomerAccountRoute,
  isCheckoutRoute,
} from "./server/middleware";

// Customer Verification Utility (Client & Server Safe)
export { isCustomerVerified } from "./session/verification";

