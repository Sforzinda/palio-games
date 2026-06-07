import { getSupabaseClient } from '../config'

export interface ContradaOption {
  id: string
  name: string
  slug: string
}

export const getContrade = async (): Promise<{ data: ContradaOption[] | null; error: unknown }> => {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('contrade')
      .select('id, name, slug')
      .eq('active', true)
      .order('name')

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}
