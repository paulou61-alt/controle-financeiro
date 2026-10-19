export type Tipo = 'receita' | 'despesa'

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
  data: string // YYYY-MM-DD
  categoriaId: string
  pago: boolean
}

/** Limite mensal por categoria de despesa (categoriaId -> valor) */
export type Orcamentos = Record<string, number>

export interface Backup {
  versao: 1
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
}
