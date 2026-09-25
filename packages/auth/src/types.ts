import { z } from "zod";
import type {
  CustomerAuthMode,
  CustomerVerificationChannel,
} from "@nishchinte/config";

export type { CustomerAuthMode, CustomerVerificationChannel };

export type InternalUserRole = "OWNER" | "ADMIN" | "STAFF";

export interface AdminSessionPayload {
  id: string;
  email: string;
  name: string;
  role: InternalUserRole;
  permissions?: string[];
  avatarUrl?: string | null;
  sessionId?: string;
  type: "admin";
}

// -------------------------------------------------------------
// Supabase GoTrue 1:1 Schema Types (User, Identity, Session)
// -------------------------------------------------------------

export interface UserIdentity {
  identity_id: string; // Database PK (cuid / uuid)
  id: string;          // Provider identity (phone number, email, or Google sub)
  user_id: string;     // Customer ID (references User.id)
  identity_data?: Record<string, any> | null;
  provider: string;    // "phone" | "email" | "google"
  last_sign_in_at?: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  email?: string | null;
  is_verified?: boolean;
}

export interface UserAppMetadata {
  provider?: string;
  providers?: string[];
  [key: string]: any;
}

export interface UserMetadata {
  avatar_url?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  [key: string]: any;
}

export interface User {
  id: string;
  aud: string;
  role: string;
  email: string | null;
  email_confirmed_at?: string | Date | null;
  phone: string | null;
  phone_confirmed_at?: string | Date | null;
  confirmed_at?: string | Date | null;
  last_sign_in_at?: string | Date | null;
  app_metadata: UserAppMetadata;
  user_metadata: UserMetadata;
  identities: UserIdentity[];
  created_at: string | Date;
  updated_at: string | Date;
  is_anonymous: boolean;
}

// Compatibility Alias
export type CustomerUser = User;

export interface Session<TUser = User> {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: TUser;
  provider_token?: string | null;
  provider_refresh_token?: string | null;
}

export type AdminSession = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: "Bearer";
  user: AdminSessionPayload;
};

export type CustomerSession = Session<User>;
export type CustomerSessionPayload = User;

export type AuthSession = AdminSessionPayload | User;

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export type AuthResponse<TData = { user: User | null; session: Session | null }> = {
  data: TData;
  error: null;
} | {
  data: { user: null; session?: null } | { user: null } | { session: null } | null;
  error: AuthError;
};

export type AuthActionResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  redirectTo?: string;
  url?: string;
};

export type OtpChannelType = "SMS" | "EMAIL" | "WHATSAPP" | "VOICE";

export interface CustomerVerificationConfig {
  /**
   * Required verified provider identities for a customer to be considered verified by the store.
   * e.g. `["phone"]`, `["email"]`, `["phone", "email"]`, or `["any"]`.
   * @default ["phone"]
   */
  required?: CustomerVerificationChannel[] | CustomerVerificationChannel;

  /**
   * Whether to enforce verified status before allowing customer checkout.
   * @default false
   */
  enforceOnCheckout?: boolean;

  /**
   * Whether to allow unverified customer accounts to place orders.
   * @default true
   */
  allowUnverifiedOrders?: boolean;
}

export interface AuthCapabilities {
  /**
   * Active storefront customer authentication mode ("authless" | "auth" | "hybrid").
   */
  mode: CustomerAuthMode;

  /**
   * Whether an SMS transport plugin is configured and available.
   */
  hasSms: boolean;

  /**
   * Whether an Email transport plugin is configured and available.
   */
  hasEmail: boolean;

  /**
   * Whether any OTP transport channel (SMS or Email) is configured or available via dev mode.
   */
  hasOtpTransport: boolean;

  /**
   * Array of supported OTP dispatch channels based on active plugins.
   */
  supportedChannels: OtpChannelType[];

  /**
   * Whether running in development/local mode where OTPs can fallback to console logs.
   */
  isDevMode: boolean;

