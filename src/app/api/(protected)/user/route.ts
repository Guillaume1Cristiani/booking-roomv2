import { db } from "@/db";
import { User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve identity from the validated MS token — never trust the request body.
    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!graphResponse.ok) {
      cookies().delete("token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: microsoft_id } = await graphResponse.json();

    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.microsoft_id, microsoft_id))
      .limit(1);

    if (!user) {
      cookies().delete("token");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
