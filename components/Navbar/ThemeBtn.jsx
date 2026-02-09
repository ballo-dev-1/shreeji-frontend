"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeBtn = ({ isScrolled }) => {
  const [theme, setTheme] = useState("light-theme");

  useEffect(() => {
    document.body.classList.add(theme);
    return () => {
      document.body.classList.remove(theme);
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) =>
      prevTheme === "light-theme" ? "dark-theme" : "light-theme"
    );
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--primary)] hover:text-white"
      aria-label={theme === "dark-theme" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark-theme" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

export default ThemeBtn;
