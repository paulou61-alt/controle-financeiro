export type Tipo = 'receita' | 'despesa'
import type { TipoPessoa } from './formatos'

export type TipoConta = 'banco' | 'caixa' | 'carteira' | 'cartao'
export type PapelContato = 'cliente' | 'fornecedor' | 'ambos'

export interface Contato {
  id: string
  nome: string
  papel: PapelContato
  pessoa: TipoPessoa
  /** CPF ou CNPJ sem pontuação */
  documento?: string
  email?: string
  /** Somente dígitos, com DDD */
  telefone?: string
  observacoes?: string
}

/** Dados do titular da conta (quem usa o sistema) */
export interface Perfil {
  pessoa: TipoPessoa
  /** Nome completo ou razão social */
  nomeCompleto?: string
  documento?: string
  telefone?: string
}
export type Frequencia = 'semanal' | 'quinzenal' | 'mensal' | 'anual'

/** Linha da DRE em que a categoria entra; "fora" = não afeta o resultado (retiradas, empréstimos, investimentos) */
export type GrupoDre = 'receita' | 'deducao' | 'custo' | 'despesa' | 'receita-financeira' | 'despesa-financeira' | 'imposto' | 'fora'

export interface Categoria {
  id: string
  nome: string
  tipo: Tipo
  cor: string
  /** Sem valor = receita operacional ou despesa operacional */
  dre?: GrupoDre
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
  /** Nome do cliente (receita) ou fornecedor (despesa) */
  contato?: string
  contatoId?: string
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

/**
 * juntar: chegar a um valor até um prazo (progresso pelo saldo de uma conta ou por aportes)
 * receita / resultado: valor mínimo por mês · gastos: valor máximo por mês
 */
export type TipoMeta = 'juntar' | 'receita' | 'resultado' | 'gastos'

export interface Aporte {
  id: string
  data: string
  valor: number
}

export interface Meta {
  id: string
  nome: string
  tipo: TipoMeta
  valor: number
  cor: string
  criadaEm: string
  /** Somente "juntar" */
  prazo?: string
  contaId?: string
  aportes?: Aporte[]
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
  contatos?: Contato[]
  perfil?: Perfil
  metas?: Meta[]
}
