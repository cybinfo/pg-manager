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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SortableMasonryProps {
  children: React.ReactNode
  layoutKey: string
  columns?: 1 | 2 | 3
  gap?: "sm" | "md" | "lg"
  className?: string
  editable?: boolean
}

type ColItem = { id: string; element: React.ReactElement | undefined }
type BalancedCols = ColItem[][]

// ─── localStorage helpers ────────────────────────────────────────────────────

function useLayoutStorage(key: string) {
  const orderKey = `section-order-${key}`
  const hiddenKey = `section-hidden-${key}`

  const getStoredOrder = React.useCallback((): string[] | null => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(orderKey)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  }, [orderKey])

  const saveOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return
    try { localStorage.setItem(orderKey, JSON.stringify(order)) }
    catch (e) { logger.error("Failed to save layout:", { detail: e }) }
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
    } catch { return [] }
  }, [hiddenKey])

  const saveHidden = React.useCallback((ids: string[]) => {
    if (typeof window === "undefined") return
    try {
      if (ids.length === 0) localStorage.removeItem(hiddenKey)
      else localStorage.setItem(hiddenKey, JSON.stringify(ids))
    } catch (e) { logger.error("Failed to save hidden sections:", { detail: e }) }
  }, [hiddenKey])

  const clearHidden = React.useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(hiddenKey)
  }, [hiddenKey])

  return { getStoredOrder, saveOrder, clearOrder, getStoredHidden, saveHidden, clearHidden }
}

// ─── SortableItem (visible sections) ─────────────────────────────────────────

interface SortableItemProps {
  id: string
  children: React.ReactNode
  isEditMode: boolean
  onToggleHide: () => void
}

function SortableItem({ id, children, isEditMode, onToggleHide }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !isEditMode })

  const style = isEditMode
    ? { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }
    : undefined

  if (!isEditMode) return <>{children}</>

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", isDragging && "opacity-80 shadow-2xl")}
    >
      {/* Eye-off toggle — top left, hides the section */}
      <button
        onClick={onToggleHide}
        title="Hide section"
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-primary/5"
      >
        <EyeOff className="h-4 w-4 text-muted-foreground" />
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

      <div className="ring-2 ring-dashed ring-teal-500/30 rounded-lg">
        {children}
      </div>
    </div>
  )
}

// ─── HiddenSortableItem (hidden zone in edit mode) ────────────────────────────

interface HiddenSortableItemProps {
  id: string
  children: React.ReactNode
  onUnhide: () => void
}

function HiddenSortableItem({ id, children, onUnhide }: HiddenSortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", isDragging && "opacity-60 shadow-2xl")}
    >
      {/* Eye toggle — top left, unhides the section */}
      <button
        onClick={onUnhide}
        title="Show section"
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/95 backdrop-blur-sm rounded-md shadow-md border p-1.5 hover:bg-primary/5"
      >
        <Eye className="h-4 w-4 text-muted-foreground" />
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

      <div className="ring-2 ring-dashed ring-muted-foreground/25 rounded-lg">
        <div className="opacity-40 pointer-events-none select-none">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const gapStyles = { sm: "gap-4", md: "gap-6", lg: "gap-8" }

// SSR-only round-robin: no ids, no heights, just split ReactNode[]
function splitRoundRobin<T>(items: T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => [])
  items.forEach((item, i) => cols[i % n].push(item))
  return cols
}

