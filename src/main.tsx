import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WorkStoryPage } from './components/work-story-page.tsx'

const Page = window.location.pathname === '/work-story' ? WorkStoryPage : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
