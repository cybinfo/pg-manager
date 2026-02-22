"use client"

import { useState, useEffect } from "react"
import { Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShortcutItem {
  keys: string[]     // e.g., ["Cmd", "K"] or ["G", "T"]
  description: string
}

interface ShortcutCategory {
  name: string
  shortcuts: ShortcutItem[]
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "T"], description: "Go to Tenants" },
      { keys: ["G", "P"], description: "Go to Payments" },
      { keys: ["G", "B"], description: "Go to Bills" },
      { keys: ["G", "R"], description: "Go to Reports" },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      { keys: ["\u2318", "K"], description: "Open command palette" },
      { keys: ["N"], description: "Create new (context-aware)" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close dialog / Cancel" },
    ],
  },
]

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "?" key opens shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        ) return
        e.preventDefault()
        setOpen(prev => !prev)
      }
      // Escape closes
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative bg-card border rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/30">
          <Keyboard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <div className="ml-auto">
            <kbd className="px-2 py-1 text-xs bg-muted rounded border font-mono">Esc</kbd>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.name}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
                          <kbd className={cn(
                            "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5",
                            "text-xs font-mono bg-muted border rounded shadow-sm"
                          )}>
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded font-mono mx-1">?</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  )
}
