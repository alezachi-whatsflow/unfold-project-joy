import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "cafe-noturno" | "pacifico" | "cosmos";

const THEME_KEY = "wf_theme";
const DEFAULT_THEME: ThemeMode = "cafe-noturno";

// Migration map from old theme names
const MIGRATE: Record<string, ThemeMode> = {
  sapphire: "cosmos",
  slate: "cafe-noturno",
  forest: "cafe-noturno",
  dark: "cafe-noturno",
  light: "pacifico",
  vibrant: "cosmos",
};

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && saved in MIGRATE) return MIGRATE[saved];
    if (saved === "cafe-noturno" || saved === "pacifico" || saved === "cosmos") return saved;
    return DEFAULT_THEME;
  });

  // Apply theme to <html> immediately
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.remove("theme-dark", "theme-light", "theme-vibrant");
  }, [theme]);

  // Load from Supabase on auth change
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.theme) {
            const t = data.theme as string;
            const resolved = MIGRATE[t] || (["cafe-noturno", "pacifico", "cosmos"].includes(t) ? t as ThemeMode : DEFAULT_THEME);
            setThemeState(resolved);
            localStorage.setItem(THEME_KEY, resolved);
          }
        });
    });
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    // Save to Supabase (fire and forget)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, theme: newTheme, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
          .then(() => {});
      }
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
