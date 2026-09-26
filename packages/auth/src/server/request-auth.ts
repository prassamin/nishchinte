import { prisma } from "@nishchinte/db";
import { getConfig } from "@nishchinte/config";
import { getAvatarSync } from "@nishchinte/utils";
import { verifyJwt } from "../crypto/jwt";
import { hashToken } from "../crypto/otp";
import { getAdminSessionFromToken } from "../session/admin";
import { rotateRefreshToken } from "../session/tokens";
import {
  getCustomerSessionFromToken,
  formatSupabaseUser,
  formatUserFromJwtClaims,
} from "../session/customer";
import { setAuthCookie, removeAuthCookie } from "../cookies";
import { adminAuth } from "./admin";
import { customerAuth } from "./customer";
import type {
  AdminSessionPayload,
  AdminSession,
  User,
  Session,
  InternalUserRole,
} from "../types";

export function parseCookies(header: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!header) return parsed;
  header.split(";").forEach((pair) => {
    const [key, ...values] = pair.trim().split("=");
    if (key) {
      parsed[key] = decodeURIComponent(values.join("="));
    }
  });
  return parsed;
}

export function extractCookieHeader(reqOrCtx: any): string {
  if (!reqOrCtx) return "";
  if (typeof reqOrCtx === "string") return reqOrCtx;

  // 1. Direct cookie header from Hono Request or Context
  if (typeof reqOrCtx?.req?.header === "function") {
    const header = reqOrCtx.req.header("cookie");
    if (header) return header;
  }
  if (typeof reqOrCtx?.req?.raw?.headers?.get === "function") {
    const header = reqOrCtx.req.raw.headers.get("cookie");
    if (header) return header;
  }
  if (typeof reqOrCtx?.raw?.headers?.get === "function") {
    const header = reqOrCtx.raw.headers.get("cookie");
    if (header) return header;
  }
  if (typeof reqOrCtx?.headers?.get === "function") {
    const header = reqOrCtx.headers.get("cookie");
    if (header) return header;
  }
  if (typeof reqOrCtx?.header === "function") {
    const header = reqOrCtx.header("cookie");
    if (header) return header;
  }

  // 2. Next.js / Astro cookie store or Map
  if (typeof reqOrCtx?.cookies?.getAll === "function") {
    const all = reqOrCtx.cookies.getAll();
    if (Array.isArray(all)) {
      return all
        .map(
          (c: any) => `${c.name || c.key}=${encodeURIComponent(c.value ?? "")}`,
        )
        .join("; ");
    }
    if (all && typeof all === "object") {
      return Object.entries(all)
        .map(
          ([k, v]) =>
            `${k}=${encodeURIComponent(typeof v === "object" ? ((v as any)?.value ?? "") : (v as string))}`,
        )
        .join("; ");
    }
  }

  return "";
}

/**
 * Request-scoped auth interface providing direct session accessors on the active request.
 */
export interface RequestBoundAuth {
  admin: Omit<
    typeof adminAuth,
    "getUser" | "getSession" | "requireUser" | "requireSession"
  > & {
    getUser: () => Promise<AdminSessionPayload | null>;
    getSession: () => Promise<AdminSession | null>;
    requireUser: () => Promise<AdminSessionPayload>;
    requireSession: () => Promise<AdminSession>;
  };
  customer: Omit<
    typeof customerAuth,
    "getUser" | "getSession" | "requireUser" | "requireSession"
  > & {
    getUser: () => Promise<User | null>;
    getSession: () => Promise<Session | null>;
    requireUser: () => Promise<User>;
    requireSession: () => Promise<Session>;
  };
  fromRequest: (reqOrCtx: any) => RequestBoundAuth;
}

/**
 * Creates request-scoped auth instance bound to the incoming HTTP request cookies.
 */
