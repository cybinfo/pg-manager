import { render, screen, fireEvent } from '@testing-library/react'
import { Avatar, AvatarGroup, getAvatarUrl } from '@/components/ui/avatar'

// next/image is mocked globally by __mocks__/nextImage.js

describe('getAvatarUrl', () => {
  it('returns person.photo_url first', () => {
    expect(getAvatarUrl({ person: { photo_url: 'person.jpg' }, photo_url: 'entity.jpg' }))
      .toBe('person.jpg')
  })

  it('falls back to profile_photo', () => {
    expect(getAvatarUrl({ profile_photo: 'profile.jpg' })).toBe('profile.jpg')
  })

  it('falls back to photo_url', () => {
    expect(getAvatarUrl({ photo_url: 'entity.jpg' })).toBe('entity.jpg')
  })

  it('returns undefined when entity is null', () => {
    expect(getAvatarUrl(null)).toBeUndefined()
  })

  it('returns undefined when all fields are null', () => {
    expect(getAvatarUrl({ person: { photo_url: null }, profile_photo: null, photo_url: null }))
      .toBeUndefined()
  })

  it('returns undefined when entity is undefined', () => {
    expect(getAvatarUrl(undefined)).toBeUndefined()
  })
})

describe('Avatar', () => {
  describe('initials fallback', () => {
    it('shows first letter for single-word name', () => {
      render(<Avatar name="Alice" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('shows first+last initials for multi-word name', () => {
      render(<Avatar name="John Doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('uses first and last word for three-part name', () => {
      render(<Avatar name="John Michael Doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('shows ? for empty name', () => {
      render(<Avatar name="" />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('has role=img and aria-label', () => {
      render(<Avatar name="Alice" />)
      expect(screen.getByRole('img', { name: 'Avatar for Alice' })).toBeInTheDocument()
    })
  })

  describe('with image src', () => {
    it('renders img element when src is provided', () => {
      render(<Avatar name="Alice" src="https://example.com/photo.jpg" />)
      const img = screen.getByAltText('Alice')
      expect(img).toBeInTheDocument()
      expect(img.tagName.toLowerCase()).toBe('img')
    })

    it('does not show initials when src is provided', () => {
      render(<Avatar name="Alice" src="https://example.com/photo.jpg" />)
      expect(screen.queryByText('A')).not.toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('applies xs size class', () => {
      render(<Avatar name="Alice" size="xs" />)
      expect(screen.getByRole('img')).toHaveClass('h-6')
    })

    it('applies lg size class', () => {
      render(<Avatar name="Alice" size="lg" />)
      expect(screen.getByRole('img')).toHaveClass('h-12')
    })

    it('applies xl size class', () => {
      render(<Avatar name="Alice" size="xl" />)
      expect(screen.getByRole('img')).toHaveClass('h-16')
    })
  })

  describe('clickable', () => {
    it('does not open lightbox when not clickable', () => {
      render(<Avatar name="Alice" src="photo.jpg" />)
      fireEvent.click(screen.getByAltText('Alice'))
      // No lightbox should appear — dialog should not be in document
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

describe('AvatarGroup', () => {
  const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve']

  it('shows first 3 avatars by default (max=3)', () => {
    render(<AvatarGroup names={names} />)
    expect(screen.getByTitle('Alice')).toBeInTheDocument()
    expect(screen.getByTitle('Bob')).toBeInTheDocument()
    expect(screen.getByTitle('Charlie')).toBeInTheDocument()
  })

  it('shows overflow count when names exceed max', () => {
    render(<AvatarGroup names={names} max={3} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('does not show overflow count when all names fit', () => {
    render(<AvatarGroup names={['Alice', 'Bob']} max={3} />)
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('respects custom max', () => {
    render(<AvatarGroup names={names} max={2} />)
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('renders all names when max exceeds list length', () => {
    render(<AvatarGroup names={['Alice', 'Bob']} max={10} />)
    expect(screen.getByTitle('Alice')).toBeInTheDocument()
    expect(screen.getByTitle('Bob')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('shows remaining names in title tooltip', () => {
    render(<AvatarGroup names={names} max={3} />)
    const overflow = screen.getByTitle('2 more: Dave, Eve')
    expect(overflow).toBeInTheDocument()
  })
})
