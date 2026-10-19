export type Tipo = 'receita' | 'despesa'
export type TipoConta = 'banco' | 'caixa' | 'carteira'

export interface Categoria {
  id: string
  nome: string
  tipo: Tipo
  cor: string
}

export interface Lancamento {
  id: string
  tipo: Tipo
  descricao: string
  valor: number
  /** Data de vencimento (YYYY-MM-DD) */
  data: string
  categoriaId: string
  contaId: string
  /** true = realizado (pago ou recebido) */
  pago: boolean
  /** Data em que foi pago ou recebido, quando realizado */
  dataPagamento?: string
  /** Cliente (receita) ou fornecedor (despesa) */
  contato?: string
  observacoes?: string
}

export interface ContaFinanceira {
  id: string
  nome: string
  tipo: TipoConta
  saldoInicial: number
  /** O saldo considera apenas movimentações a partir desta data */
  dataSaldoInicial: string
  arquivada?: boolean
}

/** Movimentação entre contas próprias: não é receita nem despesa */
export interface Transferencia {
  id: string
  origemId: string
  destinoId: string
  valor: number
  data: string
  descricao?: string
}

/** Limite mensal por categoria de despesa (categoriaId -> valor) */
export type Orcamentos = Record<string, number>

export interface Backup {
  versao: 1 | 2
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
  contas?: ContaFinanceira[]
  transferencias?: Transferencia[]
}
