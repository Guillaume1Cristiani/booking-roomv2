import { User } from "@/components/Calendar/types/types";
import { cookies } from "next/headers";
import { apiHandler } from "./apiHandler";

export async function getUserInfosWithMicrosoftToken(): Promise<User | null> {
  const token = cookies().get("token")?.value;
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const userInfo = await response.json();

    if (userInfo?.id) {
      const retrieveUser: User = await apiHandler("/user", {
        method: "POST",
        body: JSON.stringify({ microsoft_id: userInfo.id }),
      });
      return retrieveUser;
    }
    return null;
  } catch (error) {
    console.error("Error validating Microsoft token:", error);
    return null;
  }
}
