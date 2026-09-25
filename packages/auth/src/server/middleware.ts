import { NextResponse, type NextRequest } from "next/server";
import { verifyJwt } from "../crypto/jwt";
import type { AdminSessionPayload, CustomerUser } from "../types";
import { getConfig } from "@nishchinte/config";
import { createRouteMatcher } from "@nishchinte/utils";

// Admin public routes (no auth required)
export const isAdminPublicRoute = createRouteMatcher([
  "/admin/setup",
  "/admin/sign-in",
]);

// Admin protected routes
export const isAdminRoute = createRouteMatcher(["/admin", "/admin/:path*"]);

// Public customer auth pages
export const isCustomerAuthPageRoute = createRouteMatcher([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/check-email",
]);

// Customer Account Protected Routes
export const isCustomerAccountRoute = createRouteMatcher([
  "/account",
  "/account/:path*",
]);

// Checkout Route
export const isCheckoutRoute = createRouteMatcher([
  "/checkout",
  "/checkout/:path*",
]);

/**
 * Edge-compatible Auth Middleware for Next.js.
 * Handles sub-millisecond zero-DB JWT session verification, route protection,
 * and 3-mode storefront enforcement (authless, auth, hybrid).
 */
export async function updateAuthSession(
  request: NextRequest,
): Promise<NextResponse> {
  const config = getConfig();
  const auth = config.auth;
  if (!auth) {
    throw new Error("Auth provider not found");
  }

  const { pathname, search } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  const customerMode = auth.customer.mode || "hybrid";

  requestHeaders.set("x-customer-auth-mode", customerMode);

  // 1. Extract and verify Admin session
  const adminCookieName = auth.cookieName.admin;
  const adminRefreshCookieName = auth.cookieName.adminRefresh;
  const adminToken = request.cookies.get(adminCookieName)?.value;
  const adminRefreshToken = request.cookies.get(adminRefreshCookieName)?.value;
  let adminSession: AdminSessionPayload | null = null;

  if (adminToken) {
    adminSession = await verifyJwt<AdminSessionPayload>(adminToken, {
      audience: auth.admin.audience,
    });
  }

  // 2. Extract and verify Customer session (if not authless)
  let customerSession: CustomerUser | null = null;
  let hasCustomerRefreshToken = false;

  if (customerMode !== "authless") {
    const customerCookieName = auth.cookieName.customer;
    const customerRefreshCookieName = auth.cookieName.customerRefresh;
    const customerToken = request.cookies.get(customerCookieName)?.value;
    const customerRefreshToken = request.cookies.get(
      customerRefreshCookieName,
    )?.value;
    hasCustomerRefreshToken = !!customerRefreshToken;

    if (customerToken) {
      customerSession = await verifyJwt<CustomerUser>(customerToken, {
        audience: auth.customer.audience,
      });
    }
  }

  // 3. Inject verified identity headers for downstream server components & actions
  if (adminSession?.id) {
    requestHeaders.set("x-user-id", adminSession.id);
    requestHeaders.set("x-user-email", adminSession.email);
    requestHeaders.set("x-user-name", adminSession.name);
    requestHeaders.set("x-user-role", adminSession.role);
    if (adminSession.sessionId) {
      requestHeaders.set("x-session-id", adminSession.sessionId);
    }
  }

  if (customerSession?.id) {
    requestHeaders.set("x-customer-id", customerSession.id);
    if (customerSession.phone) {
      requestHeaders.set("x-customer-phone", customerSession.phone);
    }
    if (customerSession.email) {
      requestHeaders.set("x-customer-email", customerSession.email);
    }
  }

  // =========================================================================
  // ADMIN REALM ROUTE PROTECTION
  // =========================================================================
  const isProtectedAdminRoute =
    isAdminRoute(pathname) && !isAdminPublicRoute(pathname);

  // If accessing protected admin route without active admin session or refresh token -> Redirect to Admin Sign In
  if (isProtectedAdminRoute && !adminSession && !adminRefreshToken) {
    const signInUrl = request.nextUrl.clone();
    const nextUrl = new URL(signInUrl.origin);
    nextUrl.pathname = "/admin/sign-in";
    if (pathname !== "/admin") {
      nextUrl.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(nextUrl);
  }

  // =========================================================================
  // CUSTOMER STOREFRONT ROUTE PROTECTION & MODE ENFORCEMENT
  // =========================================================================

  // MODE 1: AUTHLESS (No customer auth anywhere in storefront)
  if (customerMode === "authless") {
    if (isCustomerAuthPageRoute(pathname) || isCustomerAccountRoute(pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  }

  // MODE 2: AUTH (Strict Authentication Mode)
  if (customerMode === "auth") {
    const isProtectedCustomerRoute =
      isCustomerAccountRoute(pathname) || isCheckoutRoute(pathname);

    if (
      isProtectedCustomerRoute &&
      !customerSession &&
      !hasCustomerRefreshToken
    ) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = auth.customer.routes?.signIn || "/sign-in";
      signInUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(signInUrl);
    }
  }

  // MODE 3: HYBRID (Optional Customer Authentication)
  if (customerMode === "hybrid") {
    if (
      isCustomerAccountRoute(pathname) &&
      !customerSession &&
      !hasCustomerRefreshToken
    ) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = auth.customer.routes?.signIn || "/sign-in";
      signInUrl.searchParams.set("next", pathname + search);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
