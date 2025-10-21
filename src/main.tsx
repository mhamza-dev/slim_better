// React imports
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// React Redux imports
import { Provider } from 'react-redux'

// Internal imports - Styles
import './index.css'

// Internal imports - App
import App from './App.tsx'

// Internal imports - Store
import { store } from './store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
