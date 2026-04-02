import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

const API_BASE_URL = "/api";
const CURRENT_URL = process.env.URL;

export async function apiHandler(
  endpoint: string,
  options: RequestInit = {},
  tagtoRevalidate: string = ""
) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    Cookie: cookies().toString(),
  };

  const response = await fetch(`${CURRENT_URL}${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    return response.json();
  } else {
    if (tagtoRevalidate !== "") {
      try {
        revalidateTag(tagtoRevalidate);
      } catch {
        // revalidateTag is only available in Server Actions and Route Handlers,
        // not in middleware or other Edge contexts — silently skip.
      }
    }
  }

  return response.json();
}
