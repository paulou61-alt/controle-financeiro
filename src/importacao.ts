import type { Categoria, Lancamento, Tipo } from './types'
import { diasEntre } from './financas'

export interface TransacaoExtrato {
  idExterno: string
  data: string
  descricao: string
  valor: number // positivo = entrada, negativo = saída
}

/* ---------- Leitura de valores e datas ---------- */

/** Aceita "-1.234,56", "1234,56", "1,234.56", "1234.56", "R$ 10,00", "(10,00)" */
export function lerValor(bruto: string): number {
  let s = bruto.trim().replace(/[R$\s]/g, '')
  let negativo = false
  if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1) }
  if (s.endsWith('-')) { negativo = true; s = s.slice(0, -1) }
  if (s.startsWith('-')) { negativo = !negativo; s = s.slice(1) }
  if (s.startsWith('+')) s = s.slice(1)
  const virgula = s.lastIndexOf(',')
  const ponto = s.lastIndexOf('.')
  if (virgula > ponto) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? (negativo ? -n : n) : NaN
}

/** dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa, aaaa-mm-dd ou aaaammdd */
export function lerData(bruto: string): string | null {
  const s = bruto.trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/* ---------- OFX ---------- */

export function lerOFX(texto: string): TransacaoExtrato[] {
  const blocos = texto.split(/<STMTTRN>/i).slice(1)
  const campo = (bloco: string, nome: string) => {
    const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i'))
    return m ? m[1].trim() : ''
  }
  const lista: TransacaoExtrato[] = []
  for (const b of blocos) {
    const data = lerData(campo(b, 'DTPOSTED'))
    const valor = lerValor(campo(b, 'TRNAMT'))
    if (!data || !Number.isFinite(valor) || valor === 0) continue
    const descricao = (campo(b, 'MEMO') || campo(b, 'NAME') || 'Sem descrição').replace(/\s+/g, ' ')
    const fitid = campo(b, 'FITID')
    lista.push({ idExterno: `ofx:${fitid || hash(`${data}|${valor}|${descricao}`)}`, data, descricao, valor })
  }
  return lista
}

/* ---------- CSV ---------- */

export interface CSVLido {
  cabecalho: string[]
  linhas: string[][]
}

function separarLinha(linha: string, sep: string) {
  const out: string[] = []
  let atual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++ } else aspas = !aspas
    } else if (c === sep && !aspas) { out.push(atual.trim()); atual = '' } else atual += c
  }
  out.push(atual.trim())
  return out
}

export function lerCSV(texto: string): CSVLido {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (linhas.length === 0) return { cabecalho: [], linhas: [] }
  const amostra = linhas.slice(0, 5).join('\n')
  const sep = [';', ',', '\t'].sort((a, b) => amostra.split(b).length - amostra.split(a).length)[0]
  const todas = linhas.map((l) => separarLinha(l, sep))
  // se a primeira linha já tem uma data, o arquivo não tem cabeçalho
  const temCabecalho = !todas[0].some((c) => lerData(c))
  const n = Math.max(...todas.map((l) => l.length))
  const cabecalho = temCabecalho ? todas[0] : Array.from({ length: n }, (_, i) => `Coluna ${i + 1}`)
  return { cabecalho, linhas: temCabecalho ? todas.slice(1) : todas }
}

