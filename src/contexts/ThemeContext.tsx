import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "sapphire" | "slate" | "forest";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "sapphire", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("wf-theme") as ThemeMode;
    // Migrate old theme keys
    if (saved === ("dark" as string) || saved === ("vibrant" as string)) return "sapphire";
    if (saved === ("light" as string)) return "slate";
    return saved || "sapphire";
  });

  useEffect(() => {
    localStorage.setItem("wf-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    // Clean up old class-based themes
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light", "theme-vibrant");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
