"use client"

import { useRouter } from "next/navigation"
import { useKeyboardShortcuts, KeyboardShortcut } from "@/lib/hooks/useKeyboardShortcuts"
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog"

export function DashboardShortcuts() {
  const _router = useRouter()

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts using "g" prefix (like GitHub)
    // We'll handle two-key combos by tracking a "pending" state
    // For simplicity, use single-key navigation for now
  ]

  // Register global shortcuts
  useKeyboardShortcuts(shortcuts)

  return <KeyboardShortcutsDialog />
}
