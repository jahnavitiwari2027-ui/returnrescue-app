import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { accountsEnabled, config } from '../config'

export const supabase: SupabaseClient | null = accountsEnabled
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const PHOTO_BUCKET = 'return-photos'
