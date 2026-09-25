import { prisma } from "@nishchinte/db";
import { verifyJwt } from "../crypto/jwt";
import { setAuthCookie, getAuthCookie, removeAuthCookie } from "../cookies";
import { hashToken } from "../crypto/otp";
import { createTokenPair, rotateRefreshToken } from "./tokens";
import type {
  User,
  Session,
  UserIdentity,
  CreateCustomerSessionInput,
  AuthTokens,
  SignOutOptions,
  CustomerVerificationChannel,
} from "../types";
import { getConfig } from "@nishchinte/config";

import { formatSupabaseUser, formatUserFromJwtClaims } from "./format";
export { formatSupabaseUser, formatUserFromJwtClaims } from "./format";
export { isCustomerVerified } from "./verification";

/**
 * Creates and persists a customer session, issuing dual-token pair and formatted Supabase Session.
 */
export async function createCustomerSession(
  input: CreateCustomerSessionInput,
): Promise<AuthTokens & { session: Session; user: User }> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  // 1. Ensure DB AuthSession record
  const dbSession = await prisma.authSession.create({
    data: {
      userId: input.id,
      userType: "customer",
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      isRevoked: false,
    },
  });

  // 2. Fetch full Customer with identities
  const customer = await prisma.customer.findUnique({
    where: { id: input.id },
    include: { identities: true },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const user = formatSupabaseUser(customer);

  // 3. Issue Dual Token Pair with Supabase claims
  const accessMaxAge = config.session.accessTokenMaxAge ?? 900;

  const tokens = await createTokenPair({
    userId: input.id,
    userType: "customer",
    sessionId: dbSession.id,
    payload: {
      sub: user.id,
      aud: user.aud,
      role: user.role,
      email: user.email,
      phone: user.phone,
      email_confirmed_at: user.email_confirmed_at,
      phone_confirmed_at: user.phone_confirmed_at,
      confirmed_at: user.confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      identities: user.identities,
      created_at: user.created_at,
      updated_at: user.updated_at,
      is_anonymous: user.is_anonymous,
      session_id: dbSession.id,
    },
    audience: config.customer.audience,
  });

  // Extract real exp timestamp from the signed JWT
  const decoded = await verifyJwt<{ exp?: number }>(tokens.accessToken, {
    audience: config.customer.audience,
  });
  const expiresAt = decoded?.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
  const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

  // 4. Set HTTP-Only Cookies
  const secure = config.session.secure;
  const refreshMaxAge = config.session.refreshTokenMaxAge;

  await setAuthCookie(config.cookieName.customer, tokens.accessToken, {
    maxAge: accessMaxAge,
    secure,
  });

  if (tokens.refreshToken) {
    await setAuthCookie(config.cookieName.customerRefresh, tokens.refreshToken, {
      maxAge: refreshMaxAge,
      secure,
    });
  }

  const session: Session = {
    access_token: tokens.accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: tokens.refreshToken || "",
    user,
  };

  return {
    ...tokens,
    expiresIn,
    session,
    user,
  };
}

/**
 * Reads and verifies a customer session payload statelessly from a raw JWT token string (Zero DB Query).
 */
export async function getCustomerSessionFromToken(
  token: string,
): Promise<User | null> {
  if (!token) return null;

  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  const payload = await verifyJwt<any>(token, {
    audience: config.customer.audience,
  });

  if (!payload) return null;
  const id = payload.sub || payload.id;
  if (!id) return null;

  return formatUserFromJwtClaims(payload);
}

/**
 * Supabase auth.getUser() — validates session token and returns live DB customer record.
 */
export async function getCustomerUser(): Promise<User | null> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  let accessToken = await getAuthCookie(config.cookieName.customer);
  let payload: any = null;

  if (accessToken) {
    payload = await verifyJwt<any>(accessToken, {
      audience: config.customer.audience,
    });
  }

  // Silent Refresh Attempt if access token expired
  if (!payload) {
    const refreshToken = await getAuthCookie(config.cookieName.customerRefresh);
    if (!refreshToken) return null;

    try {
      const newTokens = await rotateRefreshToken({
        refreshToken,
        audience: config.customer.audience,
      });

      const secure = config.session.secure;
      await setAuthCookie(config.cookieName.customer, newTokens.accessToken, {
        maxAge: config.session.accessTokenMaxAge,
        secure,
      });

      if (newTokens.refreshToken) {
        await setAuthCookie(
          config.cookieName.customerRefresh,
          newTokens.refreshToken,
          {
            maxAge: config.session.refreshTokenMaxAge,
            secure,
          },
        );
      }

      payload = await verifyJwt<any>(newTokens.accessToken, {
        audience: config.customer.audience,
      });
    } catch {
      // Fallback: check if refreshToken belongs to an active session in DB
      try {
        const tokenHash = hashToken(refreshToken);
        const existingToken = await prisma.authRefreshToken.findUnique({
          where: { tokenHash },
          include: { session: true },
        });
        if (
          existingToken &&
          existingToken.session &&
          !existingToken.session.isRevoked &&
          new Date() <= existingToken.expiresAt
        ) {
          payload = { sub: existingToken.session.userId };
        }
      } catch {
        return null;
      }
    }
  }

  if (!payload) return null;
  const id = payload.sub || payload.id;
  if (!id) return null;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { identities: true },
    });

    if (!customer || !customer.isActive) return null;
    if (customer.bannedUntil && customer.bannedUntil > new Date()) return null;

    return formatSupabaseUser(customer);
  } catch {
    return null;
  }
}

