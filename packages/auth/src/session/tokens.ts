import { prisma } from "@nishchinte/db";
import { getConfig } from "@nishchinte/config";
import { signJwt } from "../crypto/jwt";
import { generateRandomToken, hashToken } from "../crypto/otp";
import { formatSupabaseUser } from "./format";
import type { AuthTokens } from "../types";

/**
 * Creates a dual-token pair: short-lived JWT Access Token and long-lived stateful Refresh Token.
 */
export async function createTokenPair(params: {
  userId: string;
  userType: "customer" | "admin";
  sessionId: string;
  payload: Record<string, unknown>;
  audience: string;
  parentHash?: string | null;
}): Promise<AuthTokens> {
  const config = getConfig().auth;
  const sessionCfg = config?.session;

  const accessMaxAge = sessionCfg?.accessTokenMaxAge ?? 900; // 15 mins
  const refreshMaxAge = sessionCfg?.refreshTokenMaxAge ?? 2592000; // 30 days

  // 1. Sign Short-Lived JWT Access Token (Supabase compliant)
  const accessToken = await signJwt(
    {
      ...params.payload,
      sub: params.userId,
      id: params.userId,
      aud: params.audience,
      role: (params.payload.role as string) || "authenticated",
      session_id: params.sessionId,
      user_type: params.userType,
    },
    {
      audience: params.audience,
      expiresIn: accessMaxAge,
    },
  );

  // 2. Generate Opaque Refresh Token & Hash it for DB Storage
  const rawRefreshToken = generateRandomToken(32);
  const tokenHash = hashToken(rawRefreshToken);
  const refreshExpiresAt = new Date(Date.now() + refreshMaxAge * 1000);

  await prisma.authRefreshToken.create({
    data: {
      sessionId: params.sessionId,
      tokenHash,
      parentHash: params.parentHash || null,
      expiresAt: refreshExpiresAt,
      isRevoked: false,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: accessMaxAge,
    tokenType: "Bearer" as const,
  };
}

const REFRESH_TOKEN_REUSE_INTERVAL_MS = 120 * 1000; // 120-second leeway window for concurrent requests / tab latency

async function getRotationPayload(session: {
  id: string;
  userId: string;
  userType: string;
}): Promise<Record<string, unknown>> {
  if (session.userType === "customer") {
    const customer = await prisma.customer.findUnique({
      where: { id: session.userId },
      include: { identities: true },
    });

    if (!customer || !customer.isActive) {
      throw new Error("This customer account is deactivated.");
    }
    if (customer.bannedUntil && customer.bannedUntil > new Date()) {
      throw new Error("This customer account is temporarily suspended.");
    }

    const user = formatSupabaseUser(customer);
    return {
      ...user,
      session_id: session.id,
      user_type: "customer",
    };
  } else {
    const adminUser = await prisma.internalUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
        avatarUrl: true,
      },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new Error("This admin account is deactivated.");
    }

    return {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      permissions: (adminUser.permissions as string[]) || [],
      avatarUrl: adminUser.avatarUrl,
      type: "admin",
      session_id: session.id,
    };
  }
}

/**
 * Rotates a refresh token following the Token Family pattern.
 * If an already revoked token is used WITHIN the grace period, gracefully returns a fresh valid token pair for the active session.
 * If used AFTER the grace period, rejects the expired refresh attempt without destroying unrelated active sessions.
 */
export async function rotateRefreshToken(params: {
  refreshToken: string;
  audience: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AuthTokens> {
  const tokenHash = hashToken(params.refreshToken);

  const existingToken = await prisma.authRefreshToken.findUnique({
    where: { tokenHash },
    include: {
      session: true,
    },
  });

  if (!existingToken || !existingToken.session) {
    throw new Error("Invalid refresh token");
  }

  const session = existingToken.session;

  // If the whole session is already revoked, reject immediately
  if (session.isRevoked) {
    throw new Error("Session has been terminated");
  }

  // REPLAY ATTACK DETECTION WITH REUSE LEEWAY:
  if (existingToken.isRevoked) {
    // Check if a child token was recently issued from this token
    const childToken = await prisma.authRefreshToken.findFirst({
      where: { sessionId: session.id, parentHash: tokenHash },
      orderBy: { createdAt: "desc" },
    });

    const isWithinGracePeriod =
      childToken &&
      Date.now() - childToken.createdAt.getTime() <= REFRESH_TOKEN_REUSE_INTERVAL_MS;

    if (isWithinGracePeriod) {
      // Concurrent request within grace window — return a fresh valid token pair without killing the session
      const userPayload = await getRotationPayload(session);
      return createTokenPair({
        userId: session.userId,
        userType: session.userType as "customer" | "admin",
        sessionId: session.id,
        payload: userPayload,
        audience: params.audience,
        parentHash: existingToken.tokenHash,
      });
    }

    // Token was revoked and grace period expired — reject this stale refresh attempt
    throw new Error("Refresh token has been revoked");
  }

  // Check Token Expiration
  if (new Date() > existingToken.expiresAt) {
    throw new Error("Refresh token has expired");
  }

  // Revoke the consumed refresh token
  await prisma.authRefreshToken.update({
    where: { id: existingToken.id },
    data: { isRevoked: true },
  });

  const userPayload = await getRotationPayload(session);

  // Issue new token pair
  return createTokenPair({
    userId: session.userId,
    userType: session.userType as "customer" | "admin",
    sessionId: session.id,
    payload: userPayload,
    audience: params.audience,
    parentHash: tokenHash,
  });
}
