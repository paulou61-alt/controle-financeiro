import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, CalendarRange, Download, Landmark, Printer, Scale, Tags, Users } from 'lucide-react'
import type { Categoria, ContaFinanceira, Contato, Lancamento, Perfil, Tipo, Transferencia } from '../types'
import { ehCartao, noPeriodo, rotuloPeriodo, saldoConta, somarDias, type Periodo } from '../financas'
import {
  baixarCSV, chaveDe, colunasDoPeriodo, dataNoRegime, movimentos, nomeArquivo, pct, periodoAnterior, type Celula, type Movimento, type Regime,
} from '../analise'
import { formatarDocumento } from '../formatos'
import { DicaGrafico, IconeCategoria, Valor, useFmt, useOculto } from '../ui'
import { CabecalhoImpressao, FiltroConta, FiltroPeriodo, IconeConta, SeletorRegime } from './comuns'

type Relatorio = 'mensal' | 'categorias' | 'contatos' | 'contas'

const RELATORIOS: { id: Relatorio; rotulo: string; titulo: string; icone: typeof Tags }[] = [
  { id: 'mensal', rotulo: 'Mês a mês', titulo: 'Resumo mês a mês', icone: CalendarRange },
  { id: 'categorias', rotulo: 'Categorias', titulo: 'Receitas e despesas por categoria', icone: Tags },
  { id: 'contatos', rotulo: 'Clientes e fornecedores', titulo: 'Clientes e fornecedores', icone: Users },
  { id: 'contas', rotulo: 'Contas', titulo: 'Movimentação por conta', icone: Landmark },
]

interface Props {
  lancamentos: Lancamento[]
  transferencias: Transferencia[]
  contas: ContaFinanceira[]
  catPorId: Map<string, Categoria>
  contatos: Contato[]
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  contaFiltro: string
  setContaFiltro: (id: string) => void
  regime: Regime
  setRegime: (r: Regime) => void
  perfil: Perfil
  nome: string
}

const soma = (ms: Movimento[], t: Tipo) => ms.reduce((s, m) => s + (m.l.tipo === t ? m.l.valor : 0), 0)

/** Variação em relação ao período anterior */
function Variacao({ atual, anterior, inverter = false }: { atual: number; anterior?: number; inverter?: boolean }) {
  if (anterior === undefined) return null
  if (!anterior) return <span className="variacao">{atual ? 'novo' : '–'}</span>
  const d = ((atual - anterior) / Math.abs(anterior)) * 100
  const bom = inverter ? d <= 0 : d >= 0
  return <span className={`variacao ${Math.abs(d) < 0.5 ? '' : bom ? 'bom' : 'ruim'}`}>{d > 0 ? '+' : ''}{d.toFixed(0)}%</span>
}

