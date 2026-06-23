import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://becgcxfgvpogbmpjlkvd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlY2djeGZndnBvZ2JtcGpsa3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDA0NzksImV4cCI6MjA5Nzc3NjQ3OX0.B-aAgWAhw1847EJfpkDekoVE1Lvy2kMtxnqkwgwerPA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
