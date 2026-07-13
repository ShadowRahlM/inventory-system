import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { TestWrapper } from './TestWrapper'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const queryClient = createTestQueryClient()
  const initialRoute = options?.initialRoute ?? '/'

  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient} initialRoute={initialRoute}>
          {children}
        </TestWrapper>
      ),
      ...options,
    }),
    queryClient,
  }
}

export { customRender as render }
