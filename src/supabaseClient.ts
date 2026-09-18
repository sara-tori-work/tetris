import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykbgoakdqmysofxkndzr.supabase.co';
const supabaseAnonKey = 'sb_publishable_VYQH7NTdx58fsTrK52-Yag_QOIYk6W2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