/**
 * Supabase auth.getSession() — returns the full Customer Session object statelessly from JWT claims.
 */
export async function getCustomerSession(): Promise<Session | null> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  let accessToken = await getAuthCookie(config.cookieName.customer);
  let refreshToken = await getAuthCookie(config.cookieName.customerRefresh);

  let decoded: any = null;
  if (accessToken) {
    decoded = await verifyJwt<any>(accessToken, {
      audience: config.customer.audience,
    });
  }

  if (!decoded && refreshToken) {
    try {
      const newTokens = await rotateRefreshToken({
        refreshToken,
        audience: config.customer.audience,
      });

      const secure = config.session.secure;
      await setAuthCookie(config.cookieName.customer, newTokens.accessToken, {
        maxAge: config.session.accessTokenMaxAge,
        secure,
      });

      if (newTokens.refreshToken) {
        await setAuthCookie(
          config.cookieName.customerRefresh,
          newTokens.refreshToken,
          {
            maxAge: config.session.refreshTokenMaxAge,
            secure,
          },
        );
      }

      accessToken = newTokens.accessToken;
      refreshToken = newTokens.refreshToken || refreshToken;
      decoded = await verifyJwt<any>(newTokens.accessToken, {
        audience: config.customer.audience,
      });
    } catch {
      // Fallback: reconstruct session directly from active DB session
      try {
        const tokenHash = hashToken(refreshToken);
        const existingToken = await prisma.authRefreshToken.findUnique({
          where: { tokenHash },
          include: { session: true },
        });

        if (
          existingToken &&
          existingToken.session &&
          !existingToken.session.isRevoked &&
          new Date() <= existingToken.expiresAt
        ) {
          const customer = await prisma.customer.findUnique({
            where: { id: existingToken.session.userId },
            include: { identities: true },
          });

          if (
            customer &&
            customer.isActive &&
            (!customer.bannedUntil || customer.bannedUntil <= new Date())
          ) {
            const user = formatSupabaseUser(customer);
            const accessMaxAge = config.session.accessTokenMaxAge ?? 900;
            return {
              access_token: "",
              token_type: "bearer",
              expires_in: 0,
              expires_at: Math.floor(Date.now() / 1000),
              refresh_token: refreshToken,
              user,
            };
          }
        }
      } catch {
        // Fallback error ignored
      }
      return null;
    }
  }

  if (!decoded || !accessToken) return null;

  const accessMaxAge = config.session.accessTokenMaxAge ?? 900;
  const expiresAt = decoded.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
  const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const user = formatUserFromJwtClaims(decoded);

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: refreshToken || "",
    user,
  };
}

/**
 * Requires a customer user; throws an error if unauthenticated.
 */
export async function requireCustomerUser(): Promise<User> {
  const user = await getCustomerUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Requires a customer session; throws an error if unauthenticated.
 */
export async function requireCustomerSession(): Promise<Session> {
  const session = await getCustomerSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Signs out customer with configurable invalidation scope (local, others, global).
 */
export async function destroyCustomerSession(
  options: SignOutOptions = {},
): Promise<void> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  const scope = options.scope || "local";
  const currentUser = await getCustomerUser();

  if (currentUser?.id) {
    if (scope === "global") {
      await prisma.authSession.updateMany({
        where: { userId: currentUser.id, userType: "customer" },
        data: { isRevoked: true },
      });
    } else {
      const latestSession = await prisma.authSession.findFirst({
        where: { userId: currentUser.id, userType: "customer", isRevoked: false },
        orderBy: { createdAt: "desc" },
      });
      if (latestSession) {
        await prisma.authSession.update({
          where: { id: latestSession.id },
          data: { isRevoked: true },
        });
      }
    }
  }

  await removeAuthCookie(config.cookieName.customer);
  await removeAuthCookie(config.cookieName.customerRefresh);
}

