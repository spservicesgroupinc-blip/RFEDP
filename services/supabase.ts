import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export interface Profile {
  id: string
  company_id: string
  role: 'admin' | 'crew'
  created_at: string
}

export interface Company {
  id: string
  name: string
  created_at: string
}

export async function getProfileAndCompany(userId: string): Promise<{ profile: Profile; company: Company } | null> {
  if (!supabase) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return null

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()

  if (companyError || !company) return null

  return { profile, company }
}
