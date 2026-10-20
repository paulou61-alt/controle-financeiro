import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type PlanoAcesso = 'teste' | 'mensal' | 'semestral' | 'anual' | 'vitalicio' | 'cortesia'
export type StatusAcesso = 'ativo' | 'pendente' | 'atrasado' | 'cancelado' | 'reembolsado' | 'contestado'

export interface Acesso {
  email: string
  plano: PlanoAcesso
  status: StatusAcesso
  /** null = sem data de fim */
  valido_ate: string | null
  stripe_customer_id: string | null
}

export type PlanoVenda = Exclude<PlanoAcesso, 'teste' | 'cortesia'>

export const PLANOS: {
  id: PlanoVenda; nome: string; selo: string; frase: string; preco: string; unidade: string; detalhe: string; destaque?: boolean
}[] = [
  { id: 'mensal', nome: 'Mensal', selo: 'Assinatura', frase: 'Flexibilidade para começar.', preco: '14,90', unidade: '/ mês', detalhe: 'Cobrança recorrente de R$ 14,90 a cada mês.' },
  { id: 'semestral', nome: 'Semestral', selo: 'Assinatura', frase: 'Seis meses para cuidar das suas finanças.', preco: '69,90', unidade: '/ semestre', detalhe: 'Cobrança recorrente de R$ 69,90 a cada 6 meses.' },
  { id: 'anual', nome: 'Anual', selo: 'Melhor equilíbrio', frase: 'Um ano de organização financeira.', preco: '99,90', unidade: '/ ano', detalhe: 'Cobrança recorrente de R$ 99,90 a cada ano.', destaque: true },
  { id: 'vitalicio', nome: 'Vitalício', selo: 'Pague uma vez', frase: 'Pague uma vez, sem renovação.', preco: '149,90', unidade: 'pagamento único', detalhe: 'Pagamento único de R$ 149,90.' },
]

export const NOME_PLANO: Record<PlanoAcesso, string> = {
  teste: 'Teste grátis', mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual', vitalicio: 'Vitalício', cortesia: 'Cortesia',
}

export const DIAS_TESTE = 7

/** Dias que faltam do teste grátis (null se não estiver em teste) */
export function diasDeTeste(a: Acesso | null | undefined) {
  if (a?.plano !== 'teste' || !a.valido_ate) return null
  return Math.max(0, Math.ceil((new Date(a.valido_ate).getTime() - Date.now()) / 86400000))
}

export const acessoAtivo = (a: Acesso | null | undefined) =>
  !!a && (a.status === 'ativo' || a.status === 'atrasado') && (!a.valido_ate || new Date(a.valido_ate) > new Date())

/** "sem-controle" = a tabela de acessos ainda não foi criada no Supabase (antes de ligar a cobrança) */
export type EstadoAcesso = { carregando: true } | { carregando: false; acesso: Acesso | null; semControle: boolean; erro: boolean }

const voltouDoPagamento = () => new URLSearchParams(location.search).get('assinatura') === 'sucesso'

export function limparRetornoDoPagamento() {
  const u = new URL(location.href)
  if (!u.searchParams.has('assinatura')) return
  u.searchParams.delete('assinatura')
  history.replaceState(null, '', u.pathname + u.search + u.hash)
}

