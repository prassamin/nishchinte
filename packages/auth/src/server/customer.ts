import { prisma } from "@nishchinte/db";
import { verifyJwt } from "../crypto/jwt";
import { hashPassword, verifyPassword } from "../crypto/password";
import {
  createAndSendOtp,
  verifyOtp,
  normalizeIdentifier,
  getAuthCapabilities,
} from "../otp";
import {
  createCustomerSession,
  getCustomerUser,
  getCustomerSession,
  getCustomerSessionFromToken,
  requireCustomerUser,
  requireCustomerSession,
  destroyCustomerSession,
  formatSupabaseUser,
  isCustomerVerified,
} from "../session/customer";
import { customerAddresses } from "./addresses";
import { customerIdentities } from "./identities";
import type {
  User,
  Session,
  AuthActionResult,
  CustomerPasswordSignInInput,
  CustomerSignUpInput,
  UpdateCustomerAttributes,
  SignOutOptions,
  AuthTokens,
  CustomerAuthMode,
  AuthCapabilities,
  CustomerVerificationChannel,
} from "../types";
import {
  customerPasswordSignInSchema,
  customerSignUpSchema,
} from "../types";
import { getConfig } from "@nishchinte/config";

/**
 * Customer / End-User Auth Operations (Supabase-style Storefront Realm)
 */
