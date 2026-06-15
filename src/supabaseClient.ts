import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Agar URL sahi nahi hoga toh client null rahega, app crash nahi karegi!
export const supabase = url && url.startsWith('http') && key ? createClient(url, key) : null;
