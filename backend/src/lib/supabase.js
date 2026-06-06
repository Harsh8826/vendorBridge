import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
}

export function supabaseForUser(token) {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export const supabaseAdmin = serviceKey
  ? createClient(url, serviceKey)
  : null
