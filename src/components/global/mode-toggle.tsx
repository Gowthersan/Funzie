"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Évite l'hydratation incorrecte en mode SSR

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative transition-all duration-300 group border border-neutral-500 dark:border-neutral-800"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 " />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`
          border transition-all duration-300 rounded-lg 
          ${
            resolvedTheme === "dark"
              ? "border-neutral-700 bg-neutral-900 text-white"
              : "border-neutral-300 bg-white text-black"
          }
        `}
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="hover:bg-neutral-800 dark:hover:bg-neutral-600 dark:hover:text-white transition-colors"
        >
          ☀️ Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="hover:bg-neutral-800 dark:hover:bg-neutral-600 dark:hover:text-white transition-colors"
        >
          🌙 Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="hover:bg-neutral-800 dark:hover:bg-neutral-600 dark:hover:text-white transition-colors"
        >
          🖥️ System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
