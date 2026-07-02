import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './display.css'
import DisplayPage from './DisplayPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DisplayPage />
  </StrictMode>,
)
