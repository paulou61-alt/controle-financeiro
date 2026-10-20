// Código compartilhado das funções da Vercel (arquivos com "_" na frente não viram rota)
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const limpar = (v) => (v ?? '').trim().replace(/^["']|["']$/g, '')

let _stripe
export function stripe() {
  if (!_stripe) {
    const chave = limpar(process.env.STRIPE_SECRET_KEY)
    if (!chave) throw new Error('STRIPE_SECRET_KEY não configurada na Vercel')
    _stripe = new Stripe(chave)
  }
  return _stripe
}

let _admin
/** Cliente do Supabase com a service role: ignora as regras de acesso, por isso só existe no servidor */
export function admin() {
  if (!_admin) {
    const bruto = limpar(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    let url = bruto
    try {
      url = new URL(bruto).origin
    } catch {
      /* usa como veio */
    }
    const chave = limpar(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!url || !chave) throw new Error('SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_URL não configuradas na Vercel')
    _admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return _admin
}

/** IDs dos preços criados no painel do Stripe (price_...) */
export const PRECOS = {
  mensal: limpar(process.env.STRIPE_PRECO_MENSAL),
  semestral: limpar(process.env.STRIPE_PRECO_SEMESTRAL),
  anual: limpar(process.env.STRIPE_PRECO_ANUAL),
  vitalicio: limpar(process.env.STRIPE_PRECO_VITALICIO),
}

export const planoDoPreco = (precoId) => Object.entries(PRECOS).find(([, id]) => id && id === precoId)?.[0]

export const json = (corpo, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

/** Endereço do site para os retornos do Stripe */
export const origem = (request) => limpar(process.env.SITE_URL).replace(/\/$/, '') || new URL(request.url).origin

/** Usuário logado, a partir do token do Supabase enviado pelo app */
export async function usuarioDoToken(request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  return error || !data.user?.email ? null : data.user
}

export async function acessoDoEmail(email) {
  const { data, error } = await admin().from('acessos').select('*').eq('email', email.toLowerCase()).maybeSingle()
  if (error) throw error
  return data
}

export const acessoValido = (a) => !!a && ['ativo', 'atrasado'].includes(a.status) && (!a.valido_ate || new Date(a.valido_ate) > new Date())
