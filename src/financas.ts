import type { ContaFinanceira, Lancamento, Transferencia } from './types'
import { diasNoMes, formatData, hojeISO, mesAtual, somarMes } from './utils'

/* ---------- Datas ---------- */

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const somarDias = (data: string, n: number) => {
  const [a, m, d] = data.split('-').map(Number)
  return iso(new Date(a, m - 1, d + n))
}

export const diasEntre = (de: string, ate: string) => {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

/* ---------- Situação ---------- */

export type Situacao = 'realizado' | 'pendente' | 'atrasado'

/** "Atrasado" é calculado: pendente com vencimento anterior a hoje */
export const situacao = (l: Lancamento, hoje = hojeISO()): Situacao =>
  l.pago ? 'realizado' : l.data < hoje ? 'atrasado' : 'pendente'

export const sinal = (l: Lancamento) => (l.tipo === 'receita' ? l.valor : -l.valor)

/* ---------- Períodos ---------- */

export type PresetPeriodo = 'mes' | 'mes-anterior' | '30d' | '3m' | '6m' | '12m' | 'ano' | 'tudo' | 'personalizado'

export interface Periodo {
  preset: PresetPeriodo
  de: string
  ate: string
}

export const PRESETS: { id: PresetPeriodo; rotulo: string }[] = [
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: '3m', rotulo: 'Últimos 3 meses' },
  { id: '6m', rotulo: 'Últimos 6 meses' },
  { id: '12m', rotulo: 'Últimos 12 meses' },
  { id: 'ano', rotulo: 'Este ano' },
  { id: 'tudo', rotulo: 'Todo o período' },
  { id: 'personalizado', rotulo: 'Personalizado' },
]

