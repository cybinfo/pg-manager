"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Icon-only toggle for top bar / compact use
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <ThemeDropdownItems theme={theme} setTheme={setTheme} />
    </DropdownMenu>
  )
}

// Full-width sidebar row that matches Settings/Logout styling
export function ThemeToggleSidebar() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          aria-label="Toggle theme"
        >
          <div className="relative h-5 w-5">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </div>
          Theme
        </button>
      </DropdownMenuTrigger>
      <ThemeDropdownItems theme={theme} setTheme={setTheme} />
    </DropdownMenu>
  )
}

function ThemeDropdownItems({ theme, setTheme }: { theme: string | undefined; setTheme: (t: string) => void }) {
  return (
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={() => setTheme("light")}
        className={theme === "light" ? "bg-muted" : ""}
      >
        <Sun className="h-4 w-4" />
        <span>Light</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => setTheme("dark")}
        className={theme === "dark" ? "bg-muted" : ""}
      >
        <Moon className="h-4 w-4" />
        <span>Dark</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => setTheme("system")}
        className={theme === "system" ? "bg-muted" : ""}
      >
        <Monitor className="h-4 w-4" />
        <span>System</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
