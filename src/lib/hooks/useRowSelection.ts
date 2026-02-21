"use client"

import { useState, useCallback, useMemo } from "react"

export function useRowSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleRow = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === items.length) {
        return new Set()
      }
      return new Set(items.map(item => item.id))
    })
  }, [items])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  )

  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < items.length,
    [items.length, selectedIds.size]
  )

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleRow,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
  }
}
