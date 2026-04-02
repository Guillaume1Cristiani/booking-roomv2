import { revalidateTag } from "next/cache";

export async function shortPollingRevalidate(name: string) {
  revalidateTag(name);
}

export default revalidateTag;
