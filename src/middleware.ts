import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "./app/utils/apiHandler";
import { User } from "./components/Calendar/types/types";
import { refreshAccessToken, parseTokenExpiry } from "./lib/auth/refreshToken";
import { protectedRoute } from "./lib/middleware/protectedRoutes";
import {
  validateMicrosoftToken,
  validateMicrosoftTokenAndPermissions,
} from "./lib/middleware/validateMicrosoftToken";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "./lib/rateLimit";

/** Proactive refresh threshold: refresh when token has less than 5 min left. */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Attempt a proactive token refresh. Returns the new token string on success,
 * or null if refresh is not possible / fails.
 */
async function tryRefresh(req: NextRequest): Promise<string | null> {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) return null;
  const result = await refreshAccessToken(refreshToken);
  return result?.access_token ?? null;
}

/** Apply new token + refresh_token cookies to an existing response. */
function applyTokenCookies(
  response: NextResponse,
  tokens: { access_token: string; refresh_token?: string; expires_in: number }
): void {
  const isSecure = process.env.NODE_ENV !== "development";
  response.cookies.set({
    name: "token",
    value: tokens.access_token,
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: tokens.expires_in,
    path: "/",
  });
  if (tokens.refresh_token) {
    response.cookies.set({
      name: "refresh_token",
      value: tokens.refresh_token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
}

export async function middleware(req: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  if (req.nextUrl.pathname.startsWith("/api")) {
    const ip = getClientIp(req);
    const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
    // Auth endpoints get a tighter limit (10 req/min) to slow brute-force.
    const limit = isAuthRoute ? 10 : 100;
    const result = checkRateLimit(`${ip}:${req.nextUrl.pathname}`, limit, 60_000);
    if (!result.allowed) return rateLimitedResponse(result.retryAfter);
  }

  // Strip any identity headers from incoming requests to prevent spoofing.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-ms-user-id");
  requestHeaders.delete("x-society-id");
  requestHeaders.delete("x-user-role");

  if (req.nextUrl.pathname === "/") {
    const token = req.cookies.get("token")?.value;
    if (!token || token === "") {
      return NextResponse.next();
    }
    try {
      const isValidToken = await validateMicrosoftToken(token);
      if (!isValidToken) {
        req.cookies.delete("token");
        return NextResponse.next();
      } else return NextResponse.redirect(new URL("/calendar", req.url));
    } catch (error) {
      console.error("Error validating token:", error);
      req.cookies.delete("token");
      return NextResponse.next();
    }
  }
  if (req.nextUrl.pathname.startsWith("/api")) {
    const cookiesHandler = cookies().get("token")?.value;
    if (!cookiesHandler)
      return new NextResponse("Unauthorized", { status: 401 });

    // ── Proactive token refresh ──────────────────────────────────────────
    let activeToken = cookiesHandler;
    let freshTokens: Awaited<ReturnType<typeof refreshAccessToken>> | null = null;

    const expiry = parseTokenExpiry(cookiesHandler);
    if (expiry !== null && expiry - Date.now() < REFRESH_THRESHOLD_MS) {
      const refreshToken = req.cookies.get("refresh_token")?.value;
      if (refreshToken) {
        const refreshResult = await refreshAccessToken(refreshToken);
        if (refreshResult) {
          activeToken = refreshResult.access_token;
          freshTokens = refreshResult;
        }
      }
    }

    const { status, data } = await validateMicrosoftTokenAndPermissions(activeToken);

    // If validation fails, attempt refresh as a fallback before giving up.
    if (!status) {
      const newToken = await tryRefresh(req);
      if (!newToken) {
        return NextResponse.redirect(
          new URL("/api/auth/microsoft?action=login", req.url)
        );
      }
      activeToken = newToken;
      const retried = await validateMicrosoftTokenAndPermissions(activeToken);
      if (!retried.status) {
        return NextResponse.redirect(
          new URL("/api/auth/microsoft?action=login", req.url)
        );
      }
      Object.assign(data ?? {}, retried.data);
    }

    if (data?.id != null) {
      requestHeaders.set("x-ms-user-id", data.id as string);
      try {
        const retrieveUser: User = await apiHandler("/user", {
          method: "POST",
          body: JSON.stringify({ microsoft_id: data.id }),
        });
        requestHeaders.set("x-society-id", String(retrieveUser.society_id));
        requestHeaders.set("x-user-role", retrieveUser.role);

        const response = protectedRoute(
          retrieveUser.role,
          req.method,
          req.nextUrl.pathname,
          requestHeaders
        );

        // Attach refreshed token cookies to the response if we just refreshed.
        if (freshTokens) applyTokenCookies(response, freshTokens);
        return response;
      } catch (e) {
        return NextResponse.redirect(
          new URL("/api/auth/microsoft?action=login", req.url)
        );
      }
    }
    return NextResponse.next();
  } else {
    // Token is for pages view
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/api/auth/microsoft?action=login", req.url),
        { status: 303 }
      );
    }

    // Proactive page-route refresh
    const expiry = parseTokenExpiry(token);
    if (expiry !== null && expiry - Date.now() < REFRESH_THRESHOLD_MS) {
      const refreshToken = req.cookies.get("refresh_token")?.value;
      if (refreshToken) {
        const refreshResult = await refreshAccessToken(refreshToken);
        if (refreshResult) {
          const response = NextResponse.next();
          applyTokenCookies(response, refreshResult);
          return response;
        }
      }
    }

    try {
      const isValidToken = await validateMicrosoftToken(token);
      if (!isValidToken) {
        // Try refresh before redirecting to login.
        const newToken = await tryRefresh(req);
        if (!newToken) {
          return NextResponse.redirect(
            new URL("/api/auth/microsoft?action=login", req.url),
            { status: 303 }
          );
        }
        const stillValid = await validateMicrosoftToken(newToken);
        if (!stillValid) {
          return NextResponse.redirect(
            new URL("/api/auth/microsoft?action=login", req.url),
            { status: 303 }
          );
        }
      }
    } catch (error) {
      console.error("Error validating token:", error);
      return NextResponse.redirect(
        new URL("/api/auth/microsoft?action=login", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/calendar/:path*", "/api/events/:path*", "/api/rooms/:path*"],
};
