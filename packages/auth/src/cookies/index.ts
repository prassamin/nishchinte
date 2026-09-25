import type { CookieOptions } from "../types";
import { getConfig } from "@nishchinte/config";

/**
 * Serializes a cookie name, value, and options into a standard Set-Cookie header string.
 */
export function serializeCookie(
  name: string,
  val: string,
  options: CookieOptions = {},
): string {
  const enc = encodeURIComponent;
  let str = `${enc(name)}=${enc(val)}`;

  if (options.maxAge != null) {
    str += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  str += `; Path=${options.path || "/"}`;
  if (options.secure) {
    str += `; Secure`;
  }
  if (options.httpOnly !== false) {
    str += `; HttpOnly`;
  }
  if (options.sameSite) {
    const s = String(options.sameSite).toLowerCase();
    if (s === "lax") str += `; SameSite=Lax`;
    else if (s === "strict") str += `; SameSite=Strict`;
    else if (s === "none") str += `; SameSite=None`;
  } else {
    str += `; SameSite=Lax`;
  }
  return str;
}

/**
 * Sets an authentication cookie securely in a Next.js / Hono / Server context.
 */
export async function setAuthCookie(
  name: string,
  token: string,
  options: CookieOptions = {},
  context?: any,
): Promise<void> {
  const config = getConfig().auth;
  const defaultMaxAge = config?.session?.adminMaxAge ?? 900;
  const isProduction = process.env.NODE_ENV === "production";
  const isSecure = options.secure ?? config?.session?.secure ?? isProduction;

  const cookieOptions: CookieOptions = {
    httpOnly: options.httpOnly ?? true,
    secure: isSecure,
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
    maxAge: options.maxAge ?? defaultMaxAge,
  };

  // 1. If Hono / Cifer context or Response headers are provided, set header
  if (context) {
    const serialized = serializeCookie(name, token, cookieOptions);
    if (typeof context.header === "function") {
      context.header("Set-Cookie", serialized, { append: true });
    } else if (typeof context?.res?.headers?.append === "function") {
      context.res.headers.append("Set-Cookie", serialized);
    }
  }

  // 2. Also attempt Next.js cookies() API
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set(name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });
  } catch {
    // Graceful fallback when outside Next.js cookies lifecycle
  }
}

/**
 * Retrieves an authentication cookie value from Next.js cookie store.
 */
export async function getAuthCookie(name: string): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
  } catch {
    return undefined;
  }
}

/**
 * Removes/deletes an authentication cookie.
 */
export async function removeAuthCookie(
  name: string,
  options: { path?: string } = {},
  context?: any,
): Promise<void> {
  // 1. If Hono / Cifer context provided, set deletion cookie (Max-Age=0)
  if (context) {
    const serialized = serializeCookie(name, "", {
      path: options.path ?? "/",
      maxAge: 0,
    });
    if (typeof context.header === "function") {
      context.header("Set-Cookie", serialized, { append: true });
    } else if (typeof context?.res?.headers?.append === "function") {
      context.res.headers.append("Set-Cookie", serialized);
    }
  }

  // 2. Also attempt Next.js cookies() API
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete({
      name,
      path: options.path ?? "/",
    });
  } catch {
    // Graceful fallback if called outside request context
  }
}
