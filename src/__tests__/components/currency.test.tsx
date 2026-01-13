/**
 * Tests for Currency components
 */

import { render, screen } from '@testing-library/react'
import {
  Currency,
  AmountDisplay,
  AmountWithTrend,
  DuesSummary,
  PaymentAmount,
} from '@/components/ui/currency'

describe('Currency Component', () => {
  it('renders amount in INR format', () => {
    render(<Currency amount={1000} />)
    expect(screen.getByText(/₹.*1,000/)).toBeInTheDocument()
  })

  it('renders zero amount', () => {
    render(<Currency amount={0} />)
    expect(screen.getByText(/₹.*0/)).toBeInTheDocument()
  })

  it('renders negative amounts', () => {
    render(<Currency amount={-1000} />)
    expect(screen.getByText(/-₹.*1,000/)).toBeInTheDocument()
  })

  it('shows positive sign when showSign is true', () => {
    render(<Currency amount={1000} showSign />)
    expect(screen.getByText(/\+.*₹.*1,000/)).toBeInTheDocument()
  })

  it('applies success color for positive amounts with showSign', () => {
    render(<Currency amount={1000} showSign />)
    const element = screen.getByText(/\+.*₹.*1,000/)
    expect(element).toHaveClass('text-emerald-600')
  })

  it('applies error color for negative amounts with showSign', () => {
    render(<Currency amount={-1000} showSign />)
    const element = screen.getByText(/-₹.*1,000/)
    expect(element).toHaveClass('text-rose-600')
  })

  it('renders compact format for large numbers', () => {
    render(<Currency amount={150000} compact />)
    // Should show something like ₹1.5L or ₹150K depending on locale
    const element = screen.getByText(/₹/)
    expect(element).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Currency amount={1000} className="custom-class" />)
    const element = screen.getByText(/₹.*1,000/)
    expect(element).toHaveClass('custom-class')
  })
})

describe('AmountDisplay Component', () => {
  it('renders label and amount', () => {
    render(<AmountDisplay label="Total Due" amount={5000} />)

    expect(screen.getByText('Total Due')).toBeInTheDocument()
    expect(screen.getByText(/₹.*5,000/)).toBeInTheDocument()
  })

  it('applies success variant', () => {
    render(<AmountDisplay label="Collected" amount={5000} variant="success" />)

    const amountElement = screen.getByText(/₹.*5,000/).closest('p')
    expect(amountElement).toHaveClass('text-emerald-600')
  })

  it('applies warning variant', () => {
    render(<AmountDisplay label="Pending" amount={5000} variant="warning" />)

    const amountElement = screen.getByText(/₹.*5,000/).closest('p')
    expect(amountElement).toHaveClass('text-amber-600')
  })

  it('applies error variant', () => {
    render(<AmountDisplay label="Overdue" amount={5000} variant="error" />)

    const amountElement = screen.getByText(/₹.*5,000/).closest('p')
    expect(amountElement).toHaveClass('text-rose-600')
  })

  it('applies size variants', () => {
    const { rerender } = render(<AmountDisplay label="Test" amount={1000} size="sm" />)
    expect(screen.getByText(/₹.*1,000/).closest('p')).toHaveClass('text-lg')

    rerender(<AmountDisplay label="Test" amount={1000} size="lg" />)
    expect(screen.getByText(/₹.*1,000/).closest('p')).toHaveClass('text-3xl')
  })
})

describe('AmountWithTrend Component', () => {
  it('renders amount and positive trend', () => {
    render(<AmountWithTrend amount={5000} previousAmount={4000} />)

    expect(screen.getByText(/₹.*5,000/)).toBeInTheDocument()
    // Should show 25% increase
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('renders negative trend', () => {
    render(<AmountWithTrend amount={4000} previousAmount={5000} />)

    expect(screen.getByText(/₹.*4,000/)).toBeInTheDocument()
    // Should show 20% decrease
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<AmountWithTrend label="Revenue" amount={5000} previousAmount={4000} />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('hides percentage when showPercentage is false', () => {
    render(
      <AmountWithTrend amount={5000} previousAmount={4000} showPercentage={false} />
    )

    expect(screen.queryByText('25%')).not.toBeInTheDocument()
  })

  it('handles zero previous amount', () => {
    render(<AmountWithTrend amount={5000} previousAmount={0} />)

    expect(screen.getByText(/₹.*5,000/)).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})

describe('DuesSummary Component', () => {
  it('renders all amounts', () => {
    render(
      <DuesSummary totalDues={10000} collectedAmount={6000} pendingAmount={4000} />
    )

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Collected')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows collection progress percentage', () => {
    render(
      <DuesSummary totalDues={10000} collectedAmount={6000} pendingAmount={4000} />
    )

    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('handles zero total dues', () => {
    render(<DuesSummary totalDues={0} collectedAmount={0} pendingAmount={0} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('caps progress bar at 100%', () => {
    // This tests the edge case where collected > total (shouldn't happen but safety)
    render(
      <DuesSummary totalDues={5000} collectedAmount={6000} pendingAmount={0} />
    )

    // Component should still render
    expect(screen.getByText('Collection Progress')).toBeInTheDocument()
  })
})

describe('PaymentAmount Component', () => {
  it('renders paid status with success color', () => {
    render(<PaymentAmount amount={5000} status="paid" />)

    const element = screen.getByText(/₹.*5,000/)
    expect(element).toHaveClass('text-emerald-600')
  })

  it('renders pending status with warning color', () => {
    render(<PaymentAmount amount={5000} status="pending" />)

    const element = screen.getByText(/₹.*5,000/)
    expect(element).toHaveClass('text-amber-600')
  })

  it('renders overdue status with error color', () => {
    render(<PaymentAmount amount={5000} status="overdue" />)

    const element = screen.getByText(/₹.*5,000/)
    expect(element).toHaveClass('text-rose-600')
  })

  it('renders partial status with paid amount', () => {
    render(<PaymentAmount amount={5000} status="partial" paidAmount={2000} />)

    expect(screen.getByText(/₹.*5,000/)).toBeInTheDocument()
    expect(screen.getByText('Paid:')).toBeInTheDocument()
    expect(screen.getByText(/₹.*2,000/)).toBeInTheDocument()
  })

  it('does not show paid amount for non-partial status', () => {
    render(<PaymentAmount amount={5000} status="pending" paidAmount={2000} />)

    expect(screen.queryByText('Paid:')).not.toBeInTheDocument()
  })
})
