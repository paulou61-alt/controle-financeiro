import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowUpRight, CalendarClock, CheckCircle2, HandCoins, Info, Lightbulb,
  Plus, Receipt, Scale, Sparkles, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Orcamentos, Tipo, Transferencia } from '../types'
import { diasEntre, ehCartao, noPeriodo, previsaoSaldo, rotuloPeriodo, saldoConta, type Fatura, type Periodo } from '../financas'
import { formatData, hojeISO, mesAtual, mesDe, rotuloMes } from '../utils'
import { DicaGrafico, IconeCategoria, Valor, useFmt, useOculto } from '../ui'
import { FiltroConta, FiltroPeriodo, IconeConta, LinhaFatura, LinhaLancamento } from './comuns'

interface Props {
  lancamentos: Lancamento[]
  transferencias: Transferencia[]
  contas: ContaFinanceira[]
  catPorId: Map<string, Categoria>
  contaPorId: Map<string, ContaFinanceira>
  orcamentos: Orcamentos
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  contaFiltro: string
  setContaFiltro: (id: string) => void
  onBaixa: (id: string) => void
  onReverter: (id: string) => void
  onEditar: (l: Lancamento) => void
  onNovo: (tipo: Tipo) => void
  onTransferir: () => void
  onIr: (aba: 'lancamentos' | 'pagar' | 'receber' | 'contas' | 'cartoes') => void
  onCarregarExemplo: () => void
  faturas: Fatura[]
  onPagarFatura: (f: Fatura) => void
  onAbrirFatura: (f: Fatura) => void
}

