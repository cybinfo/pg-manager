import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureSettings } from '@/app/(dashboard)/settings/_components/FeatureSettings'
import type { FeatureFlags } from '@/lib/features'

// Mock the settings mutation hook
const mockSave = jest.fn()
let mockSaving = false
jest.mock('@/lib/hooks/useSettingsMutation', () => ({
  useSettingsMutation: () => ({ saving: mockSaving, save: mockSave }),
}))

const allEnabled: FeatureFlags = {}

const withSomeDisabled: FeatureFlags = {
  food: false,
  demoMode: false,
  whatsappSummaries: false,
}

function setup(flags: FeatureFlags = allEnabled) {
  const setFeatureFlags = jest.fn()
  render(
    <FeatureSettings
      featureFlags={flags}
      setFeatureFlags={setFeatureFlags}
      config={null}
    />
  )
  return { setFeatureFlags }
}

describe('FeatureSettings', () => {
  beforeEach(() => {
    mockSave.mockClear()
    mockSaving = false
  })

  describe('Trial mode banner', () => {
    it('shows the trial mode message', () => {
      setup()
      expect(screen.getByText(/Trial Mode/)).toBeInTheDocument()
    })
  })

  describe('Feature count summary', () => {
    it('shows "17 of 17 features enabled" when all flags are empty (defaults to on)', () => {
      setup(allEnabled)
      expect(screen.getByText(/17 of 17 features enabled/)).toBeInTheDocument()
    })

    it('reflects disabled features in the count', () => {
      setup(withSomeDisabled)
      expect(screen.getByText(/14 of 17 features enabled/)).toBeInTheDocument()
    })
  })

  describe('Domain tabs', () => {
    it('renders PG Manager tab', () => {
      setup()
      expect(screen.getByRole('tab', { name: 'PG Manager' })).toBeInTheDocument()
    })

    it('renders Library Manager tab', () => {
      setup()
      expect(screen.getByRole('tab', { name: 'Library Manager' })).toBeInTheDocument()
    })

    it('renders Platform Tools tab', () => {
      setup()
      expect(screen.getByRole('tab', { name: 'Platform Tools' })).toBeInTheDocument()
    })

    it('PG Manager tab is selected by default', () => {
      setup()
      const pgTab = screen.getByRole('tab', { name: 'PG Manager' })
      expect(pgTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('Module cards', () => {
    it('shows PG module names in the default tab', () => {
      setup()
      expect(screen.getByText('Operations')).toBeInTheDocument()
      expect(screen.getByText('Billing & Finance')).toBeInTheDocument()
      expect(screen.getByText('Utilities')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
      expect(screen.getByText('Marketing')).toBeInTheDocument()
    })

    it('does not show Library module on PG tab', () => {
      setup()
      // Library Management feature is in Library tab, not PG tab
      expect(screen.queryByText('Library Module')).not.toBeInTheDocument()
    })
  })

  describe('Expand/collapse feature list', () => {
    it('feature items are hidden before expanding', () => {
      setup()
      // Food & Meals is in Operations module — not visible until expanded
      expect(screen.queryByText('Food & Meals')).not.toBeInTheDocument()
    })

    it('expands module to show individual features when chevron is clicked', () => {
      setup()
      // Find the expand button for "Operations" card
      const expandButtons = screen.getAllByTitle('Expand features')
      fireEvent.click(expandButtons[0]) // first card = Operations
      expect(screen.getByText('Food & Meals')).toBeInTheDocument()
      expect(screen.getByText('Visitor Log')).toBeInTheDocument()
    })

    it('collapses expanded module when chevron is clicked again', () => {
      setup()
      const expandButtons = screen.getAllByTitle('Expand features')
      fireEvent.click(expandButtons[0])
      expect(screen.getByText('Food & Meals')).toBeInTheDocument()

      const collapseButton = screen.getByTitle('Collapse')
      fireEvent.click(collapseButton)
      expect(screen.queryByText('Food & Meals')).not.toBeInTheDocument()
    })
  })

  describe('Individual feature toggles', () => {
    it('calls setFeatureFlags when a feature toggle is clicked', () => {
      const { setFeatureFlags } = setup()
      const expandButtons = screen.getAllByTitle('Expand features')
      fireEvent.click(expandButtons[0]) // expand Operations

      // Find the toggle button for Approvals Hub
      const featureRow = screen.getByText('Approvals Hub').closest('div[class*="rounded-lg"]')!
      const toggle = featureRow.querySelector('button')!
      fireEvent.click(toggle)

      expect(setFeatureFlags).toHaveBeenCalledWith(
        expect.objectContaining({ approvals: false })
      )
    })

    it('shows disabled styling on toggled-off features', () => {
      setup({ ...allEnabled, food: false })
      const expandButtons = screen.getAllByTitle('Expand features')
      fireEvent.click(expandButtons[0]) // expand Operations

      const foodLabel = screen.getByText('Food & Meals')
      expect(foodLabel).toHaveClass('text-muted-foreground')
    })
  })

  describe('Module-level toggle', () => {
    it('sets all features in module to true when module toggle is clicked (all off → on)', () => {
      const { setFeatureFlags } = setup({
        approvals: false,
        exitClearance: false,
        architectureView: false,
        food: false,
        visitors: false,
      })
      // The Operations module toggle — each Card has a module-level toggle button
      const moduleToggles = screen.getAllByTitle(/Disable all in module|Enable all in module/)
      fireEvent.click(moduleToggles[0])

      expect(setFeatureFlags).toHaveBeenCalledWith(
        expect.objectContaining({
          approvals: true,
          exitClearance: true,
          architectureView: true,
          food: true,
          visitors: true,
        })
      )
    })
  })

  describe('Save button', () => {
    it('renders Save Changes button in summary bar', () => {
      setup()
      const saveButtons = screen.getAllByRole('button', { name: /Save/i })
      expect(saveButtons.length).toBeGreaterThan(0)
    })

    it('calls save with feature_flags when Save is clicked', async () => {
      setup(withSomeDisabled)
      const saveButtons = screen.getAllByRole('button', { name: /Save/i })
      fireEvent.click(saveButtons[0])

      expect(mockSave).toHaveBeenCalledWith(
        { feature_flags: withSomeDisabled },
        expect.objectContaining({ successMessage: 'Feature settings saved' })
      )
    })
  })

  describe('Saving state', () => {
    it('disables save buttons while saving', () => {
      mockSaving = true
      setup()
      const saveButtons = screen.getAllByRole('button', { name: /Save/i })
      saveButtons.forEach((btn) => expect(btn).toBeDisabled())
    })
  })
})
