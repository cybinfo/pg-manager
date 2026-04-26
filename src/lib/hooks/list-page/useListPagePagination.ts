/**
 * useListPagePagination Hook
 *
 * Manages page state, page size, and pagination calculations.
 */

"use client"

import { useState, useMemo } from "react"
import type { PaginationState } from "./types"

// ============================================
// Types
// ============================================

export interface UseListPagePaginationOptions {
  defaultPageSize: number
}

export interface UseListPagePaginationReturn {
  // State
  page: number
  pageSize: number
  total: number
  setPageState: (page: number) => void
  setPageSizeState: (size: number) => void
  setTotal: (total: number) => void

  // Computed
  pagination: PaginationState
}

// ============================================
// Hook Implementation
// ============================================

export function useListPagePagination(
  options: UseListPagePaginationOptions
): UseListPagePaginationReturn {
  const { defaultPageSize } = options

  // Pagination state
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)
  const [total, setTotal] = useState(0)

  // Compute pagination state
  const pagination = useMemo((): PaginationState => {
    const totalPages = Math.ceil(total / pageSize) || 1
    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  }, [page, pageSize, total])

  return {
    page,
    pageSize,
    total,
    setPageState,
    setPageSizeState,
    setTotal,
    pagination,
  }
}
