import type { Categoria, ContaFinanceira, GrupoDre, Lancamento, Meta, Tipo, Transferencia } from './types'
import { diasEntre, ehCartao, noPeriodo, saldoConta, somarDias, type Periodo } from './financas'
import { baixarArquivo, diasNoMes, hojeISO, mesAtual, mesDe, rotuloMes, somarMes } from './utils'

/* ---------- Regime ---------- */

/** Competência: conta na data do vencimento, pago ou não. Caixa: conta na data em que foi pago ou recebido */
export type Regime = 'competencia' | 'caixa'

export const dataNoRegime = (l: Lancamento, r: Regime) => (r === 'competencia' ? l.data : l.pago ? l.dataPagamento : undefined)

export interface Movimento {
  l: Lancamento
  data: string
}

export function movimentos(lancamentos: Lancamento[], periodo: Periodo, regime: Regime, contaId = ''): Movimento[] {
  const r: Movimento[] = []
  for (const l of lancamentos) {
    if (contaId && l.contaId !== contaId) continue
    const data = dataNoRegime(l, regime)
    if (data && noPeriodo(data, periodo)) r.push({ l, data })
  }
  return r
}

/* ---------- Colunas (meses ou anos) ---------- */

export type Nivel = 'mes' | 'ano'
export interface Colunas {
  nivel: Nivel
  lista: { chave: string; rotulo: string }[]
}

export const chaveDe = (data: string, nivel: Nivel) => data.slice(0, nivel === 'mes' ? 7 : 4)

/** Um mês por coluna; se o período passar de 12 meses, um ano por coluna */
export function colunasDoPeriodo(p: Periodo, datas: string[]): Colunas {
  const ordenadas = [...datas].sort()
  const hoje = hojeISO()
  const de = p.preset === 'tudo' ? ordenadas[0] ?? hoje : p.de
  const ate = p.preset === 'tudo' ? ordenadas[ordenadas.length - 1] ?? hoje : p.ate
  const meses: string[] = []
  for (let m = mesDe(de); m <= mesDe(ate) && meses.length <= 12; m = somarMes(m, 1)) meses.push(m)
  if (meses.length <= 12) return { nivel: 'mes', lista: meses.map((m) => ({ chave: m, rotulo: rotuloMes(m) })) }
  const anos: string[] = []
  for (let a = Number(de.slice(0, 4)); a <= Number(ate.slice(0, 4)); a++) anos.push(String(a))
  return { nivel: 'ano', lista: anos.map((a) => ({ chave: a, rotulo: a })) }
}

/** Mesmo intervalo, imediatamente antes (por meses quando o período é de meses inteiros) */
export function periodoAnterior(p: Periodo): Periodo | null {
  if (p.preset === 'tudo') return null
  const mesesInteiros = p.de.endsWith('-01') && p.ate === `${mesDe(p.ate)}-${String(diasNoMes(mesDe(p.ate))).padStart(2, '0')}`
  if (mesesInteiros) {
    const [a1, m1] = mesDe(p.de).split('-').map(Number)
    const [a2, m2] = mesDe(p.ate).split('-').map(Number)
    const n = (a2 - a1) * 12 + (m2 - m1) + 1
    const de = somarMes(mesDe(p.de), -n)
    const ate = somarMes(mesDe(p.ate), -n)
    return { preset: 'personalizado', de: `${de}-01`, ate: `${ate}-${String(diasNoMes(ate)).padStart(2, '0')}` }
  }
  const dias = diasEntre(p.de, p.ate) + 1
  return { preset: 'personalizado', de: somarDias(p.de, -dias), ate: somarDias(p.de, -1) }
}

/* ---------- DRE ---------- */

export const GRUPOS_DRE: { id: GrupoDre; rotulo: string; tipo: Tipo | 'ambos'; ajuda: string }[] = [
  { id: 'receita', rotulo: 'Receita operacional', tipo: 'receita', ajuda: 'Vendas, serviços, salário, pró-labore recebido' },
  { id: 'deducao', rotulo: 'Dedução da receita', tipo: 'despesa', ajuda: 'Impostos sobre vendas (Simples, ISS, ICMS), devoluções, taxas de marketplace' },
  { id: 'custo', rotulo: 'Custo (CMV / CSP)', tipo: 'despesa', ajuda: 'Mercadoria vendida, matéria-prima, frete de compra, mão de obra direta' },
  { id: 'despesa', rotulo: 'Despesa operacional', tipo: 'despesa', ajuda: 'Aluguel, salários, marketing, sistemas, contas de consumo' },
  { id: 'receita-financeira', rotulo: 'Receita financeira / outras', tipo: 'receita', ajuda: 'Rendimentos, juros recebidos, venda de bens' },
  { id: 'despesa-financeira', rotulo: 'Despesa financeira', tipo: 'despesa', ajuda: 'Juros, multas, tarifas bancárias, IOF' },
  { id: 'imposto', rotulo: 'Imposto sobre o lucro', tipo: 'despesa', ajuda: 'IRPJ e CSLL (Lucro Presumido ou Real)' },
  { id: 'fora', rotulo: 'Fora do resultado', tipo: 'ambos', ajuda: 'Retirada de lucros, aporte de sócio, empréstimo, compra de equipamento' },
]

