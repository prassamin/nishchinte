import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { TokenOptions } from "../types";
import { getConfig } from "@nishchinte/config";

/**
 * Converts a string secret to Uint8Array required by jose (Web Crypto API).
 */
export function getSecretKey(secret?: string): Uint8Array {
  const resolved = secret || getConfig().auth?.secret;
  return new TextEncoder().encode(resolved);
}

/**
 * Signs a JWT token using jose HS256 algorithm.
 */
export async function signJwt<T extends Record<string, unknown>>(
  payload: T,
  options: TokenOptions = {},
  secret?: string,
): Promise<string> {
  const config = getConfig().auth;
  if (!config) {
    throw new Error("Auth provider not found");
  }
  const {
    expiresIn = "7d",
    issuer = config.issuer,
    audience,
    subject,
  } = options;

  const expirationValue =
    typeof expiresIn === "number" ? `${expiresIn}s` : expiresIn;

  let builder = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime(expirationValue);

  if (audience) {
    builder = builder.setAudience(audience);
  }

  if (subject) {
    builder = builder.setSubject(subject);
  }

  return builder.sign(getSecretKey(secret));
}

/**
 * Verifies and decodes a JWT token using jose.
 */
export async function verifyJwt<T = JWTPayload>(
  token: string,
  options: { issuer?: string; audience?: string } = {},
  secret?: string,
): Promise<T | null> {
  try {
    const config = getConfig().auth;
    if (!config) {
      throw new Error("Auth provider not found");
    }
    const { issuer = config.issuer, audience } = options;

    const { payload } = await jwtVerify(token, getSecretKey(secret), {
      issuer,
      ...(audience ? { audience } : {}),
    });

    return payload as unknown as T;
  } catch {
    return null;
  }
}
