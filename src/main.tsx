import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'
import { I18nProvider } from './lib/I18nContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

declare global {
  interface Window {
    __swPendingReload?: boolean
    __swReloadTimer?: number
    __swUpdateComplete?: boolean
  }
}

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw-update-available'))
          }
        })
      }
    })
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window.__swPendingReload) {
      if (window.__swReloadTimer !== undefined) {
        clearTimeout(window.__swReloadTimer)
        window.__swReloadTimer = undefined
      }
      window.__swUpdateComplete = true
      window.dispatchEvent(new CustomEvent('sw-update-complete'))
      setTimeout(() => window.location.reload(), 1500)
    }
  })
}