export const gruposDoTipo = (t: Tipo) => GRUPOS_DRE.filter((g) => g.tipo === t || g.tipo === 'ambos')

export const grupoDre = (cat: Categoria | undefined, tipo: Tipo): GrupoDre => {
  if (cat?.dre && (cat.dre === 'fora' || GRUPOS_DRE.find((g) => g.id === cat.dre)?.tipo === (cat.tipo ?? tipo))) return cat.dre
  if ((cat?.tipo ?? tipo) === 'receita') return cat?.id === 'investimentos' ? 'receita-financeira' : 'receita'
  return 'despesa'
}

const RECEITAS_DRE = new Set<GrupoDre>(['receita', 'receita-financeira'])

export interface Linha {
  valores: number[]
  total: number
}

export interface LinhaCategoria extends Linha {
  id: string
  nome: string
  cat?: Categoria
}

export interface Dre {
  colunas: Colunas
  grupos: Record<GrupoDre, Linha & { categorias: LinhaCategoria[] }>
  receitaLiquida: Linha
  lucroBruto: Linha
  resultadoOperacional: Linha
  resultadoAntesIr: Linha
  lucroLiquido: Linha
  /** Lucro líquido somado ao que ficou fora do resultado */
  geracaoCaixa: Linha
}

const vazia = (n: number): Linha => ({ valores: new Array(n).fill(0), total: 0 })
const combinar = (n: number, partes: [number, Linha][]): Linha => {
  const r = vazia(n)
  for (const [k, l] of partes) {
    l.valores.forEach((v, i) => (r.valores[i] += k * v))
    r.total += k * l.total
  }
  return r
}

export function calcularDre(movs: Movimento[], catPorId: Map<string, Categoria>, colunas: Colunas): Dre {
  const n = colunas.lista.length
  const indice = new Map(colunas.lista.map((c, i) => [c.chave, i]))
  const grupos = Object.fromEntries(GRUPOS_DRE.map((g) => [g.id, { ...vazia(n), categorias: [] as LinhaCategoria[] }])) as Dre['grupos']
  const porCat = new Map<string, LinhaCategoria>()

  for (const { l, data } of movs) {
    const i = indice.get(chaveDe(data, colunas.nivel))
    if (i === undefined) continue
    const cat = catPorId.get(l.categoriaId)
    const g = grupoDre(cat, l.tipo)
    // nas linhas de despesa o valor é positivo; estornos (receita numa categoria de despesa) reduzem
    const v = g === 'fora' ? (l.tipo === 'receita' ? l.valor : -l.valor) : (l.tipo === 'receita') === RECEITAS_DRE.has(g) ? l.valor : -l.valor
    const grupo = grupos[g]
    grupo.valores[i] += v
    grupo.total += v
    const chave = `${g}:${l.categoriaId}`
    let lc = porCat.get(chave)
    if (!lc) {
      lc = { id: l.categoriaId, nome: cat?.nome ?? 'Sem categoria', cat, ...vazia(n) }
      porCat.set(chave, lc)
      grupo.categorias.push(lc)
    }
    lc.valores[i] += v
    lc.total += v
  }
  for (const g of Object.values(grupos)) g.categorias.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const receitaLiquida = combinar(n, [[1, grupos.receita], [-1, grupos.deducao]])
  const lucroBruto = combinar(n, [[1, receitaLiquida], [-1, grupos.custo]])
  const resultadoOperacional = combinar(n, [[1, lucroBruto], [-1, grupos.despesa]])
  const resultadoAntesIr = combinar(n, [[1, resultadoOperacional], [1, grupos['receita-financeira']], [-1, grupos['despesa-financeira']]])
  const lucroLiquido = combinar(n, [[1, resultadoAntesIr], [-1, grupos.imposto]])
  const geracaoCaixa = combinar(n, [[1, lucroLiquido], [1, grupos.fora]])
  return { colunas, grupos, receitaLiquida, lucroBruto, resultadoOperacional, resultadoAntesIr, lucroLiquido, geracaoCaixa }
}

