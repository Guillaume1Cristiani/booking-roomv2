"use server";

import { revalidateTag } from "next/cache";

export async function shortPollingRevalidate(name: string) {
  revalidateTag(name);
}
