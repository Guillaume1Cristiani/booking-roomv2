import { useEffect, useRef } from "react";

export function useDomRef(id: string) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    ref.current = document.getElementById(id);
  }, [id]);

  return ref;
}
