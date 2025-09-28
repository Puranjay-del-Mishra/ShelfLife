import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './styles/globals.css'

console.log('[main] bootstrap at', window.location.href);


ReactDOM.createRoot(document.getElementById('root')!).render(<App />)

