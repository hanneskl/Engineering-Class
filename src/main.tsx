import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './styles.css'
import './spreadsheet/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root fehlt in index.html')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
