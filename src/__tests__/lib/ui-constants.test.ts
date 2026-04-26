/**
 * Tests for UI constants
 */

import { UI_STRINGS } from '@/lib/ui-constants'

describe('UI Constants', () => {
  describe('UI_STRINGS', () => {
    it('is defined', () => {
      expect(UI_STRINGS).toBeDefined()
    })

    it('is an object', () => {
      expect(typeof UI_STRINGS).toBe('object')
    })

    it('has LOADING string', () => {
      expect(UI_STRINGS.LOADING).toBe('Loading...')
    })

    it('has NO_RESULTS string', () => {
      expect(UI_STRINGS.NO_RESULTS).toBe('No results found')
    })

    it('has BACK string', () => {
      expect(UI_STRINGS.BACK).toBe('Back')
    })

    it('has VIEW_ALL string', () => {
      expect(UI_STRINGS.VIEW_ALL).toBe('View All')
    })

    it('has SAVE string', () => {
      expect(UI_STRINGS.SAVE).toBe('Save')
    })

    it('has CANCEL string', () => {
      expect(UI_STRINGS.CANCEL).toBe('Cancel')
    })

    it('has DELETE string', () => {
      expect(UI_STRINGS.DELETE).toBe('Delete')
    })

    it('has CONFIRM string', () => {
      expect(UI_STRINGS.CONFIRM).toBe('Confirm')
    })

    it('has SEARCH_PLACEHOLDER string', () => {
      expect(UI_STRINGS.SEARCH_PLACEHOLDER).toBe('Search...')
    })

    it('contains all expected keys', () => {
      const expectedKeys = [
        'LOADING',
        'NO_RESULTS',
        'BACK',
        'VIEW_ALL',
        'SAVE',
        'CANCEL',
        'DELETE',
        'CONFIRM',
        'SEARCH_PLACEHOLDER',
      ]

      expectedKeys.forEach((key) => {
        expect(UI_STRINGS).toHaveProperty(key)
      })
    })

    it('all values are non-empty strings', () => {
      Object.entries(UI_STRINGS).forEach(([_key, value]) => {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })

    it('is immutable (as const)', () => {
      // Verify that the type is readonly by checking specific values
      // The 'as const' assertion makes these literal types
      const loading: 'Loading...' = UI_STRINGS.LOADING
      const noResults: 'No results found' = UI_STRINGS.NO_RESULTS
      const back: 'Back' = UI_STRINGS.BACK

      expect(loading).toBe('Loading...')
      expect(noResults).toBe('No results found')
      expect(back).toBe('Back')
    })
  })
})
