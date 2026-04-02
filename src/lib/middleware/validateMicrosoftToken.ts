export async function validateMicrosoftToken(token: string) {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await response.json();
    if (res?.error != null) return false;
    else return true;
  } catch (error) {
    console.error("Error validating Microsoft token:", error);
    return false;
  }
}

export async function validateMicrosoftTokenAndPermissions(token: string) {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await response.json();
    return { status: true, data: res };
  } catch (error) {
    console.error("Error validating Microsoft token:", error);
    return { status: false, data: null };
  }
}
