import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { Register } from '../Register'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../lib/api', () => ({
  authAPI: {
    register: vi.fn(),
  },
}))

import { authAPI } from '../../lib/api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Register', () => {
  it('renders registration form', () => {
    render(<Register />)
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<Register />)
    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Password'), 'pass1234')
    await user.type(screen.getByLabelText('Confirm Password'), 'diffpass')
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('shows error when password is too short', async () => {
    const user = userEvent.setup()
    render(<Register />)
    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Password'), 'ab')
    await user.type(screen.getByLabelText('Confirm Password'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByText('Password must be at least 4 characters')).toBeInTheDocument()
  })

  it('calls register API and navigates to login on success', async () => {
    const mockRegister = vi.mocked(authAPI.register)
    mockRegister.mockResolvedValue({ data: { detail: 'Registration successful' } } as any)
    const user = userEvent.setup()
    render(<Register />)
    await user.type(screen.getByLabelText('Username'), 'newuser')
    await user.type(screen.getByLabelText('Password'), 'secure123')
    await user.type(screen.getByLabelText('Confirm Password'), 'secure123')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('newuser', 'secure123')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('shows error message on API failure', async () => {
    const mockRegister = vi.mocked(authAPI.register)
    mockRegister.mockRejectedValue({
      response: { data: { username: ['A user with that username already exists.'] } },
    })
    const user = userEvent.setup()
    render(<Register />)
    await user.type(screen.getByLabelText('Username'), 'existing')
    await user.type(screen.getByLabelText('Password'), 'secure123')
    await user.type(screen.getByLabelText('Confirm Password'), 'secure123')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(screen.getByText(/A user with that username already exists/)).toBeInTheDocument()
    })
  })

  it('has link to login page', () => {
    render(<Register />)
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByText('Login').closest('a')).toHaveAttribute('href', '/login')
  })
})
