import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Download, Plus, Scale, Search } from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Tipo } from '../types'
import { noPeriodo, situacao, type Periodo, type Situacao } from '../financas'
import { baixarArquivo, formatData } from '../utils'
import { Valor, useFmt } from '../ui'
import { FiltroConta, FiltroPeriodo, LinhaLancamento } from './comuns'

interface Props {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  contas: ContaFinanceira[]
  catPorId: Map<string, Categoria>
  contaPorId: Map<string, ContaFinanceira>
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  contaFiltro: string
  setContaFiltro: (id: string) => void
  onEditar: (l: Lancamento) => void
  onExcluir: (id: string) => void
  onBaixa: (id: string) => void
  onReverter: (id: string) => void
  onNovo: (tipo: Tipo) => void
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const rotuloDia = (data: string) => {
  const [a, m, d] = data.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a} · ${DIAS_SEMANA[new Date(a, m - 1, d).getDay()]}`
}

export default function Lancamentos(p: Props) {
  const { lancamentos, categorias, contas, catPorId, contaPorId, periodo, contaFiltro } = p
  const fmt = useFmt()
  const [tipo, setTipo] = useState<'todos' | Tipo>('todos')
  const [categoria, setCategoria] = useState('')
  const [status, setStatus] = useState<'todos' | Situacao>('todos')
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return lancamentos
      .filter((l) => noPeriodo(l.data, periodo))
      .filter((l) => tipo === 'todos' || l.tipo === tipo)
      .filter((l) => !categoria || l.categoriaId === categoria)
      .filter((l) => !contaFiltro || l.contaId === contaFiltro)
      .filter((l) => status === 'todos' || situacao(l) === status)
      .filter((l) => !q || l.descricao.toLowerCase().includes(q) || (l.contato ?? '').toLowerCase().includes(q))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [lancamentos, periodo, tipo, categoria, contaFiltro, status, busca])

  const grupos = useMemo(() => {
    const g = new Map<string, Lancamento[]>()
    lista.forEach((l) => g.set(l.data, [...(g.get(l.data) ?? []), l]))
    return [...g.entries()]
  }, [lista])

  const entradas = lista.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const saidas = lista.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  const exportarCSV = () => {
    const esc = (s = '') => `"${s.replace(/"/g, '""')}"`
    const rotSit = { realizado: 'Realizado', pendente: 'Pendente', atrasado: 'Atrasado' }
    const linhas = [
      ['Vencimento', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Cliente/Fornecedor', 'Valor', 'Situação', 'Data pagamento/recebimento', 'Observações'].join(';'),
      ...lista.map((l) =>
        [
          formatData(l.data),
          l.tipo === 'receita' ? 'Receita' : 'Despesa',
          esc(l.descricao),
          esc(catPorId.get(l.categoriaId)?.nome),
          esc(contaPorId.get(l.contaId)?.nome),
          esc(l.contato),
          (l.tipo === 'receita' ? l.valor : -l.valor).toFixed(2).replace('.', ','),
          rotSit[situacao(l)],
          l.dataPagamento ? formatData(l.dataPagamento) : '',
          esc(l.observacoes),
        ].join(';'),
      ),
    ]
    baixarArquivo(`lancamentos-${periodo.de}-a-${periodo.ate}.csv`.replace(/0000-01-01-a-9999-12-31/, 'todos'), '﻿' + linhas.join('\r\n'), 'text/csv;charset=utf-8')
  }

  return (
    <div className="pagina">
      <section className="resumo-3">
        <div className="cartao mini">
          <span className="kpi-icone verde"><ArrowUpRight size={18} /></span>
          <div><span className="kpi-rotulo">Receitas</span><Valor v={entradas} className="mini-valor receita" /></div>
        </div>
        <div className="cartao mini">
          <span className="kpi-icone vermelho"><ArrowDownRight size={18} /></span>
          <div><span className="kpi-rotulo">Despesas</span><Valor v={saidas} className="mini-valor despesa" /></div>
        </div>
        <div className="cartao mini">
          <span className="kpi-icone roxo"><Scale size={18} /></span>
          <div><span className="kpi-rotulo">Diferença</span><Valor v={entradas - saidas} sinal className="mini-valor" /></div>
        </div>
      </section>

      <section className="cartao">
        <div className="filtros">
          <label className="busca">
            <Search size={17} />
            <input type="search" placeholder="Buscar por descrição ou cliente/fornecedor…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
          </label>
          <div className="segmentado" role="group" aria-label="Tipo">
            {(['todos', 'receita', 'despesa'] as const).map((t) => (
              <button key={t} className={tipo === t ? 'ativo' : ''} onClick={() => setTipo(t)}>
                {t === 'todos' ? 'Todos' : t === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>
        <div className="filtros">
          <FiltroPeriodo periodo={periodo} onChange={p.setPeriodo} rotulo="Período (vencimento)" />
          <FiltroConta contas={contas} valor={contaFiltro} onChange={p.setContaFiltro} />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Situação">
            <option value="todos">Qualquer situação</option>
            <option value="pendente">Pendentes</option>
            <option value="atrasado">Atrasados</option>
            <option value="realizado">Pagos / recebidos</option>
          </select>
          <button className="btn" onClick={exportarCSV} disabled={lista.length === 0}><Download size={16} /> Exportar</button>
        </div>

        {lista.length === 0 ? (
          <div className="vazio-grande">
            <p>Nenhum lançamento encontrado com esses filtros.</p>
            <div className="acoes-esq">
              <button className="btn acao-receita" onClick={() => p.onNovo('receita')}><Plus size={16} /> Nova receita</button>
              <button className="btn acao-despesa" onClick={() => p.onNovo('despesa')}><Plus size={16} /> Nova despesa</button>
            </div>
          </div>
        ) : (
          <div className="grupos">
            {grupos.map(([data, itens]) => (
              <div key={data} className="grupo">
                <div className="grupo-cab">
                  <span>Vencimento {rotuloDia(data)}</span>
                  <span className="num">{fmt(itens.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0))}</span>
                </div>
                <ul className="lista-mov">
                  {itens.map((l) => (
                    <LinhaLancamento key={l.id} l={l} cat={catPorId.get(l.categoriaId)} conta={contaPorId.get(l.contaId)}
                      onBaixa={p.onBaixa} onReverter={p.onReverter} onEditar={p.onEditar} onExcluir={p.onExcluir} />
                  ))}
                </ul>
              </div>
            ))}
            <p className="rodape-lista">{lista.length} lançamento(s)</p>
          </div>
        )}
      </section>
    </div>
  )
}
