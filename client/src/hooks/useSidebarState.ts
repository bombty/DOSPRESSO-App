import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "dospresso-sidebar-expanded";

export function useSidebarState() {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isExpanded));
    } catch {}
  }, [isExpanded]);

  const toggle = useCallback(() => setIsExpanded((prev) => !prev), []);
  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  return { isExpanded, toggle, expand, collapse };
}
