import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AccesoGate from './components/AccesoGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccesoGate>
      {({ usuario, salir }) => <App usuario={usuario} salir={salir} />}
    </AccesoGate>
  </React.StrictMode>,
)
