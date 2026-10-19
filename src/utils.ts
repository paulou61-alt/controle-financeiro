import type { Categoria, Lancamento, Orcamentos } from './types'

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

/** Dados fictícios dos últimos 6 meses para demonstrar o sistema */
export function gerarExemplo(): { lancamentos: Lancamento[]; orcamentos: Orcamentos } {
  let semente = 20261019
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647
  const hoje = hojeISO()
  const atual = mesAtual()
  const ls: Lancamento[] = []
  const add = (mes: string, dia: number, tipo: Lancamento['tipo'], descricao: string, valor: number, categoriaId: string) => {
    const d = Math.max(1, Math.min(Math.round(dia), diasNoMes(mes)))
    const data = `${mes}-${String(d).padStart(2, '0')}`
    ls.push({ id: uid(), tipo, descricao, valor: Math.round(valor * 100) / 100, data, categoriaId, pago: data <= hoje })
  }

  for (let i = -6; i <= 0; i++) {
    const m = somarMes(atual, i)
    add(m, 5, 'receita', 'Salário', 6800, 'salario')
    if (rnd() > 0.35) add(m, 12 + rnd() * 10, 'receita', 'Projeto freelance', 900 + rnd() * 1600, 'freelance')
    add(m, 20, 'receita', 'Rendimentos', 60 + rnd() * 120, 'investimentos')
    add(m, 10, 'despesa', 'Aluguel', 1850, 'moradia')
    add(m, 10, 'despesa', 'Condomínio', 420, 'moradia')
    add(m, 15, 'despesa', 'Energia elétrica', 140 + rnd() * 90, 'contas')
    add(m, 22, 'despesa', 'Internet e celular', 179.9, 'contas')
    add(m, 8, 'despesa', 'Streaming', 55.9, 'lazer')
    add(m, 20, 'despesa', 'Plano de saúde', 389, 'saude')
    add(m, 7, 'despesa', 'Curso online', 97, 'educacao')
    for (let k = 0; k < 4; k++) add(m, 3 + k * 7 + rnd() * 3, 'despesa', k % 2 ? 'Feira' : 'Supermercado', 180 + rnd() * 320, 'alimentacao')
    ;['iFood', 'Restaurante', 'Padaria'].forEach((d, k) => add(m, 2 + k * 9 + rnd() * 5, 'despesa', d, 40 + rnd() * 110, 'alimentacao'))
    ;['Combustível', 'Uber', 'Estacionamento'].forEach((d, k) => add(m, 4 + k * 8 + rnd() * 4, 'despesa', d, 30 + rnd() * 220, 'transporte'))
    if (rnd() > 0.3) add(m, 13 + rnd() * 12, 'despesa', rnd() > 0.5 ? 'Cinema' : 'Bar com amigos', 80 + rnd() * 200, 'lazer')
    if (rnd() > 0.4) add(m, 9 + rnd() * 15, 'despesa', 'Farmácia', 40 + rnd() * 160, 'saude')
    if (rnd() > 0.6) add(m, 16 + rnd() * 10, 'despesa', 'Presente de aniversário', 120 + rnd() * 180, 'outras-despesas')
  }

  // uma conta do mês atual fica em aberto para mostrar o alerta de vencimento
  const energia = ls.find((l) => l.descricao === 'Energia elétrica' && mesDe(l.data) === atual && l.data <= hoje)
  if (energia) energia.pago = false

  return {
    lancamentos: ls,
    orcamentos: { alimentacao: 1700, transporte: 500, lazer: 400, contas: 380, saude: 550 },
  }
}
