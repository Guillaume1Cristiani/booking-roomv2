import { NextRequest, NextResponse } from "next/server";

interface RateLimitWindow {
  timestamps: number[];
}

/** Sliding-window rate limiter backed by an in-memory Map.
 *
 * Note: this works correctly for single-process deployments (e.g. PM2 fork
 * mode on one server). For multi-instance deployments, replace the Map with
 * a shared store (e.g. Redis / Upstash).
 */
const windows = new Map<string, RateLimitWindow>();

/** Clean up all expired windows to prevent unbounded memory growth. */
function purgeExpiredWindows(windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  for (const [key, win] of windows.entries()) {
    if (win.timestamps.every((t) => t < cutoff)) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the oldest request ages out of the window
}

/**
 * Check whether `key` is within the allowed rate.
 * @param key     Unique identifier (e.g. `"${ip}:${route}"`)
 * @param limit   Max requests per window
 * @param windowMs  Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  purgeExpiredWindows(windowMs);

  const now = Date.now();
  const windowStart = now - windowMs;

  const win = windows.get(key) ?? { timestamps: [] };
  win.timestamps = win.timestamps.filter((t) => t > windowStart);

  if (win.timestamps.length >= limit) {
    const oldest = win.timestamps[0]!;
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    windows.set(key, win);
    return { allowed: false, remaining: 0, retryAfter };
  }

  win.timestamps.push(now);
  windows.set(key, win);
  return { allowed: true, remaining: limit - win.timestamps.length, retryAfter: 0 };
}

/** Extract the real client IP from common proxy headers. */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Return a 429 response with standard Retry-After header. */
export function rateLimitedResponse(retryAfter: number): NextResponse {
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": "100",
    },
  });
}
