/**
 * Tests for useDeleteConfirmation and useMultiDelete hooks
 */

import { renderHook, act } from '@testing-library/react'
import {
  useDeleteConfirmation,
  useMultiDelete,
} from '@/lib/hooks/useDeleteConfirmation'

// Mock toast helpers
jest.mock('@/lib/toast-helpers', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

import { showSuccess, showError } from '@/lib/toast-helpers'

const mockShowSuccess = showSuccess as jest.MockedFunction<typeof showSuccess>
const mockShowError = showError as jest.MockedFunction<typeof showError>

// Mock window.confirm
const originalConfirm = window.confirm

beforeEach(() => {
  jest.clearAllMocks()
  window.confirm = jest.fn(() => true)
})

afterEach(() => {
  window.confirm = originalConfirm
})

describe('useDeleteConfirmation', () => {
  describe('initial state', () => {
    it('starts with deleting false', () => {
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete: jest.fn() })
      )

      expect(result.current.deleting).toBe(false)
    })

    it('starts with deletingId null', () => {
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete: jest.fn() })
      )

      expect(result.current.deletingId).toBeNull()
    })
  })

  describe('handleDelete', () => {
    it('calls onDelete with the provided id', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      await act(async () => {
        await result.current.handleDelete('tenant-123')
      })

      expect(onDelete).toHaveBeenCalledWith('tenant-123')
    })

    it('returns true on successful delete', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      let success: boolean = false
      await act(async () => {
        success = await result.current.handleDelete('id-1')
      })

      expect(success).toBe(true)
    })

    it('shows success toast', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete, successMessage: 'Tenant deleted' })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(mockShowSuccess).toHaveBeenCalledWith('Tenant deleted')
    })

    it('uses default success message when not provided', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(mockShowSuccess).toHaveBeenCalledWith('Deleted successfully')
    })

    it('calls onSuccess callback after successful delete', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const onSuccess = jest.fn()
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete, onSuccess })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('returns false on error', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('DB error'))
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      let success: boolean = true
      await act(async () => {
        success = await result.current.handleDelete('id-1')
      })

      expect(success).toBe(false)
    })

    it('shows error toast on failure with string errorMessage', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('DB error'))
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete, errorMessage: 'Delete failed' })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(mockShowError).toHaveBeenCalledWith('Delete failed')
    })

    it('supports function errorMessage', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('constraint violation'))
      const errorMessage = (err: Error) => `Error: ${err.message}`
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete, errorMessage })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(mockShowError).toHaveBeenCalledWith('Error: constraint violation')
    })

    it('calls onError callback on failure', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('Oops'))
      const onError = jest.fn()
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete, onError })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('converts non-Error throw to Error for onError', async () => {
      const onDelete = jest.fn().mockRejectedValue('string error')
      const onError = jest.fn()
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete, onError })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      const passedError = onError.mock.calls[0][0] as Error
      expect(passedError.message).toBe('string error')
    })

    it('resets deleting state after completion', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(result.current.deleting).toBe(false)
      expect(result.current.deletingId).toBeNull()
    })

    it('resets deleting state after error', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      await act(async () => {
        await result.current.handleDelete('id-1')
      })

      expect(result.current.deleting).toBe(false)
      expect(result.current.deletingId).toBeNull()
    })
  })

  describe('isDeleting', () => {
    it('returns false when not deleting', () => {
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete: jest.fn() })
      )

      expect(result.current.isDeleting('id-1')).toBe(false)
    })

    it('returns true for the item being deleted', async () => {
      let resolveDelete: () => void
      const onDelete = jest.fn(
        () => new Promise<void>((resolve) => { resolveDelete = resolve })
      )
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      let deletePromise: Promise<boolean>
      act(() => {
        deletePromise = result.current.handleDelete('id-1')
      })

      // During deletion, isDeleting should return true for the correct id
      expect(result.current.deleting).toBe(true)
      expect(result.current.deletingId).toBe('id-1')
      expect(result.current.isDeleting('id-1')).toBe(true)
      expect(result.current.isDeleting('id-2')).toBe(false)

      await act(async () => {
        resolveDelete!()
        await deletePromise
      })
    })
  })

  describe('confirmDelete', () => {
    it('calls handleDelete directly when useNativeConfirm is false (default)', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation({ onDelete })
      )

      await act(async () => {
        await result.current.confirmDelete('id-1')
      })

      expect(window.confirm).not.toHaveBeenCalled()
      expect(onDelete).toHaveBeenCalledWith('id-1')
    })

    it('shows native confirm when useNativeConfirm is true', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useDeleteConfirmation({
          onDelete,
          useNativeConfirm: true,
          confirmMessage: 'Delete this tenant?',
        })
      )

      await act(async () => {
        await result.current.confirmDelete('id-1')
      })

      expect(window.confirm).toHaveBeenCalledWith('Delete this tenant?')
      expect(onDelete).toHaveBeenCalledWith('id-1')
    })

    it('aborts when native confirm is cancelled', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(false)

      const { result } = renderHook(() =>
        useDeleteConfirmation({
          onDelete,
          useNativeConfirm: true,
        })
      )

      let success: boolean = true
      await act(async () => {
        success = await result.current.confirmDelete('id-1')
      })

      expect(success).toBe(false)
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('uses default confirm message', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useDeleteConfirmation({
          onDelete,
          useNativeConfirm: true,
        })
      )

      await act(async () => {
        await result.current.confirmDelete('id-1')
      })

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this item?'
      )
    })
  })

  describe('with numeric IDs', () => {
    it('works with number type IDs', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useDeleteConfirmation<number>({ onDelete })
      )

      await act(async () => {
        await result.current.handleDelete(42)
      })

      expect(onDelete).toHaveBeenCalledWith(42)
    })
  })
})

