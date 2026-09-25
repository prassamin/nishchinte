import { prisma } from "@nishchinte/db";
import { verifyJwt } from "../crypto/jwt";
import { setAuthCookie, getAuthCookie, removeAuthCookie } from "../cookies";
import { hashToken } from "../crypto/otp";
import { getAvatarSync } from "@nishchinte/utils";
import { getConfig } from "@nishchinte/config";
import { createTokenPair, rotateRefreshToken } from "./tokens";
import type {
  AdminSessionPayload,
  CreateAdminSessionInput,
  AuthTokens,
  AdminSession,
  SignOutOptions,
  InternalUserRole,
} from "../types";

/**
 * Creates and persists an admin session cookie with dual-token issuance.
 */
export async function createAdminSession(
  input: CreateAdminSessionInput,
): Promise<AuthTokens & { session: AdminSessionPayload }> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  // 1. Create DB AuthSession
  const dbSession = await prisma.authSession.create({
    data: {
      userId: input.id,
      userType: "admin",
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      isRevoked: false,
    },
  });

  const payload: AdminSessionPayload = {
    id: input.id,
    email: input.email,
    name: input.name,
    role: input.role,
    avatarUrl: input.avatarUrl || getAvatarSync(input),
    permissions: input.permissions || [],
    sessionId: dbSession.id,
    type: "admin",
  };

  // 2. Issue Token Pair
  const tokens = await createTokenPair({
    userId: input.id,
    userType: "admin",
    sessionId: dbSession.id,
    payload: payload as unknown as Record<string, unknown>,
    audience: config.admin.audience,
  });

  const secure = config.session.secure;
  await setAuthCookie(config.cookieName.admin, tokens.accessToken, {
    maxAge: config.session.accessTokenMaxAge,
    secure,
  });

  if (tokens.refreshToken) {
    await setAuthCookie(config.cookieName.adminRefresh, tokens.refreshToken, {
      maxAge: config.session.refreshTokenMaxAge,
      secure,
    });
  }

  return {
    ...tokens,
    session: payload,
  };
}

/**
 * Reads and verifies an admin user payload from a raw JWT token string.
 */
export async function getAdminSessionFromToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }
  const payload = await verifyJwt<AdminSessionPayload>(token, {
    audience: config.admin.audience,
  });

  if (!payload || payload.type !== "admin" || !payload.id) {
    return null;
  }

  return payload;
}

/**
 * Supabase-style auth.getUser() — validates token and queries DB directly for fresh user record.
 */
export async function getAdminUser(): Promise<AdminSessionPayload | null> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  let payload: AdminSessionPayload | null = null;
  const token = await getAuthCookie(config.cookieName.admin);
  if (token) {
    payload = await getAdminSessionFromToken(token);
  }

  // Silent Refresh if access token expired
  if (!payload) {
    const refreshToken = await getAuthCookie(config.cookieName.adminRefresh);
    if (!refreshToken) return null;

    try {
      const newTokens = await rotateRefreshToken({
        refreshToken,
        audience: config.admin.audience,
      });

      const secure = config.session.secure;
      await setAuthCookie(config.cookieName.admin, newTokens.accessToken, {
        maxAge: config.session.accessTokenMaxAge,
        secure,
      });

      if (newTokens.refreshToken) {
        await setAuthCookie(
          config.cookieName.adminRefresh,
          newTokens.refreshToken,
          {
            maxAge: config.session.refreshTokenMaxAge,
            secure,
          },
        );
      }

      payload = await getAdminSessionFromToken(newTokens.accessToken);
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
          payload = { id: existingToken.session.userId, sessionId: existingToken.session.id, type: "admin" } as any;
        }
      } catch {
        return null;
      }
    }
  }

  if (!payload?.id) return null;

  // Query DB directly for live user state (matching Supabase GoTrue GET /auth/v1/user)
  try {
    const dbUser = await prisma.internalUser.findUnique({
      where: { id: payload.id },
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
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as InternalUserRole,
      avatarUrl: dbUser.avatarUrl || getAvatarSync(dbUser),
      permissions: (dbUser.permissions as string[]) || [],
      sessionId: payload.sessionId,
      type: "admin",
    };
  } catch (error) {
    console.error("getAdminUser DB query error:", error);
    return null;
  }
}

/**
 * Supabase-style auth.getSession() — returns the full Admin Session object with tokens and user.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  let accessToken = await getAuthCookie(config.cookieName.admin);
  let refreshToken = await getAuthCookie(config.cookieName.adminRefresh);

  let user = accessToken ? await getAdminSessionFromToken(accessToken) : null;

  if (!user && refreshToken) {
    try {
      const newTokens = await rotateRefreshToken({
        refreshToken,
        audience: config.admin.audience,
      });

      const secure = config.session.secure;
      await setAuthCookie(config.cookieName.admin, newTokens.accessToken, {
        maxAge: config.session.accessTokenMaxAge,
        secure,
      });

      if (newTokens.refreshToken) {
        await setAuthCookie(config.cookieName.adminRefresh, newTokens.refreshToken, {
          maxAge: config.session.refreshTokenMaxAge,
          secure,
        });
      }

      accessToken = newTokens.accessToken;
      refreshToken = newTokens.refreshToken || refreshToken;
      user = await getAdminSessionFromToken(newTokens.accessToken);
    } catch {
      // Fallback: check if session is still active in DB
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
              accessToken: "",
              refreshToken: refreshToken || undefined,
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

  if (!user || !accessToken) return null;

  const accessMaxAge = config.session.accessTokenMaxAge ?? 900;
  const decoded = await verifyJwt<{ exp?: number }>(accessToken, {
    audience: config.admin.audience,
  });
  const expiresAt = decoded?.exp ?? (Math.floor(Date.now() / 1000) + accessMaxAge);
  const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresIn,
    expiresAt,
    tokenType: "Bearer" as const,
    user,
  };
}

/**
 * Requires an admin user; throws an error if unauthenticated.
 */
export async function requireAdminUser(): Promise<AdminSessionPayload> {
  const user = await getAdminUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Requires an admin session; throws an error if unauthenticated.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Clears the admin session cookies with configurable scope.
 */
export async function destroyAdminSession(
  options: SignOutOptions = {},
): Promise<void> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }

  const scope = options.scope || "local";
  const currentUser = await getAdminUser();

  if (currentUser?.id) {
    if (scope === "global") {
      await prisma.authSession.updateMany({
        where: { userId: currentUser.id, userType: "admin" },
        data: { isRevoked: true },
      });
    } else if (scope === "others" && currentUser.sessionId) {
      await prisma.authSession.updateMany({
        where: {
          userId: currentUser.id,
          userType: "admin",
          id: { not: currentUser.sessionId },
        },
        data: { isRevoked: true },
      });
      return;
    } else if (currentUser.sessionId) {
      await prisma.authSession.update({
        where: { id: currentUser.sessionId },
        data: { isRevoked: true },
      });
    }
  }

  await removeAuthCookie(config.cookieName.admin);
  await removeAuthCookie(config.cookieName.adminRefresh);
}
