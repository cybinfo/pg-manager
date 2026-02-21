"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FolderOpen, FolderClosed, ChevronsDownUp, ChevronsUpDown as ExpandAllIcon } from "lucide-react"
import { Column, GroupConfig, NestedGroup } from "./types"
import { DataTableRow } from "./DataTableRow"

// ============================================
// Group Controls Bar
// ============================================

interface DataTableGroupControlsProps {
  groupConfigs: GroupConfig[]
  collapsibleGroups: boolean
  allGroupsExpanded: boolean
  allGroupsCollapsed: boolean
  expandAllGroups: () => void
  collapseAllGroups: () => void
}

export function DataTableGroupControls({
  groupConfigs,
  collapsibleGroups,
  allGroupsExpanded,
  allGroupsCollapsed,
  expandAllGroups,
  collapseAllGroups,
}: DataTableGroupControlsProps) {
  if (!collapsibleGroups) return null

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50/50">
      <span className="text-xs text-muted-foreground">
        {groupConfigs.length > 1
          ? `Grouped by ${groupConfigs.length} fields`
          : `Grouped by ${groupConfigs[0]?.label || groupConfigs[0]?.key}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={expandAllGroups}
          disabled={allGroupsExpanded}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
            allGroupsExpanded
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
          )}
        >
          <ExpandAllIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Expand All</span>
        </button>
        <button
          type="button"
          onClick={collapseAllGroups}
          disabled={allGroupsCollapsed}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
            allGroupsCollapsed
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
          )}
        >
          <ChevronsDownUp className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Collapse All</span>
        </button>
      </div>
    </div>
  )
}

// ============================================
// Nested Group Renderer
// ============================================

interface NestedGroupRendererProps<T extends object> {
  groups: NestedGroup<T>[]
  collapsedGroups: Set<string>
  collapsibleGroups: boolean
  toggleGroup: (key: string) => void
  keyField: keyof T
  columns: Column<T>[]
  visibleColumns: Column<T>[]
  gridTemplate: string
  isClickable: boolean
  onRowClick: (row: T) => void
  groupCounts?: Record<string, number>
  selectable?: boolean
  selectedIdSet?: Set<string>
  onToggleRow?: (id: string) => void
}

// Depth-based styling
function getDepthStyles(depth: number) {
  const bgColors = [
    "bg-slate-100/80 hover:bg-slate-100",      // depth 0
    "bg-slate-50/80 hover:bg-slate-50",        // depth 1
    "bg-white hover:bg-slate-50/50",           // depth 2+
  ]
  const countBgColors = [
    "bg-slate-200",   // depth 0
    "bg-slate-150",   // depth 1
    "bg-slate-100",   // depth 2+
  ]
  return {
    bg: bgColors[Math.min(depth, bgColors.length - 1)],
    countBg: countBgColors[Math.min(depth, countBgColors.length - 1)],
    paddingLeft: `${1 + depth * 1.5}rem`, // Indent based on depth
  }
}

// Get total row count including nested children
function getTotalRowCount<T>(group: NestedGroup<T>): number {
  if (group.children.length === 0) {
    return group.rows.length
  }
  return group.children.reduce((sum, child) => sum + getTotalRowCount(child), 0)
}

export function NestedGroupRenderer<T extends object>({
  groups,
  collapsedGroups,
  collapsibleGroups,
  toggleGroup,
  keyField,
  columns,
  visibleColumns,
  gridTemplate,
  isClickable,
  onRowClick,
  groupCounts,
  selectable,
  selectedIdSet,
  onToggleRow,
}: NestedGroupRendererProps<T>) {
  return (
    <>
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key)
        const GroupIcon = isCollapsed ? FolderClosed : FolderOpen
        const styles = getDepthStyles(group.depth)
        const hasChildren = group.children.length > 0
        const pageRowCount = getTotalRowCount(group)

        // Try to get server count using the group config key and label
        // The key format from useListPage is "groupField:value"
        const serverCountKey = `${group.config.key}:${group.label}`
        const serverCount = groupCounts?.[serverCountKey]
        const rowCount = serverCount ?? pageRowCount
        const isPartial = serverCount !== undefined && pageRowCount < serverCount

        return (
          <div key={group.key}>
            {/* Group Header */}
            <div
              className={cn(
                "py-2.5 border-b flex items-center gap-3",
                styles.bg,
                collapsibleGroups && "cursor-pointer"
              )}
              style={{ paddingLeft: styles.paddingLeft, paddingRight: "1rem" }}
              onClick={() => toggleGroup(group.key)}
            >
              {collapsibleGroups && (
                <GroupIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {group.config.label && (
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {group.config.label}:
                  </span>
                )}
                <span className={cn(
                  "text-sm truncate",
                  group.depth === 0 ? "font-medium" : "font-normal"
                )}>
                  {group.config.renderLabel
                    ? group.config.renderLabel(group.label, rowCount)
                    : group.label}
                </span>
              </div>
              <span className={cn(
                "text-xs text-muted-foreground px-2 py-0.5 rounded-full",
                styles.countBg
              )}>
                {isPartial ? `${pageRowCount} of ${rowCount}` : rowCount}
              </span>
            </div>

            {/* Group Content (children or rows) */}
            {!isCollapsed && (
              hasChildren ? (
                // Render nested groups
                <NestedGroupRenderer
                  groups={group.children}
                  collapsedGroups={collapsedGroups}
                  collapsibleGroups={collapsibleGroups}
                  toggleGroup={toggleGroup}
                  keyField={keyField}
                  columns={columns}
                  visibleColumns={visibleColumns}
                  gridTemplate={gridTemplate}
                  isClickable={isClickable}
                  onRowClick={onRowClick}
                  groupCounts={groupCounts}
                  selectable={selectable}
                  selectedIdSet={selectedIdSet}
                  onToggleRow={onToggleRow}
                />
              ) : (
                // Render data rows at leaf level
                <div className="divide-y">
                  {group.rows.map((row) => (
                    <DataTableRow
                      key={String(row[keyField])}
                      row={row}
                      columns={columns}
                      visibleColumns={visibleColumns}
                      gridTemplate={gridTemplate}
                      isClickable={isClickable}
                      onRowClick={onRowClick}
                      selectable={selectable}
                      isSelected={selectedIdSet?.has(String(row[keyField]))}
                      onToggleRow={() => onToggleRow?.(String(row[keyField]))}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        )
      })}
    </>
  )
}
