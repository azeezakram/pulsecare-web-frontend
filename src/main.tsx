import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import QueryProvider from './app/QueryProvider.tsx'
import { PrimeReactProvider } from 'primereact/api';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <PrimeReactProvider>
        <App />
      </PrimeReactProvider>
    </QueryProvider>
  </StrictMode>,
)
