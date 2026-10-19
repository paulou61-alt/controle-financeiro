import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, Lightbulb, PiggyBank,
  Plus, Sparkles, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'
import type { Categoria, Lancamento, Orcamentos } from '../types'
import {
  diasNoMes, formatData, hojeISO, mesAtual, mesDe, rotuloMes, saldoAte, somarMes, totaisDoMes,
} from '../utils'
import { Anel, DicaGrafico, IconeCategoria, Valor, useFmt, useOculto } from '../ui'

interface Props {
  mes: string
  lancamentos: Lancamento[]
  catPorId: Map<string, Categoria>
  orcamentos: Orcamentos
  onAlternarPago: (id: string) => void
  onEditar: (l: Lancamento) => void
  onNovo: () => void
  onVerTodos: () => void
  onCarregarExemplo: () => void
}

const variacao = (atual: number, anterior: number) => (anterior > 0 ? ((atual - anterior) / anterior) * 100 : null)

function Delta({ pct, inverter = false, mesAnterior }: { pct: number | null; inverter?: boolean; mesAnterior: string }) {
  if (pct === null) return <span className="delta neutro">sem histórico</span>
  const subiu = pct >= 0
  const bom = inverter ? !subiu : subiu
  const Icone = subiu ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`delta ${bom ? 'bom' : 'ruim'}`}>
      <Icone size={14} strokeWidth={2.5} />
      {Math.abs(pct).toFixed(0)}% <em>vs {rotuloMes(mesAnterior)}</em>
    </span>
  )
}

