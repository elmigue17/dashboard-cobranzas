import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Ventana para cambiar la contraseña de quien está usando el dashboard.
export default function CambiarClave({ onCerrar }) {
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tono, texto }

  async function guardar(e) {
    e.preventDefault();
    if (clave.length < 8) return setMensaje({ tono: 'is-warning', texto: 'Usa al menos 8 caracteres.' });
    if (clave !== repetida) return setMensaje({ tono: 'is-warning', texto: 'Las dos contraseñas no coinciden.' });
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) return setMensaje({ tono: 'is-negative', texto: 'No se pudo cambiar: ' + error.message });
    setMensaje({ tono: 'is-positive', texto: 'Listo, tu contraseña cambió.' });
    setClave('');
    setRepetida('');
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="panel login-card" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Cambiar contraseña</h2>
          <button type="button" className="icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div>
          <label className="field-label" htmlFor="clave-nueva">Contraseña nueva</label>
          <input id="clave-nueva" type="password" className="glass-input" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label" htmlFor="clave-repetida">Repite la contraseña</label>
          <input id="clave-repetida" type="password" className="glass-input" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </div>
        {mensaje && <div className={`note ${mensaje.tono}`}>{mensaje.texto}</div>}
        <button type="submit" className="btn-primary btn-block" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
