import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "./app/utils/apiHandler";
import { User } from "./components/Calendar/types/types";
import { protectedRoute } from "./lib/middleware/protectedRoutes";
import {
  validateMicrosoftToken,
  validateMicrosoftTokenAndPermissions,
} from "./lib/middleware/validateMicrosoftToken";

export async function middleware(req: NextRequest) {
  // Strip any identity headers from incoming requests to prevent spoofing.
  // We set these ourselves after the token is validated.
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
    const { status, data } = await validateMicrosoftTokenAndPermissions(
      cookiesHandler
    );
    if (status === true) {
      if (data?.id != null) {
        // Forward the validated MS identity so route handlers don't need to
        // re-call MS Graph to discover who the caller is.
        requestHeaders.set("x-ms-user-id", data.id);
        try {
          const retrieveUser: User = await apiHandler("/user", {
            method: "POST",
            body: JSON.stringify({ microsoft_id: data.id }),
          });
          requestHeaders.set("x-society-id", String(retrieveUser.society_id));
          requestHeaders.set("x-user-role", retrieveUser.role);

          return protectedRoute(
            retrieveUser.role,
            req.method,
            req.nextUrl.pathname,
            requestHeaders
          );
        } catch (e) {
          return NextResponse.redirect(
            new URL("/api/auth/microsoft?action=login", req.url)
          );
        }
      }
      return NextResponse.next();
    } else {
      return NextResponse.redirect(
        new URL("/api/auth/microsoft?action=login", req.url)
      );
    }
  } else {
    // Token is for pages view
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/api/auth/microsoft?action=login", req.url),
        { status: 303 }
      );
    }
    try {
      const isValidToken = await validateMicrosoftToken(token);
      if (!isValidToken) {
        return NextResponse.redirect(
          new URL("/api/auth/microsoft?action=login", req.url),
          { status: 303 }
        );
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
