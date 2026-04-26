"use client"

import { useEffect, useCallback, useRef } from "react"

export interface KeyboardShortcut {
  key: string          // e.g., "k", "n", "/", "?"
  metaKey?: boolean    // Cmd on Mac, Ctrl on Windows
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string  // e.g., "Open command palette"
  category: string     // e.g., "Navigation", "Actions"
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts)
  // eslint-disable-next-line react-hooks/refs
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      return
    }

    for (const shortcut of shortcutsRef.current) {
      const metaMatch = shortcut.metaKey ? (e.metaKey || e.ctrlKey) : true
      const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : true
      const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.altKey ? e.altKey : !e.altKey
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      if (keyMatch && metaMatch && ctrlMatch && shiftMatch && altMatch) {
        // For meta/ctrl shortcuts, always prevent default
        if (shortcut.metaKey || shortcut.ctrlKey) {
          e.preventDefault()
        }
        shortcut.action()
        return
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
