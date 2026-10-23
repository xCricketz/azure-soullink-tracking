import { createClient } from '@supabase/supabase-js'

const url = 'https://ttklufpslmmmxvejryff.supabase.co'
const key = 'sb_publishable_jogHNUoytkDsv56M7RByOw_Eqa1hRGS'

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
