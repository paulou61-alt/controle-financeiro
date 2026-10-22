// Recebe os avisos do Stripe e libera ou bloqueia o acesso
//
// Regras:
//  - pagamento aprovado: libera (assinatura até o fim do período pago; vitalício sem data de fim)
//  - renovação recusada: continua liberado por 5 dias de tolerância (status "atrasado")
//  - assinatura cancelada: usa até o fim do período pago
//  - reembolso total ou contestação (chargeback): bloqueia na hora e cancela a assinatura
import { admin, planoDoPrecoStripe, stripe } from './_lib.js'

const DIA = 86400000
const TOLERANCIA_ATRASO = 5 * DIA
// a renovação é cobrada logo depois do fim do período; a folga evita bloquear quem está pagando em dia
const FOLGA_RENOVACAO = 2 * DIA
const BLOQUEIOS = ['reembolsado', 'contestado']

const idDe = (x) => (typeof x === 'string' ? x : x?.id ?? null)
const iso = (ms) => new Date(ms).toISOString()

async function linhaPor(campo, valor) {
  if (!valor) return null
  const { data, error } = await admin().from('acessos').select('*').eq(campo, valor).limit(1).maybeSingle()
  if (error) throw error
  return data
}

async function gravar(email, campos) {
  const { error } = await admin()
    .from('acessos')
    .upsert({ email: email.toLowerCase(), ...campos, atualizado_em: new Date().toISOString() }, { onConflict: 'email' })
  if (error) throw error
}

async function emailDoCliente(customerId) {
  if (!customerId) return null
  const c = await stripe().customers.retrieve(customerId)
  return c.deleted ? null : c.email
}

/** Fim do período pago (na API atual fica em cada item da assinatura) */
function fimDoPeriodo(sub) {
  const fins = (sub.items?.data ?? []).map((i) => i.current_period_end).filter(Boolean)
  const fim = fins.length ? Math.max(...fins) : sub.current_period_end
  return fim ? fim * 1000 : null
}

/** Atualiza o acesso a partir do estado atual da assinatura no Stripe */
async function sincronizarAssinatura(sub, emailInformado) {
  const customer = idDe(sub.customer)
  const email = (emailInformado || sub.metadata?.email || (await emailDoCliente(customer)) || '').toLowerCase()
  if (!email) return console.warn('[webhook] assinatura sem e-mail', sub.id)
  const atual = (await linhaPor('email', email)) ?? (await linhaPor('stripe_subscription_id', sub.id))

  // eventos podem chegar fora de ordem: nada reativa uma assinatura bloqueada por reembolso ou contestação
  if (atual && BLOQUEIOS.includes(atual.status) && atual.stripe_subscription_id === sub.id) return
  // quem comprou o vitalício não é afetado pelo fim de uma assinatura antiga
  if (atual && (atual.plano === 'vitalicio' || atual.plano === 'cortesia') && atual.status === 'ativo' && !atual.valido_ate) return
  // eventos de uma assinatura antiga não sobrescrevem a atual
  if (atual?.stripe_subscription_id && atual.stripe_subscription_id !== sub.id && ['canceled', 'incomplete_expired'].includes(sub.status)) return

  // nunca herda "teste" ou "cortesia" da linha atual: quem tem assinatura paga está num plano pago
  const PAGOS = ['mensal', 'semestral', 'anual']
  const plano =
    planoDoPrecoStripe(sub.items?.data?.[0]?.price) ||
    (PAGOS.includes(sub.metadata?.plano) && sub.metadata.plano) ||
    (PAGOS.includes(atual?.plano) && atual.plano) ||
    'mensal'
  const fim = fimDoPeriodo(sub)
  let status
  let validoAte
  switch (sub.status) {
    case 'active':
    case 'trialing':
      status = 'ativo'
      validoAte = fim ? iso(fim + FOLGA_RENOVACAO) : null
      break
    case 'past_due':
      status = 'atrasado'
      // a tolerância conta a partir da primeira recusa e não se renova a cada nova tentativa
      validoAte = atual?.status === 'atrasado' && atual.valido_ate ? atual.valido_ate : iso(Date.now() + TOLERANCIA_ATRASO)
      break
    case 'incomplete':
      status = 'pendente'
      validoAte = null
      break
    default: // canceled, unpaid, incomplete_expired, paused
      status = 'cancelado'
      validoAte = iso(sub.ended_at ? sub.ended_at * 1000 : Date.now())
  }
  await gravar(email, {
    plano, status, valido_ate: validoAte,
    stripe_customer_id: customer, stripe_subscription_id: sub.id,
    user_id: sub.metadata?.user_id || atual?.user_id || null,
  })
}

