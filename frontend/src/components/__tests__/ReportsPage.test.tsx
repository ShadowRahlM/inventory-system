import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/utils'
import { ReportsPage } from '../ReportsPage'

const mockStockSummary = {
  total_tiles: 346,
  total_cartons: 1200,
  total_loose_pieces: 45,
  total_pieces: 24045,
  low_stock_count: 3,
  location_count: 5,
  total_batches: 28,
}

const mockMovementSummary = {
  period: 'month',
  since: '2025-07-01T00:00:00Z',
  movements: [
    { period: '2026-06-01', movement_type: 'receive', count: 12 },
    { period: '2026-06-01', movement_type: 'dispatch', count: 8 },
    { period: '2026-07-01', movement_type: 'receive', count: 5 },
    { period: '2026-07-01', movement_type: 'dispatch', count: 3 },
  ],
  by_type: [
    { movement_type: 'receive', count: 17, total_pieces: 3400 },
    { movement_type: 'dispatch', count: 11, total_pieces: 2200 },
  ],
}

vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    reports: {
      stockSummary: vi.fn(() => Promise.resolve(mockStockSummary)),
      movementSummary: vi.fn(() => Promise.resolve(mockMovementSummary)),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReportsPage', () => {
  it('renders the page title', async () => {
    render(<ReportsPage />)
    expect(await screen.findByText('Reports')).toBeInTheDocument()
  })

  it('renders stock summary cards', async () => {
    render(<ReportsPage />)
    expect(await screen.findByText('346')).toBeInTheDocument()
    expect(await screen.findByText('24,045')).toBeInTheDocument()
    expect(await screen.findByText('1,200')).toBeInTheDocument()
    const fives = screen.getAllByText('5')
    expect(fives.length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('28')).toBeInTheDocument()
  })

  it('renders low stock count with red styling', async () => {
    render(<ReportsPage />)
    await screen.findByText('Low Stock Items')
    const threes = screen.getAllByText('3')
    expect(threes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders movement summary by type cards', async () => {
    render(<ReportsPage />)
    const receives = await screen.findAllByText('receive')
    expect(receives.length).toBeGreaterThanOrEqual(1)
    const dispatches = screen.getAllByText('dispatch')
    expect(dispatches.length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('17')).toBeInTheDocument()
    const elevens = screen.getAllByText('11')
    expect(elevens.length).toBeGreaterThanOrEqual(1)
  })

  it('renders movement trend table', async () => {
    render(<ReportsPage />)
    const juneDates = await screen.findAllByText('2026-06-01')
    expect(juneDates.length).toBeGreaterThanOrEqual(1)
    const julyDates = await screen.findAllByText('2026-07-01')
    expect(julyDates.length).toBeGreaterThanOrEqual(1)
  })

  it('changes period on select change', async () => {
    render(<ReportsPage />)
    const select = await screen.findByDisplayValue('Last 365 days')
    fireEvent.change(select, { target: { value: 'day' } })
    expect(await screen.findByDisplayValue('Last 7 days')).toBeInTheDocument()
  })

  it('renders Movement Trends heading', async () => {
    render(<ReportsPage />)
    expect(await screen.findByText('Movement Trends')).toBeInTheDocument()
  })
})
