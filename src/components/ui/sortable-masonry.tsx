"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { GripVertical, Lock, Unlock, RotateCcw, Eye, EyeOff } from "lucide-react"
import { Button } from "./button"
import { logger } from "@/lib/logger"

interface SortableMasonryProps {
  children: React.ReactNode
  layoutKey: string
  columns?: 1 | 2 | 3
  gap?: "sm" | "md" | "lg"
  className?: string
  editable?: boolean
}

function useLayoutStorage(key: string) {
  const orderKey = `section-order-${key}`
  const hiddenKey = `section-hidden-${key}`

  const getStoredOrder = React.useCallback((): string[] | null => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(orderKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [orderKey])

  const saveOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(orderKey, JSON.stringify(order))
    } catch (e) {
      logger.error("Failed to save layout:", { detail: e })
    }
  }, [orderKey])

  const clearOrder = React.useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(orderKey)
  }, [orderKey])

  const getStoredHidden = React.useCallback((): string[] => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(hiddenKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }, [hiddenKey])

  const saveHidden = React.useCallback((ids: string[]) => {
    if (typeof window === "undefined") return
    try {
      if (ids.length === 0) {
        localStorage.removeItem(hiddenKey)
      } else {
        localStorage.setItem(hiddenKey, JSON.stringify(ids))
      }
    } catch (e) {
      logger.error("Failed to save hidden sections:", { detail: e })
    }
  }, [hiddenKey])

  const clearHidden = React.useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(hiddenKey)
  }, [hiddenKey])

  return { getStoredOrder, saveOrder, clearOrder, getStoredHidden, saveHidden, clearHidden }
}

interface SortableItemProps {
  id: string
  children: React.ReactNode
  isEditMode: boolean
  isHidden: boolean
  onToggleHide: () => void
}

function SortableItem({ id, children, isEditMode, isHidden, onToggleHide }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode })

  const style = isEditMode ? {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  } : undefined

  if (!isEditMode) {
    return <>{children}</>
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-80 shadow-2xl",
        isHidden && "opacity-50"
      )}
    >
      {/* Eye toggle — top left */}
      <button
        onClick={onToggleHide}
        title={isHidden ? "Show section" : "Hide section"}
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-primary/5"
      >
        {isHidden
          ? <Eye className="h-4 w-4 text-muted-foreground" />
          : <EyeOff className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {/* Drag handle — top right */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
      >
        <div className="bg-card/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-primary/5 active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Hidden badge */}
      {isHidden && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 pointer-events-none">
          <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full border">Hidden</span>
        </div>
      )}

      <div className={cn(
        "ring-2 ring-dashed rounded-lg",
        isHidden ? "ring-muted-foreground/20" : "ring-teal-500/30"
      )}>
        {children}
      </div>
    </div>
  )
}

const gapStyles = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
}

// Distribute items round-robin across N columns: 0→col0, 1→col1, 2→col0, …
function splitIntoColumns<T>(items: T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => [])
  items.forEach((item, i) => cols[i % n].push(item))
  return cols
}

