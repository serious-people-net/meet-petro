import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './site.css'
import ProductPage from './ProductPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProductPage />
  </StrictMode>,
)
