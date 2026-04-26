import {
  ENTITY_NAMES,
  getEntityName,
  getEntityTableName,
  entityTypeToTable,
} from '@/lib/entity-names'

describe('ENTITY_NAMES', () => {
  it('is a non-empty record', () => {
    expect(Object.keys(ENTITY_NAMES).length).toBeGreaterThan(20)
  })

  it('contains both singular and plural forms for core entities', () => {
    expect(ENTITY_NAMES['tenants']).toBe('Tenant')
    expect(ENTITY_NAMES['tenant']).toBe('Tenant')
    expect(ENTITY_NAMES['bills']).toBe('Bill')
    expect(ENTITY_NAMES['bill']).toBe('Bill')
  })
})

describe('getEntityName', () => {
  describe('singular form', () => {
    it('returns display name for known table', () => {
      expect(getEntityName('tenants')).toBe('Tenant')
    })

    it('returns display name for entity type key', () => {
      expect(getEntityName('tenant')).toBe('Tenant')
    })

    it('returns formatted fallback for unknown table', () => {
      expect(getEntityName('unknown_table')).toBe('Unknown Table')
    })

    it('title-cases single-word unknown tables', () => {
      expect(getEntityName('something')).toBe('Something')
    })
  })

  describe('plural form', () => {
    it('appends s for regular nouns', () => {
      expect(getEntityName('tenants', true)).toBe('Tenants')
      expect(getEntityName('rooms', true)).toBe('Rooms')
    })

    it('uses irregular plural for Person', () => {
      expect(getEntityName('people', true)).toBe('People')
    })

    it('uses irregular plural for Property', () => {
      expect(getEntityName('properties', true)).toBe('Properties')
    })

    it('uses irregular plural for Library', () => {
      expect(getEntityName('libraries', true)).toBe('Libraries')
    })

    it('uses irregular plural for Waitlist Entry', () => {
      expect(getEntityName('library_waitlist', true)).toBe('Waitlist Entries')
    })

    it('uses irregular plural for Website Inquiry', () => {
      expect(getEntityName('website_inquiries', true)).toBe('Website Inquiries')
    })
  })

  describe('library module entities', () => {
    it('returns Library Member for library_members', () => {
      expect(getEntityName('library_members')).toBe('Library Member')
    })

    it('returns Library Attendance for library_attendance', () => {
      expect(getEntityName('library_attendance')).toBe('Library Attendance')
    })
  })
})

describe('getEntityTableName', () => {
  it('returns a table key for Tenant', () => {
    const result = getEntityTableName('Tenant')
    expect(result).toBeDefined()
    expect(['tenant', 'tenants'].includes(result!)).toBe(true)
  })

  it('returns table name for Bill', () => {
    const result = getEntityTableName('Bill')
    expect(result).toBeDefined()
    expect(['bill', 'bills'].includes(result!)).toBe(true)
  })

  it('returns undefined for unmapped display name', () => {
    expect(getEntityTableName('Bogus Entity')).toBeUndefined()
  })

  it('returns table name for Library Member', () => {
    expect(getEntityTableName('Library Member')).toBe('library_members')
  })
})

describe('entityTypeToTable', () => {
  it('maps tenant to tenants', () => {
    expect(entityTypeToTable('tenant')).toBe('tenants')
  })

  it('maps property to properties', () => {
    expect(entityTypeToTable('property')).toBe('properties')
  })

  it('maps staff to staff_members', () => {
    expect(entityTypeToTable('staff')).toBe('staff_members')
  })

  it('maps person to people', () => {
    expect(entityTypeToTable('person')).toBe('people')
  })

  it('maps meter_reading to meter_readings', () => {
    expect(entityTypeToTable('meter_reading')).toBe('meter_readings')
  })

  it('passes through exit_clearance unchanged', () => {
    expect(entityTypeToTable('exit_clearance')).toBe('exit_clearance')
  })

  it('passes through unknown entity types unchanged', () => {
    expect(entityTypeToTable('unknown_type')).toBe('unknown_type')
  })

  it('maps library to libraries', () => {
    expect(entityTypeToTable('library')).toBe('libraries')
  })
})
