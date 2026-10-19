export type Tipo = 'receita' | 'despesa'
export type TipoConta = 'banco' | 'caixa' | 'carteira' | 'cartao'
export type Frequencia = 'semanal' | 'quinzenal' | 'mensal' | 'anual'

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
  /** Lançamentos parcelados ou recorrentes compartilham a mesma série */
  serieId?: string
  parcela?: { numero: number; total: number }
  /** Identificador da transação no extrato importado (evita duplicar) */
  importId?: string
}

/** Agrupa parcelas ou ocorrências de um lançamento recorrente */
export interface Serie {
  id: string
  tipo: 'parcelado' | 'recorrente'
  frequencia: Frequencia
  /** Data da última ocorrência já gerada */
  geradoAte: string
  /** Última data da série; null = recorrente sem data de fim */
  fim: string | null
}

export interface ContaFinanceira {
  id: string
  nome: string
  tipo: TipoConta
  saldoInicial: number
  /** O saldo considera apenas movimentações a partir desta data */
  dataSaldoInicial: string
  arquivada?: boolean
  /** Somente cartão de crédito */
  limite?: number
  diaFechamento?: number
  diaVencimento?: number
  /** Conta que normalmente paga a fatura */
  contaPagamentoId?: string
}

/** Movimentação entre contas próprias: não é receita nem despesa */
export interface Transferencia {
  id: string
  origemId: string
  destinoId: string
  valor: number
  data: string
  descricao?: string
  /** Preenchido quando a transferência é o pagamento de uma fatura de cartão */
  fatura?: { cartaoId: string; chave: string }
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
  series?: Serie[]
}
