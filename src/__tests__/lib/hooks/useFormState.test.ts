/**
 * Tests for useFormState hook and createFormDefaults utility
 */

import { renderHook, act } from '@testing-library/react'
import { ChangeEvent } from 'react'
import { useFormState, createFormDefaults } from '@/lib/hooks/useFormState'

// Helper to create a mock change event
function createChangeEvent(
  name: string,
  value: string,
  type: string = 'text',
  checked?: boolean
): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      name,
      value,
      type,
      checked: checked ?? false,
    },
  } as ChangeEvent<HTMLInputElement>
}

describe('useFormState', () => {
  describe('initialization', () => {
    it('returns initial form data', () => {
      const initial = { name: '', email: '', active: false }
      const { result } = renderHook(() => useFormState(initial))

      expect(result.current.formData).toEqual({ name: '', email: '', active: false })
    })

    it('starts with empty errors', () => {
      const { result } = renderHook(() => useFormState({ name: '' }))
      expect(result.current.errors).toEqual({})
    })

    it('starts as not dirty', () => {
      const { result } = renderHook(() => useFormState({ name: '' }))
      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('handleChange', () => {
    it('handles text input changes', () => {
      const { result } = renderHook(() => useFormState({ name: '', email: '' }))

      act(() => {
        result.current.handleChange(createChangeEvent('name', 'John'))
      })

      expect(result.current.formData.name).toBe('John')
      expect(result.current.formData.email).toBe('')
    })

    it('handles checkbox changes', () => {
      const { result } = renderHook(() => useFormState({ active: false }))

      act(() => {
        result.current.handleChange(createChangeEvent('active', '', 'checkbox', true))
      })

      expect(result.current.formData.active).toBe(true)
    })

    it('handles number input changes', () => {
      const { result } = renderHook(() => useFormState({ amount: 0 as string | number }))

      act(() => {
        result.current.handleChange(createChangeEvent('amount', '42', 'number'))
      })

      expect(result.current.formData.amount).toBe(42)
    })

    it('handles empty number input as empty string', () => {
      const { result } = renderHook(() => useFormState({ amount: 0 as string | number }))

      act(() => {
        result.current.handleChange(createChangeEvent('amount', '', 'number'))
      })

      expect(result.current.formData.amount).toBe('')
    })

    it('handles select element changes', () => {
      const { result } = renderHook(() => useFormState({ status: 'pending' }))

      act(() => {
        const event = {
          target: { name: 'status', value: 'completed', type: 'select-one' },
        } as ChangeEvent<HTMLSelectElement>
        result.current.handleChange(event)
      })

      expect(result.current.formData.status).toBe('completed')
    })

    it('handles textarea changes', () => {
      const { result } = renderHook(() => useFormState({ description: '' }))

      act(() => {
        const event = {
          target: { name: 'description', value: 'Long text here', type: 'textarea' },
        } as ChangeEvent<HTMLTextAreaElement>
        result.current.handleChange(event)
      })

      expect(result.current.formData.description).toBe('Long text here')
    })
  })

  describe('setField', () => {
    it('sets a specific field value', () => {
      const { result } = renderHook(() => useFormState({ name: '', age: 0 }))

      act(() => {
        result.current.setField('name', 'Alice')
      })

      expect(result.current.formData.name).toBe('Alice')
      expect(result.current.formData.age).toBe(0)
    })

    it('sets field to null', () => {
      const { result } = renderHook(() =>
        useFormState({ name: 'test' as string | null })
      )

      act(() => {
        result.current.setField('name', null)
      })

      expect(result.current.formData.name).toBeNull()
    })
  })

  describe('setFields', () => {
    it('sets multiple fields at once', () => {
      const { result } = renderHook(() =>
        useFormState({ name: '', email: '', phone: '' })
      )

      act(() => {
        result.current.setFields({ name: 'Bob', email: 'bob@test.com' })
      })

      expect(result.current.formData.name).toBe('Bob')
      expect(result.current.formData.email).toBe('bob@test.com')
      expect(result.current.formData.phone).toBe('')
    })
  })

  describe('resetForm', () => {
    it('resets form to initial state', () => {
      const initial = { name: '', email: '' }
      const { result } = renderHook(() => useFormState(initial))

      act(() => {
        result.current.setField('name', 'Modified')
        result.current.setField('email', 'test@test.com')
      })

      expect(result.current.formData.name).toBe('Modified')

      act(() => {
        result.current.resetForm()
      })

      expect(result.current.formData).toEqual({ name: '', email: '' })
    })

    it('clears errors on reset', () => {
      const validate = (data: { name: string }) => ({
        name: data.name === '' ? 'Required' : null,
      })

      const { result } = renderHook(() =>
        useFormState({ name: '' }, { validate })
      )

      // Trigger validation by changing a field
      act(() => {
        result.current.handleChange(createChangeEvent('name', ''))
      })

      expect(result.current.errors.name).toBe('Required')

      act(() => {
        result.current.resetForm()
      })

      expect(result.current.errors).toEqual({})
    })
  })

  describe('isDirty', () => {
    it('becomes true when form data changes', () => {
      const { result } = renderHook(() => useFormState({ name: '' }))

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setField('name', 'Changed')
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('becomes false when reverted to initial state', () => {
      const { result } = renderHook(() => useFormState({ name: '' }))

      act(() => {
        result.current.setField('name', 'Changed')
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.setField('name', '')
      })

      expect(result.current.isDirty).toBe(false)
    })

    it('becomes false after reset', () => {
      const { result } = renderHook(() => useFormState({ name: '' }))

      act(() => {
        result.current.setField('name', 'Changed')
      })

      act(() => {
        result.current.resetForm()
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('validation', () => {
    it('runs validation on handleChange', () => {
      const validate = jest.fn((data: { name: string }) => ({
        name: data.name.length < 3 ? 'Too short' : null,
      }))

      const { result } = renderHook(() =>
        useFormState({ name: '' }, { validate })
      )

      act(() => {
        result.current.handleChange(createChangeEvent('name', 'AB'))
      })

      expect(validate).toHaveBeenCalled()
      expect(result.current.errors.name).toBe('Too short')
    })

    it('clears validation error when input becomes valid', () => {
      const validate = (data: { name: string }) => ({
        name: data.name.length < 3 ? 'Too short' : null,
      })

      const { result } = renderHook(() =>
        useFormState({ name: '' }, { validate })
      )

      act(() => {
        result.current.handleChange(createChangeEvent('name', 'AB'))
      })

      expect(result.current.errors.name).toBe('Too short')

      act(() => {
        result.current.handleChange(createChangeEvent('name', 'Alice'))
      })

      expect(result.current.errors.name).toBeNull()
    })

    it('runs validation on setField', () => {
      const validate = (data: { email: string }) => ({
        email: data.email.includes('@') ? null : 'Invalid email',
      })

      const { result } = renderHook(() =>
        useFormState({ email: '' }, { validate })
      )

      act(() => {
        result.current.setField('email', 'notanemail')
      })

      expect(result.current.errors.email).toBe('Invalid email')
    })

    it('runs validation on setFields', () => {
      const validate = (data: { name: string; email: string }) => ({
        name: data.name === '' ? 'Required' : null,
        email: data.email === '' ? 'Required' : null,
      })

      const { result } = renderHook(() =>
        useFormState({ name: '', email: '' }, { validate })
      )

      act(() => {
        result.current.setFields({ name: 'Alice', email: '' })
      })

      expect(result.current.errors.name).toBeNull()
      expect(result.current.errors.email).toBe('Required')
    })
  })

  describe('transform option', () => {
    it('applies transform to handleChange values', () => {
      const transform = (name: string | number | symbol, value: unknown) => {
        if (name === 'name' && typeof value === 'string') {
          return value.toUpperCase()
        }
        return value
      }

      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useFormState({ name: '' }, { transform: transform as any })
      )

      act(() => {
        result.current.handleChange(createChangeEvent('name', 'hello'))
      })

      expect(result.current.formData.name).toBe('HELLO')
    })
  })

  describe('onChange callback', () => {
    it('calls onChange on handleChange', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFormState({ name: '' }, { onChange })
      )

      act(() => {
        result.current.handleChange(createChangeEvent('name', 'test'))
      })

      expect(onChange).toHaveBeenCalledWith({ name: 'test' })
    })

    it('calls onChange on setField', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFormState({ name: '' }, { onChange })
      )

      act(() => {
        result.current.setField('name', 'test')
      })

      expect(onChange).toHaveBeenCalledWith({ name: 'test' })
    })

    it('calls onChange on setFields', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFormState({ name: '', email: '' }, { onChange })
      )

      act(() => {
        result.current.setFields({ name: 'Alice', email: 'alice@test.com' })
      })

      expect(onChange).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@test.com',
      })
    })
  })

  describe('setFormData', () => {
    it('allows direct state updates', () => {
      const { result } = renderHook(() =>
        useFormState({ name: '', count: 0 })
      )

      act(() => {
        result.current.setFormData({ name: 'Direct', count: 5 })
      })

      expect(result.current.formData).toEqual({ name: 'Direct', count: 5 })
    })

    it('supports functional updates', () => {
      const { result } = renderHook(() =>
        useFormState({ name: '', count: 0 })
      )

      act(() => {
        result.current.setFormData((prev) => ({ ...prev, count: prev.count + 1 }))
      })

      expect(result.current.formData.count).toBe(1)
    })
  })
})

describe('createFormDefaults', () => {
  it('returns defaults when entity is null', () => {
    const defaults = { name: '', email: '', active: false }
    expect(createFormDefaults(null, defaults)).toEqual(defaults)
  })

  it('returns defaults when entity is undefined', () => {
    const defaults = { name: '', email: '' }
    expect(createFormDefaults(undefined, defaults)).toEqual(defaults)
  })

  it('merges entity values over defaults', () => {
    const entity = { name: 'Alice', email: 'alice@test.com' }
    const defaults = { name: '', email: '', phone: '' }

    const result = createFormDefaults(entity, defaults)

    expect(result).toEqual({
      name: 'Alice',
      email: 'alice@test.com',
      phone: '',
    })
  })

  it('ignores null entity values', () => {
    const entity = { name: 'Alice', email: null } as { name: string; email: string | null }
    const defaults = { name: '', email: 'default@test.com' }

    const result = createFormDefaults(entity as Partial<typeof defaults>, defaults)

    expect(result).toEqual({
      name: 'Alice',
      email: 'default@test.com',
    })
  })

  it('ignores undefined entity values', () => {
    const entity = { name: 'Alice' }
    const defaults = { name: '', email: 'default@test.com' }

    const result = createFormDefaults(entity, defaults)

    expect(result).toEqual({
      name: 'Alice',
      email: 'default@test.com',
    })
  })

  it('keeps falsy but defined entity values (0, false, empty string)', () => {
    const entity = { count: 0, active: false, name: '' }
    const defaults = { count: 10, active: true, name: 'default' }

    const result = createFormDefaults(entity, defaults)

    expect(result).toEqual({ count: 0, active: false, name: '' })
  })

  it('does not add extra keys from entity that are not in defaults', () => {
    const entity = { name: 'Alice', extra: 'value' }
    const defaults = { name: '' }

    const result = createFormDefaults(entity, defaults)

    expect(result).toEqual({ name: 'Alice' })
    expect((result as Record<string, unknown>).extra).toBeUndefined()
  })
})
