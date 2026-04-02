import { User } from "@/components/Calendar/types/types";
import { cookies } from "next/headers";
import { apiHandler } from "./apiHandler";

export async function getUserInfosWithMicrosoftToken(): Promise<User> {
  const token = cookies().get("token")?.value;
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const userInfo: User = await response.json();

    if (userInfo?.id) {
      const retrieveUser = await apiHandler("/user", {
        method: "POST",
        body: JSON.stringify({ microsoft_id: userInfo.id }),
      });
      return retrieveUser;
    }
    return userInfo;
  } catch (error) {
    console.error("Error validating Microsoft token:", error);
    return <User>{};
  }
}
