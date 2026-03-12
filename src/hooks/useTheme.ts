import { useState, useEffect } from "react";

type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("orchestra-theme") as Theme) || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("orchestra-theme", theme);
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, toggleTheme, setTheme };
}
