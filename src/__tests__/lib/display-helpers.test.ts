import {
  getDisplayName,
  getVisitorDisplayName,
  getAvatarUrl,
  getVisitorAvatarUrl,
  getEntityDisplayData,
  getVisitorDisplayData,
  getDisplayPhone,
  getPropertyName,
  getRoomNumber,
  getLocation,
} from '@/lib/display-helpers'

describe('getDisplayName', () => {
  it('returns person.name when available', () => {
    const entity = { name: 'Old Name', person: { name: 'John Doe' } }
    expect(getDisplayName(entity)).toBe('John Doe')
  })

  it('falls back to entity.name when person is null', () => {
    const entity = { name: 'Direct Name', person: null }
    expect(getDisplayName(entity)).toBe('Direct Name')
  })

  it('falls back to entity.name when person has no name', () => {
    const entity = { name: 'Entity Name', person: { name: null } }
    expect(getDisplayName(entity)).toBe('Entity Name')
  })

  it('returns default when entity is null', () => {
    expect(getDisplayName(null)).toBe('Unknown')
  })

  it('returns default when entity is undefined', () => {
    expect(getDisplayName(undefined)).toBe('Unknown')
  })

  it('returns custom default when provided', () => {
    expect(getDisplayName(null, 'No Staff')).toBe('No Staff')
  })

  it('returns default when both person.name and entity.name are missing', () => {
    expect(getDisplayName({})).toBe('Unknown')
  })
})

describe('getVisitorDisplayName', () => {
  it('returns visitor.person.name first', () => {
    const visitor = {
      visitor_name: 'Old Name',
      person: { name: 'Person Name' },
    }
    expect(getVisitorDisplayName(visitor)).toBe('Person Name')
  })

  it('falls back to visitor_contact.person.name', () => {
    const visitor = {
      visitor_name: 'Fallback',
      visitor_contact: {
        person: { name: 'Contact Person' },
      },
    }
    expect(getVisitorDisplayName(visitor)).toBe('Contact Person')
  })

  it('falls back to visitor_contact.name', () => {
    const visitor = {
      visitor_name: 'Fallback',
      visitor_contact: { name: 'Contact Name' },
    }
    expect(getVisitorDisplayName(visitor)).toBe('Contact Name')
  })

  it('falls back to visitor_name', () => {
    const visitor = { visitor_name: 'Visitor Name' }
    expect(getVisitorDisplayName(visitor)).toBe('Visitor Name')
  })

  it('returns default when null', () => {
    expect(getVisitorDisplayName(null)).toBe('Unknown Visitor')
  })

  it('uses custom default', () => {
    expect(getVisitorDisplayName(null, 'No Guest')).toBe('No Guest')
  })
})

describe('getAvatarUrl', () => {
  it('returns person.photo_url first', () => {
    const entity = {
      photo_url: 'entity.jpg',
      person: { photo_url: 'person.jpg' },
    }
    expect(getAvatarUrl(entity)).toBe('person.jpg')
  })

  it('falls back to entity.photo_url', () => {
    const entity = {
      photo_url: 'entity.jpg',
      person: { photo_url: null },
    }
    expect(getAvatarUrl(entity)).toBe('entity.jpg')
  })

  it('falls back to profile_photo', () => {
    const entity = { profile_photo: 'profile.jpg' }
    expect(getAvatarUrl(entity)).toBe('profile.jpg')
  })

  it('returns undefined when no photo', () => {
    expect(getAvatarUrl({})).toBeUndefined()
  })

  it('returns undefined when entity is null', () => {
    expect(getAvatarUrl(null)).toBeUndefined()
  })
})

describe('getVisitorAvatarUrl', () => {
  it('returns visitor.person.photo_url first', () => {
    const visitor = {
      person: { photo_url: 'person.jpg' },
      visitor_contact: { person: { photo_url: 'contact-person.jpg' } },
    }
    expect(getVisitorAvatarUrl(visitor)).toBe('person.jpg')
  })

  it('falls back to visitor_contact.person.photo_url', () => {
    const visitor = {
      visitor_contact: { person: { photo_url: 'contact.jpg' } },
    }
    expect(getVisitorAvatarUrl(visitor)).toBe('contact.jpg')
  })

  it('returns undefined when no photo', () => {
    expect(getVisitorAvatarUrl({})).toBeUndefined()
  })

  it('returns undefined when null', () => {
    expect(getVisitorAvatarUrl(null)).toBeUndefined()
  })
})

