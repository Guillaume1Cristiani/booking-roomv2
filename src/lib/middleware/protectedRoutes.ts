import { HttpMethod, Role } from "@/components/Calendar/types/types";
import { NextResponse } from "next/server";

export function protectedRoute(
  role: Role,
  method: HttpMethod,
  pathname: string,
  headers?: Headers
) {
  const next = (status?: number) =>
    status
      ? new NextResponse("Insufficient Permissions", { status })
      : NextResponse.next({ request: headers ? { headers } : undefined });

  switch (role) {
    case "VIEWER":
      return method !== "GET" ? next(401) : next();
    case "EDITOR":
      return next();
    default:
      return next(401);
  }
}
