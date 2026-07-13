import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../infrastructure/theme-provider'
import type { ReactNode } from 'react'

export function TestWrapper({ children, queryClient, initialRoute }: {
  children: ReactNode
  queryClient: QueryClient
  initialRoute: string
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
