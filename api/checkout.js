// Abre a página de pagamento do Stripe para o plano escolhido
import { PRECOS, acessoDoEmail, acessoValido, json, origem, stripe, usuarioDoToken } from './_lib.js'

export async function POST(request) {
  // sem as chaves na Vercel, o app usa os Payment Links do Stripe
  const naoConfigurado = () => json({ erro: 'Checkout não configurado.', codigo: 'nao-configurado' }, 503)
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return naoConfigurado()
  try {
    const user = await usuarioDoToken(request)
    if (!user) return json({ erro: 'Sua sessão expirou. Entre de novo.' }, 401)

    const { plano } = await request.json().catch(() => ({}))
    if (!(plano in PRECOS)) return json({ erro: 'Plano inválido.' }, 400)
    const preco = PRECOS[plano]
    if (!preco) return naoConfigurado()

    const email = user.email.toLowerCase()
    const acesso = await acessoDoEmail(email)
    if (acessoValido(acesso)) {
      if (acesso.plano === 'vitalicio' || acesso.plano === 'cortesia') return json({ erro: 'Seu acesso já está liberado sem data de fim.' }, 409)
      if (plano !== 'vitalicio' && acesso.stripe_subscription_id)
        return json({ erro: 'Você já tem uma assinatura ativa. Para trocar de plano, use "Gerenciar assinatura".' }, 409)
    }

    const recorrente = plano !== 'vitalicio'
    const metadata = { plano, email, user_id: user.id }
    const base = origem(request)
    const sessao = await stripe().checkout.sessions.create({
      mode: recorrente ? 'subscription' : 'payment',
      line_items: [{ price: preco, quantity: 1 }],
      client_reference_id: user.id,
      ...(acesso?.stripe_customer_id ? { customer: acesso.stripe_customer_id } : { customer_email: email }),
      ...(recorrente || acesso?.stripe_customer_id ? {} : { customer_creation: 'always' }),
      metadata,
      ...(recorrente ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
      allow_promotion_codes: true,
      locale: 'pt-BR',
      success_url: `${base}/?assinatura=sucesso`,
      cancel_url: `${base}/?assinatura=cancelada`,
    })
    return json({ url: sessao.url })
  } catch (e) {
    console.error('[checkout]', e)
    return json({ erro: 'Não foi possível abrir o pagamento. Tente de novo em instantes.' }, 500)
  }
}