async function checkoutConcluido(s, tipoEvento) {
  const email = (s.metadata?.email || s.customer_details?.email || '').toLowerCase()
  if (s.mode === 'subscription') {
    const sub = await stripe().subscriptions.retrieve(idDe(s.subscription))
    return sincronizarAssinatura(sub, email)
  }
  if (s.mode !== 'payment' || !email) return

  // compra avulsa: só o vitalício libera acesso
  let plano = s.metadata?.plano
  if (!plano) {
    const itens = await stripe().checkout.sessions.listLineItems(s.id, { limit: 5 })
    plano = itens.data.map((i) => planoDoPrecoStripe(i.price)).find(Boolean)
  }
  if (plano !== 'vitalicio') return console.warn('[webhook] pagamento avulso sem plano vitalício', s.id)

  const atual = await linhaPor('email', email)
  if (s.payment_status !== 'paid') {
    // boleto/Pix ainda não compensado: registra como pendente sem tirar um acesso que já exista
    if (tipoEvento === 'checkout.session.completed' && !(atual && ['ativo', 'atrasado'].includes(atual.status)))
      await gravar(email, { plano, status: 'pendente', valido_ate: null, stripe_customer_id: idDe(s.customer) ?? atual?.stripe_customer_id ?? null })
    return
  }
  // quem migra de uma assinatura para o vitalício não deve ser cobrado de novo
  if (atual?.stripe_subscription_id) {
    await stripe().subscriptions.cancel(atual.stripe_subscription_id).catch((e) => console.warn('[webhook] cancelar assinatura antiga', e.message))
  }
  await gravar(email, {
    plano: 'vitalicio', status: 'ativo', valido_ate: null,
    stripe_customer_id: idDe(s.customer) ?? atual?.stripe_customer_id ?? null,
    stripe_subscription_id: null, stripe_payment_intent: idDe(s.payment_intent),
    user_id: s.metadata?.user_id || s.client_reference_id || atual?.user_id || null,
  })
}

/** Reembolso total ou contestação: bloqueia na hora e cancela a assinatura, se houver */
async function bloquear(charge, status) {
  const linha =
    (await linhaPor('stripe_payment_intent', idDe(charge.payment_intent))) ??
    (await linhaPor('stripe_customer_id', idDe(charge.customer))) ??
    (charge.billing_details?.email ? await linhaPor('email', charge.billing_details.email.toLowerCase()) : null)
  const email = linha?.email ?? (charge.billing_details?.email || (await emailDoCliente(idDe(charge.customer))))
  if (!email) return console.warn('[webhook] não foi possível identificar quem bloquear', charge.id)
  if (linha?.plano === 'cortesia') return

  if (linha?.stripe_subscription_id) {
    await stripe().subscriptions.cancel(linha.stripe_subscription_id).catch((e) => console.warn('[webhook] cancelar assinatura', e.message))
  }
  await gravar(email, {
    status, valido_ate: new Date().toISOString(),
    stripe_customer_id: idDe(charge.customer) ?? linha?.stripe_customer_id ?? null,
    observacao: `${status === 'reembolsado' ? 'Reembolso' : 'Contestação'} da cobrança ${charge.id}`,
  })
}

async function tratar(evento) {
  const o = evento.data.object
  switch (evento.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return checkoutConcluido(o, evento.type)
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return sincronizarAssinatura(o)
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const subId = idDe(o.parent?.subscription_details?.subscription ?? o.subscription)
      if (subId) return sincronizarAssinatura(await stripe().subscriptions.retrieve(subId))
      return
    }
    case 'charge.refunded':
      // reembolso parcial não bloqueia
      if (o.refunded) return bloquear(o, 'reembolsado')
      return
    case 'charge.dispute.created': {
      const charge = typeof o.charge === 'string' ? await stripe().charges.retrieve(o.charge) : o.charge
      return bloquear(charge, 'contestado')
    }
  }
}

export async function POST(request) {
  const corpo = await request.text()
  let evento
  try {
    const segredo = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()
    evento = await stripe().webhooks.constructEventAsync(corpo, request.headers.get('stripe-signature') ?? '', segredo)
  } catch (e) {
    console.error('[webhook] assinatura inválida', e.message)
    return new Response('Assinatura do webhook inválida', { status: 400 })
  }
  try {
    await tratar(evento)
  } catch (e) {
    // erro 500 faz o Stripe tentar de novo mais tarde
    console.error('[webhook]', evento.type, evento.id, e)
    return new Response('Erro ao processar', { status: 500 })
  }
  return new Response(JSON.stringify({ recebido: true }), { headers: { 'content-type': 'application/json' } })
}