export function periodoDoPreset(preset: PresetPeriodo, atual?: Periodo): Periodo {
  const hoje = hojeISO()
  const mes = mesAtual()
  const fim = (m: string) => `${m}-${pad(diasNoMes(m))}`
  switch (preset) {
    case 'mes':
      return { preset, de: `${mes}-01`, ate: fim(mes) }
    case 'mes-anterior': {
      const m = somarMes(mes, -1)
      return { preset, de: `${m}-01`, ate: fim(m) }
    }
    case '30d':
      return { preset, de: somarDias(hoje, -29), ate: hoje }
    case '3m':
      return { preset, de: `${somarMes(mes, -2)}-01`, ate: fim(mes) }
    case '6m':
      return { preset, de: `${somarMes(mes, -5)}-01`, ate: fim(mes) }
    case '12m':
      return { preset, de: `${somarMes(mes, -11)}-01`, ate: fim(mes) }
    case 'ano':
      return { preset, de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` }
    case 'tudo':
      return { preset, de: '0000-01-01', ate: '9999-12-31' }
    default:
      return { preset: 'personalizado', de: atual?.de && atual.de !== '0000-01-01' ? atual.de : `${mes}-01`, ate: atual?.ate && atual.ate !== '9999-12-31' ? atual.ate : fim(mes) }
  }
}

export const noPeriodo = (data: string | undefined, p: Periodo) => !!data && data >= p.de && data <= p.ate

export const rotuloPeriodo = (p: Periodo) =>
  p.preset === 'personalizado' ? `${formatData(p.de)} a ${formatData(p.ate)}` : PRESETS.find((x) => x.id === p.preset)!.rotulo

/* ---------- Saldos ---------- */

/** Saldo = saldo inicial + movimentações realizadas a partir da data do saldo inicial (até a data informada) */
export function saldoConta(conta: ContaFinanceira, lancamentos: Lancamento[], transferencias: Transferencia[], ate = hojeISO()) {
  const ini = conta.dataSaldoInicial
  let s = conta.saldoInicial
  for (const l of lancamentos) {
    if (l.contaId !== conta.id || !l.pago || !l.dataPagamento) continue
    if (l.dataPagamento >= ini && l.dataPagamento <= ate) s += sinal(l)
  }
  for (const t of transferencias) {
    if (t.data < ini || t.data > ate) continue
    if (t.destinoId === conta.id) s += t.valor
    if (t.origemId === conta.id) s -= t.valor
  }
  return Math.round(s * 100) / 100
}

export const temHistorico = (contaId: string, lancamentos: Lancamento[], transferencias: Transferencia[]) =>
  lancamentos.some((l) => l.contaId === contaId) || transferencias.some((t) => t.origemId === contaId || t.destinoId === contaId)

/* ---------- Cartão de crédito ---------- */

export const ehCartao = (c?: ContaFinanceira) => c?.tipo === 'cartao'

const dataNoMes = (a: number, mesIndex: number, dia: number) => {
  const base = new Date(a, mesIndex, 1)
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(Math.min(dia, ultimo))}`
}

/** Compras a partir do dia de fechamento entram na fatura seguinte */
export function faturaDaCompra(c: ContaFinanceira, data: string) {
  const fech = c.diaFechamento ?? 1
  const venc = c.diaVencimento ?? 10
  const [a, m, d] = data.split('-').map(Number)
  const mesFech = d >= fech ? m : m - 1 // índice 0-based do mês de fechamento
  const fechamento = dataNoMes(a, mesFech, fech)
  const vencimento = dataNoMes(a, venc > fech ? mesFech : mesFech + 1, venc)
  return { chave: vencimento.slice(0, 7), fechamento, vencimento }
}

export type StatusFatura = 'aberta' | 'fechada' | 'vencida' | 'paga' | 'futura'

export interface Fatura {
  cartao: ContaFinanceira
  chave: string
  fechamento: string
  vencimento: string
  compras: Lancamento[]
  total: number
  pago: number
  restante: number
  status: StatusFatura
}

/** Faturas do cartão; pagamentos (transferências para o cartão) quitam as faturas mais antigas primeiro */
export function faturasDoCartao(c: ContaFinanceira, lancamentos: Lancamento[], transferencias: Transferencia[], hoje = hojeISO()): Fatura[] {
  const grupos = new Map<string, Fatura>()
  for (const l of lancamentos) {
    if (l.contaId !== c.id) continue
    const f = faturaDaCompra(c, l.data)
    const g = grupos.get(f.chave) ?? { cartao: c, ...f, compras: [], total: 0, pago: 0, restante: 0, status: 'futura' as StatusFatura }
    g.compras.push(l)
    g.total += l.tipo === 'despesa' ? l.valor : -l.valor
    grupos.set(f.chave, g)
  }
  // a fatura atual aparece mesmo vazia
  const atual = faturaDaCompra(c, hoje)
  if (!grupos.has(atual.chave)) grupos.set(atual.chave, { cartao: c, ...atual, compras: [], total: 0, pago: 0, restante: 0, status: 'aberta' })

  let credito = Math.max(0, c.saldoInicial) + transferencias.reduce((s, t) => s + (t.destinoId === c.id ? t.valor : 0) - (t.origemId === c.id ? t.valor : 0), 0)
  const lista = [...grupos.values()].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  for (const f of lista) {
    f.total = Math.round(f.total * 100) / 100
    f.compras.sort((a, b) => b.data.localeCompare(a.data))
    f.pago = Math.round(Math.min(Math.max(f.total, 0), Math.max(credito, 0)) * 100) / 100
    credito -= f.pago
    f.restante = Math.round((f.total - f.pago) * 100) / 100
    f.status =
      f.total > 0 && f.restante <= 0.004 ? 'paga'
        : hoje > f.vencimento ? (f.restante > 0 ? 'vencida' : 'paga')
        : f.chave === atual.chave ? 'aberta'
        : hoje >= f.fechamento ? 'fechada'
        : f.vencimento < atual.vencimento ? 'fechada' : 'futura'
  }
  return lista
}

/** Limite usado = tudo que ainda não foi pago, inclusive parcelas futuras */
export function resumoCartao(c: ContaFinanceira, lancamentos: Lancamento[], transferencias: Transferencia[]) {
  const faturas = faturasDoCartao(c, lancamentos, transferencias)
  const usado = faturas.reduce((s, f) => s + Math.max(0, f.restante), 0)
  const limite = c.limite ?? 0
  const atual = faturas.find((f) => f.status === 'aberta')!
  const aPagar = faturas.filter((f) => f.restante > 0 && (f.status === 'fechada' || f.status === 'vencida'))
  return { faturas, usado, limite, disponivel: limite - usado, atual, aPagar }
}

/** Projeção diária do saldo: saldo atual + pendentes (vencidos entram hoje) + lançamentos e transferências futuras */
export function previsaoSaldo(
  contas: ContaFinanceira[], lancamentos: Lancamento[], transferencias: Transferencia[], dias = 30,
  faturas: Pick<Fatura, 'cartao' | 'vencimento' | 'restante'>[] = [],
) {
  const hoje = hojeISO()
  const limite = somarDias(hoje, dias)
  const ids = new Set(contas.map((c) => c.id))
  const saldoAtual = contas.reduce((s, c) => s + saldoConta(c, lancamentos, transferencias, hoje), 0)
  const deltas = new Array(dias + 1).fill(0)
  let entradas = 0
  let saidas = 0

  const lancar = (data: string, valor: number) => {
    deltas[Math.max(0, diasEntre(hoje, data))] += valor
    if (valor >= 0) entradas += valor
    else saidas -= valor
  }

  for (const l of lancamentos) {
    if (!ids.has(l.contaId)) continue
    if (!l.pago && l.data <= limite) lancar(l.data, sinal(l))
    else if (l.pago && l.dataPagamento && l.dataPagamento > hoje && l.dataPagamento <= limite) lancar(l.dataPagamento, sinal(l))
  }
  for (const t of transferencias) {
    if (t.data <= hoje || t.data > limite) continue
    const entra = ids.has(t.destinoId)
    const sai = ids.has(t.origemId)
    if (entra && !sai) lancar(t.data, t.valor)
    if (sai && !entra) lancar(t.data, -t.valor)
  }
  // faturas de cartão em aberto saem da conta que as paga, no vencimento
  for (const f of faturas) {
    if (f.restante > 0 && f.cartao.contaPagamentoId && ids.has(f.cartao.contaPagamentoId) && f.vencimento <= limite) lancar(f.vencimento, -f.restante)
  }

  let acumulado = saldoAtual
  const pontos = deltas.map((d, i) => {
    acumulado += d
    const data = somarDias(hoje, i)
    return { data, rotulo: formatData(data).slice(0, 5), Saldo: Math.round(acumulado * 100) / 100 }
  })
  const menor = pontos.reduce((m, p) => (p.Saldo < m.Saldo ? p : m), pontos[0])
  return { saldoAtual, saldoFinal: acumulado, pontos, entradas, saidas, menor }
}
