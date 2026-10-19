import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && chave)

export const supabase: SupabaseClient = supabaseConfigurado
  ? createClient(url!, chave!)
  : (null as unknown as SupabaseClient)

const MENSAGENS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
  [/already registered|already been registered/i, 'Este e-mail já está cadastrado. Tente entrar.'],
  [/password should be at least/i, 'A senha deve ter pelo menos 6 caracteres.'],
  [/should be different from the old/i, 'A nova senha precisa ser diferente da atual.'],
  [/invalid format|validate email/i, 'Digite um e-mail válido.'],
  [/rate limit|for security purposes|too many/i, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
  [/signups not allowed|signup is disabled/i, 'Novos cadastros estão desativados no momento.'],
]

export function traduzirErro(e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  return MENSAGENS.find(([re]) => re.test(msg))?.[1] ?? 'Não foi possível concluir. Tente novamente.'
}
