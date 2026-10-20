import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const limpar = (v?: string) => (v ?? '').trim().replace(/^["']|["']$/g, '')

// Usa só a origem (https://xxxx.supabase.co), mesmo que tenham colado /rest/v1 ou outra rota no final
const url = (() => {
  const bruto = limpar(import.meta.env.VITE_SUPABASE_URL)
  try {
    return bruto ? new URL(bruto).origin : ''
  } catch {
    return bruto
  }
})()
const chave = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabaseConfigurado = Boolean(url && chave)

export const supabase: SupabaseClient = supabaseConfigurado
  ? createClient(url!, chave!)
  : (null as unknown as SupabaseClient)

const MENSAGENS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/captcha/i, 'A verificação de segurança falhou ou expirou. Marque o quadro de novo e tente outra vez.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
  [/already registered|already been registered/i, 'Este e-mail já está cadastrado. Tente entrar.'],
  [/password should be at least/i, 'A senha deve ter pelo menos 6 caracteres.'],
  [/should be different from the old/i, 'A nova senha precisa ser diferente da atual.'],
  [/invalid format|validate email/i, 'Digite um e-mail válido.'],
  [/rate limit|for security purposes|too many/i, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
  [/signups not allowed|signup is disabled/i, 'Novos cadastros estão desativados no momento.'],
  [/error sending .*email|sending .*email/i, 'Não foi possível enviar o e-mail de confirmação. Tente novamente em alguns minutos.'],
  [/not authorized/i, 'Este e-mail não pode receber mensagens no momento. Tente outro e-mail ou fale com o suporte.'],
  [/weak|pwned|known to be|easy to guess/i, 'Essa senha é muito comum ou fraca. Escolha uma senha diferente.'],
  [/database error/i, 'Erro no servidor ao criar a conta. Fale com o suporte.'],
  [/invalid api key|no api key|apikey/i, 'Configuração do servidor inválida. Fale com o suporte.'],
]

export function traduzirErro(e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  console.error('[Supabase]', e)
  const traducao = MENSAGENS.find(([re]) => re.test(msg))?.[1]
  return traducao ?? `Não foi possível concluir. Detalhe: ${msg || 'erro desconhecido'}`
}
