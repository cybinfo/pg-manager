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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { GripVertical, Lock, Unlock, RotateCcw } from "lucide-react"
import { Button } from "./button"

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
      console.error("Failed to save layout:", e)
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
        <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-teal-50 active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="ring-2 ring-dashed ring-teal-500/30 rounded-lg">
        {children}
      </div>
    </div>
  )
}

// Use CSS Grid for row-by-row layout (unified across all pages)
const gridStyles = {
  1: "grid grid-cols-1",
  2: "grid grid-cols-1 md:grid-cols-2",
  3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}

const gapStyles = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
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

  // Load stored order on mount - flexible matching for varying section counts
  React.useEffect(() => {
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

  // SSR fallback
  if (!mounted) {
    return (
      <div className={cn(
        gridStyles[columns],
        gapStyles[gap],
        "items-start",
        className
      )}>
        {children}
      </div>
    )
  }

  // Edit mode: show masonry with drag handles visible
  if (isEditMode) {
    return (
      <div className="relative">
        {/* Edit mode controls */}
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
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className={cn(
              gridStyles[columns],
              gapStyles[gap],
              "items-start",
              className
            )}>
              {orderedChildren.map(({ id, element }) => (
                <SortableItem key={id} id={id} isEditMode={isEditMode}>
                  {element}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  // Normal mode: masonry layout with ordered children
  return (
    <div className="relative">
      {/* Customize button */}
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

      <div className={cn(
        gridStyles[columns],
        gapStyles[gap],
        "items-start",
        className
      )}>
        {orderedChildren.map(({ id, element }) => (
          <React.Fragment key={id}>{element}</React.Fragment>
        ))}
      </div>
    </div>
  )
}
