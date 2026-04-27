import { render, screen } from '@testing-library/react'
import { StatusBadge, PriorityBadge, StatusIndicator } from '@/components/ui/status-badge'

describe('StatusBadge', () => {
  describe('with status prop', () => {
    it('renders active status with correct label', () => {
      render(<StatusBadge status="active" />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders paid status', () => {
      render(<StatusBadge status="paid" />)
      expect(screen.getByText('Paid')).toBeInTheDocument()
    })

    it('renders pending status', () => {
      render(<StatusBadge status="pending" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('renders overdue status', () => {
      render(<StatusBadge status="overdue" />)
      expect(screen.getByText('Overdue')).toBeInTheDocument()
    })

    it('renders open complaint status', () => {
      render(<StatusBadge status="open" />)
      expect(screen.getByText('Open')).toBeInTheDocument()
    })

    it('renders resolved status', () => {
      render(<StatusBadge status="resolved" />)
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    it('renders in_progress status', () => {
      render(<StatusBadge status="in_progress" />)
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })
  })

  describe('with custom label', () => {
    it('overrides the default label from status config', () => {
      render(<StatusBadge status="active" label="Online" />)
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.queryByText('Active')).not.toBeInTheDocument()
    })

    it('renders custom label without status', () => {
      render(<StatusBadge label="Custom Label" />)
      expect(screen.getByText('Custom Label')).toBeInTheDocument()
    })
  })

  describe('with children', () => {
    it('renders children as label when no status or label prop', () => {
      render(<StatusBadge>My Status</StatusBadge>)
      expect(screen.getByText('My Status')).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('renders with sm size class', () => {
      render(<StatusBadge status="active" size="sm" />)
      const badge = screen.getByText('Active').closest('span')!
      expect(badge.className).toContain('text-[10px]')
    })

    it('renders with lg size class', () => {
      render(<StatusBadge status="active" size="lg" />)
      const badge = screen.getByText('Active').closest('span')!
      expect(badge.className).toContain('text-sm')
    })
  })

  describe('dot mode', () => {
    it('renders a dot element when dot=true', () => {
      render(<StatusBadge status="active" dot />)
      const badge = screen.getByText('Active').closest('span')!
      // dot renders a child span with h-1.5 w-1.5
      const dot = badge.querySelector('span')
      expect(dot).not.toBeNull()
    })

    it('does not render icon when dot=true', () => {
      render(<StatusBadge status="active" dot />)
      const badge = screen.getByText('Active').closest('span')!
      // No svg icon when dot mode is on
      expect(badge.querySelector('svg')).toBeNull()
    })
  })

  describe('showIcon=false', () => {
    it('hides icon when showIcon is false', () => {
      render(<StatusBadge status="active" showIcon={false} />)
      const badge = screen.getByText('Active').closest('span')!
      expect(badge.querySelector('svg')).toBeNull()
    })
  })

  describe('variant overrides', () => {
    it('applies success variant classes', () => {
      render(<StatusBadge variant="success" label="Good" />)
      const badge = screen.getByText('Good').closest('span')!
      expect(badge.className).toContain('text-success')
    })

    it('applies error variant classes', () => {
      render(<StatusBadge variant="error" label="Bad" />)
      const badge = screen.getByText('Bad').closest('span')!
      expect(badge.className).toContain('text-destructive')
    })
  })

  describe('room statuses', () => {
    it('renders available', () => {
      render(<StatusBadge status="available" />)
      expect(screen.getByText('Available')).toBeInTheDocument()
    })

    it('renders occupied', () => {
      render(<StatusBadge status="occupied" />)
      expect(screen.getByText('Occupied')).toBeInTheDocument()
    })

    it('renders partially_occupied', () => {
      render(<StatusBadge status="partially_occupied" />)
      expect(screen.getByText('Partially Occupied')).toBeInTheDocument()
    })

    it('renders maintenance', () => {
      render(<StatusBadge status="maintenance" />)
      expect(screen.getByText('Maintenance')).toBeInTheDocument()
    })
  })
})

describe('PriorityBadge', () => {
  it('renders low priority', () => {
    render(<PriorityBadge priority="low" />)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('renders medium priority', () => {
    render(<PriorityBadge priority="medium" />)
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('renders high priority', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('renders urgent priority', () => {
    render(<PriorityBadge priority="urgent" />)
    expect(screen.getByText('Urgent')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<PriorityBadge priority="high" className="my-class" />)
    const badge = screen.getByText('High').closest('span')!
    expect(badge.className).toContain('my-class')
  })
})

describe('StatusIndicator', () => {
  it('renders a dot with success status', () => {
    render(<StatusIndicator status="success" label="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders without label', () => {
    const { container } = render(<StatusIndicator status="warning" />)
    expect(container.querySelector('.rounded-full')).not.toBeNull()
    expect(container.querySelector('.text-sm')).toBeNull()
  })

  it('renders with label', () => {
    render(<StatusIndicator status="error" label="Critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('applies custom className to wrapper', () => {
    const { container } = render(<StatusIndicator status="muted" className="my-indicator" />)
    expect(container.firstChild).toHaveClass('my-indicator')
  })
})