  /**
   * Global cooldown in seconds between OTP resend requests.
   */
  otpCooldownSeconds: number;

  /**
   * Number of digits in generated OTP code.
   */
  otpLength: number;

  /**
   * Whether customer login and account features are accessible in storefront.
   */
  isAuthEnabled: boolean;
}

export interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
}

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export interface CreateAdminSessionInput {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: InternalUserRole;
  permissions?: string[];
  sessionId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateCustomerSessionInput {
  id: string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  emailConfirmedAt?: Date | null;
  phoneConfirmedAt?: Date | null;
  confirmedAt?: Date | null;
  sessionId?: string;
  rawUserMetaData?: Record<string, unknown> | null;
  rawAppMetaData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CustomerIdentityItem {
  id: string;
  customerId: string;
  provider: string; // "phone" | "email" | "google" | "facebook" | "apple"
  providerId: string;
  email?: string | null;
  identityData?: Record<string, unknown> | null;
  isVerified: boolean;
  verifiedAt?: Date | null;
  lastSignInAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAddressItem {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  division: string | null;
  district: string | null;
  upazila: string | null;
  streetAddress: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAddressInput {
  name: string;
  phone: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  streetAddress: string;
  postalCode?: string | null;
  isDefault?: boolean;
}

export interface SendOtpOptions {
  identifier: string;
  channel?: "SMS" | "EMAIL" | "WHATSAPP" | "VOICE";
  purpose?:
    | "SIGN_IN"
    | "REGISTER"
    | "RESET_PASSWORD"
    | "ORDER_CONFIRM"
    | "VERIFY_PHONE"
    | string;
  entityType?: "Customer" | "InternalUser" | "Order" | string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyOtpOptions {
  identifier: string;
  code: string;
  purpose?: string;
  entityType?: string;
  entityId?: string;
}

export interface SignOutOptions {
  /**
   * Scope of sign out:
   * - `local`: Revoke current device session only.
   * - `others`: Keep current device active, revoke all other sessions.
   * - `global`: Revoke all active sessions across all devices immediately.
   * @default "local"
   */
  scope?: "local" | "others" | "global";
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: InternalUserRole;
  isActive: boolean;
  permissions?: string[];
  lastLoginAt?: Date | null;
  createdAt: Date;
}

export interface CreateUserAttributes {
  name: string;
  email: string;
  password?: string;
  role?: InternalUserRole;
  phone?: string | null;
  permissions?: string[];
  avatarUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateUserAttributes {
  name?: string;
  email?: string;
  password?: string;
  role?: InternalUserRole;
  isActive?: boolean;
  phone?: string | null;
  permissions?: string[];
  avatarUrl?: string | null;
}

export interface UpdateCustomerAttributes {
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  password?: string;
  metadata?: Record<string, unknown>;
}

export interface ListUsersResult {
  ok: true;
  members: TeamMember[];
  users: TeamMember[];
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: InternalUserRole;
  } | null;
}

// -------------------------------------------------------------
// Validation Schemas
// -------------------------------------------------------------
export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const customerPasswordSignInSchema = z.object({
  identifier: z.string().min(3, "Please enter your phone number or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const customerSignUpSchema = z
  .object({
    phone: z.string().min(8, "Phone number is required"),
    email: z
      .string()
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),
    name: z.string().min(1, "Name is required").optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export const signUpSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  identifier: z.string().min(3, "Identifier must be provided"),
  code: z.string().min(4, "OTP code must be at least 4 digits"),
  purpose: z.string().optional().default("SIGN_IN"),
});

export const customerAddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(8, "Phone number is required"),
  division: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  upazila: z.string().optional().nullable(),
  streetAddress: z.string().min(3, "Street address is required"),
  postalCode: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type CustomerPasswordSignInInput = z.infer<
  typeof customerPasswordSignInSchema
>;
export type CustomerSignUpInput = z.infer<typeof customerSignUpSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type CustomerAddressSchemaInput = z.infer<typeof customerAddressSchema>;
