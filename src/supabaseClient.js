import { createClient } from '@supabase/supabase-js';

// La URL y la clave pública salen de .env.local (ver .env.example).
// Vite solo expone al navegador las variables que empiezan con VITE_.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
