import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root'
import './styles.css'
import './auth.css'
import './financas.css'
import './recursos.css'

// aplica o tema salvo antes da primeira pintura, evitando "piscar"
try {
  const tema = JSON.parse(localStorage.getItem('cf:tema') ?? '"sistema"')
  const escuro = tema === 'escuro' || (tema !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = escuro ? 'escuro' : 'claro'
} catch {
  /* ignora */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
