import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";

interface ThemeContextValue {
  theme: Theme;
  fontSize: FontSize;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FONT_SIZE_CLASSES = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg"
};

const FONT_SIZE_SCALES = {
  small: "0.875",
  medium: "1",
  large: "1.125"
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("dospresso-theme") as Theme) || "system";
    }
    return "system";
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("dospresso-font-size") as FontSize) || "medium";
    }
    return "medium";
  });

  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      setEffectiveTheme(isDark ? "dark" : "light");
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);
      
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-scale", FONT_SIZE_SCALES[fontSize]);
    
    root.classList.remove("font-small", "font-medium", "font-large");
    root.classList.add(`font-${fontSize}`);
  }, [fontSize]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("dospresso-theme", newTheme);
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
    localStorage.setItem("dospresso-font-size", newSize);
  };

  return (
    <ThemeContext.Provider value={{ theme, fontSize, setTheme, setFontSize, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
