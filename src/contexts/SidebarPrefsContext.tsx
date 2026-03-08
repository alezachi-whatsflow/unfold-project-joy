import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import type { SidebarPreferences, SidebarLayout, SidebarDensity, SidebarWidth, NavCategory } from "@/types/sidebar";
import { DEFAULT_SIDEBAR_PREFS, DEFAULT_NAV_CATEGORIES } from "@/config/navigation";
import { usePermissions } from "@/hooks/usePermissions";

const STORAGE_KEY = "wf_sidebar_prefs";

function loadPrefs(): SidebarPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SIDEBAR_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SIDEBAR_PREFS };
}

interface SidebarPrefsCtx {
  prefs: SidebarPreferences;
  setPrefs: (p: Partial<SidebarPreferences>) => void;
  resetPrefs: () => void;
  categories: NavCategory[];
  visibleCategories: NavCategory[];
  updateCategoryCollapsed: (categoryId: string, collapsed: boolean) => void;
  toggleItemPin: (itemId: string) => void;
  toggleItemVisibility: (itemId: string) => void;
  toggleCategoryVisibility: (categoryId: string) => void;
}

const SidebarPrefsContext = createContext<SidebarPrefsCtx>({
  prefs: DEFAULT_SIDEBAR_PREFS,
  setPrefs: () => {},
  resetPrefs: () => {},
  categories: DEFAULT_NAV_CATEGORIES,
  visibleCategories: DEFAULT_NAV_CATEGORIES,
  updateCategoryCollapsed: () => {},
  toggleItemPin: () => {},
  toggleItemVisibility: () => {},
  toggleCategoryVisibility: () => {},
});

export function SidebarPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, _setPrefs] = useState<SidebarPreferences>(loadPrefs);

  const persist = useCallback((next: SidebarPreferences) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const setPrefs = useCallback((partial: Partial<SidebarPreferences>) => {
    _setPrefs((prev) => {
      const next = { ...prev, ...partial };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetPrefs = useCallback(() => {
    const def = { ...DEFAULT_SIDEBAR_PREFS };
    _setPrefs(def);
    persist(def);
  }, [persist]);

  const categories = useMemo(() => {
    if (prefs.categoryOrganization === 'custom' && prefs.customCategories?.length) {
      return prefs.customCategories;
    }
    return DEFAULT_NAV_CATEGORIES;
  }, [prefs.categoryOrganization, prefs.customCategories]);

  // We can't call usePermissions here since it's inside AuthProvider
  // So visibleCategories will be filtered inside the sidebar components themselves
  const visibleCategories = categories;

  const updateCategoryCollapsed = useCallback((categoryId: string, collapsed: boolean) => {
    _setPrefs(prev => {
      const cats = (prev.customCategories?.length ? [...prev.customCategories] : DEFAULT_NAV_CATEGORIES.map(c => ({ ...c }))).map(c =>
        c.id === categoryId ? { ...c, collapsed } : c
      );
      const next = { ...prev, customCategories: cats };
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleItemPin = useCallback((itemId: string) => {
    _setPrefs(prev => {
      const pins = prev.pinnedItems || [];
      const next = pins.includes(itemId)
        ? { ...prev, pinnedItems: pins.filter(id => id !== itemId) }
        : { ...prev, pinnedItems: pins.length < 5 ? [...pins, itemId] : pins };
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleItemVisibility = useCallback((itemId: string) => {
    if (itemId === 'dashboard') return; // Dashboard can't be hidden
    _setPrefs(prev => {
      const cats = (prev.customCategories?.length ? prev.customCategories : DEFAULT_NAV_CATEGORIES).map(c => ({
        ...c,
        items: c.items.map(item =>
          item.id === itemId ? { ...item, visible: item.visible === false ? true : false } : item
        ),
      }));
      const next = { ...prev, customCategories: cats, categoryOrganization: 'custom' as const };
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleCategoryVisibility = useCallback((categoryId: string) => {
    _setPrefs(prev => {
      const cats = (prev.customCategories?.length ? prev.customCategories : DEFAULT_NAV_CATEGORIES).map(c =>
        c.id === categoryId ? { ...c, visible: c.visible === false ? true : false } : c
      );
      const next = { ...prev, customCategories: cats, categoryOrganization: 'custom' as const };
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <SidebarPrefsContext.Provider value={{
      prefs, setPrefs, resetPrefs, categories, visibleCategories,
      updateCategoryCollapsed, toggleItemPin, toggleItemVisibility, toggleCategoryVisibility,
    }}>
      {children}
    </SidebarPrefsContext.Provider>
  );
}

export const useSidebarPrefs = () => useContext(SidebarPrefsContext);

// Re-export types for backward compatibility
export type { SidebarLayout, SidebarDensity } from "@/types/sidebar";
