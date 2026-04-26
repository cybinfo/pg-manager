import { render, screen } from '@testing-library/react'
import { PageHeader, PageHeaderSimple } from '@/components/ui/page-header'
import { Users } from 'lucide-react'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Tenants" />)
    expect(screen.getByText('Tenants')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<PageHeader title="Tenants" description="Manage all tenants" />)
    expect(screen.getByText('Manage all tenants')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    render(<PageHeader title="Tenants" />)
    expect(screen.queryByText('Manage all tenants')).not.toBeInTheDocument()
  })

  it('renders icon wrapper when icon prop provided', () => {
    const { container } = render(<PageHeader title="Tenants" icon={Users} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('does not render icon wrapper when no icon', () => {
    const { container } = render(<PageHeader title="Tenants" />)
    expect(container.querySelector('svg')).toBeNull()
  })

  describe('actions', () => {
    it('renders actions slot', () => {
      render(<PageHeader title="Tenants" actions={<button>Add</button>} />)
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    })

    it('does not render actions wrapper when no actions', () => {
      render(<PageHeader title="Tenants" />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('back link', () => {
    it('renders Back link when backHref is provided', () => {
      render(<PageHeader title="Edit Tenant" backHref="/tenants" />)
      expect(screen.getByRole('link', { name: /Back/ })).toBeInTheDocument()
    })

    it('renders custom backLabel', () => {
      render(<PageHeader title="Edit" backHref="/tenants" backLabel="All Tenants" />)
      expect(screen.getByText('All Tenants')).toBeInTheDocument()
    })

    it('does not render back link when backHref is omitted', () => {
      render(<PageHeader title="Tenants" />)
      // No link with Back text
      expect(screen.queryByRole('link', { name: /Back/ })).not.toBeInTheDocument()
    })
  })

  describe('breadcrumbs', () => {
    it('renders breadcrumb nav when breadcrumbs provided', () => {
      render(
        <PageHeader
          title="Edit Room"
          breadcrumbs={[
            { label: 'Rooms', href: '/rooms' },
            { label: 'Room 101' },
          ]}
        />
      )
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    })

    it('renders dashboard home link in breadcrumbs', () => {
      render(
        <PageHeader
          title="Edit"
          breadcrumbs={[{ label: 'Rooms', href: '/rooms' }]}
        />
      )
      expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument()
    })

    it('renders linked breadcrumb item', () => {
      render(
        <PageHeader
          title="Detail"
          breadcrumbs={[{ label: 'Rooms', href: '/rooms' }]}
        />
      )
      expect(screen.getByRole('link', { name: 'Rooms' })).toBeInTheDocument()
    })

    it('renders non-linked breadcrumb item as span', () => {
      render(
        <PageHeader
          title="Detail"
          breadcrumbs={[{ label: 'Current Page' }]}
        />
      )
      expect(screen.getByText('Current Page')).toBeInTheDocument()
      // It should not be a link
      const item = screen.getByText('Current Page')
      expect(item.tagName.toLowerCase()).toBe('span')
    })

    it('does not render breadcrumb nav when empty array', () => {
      render(<PageHeader title="Tenants" breadcrumbs={[]} />)
      expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    })

    it('does not render breadcrumb nav when omitted', () => {
      render(<PageHeader title="Tenants" />)
      expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    })
  })

  it('renders children', () => {
    render(
      <PageHeader title="Tenants">
        <p>Extra content</p>
      </PageHeader>
    )
    expect(screen.getByText('Extra content')).toBeInTheDocument()
  })
})

describe('PageHeaderSimple', () => {
  it('renders title', () => {
    render(<PageHeaderSimple title="Room 101" />)
    expect(screen.getByText('Room 101')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeaderSimple title="Room 101" subtitle="Property: Sunrise PG" />)
    expect(screen.getByText('Property: Sunrise PG')).toBeInTheDocument()
  })

  it('does not render subtitle when omitted', () => {
    render(<PageHeaderSimple title="Room 101" />)
    expect(screen.queryByText('Property: Sunrise PG')).not.toBeInTheDocument()
  })

  it('renders actions', () => {
    render(<PageHeaderSimple title="Room 101" actions={<button>Edit</button>} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('renders back link', () => {
    render(<PageHeaderSimple title="Room 101" backHref="/rooms" />)
    expect(screen.getByRole('link', { name: /Back/ })).toBeInTheDocument()
  })

  it('renders breadcrumbs', () => {
    render(
      <PageHeaderSimple
        title="Room 101"
        breadcrumbs={[{ label: 'Rooms', href: '/rooms' }]}
      />
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })
})
