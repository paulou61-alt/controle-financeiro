import type { ContaFinanceira, Frequencia, Lancamento, Serie } from './types'
import { somarDias } from './financas'
import { hojeISO, uid } from './utils'

/** Até onde as recorrências sem fim são geradas à frente */
export const HORIZONTE_DIAS = 365

export const FREQUENCIAS: { id: Frequencia; rotulo: string }[] = [
  { id: 'mensal', rotulo: 'Mensal' },
  { id: 'semanal', rotulo: 'Semanal' },
  { id: 'quinzenal', rotulo: 'Quinzenal' },
  { id: 'anual', rotulo: 'Anual' },
]

export type Repeticao =
  | { modo: 'nenhuma' }
  | { modo: 'parcelado'; vezes: number; valorTotal: boolean }
  | { modo: 'recorrente'; frequencia: Frequencia; vezes: number | null }

const pad = (n: number) => String(n).padStart(2, '0')

/** n-ésima data a partir da base, mantendo o dia original nos meses (31 → último dia do mês) */
export function dataDaOcorrencia(base: string, freq: Frequencia, n: number) {
  if (freq === 'semanal') return somarDias(base, 7 * n)
  if (freq === 'quinzenal') return somarDias(base, 14 * n)
  const [a, m, d] = base.split('-').map(Number)
  const meses = freq === 'anual' ? 12 * n : n
  const alvo = new Date(a, m - 1 + meses, 1)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return `${alvo.getFullYear()}-${pad(alvo.getMonth() + 1)}-${pad(Math.min(d, ultimo))}`
}

/** Compras no cartão são realizadas na data da compra (entram na fatura) */
export function ajustarParaConta(l: Lancamento, conta?: ContaFinanceira): Lancamento {
  if (conta?.tipo !== 'cartao') return l
  return { ...l, tipo: 'despesa', pago: true, dataPagamento: l.data }
}

/** Cria os lançamentos (e a série, se houver) a partir do formulário */
export function criarLancamentos(base: Lancamento, rep: Repeticao, conta?: ContaFinanceira): { lancamentos: Lancamento[]; serie?: Serie } {
  if (rep.modo === 'nenhuma') return { lancamentos: [ajustarParaConta(base, conta)] }
  const serieId = uid()

  if (rep.modo === 'parcelado') {
    const n = Math.max(2, Math.min(120, Math.round(rep.vezes)))
    const centavos = Math.round(base.valor * 100)
    const parcela = rep.valorTotal ? Math.floor(centavos / n) : centavos
    const resto = rep.valorTotal ? centavos - parcela * n : 0
    const lancamentos = Array.from({ length: n }, (_, i) =>
      ajustarParaConta(
        {
          ...base,
          id: i === 0 ? base.id : uid(),
          valor: (parcela + (i === 0 ? resto : 0)) / 100,
          data: dataDaOcorrencia(base.data, 'mensal', i),
          pago: i === 0 ? base.pago : false,
          dataPagamento: i === 0 ? base.dataPagamento : undefined,
          serieId,
          parcela: { numero: i + 1, total: n },
        },
        conta,
      ),
    )
    const fim = lancamentos[n - 1].data
    return { lancamentos, serie: { id: serieId, tipo: 'parcelado', frequencia: 'mensal', geradoAte: fim, fim } }
  }

  const limite = somarDias(hojeISO(), HORIZONTE_DIAS)
  const lancamentos: Lancamento[] = []
  for (let i = 0; ; i++) {
    const data = dataDaOcorrencia(base.data, rep.frequencia, i)
    if (rep.vezes !== null ? i >= rep.vezes : i > 0 && data > limite) break
    lancamentos.push(ajustarParaConta({
      ...base,
      id: i === 0 ? base.id : uid(),
      data,
      pago: i === 0 ? base.pago : false,
      dataPagamento: i === 0 ? base.dataPagamento : undefined,
      serieId,
    }, conta))
    if (i > 600) break
  }
  const ultima = lancamentos[lancamentos.length - 1].data
  return {
    lancamentos,
    serie: { id: serieId, tipo: 'recorrente', frequencia: rep.frequencia, geradoAte: ultima, fim: rep.vezes !== null ? ultima : null },
  }
}

