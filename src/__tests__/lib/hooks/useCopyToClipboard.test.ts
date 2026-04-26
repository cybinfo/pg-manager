import { renderHook, act } from '@testing-library/react'
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard'

// Mock toast helpers to avoid side effects
jest.mock('@/lib/toast-helpers', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

// Mock clipboard API
const mockWriteText = jest.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
})

beforeAll(() => jest.useFakeTimers())
afterAll(() => jest.useRealTimers())

beforeEach(() => {
  mockWriteText.mockClear()
  mockWriteText.mockResolvedValue(undefined)
})

describe('useCopyToClipboard', () => {
  describe('initial state', () => {
    it('copied is false initially', () => {
      const { result } = renderHook(() => useCopyToClipboard())
      expect(result.current.copied).toBe(false)
    })
  })

  describe('copy()', () => {
    it('calls clipboard.writeText with the text', async () => {
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('Hello') })
      expect(mockWriteText).toHaveBeenCalledWith('Hello')
    })

    it('sets copied to true after successful copy', async () => {
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('Hello') })
      expect(result.current.copied).toBe(true)
    })

    it('returns true on success', async () => {
      const { result } = renderHook(() => useCopyToClipboard())
      let success: boolean
      await act(async () => { success = await result.current.copy('test') })
      expect(success!).toBe(true)
    })

    it('resets copied to false after resetDelay', async () => {
      const { result } = renderHook(() => useCopyToClipboard({ resetDelay: 1000 }))
      await act(async () => { await result.current.copy('Hello') })
      expect(result.current.copied).toBe(true)

      act(() => { jest.advanceTimersByTime(1000) })
      expect(result.current.copied).toBe(false)
    })

    it('does not reset before resetDelay', async () => {
      const { result } = renderHook(() => useCopyToClipboard({ resetDelay: 2000 }))
      await act(async () => { await result.current.copy('Hello') })

      act(() => { jest.advanceTimersByTime(999) })
      expect(result.current.copied).toBe(true)
    })

    it('shows success toast when showToast is true', async () => {
      const { showSuccess } = jest.requireMock('@/lib/toast-helpers')
      const { result } = renderHook(() =>
        useCopyToClipboard({ showToast: true, successMessage: 'Copied!' })
      )
      await act(async () => { await result.current.copy('text') })
      expect(showSuccess).toHaveBeenCalledWith('Copied!')
    })

    it('does not show toast by default', async () => {
      const { showSuccess } = jest.requireMock('@/lib/toast-helpers')
      showSuccess.mockClear()
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('text') })
      expect(showSuccess).not.toHaveBeenCalled()
    })

    it('returns false on failure', async () => {
      mockWriteText.mockRejectedValueOnce(new Error('permission denied'))
      const { result } = renderHook(() => useCopyToClipboard())
      let success: boolean
      await act(async () => { success = await result.current.copy('text') })
      expect(success!).toBe(false)
    })

    it('copied remains false on failure', async () => {
      mockWriteText.mockRejectedValueOnce(new Error('denied'))
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('text') })
      expect(result.current.copied).toBe(false)
    })

    it('shows error toast on failure', async () => {
      const { showError } = jest.requireMock('@/lib/toast-helpers')
      showError.mockClear()
      mockWriteText.mockRejectedValueOnce(new Error('denied'))
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('text') })
      expect(showError).toHaveBeenCalledWith('Failed to copy to clipboard')
    })
  })

  describe('reset()', () => {
    it('resets copied state to false', async () => {
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('Hello') })
      expect(result.current.copied).toBe(true)

      act(() => { result.current.reset() })
      expect(result.current.copied).toBe(false)
    })

    it('cancels the auto-reset timer', async () => {
      const { result } = renderHook(() => useCopyToClipboard({ resetDelay: 2000 }))
      await act(async () => { await result.current.copy('Hello') })

      act(() => { result.current.reset() })
      // Timer should be cleared — advancing past delay should not error
      act(() => { jest.advanceTimersByTime(2000) })
      expect(result.current.copied).toBe(false)
    })
  })

  describe('custom resetDelay', () => {
    it('uses default 2000ms when not specified', async () => {
      const { result } = renderHook(() => useCopyToClipboard())
      await act(async () => { await result.current.copy('x') })
      expect(result.current.copied).toBe(true)
      act(() => { jest.advanceTimersByTime(1999) })
      expect(result.current.copied).toBe(true)
      act(() => { jest.advanceTimersByTime(1) })
      expect(result.current.copied).toBe(false)
    })
  })
})
