import { createClient } from '@supabase/supabase-js';

const url = 'https://qefkpawkljalbevkyxtn.supabase.co';
// Aapki asli default publishable key
const key = 'sb_publishable_DAK1eoT1c-3w_T0-NG3bnw_6rPXTGY8'; 

export const supabase = createClient(url, key);