export function SortableMasonry({
  children,
  layoutKey,
  columns = 2,
  gap = "md",
  className,
  editable = true,
}: SortableMasonryProps) {
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [showHidden, setShowHidden] = React.useState(false)
  const [hiddenIds, setHiddenIds] = React.useState<string[]>([])
  const { getStoredOrder, saveOrder, clearOrder, getStoredHidden, saveHidden, clearHidden } = useLayoutStorage(layoutKey)

  const childrenWithIds = React.useMemo(() => {
    const items: { id: string; element: React.ReactElement }[] = []
    const usedIds = new Set<string>()

    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child)) {
        let id: string

        if (child.key && typeof child.key === 'string') {
          id = `section-${child.key}`
        } else if (child.props && typeof child.props === 'object' && 'title' in child.props) {
          const title = String(child.props.title || '')
          id = `section-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
        } else {
          id = `section-${index}`
        }

        if (usedIds.has(id)) {
          id = `${id}-${index}`
        }
        usedIds.add(id)

        items.push({ id, element: child })
      }
    })
    return items
  }, [children])

  const defaultOrder = React.useMemo(() =>
    childrenWithIds.map(item => item.id),
    [childrenWithIds]
  )

  const [order, setOrder] = React.useState<string[]>(defaultOrder)

  // Refs to measure each item's rendered height
  const itemRefs = React.useRef<Map<string, HTMLDivElement | null>>(new Map())
  // Height-balanced column distribution; null = use round-robin until first measurement
  const [balancedCols, setBalancedCols] = React.useState<Array<Array<{ id: string; element: React.ReactElement | undefined }>> | null>(null)

  // Load stored order and hidden state on mount
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const stored = getStoredOrder()
    if (stored && stored.length > 0) {
      const currentIds = new Set(defaultOrder)
      const storedIds = new Set(stored)
      const orderedExisting = stored.filter(id => currentIds.has(id))
      const newItems = defaultOrder.filter(id => !storedIds.has(id))
      const mergedOrder = [...orderedExisting, ...newItems]
      if (orderedExisting.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrder(mergedOrder)
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHiddenIds(getStoredHidden())
  }, [getStoredOrder, getStoredHidden, defaultOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBalancedCols(null)
      setOrder(prevOrder => {
        const oldIndex = prevOrder.indexOf(active.id as string)
        const newIndex = prevOrder.indexOf(over.id as string)
        const newOrder = arrayMove(prevOrder, oldIndex, newIndex)
        saveOrder(newOrder)
        return newOrder
      })
    }
  }, [saveOrder])

  const handleResetLayout = React.useCallback(() => {
    clearOrder()
    clearHidden()
    setBalancedCols(null)
    setOrder(defaultOrder)
    setHiddenIds([])
    setShowHidden(false)
  }, [clearOrder, clearHidden, defaultOrder])

  const handleToggleHide = React.useCallback((id: string) => {
    setBalancedCols(null)
    setHiddenIds(prev => {
      const next = prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
      saveHidden(next)
      return next
    })
  }, [saveHidden])

  const orderedChildren = React.useMemo(() => {
    const childMap = new Map(childrenWithIds.map(item => [item.id, item.element]))
    return order.map(id => ({
      id,
      element: childMap.get(id),
    })).filter(item => item.element)
  }, [order, childrenWithIds])

  const visibleChildren = React.useMemo(() =>
    orderedChildren.filter(item => !hiddenIds.includes(item.id)),
    [orderedChildren, hiddenIds]
  )

  const hiddenChildren = React.useMemo(() =>
    orderedChildren.filter(item => hiddenIds.includes(item.id)),
    [orderedChildren, hiddenIds]
  )

  // After visible items render, measure heights and redistribute into shortest column first
  React.useEffect(() => {
    if (!mounted || visibleChildren.length === 0) return
    const timer = setTimeout(() => {
      const colHeights = Array(columns).fill(0)
      const dist: string[][] = Array.from({ length: columns }, () => [])
      for (const { id } of visibleChildren) {
        const el = itemRefs.current.get(id)
        const h = el ? el.offsetHeight : 0
        const shortestCol = colHeights.indexOf(Math.min(...colHeights))
        dist[shortestCol].push(id)
        colHeights[shortestCol] += h
      }
      const childMap = new Map(visibleChildren.map(item => [item.id, item.element]))
      setBalancedCols(dist.map(ids => ids.map(id => ({ id, element: childMap.get(id) }))))
    }, 0)
    return () => clearTimeout(timer)
  }, [mounted, visibleChildren, columns])

  // SSR fallback: split children into independent flex columns (no JS needed)
  if (!mounted) {
    const ssrChildren = React.Children.toArray(children)
    const ssrCols = splitIntoColumns(ssrChildren, columns)
    return (
      <div className={cn("flex flex-col md:flex-row items-start", gapStyles[gap], className)}>
        {ssrCols.map((colItems, colIdx) => (
          <div key={colIdx} className={cn("w-full md:flex-1 flex flex-col", gapStyles[gap])}>
            {colItems}
          </div>
        ))}
      </div>
    )
  }

  // Edit mode: all sections (including hidden) shown with drag + eye controls
  if (isEditMode) {
    // Start from the same balanced distribution as normal mode so the layout
    // doesn't shift when entering customize — then append hidden items at the end
    const baseEditCols: Array<Array<{ id: string; element: React.ReactElement | undefined }>> = balancedCols
      ? balancedCols.map(col => [...col])
      : splitIntoColumns(visibleChildren, columns)
    hiddenChildren.forEach(item => {
      const shortestIdx = baseEditCols.reduce((mi, col, i) => col.length < baseEditCols[mi].length ? i : mi, 0)
      baseEditCols[shortestIdx].push(item)
    })
    const editCols = baseEditCols
    return (
      <div className="relative">
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="text-xs h-8"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsEditMode(false)}
            className="text-xs h-8"
          >
            <Lock className="mr-1 h-3 w-3" />
            Done
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className={cn("flex flex-col md:flex-row items-start", gapStyles[gap], className)}>
              {editCols.map((colItems, colIdx) => (
                <div key={colIdx} className={cn("w-full md:flex-1 flex flex-col", gapStyles[gap])}>
                  {colItems.map(({ id, element }) => (
                    <SortableItem
                      key={id}
                      id={id}
                      isEditMode={isEditMode}
                      isHidden={hiddenIds.includes(id)}
                      onToggleHide={() => handleToggleHide(id)}
                    >
                      {element}
                    </SortableItem>
                  ))}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  // Normal mode: height-balanced visible columns
  const cols = balancedCols ?? splitIntoColumns(visibleChildren, columns)

  return (
    <div className="relative">
      {(editable || hiddenChildren.length > 0) && (
        <div className="flex items-center justify-end gap-2 mb-4">
          {hiddenChildren.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHidden(v => !v)}
              className="text-xs h-8 text-muted-foreground"
            >
              {showHidden
                ? <Eye className="mr-1 h-3 w-3" />
                : <EyeOff className="mr-1 h-3 w-3" />
              }
              {showHidden ? "Hide" : `Hidden (${hiddenChildren.length})`}
            </Button>
          )}
          {editable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="text-xs h-8"
            >
              <Unlock className="mr-1 h-3 w-3" />
              Customize Layout
            </Button>
          )}
        </div>
      )}

      <div className={cn("flex flex-col md:flex-row items-start", gapStyles[gap], className)}>
        {cols.map((colItems, colIdx) => (
          <div key={colIdx} className={cn("w-full md:flex-1 flex flex-col", gapStyles[gap])}>
            {colItems.map(({ id, element }) => (
              <div
                key={id}
                ref={(el) => { itemRefs.current.set(id, el) }}
                className={balancedCols !== null ? "[&>*]:![animation:none]" : ""}
              >
                {element}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Revealed hidden sections */}
      {showHidden && hiddenChildren.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-dashed" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Hidden sections</span>
            <div className="flex-1 border-t border-dashed" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {hiddenChildren.map(({ id, element }) => (
              <div key={id} className="relative">
                <div className="opacity-40 pointer-events-none select-none">
                  {element}
                </div>
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-card shadow-sm"
                    onClick={() => handleToggleHide(id)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Unhide
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
