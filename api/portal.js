// Abre o portal do cliente do Stripe: trocar cartão, mudar de plano, baixar recibos e cancelar
import { acessoDoEmail, json, origem, stripe, usuarioDoToken } from './_lib.js'

export async function POST(request) {
  try {
    const user = await usuarioDoToken(request)
    if (!user) return json({ erro: 'Sua sessão expirou. Entre de novo.' }, 401)
    const acesso = await acessoDoEmail(user.email)
    if (!acesso?.stripe_customer_id) return json({ erro: 'Não encontramos uma compra no Stripe para este e-mail.' }, 404)
    const sessao = await stripe().billingPortal.sessions.create({ customer: acesso.stripe_customer_id, return_url: `${origem(request)}/`, locale: 'pt-BR' })
    return json({ url: sessao.url })
  } catch (e) {
    console.error('[portal]', e)
    return json({ erro: 'Não foi possível abrir o portal de assinatura. Tente de novo em instantes.' }, 500)
  }
}
