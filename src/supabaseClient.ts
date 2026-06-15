import { createClient } from '@supabase/supabase-js';

// Aapke project ki direct configurations
const url = 'https://qefkpawkljalbevkyxtn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZmtwYXdrbGphbGJldmt5eHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgzMTU4MTksImV4cCI6MjAzMTg5MTgxOX0.X2E5cl9U_WcZ5W8B-9Lp1V7hC6k2m5B3N_W8X9Z9b88'; 

export const supabase = createClient(url, key);