export interface MapaColunas {
  data: number
  descricao: number
  valor: number
  /** opcional: colunas separadas de entrada e saída */
  entrada: number
  saida: number
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function adivinharColunas(csv: CSVLido): MapaColunas {
  const cab = csv.cabecalho.map(normalizar)
  const achar = (...termos: string[]) => cab.findIndex((c) => termos.some((t) => c.includes(t)))
  let data = achar('data', 'date')
  let descricao = achar('descri', 'histor', 'lancamento', 'memo', 'estabelecimento', 'titulo', 'detalhe')
  let valor = achar('valor', 'value', 'amount', 'quantia')
  const entrada = achar('credito', 'entrada')
  const saida = achar('debito', 'saida')
  const amostra = csv.linhas.slice(0, 10)
  if (data < 0) data = cab.findIndex((_, i) => amostra.some((l) => lerData(l[i] ?? '')))
  if (valor < 0 && entrada < 0) valor = cab.findIndex((_, i) => i !== data && amostra.every((l) => !l[i] || Number.isFinite(lerValor(l[i]))) && amostra.some((l) => l[i]))
  if (descricao < 0) descricao = cab.findIndex((_, i) => i !== data && i !== valor && amostra.some((l) => /[a-z]/i.test(l[i] ?? '')))
  return { data, descricao, valor, entrada, saida }
}

export function transacoesDoCSV(csv: CSVLido, mapa: MapaColunas): TransacaoExtrato[] {
  const lista: TransacaoExtrato[] = []
  csv.linhas.forEach((l) => {
    const data = lerData(l[mapa.data] ?? '')
    let valor = mapa.valor >= 0 ? lerValor(l[mapa.valor] ?? '') : NaN
    if (!Number.isFinite(valor) && (mapa.entrada >= 0 || mapa.saida >= 0)) {
      const e = mapa.entrada >= 0 ? lerValor(l[mapa.entrada] || '0') : 0
      const s = mapa.saida >= 0 ? lerValor(l[mapa.saida] || '0') : 0
      valor = (Number.isFinite(e) ? Math.abs(e) : 0) - (Number.isFinite(s) ? Math.abs(s) : 0)
    }
    if (!data || !Number.isFinite(valor) || valor === 0) return
    const descricao = (l[mapa.descricao] ?? '').replace(/\s+/g, ' ').trim() || 'Sem descrição'
    lista.push({ idExterno: `csv:${hash(`${data}|${valor.toFixed(2)}|${descricao}`)}`, data, descricao, valor })
  })
  // transações idênticas no mesmo dia recebem sufixo para não colidirem
  const vistos = new Map<string, number>()
  return lista.map((t) => {
    const n = vistos.get(t.idExterno) ?? 0
    vistos.set(t.idExterno, n + 1)
    return n ? { ...t, idExterno: `${t.idExterno}-${n}` } : t
  })
}

/* ---------- Categoria sugerida ---------- */

const REGRAS: [RegExp, string][] = [
  [/uber|99 ?(pop|app|taxi)|cabify|combust|posto|shell|ipiranga|petrobras|estaciona|pedagio|sem parar|veloe/, 'transporte'],
  [/ifood|rappi|restaurante|lanchonete|padaria|mercado|supermerc|atacad|assai|carrefour|pao de acucar|hortifruti|acougue|burger|pizza|cafe/, 'alimentacao'],
  [/farmacia|drogaria|droga|raia|pague menos|hospital|clinica|laborat|unimed|amil|odonto|medic/, 'saude'],
  [/aluguel|condominio|iptu|imobiliaria/, 'moradia'],
  [/energia|enel|cemig|copel|light|celpe|coelba|sabesp|agua|saneamento|internet|vivo|claro|tim |oi |net |telefon|gas /, 'contas'],
  [/netflix|spotify|disney|hbo|prime video|youtube|cinema|ingresso|steam|playstation|xbox/, 'lazer'],
  [/escola|faculdade|universidade|curso|udemy|alura|livraria|mensalidade/, 'educacao'],
  [/salario|folha|pro.?labore|proventos/, 'salario'],
  [/rendimento|juros|dividendo|resgate|cdb|tesouro/, 'investimentos'],
]

const chaveDescricao = (d: string) => normalizar(d).replace(/[^a-z ]/g, ' ').split(/\s+/).filter((p) => p.length > 2).slice(0, 2).join(' ')

/** Usa o histórico do usuário primeiro; depois regras por palavra-chave */
export function criarSugestor(lancamentos: Lancamento[], categorias: Categoria[]) {
  const historico = new Map<string, Map<string, number>>()
  for (const l of lancamentos) {
    const k = `${l.tipo}|${chaveDescricao(l.descricao)}`
    const m = historico.get(k) ?? new Map<string, number>()
    m.set(l.categoriaId, (m.get(l.categoriaId) ?? 0) + 1)
    historico.set(k, m)
  }
  const existe = (id: string, tipo: Tipo) => categorias.some((c) => c.id === id && c.tipo === tipo)
  const padrao = (tipo: Tipo) =>
    (tipo === 'despesa' ? ['outras-despesas'] : ['outras-receitas']).find((id) => existe(id, tipo)) ?? categorias.find((c) => c.tipo === tipo)?.id ?? ''

  return (descricao: string, tipo: Tipo) => {
    const m = historico.get(`${tipo}|${chaveDescricao(descricao)}`)
    if (m) {
      const [id] = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
      if (existe(id, tipo)) return id
    }
    const d = normalizar(descricao)
    const regra = REGRAS.find(([re, id]) => re.test(d) && existe(id, tipo))
    return regra?.[1] ?? padrao(tipo)
  }
}

/* ---------- Duplicados e conciliação ---------- */

export type AcaoImportacao = 'criar' | 'conciliar' | 'ignorar'

export interface Analise {
  duplicado?: Lancamento
  pendente?: Lancamento
}

/** Duplicado: mesmo id importado, ou mesmo valor e tipo realizado em até 2 dias.
 *  Conciliação: lançamento pendente do mesmo valor e tipo vencendo em até 7 dias. */
export function analisar(t: TransacaoExtrato, contaId: string, lancamentos: Lancamento[], usados: Set<string>): Analise {
  const tipo: Tipo = t.valor >= 0 ? 'receita' : 'despesa'
  const valor = Math.abs(t.valor)
  const daConta = lancamentos.filter((l) => l.contaId === contaId && l.tipo === tipo && Math.abs(l.valor - valor) < 0.005 && !usados.has(l.id))
  const porId = lancamentos.find((l) => l.importId === t.idExterno)
  if (porId) return { duplicado: porId }
  const duplicado = daConta.find((l) => l.pago && l.dataPagamento && Math.abs(diasEntre(l.dataPagamento, t.data)) <= 2)
  if (duplicado) return { duplicado }
  const pendente = daConta
    .filter((l) => !l.pago && Math.abs(diasEntre(l.data, t.data)) <= 7)
    .sort((a, b) => Math.abs(diasEntre(a.data, t.data)) - Math.abs(diasEntre(b.data, t.data)))[0]
  return pendente ? { pendente } : {}
}
