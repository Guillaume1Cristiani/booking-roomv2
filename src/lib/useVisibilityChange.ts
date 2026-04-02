import { useEffect, useState } from "react";

export function useVisibilityChange() {
  const [documentVisible, setDocumentVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setDocumentVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return documentVisible;
}
