import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import LoginScreen from './LoginScreen';

// Muestra el dashboard solo a quien inició sesión y está en la tabla `acceso`.
// Sin sesión, la base no devuelve ni una fila (ver supabase/migrations/..._acceso.sql); esto es
// solo la puerta de la interfaz.
export default function AccesoGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined: cargando, null: sin sesión
  const [acceso, setAcceso] = useState({ userId: null, ok: undefined });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let vigente = true;
    supabase.rpc('tiene_acceso').then(({ data, error }) => {
      if (!vigente) return;
      if (error) console.error('No se pudo comprobar el acceso', error);
      setAcceso({ userId, ok: data === true });
    });
    return () => { vigente = false; };
  }, [userId]);
  // Mientras no se comprobó el acceso de ESTE usuario, sigue "cargando".
  const permitido = acceso.userId === userId ? acceso.ok : undefined;

  if (session === undefined || (session && permitido === undefined)) {
    return (
      <div className="login-wrap">
        <RefreshCw size={26} className="spinner" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (!permitido) {
    return (
      <div className="login-wrap">
        <div className="panel login-card">
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Tu usuario todavía no tiene acceso</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Iniciaste sesión como <b>{session.user.email}</b>, pero esa cuenta no está en la lista de
            acceso de este dashboard. Pídele a quien lo administra que te agregue.
          </p>
          <button type="button" className="btn btn-block" onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return children({ usuario: session.user, salir: () => supabase.auth.signOut() });
}
