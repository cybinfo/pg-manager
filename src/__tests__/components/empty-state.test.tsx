import { render, screen, fireEvent } from '@testing-library/react'
import {
  EmptyState,
  NoResultsState,
  NoDataState,
  ErrorState,
  NotFoundState,
} from '@/components/ui/empty-state'
import { Users } from 'lucide-react'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="No records found yet." />)
    expect(screen.getByText('No records found yet.')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByText('No records found yet.')).not.toBeInTheDocument()
  })

  it('has role=status for accessibility', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  describe('action button', () => {
    it('renders primary action button with href', () => {
      render(<EmptyState title="Empty" action={{ label: 'Add New', href: '/new' }} />)
      expect(screen.getByRole('link', { name: /Add New/ })).toBeInTheDocument()
    })

    it('renders primary action button with onClick', () => {
      const onClick = jest.fn()
      render(<EmptyState title="Empty" action={{ label: 'Click Me', onClick }} />)
      const btn = screen.getByRole('button', { name: /Click Me/ })
      fireEvent.click(btn)
      expect(onClick).toHaveBeenCalled()
    })

    it('renders secondary action with href', () => {
      render(
        <EmptyState
          title="Empty"
          secondaryAction={{ label: 'Learn more', href: '/docs' }}
        />
      )
      expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument()
    })

    it('renders secondary action with onClick', () => {
      const onClear = jest.fn()
      render(
        <EmptyState
          title="Empty"
          secondaryAction={{ label: 'Clear', onClick: onClear }}
        />
      )
      const btn = screen.getByRole('button', { name: 'Clear' })
      fireEvent.click(btn)
      expect(onClear).toHaveBeenCalled()
    })

    it('renders both primary and secondary actions', () => {
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Primary', onClick: jest.fn() }}
          secondaryAction={{ label: 'Secondary', onClick: jest.fn() }}
        />
      )
      expect(screen.getByRole('button', { name: /Primary/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('renders default variant', () => {
      const { container } = render(<EmptyState title="Empty" variant="default" />)
      // Default variant uses brand gradient (rounded-2xl icon container)
      expect(container.querySelector('.rounded-2xl')).not.toBeNull()
    })

    it('renders search variant', () => {
      const { container } = render(<EmptyState title="No results" variant="search" />)
      expect(container.querySelector('[class*="warning"]')).not.toBeNull()
    })

    it('renders error variant', () => {
      const { container } = render(<EmptyState title="Error" variant="error" />)
      expect(container.querySelector('[class*="destructive"]')).not.toBeNull()
    })
  })

  describe('custom icon', () => {
    it('renders with custom icon', () => {
      const { container } = render(<EmptyState title="Empty" icon={Users} />)
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })
})

describe('NoResultsState', () => {
  it('shows "No results found" title', () => {
    render(<NoResultsState />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('shows search term in description', () => {
    render(<NoResultsState searchTerm="Alice" />)
    expect(screen.getByText(/No results match "Alice"/)).toBeInTheDocument()
  })

  it('shows generic description without search term', () => {
    render(<NoResultsState />)
    expect(screen.getByText(/No results match your search criteria/)).toBeInTheDocument()
  })

  it('shows Clear filters button when onClear provided', () => {
    const onClear = jest.fn()
    render(<NoResultsState onClear={onClear} />)
    const btn = screen.getByRole('button', { name: 'Clear filters' })
    fireEvent.click(btn)
    expect(onClear).toHaveBeenCalled()
  })

  it('hides Clear filters button when onClear not provided', () => {
    render(<NoResultsState />)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })
})

describe('NoDataState', () => {
  it('shows "No {entity} yet" title', () => {
    render(<NoDataState entity="Tenants" />)
    expect(screen.getByText('No Tenants yet')).toBeInTheDocument()
  })

  it('shows descriptive message with entity name', () => {
    render(<NoDataState entity="Tenants" />)
    expect(screen.getByText(/creating your first tenants/i)).toBeInTheDocument()
  })

  it('renders action link when action provided', () => {
    render(<NoDataState entity="Tenants" action={{ label: 'Add Tenant', href: '/tenants/new' }} />)
    expect(screen.getByRole('link', { name: /Add Tenant/ })).toBeInTheDocument()
  })

  it('does not render action when omitted', () => {
    render(<NoDataState entity="Tenants" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('shows "Something went wrong" title', () => {
    render(<ErrorState />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows custom message when provided', () => {
    render(<ErrorState message="Database connection failed." />)
    expect(screen.getByText('Database connection failed.')).toBeInTheDocument()
  })

  it('shows default message when no message provided', () => {
    render(<ErrorState />)
    expect(screen.getByText(/An error occurred while loading/)).toBeInTheDocument()
  })

  it('renders Try again button when onRetry provided', () => {
    const onRetry = jest.fn()
    render(<ErrorState onRetry={onRetry} />)
    const btn = screen.getByRole('button', { name: /Try again/ })
    fireEvent.click(btn)
    expect(onRetry).toHaveBeenCalled()
  })

  it('hides Try again button when onRetry not provided', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument()
  })
})

describe('NotFoundState', () => {
  it('shows default "Not found" title', () => {
    render(<NotFoundState />)
    expect(screen.getByText('Not found')).toBeInTheDocument()
  })

  it('shows custom title', () => {
    render(<NotFoundState title="Tenant not found" />)
    expect(screen.getByText('Tenant not found')).toBeInTheDocument()
  })

  it('shows default description', () => {
    render(<NotFoundState />)
    expect(screen.getByText(/doesn't exist or has been deleted/)).toBeInTheDocument()
  })

  it('shows custom description', () => {
    render(<NotFoundState description="This room was deleted." />)
    expect(screen.getByText('This room was deleted.')).toBeInTheDocument()
  })

  it('renders back link when backHref provided', () => {
    render(<NotFoundState backHref="/tenants" backLabel="Back to Tenants" />)
    expect(screen.getByRole('link', { name: /Back to Tenants/ })).toBeInTheDocument()
  })

  it('does not render back link when backHref is omitted', () => {
    render(<NotFoundState />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
