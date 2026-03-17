import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://xzrkcytwsrnsacdqkusx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_71z0g84e5iKtGdh4jYstbQ_BauuF1fC'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)