describe('useMultiDelete', () => {
  describe('selection state', () => {
    it('starts with empty selection', () => {
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete: jest.fn() })
      )

      expect(result.current.selectedIds).toEqual([])
      expect(result.current.selectedCount).toBe(0)
    })

    it('toggles item selection', () => {
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete: jest.fn() })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      expect(result.current.selectedIds).toEqual(['id-1'])
      expect(result.current.selectedCount).toBe(1)

      act(() => {
        result.current.toggleSelect('id-1')
      })

      expect(result.current.selectedIds).toEqual([])
      expect(result.current.selectedCount).toBe(0)
    })

    it('selects multiple items', () => {
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete: jest.fn() })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      act(() => {
        result.current.toggleSelect('id-2')
      })

      expect(result.current.selectedIds).toEqual(['id-1', 'id-2'])
      expect(result.current.selectedCount).toBe(2)
    })

    it('checks if item is selected via isSelected', () => {
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete: jest.fn() })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      expect(result.current.isSelected('id-1')).toBe(true)
      expect(result.current.isSelected('id-2')).toBe(false)
    })

    it('selects all via selectAll', () => {
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete: jest.fn() })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2', 'id-3'])
      })

      expect(result.current.selectedIds).toEqual(['id-1', 'id-2', 'id-3'])
      expect(result.current.selectedCount).toBe(3)
    })

    it('clears selection via clearSelection', () => {
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete: jest.fn() })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2'])
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedIds).toEqual([])
      expect(result.current.selectedCount).toBe(0)
    })
  })

  describe('deleteSelected', () => {
    it('returns false when no items selected', async () => {
      const onDelete = jest.fn()
      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      let success: boolean = true
      await act(async () => {
        success = await result.current.deleteSelected()
      })

      expect(success).toBe(false)
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('shows confirm dialog before deleting', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2'])
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(window.confirm).toHaveBeenCalled()
    })

    it('uses function confirm message with count', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({
          onDelete,
          confirmMessage: (count: number) => `Delete ${count} items?`,
        })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2', 'id-3'])
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(window.confirm).toHaveBeenCalledWith('Delete 3 items?')
    })

    it('aborts when confirm is cancelled', async () => {
      const onDelete = jest.fn()
      ;(window.confirm as jest.Mock).mockReturnValue(false)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.deleteSelected()
      })

      expect(success).toBe(false)
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('calls onDelete with selected ids on confirm', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2'])
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(onDelete).toHaveBeenCalledWith(['id-1', 'id-2'])
    })

    it('shows success toast with function message', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({
          onDelete,
          successMessage: (count: number) => `${count} items deleted`,
        })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2'])
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(mockShowSuccess).toHaveBeenCalledWith('2 items deleted')
    })

    it('shows success toast with string message', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({
          onDelete,
          successMessage: 'Items removed',
        })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(mockShowSuccess).toHaveBeenCalledWith('Items removed')
    })

    it('clears selection after successful delete', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2'])
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(result.current.selectedIds).toEqual([])
      expect(result.current.selectedCount).toBe(0)
    })

    it('calls onSuccess after successful delete', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      const onSuccess = jest.fn()
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete, onSuccess })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('returns true on successful delete', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined)
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.deleteSelected()
      })

      expect(success).toBe(true)
    })

    it('shows error toast on failure', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('Bulk delete failed'))
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({
          onDelete,
          errorMessage: 'Failed to delete items',
        })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(mockShowError).toHaveBeenCalledWith('Failed to delete items')
    })

    it('returns false on failure', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('fail'))
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.deleteSelected()
      })

      expect(success).toBe(false)
    })

    it('resets deleting state after error', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('fail'))
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.toggleSelect('id-1')
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(result.current.deleting).toBe(false)
    })

    it('does not clear selection on failure', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('fail'))
      ;(window.confirm as jest.Mock).mockReturnValue(true)

      const { result } = renderHook(() =>
        useMultiDelete({ onDelete })
      )

      act(() => {
        result.current.selectAll(['id-1', 'id-2'])
      })

      await act(async () => {
        await result.current.deleteSelected()
      })

      expect(result.current.selectedIds).toEqual(['id-1', 'id-2'])
    })
  })
})
