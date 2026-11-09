import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rclpayvighvhdrdpadmx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.warn('[supabaseServer] SUPABASE_SERVICE_ROLE_KEY no configurada — las rutas admin no funcionarán');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'invalid', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
