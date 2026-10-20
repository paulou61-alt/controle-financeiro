import type { ContaFinanceira, Lancamento, Meta, Orcamentos, Serie, Transferencia } from './types'
import { diasNoMes, hojeISO, mesAtual, mesDe, somarMes, uid } from './utils'
import { faturasDoCartao } from './financas'
import { dataDaOcorrencia } from './series'

/** Dados fictícios dos últimos 6 meses (e alguns futuros) para demonstrar o sistema */
export function gerarExemplo(): {
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
  contas: ContaFinanceira[]
  transferencias: Transferencia[]
  series: Serie[]
  metas: Meta[]
} {
  let semente = 20261019
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647
  const hoje = hojeISO()
  const atual = mesAtual()
  const inicio = `${somarMes(atual, -6)}-01`

  const contas: ContaFinanceira[] = [
    { id: 'banco-exemplo', nome: 'Banco Digital', tipo: 'banco', saldoInicial: 4200, dataSaldoInicial: inicio },
    { id: 'caixa-exemplo', nome: 'Caixa da loja', tipo: 'caixa', saldoInicial: 350, dataSaldoInicial: inicio },
    { id: 'carteira-exemplo', nome: 'Carteira digital', tipo: 'carteira', saldoInicial: 0, dataSaldoInicial: inicio },
    { id: 'cartao-exemplo', nome: 'Cartão Roxo', tipo: 'cartao', saldoInicial: 0, dataSaldoInicial: inicio, limite: 8000, diaFechamento: 3, diaVencimento: 10, contaPagamentoId: 'banco-exemplo' },
  ]
  const [banco, caixa, carteira, cartao] = contas.map((c) => c.id)
  const aluguelSerie = uid()
  const notebookSerie = uid()

  const ls: Lancamento[] = []
  const transferencias: Transferencia[] = []
  const dataDe = (mes: string, dia: number) => `${mes}-${String(Math.max(1, Math.min(Math.round(dia), diasNoMes(mes)))).padStart(2, '0')}`
  const add = (
    mes: string, dia: number, tipo: Lancamento['tipo'], descricao: string, valor: number,
    categoriaId: string, contaId: string, contato?: string,
  ) => {
    const data = dataDe(mes, dia)
    // compras no cartão são realizadas na data da compra
    const pago = contaId === cartao || data <= hoje
    ls.push({ id: uid(), tipo, descricao, valor: Math.round(valor * 100) / 100, data, categoriaId, contaId, pago, dataPagamento: pago ? data : undefined, contato })
    return ls[ls.length - 1]
  }

  for (let i = -6; i <= 1; i++) {
    const m = somarMes(atual, i)
    add(m, 5, 'receita', 'Pró-labore', 6800, 'salario', banco)
    add(m, 12 + rnd() * 10, 'receita', 'Projeto de identidade visual', 900 + rnd() * 1600, 'freelance', carteira, rnd() > 0.5 ? 'Studio Alfa' : 'Padaria Bom Pão')
    add(m, 18 + rnd() * 6, 'receita', 'Vendas no balcão', 600 + rnd() * 500, 'outras-receitas', caixa)
    add(m, 20, 'receita', 'Rendimentos', 60 + rnd() * 120, 'investimentos', banco)
    add(m, 10, 'despesa', 'Aluguel da sala', 1850, 'moradia', banco, 'Imobiliária Central').serieId = aluguelSerie
    add(m, 10, 'despesa', 'Condomínio', 420, 'moradia', banco)
    add(m, 15, 'despesa', 'Energia elétrica', 140 + rnd() * 90, 'contas', banco, 'Companhia de Energia')
    add(m, 22, 'despesa', 'Internet e celular', 179.9, 'contas', banco, 'Operadora Fibra')
    add(m, 8, 'despesa', 'Assinaturas de software', 55.9, 'lazer', cartao)
    if (m <= atual) {
      add(m, 12 + rnd() * 12, 'despesa', 'Restaurante', 80 + rnd() * 140, 'alimentacao', cartao)
      add(m, 2 + rnd() * 20, 'despesa', 'Compras online', 60 + rnd() * 260, 'outras-despesas', cartao)
    }
    add(m, 20, 'despesa', 'Plano de saúde', 389, 'saude', banco)
    add(m, 7, 'despesa', 'Curso online', 97, 'educacao', carteira)
    for (let k = 0; k < 3; k++) add(m, 3 + k * 9 + rnd() * 3, 'despesa', 'Supermercado', 180 + rnd() * 320, 'alimentacao', banco)
    ;['Padaria', 'Feira'].forEach((d, k) => add(m, 6 + k * 12 + rnd() * 4, 'despesa', d, 40 + rnd() * 110, 'alimentacao', caixa))
    ;['Combustível', 'Aplicativo de transporte'].forEach((d, k) => add(m, 4 + k * 10 + rnd() * 4, 'despesa', d, 60 + rnd() * 200, 'transporte', k ? carteira : banco))
    if (rnd() > 0.4) add(m, 9 + rnd() * 15, 'despesa', 'Farmácia', 40 + rnd() * 160, 'saude', banco)
    if (rnd() > 0.5) add(m, 16 + rnd() * 10, 'despesa', 'Material de escritório', 90 + rnd() * 180, 'outras-despesas', caixa, 'Papelaria Central')
    // transferências entre contas próprias
    const t1 = dataDe(m, 25)
    if (t1 <= hoje) transferencias.push({ id: uid(), origemId: carteira, destinoId: banco, valor: 800, data: t1, descricao: 'Resgate da carteira digital' })
    const t2 = dataDe(m, 28)
    if (t2 <= hoje) transferencias.push({ id: uid(), origemId: caixa, destinoId: banco, valor: 500, data: t2, descricao: 'Depósito do caixa' })
  }

  // notebook em 10x no cartão, começando 3 meses atrás
  for (let i = 0; i < 10; i++) {
    const data = dataDaOcorrencia(`${somarMes(atual, -3)}-15`, 'mensal', i)
    ls.push({ id: uid(), tipo: 'despesa', descricao: 'Notebook', valor: 450, data, categoriaId: 'educacao', contaId: cartao, pago: true, dataPagamento: data, serieId: notebookSerie, parcela: { numero: i + 1, total: 10 }, contato: 'Loja Tech' })
  }
  // faturas já vencidas foram pagas pelo banco
  for (const f of faturasDoCartao(contas[3], ls, [])) {
    if (f.vencimento < hoje && f.total > 0)
      transferencias.push({ id: uid(), origemId: banco, destinoId: cartao, valor: f.total, data: f.vencimento, descricao: `Pagamento da fatura Cartão Roxo`, fatura: { cartaoId: cartao, chave: f.chave } })
  }
  const alugueis = ls.filter((l) => l.serieId === aluguelSerie).sort((a, b) => a.data.localeCompare(b.data))
  const notebooks = ls.filter((l) => l.serieId === notebookSerie)
  const series: Serie[] = [
    { id: aluguelSerie, tipo: 'recorrente', frequencia: 'mensal', geradoAte: alugueis[alugueis.length - 1].data, fim: null },
    { id: notebookSerie, tipo: 'parcelado', frequencia: 'mensal', geradoAte: notebooks[9].data, fim: notebooks[9].data },
  ]

  // contas em atraso para demonstrar alertas
  const luz = ls.find((l) => l.descricao === 'Energia elétrica' && mesDe(l.data) === atual && l.data < hoje)
  if (luz) Object.assign(luz, { pago: false, dataPagamento: undefined })
  const cliente = ls.find((l) => l.descricao === 'Projeto de identidade visual' && mesDe(l.data) === atual && l.data < hoje)
  if (cliente) Object.assign(cliente, { pago: false, dataPagamento: undefined, observacoes: 'Cliente pediu mais alguns dias para pagar.' })

  return {
    contas,
    transferencias,
    series,
    lancamentos: ls,
    orcamentos: { alimentacao: 1700, transporte: 500, lazer: 400, contas: 380, saude: 550 },
    metas: [
      {
        id: 'meta-reserva-exemplo', nome: 'Reserva de emergência', tipo: 'juntar', valor: 30000, cor: '#12b76a', criadaEm: inicio,
        prazo: `${somarMes(atual, 14)}-01`,
        aportes: [0, 1, 2, 3, 4, 5].map((i) => ({ id: uid(), data: dataDe(somarMes(atual, i - 5), 6), valor: i === 0 ? 6000 : 900 + Math.round(rnd() * 6) * 100 })),
      },
      { id: 'meta-receita-exemplo', nome: 'Faturar R$ 10 mil por mês', tipo: 'receita', valor: 10000, cor: '#059669', criadaEm: inicio },
      { id: 'meta-gastos-exemplo', nome: 'Gastos abaixo de R$ 7.500', tipo: 'gastos', valor: 7500, cor: '#f59e0b', criadaEm: inicio },
    ],
  }
}
