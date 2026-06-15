import { createClient } from '@supabase/supabase-js';

// Hum direct values daal rahe hain taake Vercel ka jhanjhat hi khatam ho jaye
const url = 'https://qefkpawkljalbevkyxtn.supabase.co';
const key = 'YOUR_SUPABASE_ANON_KEY_HERE'; 

export const supabase = createClient(url, key);
