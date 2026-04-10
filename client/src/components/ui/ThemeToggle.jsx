import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <button className={`w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-800/10 ${className}`} disabled></button>;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-800/10 transition-colors ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-500 transition-all" />
      ) : (
        <Moon className="h-5 w-5 text-blue-500 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
