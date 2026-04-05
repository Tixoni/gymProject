import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { db } from './storage/db'
import { workoutService } from './storage/workoutService'

if (import.meta.env.DEV) {
  globalThis.workoutService = workoutService
}

void db
  .open()
  .then(() => workoutService.backfillMissingPlannedDates())
  .catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