export function createRequestAuth(reqOrCtx: any): RequestBoundAuth {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }
  const cookieHeader = extractCookieHeader(reqOrCtx);
  const cookies = parseCookies(cookieHeader);

  const adminCookieName = config.cookieName.admin;
  const adminRefreshCookieName = config.cookieName.adminRefresh;
  const customerCookieName = config.cookieName.customer;
  const customerRefreshCookieName = config.cookieName.customerRefresh;

  let adminToken = cookies[adminCookieName];
  let adminRefreshToken = cookies[adminRefreshCookieName];
  let customerToken = cookies[customerCookieName];
  let customerRefreshToken = cookies[customerRefreshCookieName];

  if (!adminToken && typeof reqOrCtx?.cookies?.get === "function") {
    const c = reqOrCtx.cookies.get(adminCookieName);
    adminToken = typeof c === "object" ? c?.value : c;
  }
  if (!adminRefreshToken && typeof reqOrCtx?.cookies?.get === "function") {
    const c = reqOrCtx.cookies.get(adminRefreshCookieName);
    adminRefreshToken = typeof c === "object" ? c?.value : c;
  }
  if (!customerToken && typeof reqOrCtx?.cookies?.get === "function") {
    const c = reqOrCtx.cookies.get(customerCookieName);
    customerToken = typeof c === "object" ? c?.value : c;
  }
  if (!customerRefreshToken && typeof reqOrCtx?.cookies?.get === "function") {
    const c = reqOrCtx.cookies.get(customerRefreshCookieName);
    customerRefreshToken = typeof c === "object" ? c?.value : c;
  }

  let cachedAdminUser: AdminSessionPayload | null | undefined = undefined;
  let cachedCustomerUser: User | null | undefined = undefined;

  const getAdminUser = async (): Promise<AdminSessionPayload | null> => {
    if (cachedAdminUser !== undefined) return cachedAdminUser;
    let tokenPayload = adminToken ? await getAdminSessionFromToken(adminToken) : null;

    if (!tokenPayload && adminRefreshToken) {
      try {
        const newTokens = await rotateRefreshToken({
          refreshToken: adminRefreshToken,
          audience: config.admin.audience,
        });
        tokenPayload = await getAdminSessionFromToken(newTokens.accessToken);
        if (tokenPayload) {
          await setAuthCookie(
            adminCookieName,
            newTokens.accessToken,
            { maxAge: config.session.accessTokenMaxAge, secure: config.session.secure },
            reqOrCtx,
          );
          if (newTokens.refreshToken) {
            await setAuthCookie(
              adminRefreshCookieName,
              newTokens.refreshToken,
              { maxAge: config.session.refreshTokenMaxAge, secure: config.session.secure },
              reqOrCtx,
            );
          }
          adminToken = newTokens.accessToken;
          adminRefreshToken = newTokens.refreshToken || adminRefreshToken;
        }
      } catch {
        // Fallback: check if adminRefreshToken belongs to an active, valid session in DB
        try {
          const tokenHash = hashToken(adminRefreshToken);
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
            tokenPayload = {
              id: existingToken.session.userId,
              sessionId: existingToken.session.id,
              type: "admin",
            } as any;
          }
        } catch {
          cachedAdminUser = null;
          return null;
        }
      }
    }

    if (!tokenPayload?.id) {
      cachedAdminUser = null;
      return null;
    }

    try {
      const dbUser = await prisma.internalUser.findUnique({
        where: { id: tokenPayload.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          permissions: true,
          isActive: true,
        },
      });

      if (!dbUser || !dbUser.isActive) {
        cachedAdminUser = null;
        return null;
      }

      cachedAdminUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as InternalUserRole,
        avatarUrl: dbUser.avatarUrl || getAvatarSync(dbUser),
        permissions: (dbUser.permissions as string[]) || [],
        sessionId: tokenPayload.sessionId,
        type: "admin",
      };
      return cachedAdminUser;
    } catch {
      cachedAdminUser = null;
      return null;
    }
  };

  const getAdminSession = async (): Promise<AdminSession | null> => {
    let tokenToUse = adminToken;
    let user = tokenToUse ? await getAdminSessionFromToken(tokenToUse) : null;

    if (!user && adminRefreshToken) {
      try {
        const newTokens = await rotateRefreshToken({
          refreshToken: adminRefreshToken,
          audience: config.admin.audience,
        });
        tokenToUse = newTokens.accessToken;
        user = await getAdminSessionFromToken(newTokens.accessToken);
        if (user) {
          await setAuthCookie(
            adminCookieName,
            newTokens.accessToken,
            { maxAge: config.session.accessTokenMaxAge, secure: config.session.secure },
            reqOrCtx,
          );
          if (newTokens.refreshToken) {
            await setAuthCookie(
              adminRefreshCookieName,
              newTokens.refreshToken,
              { maxAge: config.session.refreshTokenMaxAge, secure: config.session.secure },
              reqOrCtx,
            );
          }
          adminToken = newTokens.accessToken;
          adminRefreshToken = newTokens.refreshToken || adminRefreshToken;
        }
      } catch {
        // Fallback: check if session is still active in DB
        try {
          const tokenHash = hashToken(adminRefreshToken);
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
            const dbUser = await prisma.internalUser.findUnique({
              where: { id: existingToken.session.userId },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                permissions: true,
                isActive: true,
              },
            });

            if (dbUser && dbUser.isActive) {
              const adminUserPayload: AdminSessionPayload = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role as InternalUserRole,
                avatarUrl: dbUser.avatarUrl || getAvatarSync(dbUser),
                permissions: (dbUser.permissions as string[]) || [],
                sessionId: existingToken.session.id,
                type: "admin",
              };
              return {
                accessToken: adminToken || "",
                refreshToken: adminRefreshToken || undefined,
                expiresIn: 0,
                expiresAt: Math.floor(Date.now() / 1000),
                tokenType: "Bearer" as const,
                user: adminUserPayload,
              };
            }
          }
        } catch {
          // Fallback error ignored
        }
        return null;
      }
    }

    if (!user || !tokenToUse) return null;
    const accessMaxAge = config.session.accessTokenMaxAge;
    const decoded = await verifyJwt<{ exp?: number }>(tokenToUse, {
      audience: config.admin.audience,
    });
    const expiresAt = decoded?.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
    const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

    return {
      accessToken: tokenToUse,
      refreshToken: adminRefreshToken || undefined,
      expiresIn,
      expiresAt,
      tokenType: "Bearer" as const,
      user,
    };
  };

  const requireAdminUser = async (): Promise<AdminSessionPayload> => {
    const session = await getAdminUser();
    if (!session) {
      throw new Error("UNAUTHORIZED");
    }
    return session;
  };

  const requireAdminSession = async (): Promise<AdminSession> => {
    const session = await getAdminSession();
    if (!session) {
      throw new Error("UNAUTHORIZED");
    }
    return session;
  };

  const getCustomerUser = async (): Promise<User | null> => {
    if (cachedCustomerUser !== undefined) return cachedCustomerUser;

    let customerId: string | null = null;
    if (customerToken) {
      const tokenPayload = await getCustomerSessionFromToken(customerToken);
      customerId = tokenPayload?.id || null;
    }

    // Silent refresh if access token expired or missing
    if (!customerId && customerRefreshToken) {
      try {
        const newTokens = await rotateRefreshToken({
          refreshToken: customerRefreshToken,
          audience: config.customer.audience,
        });
        const tokenPayload = await getCustomerSessionFromToken(newTokens.accessToken);
        customerId = tokenPayload?.id || null;

        if (customerId) {
          await setAuthCookie(
            customerCookieName,
            newTokens.accessToken,
            { maxAge: config.session.accessTokenMaxAge, secure: config.session.secure },
            reqOrCtx,
          );
          if (newTokens.refreshToken) {
            await setAuthCookie(
              customerRefreshCookieName,
              newTokens.refreshToken,
              { maxAge: config.session.refreshTokenMaxAge, secure: config.session.secure },
              reqOrCtx,
            );
          }
          customerToken = newTokens.accessToken;
          customerRefreshToken = newTokens.refreshToken || customerRefreshToken;
        }
      } catch {
        // Fallback: check if customerRefreshToken belongs to active valid session in DB
        try {
          const tokenHash = hashToken(customerRefreshToken);
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
            customerId = existingToken.session.userId;
          }
        } catch {
          cachedCustomerUser = null;
          return null;
        }
      }
    }

    if (!customerId) {
      cachedCustomerUser = null;
      return null;
    }

    try {
      const dbCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { identities: true },
      });

      if (!dbCustomer || !dbCustomer.isActive) {
        cachedCustomerUser = null;
        return null;
      }

      if (dbCustomer.bannedUntil && dbCustomer.bannedUntil > new Date()) {
        cachedCustomerUser = null;
        return null;
      }

      cachedCustomerUser = formatSupabaseUser(dbCustomer);
      return cachedCustomerUser;
    } catch {
      cachedCustomerUser = null;
      return null;
    }
  };

  const getCustomerSession = async (): Promise<Session | null> => {
    let tokenToUse = customerToken;
    let decoded: any = null;

    if (tokenToUse) {
      decoded = await verifyJwt<{ exp?: number } & Record<string, any>>(tokenToUse, {
        audience: config.customer.audience,
      });
    }

    // Silent refresh if access token expired or missing
    if (!decoded && customerRefreshToken) {
      try {
        const newTokens = await rotateRefreshToken({
          refreshToken: customerRefreshToken,
          audience: config.customer.audience,
        });
        tokenToUse = newTokens.accessToken;
        decoded = await verifyJwt<{ exp?: number } & Record<string, any>>(newTokens.accessToken, {
          audience: config.customer.audience,
        });

        if (decoded) {
          await setAuthCookie(
            customerCookieName,
            newTokens.accessToken,
            { maxAge: config.session.accessTokenMaxAge, secure: config.session.secure },
            reqOrCtx,
          );
          if (newTokens.refreshToken) {
            await setAuthCookie(
              customerRefreshCookieName,
              newTokens.refreshToken,
              { maxAge: config.session.refreshTokenMaxAge, secure: config.session.secure },
              reqOrCtx,
            );
          }
          customerToken = newTokens.accessToken;
          customerRefreshToken = newTokens.refreshToken || customerRefreshToken;
        }
      } catch {
        // Fallback: reconstruct session directly from active DB session
        try {
          const tokenHash = hashToken(customerRefreshToken);
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
              return {
                access_token: customerToken || "",
                token_type: "bearer",
                expires_in: 0,
                expires_at: Math.floor(Date.now() / 1000),
                refresh_token: customerRefreshToken || "",
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

    if (!decoded || !tokenToUse) return null;

    const accessMaxAge = config.session.accessTokenMaxAge;
    const expiresAt = decoded.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
    const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
    const user = formatUserFromJwtClaims(decoded);

    return {
      access_token: tokenToUse,
      token_type: "bearer",
      expires_in: expiresIn,
      expires_at: expiresAt,
      refresh_token: customerRefreshToken || "",
      user,
    };
  };

  const requireCustomerUser = async (): Promise<User> => {
    const session = await getCustomerUser();
    if (!session) {
      throw new Error("UNAUTHORIZED");
    }
    return session;
  };

  const requireCustomerSession = async (): Promise<Session> => {
    const session = await getCustomerSession();
    if (!session) {
      throw new Error("UNAUTHORIZED");
    }
    return session;
  };

  return {
    fromRequest: (nextReqOrCtx: any) => createRequestAuth(nextReqOrCtx),
    admin: {
      ...adminAuth,
      getUser: getAdminUser,
      getSession: getAdminSession,
      requireUser: requireAdminUser,
      requireSession: requireAdminSession,
      signOut: async () => {
        await removeAuthCookie(adminCookieName, {}, reqOrCtx);
        await removeAuthCookie(adminRefreshCookieName, {}, reqOrCtx);
        await adminAuth.signOut();
      },
    },
    customer: {
      ...customerAuth,
      getUser: getCustomerUser,
      getSession: getCustomerSession,
      requireUser: requireCustomerUser,
      requireSession: requireCustomerSession,
      signOut: async (options?: any) => {
        await removeAuthCookie(customerCookieName, {}, reqOrCtx);
        await removeAuthCookie(customerRefreshCookieName, {}, reqOrCtx);
        await customerAuth.signOut(options);
      },
    },
  };
}
