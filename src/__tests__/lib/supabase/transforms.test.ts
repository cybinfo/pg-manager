/**
 * Tests for Supabase JOIN transform utilities
 *
 * These utilities handle the inconsistent formats Supabase returns
 * for JOINed data (arrays vs objects vs null).
 */

import { transformJoin, transformJoins, transformArrayJoins } from '@/lib/supabase/transforms'

describe('Supabase Transform Utilities', () => {
  describe('transformJoin', () => {
    it('returns the object as-is when Supabase returns an object (current behavior)', () => {
      const property = { id: 'p1', name: 'Sunrise PG' }
      expect(transformJoin(property)).toEqual({ id: 'p1', name: 'Sunrise PG' })
    })

    it('extracts first element when Supabase returns an array with one item (older behavior)', () => {
      const property = [{ id: 'p1', name: 'Sunrise PG' }]
      expect(transformJoin(property)).toEqual({ id: 'p1', name: 'Sunrise PG' })
    })

    it('extracts first element when Supabase returns an array with multiple items', () => {
      const items = [
        { id: 'p1', name: 'First' },
        { id: 'p2', name: 'Second' },
      ]
      expect(transformJoin(items)).toEqual({ id: 'p1', name: 'First' })
    })

    it('returns null for null input', () => {
      expect(transformJoin(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(transformJoin(undefined)).toBeNull()
    })

    it('returns null for an empty array', () => {
      expect(transformJoin([])).toBeNull()
    })

    it('handles primitive values passed through', () => {
      // TypeScript generics allow any type; ensure non-array primitives pass through
      expect(transformJoin('some-string' as unknown as string)).toBe('some-string')
      expect(transformJoin(42 as unknown as number)).toBe(42)
      expect(transformJoin(true as unknown as boolean)).toBe(true)
    })

    it('handles deeply nested objects', () => {
      const nested = { id: 'r1', property: { id: 'p1', owner: { id: 'o1' } } }
      expect(transformJoin(nested)).toEqual(nested)
    })

    it('handles array containing null as first element', () => {
      const data = [null, { id: 'p1' }]
      expect(transformJoin(data)).toBeNull()
    })

    it('preserves object reference identity for non-array inputs', () => {
      const obj = { id: 'p1', name: 'Test' }
      expect(transformJoin(obj)).toBe(obj)
    })
  })

  describe('transformJoins', () => {
    it('transforms multiple join fields on a single record', () => {
      const rawTenant = {
        id: 't1',
        name: 'Rajesh',
        property: [{ id: 'p1', name: 'Sunrise PG' }],
        room: [{ id: 'r1', room_number: '101' }],
        status: 'active',
      }

      const result = transformJoins(rawTenant, ['property', 'room'])

      expect(result.property).toEqual({ id: 'p1', name: 'Sunrise PG' })
      expect(result.room).toEqual({ id: 'r1', room_number: '101' })
      expect(result.id).toBe('t1')
      expect(result.name).toBe('Rajesh')
      expect(result.status).toBe('active')
    })

    it('handles mix of array and object join formats', () => {
      const rawData = {
        id: 't1',
        property: { id: 'p1', name: 'PG One' },       // object format
        room: [{ id: 'r1', room_number: '102' }],      // array format
        charge_type: null,                               // null
      }

      const result = transformJoins(rawData, ['property', 'room', 'charge_type'])

      expect(result.property).toEqual({ id: 'p1', name: 'PG One' })
      expect(result.room).toEqual({ id: 'r1', room_number: '102' })
      expect(result.charge_type).toBeNull()
    })

    it('does not modify fields not listed in join fields', () => {
      const rawData = {
        id: 't1',
        name: 'Test',
        tags: ['tag1', 'tag2'],    // regular array, not a join
        property: [{ id: 'p1' }], // join field
      }

      const result = transformJoins(rawData, ['property'])

      expect(result.property).toEqual({ id: 'p1' })
      expect(result.tags).toEqual(['tag1', 'tag2']) // unchanged
    })

    it('returns a new object (does not mutate the original)', () => {
      const original = {
        id: 't1',
        property: [{ id: 'p1' }],
      }
      const originalCopy = { ...original, property: [...original.property] }

      const result = transformJoins(original, ['property'])

      expect(result).not.toBe(original)
      expect(original.property).toEqual(originalCopy.property) // original unchanged
    })

    it('handles empty join fields array', () => {
      const data = { id: 't1', property: [{ id: 'p1' }] }
      const result = transformJoins(data, [])

      expect(result).toEqual(data)
    })

    it('handles record with no matching join fields', () => {
      const data = { id: 't1', name: 'Test' }
      const result = transformJoins(data as Record<string, unknown>, ['property' as never])

      expect(result.id).toBe('t1')
      expect(result.name).toBe('Test')
    })
  })

  describe('transformArrayJoins', () => {
    it('transforms join fields across an array of records', () => {
      const rawTenants = [
        {
          id: 't1',
          name: 'Rajesh',
          property: [{ id: 'p1', name: 'Sunrise PG' }],
          room: [{ id: 'r1', room_number: '101' }],
        },
        {
          id: 't2',
          name: 'Priya',
          property: [{ id: 'p2', name: 'Moon PG' }],
          room: { id: 'r2', room_number: '202' },
        },
      ]

      const result = transformArrayJoins(rawTenants, ['property', 'room'])

      expect(result).toHaveLength(2)
      expect(result[0].property).toEqual({ id: 'p1', name: 'Sunrise PG' })
      expect(result[0].room).toEqual({ id: 'r1', room_number: '101' })
      expect(result[1].property).toEqual({ id: 'p2', name: 'Moon PG' })
      expect(result[1].room).toEqual({ id: 'r2', room_number: '202' })
    })

    it('handles an empty array of records', () => {
      const result = transformArrayJoins([], ['property', 'room'])
      expect(result).toEqual([])
    })

    it('handles records with null join fields', () => {
      const rawData = [
        {
          id: 't1',
          property: null,
          room: null,
        },
        {
          id: 't2',
          property: [{ id: 'p1' }],
          room: undefined,
        },
      ]

      const result = transformArrayJoins(rawData as Record<string, unknown>[], ['property', 'room'])

      expect(result[0].property).toBeNull()
      expect(result[0].room).toBeNull()
      expect(result[1].property).toEqual({ id: 'p1' })
      expect(result[1].room).toBeNull()
    })

    it('handles a single record in the array', () => {
      const rawData = [
        {
          id: 't1',
          property: [{ id: 'p1', name: 'Only PG' }],
        },
      ]

      const result = transformArrayJoins(rawData, ['property'])

      expect(result).toHaveLength(1)
      expect(result[0].property).toEqual({ id: 'p1', name: 'Only PG' })
    })

    it('preserves non-join fields on all records', () => {
      const rawData = [
        {
          id: 't1',
          name: 'Rajesh',
          phone: '9876543210',
          status: 'active',
          property: [{ id: 'p1' }],
        },
      ]

      const result = transformArrayJoins(rawData, ['property'])

      expect(result[0].id).toBe('t1')
      expect(result[0].name).toBe('Rajesh')
      expect(result[0].phone).toBe('9876543210')
      expect(result[0].status).toBe('active')
    })

    it('handles large arrays efficiently', () => {
      const rawData = Array.from({ length: 1000 }, (_, i) => ({
        id: `t${i}`,
        property: [{ id: `p${i}`, name: `PG ${i}` }],
        room: [{ id: `r${i}`, room_number: `${i + 100}` }],
      }))

      const result = transformArrayJoins(rawData, ['property', 'room'])

      expect(result).toHaveLength(1000)
      expect(result[0].property).toEqual({ id: 'p0', name: 'PG 0' })
      expect(result[999].room).toEqual({ id: 'r999', room_number: '1099' })
    })

    it('handles three or more join fields', () => {
      const rawData = [
        {
          id: 'b1',
          tenant: [{ id: 't1', name: 'Rajesh' }],
          property: [{ id: 'p1', name: 'Sunrise PG' }],
          room: [{ id: 'r1', room_number: '101' }],
          charge_type: [{ id: 'c1', name: 'Rent' }],
        },
      ]

      const result = transformArrayJoins(rawData, ['tenant', 'property', 'room', 'charge_type'])

      expect(result[0].tenant).toEqual({ id: 't1', name: 'Rajesh' })
      expect(result[0].property).toEqual({ id: 'p1', name: 'Sunrise PG' })
      expect(result[0].room).toEqual({ id: 'r1', room_number: '101' })
      expect(result[0].charge_type).toEqual({ id: 'c1', name: 'Rent' })
    })
  })
})
