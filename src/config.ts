import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null
let functionsBasePath = '/.netlify/functions'

export function initPalioGames(options: {
  supabaseUrl: string
  supabaseAnonKey: string
  functionsBasePath?: string
}): void {
  supabaseClient = createClient(options.supabaseUrl, options.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  if (options.functionsBasePath) {
    functionsBasePath = options.functionsBasePath
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('[palio-games] initPalioGames() must be called before using the games')
  }
  return supabaseClient
}

export function getFunctionsBasePath(): string {
  return functionsBasePath
}
