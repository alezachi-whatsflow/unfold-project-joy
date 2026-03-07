import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type SidebarLayout = "standard" | "compact" | "rail";
export type SidebarDensity = "comfortable" | "default" | "compact";

export interface SidebarPrefs {
  layout: SidebarLayout;
  density: SidebarDensity;
}

const STORAGE_KEY = "wf_sidebar_prefs";

const defaultPrefs: SidebarPrefs = { layout: "standard", density: "default" };

function loadPrefs(): SidebarPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return defaultPrefs;
}

interface Ctx {
  prefs: SidebarPrefs;
  setPrefs: (p: Partial<SidebarPrefs>) => void;
}

const SidebarPrefsContext = createContext<Ctx>({ prefs: defaultPrefs, setPrefs: () => {} });

export function SidebarPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, _setPrefs] = useState<SidebarPrefs>(loadPrefs);

  const setPrefs = useCallback((partial: Partial<SidebarPrefs>) => {
    _setPrefs((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <SidebarPrefsContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </SidebarPrefsContext.Provider>
  );
}

export const useSidebarPrefs = () => useContext(SidebarPrefsContext);
