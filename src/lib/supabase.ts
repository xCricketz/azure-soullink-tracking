import { createClient } from '@supabase/supabase-js'
import { browserCookieJar, durableAuthStorage } from './auth-persist'

const url = 'https://ttklufpslmmmxvejryff.supabase.co'
const key = 'sb_publishable_jogHNUoytkDsv56M7RByOw_Eqa1hRGS'

const storage = typeof window === 'undefined'
  ? undefined
  : durableAuthStorage(window.localStorage, browserCookieJar())

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    ...(storage ? { storage } : {}),
  },
})
