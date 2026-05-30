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
import { GripVertical, Lock, Unlock, RotateCcw } from "lucide-react"
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

// Hook to get layout order from localStorage
function useLayoutStorage(key: string) {
  const storageKey = `section-order-${key}`

  const getStoredOrder = React.useCallback((): string[] | null => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [storageKey])

  const saveOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(storageKey, JSON.stringify(order))
    } catch (e) {
      logger.error("Failed to save layout:", { detail: e })
    }
  }, [storageKey])

  const clearOrder = React.useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(storageKey)
  }, [storageKey])

  return { getStoredOrder, saveOrder, clearOrder }
}

// Sortable item wrapper for edit mode
interface SortableItemProps {
  id: string
  children: React.ReactNode
  isEditMode: boolean
}

function SortableItem({ id, children, isEditMode }: SortableItemProps) {
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
        isDragging && "opacity-80 shadow-2xl"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
      >
        <div className="bg-card/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-primary/5 active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="ring-2 ring-dashed ring-teal-500/30 rounded-lg">
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
  const { getStoredOrder, saveOrder, clearOrder } = useLayoutStorage(layoutKey)

  // Get valid children with stable IDs based on title prop or key
  const childrenWithIds = React.useMemo(() => {
    const items: { id: string; element: React.ReactElement }[] = []
    const usedIds = new Set<string>()

    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child)) {
        // Try to get a stable ID from: key > title prop > index fallback
        let id: string

        if (child.key && typeof child.key === 'string') {
          id = `section-${child.key}`
        } else if (child.props && typeof child.props === 'object' && 'title' in child.props) {
          // Use title prop for stable ID (kebab-case)
          const title = String(child.props.title || '')
          id = `section-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
        } else {
          id = `section-${index}`
        }

        // Handle duplicate IDs by appending index
        if (usedIds.has(id)) {
          id = `${id}-${index}`
        }
        usedIds.add(id)

        items.push({ id, element: child })
      }
    })
    return items
  }, [children])

  // Default order
  const defaultOrder = React.useMemo(() =>
    childrenWithIds.map(item => item.id),
    [childrenWithIds]
  )

  // Current order
  const [order, setOrder] = React.useState<string[]>(defaultOrder)

  // Refs to measure each item's rendered height
  const itemRefs = React.useRef<Map<string, HTMLDivElement | null>>(new Map())
  // Height-balanced column distribution; null = use round-robin until first measurement
  const [balancedCols, setBalancedCols] = React.useState<Array<Array<{ id: string; element: React.ReactElement | undefined }>> | null>(null)

  // Load stored order on mount - flexible matching for varying section counts
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const stored = getStoredOrder()
    if (stored && stored.length > 0) {
      // Build new order: start with stored items that exist, then add any new items
      const currentIds = new Set(defaultOrder)
      const storedIds = new Set(stored)

      // Items from stored order that still exist
      const orderedExisting = stored.filter(id => currentIds.has(id))
      // New items not in stored order (append at end)
      const newItems = defaultOrder.filter(id => !storedIds.has(id))

      const mergedOrder = [...orderedExisting, ...newItems]

      // Only apply if we have at least some matching items
      if (orderedExisting.length > 0) {
        setOrder(mergedOrder)
      }
    }
  }, [getStoredOrder, defaultOrder])

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBalancedCols(null) // reset so round-robin shows while re-measuring
      setOrder(prevOrder => {
        const oldIndex = prevOrder.indexOf(active.id as string)
        const newIndex = prevOrder.indexOf(over.id as string)
        const newOrder = arrayMove(prevOrder, oldIndex, newIndex)
        saveOrder(newOrder)
        return newOrder
      })
    }
  }, [saveOrder])

  // Reset to default order
  const handleResetLayout = React.useCallback(() => {
    clearOrder()
    setBalancedCols(null)
    setOrder(defaultOrder)
  }, [clearOrder, defaultOrder])

  // Get ordered children
  const orderedChildren = React.useMemo(() => {
    const childMap = new Map(childrenWithIds.map(item => [item.id, item.element]))
    return order.map(id => ({
      id,
      element: childMap.get(id),
    })).filter(item => item.element)
  }, [order, childrenWithIds])

  // After items render, measure heights and redistribute into shortest column first
  React.useEffect(() => {
    if (!mounted || orderedChildren.length === 0) return
    const timer = setTimeout(() => {
      const colHeights = Array(columns).fill(0)
      const dist: string[][] = Array.from({ length: columns }, () => [])
      for (const { id } of orderedChildren) {
        const el = itemRefs.current.get(id)
        const h = el ? el.offsetHeight : 0
        const shortestCol = colHeights.indexOf(Math.min(...colHeights))
        dist[shortestCol].push(id)
        colHeights[shortestCol] += h
      }
      const childMap = new Map(orderedChildren.map(item => [item.id, item.element]))
      setBalancedCols(dist.map(ids => ids.map(id => ({ id, element: childMap.get(id) }))))
    }, 0)
    return () => clearTimeout(timer)
  }, [mounted, orderedChildren, columns])

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

  // Edit mode: same two-column layout with drag handles on each card
  if (isEditMode) {
    const editCols = balancedCols ?? splitIntoColumns(orderedChildren, columns)
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
            Reset Order
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
                    <SortableItem key={id} id={id} isEditMode={isEditMode}>
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

  // Normal mode: height-balanced columns (falls back to round-robin before first measurement)
  const cols = balancedCols ?? splitIntoColumns(orderedChildren, columns)

  return (
    <div className="relative">
      {editable && (
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(true)}
            className="text-xs h-8"
          >
            <Unlock className="mr-1 h-3 w-3" />
            Customize Layout
          </Button>
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
    </div>
  )
}
