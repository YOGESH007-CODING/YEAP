import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ThemeProvider } from './lib/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider><App /></ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
