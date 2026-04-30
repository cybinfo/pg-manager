import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeatureSettings } from '@/app/(dashboard)/settings/_components/FeatureSettings'
import type { WorkspaceModuleConfig } from '@/lib/features'

// Mock useFeatureManagement
const mockSaveConfig = jest.fn()
const mockSetConfig = jest.fn()
const mockSetSelectedWorkspaceId = jest.fn()

const defaultConfig: WorkspaceModuleConfig = {
  expenses: { enabled: true, features: {} },
  billing: { enabled: false, features: {} },
}

let mockManagement = {
  workspaces: [
    { id: 'ws-1', name: 'Green Hills PG', business_type: 'pg', module_config: defaultConfig },
  ],
  selectedWorkspaceId: 'ws-1' as string | null,
  setSelectedWorkspaceId: mockSetSelectedWorkspaceId,
  selectedConfig: defaultConfig,
  configs: new Map([['ws-1', defaultConfig]]),
  setConfig: mockSetConfig,
  saveConfig: mockSaveConfig,
  loading: false,
  saving: false,
}

jest.mock('@/lib/features/use-features', () => ({
  useFeatureManagement: () => mockManagement,
}))

jest.mock('@/lib/toast-helpers', () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

function setup() {
  return render(<FeatureSettings />)
}

describe('FeatureSettings', () => {
  beforeEach(() => {
    mockSaveConfig.mockClear()
    mockSetConfig.mockClear()
    mockSetSelectedWorkspaceId.mockClear()
    mockManagement = {
      workspaces: [
        { id: 'ws-1', name: 'Green Hills PG', business_type: 'pg', module_config: defaultConfig },
        { id: 'ws-2', name: 'PowerFit Gym',   business_type: 'gym', module_config: {} },
      ],
      selectedWorkspaceId: 'ws-1',
      setSelectedWorkspaceId: mockSetSelectedWorkspaceId,
      selectedConfig: defaultConfig,
      configs: new Map([['ws-1', defaultConfig], ['ws-2', {}]]),
      setConfig: mockSetConfig,
      saveConfig: mockSaveConfig,
      loading: false,
      saving: false,
    }
  })

  describe('Business list (left pane)', () => {
    it('shows all workspaces in left pane', () => {
      setup()
      expect(screen.getByText('Green Hills PG')).toBeInTheDocument()
      expect(screen.getByText('PowerFit Gym')).toBeInTheDocument()
    })

    it('calls setSelectedWorkspaceId when a workspace is clicked', () => {
      setup()
      fireEvent.click(screen.getByText('PowerFit Gym'))
      expect(mockSetSelectedWorkspaceId).toHaveBeenCalledWith('ws-2')
    })
  })

  describe('Module count summary', () => {
    it('shows module count', () => {
      setup()
      // defaultConfig has 1 enabled (expenses), total is MODULES_CATALOG.length (26)
      expect(screen.getByText(/1 of 26 modules enabled/)).toBeInTheDocument()
    })
  })

  describe('Module cards', () => {
    it('shows all 26 module cards', () => {
      setup()
      // Check a sample of module names
      expect(screen.getByText('Expenses')).toBeInTheDocument()
      expect(screen.getByText('Billing')).toBeInTheDocument()
      expect(screen.getByText('Rooms')).toBeInTheDocument()
    })
  })

  describe('Save button', () => {
    it('calls saveConfig when Save Changes is clicked', async () => {
      mockSaveConfig.mockResolvedValue(true)
      setup()
      fireEvent.click(screen.getAllByText('Save Changes')[0])
      await waitFor(() => expect(mockSaveConfig).toHaveBeenCalledWith('ws-1'))
    })
  })

  describe('Loading state', () => {
    it('shows spinner when loading', () => {
      mockManagement = { ...mockManagement, loading: true }
      const { container } = setup()
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('No workspace selected', () => {
    it('shows prompt when no workspace selected', () => {
      mockManagement = { ...mockManagement, selectedWorkspaceId: null }
      setup()
      expect(screen.getByText(/Select a business to configure/)).toBeInTheDocument()
    })
  })
})
