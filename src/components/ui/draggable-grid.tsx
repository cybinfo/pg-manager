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

interface DraggableGridProps {
  children: React.ReactNode
  layoutKey: string
  columns?: number
  className?: string
  editable?: boolean
}

// Hook to get layout order from localStorage
function useLayoutStorage(key: string) {
  const storageKey = `layout-order-${key}`

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

// Sortable item wrapper
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-90 shadow-2xl scale-[1.02]",
        isEditMode && "ring-2 ring-dashed ring-teal-500/30 rounded-lg"
      )}
    >
      {/* Drag handle - only visible in edit mode */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab drag-handle"
        >
          <div className="bg-card/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-primary/5 active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export function DraggableGrid({
  children,
  layoutKey,
  columns = 2,
  className,
  editable = true,
}: DraggableGridProps) {
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const { getStoredOrder, saveOrder, clearOrder } = useLayoutStorage(layoutKey)

  // Get valid children with IDs
  const childrenWithIds = React.useMemo(() => {
    const items: { id: string; element: React.ReactElement }[] = []
    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child)) {
        items.push({
          id: `section-${index}`,
          element: child,
        })
      }
    })
    return items
  }, [children])

  // Default order
  const defaultOrder = React.useMemo(() =>
    childrenWithIds.map(item => item.id),
    [childrenWithIds]
  )

  // Current order (from storage or default)
  const [order, setOrder] = React.useState<string[]>(defaultOrder)

  // Load stored order on mount
  React.useEffect(() => {
    setMounted(true)
    const stored = getStoredOrder()
    if (stored && stored.length === defaultOrder.length) {
      // Validate stored order contains all current IDs
      const valid = defaultOrder.every(id => stored.includes(id))
      if (valid) {
        setOrder(stored)
      }
    }
  }, [getStoredOrder, defaultOrder])

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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
        "grid gap-6 items-start",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}>
        {children}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Edit mode toggle */}
      {editable && (
        <div className="absolute -top-12 right-0 z-20 flex items-center gap-2">
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetLayout}
              className="text-xs h-8"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          )}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className="text-xs h-8"
          >
            {isEditMode ? (
              <>
                <Lock className="mr-1 h-3 w-3" />
                Lock
              </>
            ) : (
              <>
                <Unlock className="mr-1 h-3 w-3" />
                Customize
              </>
            )}
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className={cn(
            "grid gap-6 items-start",
            columns === 1 && "grid-cols-1",
            columns === 2 && "grid-cols-1 md:grid-cols-2",
            columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
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

// GridItem wrapper component (optional, for explicit control)
interface GridItemProps {
  children: React.ReactNode
  id?: string
  className?: string
}

export function GridItem({ children, className }: GridItemProps) {
  return (
    <div className={cn("h-full", className)}>
      {children}
    </div>
  )
}
