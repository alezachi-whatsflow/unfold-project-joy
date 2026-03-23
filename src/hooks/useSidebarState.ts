import { useState, useCallback } from "react";

export function useSidebarState(key: string = "wf_msg_sidebar") {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(key) !== "collapsed";
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem(key, next ? "expanded" : "collapsed"); } catch {}
      return next;
    });
  }, [key]);

  return { expanded, toggle };
}
