import { db } from "@/db"; // Adjust this import to match your Drizzle setup
import { User } from "@/db/schema"; // Import your users table
import axios from "axios";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // retrieve URL
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host");
  const baseUrl = `${protocol}://${host}`;

  if (action === "login") {
    // Redirect to Microsoft for authentication
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    if (!tenantId) {
      console.error("MICROSOFT_TENANT_ID is not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Generate a unique, unpredictable CSRF state token for this login attempt.
    const csrfState = crypto.randomUUID();
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${
      process.env.MICROSOFT_CLIENT_ID
    }&response_type=code&redirect_uri=${encodeURIComponent(
      process.env.MICROSOFT_REDIRECT_URI!
    )}&scope=${encodeURIComponent(
      process.env.MICROSOFT_SCOPES!
    )}&response_mode=query&state=${csrfState}`;

    const loginRedirect = NextResponse.redirect(authUrl);
    loginRedirect.cookies.set({
      name: "oauth_state",
      value: csrfState,
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes — just enough to complete the OAuth flow
      path: "/",
    });
    return loginRedirect;
  } else if (action === "callback") {
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Validate CSRF state: compare the state param with the stored cookie.
    const receivedState = searchParams.get("state");
    const storedState = request.cookies.get("oauth_state")?.value;
    if (!receivedState || !storedState || receivedState !== storedState) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }

    try {
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          scope: process.env.MICROSOFT_SCOPES!,
          code,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          grant_type: "authorization_code",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const graphResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me",
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        }
      );

      // Upsert user in the database
      const existingUser = await db
        .select()
        .from(User)
        .where(eq(User.microsoft_id, graphResponse.data.id))
        .limit(1);

      let user;
      if (existingUser.length > 0) {
        user = await db
          .update(User)
          .set({
            givenName: graphResponse.data.givenName,
            surname: graphResponse.data.surname,
            email: graphResponse.data.mail,
            picture: graphResponse.data.picture,
          })
          .where(eq(User.microsoft_id, graphResponse.data.id))
          .returning();
      } else {
        user = await db
          .insert(User)
          .values({
            microsoft_id: graphResponse.data.id,
            givenName: graphResponse.data.givenName,
            surname: graphResponse.data.surname,
            email: graphResponse.data.mail,
            picture: graphResponse.data.picture,
            role: "VIEWER",
            society_id: 1,
          })
          .returning();
      }

      // Set cookie to store the token; clear the one-time CSRF state cookie.
      const response = NextResponse.redirect(`${baseUrl}/calendar`);
      response.cookies.set({
        name: "token",
        value: tokenResponse.data.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "lax",
        maxAge: tokenResponse.data.expires_in,
        path: "/",
      });
      response.cookies.delete("oauth_state");

      return response;
    } catch (error) {
      console.error("Error during authentication:", error);
      return NextResponse.redirect(process.env.URL as string);
    }
  } else {
    return NextResponse.json({ error: "Unrecognized action" }, { status: 400 });
  }
}
