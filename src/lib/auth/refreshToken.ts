export interface TokenResponse {
  access_token: string;
  /** Returned only when the `offline_access` scope is included. */
  refresh_token?: string;
  expires_in: number;
}

/**
 * Exchange a refresh token for a new access (+ refresh) token pair.
 * Returns `null` if the refresh fails (expired refresh token, revoked
 * consent, server error) so the caller can redirect to login.
 *
 * Requires `offline_access` to be included in MICROSOFT_SCOPES for the
 * MS authorization server to issue refresh tokens in the first place.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse | null> {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const scopes = process.env.MICROSOFT_SCOPES;

  if (!tenantId || !clientId || !clientSecret || !scopes) {
    console.error("refreshAccessToken: missing required env vars");
    return null;
  }

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: scopes,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("refreshAccessToken: token endpoint error:", err);
      return null;
    }

    return (await response.json()) as TokenResponse;
  } catch (error) {
    console.error("refreshAccessToken: network error:", error);
    return null;
  }
}

/** Parse the `exp` Unix timestamp from a JWT without verifying the signature. */
export function parseTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}