describe('getEntityDisplayData', () => {
  it('returns name and photoUrl together', () => {
    const entity = {
      name: 'Direct',
      person: { name: 'From Person', photo_url: 'photo.jpg' },
    }
    const result = getEntityDisplayData(entity)
    expect(result.name).toBe('From Person')
    expect(result.photoUrl).toBe('photo.jpg')
  })

  it('returns default name and undefined photoUrl for null entity', () => {
    const result = getEntityDisplayData(null)
    expect(result.name).toBe('Unknown')
    expect(result.photoUrl).toBeUndefined()
  })

  it('uses custom default name', () => {
    const result = getEntityDisplayData(null, 'No Member')
    expect(result.name).toBe('No Member')
  })
})

describe('getVisitorDisplayData', () => {
  it('returns name and photoUrl for visitor', () => {
    const visitor = {
      visitor_name: 'Guest',
      person: { name: 'Person', photo_url: 'photo.jpg' },
    }
    const result = getVisitorDisplayData(visitor)
    expect(result.name).toBe('Person')
    expect(result.photoUrl).toBe('photo.jpg')
  })

  it('returns default for null visitor', () => {
    const result = getVisitorDisplayData(null)
    expect(result.name).toBe('Unknown Visitor')
    expect(result.photoUrl).toBeUndefined()
  })
})

describe('getDisplayPhone', () => {
  it('returns first phone from phone_numbers array', () => {
    const entity = { phone: '9876543210', phone_numbers: ['1111111111', '2222222222'] }
    expect(getDisplayPhone(entity)).toBe('1111111111')
  })

  it('falls back to phone field when no phone_numbers', () => {
    const entity = { phone: '9876543210', phone_numbers: [] }
    expect(getDisplayPhone(entity)).toBe('9876543210')
  })

  it('falls back to phone field when phone_numbers is null', () => {
    const entity = { phone: '9876543210', phone_numbers: null }
    expect(getDisplayPhone(entity)).toBe('9876543210')
  })

  it('returns undefined when no phone data', () => {
    expect(getDisplayPhone({})).toBeUndefined()
  })

  it('returns undefined for null entity', () => {
    expect(getDisplayPhone(null)).toBeUndefined()
  })
})

describe('getPropertyName', () => {
  it('returns property name when available', () => {
    const entity = { property: { name: 'Sunrise PG' } }
    expect(getPropertyName(entity)).toBe('Sunrise PG')
  })

  it('returns undefined when property is null', () => {
    expect(getPropertyName({ property: null })).toBeUndefined()
  })

  it('returns undefined for null entity', () => {
    expect(getPropertyName(null)).toBeUndefined()
  })
})

describe('getRoomNumber', () => {
  it('returns room number when available', () => {
    const entity = { room: { room_number: '101A' } }
    expect(getRoomNumber(entity)).toBe('101A')
  })

  it('returns undefined when room is null', () => {
    expect(getRoomNumber({ room: null })).toBeUndefined()
  })

  it('returns undefined for null entity', () => {
    expect(getRoomNumber(null)).toBeUndefined()
  })
})

describe('getLocation', () => {
  it('returns "Property - Room X" when both are present', () => {
    const entity = {
      property: { name: 'Sunrise PG' },
      room: { room_number: '101' },
    }
    expect(getLocation(entity)).toBe('Sunrise PG - Room 101')
  })

  it('returns only property name when no room', () => {
    const entity = {
      property: { name: 'Sunrise PG' },
      room: null,
    }
    expect(getLocation(entity)).toBe('Sunrise PG')
  })

  it('returns "Room X" when no property', () => {
    const entity = {
      property: null,
      room: { room_number: '201' },
    }
    expect(getLocation(entity)).toBe('Room 201')
  })

  it('returns undefined when neither property nor room', () => {
    expect(getLocation({})).toBeUndefined()
  })

  it('returns undefined for null entity', () => {
    expect(getLocation(null)).toBeUndefined()
  })
})
