"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/form-components"
import type { PaginationState } from "@/lib/hooks/useListPage"

interface PaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  showPageSize?: boolean
  showTotal?: boolean
  className?: string
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = "",
}: PaginationProps) {
  const { page, pageSize, total, totalPages, hasNextPage, hasPrevPage } = pagination

  // Calculate display range
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Left side: Total count and page size selector */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showTotal && (
          <span>
            Showing {from} to {to} of {total} results
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              options={pageSizeOptions.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              className="w-20"
            />
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page indicator */}
        <div className="flex items-center gap-1 px-2 text-sm">
          <span>Page</span>
          <span className="font-medium">{page}</span>
          <span>of</span>
          <span className="font-medium">{totalPages}</span>
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Compact pagination for mobile or space-constrained areas
 */
export function PaginationCompact({
  pagination,
  onPageChange,
  className = "",
}: Omit<PaginationProps, "pageSizeOptions" | "showPageSize" | "showTotal">) {
  const { page, totalPages, hasNextPage, hasPrevPage } = pagination

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevPage}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Prev
      </Button>

      <span className="text-sm text-muted-foreground px-2">
        {page} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}
