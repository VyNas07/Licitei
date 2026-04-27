import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

// Client com service_role — nunca expor no frontend
export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
