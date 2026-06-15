import { createClient } from '@supabase/supabase-js';

// Vercel aur Vite dono ke environment variables ka jhanjhat khatam
const url = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Taake khali variables par client crash na kare aur white screen na aaye
export const supabase = url && key ? createClient(url, key) : null;