// ─── Core algorithm (single source of truth) ─────────────────────────────────
//
// Used everywhere: normal mode, edit mode, hidden zone, drag end, hide toggle.
// Heights come from lastHeightsRef; unmeasured items get h=1 (count proxy).
// Post-process: if one col has ≥2 more items AND is also taller, move its
// last item to the other col so count and height imbalance don't compound.
//
function computeCols(
  items: ColItem[],
  n: number,
  heights: Map<string, number>
): BalancedCols {
  const colH = Array(n).fill(0)
  const dist: string[][] = Array.from({ length: n }, () => [])

  for (const { id } of items) {
    const h = heights.get(id) ?? 1
    const shortest = colH.indexOf(Math.min(...colH))
    dist[shortest].push(id)
    colH[shortest] += h
  }

  if (n === 2) {
    const longer = dist[0].length > dist[1].length ? 0 : 1
    const shorter = 1 - longer
    if (Math.abs(dist[0].length - dist[1].length) >= 2 && colH[longer] >= colH[shorter]) {
      const moved = dist[longer].pop()
      if (moved !== undefined) dist[shorter].push(moved)
    }
  }

  const childMap = new Map(items.map(item => [item.id, item.element]))
  return dist.map(ids => ids.map(id => ({ id, element: childMap.get(id) })))
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [balancedCols, setBalancedCols] = React.useState<BalancedCols | null>(null)

  const { getStoredOrder, saveOrder, clearOrder, getStoredHidden, saveHidden, clearHidden } =
    useLayoutStorage(layoutKey)

  // Persists measured heights across all re-renders and state changes.
  // This is the single source of truth for heights used by computeCols everywhere.
  const lastHeightsRef = React.useRef<Map<string, number>>(new Map())

  // Refs for measuring DOM heights in normal mode
  const itemRefs = React.useRef<Map<string, HTMLDivElement | null>>(new Map())

  // ── childrenWithIds ──────────────────────────────────────────────────────

  const childrenWithIds = React.useMemo(() => {
    const items: { id: string; element: React.ReactElement }[] = []
    const usedIds = new Set<string>()
    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child)) {
        let id: string
        if (child.key && typeof child.key === "string") {
          id = `section-${child.key}`
        } else if (child.props && typeof child.props === "object" && "title" in child.props) {
          const title = String(child.props.title || "")
          id = `section-${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
        } else {
          id = `section-${index}`
        }
        if (usedIds.has(id)) id = `${id}-${index}`
        usedIds.add(id)
        items.push({ id, element: child })
      }
    })
    return items
  }, [children])

  const defaultOrder = React.useMemo(
    () => childrenWithIds.map(item => item.id),
    [childrenWithIds]
  )

  const [order, setOrder] = React.useState<string[]>(defaultOrder)

  // ── Load persisted state on mount ────────────────────────────────────────

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const stored = getStoredOrder()
    if (stored && stored.length > 0) {
      const currentIds = new Set(defaultOrder)
      const orderedExisting = stored.filter(id => currentIds.has(id))
      const newItems = defaultOrder.filter(id => !new Set(stored).has(id))
      if (orderedExisting.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrder([...orderedExisting, ...newItems])
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHiddenIds(getStoredHidden())
  }, [getStoredOrder, getStoredHidden, defaultOrder])

  // ── Derived item lists ───────────────────────────────────────────────────

  const orderedChildren = React.useMemo(() => {
    const childMap = new Map(childrenWithIds.map(item => [item.id, item.element]))
    return order.map(id => ({ id, element: childMap.get(id) })).filter(item => item.element) as ColItem[]
  }, [order, childrenWithIds])

  const visibleChildren = React.useMemo(
    () => orderedChildren.filter(item => !hiddenIds.includes(item.id)),
    [orderedChildren, hiddenIds]
  )

  const hiddenChildren = React.useMemo(
    () => orderedChildren.filter(item => hiddenIds.includes(item.id)),
    [orderedChildren, hiddenIds]
  )

  // ── Measure heights in normal mode, then recompute ───────────────────────
  // itemRefs are only set in normal mode — if all heights are 0 we're in edit
  // mode or pre-mount; skip so round-robin fallback stays in place.

  React.useEffect(() => {
    if (!mounted || visibleChildren.length === 0) return
    const timer = setTimeout(() => {
      let totalHeight = 0
      for (const { id } of visibleChildren) {
        const h = itemRefs.current.get(id)?.offsetHeight ?? 0
        if (h > 0) lastHeightsRef.current.set(id, h)
        totalHeight += h
      }
      if (totalHeight === 0) return
      setBalancedCols(computeCols(visibleChildren, columns, lastHeightsRef.current))
    }, 0)
    return () => clearTimeout(timer)
  }, [mounted, visibleChildren, columns])

  // ── Sensors ──────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder(prevOrder => {
      const newOrder = arrayMove(
        prevOrder,
        prevOrder.indexOf(active.id as string),
        prevOrder.indexOf(over.id as string)
      )
      saveOrder(newOrder)
      // Recompute from stored heights with new order so edit mode stays balanced
      const childMap = new Map(childrenWithIds.map(c => [c.id, c.element]))
      const newVisible = newOrder
        .map(id => ({ id, element: childMap.get(id) }))
        .filter(item => item.element && !hiddenIds.includes(item.id)) as ColItem[]
      setBalancedCols(computeCols(newVisible, columns, lastHeightsRef.current))
      return newOrder
    })
  }, [saveOrder, childrenWithIds, hiddenIds, columns])

  const handleResetLayout = React.useCallback(() => {
    clearOrder()
    clearHidden()
    lastHeightsRef.current.clear()
    setBalancedCols(null)
    setOrder(defaultOrder)
    setHiddenIds([])
    setShowHidden(false)
  }, [clearOrder, clearHidden, defaultOrder])

  // Recompute balanced cols from scratch whenever visibility changes.
  // Uses stored heights so the distribution is always optimal — no in-place patching.
  // Reorders hidden items within the shared order array without affecting visible items
  const handleDragEndHidden = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder(prevOrder => {
      const newOrder = arrayMove(
        prevOrder,
        prevOrder.indexOf(active.id as string),
        prevOrder.indexOf(over.id as string)
      )
      saveOrder(newOrder)
      return newOrder
    })
  }, [saveOrder])

  const handleToggleHide = React.useCallback((id: string) => {
    setHiddenIds(prev => {
      const isHiding = !prev.includes(id)
      const next = isHiding ? [...prev, id] : prev.filter(h => h !== id)
      saveHidden(next)
      // Recompute visible distribution with the updated hidden set
      const childMap = new Map(childrenWithIds.map(c => [c.id, c.element]))
      const newVisible = orderedChildren
        .filter(item => !next.includes(item.id))
        .map(item => ({ id: item.id, element: childMap.get(item.id) })) as ColItem[]
      setBalancedCols(computeCols(newVisible, columns, lastHeightsRef.current))
      return next
    })
  }, [saveHidden, childrenWithIds, orderedChildren, columns])

  // ── Hidden zone renderer ─────────────────────────────────────────────────
  // editMode=true  → items are draggable (HiddenSortableItem) with Eye/grip controls
  // editMode=false → items are static with an Unhide button only

  const renderHiddenZone = (editMode: boolean) => {
    if (hiddenChildren.length === 0) return null
    const hiddenCols = computeCols(hiddenChildren, columns, lastHeightsRef.current)
    const hiddenItemIds = hiddenChildren.map(c => c.id)

    const colsJsx = (
      <div className={cn("flex flex-col md:flex-row items-start", gapStyles[gap])}>
        {hiddenCols.map((colItems, colIdx) => (
          <div key={colIdx} className={cn("w-full md:flex-1 flex flex-col", gapStyles[gap])}>
            {colItems.map(({ id, element }) =>
              editMode ? (
                <HiddenSortableItem key={id} id={id} onUnhide={() => handleToggleHide(id)}>
                  {element}
                </HiddenSortableItem>
              ) : (
                <div key={id} className="relative">
                  <div className="opacity-40 pointer-events-none select-none">{element}</div>
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
              )
            )}
          </div>
        ))}
      </div>
    )

    return (
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-dashed" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Hidden sections</span>
          <div className="flex-1 border-t border-dashed" />
        </div>
        {editMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndHidden}>
            <SortableContext items={hiddenItemIds} strategy={rectSortingStrategy}>
              {colsJsx}
            </SortableContext>
          </DndContext>
        ) : colsJsx}
      </div>
    )
  }

  // ─── SSR fallback ────────────────────────────────────────────────────────

  if (!mounted) {
    const ssrCols = splitRoundRobin(React.Children.toArray(children), columns)
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

  // ─── Edit mode ───────────────────────────────────────────────────────────
  // Visible sections in draggable two-column grid.
  // Hidden sections in their own zone below (same computeCols algorithm).

  if (isEditMode) {
    const editCols = balancedCols ?? computeCols(visibleChildren, columns, lastHeightsRef.current)
    const visibleIds = visibleChildren.map(c => c.id)
    return (
      <div className="relative">
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleResetLayout} className="text-xs h-8">
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
          <Button variant="default" size="sm" onClick={() => setIsEditMode(false)} className="text-xs h-8">
            <Lock className="mr-1 h-3 w-3" />
            Done
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
            <div className={cn("flex flex-col md:flex-row items-start", gapStyles[gap], className)}>
              {editCols.map((colItems, colIdx) => (
                <div key={colIdx} className={cn("w-full md:flex-1 flex flex-col", gapStyles[gap])}>
                  {colItems.map(({ id, element }) => (
                    <SortableItem key={id} id={id} isEditMode={true} onToggleHide={() => handleToggleHide(id)}>
                      {element}
                    </SortableItem>
                  ))}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {renderHiddenZone(true)}
      </div>
    )
  }

  // ─── Normal mode ─────────────────────────────────────────────────────────
  // balancedCols = measured height-based distribution.
  // Falls back to computeCols with stored heights (or count proxy) if null.

  const cols = balancedCols ?? computeCols(visibleChildren, columns, lastHeightsRef.current)

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
              {showHidden ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
              {showHidden ? "Hide" : `Hidden (${hiddenChildren.length})`}
            </Button>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="text-xs h-8">
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
                ref={el => { itemRefs.current.set(id, el) }}
                className={balancedCols !== null ? "[&>*]:![animation:none]" : ""}
              >
                {element}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showHidden && renderHiddenZone(false)}
    </div>
  )
}
