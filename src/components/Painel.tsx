import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Categoria, Lancamento, Orcamentos } from '../types'
import { formatBRL, formatData, mesDe, rotuloMes, somarMes } from '../utils'

interface Props {
  mes: string
  lancamentos: Lancamento[]
  catPorId: Map<string, Categoria>
  orcamentos: Orcamentos
  onAlternarPago: (id: string) => void
  onEditar: (l: Lancamento) => void
}

export default function Painel({ mes, lancamentos, catPorId, orcamentos, onAlternarPago, onEditar }: Props) {
  const doMes = useMemo(() => lancamentos.filter((l) => mesDe(l.data) === mes), [lancamentos, mes])

  const receitas = doMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesas = doMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const saldoMes = receitas - despesas
  const acumulado = lancamentos
    .filter((l) => mesDe(l.data) <= mes)
    .reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0)

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    doMes.filter((l) => l.tipo === 'despesa').forEach((l) => mapa.set(l.categoriaId, (mapa.get(l.categoriaId) ?? 0) + l.valor))
    return [...mapa.entries()]
      .map(([id, valor]) => ({ id, nome: catPorId.get(id)?.nome ?? 'Sem categoria', cor: catPorId.get(id)?.cor ?? '#94a3b8', valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [doMes, catPorId])

  const historico = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => somarMes(mes, i - 5)).map((m) => {
      const ls = lancamentos.filter((l) => mesDe(l.data) === m)
      return {
        mes: rotuloMes(m),
        Receitas: ls.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
        Despesas: ls.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
      }
    })
  }, [lancamentos, mes])

  const pendentes = doMes.filter((l) => !l.pago).sort((a, b) => a.data.localeCompare(b.data))

  const estourados = Object.entries(orcamentos)
    .map(([id, limite]) => ({
      cat: catPorId.get(id),
      limite,
      gasto: doMes.filter((l) => l.tipo === 'despesa' && l.categoriaId === id).reduce((s, l) => s + l.valor, 0),
    }))
    .filter((o) => o.cat && o.limite > 0 && o.gasto > o.limite)

  return (
    <div className="painel">
      <section className="cards">
        <div className="card">
          <span className="rotulo">Receitas</span>
          <strong className="valor receita">{formatBRL(receitas)}</strong>
        </div>
        <div className="card">
          <span className="rotulo">Despesas</span>
          <strong className="valor despesa">{formatBRL(despesas)}</strong>
        </div>
        <div className="card">
          <span className="rotulo">Saldo do mês</span>
          <strong className={`valor ${saldoMes >= 0 ? 'receita' : 'despesa'}`}>{formatBRL(saldoMes)}</strong>
        </div>
        <div className="card">
          <span className="rotulo">Saldo acumulado</span>
          <strong className={`valor ${acumulado >= 0 ? '' : 'despesa'}`}>{formatBRL(acumulado)}</strong>
        </div>
      </section>

      {estourados.length > 0 && (
        <div className="alerta" role="status">
          <strong>Orçamento estourado:</strong>{' '}
          {estourados.map((o) => `${o.cat!.nome} (${formatBRL(o.gasto)} de ${formatBRL(o.limite)})`).join(' · ')}
        </div>
      )}

      <section className="graficos">
        <div className="bloco">
          <h3>Despesas por categoria</h3>
          {porCategoria.length === 0 ? (
            <p className="vazio">Nenhuma despesa neste mês.</p>
          ) : (
            <div className="pizza">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="valor" nameKey="nome" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none">
                    {porCategoria.map((c) => <Cell key={c.id} fill={c.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="legenda">
                {porCategoria.map((c) => (
                  <li key={c.id}>
                    <span className="bolinha" style={{ background: c.cor }} />
                    <span className="nome">{c.nome}</span>
                    <span className="num">{formatBRL(c.valor)}</span>
                    <span className="pct">{((c.valor / despesas) * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bloco">
          <h3>Últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={historico} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--borda)" />
              <XAxis dataKey="mes" tick={{ fill: 'var(--texto-2)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--texto-2)', fontSize: 12 }} axisLine={false} tickLine={false} width={70}
                tickFormatter={(v: number) => v.toLocaleString('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' })} />
              <Tooltip formatter={(v: number) => formatBRL(v)} cursor={{ fill: 'var(--hover)' }} />
              <Legend />
              <Bar dataKey="Receitas" fill="var(--verde)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="var(--vermelho)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bloco">
        <h3>Pendentes no mês ({pendentes.length})</h3>
        {pendentes.length === 0 ? (
          <p className="vazio">Tudo pago e recebido. 🎉</p>
        ) : (
          <ul className="lista-pendentes">
            {pendentes.map((l) => (
              <li key={l.id}>
                <input type="checkbox" checked={false} onChange={() => onAlternarPago(l.id)}
                  aria-label={`Marcar ${l.descricao} como ${l.tipo === 'despesa' ? 'paga' : 'recebida'}`} />
                <button className="link-texto" onClick={() => onEditar(l)}>{l.descricao}</button>
                <span className="data">{formatData(l.data)}</span>
                <span className={`num ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{formatBRL(l.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
