import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTableHeader } from '@/components/ui/data-table/DataTableHeader'
import type { Column, SortConfig } from '@/components/ui/data-table/types'

type Row = { id: string; name: string; status: string; amount: number }

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'amount', header: 'Amount', sortable: false },
]

const gridTemplate = '1fr 1fr 1fr'

function setup(sortConfigs: SortConfig[] = [], opts: { selectable?: boolean; isClickable?: boolean } = {}) {
  const onSort = jest.fn()
  render(
    <DataTableHeader
      visibleColumns={columns}
      gridTemplate={gridTemplate}
      isClickable={opts.isClickable ?? false}
      sortConfigs={sortConfigs}
      onSort={onSort}
      selectable={opts.selectable}
      isAllSelected={false}
      isSomeSelected={false}
      onToggleAll={jest.fn()}
    />
  )
  return { onSort }
}

describe('DataTableHeader', () => {
  describe('ARIA roles', () => {
    it('has rowgroup wrapper', () => {
      setup()
      expect(document.querySelector('[role="rowgroup"]')).toBeInTheDocument()
    })

    it('has row inside rowgroup', () => {
      setup()
      expect(document.querySelector('[role="row"]')).toBeInTheDocument()
    })

    it('has columnheader for each visible column', () => {
      setup()
      const headers = screen.getAllByRole('columnheader')
      expect(headers).toHaveLength(columns.length)
    })

    it('renders column header labels', () => {
      setup()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
    })
  })

  describe('aria-sort', () => {
    it('has no aria-sort when column is unsorted', () => {
      setup([])
      const nameHeader = screen.getByText('Name').closest('[role="columnheader"]')
      expect(nameHeader).not.toHaveAttribute('aria-sort')
    })

    it('has aria-sort="ascending" when sorted asc', () => {
      setup([{ key: 'name', direction: 'asc' }])
      const nameHeader = screen.getByText('Name').closest('[role="columnheader"]')
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    it('has aria-sort="descending" when sorted desc', () => {
      setup([{ key: 'name', direction: 'desc' }])
      const nameHeader = screen.getByText('Name').closest('[role="columnheader"]')
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    })

    it('has no aria-sort on non-sorted column when another column is sorted', () => {
      setup([{ key: 'name', direction: 'asc' }])
      const statusHeader = screen.getByText('Status').closest('[role="columnheader"]')
      expect(statusHeader).not.toHaveAttribute('aria-sort')
    })

    it('has no aria-sort on non-sortable column', () => {
      setup([{ key: 'name', direction: 'asc' }])
      const amountHeader = screen.getByText('Amount').closest('[role="columnheader"]')
      expect(amountHeader).not.toHaveAttribute('aria-sort')
    })
  })

  describe('keyboard navigation on sortable headers', () => {
    it('sortable columns have tabIndex=0', () => {
      setup()
      const nameHeader = screen.getByText('Name').closest('[role="columnheader"]')
      expect(nameHeader).toHaveAttribute('tabIndex', '0')
    })

    it('non-sortable columns have no tabIndex', () => {
      setup()
      const amountHeader = screen.getByText('Amount').closest('[role="columnheader"]')
      expect(amountHeader).not.toHaveAttribute('tabIndex')
    })

    it('calls onSort on Enter key for sortable column', async () => {
      const user = userEvent.setup()
      const { onSort } = setup()
      const nameHeader = screen.getByText('Name').closest('[role="columnheader"]') as HTMLElement
      nameHeader.focus()
      await user.keyboard('{Enter}')
      expect(onSort).toHaveBeenCalledWith(columns[0], expect.anything())
    })

    it('calls onSort on Space key for sortable column', async () => {
      const user = userEvent.setup()
      const { onSort } = setup()
      const nameHeader = screen.getByText('Name').closest('[role="columnheader"]') as HTMLElement
      nameHeader.focus()
      await user.keyboard('{ }')
      expect(onSort).toHaveBeenCalledWith(columns[0], expect.anything())
    })
  })

  describe('selectable mode', () => {
    it('renders select-all checkbox with aria-label', () => {
      setup([], { selectable: true })
      expect(screen.getByRole('checkbox', { name: /select all/i })).toBeInTheDocument()
    })

    it('select-all cell has columnheader role', () => {
      setup([], { selectable: true })
      const headers = screen.getAllByRole('columnheader')
      // Should have columns.length + 1 (checkbox cell)
      expect(headers).toHaveLength(columns.length + 1)
    })
  })

  describe('isClickable mode', () => {
    it('renders extra columnheader for row action when clickable', () => {
      setup([], { isClickable: true })
      const headers = screen.getAllByRole('columnheader')
      // columns.length + 1 (chevron cell)
      expect(headers).toHaveLength(columns.length + 1)
    })

    it('action column has accessible label', () => {
      setup([], { isClickable: true })
      const actionHeader = document.querySelector('[role="columnheader"][aria-label="Row action"]')
      expect(actionHeader).toBeInTheDocument()
    })
  })

  describe('multi-sort indicator', () => {
    it('shows sort order number when multi-sorting', () => {
      setup([
        { key: 'name', direction: 'asc' },
        { key: 'status', direction: 'desc' },
      ])
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('does not show sort order number for single sort', () => {
      setup([{ key: 'name', direction: 'asc' }])
      expect(screen.queryByText('1')).not.toBeInTheDocument()
    })
  })
})