export const customerAuth = {
  /**
   * Storefront Customer Auth Mode:
   * - `authless`: Customer authentication is completely disabled in storefront (100% guest checkout).
   * - `auth`: Strict customer authentication required for checkout and account.
   * - `hybrid`: Optional customer authentication, guest checkout fully supported.
   */
  get mode(): CustomerAuthMode {
    return getConfig().auth?.customer?.mode ?? "hybrid";
  },

  get isAuthless(): boolean {
    return this.mode === "authless";
  },

  get isStrictAuth(): boolean {
    return this.mode === "auth";
  },

  get isHybrid(): boolean {
    return this.mode === "hybrid";
  },

  /**
   * Inspects active plugins and returns real-time customer auth capabilities.
   */
  getCapabilities(): AuthCapabilities {
    return getAuthCapabilities();
  },

  /**
   * Evaluates whether a customer satisfies the store's verification requirements.
   * Strictly enforces the required channels specified in nishchinte.config.ts.
   *
   * @example
   * ```ts
   * // Check against active config (e.g. required: "phone")
   * const isPhoneVerified = auth.customer.isVerified(user);
   *
   * // Check against explicit channel
   * const isEmailVerified = auth.customer.isVerified(user, "email");
   * ```
   */
  isVerified(
    user: User | null | undefined,
    required?: CustomerVerificationChannel[] | CustomerVerificationChannel,
  ): boolean {
    return isCustomerVerified(user, required);
  },

  /**
   * Gets active customer user payload from cookies (Supabase auth.getUser).
   */
  getUser: async (): Promise<User | null> => {
    return getCustomerUser();
  },

  /**
   * Gets full customer session object with tokens and user (Supabase auth.getSession).
   */
  getSession: async (): Promise<Session | null> => {
    return getCustomerSession();
  },

  /**
   * Gets customer user payload from a raw JWT string.
   */
  getUserFromToken: async (token: string): Promise<User | null> => {
    return getCustomerSessionFromToken(token);
  },

  /**
   * Gets full customer session from a raw JWT string.
   */
  getSessionFromToken: async (token: string): Promise<Session | null> => {
    const user = await getCustomerSessionFromToken(token);
    if (!user) return null;
    const config = getConfig().auth;
    const accessMaxAge = config?.session?.accessTokenMaxAge ?? 900;

    const decoded = await verifyJwt<{ exp?: number }>(token, {
      audience: config?.customer?.audience,
    });
    const expiresAt = decoded?.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
    const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: expiresIn,
      expires_at: expiresAt,
      refresh_token: "",
      user,
    };
  },

  /**
   * Requires customer user or throws an UNAUTHORIZED error.
   */
  requireUser: async (): Promise<User> => {
    return requireCustomerUser();
  },

  /**
   * Requires customer session or throws an UNAUTHORIZED error.
   */
  requireSession: async (): Promise<Session> => {
    return requireCustomerSession();
  },

  /**
   * Fetches complete customer profile from DB.
   */
  getUserProfile: async (): Promise<User | null> => {
    return getCustomerUser();
  },

  /**
   * Dispatches an OTP verification code to customer phone or email (Supabase signInWithOtp).
   */
  signInWithOtp: async (options: {
    phone: string;
    channel?: "SMS" | "EMAIL" | "WHATSAPP" | "VOICE";
    metadata?: Record<string, unknown>;
  }): Promise<
    AuthActionResult<{ identifier: string; cooldownSeconds: number }>
  > => {
    if (customerAuth.isAuthless) {
      return {
        ok: false,
        error: "Customer authentication is disabled in authless mode.",
        code: "AUTHLESS_MODE",
      };
    }

    const res = await createAndSendOtp({
      identifier: options.phone,
      channel: options.channel || "SMS",
      purpose: "SIGN_IN",
      entityType: "Customer",
      metadata: options.metadata,
    });

    if (!res.ok) {
      return { ok: false, error: res.error, code: res.code };
    }

    return {
      ok: true,
      data: {
        identifier: res.data!.identifier,
        cooldownSeconds: res.data!.cooldownSeconds,
      },
    };
  },

  /**
   * Verifies OTP, updates provider-level verification, creates session and sets cookies (Supabase verifyOtp).
   */
  verifyOtp: async (options: {
    phone: string;
    code: string;
    purpose?: string;
    name?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  }): Promise<
    AuthActionResult<{
      user: User;
      session: Session;
      tokens: AuthTokens;
    }>
  > => {
    if (customerAuth.isAuthless) {
      return {
        ok: false,
        error: "Customer authentication is disabled in authless mode.",
        code: "AUTHLESS_MODE",
      };
    }

    const normalizedPhone = normalizeIdentifier(options.phone);
    const verification = await verifyOtp({
      identifier: normalizedPhone,
      code: options.code,
      purpose: options.purpose || "SIGN_IN",
    });

    if (!verification.ok) {
      return {
        ok: false,
        error: verification.error,
        code: verification.code,
      };
    }

    const now = new Date();

    try {
      // 1. Find or create customer
      let customer = await prisma.customer.findUnique({
        where: { phone: normalizedPhone },
        include: { identities: true },
      });

      if (!customer) {
        customer = (await prisma.customer.create({
          data: {
            phone: normalizedPhone,
            email: options.email?.toLowerCase().trim() || null,
            name: options.name?.trim() || null,
            isVerified: true,
            phoneConfirmedAt: now,
            confirmedAt: now,
            isActive: true,
            lastSignInAt: now,
            rawUserMetaData: options.metadata
              ? (options.metadata as any)
              : undefined,
            identities: {
              create: {
                provider: "phone",
                providerId: normalizedPhone,
                isVerified: true,
                verifiedAt: now,
                lastSignInAt: now,
                identityData: {
                  phone_verified: true,
                  phone: normalizedPhone,
                },
              },
            },
          } as any,
          include: { identities: true },
        })) as any;
      } else {
        // Check active/ban status
        if (!customer.isActive) {
          return {
            ok: false,
            error: "This customer account is deactivated.",
            code: "ACCOUNT_DEACTIVATED",
          };
        }
        if (customer.bannedUntil && customer.bannedUntil > new Date()) {
          return {
            ok: false,
            error: "This account is temporarily suspended.",
            code: "ACCOUNT_SUSPENDED",
          };
        }

        // Upsert phone identity with provider-level confirmation
        await prisma.customerIdentity.upsert({
          where: {
            provider_providerId: {
              provider: "phone",
              providerId: normalizedPhone,
            },
          },
          create: {
            customerId: customer.id,
            provider: "phone",
            providerId: normalizedPhone,
            isVerified: true,
            verifiedAt: now,
            lastSignInAt: now,
            identityData: {
              phone_verified: true,
              phone: normalizedPhone,
            },
          },
          update: {
            isVerified: true,
            verifiedAt: now,
            lastSignInAt: now,
            identityData: {
              phone_verified: true,
              phone: normalizedPhone,
            },
          },
        });

        // Update customer confirmation timestamps
        customer = (await prisma.customer.update({
          where: { id: customer.id },
          data: {
            isVerified: true,
            phoneConfirmedAt: now,
            confirmedAt: (customer as any).confirmedAt || now,
            lastSignInAt: now,
            name: options.name?.trim() || customer.name,
            email: options.email?.toLowerCase().trim() || customer.email,
          } as any,
          include: { identities: true },
        })) as any;
      }

      if (!customer) {
        return {
          ok: false,
          error: "Failed to locate or initialize customer account.",
        };
      }

      // 2. Create Dual-Token Session and Cookies
      const sessionResult = await createCustomerSession({
        id: customer.id,
        phone: customer.phone,
        email: customer.email,
        name: customer.name,
        rawUserMetaData: customer.rawUserMetaData as Record<string, unknown>,
        rawAppMetaData: customer.rawAppMetaData as Record<string, unknown>,
      });

      return {
        ok: true,
        data: {
          user: sessionResult.user,
          session: sessionResult.session,
          tokens: {
            accessToken: sessionResult.accessToken,
            refreshToken: sessionResult.refreshToken,
            expiresIn: sessionResult.expiresIn,
            tokenType: sessionResult.tokenType,
          },
        },
      };
    } catch (err: any) {
      console.error("customerAuth.verifyOtp error:", err);
      return {
        ok: false,
        error: err?.message || "Failed to complete sign in.",
      };
    }
  },

  /**
   * Password-based customer sign-in (Supabase signInWithPassword).
   */
  signInWithPassword: async (
    input: CustomerPasswordSignInInput,
  ): Promise<
    AuthActionResult<{
      user: User;
      session: Session;
      tokens: AuthTokens;
    }>
  > => {
    if (customerAuth.isAuthless) {
      return {
        ok: false,
        error: "Customer authentication is disabled in authless mode.",
        code: "AUTHLESS_MODE",
      };
    }

    const parsed = customerPasswordSignInSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    const cleanIdentifier = parsed.data.identifier.trim();
    const isEmail = cleanIdentifier.includes("@");
    const normalized = isEmail
      ? cleanIdentifier.toLowerCase()
      : normalizeIdentifier(cleanIdentifier);

    try {
      const customer = await prisma.customer.findFirst({
        where: isEmail ? { email: normalized } : { phone: normalized },
        include: { identities: true },
      });

      if (!customer || !customer.passwordHash) {
        return {
          ok: false,
          error: "Invalid login credentials. Please try again.",
        };
      }

      if (!customer.isActive) {
        return { ok: false, error: "This customer account is deactivated." };
      }
      if (customer.bannedUntil && customer.bannedUntil > new Date()) {
        return { ok: false, error: "This account is temporarily suspended." };
      }

      const isValid = await verifyPassword(
        parsed.data.password,
        customer.passwordHash,
      );
      if (!isValid) {
        return {
          ok: false,
          error: "Invalid login credentials. Please try again.",
        };
      }

      const now = new Date();
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastSignInAt: now },
      });

      const sessionResult = await createCustomerSession({
        id: customer.id,
        phone: customer.phone,
        email: customer.email,
        name: customer.name,
        rawUserMetaData: customer.rawUserMetaData as Record<string, unknown>,
        rawAppMetaData: customer.rawAppMetaData as Record<string, unknown>,
      });

      return {
        ok: true,
        data: {
          user: sessionResult.user,
          session: sessionResult.session,
          tokens: {
            accessToken: sessionResult.accessToken,
            refreshToken: sessionResult.refreshToken,
            expiresIn: sessionResult.expiresIn,
            tokenType: sessionResult.tokenType,
          },
        },
      };
    } catch (error: any) {
      console.error("customerAuth.signInWithPassword error:", error);
      return { ok: false, error: "Failed to sign in. Please try again." };
    }
  },

  /**
   * Customer registration with phone/email and optional password (Supabase signUp).
   */
  signUp: async (
    input: CustomerSignUpInput,
  ): Promise<
    AuthActionResult<{
      user: User;
      session: Session;
      tokens: AuthTokens;
    }>
  > => {
    if (customerAuth.isAuthless) {
      return {
        ok: false,
        error: "Customer registration is disabled in authless mode.",
        code: "AUTHLESS_MODE",
      };
    }

    const parsed = customerSignUpSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    const normalizedPhone = normalizeIdentifier(parsed.data.phone);
    const email = parsed.data.email?.toLowerCase().trim() || null;

    try {
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [{ phone: normalizedPhone }, ...(email ? [{ email }] : [])],
        },
      });

      if (existing) {
        return {
          ok: false,
          error: "An account with this phone or email already exists.",
        };
      }

      const passwordHash = parsed.data.password
        ? await hashPassword(parsed.data.password)
        : null;

      const now = new Date();
      const customer = (await prisma.customer.create({
        data: {
          phone: normalizedPhone,
          email,
          name: parsed.data.name?.trim() || null,
          passwordHash,
          isVerified: false,
          isActive: true,
          lastSignInAt: now,
          identities: {
            create: [
              {
                provider: "phone",
                providerId: normalizedPhone,
                isVerified: false,
                lastSignInAt: now,
                identityData: {
                  phone_verified: false,
                  phone: normalizedPhone,
                },
              },
              ...(email
                ? [
                    {
                      provider: "email",
                      providerId: email,
                      email,
                      isVerified: false,
                      lastSignInAt: now,
                      identityData: {
                        email_verified: false,
                        email,
                      },
                    },
                  ]
                : []),
            ],
          },
        } as any,
        include: { identities: true },
      })) as any;

      const sessionResult = await createCustomerSession({
        id: customer.id,
        phone: customer.phone,
        email: customer.email,
        name: customer.name,
      });

      return {
        ok: true,
        data: {
          user: sessionResult.user,
          session: sessionResult.session,
          tokens: {
            accessToken: sessionResult.accessToken,
            refreshToken: sessionResult.refreshToken,
            expiresIn: sessionResult.expiresIn,
            tokenType: sessionResult.tokenType,
          },
        },
      };
    } catch (error: any) {
      console.error("customerAuth.signUp error:", error);
      return { ok: false, error: "Registration failed. Please try again." };
    }
  },

  /**
   * Signs out customer with configurable scope (local, others, global).
   */
  signOut: async (options?: SignOutOptions): Promise<void> => {
    await destroyCustomerSession(options);
  },

  /**
   * Updates customer profile data (name, email, phone, avatar, metadata, password).
   */
  updateUser: async (
    attributes: UpdateCustomerAttributes,
  ): Promise<AuthActionResult<User>> => {
    const user = await getCustomerUser();
    if (!user?.id) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    try {
      const updateData: any = {};
      if (attributes.name !== undefined)
        updateData.name = attributes.name.trim();
      if (attributes.avatarUrl !== undefined)
        updateData.avatarUrl = attributes.avatarUrl;
      if (attributes.email !== undefined)
        updateData.email = attributes.email?.toLowerCase().trim() || null;
      if (attributes.phone !== undefined)
        updateData.phone = attributes.phone
          ? normalizeIdentifier(attributes.phone)
          : null;
      if (attributes.metadata !== undefined)
        updateData.rawUserMetaData = attributes.metadata;
      if (attributes.password)
        updateData.passwordHash = await hashPassword(attributes.password);

      const customer = await prisma.customer.update({
        where: { id: user.id },
        data: updateData,
        include: { identities: true },
      });

      return {
        ok: true,
        data: formatSupabaseUser(customer),
      };
    } catch (error: any) {
      console.error("customerAuth.updateUser error:", error);
      return {
        ok: false,
        error: error?.message || "Failed to update profile.",
      };
    }
  },

  /**
   * Customer Address Book Management
   */
  addresses: customerAddresses,

  /**
   * Customer Identities / Multi-Provider Linker
   */
  identities: customerIdentities,
};
