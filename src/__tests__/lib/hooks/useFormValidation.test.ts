import { renderHook, act } from '@testing-library/react'
import { useFormValidation, type ValidationSchema } from '@/lib/hooks/useFormValidation'

type TestForm = {
  name: string
  amount: string
  email: string
}

const schema: ValidationSchema<TestForm> = {
  name: (value) => {
    const str = String(value ?? '').trim()
    return str ? null : { isValid: false, error: 'Name is required' }
  },
  amount: (value) => {
    const num = parseFloat(String(value ?? ''))
    if (!String(value ?? '').trim()) return { isValid: false, error: 'Amount is required' }
    if (isNaN(num) || num <= 0) return { isValid: false, error: 'Amount must be positive' }
    return null
  },
}

const validData: TestForm = { name: 'Alice', amount: '1000', email: '' }
const emptyData: TestForm = { name: '', amount: '', email: '' }

describe('useFormValidation', () => {
  describe('initial state', () => {
    it('has no errors initially', () => {
      const { result } = renderHook(() => useFormValidation(schema, validData))
      expect(result.current.errors).toEqual({})
    })

    it('hasErrors is false initially', () => {
      const { result } = renderHook(() => useFormValidation(schema, validData))
      expect(result.current.hasErrors).toBe(false)
    })
  })

  describe('validateField', () => {
    it('returns true for a valid field', () => {
      const { result } = renderHook(() => useFormValidation(schema, validData))
      let isValid: boolean
      act(() => { isValid = result.current.validateField('name') })
      expect(isValid!).toBe(true)
    })

    it('returns false and sets error for an invalid field', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      let isValid: boolean
      act(() => { isValid = result.current.validateField('name') })
      expect(isValid!).toBe(false)
      expect(result.current.errors.name).toBe('Name is required')
    })

    it('returns true for a field with no validator in schema', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      let isValid: boolean
      act(() => { isValid = result.current.validateField('email') })
      expect(isValid!).toBe(true)
      expect(result.current.errors.email).toBeUndefined()
    })

    it('clears error when field becomes valid', () => {
      let formData = emptyData
      const { result, rerender } = renderHook(
        ({ data }) => useFormValidation(schema, data),
        { initialProps: { data: formData } }
      )
      act(() => { result.current.validateField('name') })
      expect(result.current.errors.name).toBe('Name is required')

      formData = { ...emptyData, name: 'Alice' }
      rerender({ data: formData })
      act(() => { result.current.validateField('name') })
      expect(result.current.errors.name).toBeUndefined()
    })

    it('sets hasErrors to true when there are errors', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.validateField('name') })
      expect(result.current.hasErrors).toBe(true)
    })
  })

  describe('validateAll', () => {
    it('returns true when all fields are valid', () => {
      const { result } = renderHook(() => useFormValidation(schema, validData))
      let allValid: boolean
      act(() => { allValid = result.current.validateAll(validData) })
      expect(allValid!).toBe(true)
      expect(result.current.errors).toEqual({})
    })

    it('returns false when any field is invalid', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      let allValid: boolean
      act(() => { allValid = result.current.validateAll(emptyData) })
      expect(allValid!).toBe(false)
    })

    it('sets all field errors when all are invalid', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.validateAll(emptyData) })
      expect(result.current.errors.name).toBe('Name is required')
      expect(result.current.errors.amount).toBe('Amount is required')
    })

    it('clears previous errors when re-validating with valid data', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.validateAll(emptyData) })
      expect(result.current.errors.name).toBeDefined()

      act(() => { result.current.validateAll(validData) })
      expect(result.current.errors).toEqual({})
    })
  })

  describe('setFieldError', () => {
    it('manually sets an error for a field', () => {
      const { result } = renderHook(() => useFormValidation(schema, validData))
      act(() => { result.current.setFieldError('name', 'Custom error') })
      expect(result.current.errors.name).toBe('Custom error')
    })

    it('clears a field error when called without error argument', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.validateField('name') })
      expect(result.current.errors.name).toBeDefined()

      act(() => { result.current.setFieldError('name') })
      expect(result.current.errors.name).toBeUndefined()
    })
  })

  describe('clearErrors', () => {
    it('clears all errors', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.validateAll(emptyData) })
      expect(result.current.hasErrors).toBe(true)

      act(() => { result.current.clearErrors() })
      expect(result.current.errors).toEqual({})
      expect(result.current.hasErrors).toBe(false)
    })
  })

  describe('clearFieldError', () => {
    it('clears a specific field error without affecting others', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.validateAll(emptyData) })
      expect(result.current.errors.name).toBeDefined()
      expect(result.current.errors.amount).toBeDefined()

      act(() => { result.current.clearFieldError('name') })
      expect(result.current.errors.name).toBeUndefined()
      expect(result.current.errors.amount).toBeDefined()
    })

    it('is a no-op when the field has no error', () => {
      const { result } = renderHook(() => useFormValidation(schema, emptyData))
      act(() => { result.current.clearFieldError('email') })
      expect(result.current.errors).toEqual({})
    })
  })

  describe('|| "Invalid" fallback (validator returns isValid:false without error message)', () => {
    const schemaNoMsg: ValidationSchema<TestForm> = {
      name: () => ({ isValid: false }),
    }

    it('validateField uses "Invalid" when validator has no error message', () => {
      const { result } = renderHook(() => useFormValidation(schemaNoMsg, emptyData))
      act(() => { result.current.validateField('name') })
      expect(result.current.errors.name).toBe('Invalid')
    })

    it('validateAll uses "Invalid" when validator has no error message', () => {
      const { result } = renderHook(() => useFormValidation(schemaNoMsg, emptyData))
      act(() => { result.current.validateAll(emptyData) })
      expect(result.current.errors.name).toBe('Invalid')
    })

    it('validateAll skips fields whose schema entry is undefined', () => {
      const schemaWithGap: ValidationSchema<TestForm> = {
        name: (v) => (String(v ?? '').trim() ? null : { isValid: false, error: 'Required' }),
        amount: undefined,
      }
      const { result } = renderHook(() => useFormValidation(schemaWithGap, emptyData))
      act(() => { result.current.validateAll(emptyData) })
      expect(result.current.errors.name).toBe('Required')
      expect(result.current.errors.amount).toBeUndefined()
    })
  })
})
