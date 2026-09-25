import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";
import { rotateRefreshToken } from "@nishchinte/auth/server";
import { setAuthCookie } from "@nishchinte/auth";
import { getConfig } from "@nishchinte/config";

/**
 * POST /auth/refresh
 * Rotates customer or admin refresh tokens with anti-replay detection.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  const config = getConfig().auth;
  if (!config) {
    return CiferResponse.json(
      { ok: false, error: "Auth provider not configured" },
      { status: 500 },
    );
  }

  try {
    let bodyRefreshToken: string | undefined;
    try {
      const body = (await req.json()) as {
        refreshToken?: string;
        audience?: string;
      };
      bodyRefreshToken = body?.refreshToken;
    } catch {
      // Body optional
    }

    const customerRefreshCookie = req.cookies.get(
      config.cookieName.customerRefresh,
    );
    const adminRefreshCookie = req.cookies.get(config.cookieName.adminRefresh);

    const refreshToken =
      bodyRefreshToken || customerRefreshCookie || adminRefreshCookie;

    if (!refreshToken) {
      return CiferResponse.json(
        { ok: false, error: "Refresh token not found" },
        { status: 400 },
      );
    }

    const audience = adminRefreshCookie
      ? config.admin.audience
      : config.customer.audience;

    const newTokens = await rotateRefreshToken({
      refreshToken,
      audience,
      ipAddress: req.ip || null,
      userAgent: req.headers.get("user-agent") || null,
    });

    const isCustomer = audience === config.customer.audience;
    const cookieName = isCustomer
      ? config.cookieName.customer
      : config.cookieName.admin;
    const refreshCookieName = isCustomer
      ? config.cookieName.customerRefresh
      : config.cookieName.adminRefresh;

    await setAuthCookie(
      cookieName,
      newTokens.accessToken,
      {
        maxAge: config.session.accessTokenMaxAge,
        secure: config.session.secure,
      },
      ctx,
    );

    if (newTokens.refreshToken) {
      await setAuthCookie(
        refreshCookieName,
        newTokens.refreshToken,
        {
          maxAge: config.session.refreshTokenMaxAge,
          secure: config.session.secure,
        },
        ctx,
      );
    }

    return CiferResponse.json({
      ok: true,
      data: newTokens,
    });
  } catch (error: any) {
    console.error("POST /auth/refresh error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Token refresh failed" },
      { status: 401 },
    );
  }
}