export function useAcesso(email: string) {
  const [estado, setEstado] = useState<EstadoAcesso>({ carregando: true })
  const [confirmando, setConfirmando] = useState(voltouDoPagamento)
  const [versao, setVersao] = useState(0)

  const consultar = useCallback(async () => {
    const { data, error } = await supabase.from('acessos').select('email, plano, status, valido_ate, stripe_customer_id').eq('email', email.toLowerCase()).maybeSingle()
    if (error) {
      const semTabela = error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message)
      return { carregando: false as const, acesso: null, semControle: semTabela, erro: !semTabela }
    }
    return { carregando: false as const, acesso: (data as Acesso | null) ?? null, semControle: false, erro: false }
  }, [email])

  useEffect(() => {
    let ativo = true
    consultar().then((r) => ativo && setEstado(r))
    return () => {
      ativo = false
    }
  }, [consultar, versao])

  // ao voltar do Stripe, o aviso de pagamento pode levar alguns segundos: consulta de novo até liberar
  useEffect(() => {
    if (!confirmando) return
    let tentativas = 0
    const t = setInterval(async () => {
      tentativas++
      const r = await consultar()
      setEstado(r)
      if (acessoAtivo(r.acesso) || tentativas >= 30) {
        clearInterval(t)
        setConfirmando(false)
        limparRetornoDoPagamento()
      }
    }, 3000)
    return () => clearInterval(t)
  }, [confirmando, consultar])

  return { estado, confirmando, recarregar: () => setVersao((v) => v + 1) }
}

/* ---------- Payment Links (reserva enquanto o checkout do servidor não está configurado) ---------- */

const LINKS: Record<PlanoVenda, string | undefined> = {
  mensal: import.meta.env.VITE_STRIPE_LINK_MENSAL ?? 'https://buy.stripe.com/6oU7sL7bF2941AsfczgQE00',
  semestral: import.meta.env.VITE_STRIPE_LINK_SEMESTRAL ?? 'https://buy.stripe.com/aFadR9dA3dRM3IA3tRgQE03',
  anual: import.meta.env.VITE_STRIPE_LINK_ANUAL ?? 'https://buy.stripe.com/aFa6oH67BaFA3IA8ObgQE02',
  vitalicio: import.meta.env.VITE_STRIPE_LINK_VITALICIO ?? 'https://buy.stripe.com/6oU8wPbrVeVQ7YQ5BZgQE01',
}

// Aceita somente páginas de pagamento hospedadas pelo Stripe.
function linkStripe(valor?: string): URL | undefined {
  if (!valor?.trim()) return undefined
  try {
    const url = new URL(valor.trim())
    if (url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password && !url.port && url.pathname !== '/') return url
  } catch { /* configuração ausente ou inválida */ }
  return undefined
}

/** Link de pagamento já com o e-mail e o id da conta, para o webhook ligar a compra a quem está logado */
async function linkDePagamento(plano: PlanoVenda) {
  const url = linkStripe(LINKS[plano])
  if (!url) throw new Error('Este plano ainda não está disponível. Tente outro ou fale com o suporte.')
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (user?.email) url.searchParams.set('prefilled_email', user.email)
  if (user?.id) url.searchParams.set('client_reference_id', user.id)
  return url.href
}

class NaoConfigurado extends Error {}

async function chamar(rota: string, corpo?: object): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sua sessão expirou. Entre de novo.')
  let r: Response
  try {
    r = await fetch(rota, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(corpo ?? {}) })
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique sua internet.')
  }
  const j = (await r.json().catch(() => ({}))) as { url?: string; erro?: string; codigo?: string }
  // 404: rodando sem as funções da Vercel (ex.: npm run dev)
  if (j.codigo === 'nao-configurado' || r.status === 404) throw new NaoConfigurado()
  if (!r.ok || !j.url) throw new Error(j.erro || 'O pagamento ainda não está disponível. Tente de novo em instantes.')
  return j.url
}

/** Leva para a página de pagamento do Stripe (checkout do servidor ou, na falta dele, o Payment Link) */
export async function assinar(plano: PlanoVenda) {
  let url: string
  try {
    url = await chamar('/api/checkout', { plano })
  } catch (e) {
    if (!(e instanceof NaoConfigurado)) throw e
    url = await linkDePagamento(plano)
  }
  location.assign(url)
}

/** Leva para o portal do Stripe (cartão, troca de plano, recibos, cancelamento) */
export async function gerenciarAssinatura() {
  try {
    location.assign(await chamar('/api/portal'))
  } catch (e) {
    throw e instanceof NaoConfigurado ? new Error('O portal de assinatura ainda não está disponível.') : e
  }
}