/** DRE de um único mês, por competência */
export function dreDoMes(lancamentos: Lancamento[], catPorId: Map<string, Categoria>, mes: string, soRealizados = false) {
  const periodo: Periodo = { preset: 'personalizado', de: `${mes}-01`, ate: `${mes}-${String(diasNoMes(mes)).padStart(2, '0')}` }
  const movs = movimentos(soRealizados ? lancamentos.filter((l) => l.pago) : lancamentos, periodo, 'competencia')
  return calcularDre(movs, catPorId, { nivel: 'mes', lista: [{ chave: mes, rotulo: rotuloMes(mes) }] })
}

/* ---------- Metas ---------- */

export const TIPOS_META: { id: Meta['tipo']; rotulo: string; descricao: string; mensal: boolean }[] = [
  { id: 'juntar', rotulo: 'Juntar dinheiro', descricao: 'Reserva de emergência, viagem, capital de giro…', mensal: false },
  { id: 'receita', rotulo: 'Faturamento mensal', descricao: 'Receita operacional mínima por mês', mensal: true },
  { id: 'resultado', rotulo: 'Lucro mensal', descricao: 'Lucro líquido mínimo por mês, pela DRE', mensal: true },
  { id: 'gastos', rotulo: 'Teto de gastos', descricao: 'Total máximo de despesas por mês', mensal: true },
]

const valorMensal = (tipo: Meta['tipo'], d: Dre) =>
  tipo === 'receita' ? d.grupos.receita.total
    : tipo === 'resultado' ? d.lucroLiquido.total
    : d.grupos.deducao.total + d.grupos.custo.total + d.grupos.despesa.total + d.grupos['despesa-financeira'].total + d.grupos.imposto.total

export interface Progresso {
  atual: number
  pct: number
  atingida: boolean
  /** Parte do valor do mês que ainda está pendente (só metas mensais) */
  pendente: number
  historico: { mes: string; valor: number; ok: boolean }[]
  /** Somente "juntar" */
  faltam: number
  mesesRestantes: number | null
  porMes: number | null
}

const mesesEntre = (de: string, ate: string) => {
  const [a1, m1] = de.split('-').map(Number)
  const [a2, m2] = ate.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

export function progressoMeta(
  m: Meta, mes: string, lancamentos: Lancamento[], catPorId: Map<string, Categoria>, contas: ContaFinanceira[], transferencias: Transferencia[],
): Progresso {
  if (m.tipo === 'juntar') {
    const conta = m.contaId ? contas.find((c) => c.id === m.contaId) : undefined
    const atual = conta && !ehCartao(conta) ? saldoConta(conta, lancamentos, transferencias) : (m.aportes ?? []).reduce((s, a) => s + a.valor, 0)
    const faltam = Math.max(0, m.valor - atual)
    const mesesRestantes = m.prazo ? Math.max(0, mesesEntre(mesAtual(), mesDe(m.prazo))) + (m.prazo >= hojeISO() ? 1 : 0) : null
    return {
      atual, pct: m.valor > 0 ? (atual / m.valor) * 100 : 0, atingida: atual >= m.valor, pendente: 0, historico: [],
      faltam, mesesRestantes, porMes: mesesRestantes ? faltam / mesesRestantes : null,
    }
  }
  const teto = m.tipo === 'gastos'
  const bateu = (v: number) => (teto ? v <= m.valor : v >= m.valor)
  const atual = valorMensal(m.tipo, dreDoMes(lancamentos, catPorId, mes))
  const realizado = valorMensal(m.tipo, dreDoMes(lancamentos, catPorId, mes, true))
  const historico = []
  for (let i = 6; i >= 1; i--) {
    const mm = somarMes(mes, -i)
    const valor = valorMensal(m.tipo, dreDoMes(lancamentos, catPorId, mm))
    historico.push({ mes: mm, valor, ok: bateu(valor) })
  }
  return {
    atual, pct: m.valor > 0 ? (atual / m.valor) * 100 : 0, atingida: bateu(atual), pendente: atual - realizado, historico,
    faltam: teto ? 0 : Math.max(0, m.valor - atual), mesesRestantes: null, porMes: null,
  }
}

/* ---------- Exportação ---------- */

export type Celula = string | number | null | undefined

export function baixarCSV(nome: string, linhas: Celula[][]) {
  const cel = (v: Celula) => (typeof v === 'number' ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : `"${(v ?? '').replace(/"/g, '""')}"`)
  baixarArquivo(nome, '﻿' + linhas.map((l) => l.map(cel).join(';')).join('\r\n'), 'text/csv;charset=utf-8')
}

export const nomeArquivo = (base: string, p: Periodo) => `${base}-${p.preset === 'tudo' ? 'todo-periodo' : `${p.de}-a-${p.ate}`}.csv`

export const pct = (v: number, base: number) => (base ? `${((v / base) * 100).toFixed(1).replace('.', ',')}%` : '')
