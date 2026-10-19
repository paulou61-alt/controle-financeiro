import type { Categoria, Lancamento } from './types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatBRL = (v: number) => brl.format(v)

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/** "YYYY-MM" */
export const mesDe = (data: string) => data.slice(0, 7)

export const hojeISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

export const mesAtual = () => hojeISO().slice(0, 7)

export const somarMes = (mes: string, delta: number) => {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const nomesMesLongo = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const rotuloMes = (mes: string, longo = false) => {
  const [a, m] = mes.split('-').map(Number)
  return longo ? `${nomesMesLongo[m - 1]} de ${a}` : `${nomesMes[m - 1]}/${String(a).slice(2)}`
}

export const formatData = (data: string) => {
  const [a, m, d] = data.split('-')
  return `${d}/${m}/${a}`
}

export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: 'salario', nome: 'Salário', tipo: 'receita', cor: '#16a34a' },
  { id: 'freelance', nome: 'Freelance', tipo: 'receita', cor: '#0d9488' },
  { id: 'investimentos', nome: 'Investimentos', tipo: 'receita', cor: '#2563eb' },
  { id: 'outras-receitas', nome: 'Outras receitas', tipo: 'receita', cor: '#7c3aed' },
  { id: 'moradia', nome: 'Moradia', tipo: 'despesa', cor: '#dc2626' },
  { id: 'alimentacao', nome: 'Alimentação', tipo: 'despesa', cor: '#ea580c' },
  { id: 'transporte', nome: 'Transporte', tipo: 'despesa', cor: '#ca8a04' },
  { id: 'saude', nome: 'Saúde', tipo: 'despesa', cor: '#db2777' },
  { id: 'educacao', nome: 'Educação', tipo: 'despesa', cor: '#4f46e5' },
  { id: 'lazer', nome: 'Lazer', tipo: 'despesa', cor: '#0891b2' },
  { id: 'contas', nome: 'Contas e serviços', tipo: 'despesa', cor: '#65a30d' },
  { id: 'outras-despesas', nome: 'Outras despesas', tipo: 'despesa', cor: '#64748b' },
]

export function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export const diasNoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

/** Aceita "1.234,56", "1234,56" e "1234.56" */
export const parseValor = (texto: string) => {
  const t = texto.trim()
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
}

export const totaisDoMes = (lancamentos: Lancamento[], mes: string) => {
  let receitas = 0
  let despesas = 0
  for (const l of lancamentos) {
    if (mesDe(l.data) !== mes) continue
    if (l.tipo === 'receita') receitas += l.valor
    else despesas += l.valor
  }
  return { receitas, despesas, saldo: receitas - despesas }
}

export const saldoAte = (lancamentos: Lancamento[], mes: string) =>
  lancamentos.reduce((s, l) => (mesDe(l.data) <= mes ? s + (l.tipo === 'receita' ? l.valor : -l.valor) : s), 0)

export const saudacao = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