export default function Dashboard(p: Props) {
  const { lancamentos, transferencias, contas, catPorId, contaPorId, orcamentos, periodo, contaFiltro } = p
  const fmt = useFmt()
  const oculto = useOculto()
  const hoje = hojeISO()

  // saldo e previsão consideram só dinheiro (cartões entram pelas faturas)
  const contasCaixa = useMemo(() => contas.filter((c) => !ehCartao(c)), [contas])
  const contasSel = useMemo(() => (contaFiltro ? contasCaixa.filter((c) => c.id === contaFiltro) : contasCaixa), [contasCaixa, contaFiltro])
  const doFiltro = useMemo(() => (contaFiltro ? lancamentos.filter((l) => l.contaId === contaFiltro) : lancamentos), [lancamentos, contaFiltro])
  const faturasAbertas = useMemo(
    () => p.faturas.filter((f) => f.restante > 0 && f.status !== 'futura' && (!contaFiltro || f.cartao.contaPagamentoId === contaFiltro)),
    [p.faturas, contaFiltro],
  )
  const prev = useMemo(() => previsaoSaldo(contasSel, lancamentos, transferencias, 30, p.faturas), [contasSel, lancamentos, transferencias, p.faturas])

  const realizados = doFiltro.filter((l) => l.pago && noPeriodo(l.dataPagamento, periodo))
  const recebidas = realizados.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const pagas = realizados.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const resultado = recebidas - pagas

  // "a pagar / a receber" vão até o fim do período (recorrências geram meses à frente)
  const ate = periodo.ate
  const pendentes = doFiltro.filter((l) => !l.pago)
  const pendentesAte = pendentes.filter((l) => l.data <= ate)
  const faturasAte = faturasAbertas.filter((f) => f.vencimento <= ate)
  const aReceberLista = pendentesAte.filter((l) => l.tipo === 'receita')
  const aPagarLista = pendentesAte.filter((l) => l.tipo === 'despesa')
  const aReceber = aReceberLista.reduce((s, l) => s + l.valor, 0)
  const aPagar = aPagarLista.reduce((s, l) => s + l.valor, 0) + faturasAte.reduce((s, f) => s + f.restante, 0)
  const vencidas = pendentes.filter((l) => l.data < hoje)
  const faturasVencidas = faturasAbertas.filter((f) => f.status === 'vencida')
  const vencidasPagar = vencidas.filter((l) => l.tipo === 'despesa')
  const vencidasReceber = vencidas.filter((l) => l.tipo === 'receita')
  const totalVencidoPagar = vencidasPagar.reduce((s, l) => s + l.valor, 0) + faturasVencidas.reduce((s, f) => s + f.restante, 0)
  const qtdVencidas = vencidas.length + faturasVencidas.length
  const proximos = [
    ...pendentes.map((l) => ({ data: l.data, l, f: undefined as Fatura | undefined })),
    ...faturasAbertas.map((f) => ({ data: f.vencimento, l: undefined as Lancamento | undefined, f })),
  ].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 7)
  const ateTexto = periodo.preset === 'tudo' ? 'Em aberto' : `Até ${formatData(ate)}`

  const serie = useMemo(() => {
    const datas = realizados.map((l) => l.dataPagamento!).sort()
    const de = periodo.preset === 'tudo' ? datas[0] ?? hoje : periodo.de
    const ate = periodo.preset === 'tudo' ? (datas[datas.length - 1] ?? hoje) : periodo.ate
    const porDia = diasEntre(de, ate) <= 62
    const chave = (d: string) => (porDia ? d : mesDe(d))
    const baldes = new Map<string, { Entradas: number; Saídas: number }>()
    if (porDia) {
      for (let i = 0; i <= diasEntre(de, ate); i++) {
        const [a, m, d] = de.split('-').map(Number)
        const dt = new Date(a, m - 1, d + i)
        baldes.set(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`, { Entradas: 0, Saídas: 0 })
      }
    } else {
      let m = mesDe(de)
      while (m <= mesDe(ate)) {
        baldes.set(m, { Entradas: 0, Saídas: 0 })
        const [a, mm] = m.split('-').map(Number)
        m = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`
      }
    }
    for (const l of realizados) {
      const b = baldes.get(chave(l.dataPagamento!))
      if (!b) continue
      if (l.tipo === 'receita') b.Entradas += l.valor
      else b.Saídas += l.valor
    }
    return [...baldes.entries()].map(([k, v]) => ({ rotulo: porDia ? formatData(k).slice(0, 5) : rotuloMes(k), ...v }))
  }, [realizados, periodo, hoje])

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    realizados.filter((l) => l.tipo === 'despesa').forEach((l) => mapa.set(l.categoriaId, (mapa.get(l.categoriaId) ?? 0) + l.valor))
    return [...mapa.entries()]
      .map(([id, valor]) => ({ id, cat: catPorId.get(id), name: catPorId.get(id)?.nome ?? 'Sem categoria', cor: catPorId.get(id)?.cor ?? '#94a3b8', valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [realizados, catPorId])

  const mesMetas = mesAtual()
  const metas = Object.entries(orcamentos)
    .map(([id, limite]) => {
      const gasto = lancamentos.filter((l) => l.tipo === 'despesa' && l.categoriaId === id && mesDe(l.data) === mesMetas).reduce((s, l) => s + l.valor, 0)
      return { id, cat: catPorId.get(id), limite, gasto, pct: limite > 0 ? (gasto / limite) * 100 : 0 }
    })
    .filter((o) => o.cat && o.limite > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)

  const insights: { tom: 'bom' | 'ruim' | 'info'; texto: string }[] = []
  if (prev.menor.Saldo < 0) insights.push({ tom: 'ruim', texto: `Atenção: a previsão indica saldo negativo em ${formatData(prev.menor.data)} (${fmt(prev.menor.Saldo)}).` })
  if (vencidasPagar.length + faturasVencidas.length)
    insights.push({ tom: 'ruim', texto: `${vencidasPagar.length + faturasVencidas.length} conta(s) a pagar vencida(s), somando ${fmt(totalVencidoPagar)}.` })
  const faturaFechada = faturasAbertas.find((f) => f.status === 'fechada')
  if (faturaFechada) insights.push({ tom: 'info', texto: `Fatura ${faturaFechada.cartao.nome} fechada: ${fmt(faturaFechada.restante)}, vence em ${formatData(faturaFechada.vencimento)}.` })
  if (vencidasReceber.length) insights.push({ tom: 'ruim', texto: `${vencidasReceber.length} recebimento(s) em atraso, somando ${fmt(vencidasReceber.reduce((s, l) => s + l.valor, 0))}.` })
  if (recebidas > 0 || pagas > 0)
    insights.push(resultado >= 0
      ? { tom: 'bom', texto: `Resultado de caixa positivo no período: ${fmt(resultado)}.` }
      : { tom: 'ruim', texto: `Resultado de caixa negativo no período: saiu ${fmt(-resultado)} a mais do que entrou.` })
  if (porCategoria[0] && pagas > 0)
    insights.push({ tom: 'info', texto: `${porCategoria[0].name} concentra ${((porCategoria[0].valor / pagas) * 100).toFixed(0)}% das despesas pagas.` })

  const vazio = lancamentos.length === 0 && transferencias.length === 0 && contas.every((c) => c.saldoInicial === 0)
  if (vazio) {
    return (
      <div className="boas-vindas">
        <div className="bv-brilho" aria-hidden="true" />
        <span className="bv-icone"><Sparkles size={30} /></span>
        <h2>Seu painel financeiro começa aqui</h2>
        <p>Cadastre suas contas, registre receitas e despesas e acompanhe saldo, vencimentos e previsão de caixa.</p>
        <div className="bv-acoes">
          <button className="btn primario grande" onClick={() => p.onNovo('receita')}><Plus size={18} /> Primeiro lançamento</button>
          <button className="btn grande" onClick={() => p.onIr('contas')}><Wallet size={18} /> Cadastrar contas</button>
          <button className="btn grande" onClick={p.onCarregarExemplo}><Sparkles size={18} /> Ver com dados de exemplo</button>
        </div>
      </div>
    )
  }

  const corEixo = { fill: 'var(--texto-3)', fontSize: 12 }
  const eixoValor = oculto
    ? { tick: false as const, width: 8 }
    : { tick: corEixo, width: 64, tickFormatter: (v: number) => v.toLocaleString('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }) }
  const nomeFiltro = contaFiltro ? contaPorId.get(contaFiltro)?.nome ?? 'Conta' : 'Todas as contas'
  const ativas = contasCaixa.filter((c) => !c.arquivada)
  const cartoesAtivos = contas.filter((c) => ehCartao(c) && !c.arquivada)

  return (
    <div className="dash">
      {/* Filtros e ações */}
      <section className="barra-dash c12">
        <div className="filtros-dash">
          <FiltroPeriodo periodo={periodo} onChange={p.setPeriodo} />
          <FiltroConta contas={contasCaixa} valor={contaFiltro} onChange={p.setContaFiltro} />
        </div>
        <div className="acoes-dash">
          <button className="btn acao-receita" onClick={() => p.onNovo('receita')}><ArrowUpRight size={17} /> Nova receita</button>
          <button className="btn acao-despesa" onClick={() => p.onNovo('despesa')}><ArrowDownRight size={17} /> Nova despesa</button>
          <button className="btn" onClick={p.onTransferir}><ArrowLeftRight size={17} /> Transferir</button>
        </div>
      </section>

      {/* Saldo atual + previsão */}
      <section className="heroi c8">
        <div className="heroi-fundo" aria-hidden="true" />
        <div className="heroi-texto">
          <span className="heroi-rotulo"><Wallet size={16} /> Saldo atual · {nomeFiltro}</span>
          <Valor v={prev.saldoAtual} className="heroi-valor" />
          <span className="heroi-sub">Previsão para {formatData(prev.pontos[prev.pontos.length - 1].data)}: <Valor v={prev.saldoFinal} /></span>
          <div className="heroi-pilulas">
            <span><ArrowUpRight size={15} /> A entrar <Valor v={prev.entradas} /></span>
            <span><ArrowDownRight size={15} /> A sair <Valor v={prev.saidas} /></span>
          </div>
        </div>
        <div className="heroi-grafico">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prev.pontos} margin={{ top: 22, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gHeroi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="rotulo" hide />
              <Tooltip content={<DicaGrafico />} cursor={{ stroke: 'rgba(255,255,255,.4)' }} />
              {prev.menor.Saldo < 0 && <ReferenceLine y={0} stroke="rgba(255,255,255,.6)" strokeDasharray="4 4" />}
              <Area type="stepAfter" dataKey="Saldo" stroke="#fff" strokeWidth={2.5} fill="url(#gHeroi)" />
            </AreaChart>
          </ResponsiveContainer>
          <span className="heroi-legenda">Previsão de saldo · próximos 30 dias</span>
        </div>
      </section>

      {/* Saldo por conta */}
      <section className="cartao c4">
        <div className="cartao-cab">
          <h3>Saldo por conta</h3>
          <button className="btn link" onClick={() => p.onIr('contas')}>Gerenciar</button>
        </div>
        <ul className="lista-contas-dash">
          {ativas.map((c) => (
            <li key={c.id}>
              <button className={contaFiltro === c.id ? 'ativo' : ''} onClick={() => p.setContaFiltro(contaFiltro === c.id ? '' : c.id)} title="Filtrar por esta conta">
                <IconeConta tipo={c.tipo} tamanho={34} />
                <span>{c.nome}</span>
                <strong className="num">{fmt(saldoConta(c, lancamentos, transferencias))}</strong>
              </button>
            </li>
          ))}
        </ul>
        {cartoesAtivos.length > 0 && (
          <>
            <h4 className="subtitulo-lista">Cartões · fatura atual</h4>
            <ul className="lista-contas-dash">
              {cartoesAtivos.map((c) => {
                const atual = p.faturas.find((f) => f.cartao.id === c.id && f.status === 'aberta')
                return (
                  <li key={c.id}>
                    <button onClick={() => p.onIr('cartoes')}>
                      <IconeConta tipo="cartao" tamanho={34} />
                      <span>{c.nome}</span>
                      <strong className="num despesa">{fmt(atual?.total ?? 0)}</strong>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {/* Indicadores */}
      <section className="kpis c12">
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone verde"><TrendingUp size={18} /></span><span className="kpi-rotulo">Receitas recebidas</span></div>
          <Valor v={recebidas} className="kpi-valor" />
          <span className="kpi-nota">{rotuloPeriodo(periodo)}</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone vermelho"><TrendingDown size={18} /></span><span className="kpi-rotulo">Despesas pagas</span></div>
          <Valor v={pagas} className="kpi-valor" />
          <span className="kpi-nota">{rotuloPeriodo(periodo)}</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone roxo"><Scale size={18} /></span><span className="kpi-rotulo">Resultado de caixa</span></div>
          <Valor v={resultado} sinal className={`kpi-valor ${resultado < 0 ? 'despesa' : ''}`} />
          <span className="kpi-nota" title="Resultado de caixa não é lucro contábil: considera apenas o dinheiro que efetivamente entrou e saiu.">
            <Info size={12} /> Recebido − pago. Não é lucro contábil.
          </span>
        </div>
        <button className="cartao kpi clicavel" onClick={() => p.onIr('receber')}>
          <div className="kpi-topo"><span className="kpi-icone ciano"><HandCoins size={18} /></span><span className="kpi-rotulo">A receber</span></div>
          <Valor v={aReceber} className="kpi-valor" />
          <span className="kpi-nota">{ateTexto} · {aReceberLista.length} lançamento(s)</span>
        </button>
        <button className="cartao kpi clicavel" onClick={() => p.onIr('pagar')}>
          <div className="kpi-topo"><span className="kpi-icone amarelo"><Receipt size={18} /></span><span className="kpi-rotulo">A pagar</span></div>
          <Valor v={aPagar} className="kpi-valor" />
          <span className="kpi-nota">{ateTexto} · {aPagarLista.length} lançamento(s){faturasAte.length ? ` + ${faturasAte.length} fatura(s)` : ''}</span>
        </button>
        <button className={`cartao kpi clicavel ${qtdVencidas ? 'alerta-kpi' : ''}`} onClick={() => p.onIr('pagar')}>
          <div className="kpi-topo"><span className="kpi-icone vermelho"><AlertTriangle size={18} /></span><span className="kpi-rotulo">Contas vencidas</span></div>
          <span className="kpi-valor num">{qtdVencidas}</span>
          <span className="kpi-nota">
            {qtdVencidas ? `A pagar ${fmt(totalVencidoPagar)} · A receber ${fmt(vencidasReceber.reduce((s, l) => s + l.valor, 0))}` : 'Nenhuma conta em atraso'}
          </span>
        </button>
      </section>

      {/* Entradas e saídas */}
      <section className="cartao c8">
        <div className="cartao-cab">
          <h3>Entradas e saídas</h3>
          <div className="legenda-inline">
            <span><i style={{ background: 'var(--verde)' }} /> Entradas</span>
            <span><i style={{ background: 'var(--vermelho)' }} /> Saídas</span>
          </div>
        </div>
        <p className="cartao-sub">Valores efetivamente recebidos e pagos · {rotuloPeriodo(periodo)}</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={serie} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
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
            <XAxis dataKey="rotulo" tick={corEixo} axisLine={false} tickLine={false} minTickGap={12} />
            <YAxis axisLine={false} tickLine={false} {...eixoValor} />
            <Tooltip content={<DicaGrafico />} cursor={{ fill: 'var(--hover)' }} />
            <Bar dataKey="Entradas" fill="url(#gRec)" radius={[5, 5, 0, 0]} maxBarSize={22} />
            <Bar dataKey="Saídas" fill="url(#gDes)" radius={[5, 5, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Despesas por categoria */}
      <section className="cartao c4">
        <h3>Despesas por categoria</h3>
        {porCategoria.length === 0 ? (
          <p className="vazio">Nenhuma despesa paga no período.</p>
        ) : (
          <>
            <div className="rosca">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="valor" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2} cornerRadius={6} stroke="none">
                    {porCategoria.map((c) => <Cell key={c.id} fill={c.cor} />)}
                  </Pie>
                  <Tooltip content={<DicaGrafico />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="rosca-centro"><span>Pagas</span><Valor v={pagas} /></div>
            </div>
            <ul className="lista-cat-dash">
              {porCategoria.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <IconeCategoria cat={c.cat} tamanho={30} />
                  <div className="lcd-info">
                    <div className="lcd-linha"><span>{c.name}</span><strong className="num">{fmt(c.valor)}</strong></div>
                    <div className="barra fina"><span style={{ width: `${(c.valor / porCategoria[0].valor) * 100}%`, background: c.cor }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Próximos vencimentos */}
      <section className="cartao c7">
        <div className="cartao-cab">
          <h3><CalendarClock size={18} /> Próximos vencimentos</h3>
          <button className="btn link" onClick={() => p.onIr('pagar')}>Ver contas a pagar</button>
        </div>
        {proximos.length === 0 ? (
          <p className="vazio sucesso"><CheckCircle2 size={18} /> Nada pendente. Tudo pago e recebido.</p>
        ) : (
          <ul className="lista-mov">
            {proximos.map(({ l, f }) =>
              f ? (
                <LinhaFatura key={`f-${f.cartao.id}-${f.chave}`} f={f} onPagar={p.onPagarFatura} onAbrir={p.onAbrirFatura} />
              ) : (
                <LinhaLancamento key={l!.id} l={l!} cat={catPorId.get(l!.categoriaId)} conta={contaPorId.get(l!.contaId)} mostrarData
                  onBaixa={p.onBaixa} onReverter={p.onReverter} onEditar={p.onEditar} />
              ),
            )}
          </ul>
        )}
      </section>

      {/* Insights */}
      <section className="cartao c5 insights">
        <h3><Lightbulb size={18} /> Pontos de atenção</h3>
        {insights.length === 0 ? (
          <p className="vazio">Sem alertas no momento.</p>
        ) : (
          <ul>
            {insights.slice(0, 5).map((i, k) => (
              <li key={k} className={i.tom}>
                {i.tom === 'bom' ? <TrendingUp size={16} /> : i.tom === 'ruim' ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
                <span>{i.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Metas de gastos */}
      {metas.length > 0 && (
        <section className="cartao c12">
          <h3>Metas de gastos · {rotuloMes(mesMetas, true)}</h3>
          <ul className="metas grade-metas">
            {metas.map((o) => {
              const estado = o.pct > 100 ? 'estourado' : o.pct >= 80 ? 'atencao' : 'ok'
              return (
                <li key={o.id}>
                  <IconeCategoria cat={o.cat} tamanho={34} />
                  <div className="meta-info">
                    <div className="lcd-linha"><span>{o.cat!.nome}</span><span className={`meta-pct ${estado}`}>{o.pct.toFixed(0)}%</span></div>
                    <div className={`barra ${estado}`}><span style={{ width: `${Math.min(100, o.pct)}%` }} /></div>
                    <span className="meta-sub num">{fmt(o.gasto)} de {fmt(o.limite)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
