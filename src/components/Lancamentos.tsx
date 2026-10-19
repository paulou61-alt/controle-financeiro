import { useMemo, useState } from 'react'
import type { Categoria, Lancamento } from '../types'
import { baixarArquivo, formatBRL, formatData, mesDe } from '../utils'

interface Props {
  mes: string
  lancamentos: Lancamento[]
  categorias: Categoria[]
  catPorId: Map<string, Categoria>
  onEditar: (l: Lancamento) => void
  onExcluir: (id: string) => void
  onAlternarPago: (id: string) => void
}

export default function Lancamentos({ mes, lancamentos, categorias, catPorId, onEditar, onExcluir, onAlternarPago }: Props) {
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

  const total = lista.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0)

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
    <div className="bloco">
      <div className="filtros">
        <input type="search" placeholder="Buscar descrição…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo">
          <option value="todos">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Situação">
          <option value="todos">Qualquer situação</option>
          <option value="pago">Pagos/recebidos</option>
          <option value="pendente">Pendentes</option>
        </select>
        <button className="btn" onClick={exportarCSV} disabled={lista.length === 0}>Exportar CSV</button>
      </div>

      {lista.length === 0 ? (
        <p className="vazio">Nenhum lançamento encontrado neste mês.</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pago</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="dir">Valor</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const c = catPorId.get(l.categoriaId)
                return (
                  <tr key={l.id} className={l.pago ? '' : 'pendente'}>
                    <td>
                      <input type="checkbox" checked={l.pago} onChange={() => onAlternarPago(l.id)} aria-label="Pago" />
                    </td>
                    <td className="data">{formatData(l.data)}</td>
                    <td>{l.descricao}</td>
                    <td>
                      <span className="tag"><span className="bolinha" style={{ background: c?.cor ?? '#94a3b8' }} />{c?.nome ?? '—'}</span>
                    </td>
                    <td className={`dir num ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{formatBRL(l.valor)}</td>
                    <td className="acoes-linha">
                      <button className="btn pequeno" onClick={() => onEditar(l)}>Editar</button>
                      <button className="btn pequeno perigo" onClick={() => onExcluir(l.id)}>Excluir</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>{lista.length} lançamento(s)</td>
                <td className={`dir num ${total >= 0 ? 'receita' : 'despesa'}`}>{formatBRL(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