function Faisca({ dados, cor, id }: { dados: number[]; cor: string; id: string }) {
  return (
    <div className="faisca">
      <ResponsiveContainer width="100%" height={44}>
        <AreaChart data={dados.map((v, i) => ({ i, v }))} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={cor} strokeWidth={2} fill={`url(#${id})`} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard(p: Props) {
  const { mes, lancamentos, catPorId, orcamentos } = p
  const fmt = useFmt()
  const oculto = useOculto()
  const hoje = hojeISO()
  const mesAnt = somarMes(mes, -1)

  const atual = useMemo(() => totaisDoMes(lancamentos, mes), [lancamentos, mes])
  const anterior = useMemo(() => totaisDoMes(lancamentos, mesAnt), [lancamentos, mesAnt])
  const saldoTotal = useMemo(() => saldoAte(lancamentos, mes), [lancamentos, mes])
  const doMes = useMemo(() => lancamentos.filter((l) => mesDe(l.data) === mes), [lancamentos, mes])

  const serie = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => somarMes(mes, i - 11)).map((m) => {
        const t = totaisDoMes(lancamentos, m)
        return { mes: rotuloMes(m), Receitas: t.receitas, Despesas: t.despesas, Saldo: saldoAte(lancamentos, m) }
      }),
    [lancamentos, mes],
  )
  const ultimos6 = serie.slice(-6)

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    doMes.filter((l) => l.tipo === 'despesa').forEach((l) => mapa.set(l.categoriaId, (mapa.get(l.categoriaId) ?? 0) + l.valor))
    return [...mapa.entries()]
      .map(([id, valor]) => ({ id, cat: catPorId.get(id), name: catPorId.get(id)?.nome ?? 'Sem categoria', cor: catPorId.get(id)?.cor ?? '#94a3b8', valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [doMes, catPorId])

  const ritmo = useMemo(() => {
    const dias = Math.max(diasNoMes(mes), diasNoMes(mesAnt))
    const ate = mes === mesAtual() ? Number(hoje.slice(8)) : mes < mesAtual() ? diasNoMes(mes) : 0
    const acumular = (m: string) => {
      const porDia = new Array(dias + 1).fill(0)
      lancamentos.forEach((l) => {
        if (l.tipo === 'despesa' && mesDe(l.data) === m) porDia[Number(l.data.slice(8))] += l.valor
      })
      let s = 0
      return porDia.map((v) => (s += v))
    }
    const a = acumular(mes)
    const b = acumular(mesAnt)
    return Array.from({ length: dias }, (_, i) => ({
      dia: i + 1,
      'Este mês': i + 1 <= ate ? a[i + 1] : undefined,
      'Mês anterior': i + 1 <= diasNoMes(mesAnt) ? b[i + 1] : undefined,
    }))
  }, [lancamentos, mes, mesAnt, hoje])

  const pendentes = doMes.filter((l) => !l.pago).sort((a, b) => a.data.localeCompare(b.data))
  const aPagar = pendentes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const aReceber = pendentes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const vencidas = pendentes.filter((l) => l.tipo === 'despesa' && l.data < hoje)

  const listaOrc = Object.entries(orcamentos)
    .map(([id, limite]) => {
      const gasto = doMes.filter((l) => l.tipo === 'despesa' && l.categoriaId === id).reduce((s, l) => s + l.valor, 0)
      return { id, cat: catPorId.get(id), limite, gasto, pct: limite > 0 ? (gasto / limite) * 100 : 0 }
    })
    .filter((o) => o.cat && o.limite > 0)
    .sort((a, b) => b.pct - a.pct)

  const maiores = doMes.filter((l) => l.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 5)

  const taxa = atual.receitas > 0 ? (atual.saldo / atual.receitas) * 100 : 0
  const varDesp = variacao(atual.despesas, anterior.despesas)

  const insights: { tom: 'bom' | 'ruim' | 'info'; texto: string }[] = []
  if (atual.receitas > 0 || atual.despesas > 0) {
    if (atual.saldo < 0) insights.push({ tom: 'ruim', texto: 'Você gastou mais do que recebeu neste mês.' })
    else if (taxa >= 20) insights.push({ tom: 'bom', texto: `Excelente! Você está guardando ${taxa.toFixed(0)}% da sua renda.` })
    else if (atual.receitas > 0) insights.push({ tom: 'info', texto: `Você guardou ${taxa.toFixed(0)}% da renda. A meta saudável é 20%.` })
  }
  if (varDesp !== null && Math.abs(varDesp) >= 3)
    insights.push({
      tom: varDesp < 0 ? 'bom' : 'ruim',
      texto: `Seus gastos ${varDesp < 0 ? 'caíram' : 'subiram'} ${Math.abs(varDesp).toFixed(0)}% em relação a ${rotuloMes(mesAnt, true).split(' ')[0].toLowerCase()}.`,
    })
  if (porCategoria[0] && atual.despesas > 0)
    insights.push({ tom: 'info', texto: `${porCategoria[0].name} é sua maior despesa: ${((porCategoria[0].valor / atual.despesas) * 100).toFixed(0)}% do total.` })
  const estourados = listaOrc.filter((o) => o.pct > 100)
  if (estourados.length)
    insights.push({ tom: 'ruim', texto: `Orçamento estourado em ${estourados.map((o) => o.cat!.nome).join(', ')}.` })
  if (vencidas.length) insights.push({ tom: 'ruim', texto: `Você tem ${vencidas.length} conta(s) vencida(s) aguardando pagamento.` })

  if (lancamentos.length === 0) {
    return (
      <div className="boas-vindas">
        <div className="bv-brilho" aria-hidden="true" />
        <span className="bv-icone"><Sparkles size={30} /></span>
        <h2>Seu painel financeiro começa aqui</h2>
        <p>Registre suas receitas e despesas e acompanhe tudo em gráficos, metas e alertas inteligentes.</p>
        <div className="bv-acoes">
          <button className="btn primario grande" onClick={p.onNovo}><Plus size={18} /> Adicionar primeiro lançamento</button>
          <button className="btn grande" onClick={p.onCarregarExemplo}><Sparkles size={18} /> Explorar com dados de exemplo</button>
        </div>
      </div>
    )
  }

  const corEixo = { fill: 'var(--texto-3)', fontSize: 12 }
  const eixoValor = oculto
    ? { tick: false as const, width: 8 }
    : {
        tick: corEixo,
        width: 64,
        tickFormatter: (v: number) => v.toLocaleString('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }),
      }

  return (
    <div className="dash">
      {/* Saldo principal */}
      <section className="heroi c8">
        <div className="heroi-fundo" aria-hidden="true" />
        <div className="heroi-texto">
          <span className="heroi-rotulo"><Wallet size={16} /> Saldo total</span>
          <Valor v={saldoTotal} className="heroi-valor" />
          <span className="heroi-sub">
            Resultado de {rotuloMes(mes, true).split(' ')[0].toLowerCase()}: <Valor v={atual.saldo} sinal />
          </span>
          <div className="heroi-pilulas">
            <span><ArrowUpRight size={15} /> Entradas <Valor v={atual.receitas} /></span>
            <span><ArrowDownRight size={15} /> Saídas <Valor v={atual.despesas} /></span>
          </div>
        </div>
        <div className="heroi-grafico">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gHeroi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" hide />
              <Tooltip content={<DicaGrafico />} cursor={{ stroke: 'rgba(255,255,255,.4)' }} />
              <Area type="monotone" dataKey="Saldo" stroke="#fff" strokeWidth={2.5} fill="url(#gHeroi)" />
            </AreaChart>
          </ResponsiveContainer>
          <span className="heroi-legenda">Evolução do saldo · 12 meses</span>
        </div>
      </section>

      {/* Insights */}
      <section className="cartao c4 insights">
        <h3><Lightbulb size={18} /> Insights do mês</h3>
        {insights.length === 0 ? (
          <p className="vazio">Adicione lançamentos neste mês para ver análises.</p>
        ) : (
          <ul>
            {insights.slice(0, 4).map((i, k) => (
              <li key={k} className={i.tom}>
                {i.tom === 'bom' ? <TrendingUp size={16} /> : i.tom === 'ruim' ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
                <span>{i.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* KPIs */}
      <section className="cartao kpi c3">
        <div className="kpi-topo">
          <span className="kpi-icone verde"><TrendingUp size={18} /></span>
          <span className="kpi-rotulo">Receitas</span>
        </div>
        <Valor v={atual.receitas} className="kpi-valor" />
        <Delta pct={variacao(atual.receitas, anterior.receitas)} mesAnterior={mesAnt} />
        <Faisca dados={ultimos6.map((s) => s.Receitas)} cor="var(--verde)" id="fR" />
      </section>
      <section className="cartao kpi c3">
        <div className="kpi-topo">
          <span className="kpi-icone vermelho"><TrendingDown size={18} /></span>
          <span className="kpi-rotulo">Despesas</span>
        </div>
        <Valor v={atual.despesas} className="kpi-valor" />
        <Delta pct={varDesp} inverter mesAnterior={mesAnt} />
        <Faisca dados={ultimos6.map((s) => s.Despesas)} cor="var(--vermelho)" id="fD" />
      </section>
      <section className="cartao kpi c3">
        <div className="kpi-topo">
          <span className="kpi-icone roxo"><PiggyBank size={18} /></span>
          <span className="kpi-rotulo">Taxa de economia</span>
        </div>
        <div className="kpi-anel">
          <div>
            <span className="kpi-valor num">{atual.receitas > 0 ? `${taxa.toFixed(0)}%` : '—'}</span>
            <span className="kpi-nota">da renda guardada</span>
          </div>
          <Anel pct={taxa} cor={taxa >= 20 ? 'var(--verde)' : taxa >= 0 ? 'var(--amarelo)' : 'var(--vermelho)'} />
        </div>
        <span className="kpi-nota">Meta recomendada: 20%</span>
      </section>
      <section className="cartao kpi c3">
        <div className="kpi-topo">
          <span className="kpi-icone amarelo"><CalendarClock size={18} /></span>
          <span className="kpi-rotulo">A pagar no mês</span>
        </div>
        <Valor v={aPagar} className="kpi-valor" />
        <span className={`delta ${vencidas.length ? 'ruim' : 'neutro'}`}>
          {pendentes.length} pendente(s){vencidas.length ? ` · ${vencidas.length} vencida(s)` : ''}
        </span>
        <span className="kpi-nota">A receber: {fmt(aReceber)}</span>
      </section>

      {/* Fluxo de caixa */}
      <section className="cartao c8 flex">
        <div className="cartao-cab">
          <h3>Fluxo de caixa</h3>
          <div className="legenda-inline">
            <span><i style={{ background: 'var(--verde)' }} /> Receitas</span>
            <span><i style={{ background: 'var(--vermelho)' }} /> Despesas</span>
            <span><i className="linha-leg" /> Saldo acumulado</span>
          </div>
        </div>
        <div className="grafico-flex" style={{ minHeight: 290 }}><div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={serie} margin={{ top: 10, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <defs>
              <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--verde)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--verde)" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--vermelho)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--vermelho)" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--grade)" />
            <XAxis dataKey="mes" tick={corEixo} axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} {...eixoValor} />
            <Tooltip content={<DicaGrafico />} cursor={{ fill: 'var(--hover)' }} />
            <Bar dataKey="Receitas" fill="url(#gRec)" radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Bar dataKey="Despesas" fill="url(#gDes)" radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Line type="monotone" dataKey="Saldo" stroke="var(--primaria)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        </div></div>
      </section>

      {/* Categorias */}
      <section className="cartao c4">
        <h3>Para onde foi o dinheiro</h3>
        {porCategoria.length === 0 ? (
          <p className="vazio">Nenhuma despesa neste mês.</p>
        ) : (
          <>
            <div className="rosca">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="valor" nameKey="name" innerRadius={66} outerRadius={92} paddingAngle={2} cornerRadius={6} stroke="none">
                    {porCategoria.map((c) => <Cell key={c.id} fill={c.cor} />)}
                  </Pie>
                  <Tooltip content={<DicaGrafico />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="rosca-centro">
                <span>Total</span>
                <Valor v={atual.despesas} />
              </div>
            </div>
            <ul className="lista-cat-dash">
              {porCategoria.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <IconeCategoria cat={c.cat} tamanho={30} />
                  <div className="lcd-info">
                    <div className="lcd-linha">
                      <span>{c.name}</span>
                      <strong className="num">{fmt(c.valor)}</strong>
                    </div>
                    <div className="barra fina"><span style={{ width: `${(c.valor / porCategoria[0].valor) * 100}%`, background: c.cor }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Ritmo de gastos */}
      <section className="cartao c6 flex">
        <div className="cartao-cab">
          <h3>Ritmo de gastos</h3>
          <div className="legenda-inline">
            <span><i style={{ background: 'var(--primaria)' }} /> Este mês</span>
            <span><i style={{ background: 'var(--texto-3)' }} /> Mês anterior</span>
          </div>
        </div>
        <p className="cartao-sub">Despesas acumuladas dia a dia, comparadas ao mês anterior.</p>
        <div className="grafico-flex" style={{ minHeight: 230 }}><div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ritmo} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--grade)" />
            <XAxis dataKey="dia" tick={corEixo} axisLine={false} tickLine={false} interval={4} />
            <YAxis axisLine={false} tickLine={false} {...eixoValor} />
            <Tooltip content={<DicaGrafico />} labelFormatter={(d) => `Dia ${d}`} />
            <Line type="monotone" dataKey="Mês anterior" stroke="var(--texto-3)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="Este mês" stroke="var(--primaria)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
        </div></div>
      </section>

      {/* Orçamentos */}
      <section className="cartao c6">
        <h3>Metas de gastos</h3>
        {listaOrc.length === 0 ? (
          <p className="vazio">Defina limites na aba Orçamentos para acompanhar aqui.</p>
        ) : (
          <ul className="metas">
            {listaOrc.slice(0, 5).map((o) => {
              const estado = o.pct > 100 ? 'estourado' : o.pct >= 80 ? 'atencao' : 'ok'
              return (
                <li key={o.id}>
                  <IconeCategoria cat={o.cat} tamanho={34} />
                  <div className="meta-info">
                    <div className="lcd-linha">
                      <span>{o.cat!.nome}</span>
                      <span className={`meta-pct ${estado}`}>{o.pct.toFixed(0)}%</span>
                    </div>
                    <div className={`barra ${estado}`}><span style={{ width: `${Math.min(100, o.pct)}%` }} /></div>
                    <span className="meta-sub num">{fmt(o.gasto)} de {fmt(o.limite)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Próximas contas */}
      <section className="cartao c6">
        <div className="cartao-cab">
          <h3>Contas pendentes</h3>
          <button className="btn link" onClick={p.onVerTodos}>Ver todos</button>
        </div>
        {pendentes.length === 0 ? (
          <p className="vazio sucesso"><CheckCircle2 size={18} /> Tudo pago e recebido neste mês.</p>
        ) : (
          <ul className="lista-mov">
            {pendentes.slice(0, 6).map((l) => {
              const dias = Math.round((new Date(l.data).getTime() - new Date(hoje).getTime()) / 86400000)
              const status = dias < 0 ? { t: `Venceu há ${-dias}d`, c: 'ruim' } : dias === 0 ? { t: 'Vence hoje', c: 'atencao' } : { t: `Em ${dias} dia(s)`, c: 'neutro' }
              return (
                <li key={l.id}>
                  <button className="marcar" onClick={() => p.onAlternarPago(l.id)} aria-label={`Marcar ${l.descricao} como ${l.tipo === 'despesa' ? 'paga' : 'recebida'}`}>
                    <CheckCircle2 size={20} />
                  </button>
                  <IconeCategoria cat={catPorId.get(l.categoriaId)} tamanho={36} />
                  <button className="mov-info" onClick={() => p.onEditar(l)}>
                    <strong>{l.descricao}</strong>
                    <span>{formatData(l.data)} · <em className={`status ${status.c}`}>{status.t}</em></span>
                  </button>
                  <span className={`num mov-valor ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Maiores despesas */}
      <section className="cartao c6">
        <h3>Maiores despesas do mês</h3>
        {maiores.length === 0 ? (
          <p className="vazio">Nenhuma despesa neste mês.</p>
        ) : (
          <ol className="lista-mov ranking">
            {maiores.map((l, i) => (
              <li key={l.id}>
                <span className="posicao">{i + 1}</span>
                <IconeCategoria cat={catPorId.get(l.categoriaId)} tamanho={36} />
                <button className="mov-info" onClick={() => p.onEditar(l)}>
                  <strong>{l.descricao}</strong>
                  <span>{catPorId.get(l.categoriaId)?.nome ?? '—'} · {formatData(l.data)}</span>
                </button>
                <span className="num mov-valor despesa">−{fmt(l.valor)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
