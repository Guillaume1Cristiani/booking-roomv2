import { db } from "@/db";
import { User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { microsoft_id } = await request.json();

    if (!microsoft_id) {
      return NextResponse.json({ error: "Body not correct" }, { status: 400 });
    }
    const userMicrosoftId = await db
      .select()
      .from(User)
      .where(eq(User.microsoft_id, microsoft_id))
      .limit(1);
    if (!userMicrosoftId || userMicrosoftId?.length <= 0) {
      // Clean everything
      cookies().delete("token");
      return NextResponse.json({ error: "Internal server error" });
    } else return NextResponse.json(userMicrosoftId[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
