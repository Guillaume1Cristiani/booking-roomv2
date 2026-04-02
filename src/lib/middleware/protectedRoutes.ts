import { HttpMethod, Role } from "@/components/Calendar/types/types";
import { NextResponse } from "next/server";

export function protectedRoute(
  role: Role,
  method: HttpMethod,
  pathname: string
) {
  switch (role) {
    case "VIEWER": {
      if (method !== "GET")
        return new NextResponse("Unsifficient Permissions", { status: 401 });
      else return NextResponse.next();
    }
    case "EDITOR": {
      return NextResponse.next();
    }
    default: {
      return new NextResponse("Unsifficient Permissions", { status: 401 });
    }
  }
}