/** Gera novas ocorrências das recorrências sem fim, mantendo sempre ~12 meses à frente */
export function estenderSeries(series: Serie[], lancamentos: Lancamento[], contaPorId: Map<string, ContaFinanceira>) {
  const limite = somarDias(hojeISO(), HORIZONTE_DIAS)
  const novos: Lancamento[] = []
  let mudou = false
  const atualizadas = series.map((s) => {
    if (s.tipo !== 'recorrente' || s.fim !== null || s.geradoAte >= somarDias(hojeISO(), HORIZONTE_DIAS - 45)) return s
    const daSerie = lancamentos.filter((l) => l.serieId === s.id).sort((a, b) => a.data.localeCompare(b.data))
    const modelo = daSerie[daSerie.length - 1]
    if (!modelo) return s
    const primeira = daSerie[0].data
    let ultima = s.geradoAte
    for (let i = 1; i < 800; i++) {
      const data = dataDaOcorrencia(primeira, s.frequencia, i)
      if (data <= s.geradoAte) continue
      if (data > limite) break
      novos.push(ajustarParaConta({ ...modelo, id: uid(), data, pago: false, dataPagamento: undefined, importId: undefined }, contaPorId.get(modelo.contaId)))
      ultima = data
    }
    if (ultima === s.geradoAte) return s
    mudou = true
    return { ...s, geradoAte: ultima }
  })
  return mudou ? { series: atualizadas, novos } : null
}

/* ---------- Edição e exclusão em série ---------- */

export type Escopo = 'este' | 'proximos' | 'todos'

const CAMPOS_PROPAGADOS = ['descricao', 'valor', 'categoriaId', 'contaId', 'contato', 'observacoes'] as const

/** Aplica a edição de um lançamento da série ao escopo escolhido */
export function aplicarEdicao(todos: Lancamento[], original: Lancamento, editado: Lancamento, escopo: Escopo, contaPorId: Map<string, ContaFinanceira>) {
  const alterados = CAMPOS_PROPAGADOS.filter((k) => original[k] !== editado[k])
  return todos.map((l) => {
    if (l.id === editado.id) return editado
    if (escopo === 'este' || !original.serieId || l.serieId !== original.serieId) return l
    if (escopo === 'proximos' && l.data < original.data) return l
    const novo: Lancamento = { ...l }
    for (const k of alterados) (novo as unknown as Record<string, unknown>)[k] = editado[k]
    return ajustarParaConta(novo, contaPorId.get(novo.contaId))
  })
}

/** Remove conforme o escopo; encerra a recorrência quando "este e os próximos" */
export function aplicarExclusao(todos: Lancamento[], series: Serie[], alvo: Lancamento, escopo: Escopo) {
  const sai = (l: Lancamento) =>
    l.id === alvo.id ||
    (escopo !== 'este' && !!alvo.serieId && l.serieId === alvo.serieId && (escopo === 'todos' || l.data >= alvo.data))
  const lancamentos = todos.filter((l) => !sai(l))
  let novasSeries = series
  if (alvo.serieId && escopo !== 'este') {
    const restantes = lancamentos.filter((l) => l.serieId === alvo.serieId).sort((a, b) => a.data.localeCompare(b.data))
    novasSeries = restantes.length === 0
      ? series.filter((s) => s.id !== alvo.serieId)
      : series.map((s) => (s.id === alvo.serieId ? { ...s, fim: restantes[restantes.length - 1].data, geradoAte: restantes[restantes.length - 1].data } : s))
  }
  return { lancamentos, series: novasSeries }
}
