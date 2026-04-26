/**
 * Sidebar Order Management Hook
 *
 * Manages user preferences for sidebar section ordering.
 * Stores order in localStorage for persistence across sessions.
 */

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "sidebar-order"

export interface SidebarOrderState {
  /** Order of main navigation items by name */
  mainOrder: string[]
  /** Order of children within each parent section */
  childOrder: Record<string, string[]>
}

const DEFAULT_STATE: SidebarOrderState = {
  mainOrder: [],
  childOrder: {},
}

export function useSidebarOrder() {
  const [order, setOrder] = useState<SidebarOrderState>(DEFAULT_STATE)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load order from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setOrder(parsed)
      }
    } catch (error) {
      console.error("Failed to load sidebar order:", error)
    }
    // eslint-disable-next-line react-compiler/react-compiler
    setIsLoaded(true)
  }, [])

  // Save order to localStorage
  const saveOrder = useCallback((newOrder: SidebarOrderState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
      setOrder(newOrder)
    } catch (error) {
      console.error("Failed to save sidebar order:", error)
    }
  }, [])

  // Reorder main navigation items
  const reorderMain = useCallback((fromIndex: number, toIndex: number, items: string[]) => {
    const newMainOrder = [...items]
    const [removed] = newMainOrder.splice(fromIndex, 1)
    newMainOrder.splice(toIndex, 0, removed)

    const newOrder = {
      ...order,
      mainOrder: newMainOrder,
    }
    saveOrder(newOrder)
  }, [order, saveOrder])

  // Reorder children within a parent section
  const reorderChildren = useCallback((parentName: string, fromIndex: number, toIndex: number, items: string[]) => {
    const newChildOrder = [...items]
    const [removed] = newChildOrder.splice(fromIndex, 1)
    newChildOrder.splice(toIndex, 0, removed)

    const newOrder = {
      ...order,
      childOrder: {
        ...order.childOrder,
        [parentName]: newChildOrder,
      },
    }
    saveOrder(newOrder)
  }, [order, saveOrder])

  // Reset to default order
  const resetOrder = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setOrder(DEFAULT_STATE)
  }, [])

  // Apply order to navigation items
  const applyOrder = useCallback(<T extends { name: string; children?: T[] }>(
    items: T[],
    parentName?: string
  ): T[] => {
    const orderArray = parentName
      ? order.childOrder[parentName] || []
      : order.mainOrder

    if (orderArray.length === 0) {
      return items
    }

    // Create a map for quick lookup
    const itemMap = new Map(items.map(item => [item.name, item]))

    // Build ordered array
    const ordered: T[] = []

    // First, add items in the stored order
    for (const name of orderArray) {
      const item = itemMap.get(name)
      if (item) {
        ordered.push(item)
        itemMap.delete(name)
      }
    }

    // Then, add any remaining items (new items not in stored order)
    for (const item of itemMap.values()) {
      ordered.push(item)
    }

    return ordered
  }, [order])

  return {
    order,
    isLoaded,
    reorderMain,
    reorderChildren,
    resetOrder,
    applyOrder,
  }
}
