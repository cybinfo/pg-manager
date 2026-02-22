"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DataTableSearchProps {
  search: string
  setSearch: (value: string) => void
  searchPlaceholder: string
}

export function DataTableSearch({
  search,
  setSearch,
  searchPlaceholder,
}: DataTableSearchProps) {
  // Ref to maintain search input focus after re-renders
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  // Track last time user typed (timestamp)
  const lastTypedRef = React.useRef(0)
  // Track cursor position before re-render
  const cursorPosRef = React.useRef(0)

  // Use layoutEffect to restore focus synchronously before paint
  // If user typed recently (within 1 second), restore focus
  React.useLayoutEffect(() => {
    const timeSinceTyped = Date.now() - lastTypedRef.current
    if (timeSinceTyped < 1000 && searchInputRef.current && document.activeElement !== searchInputRef.current) {
      searchInputRef.current.focus()
      // Restore cursor position
      const pos = Math.min(cursorPosRef.current, searchInputRef.current.value.length)
      searchInputRef.current.setSelectionRange(pos, pos)
    }
  })

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={searchInputRef}
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => {
          // Track when user last typed (for focus restoration)
          lastTypedRef.current = Date.now()
          // Save cursor position before state update triggers re-render
          cursorPosRef.current = e.target.selectionStart || e.target.value.length
          setSearch(e.target.value)
        }}
        className="pl-9 bg-card"
      />
    </div>
  )
}
