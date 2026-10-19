import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Circle, Download, Pencil, Plus, Scale, Search, Trash2 } from 'lucide-react'
import type { Categoria, Lancamento } from '../types'
import { baixarArquivo, formatData, mesDe } from '../utils'
import { IconeCategoria, Valor, useFmt } from '../ui'

interface Props {
  mes: string
  lancamentos: Lancamento[]
  categorias: Categoria[]
  catPorId: Map<string, Categoria>
  onEditar: (l: Lancamento) => void
  onExcluir: (id: string) => void
  onAlternarPago: (id: string) => void
  onNovo: () => void
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const rotuloDia = (data: string) => {
  const [a, m, d] = data.split('-').map(Number)
  const dt = new Date(a, m - 1, d)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} · ${DIAS_SEMANA[dt.getDay()]}`
}

export default function Lancamentos({ mes, lancamentos, categorias, catPorId, onEditar, onExcluir, onAlternarPago, onNovo }: Props) {
  const fmt = useFmt()
  const [tipo, setTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [categoria, setCategoria] = useState('')
  const [status, setStatus] = useState<'todos' | 'pago' | 'pendente'>('todos')
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return lancamentos
      .filter((l) => mesDe(l.data) === mes)
      .filter((l) => tipo === 'todos' || l.tipo === tipo)
      .filter((l) => !categoria || l.categoriaId === categoria)
      .filter((l) => status === 'todos' || (status === 'pago' ? l.pago : !l.pago))
      .filter((l) => !q || l.descricao.toLowerCase().includes(q))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [lancamentos, mes, tipo, categoria, status, busca])

  const grupos = useMemo(() => {
    const g = new Map<string, Lancamento[]>()
    lista.forEach((l) => g.set(l.data, [...(g.get(l.data) ?? []), l]))
    return [...g.entries()]
  }, [lista])

  const entradas = lista.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const saidas = lista.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  const exportarCSV = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const linhas = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Situação'].join(';'),
      ...lista.map((l) =>
        [
          formatData(l.data),
          l.tipo === 'receita' ? 'Receita' : 'Despesa',
          esc(l.descricao),
          esc(catPorId.get(l.categoriaId)?.nome ?? ''),
          (l.tipo === 'receita' ? l.valor : -l.valor).toFixed(2).replace('.', ','),
          l.pago ? 'Pago' : 'Pendente',
        ].join(';'),
      ),
    ]
    baixarArquivo(`lancamentos-${mes}.csv`, '﻿' + linhas.join('\r\n'), 'text/csv;charset=utf-8')
  }

  return (
    <div className="pagina">
      <section className="resumo-3">
        <div className="cartao mini">
          <span className="kpi-icone verde"><ArrowUpRight size={18} /></span>
          <div><span className="kpi-rotulo">Entradas</span><Valor v={entradas} className="mini-valor receita" /></div>
        </div>
        <div className="cartao mini">
          <span className="kpi-icone vermelho"><ArrowDownRight size={18} /></span>
          <div><span className="kpi-rotulo">Saídas</span><Valor v={saidas} className="mini-valor despesa" /></div>
        </div>
        <div className="cartao mini">
          <span className="kpi-icone roxo"><Scale size={18} /></span>
          <div><span className="kpi-rotulo">Balanço</span><Valor v={entradas - saidas} sinal className="mini-valor" /></div>
        </div>
      </section>

      <section className="cartao">
        <div className="filtros">
          <label className="busca">
            <Search size={17} />
            <input type="search" placeholder="Buscar lançamento…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
          </label>
          <div className="segmentado" role="group" aria-label="Tipo">
            {(['todos', 'receita', 'despesa'] as const).map((t) => (
              <button key={t} className={tipo === t ? 'ativo' : ''} onClick={() => setTipo(t)}>
                {t === 'todos' ? 'Todos' : t === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Situação">
            <option value="todos">Qualquer situação</option>
            <option value="pago">Pagos / recebidos</option>
            <option value="pendente">Pendentes</option>
          </select>
          <button className="btn" onClick={exportarCSV} disabled={lista.length === 0}><Download size={16} /> Exportar</button>
        </div>

        {lista.length === 0 ? (
          <div className="vazio-grande">
            <p>Nenhum lançamento encontrado neste mês.</p>
            <button className="btn primario" onClick={onNovo}><Plus size={16} /> Novo lançamento</button>
          </div>
        ) : (
          <div className="grupos">
            {grupos.map(([data, itens]) => {
              const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0)
              return (
                <div key={data} className="grupo">
                  <div className="grupo-cab">
                    <span>{rotuloDia(data)}</span>
                    <span className="num">{fmt(totalDia)}</span>
                  </div>
                  <ul className="lista-mov">
                    {itens.map((l) => {
                      const c = catPorId.get(l.categoriaId)
                      return (
                        <li key={l.id} className={l.pago ? '' : 'pendente'}>
                          <IconeCategoria cat={c} tamanho={40} />
                          <button className="mov-info" onClick={() => onEditar(l)}>
                            <strong>{l.descricao}</strong>
                            <span>{c?.nome ?? '—'}</span>
                          </button>
                          <button className={`pilula-status ${l.pago ? 'pago' : 'aberto'}`} onClick={() => onAlternarPago(l.id)}
                            title="Alternar situação">
                            {l.pago ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                            {l.pago ? (l.tipo === 'despesa' ? 'Pago' : 'Recebido') : 'Pendente'}
                          </button>
                          <span className={`num mov-valor ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}</span>
                          <span className="mov-acoes">
                            <button className="btn-icone pequeno" onClick={() => onEditar(l)} aria-label="Editar"><Pencil size={15} /></button>
                            <button className="btn-icone pequeno perigo" onClick={() => onExcluir(l.id)} aria-label="Excluir"><Trash2 size={15} /></button>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
