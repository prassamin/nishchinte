import { NextRequest, NextResponse } from "next/server";
import type { NishchinteMiddlewareFn } from "./types";

/**
 * Pipeline composer that runs middlewares sequentially,
 * aggregating all cookies, request headers, response headers, and short-circuiting on 3xx redirects.
 */
export function composeMiddlewares(
  ...handlers: (NishchinteMiddlewareFn | undefined | null | false)[]
) {
  return async function composedMiddleware(
    initialRequest: NextRequest
  ): Promise<NextResponse> {
    const activeHandlers = handlers.filter(Boolean) as NishchinteMiddlewareFn[];

    // Shared Cookie Jar across all middlewares in the chain
    const cookieJar = new Map<string, any>();

    // Accumulated response headers (sent to browser)
    const accumulatedResponseHeaders = new Headers();

    // Accumulated request headers (forwarded to downstream Server Components)
    const accumulatedRequestHeaders = new Headers(initialRequest.headers);

    let currentResponse = NextResponse.next({
      request: {
        headers: accumulatedRequestHeaders,
      },
    });

    for (const handler of activeHandlers) {
      // Execute middleware handler in sequence
      const result = await handler(initialRequest, currentResponse);

      if (result) {
        // Collect all cookies set by this middleware
        result.cookies.getAll().forEach((cookie) => {
          cookieJar.set(cookie.name, cookie);
        });

        // Collect all response headers set by this middleware
        result.headers.forEach((value, key) => {
          if (key.toLowerCase() !== "set-cookie") {
            accumulatedResponseHeaders.set(key, value);
          }
        });

        // If this handler triggered a Redirect or Rewrite (HTTP 3xx status)
        if (result.status >= 300 && result.status < 400) {
          // Attach ALL previously accumulated cookies to the redirect response!
          cookieJar.forEach((cookie) => {
            result.cookies.set(cookie);
          });
          accumulatedResponseHeaders.forEach((val, key) => {
            result.headers.set(key, val);
          });
          return result;
        }

        currentResponse = result;
      }
    }

    // Build the final response with all merged request headers, response headers, and cookies
    const finalResponse = NextResponse.next({
      request: {
        headers: accumulatedRequestHeaders,
      },
    });

    // Apply accumulated response headers
    accumulatedResponseHeaders.forEach((val, key) => {
      finalResponse.headers.set(key, val);
    });

    // Apply accumulated cookies
    cookieJar.forEach((cookie) => {
      finalResponse.cookies.set(cookie);
    });

    return finalResponse;
  };
}