export default function Relatorios(p: Props) {
  const { lancamentos, transferencias, contas, catPorId, periodo, regime, contaFiltro } = p
  const fmt = useFmt()
  const oculto = useOculto()
  const [rel, setRel] = useState<Relatorio>('mensal')
  const atual = RELATORIOS.find((r) => r.id === rel)!

  const movs = useMemo(() => movimentos(lancamentos, periodo, regime, contaFiltro), [lancamentos, periodo, regime, contaFiltro])
  const anterior = useMemo(() => periodoAnterior(periodo), [periodo])
  const movsAnt = useMemo(() => (anterior ? movimentos(lancamentos, anterior, regime, contaFiltro) : null), [lancamentos, anterior, regime, contaFiltro])
  const receitas = soma(movs, 'receita')
  const despesas = soma(movs, 'despesa')

  /* ---------- Mês a mês ---------- */
  const mensal = useMemo(() => {
    const colunas = colunasDoPeriodo(periodo, lancamentos.map((l) => dataNoRegime(l, regime)).filter((d): d is string => !!d))
    const idx = new Map(colunas.lista.map((c, i) => [c.chave, i]))
    const linhas = colunas.lista.map((c) => ({ rotulo: c.rotulo, Receitas: 0, Despesas: 0, Resultado: 0, Acumulado: 0, qtd: 0 }))
    for (const { l, data } of movs) {
      const r = linhas[idx.get(chaveDe(data, colunas.nivel)) ?? -1]
      if (!r) continue
      if (l.tipo === 'receita') r.Receitas += l.valor
      else r.Despesas += l.valor
      r.qtd++
    }
    let acc = 0
    for (const r of linhas) {
      r.Resultado = Math.round((r.Receitas - r.Despesas) * 100) / 100
      acc += r.Resultado
      r.Acumulado = Math.round(acc * 100) / 100
    }
    return { nivel: colunas.nivel, linhas }
  }, [movs, periodo, lancamentos, regime])

  /* ---------- Categorias ---------- */
  const categorias = useMemo(() => {
    const agrupar = (ms: Movimento[]) => {
      const m = new Map<string, number>()
      for (const { l } of ms) m.set(`${l.tipo}:${l.categoriaId}`, (m.get(`${l.tipo}:${l.categoriaId}`) ?? 0) + l.valor)
      return m
    }
    const agora = agrupar(movs)
    const antes = movsAnt ? agrupar(movsAnt) : null
    const lista = (t: Tipo) =>
      [...new Set([...agora.keys(), ...(antes?.keys() ?? [])])]
        .filter((k) => k.startsWith(`${t}:`))
        .map((k) => {
          const id = k.slice(t.length + 1)
          return { id, cat: catPorId.get(id), nome: catPorId.get(id)?.nome ?? 'Sem categoria', valor: agora.get(k) ?? 0, anterior: antes ? antes.get(k) ?? 0 : undefined }
        })
        .sort((a, b) => b.valor - a.valor)
    return { receita: lista('receita'), despesa: lista('despesa') }
  }, [movs, movsAnt, catPorId])

  /* ---------- Clientes e fornecedores ---------- */
  const porContato = useMemo(() => {
    const porId = new Map(p.contatos.map((c) => [c.id, c]))
    // "em aberto" considera tudo que está pendente com vencimento até o fim do período
    const abertos = lancamentos.filter((l) => !l.pago && l.data <= periodo.ate && (!contaFiltro || l.contaId === contaFiltro))
    const lista = (t: Tipo) => {
      const m = new Map<string, { chave: string; nome: string; contato?: Contato; valor: number; qtd: number; aberto: number }>()
      const pegar = (l: Lancamento) => {
        const chave = l.contatoId ?? l.contato?.trim().toLowerCase() ?? ''
        let r = m.get(chave)
        if (!r) {
          const contato = l.contatoId ? porId.get(l.contatoId) : undefined
          r = { chave, nome: contato?.nome ?? (l.contato?.trim() || 'Sem cliente/fornecedor'), contato, valor: 0, qtd: 0, aberto: 0 }
          m.set(chave, r)
        }
        return r
      }
      for (const { l } of movs) if (l.tipo === t) { const r = pegar(l); r.valor += l.valor; r.qtd++ }
      for (const l of abertos) if (l.tipo === t) pegar(l).aberto += l.valor
      return [...m.values()].sort((a, b) => b.valor - a.valor || b.aberto - a.aberto)
    }
    return { receita: lista('receita'), despesa: lista('despesa') }
  }, [movs, lancamentos, p.contatos, periodo.ate, contaFiltro])

  /* ---------- Contas (sempre pelo caixa) ---------- */
  const porConta = useMemo(() => {
    const tudo = periodo.preset === 'tudo'
    return contas
      .filter((c) => !ehCartao(c) && (!contaFiltro || c.id === contaFiltro))
      .filter((c) => !c.arquivada || lancamentos.some((l) => l.contaId === c.id && l.pago && noPeriodo(l.dataPagamento, periodo)))
      .map((c) => {
        const inicial = tudo ? c.saldoInicial : saldoConta(c, lancamentos, transferencias, somarDias(periodo.de, -1))
        let entradas = 0
        let saidas = 0
        let transfEntrada = 0
        let transfSaida = 0
        for (const l of lancamentos) {
          if (l.contaId !== c.id || !l.pago || !noPeriodo(l.dataPagamento, periodo) || (l.dataPagamento ?? '') < c.dataSaldoInicial) continue
          if (l.tipo === 'receita') entradas += l.valor
          else saidas += l.valor
        }
        for (const t of transferencias) {
          if (!noPeriodo(t.data, periodo) || t.data < c.dataSaldoInicial) continue
          if (t.destinoId === c.id) transfEntrada += t.valor
          if (t.origemId === c.id) transfSaida += t.valor
        }
        const final = tudo ? saldoConta(c, lancamentos, transferencias) : saldoConta(c, lancamentos, transferencias, periodo.ate)
        return { c, inicial, entradas, saidas, transfEntrada, transfSaida, final }
      })
  }, [contas, lancamentos, transferencias, periodo, contaFiltro])

  /* ---------- Exportar ---------- */
  const exportar = () => {
    let linhas: Celula[][] = []
    if (rel === 'mensal')
      linhas = [
        [mensal.nivel === 'ano' ? 'Ano' : 'Mês', 'Receitas', 'Despesas', 'Resultado', 'Margem', 'Acumulado', 'Lançamentos'],
        ...mensal.linhas.map((r) => [r.rotulo, r.Receitas, r.Despesas, r.Resultado, pct(r.Resultado, r.Receitas), r.Acumulado, String(r.qtd)]),
        ['Total', receitas, despesas, receitas - despesas, pct(receitas - despesas, receitas), '', String(movs.length)],
      ]
    if (rel === 'categorias')
      linhas = [
        ['Tipo', 'Categoria', 'Valor', '% do total', ...(anterior ? ['Período anterior', 'Variação'] : [])],
        ...(['receita', 'despesa'] as const).flatMap((t) =>
          categorias[t].map((c): Celula[] => [
            t === 'receita' ? 'Receita' : 'Despesa', c.nome, c.valor, pct(c.valor, t === 'receita' ? receitas : despesas),
            ...(anterior ? [c.anterior ?? 0, c.anterior ? pct(c.valor - c.anterior, Math.abs(c.anterior)) : ''] : []),
          ]),
        ),
      ]
    if (rel === 'contatos')
      linhas = [
        ['Tipo', 'Nome', 'CPF/CNPJ', 'Lançamentos', 'Valor no período', '% do total', 'Em aberto'],
        ...(['receita', 'despesa'] as const).flatMap((t) =>
          porContato[t].map((c): Celula[] => [
            t === 'receita' ? 'Cliente' : 'Fornecedor', c.nome, c.contato ? formatarDocumento(c.contato.documento, c.contato.pessoa) : '',
            String(c.qtd), c.valor, pct(c.valor, t === 'receita' ? receitas : despesas), c.aberto,
          ]),
        ),
      ]
    if (rel === 'contas')
      linhas = [
        ['Conta', 'Saldo inicial', 'Entradas', 'Saídas', 'Transferências recebidas', 'Transferências enviadas', 'Saldo final'],
        ...porConta.map((r) => [r.c.nome, r.inicial, r.entradas, r.saidas, r.transfEntrada, r.transfSaida, r.final]),
      ]
    baixarCSV(nomeArquivo(`relatorio-${rel}`, periodo), linhas)
  }

  const corEixo = { fill: 'var(--texto-3)', fontSize: 12 }
  const eixoValor = oculto
    ? { tick: false as const, width: 8 }
    : { tick: corEixo, width: 64, tickFormatter: (v: number) => v.toLocaleString('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }) }
  const mesesComMov = mensal.linhas.filter((r) => r.qtd > 0).length || 1
  const regimeTexto = rel === 'contas' ? 'pelo caixa' : regime === 'competencia' ? 'por competência' : 'pelo caixa'

  const tabelaCategorias = (t: Tipo) => {
    const total = t === 'receita' ? receitas : despesas
    const lista = categorias[t]
    return (
      <section className="cartao">
        <div className="cartao-cab">
          <h3>{t === 'receita' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />} {t === 'receita' ? 'Receitas' : 'Despesas'} por categoria</h3>
          <strong className={`num ${t}`}>{fmt(total)}</strong>
        </div>
        {lista.length === 0 ? <p className="vazio">Nada no período.</p> : (
          <ul className="ranking">
            {lista.map((c) => (
              <li key={c.id}>
                <IconeCategoria cat={c.cat} tamanho={32} />
                <div className="ranking-info">
                  <div className="lcd-linha"><span>{c.nome}</span><strong className="num">{fmt(c.valor)}</strong></div>
                  <div className="barra fina"><span style={{ width: `${total ? (c.valor / total) * 100 : 0}%`, background: c.cat?.cor ?? 'var(--texto-3)' }} /></div>
                  <div className="ranking-sub">
                    <span>{pct(c.valor, total) || '0%'} do total</span>
                    {anterior && <span>antes {fmt(c.anterior ?? 0)} <Variacao atual={c.valor} anterior={c.anterior} inverter={t === 'despesa'} /></span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  const tabelaContatos = (t: Tipo) => {
    const total = t === 'receita' ? receitas : despesas
    const lista = porContato[t]
    return (
      <section className="cartao">
        <div className="cartao-cab">
          <h3>{t === 'receita' ? 'Clientes' : 'Fornecedores'}</h3>
          <span className="kpi-nota">{lista.length} cadastro(s)</span>
        </div>
        {lista.length === 0 ? <p className="vazio">Nada no período.</p> : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>{t === 'receita' ? 'Cliente' : 'Fornecedor'}</th>
                  <th className="num">{t === 'receita' ? 'Recebido' : 'Pago'} / lançado</th>
                  <th className="num">%</th>
                  <th className="num">Em aberto</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.chave}>
                    <th scope="row">
                      <span className="celula-nome">
                        {c.nome}
                        <small>{[c.contato ? formatarDocumento(c.contato.documento, c.contato.pessoa) : '', `${c.qtd} lançamento(s)`].filter(Boolean).join(' · ')}</small>
                      </span>
                    </th>
                    <td className="num">{fmt(c.valor)}</td>
                    <td className="num av">{pct(c.valor, total)}</td>
                    <td className={`num ${c.aberto ? 'alerta' : ''}`}>{c.aberto ? fmt(c.aberto) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="pagina">
      <CabecalhoImpressao titulo={`Relatório · ${atual.titulo} (${regimeTexto})`} periodo={periodo} perfil={p.perfil} nome={p.nome} />

      <div className="abas-relatorio nao-imprimir" role="tablist" aria-label="Relatórios">
        {RELATORIOS.map((r) => {
          const Icone = r.icone
          return (
            <button key={r.id} role="tab" aria-selected={rel === r.id} className={rel === r.id ? 'ativo' : ''} onClick={() => setRel(r.id)}>
              <Icone size={17} /> {r.rotulo}
            </button>
          )
        })}
      </div>

      <section className="cartao nao-imprimir">
        <div className="filtros sem-margem">
          <FiltroPeriodo periodo={periodo} onChange={p.setPeriodo} />
          <FiltroConta contas={rel === 'contas' ? contas.filter((c) => !ehCartao(c)) : contas} valor={contaFiltro} onChange={p.setContaFiltro} />
          {rel !== 'contas' && <SeletorRegime valor={regime} onChange={p.setRegime} />}
          <div className="acoes-filtro">
            <button className="btn" onClick={exportar}><Download size={16} /> CSV</button>
            <button className="btn" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button>
          </div>
        </div>
      </section>

      {rel !== 'contas' && (
        <section className="resumo-3">
          <div className="cartao mini">
            <span className="kpi-icone verde"><ArrowUpRight size={18} /></span>
            <div><span className="kpi-rotulo">Receitas</span><Valor v={receitas} className="mini-valor receita" /></div>
          </div>
          <div className="cartao mini">
            <span className="kpi-icone vermelho"><ArrowDownRight size={18} /></span>
            <div><span className="kpi-rotulo">Despesas</span><Valor v={despesas} className="mini-valor despesa" /></div>
          </div>
          <div className="cartao mini">
            <span className="kpi-icone roxo"><Scale size={18} /></span>
            <div><span className="kpi-rotulo">Resultado</span><Valor v={receitas - despesas} sinal className="mini-valor" /></div>
          </div>
        </section>
      )}

      {rel === 'mensal' && (
        <>
          {mensal.linhas.length > 1 && <section className="cartao">
            <div className="cartao-cab">
              <h3>Receitas, despesas e resultado acumulado</h3>
              <div className="legenda-inline">
                <span><i style={{ background: 'var(--verde)' }} /> Receitas</span>
                <span><i style={{ background: 'var(--vermelho)' }} /> Despesas</span>
                <span><i style={{ background: 'var(--primaria)' }} /> Acumulado</span>
              </div>
            </div>
            <p className="cartao-sub">{rotuloPeriodo(periodo)} · {regimeTexto}</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={mensal.linhas} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--grade)" />
                <XAxis dataKey="rotulo" tick={corEixo} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} {...eixoValor} />
                <Tooltip content={<DicaGrafico />} cursor={{ fill: 'var(--hover)' }} />
                <Bar dataKey="Receitas" fill="var(--verde)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Despesas" fill="var(--vermelho)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                <Line dataKey="Acumulado" stroke="var(--primaria)" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </section>}
          <section className="cartao">
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>{mensal.nivel === 'ano' ? 'Ano' : 'Mês'}</th>
                    <th className="num">Receitas</th>
                    <th className="num">Despesas</th>
                    <th className="num">Resultado</th>
                    <th className="num">Margem</th>
                    <th className="num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {mensal.linhas.map((r) => (
                    <tr key={r.rotulo}>
                      <th scope="row">{r.rotulo}</th>
                      <td className="num receita">{fmt(r.Receitas)}</td>
                      <td className="num despesa">{fmt(r.Despesas)}</td>
                      <td className={`num ${r.Resultado < 0 ? 'neg' : ''}`}>{fmt(r.Resultado)}</td>
                      <td className="num av">{pct(r.Resultado, r.Receitas)}</td>
                      <td className={`num ${r.Acumulado < 0 ? 'neg' : ''}`}>{fmt(r.Acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className="num">{fmt(receitas)}</td>
                    <td className="num">{fmt(despesas)}</td>
                    <td className={`num ${receitas - despesas < 0 ? 'neg' : ''}`}>{fmt(receitas - despesas)}</td>
                    <td className="num av">{pct(receitas - despesas, receitas)}</td>
                    <td />
                  </tr>
                  {mensal.linhas.length > 1 && (
                    <tr className="media">
                      <th scope="row">Média por {mensal.nivel === 'ano' ? 'ano' : 'mês'}</th>
                      <td className="num">{fmt(receitas / mesesComMov)}</td>
                      <td className="num">{fmt(despesas / mesesComMov)}</td>
                      <td className="num">{fmt((receitas - despesas) / mesesComMov)}</td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {rel === 'categorias' && (
        <>
          {anterior && <p className="kpi-nota nao-imprimir">Comparando com {rotuloPeriodo(anterior)}.</p>}
          <div className="grade-2">
            {tabelaCategorias('despesa')}
            {tabelaCategorias('receita')}
          </div>
        </>
      )}

      {rel === 'contatos' && (
        <div className="grade-2">
          {tabelaContatos('receita')}
          {tabelaContatos('despesa')}
        </div>
      )}

      {rel === 'contas' && (
        <section className="cartao">
          <div className="cartao-cab">
            <h3>Movimentação por conta</h3>
            <span className="kpi-nota">{rotuloPeriodo(periodo)} · valores efetivamente pagos e recebidos</span>
          </div>
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th className="num">Saldo inicial</th>
                  <th className="num">Entradas</th>
                  <th className="num">Saídas</th>
                  <th className="num">Transf. recebidas</th>
                  <th className="num">Transf. enviadas</th>
                  <th className="num">Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {porConta.map((r) => (
                  <tr key={r.c.id}>
                    <th scope="row"><span className="dre-cat"><IconeConta tipo={r.c.tipo} tamanho={24} /> {r.c.nome}</span></th>
                    <td className="num">{fmt(r.inicial)}</td>
                    <td className="num receita">{fmt(r.entradas)}</td>
                    <td className="num despesa">{fmt(r.saidas)}</td>
                    <td className="num">{fmt(r.transfEntrada)}</td>
                    <td className="num">{fmt(r.transfSaida)}</td>
                    <td className={`num forte ${r.final < 0 ? 'neg' : ''}`}>{fmt(r.final)}</td>
                  </tr>
                ))}
              </tbody>
              {porConta.length > 1 && (
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    {(['inicial', 'entradas', 'saidas', 'transfEntrada', 'transfSaida', 'final'] as const).map((k) => (
                      <td key={k} className="num">{fmt(porConta.reduce((s, r) => s + r[k], 0))}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="kpi-nota nota-dre">Cartões de crédito não aparecem aqui: o pagamento da fatura sai como transferência da conta que pagou.</p>
        </section>
      )}
    </div>
  )
}
