/**
 * In-memory cache for MS Graph token validation results.
 * Key = the raw access token; value = the validated identity + expiry.
 *
 * This avoids hitting the MS Graph API on every middleware execution.
 * TTL is derived from the JWT `exp` claim so the cache never returns a
 * result after the token itself has expired.
 */
const tokenCache = new Map<
  string,
  {
    valid: boolean;
    data: Record<string, unknown> | null;
    expiresAt: number;
  }
>();

/** Parse the `exp` claim from a JWT without verifying the signature. */
function getTokenExpiry(token: string): number {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return Date.now() + 5 * 60 * 1000;
    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as { exp?: number };
    if (typeof decoded.exp === "number") return decoded.exp * 1000;
  } catch {
    // ignore malformed tokens — fall through to default TTL
  }
  return Date.now() + 5 * 60 * 1000; // 5-minute fallback
}

/** Remove stale entries to prevent unbounded memory growth. */
function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of tokenCache.entries()) {
    if (entry.expiresAt <= now) tokenCache.delete(key);
  }
}

export async function validateMicrosoftToken(token: string): Promise<boolean> {
  purgeExpired();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.valid;

  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await response.json();
    const valid = res?.error == null;
    tokenCache.set(token, {
      valid,
      data: valid ? (res as Record<string, unknown>) : null,
      expiresAt: getTokenExpiry(token),
    });
    return valid;
  } catch (error) {
    console.error("Error validating Microsoft token:", error);
    return false;
  }
}

export async function validateMicrosoftTokenAndPermissions(
  token: string
): Promise<{ status: boolean; data: Record<string, unknown> | null }> {
  purgeExpired();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { status: cached.valid, data: cached.data };
  }

  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = (await response.json()) as Record<string, unknown>;
    const valid = res?.error == null;
    tokenCache.set(token, {
      valid,
      data: valid ? res : null,
      expiresAt: getTokenExpiry(token),
    });
    return { status: valid, data: valid ? res : null };
  } catch (error) {
    console.error("Error validating Microsoft token:", error);
    return { status: false, data: null };
  }
}

