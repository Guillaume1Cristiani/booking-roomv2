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
    // return NextResponse.next();
    const cookiesHandler = cookies().get("token")?.value;
    if (!cookiesHandler)
      return new NextResponse("Unauthorized", { status: 401 });
    const { status, data } = await validateMicrosoftTokenAndPermissions(
      cookiesHandler
    );
    if (status === true) {
      // Check Perms Here
      if (data?.id != null) {
        try {
          const retrieveUser: User = await apiHandler("/user", {
            method: "POST",
            body: JSON.stringify({ microsoft_id: data.id }),
          });

          return protectedRoute(
            retrieveUser.role,
            req.method,
            req.nextUrl.pathname
          );
        } catch (e) {
          const response = NextResponse.redirect(
            new URL("/api/auth/microsoft?action=login", req.url)
          );
          return response;
        }

        // return retrieveUser;
        // const { microsoft_id, role } = data as User;
      }
      return NextResponse.next();
    } else {
      const response = NextResponse.redirect(
        new URL("/api/auth/microsoft?action=login", req.url)
      );
      return response;
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
        const response = NextResponse.redirect(
          new URL("/api/auth/microsoft?action=login", req.url),
          { status: 303 }
        );
        return response;
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
