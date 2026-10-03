import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { NOMBRE_NEGOCIO, INICIALES_NEGOCIO } from '../config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError('Email o contraseña incorrectos.');
    setLoading(false);
  }

  return (
    <div className="login-wrap">
      <form className="panel login-card" onSubmit={handleLogin}>
        <div className="brand" style={{ marginBottom: '22px', padding: 0 }}>
          <span className="brand-mark">{INICIALES_NEGOCIO}</span>
          <span>
            <span className="brand-name">{NOMBRE_NEGOCIO}</span>
            <span className="brand-sub">Ingresa para continuar</span>
          </span>
        </div>

        <div>
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="glass-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="username"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="field-label" htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            className="glass-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="note is-negative">{error}</div>}

        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          <LogIn size={16} /> {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
