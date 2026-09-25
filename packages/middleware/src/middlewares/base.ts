import { NextResponse, type NextRequest } from "next/server";
import {
  getConfig,
} from "@nishchinte/config";
import type { NishchinteMiddlewareFn } from "../core/types";

/**
 * Base Headers Middleware.
 * Automatically injects standard origin, current-url, and current-path headers.
 */
export function createBaseMiddleware(): NishchinteMiddlewareFn {
  return function baseMiddleware(request: NextRequest, response: NextResponse): NextResponse {
    const config = getConfig();
    const originHeader = config?.originHeaderName;
    const urlHeader = config?.currentUrlHeaderName;
    const pathHeader = config?.currentPathHeaderName;

    const hostHeader =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost";
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http");

    const fullUrl = `${proto}://${hostHeader}${request.nextUrl.pathname}${request.nextUrl.search}`;
    const origin = `${proto}://${hostHeader}`;

    // Set request headers for downstream server components
    response.headers.set(originHeader, origin);
    response.headers.set(urlHeader, fullUrl);
    response.headers.set(pathHeader, request.nextUrl.pathname);

    return response;
  };
}
