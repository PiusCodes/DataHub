import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import './styles.css'
import { ConvexClientProvider } from './convexClient'
import { logEvent } from './utils/logger'

logEvent('app_started')

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConvexClientProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ConvexClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
