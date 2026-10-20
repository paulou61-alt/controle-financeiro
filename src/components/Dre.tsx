import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Info, Landmark, Percent, Printer, Scale, SlidersHorizontal, TrendingUp } from 'lucide-react'
import type { Categoria, ContaFinanceira, GrupoDre, Lancamento, Perfil } from '../types'
import { rotuloPeriodo, type Periodo } from '../financas'
import {
  GRUPOS_DRE, baixarCSV, calcularDre, colunasDoPeriodo, dataNoRegime, grupoDre, gruposDoTipo, movimentos, nomeArquivo, pct,
  type Celula, type Linha, type Regime,
} from '../analise'
import { DicaGrafico, IconeCategoria, Valor, useFmt, useOculto } from '../ui'
import { CabecalhoImpressao, FiltroConta, FiltroPeriodo, SeletorRegime } from './comuns'

interface Props {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  setCategorias: (f: (c: Categoria[]) => Categoria[]) => void
  catPorId: Map<string, Categoria>
  contas: ContaFinanceira[]
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  contaFiltro: string
  setContaFiltro: (id: string) => void
  regime: Regime
  setRegime: (r: Regime) => void
  perfil: Perfil
  nome: string
}

export function SeletorGrupoDre({ cat, onChange }: { cat: Categoria; onChange: (g: GrupoDre) => void }) {
  const atual = grupoDre(cat, cat.tipo)
  const g = GRUPOS_DRE.find((x) => x.id === atual)
  return (
    <select className="select-dre" value={atual} onChange={(e) => onChange(e.target.value as GrupoDre)} aria-label={`Linha da DRE de ${cat.nome}`} title={g?.ajuda}>
      {gruposDoTipo(cat.tipo).map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
    </select>
  )
}

type LinhaTabela =
  | { tipo: 'grupo'; id: GrupoDre; rotulo: string; linha: Linha; sinal: 1 | -1 }
  | { tipo: 'categoria'; id: string; rotulo: string; linha: Linha; sinal: 1 | -1; cat?: Categoria }
  | { tipo: 'subtotal' | 'final'; id: string; rotulo: string; linha: Linha }

export default function Dre(p: Props) {
  const { lancamentos, catPorId, periodo, regime, contaFiltro } = p
  const fmt = useFmt()
  const oculto = useOculto()
  // no celular a tabela por mês fica estreita; começa só com o total
  const [porColuna, setPorColuna] = useState(() => typeof matchMedia === 'undefined' || matchMedia('(min-width: 641px)').matches)
  const [detalhar, setDetalhar] = useState(true)

  const movs = useMemo(() => movimentos(lancamentos, periodo, regime, contaFiltro), [lancamentos, periodo, regime, contaFiltro])
  const colunas = useMemo(
    () => colunasDoPeriodo(periodo, lancamentos.map((l) => dataNoRegime(l, regime)).filter((d): d is string => !!d)),
    [periodo, lancamentos, regime],
  )
  const dre = useMemo(() => calcularDre(movs, catPorId, colunas), [movs, catPorId, colunas])
  const g = dre.grupos
  const base = dre.receitaLiquida.total || g.receita.total
  const mostrarColunas = porColuna && colunas.lista.length > 1

  const linhas: LinhaTabela[] = []
  const grupo = (id: GrupoDre, rotulo: string, sinal: 1 | -1, sempre = false) => {
    const gr = g[id]
    if (!sempre && gr.categorias.length === 0) return
    linhas.push({ tipo: 'grupo', id, rotulo, linha: gr, sinal })
    if (detalhar) gr.categorias.forEach((c) => linhas.push({ tipo: 'categoria', id: `${id}:${c.id}`, rotulo: c.nome, linha: c, sinal, cat: c.cat }))
  }
  const sub = (id: string, rotulo: string, linha: Linha, final = false) => linhas.push({ tipo: final ? 'final' : 'subtotal', id, rotulo, linha })

  const temDeducao = g.deducao.categorias.length > 0
  const temCusto = g.custo.categorias.length > 0
  grupo('receita', 'Receita bruta', 1, true)
  grupo('deducao', '(−) Deduções da receita', -1)
  if (temDeducao) sub('rl', '= Receita líquida', dre.receitaLiquida)
  grupo('custo', '(−) Custos (CMV / CSP)', -1)
  if (temCusto) sub('lb', '= Lucro bruto', dre.lucroBruto)
  grupo('despesa', '(−) Despesas operacionais', -1, true)
  sub('ro', '= Resultado operacional', dre.resultadoOperacional)
  const temFinanceiro = g['receita-financeira'].categorias.length + g['despesa-financeira'].categorias.length > 0
  grupo('receita-financeira', '(+) Receitas financeiras e outras', 1)
  grupo('despesa-financeira', '(−) Despesas financeiras', -1)
  const temImposto = g.imposto.categorias.length > 0
  if (temFinanceiro && temImposto) sub('air', '= Resultado antes do IR', dre.resultadoAntesIr)
  grupo('imposto', '(−) IRPJ e CSLL', -1)
  sub('ll', '= Lucro líquido', dre.lucroLiquido, true)
  const temFora = g.fora.categorias.length > 0
  if (temFora) {
    grupo('fora', '(±) Fora do resultado', 1)
    sub('gc', '= Sobra após retiradas e investimentos', dre.geracaoCaixa)
  }

  const valorExibido = (l: LinhaTabela, v: number) => (l.tipo === 'grupo' || l.tipo === 'categoria' ? l.sinal * v : v)

  const exportar = () => {
    const cab: Celula[] = ['Descrição', ...(mostrarColunas ? colunas.lista.map((c) => c.rotulo) : []), 'Total', '% da receita líquida']
    const corpo = linhas.map((l): Celula[] => [
      l.tipo === 'categoria' ? `    ${l.rotulo}` : l.rotulo,
      ...(mostrarColunas ? l.linha.valores.map((v) => valorExibido(l, v)) : []),
      valorExibido(l, l.linha.total),
      pct(valorExibido(l, l.linha.total), base),
    ])
    baixarCSV(nomeArquivo(`dre-${regime}`, periodo), [cab, ...corpo])
  }

  const grafico = colunas.lista.map((c, i) => ({
    rotulo: c.rotulo,
    'Receita líquida': Math.round(dre.receitaLiquida.valores[i] * 100) / 100,
    'Lucro líquido': Math.round(dre.lucroLiquido.valores[i] * 100) / 100,
  }))
  const corEixo = { fill: 'var(--texto-3)', fontSize: 12 }
  const eixoValor = oculto
    ? { tick: false as const, width: 8 }
    : { tick: corEixo, width: 64, tickFormatter: (v: number) => v.toLocaleString('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }) }

  const margem = (v: number) => (base ? `${((v / base) * 100).toFixed(1).replace('.', ',')}% da receita` : '—')
  const despesasCats = p.categorias.filter((c) => c.tipo === 'despesa')
  const receitasCats = p.categorias.filter((c) => c.tipo === 'receita')
  const definirGrupo = (id: string, dreGrupo: GrupoDre) => p.setCategorias((cs) => cs.map((c) => (c.id === id ? { ...c, dre: dreGrupo } : c)))

  return (
    <div className="pagina">
      <CabecalhoImpressao titulo={`DRE · Demonstração do Resultado (${regime === 'competencia' ? 'competência' : 'caixa'})`} periodo={periodo} perfil={p.perfil} nome={p.nome} />

      <section className="cartao nao-imprimir">
        <div className="filtros sem-margem">
          <FiltroPeriodo periodo={periodo} onChange={p.setPeriodo} />
          <FiltroConta contas={p.contas} valor={contaFiltro} onChange={p.setContaFiltro} />
          <SeletorRegime valor={regime} onChange={p.setRegime} />
          <div className="segmentado" role="group" aria-label="Colunas">
            <button className={porColuna ? 'ativo' : ''} onClick={() => setPorColuna(true)}>{colunas.nivel === 'ano' ? 'Por ano' : 'Por mês'}</button>
            <button className={!porColuna ? 'ativo' : ''} onClick={() => setPorColuna(false)}>Só total</button>
          </div>
          <label className="interruptor">
            <input type="checkbox" checked={detalhar} onChange={(e) => setDetalhar(e.target.checked)} />
            <span className="trilho"><span /></span> Categorias
          </label>
          <div className="acoes-filtro">
            <button className="btn" onClick={exportar} disabled={movs.length === 0}><Download size={16} /> CSV</button>
            <button className="btn" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button>
          </div>
        </div>
      </section>

      <section className="kpis-4">
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone verde"><TrendingUp size={18} /></span><span className="kpi-rotulo">Receita líquida</span></div>
          <Valor v={dre.receitaLiquida.total} className="kpi-valor" />
          <span className="kpi-nota">Receita bruta {fmt(g.receita.total)}</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone ciano"><Percent size={18} /></span><span className="kpi-rotulo">Lucro bruto</span></div>
          <Valor v={dre.lucroBruto.total} className={`kpi-valor ${dre.lucroBruto.total < 0 ? 'despesa' : ''}`} />
          <span className="kpi-nota">Margem bruta: {margem(dre.lucroBruto.total)}</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone amarelo"><Landmark size={18} /></span><span className="kpi-rotulo">Resultado operacional</span></div>
          <Valor v={dre.resultadoOperacional.total} className={`kpi-valor ${dre.resultadoOperacional.total < 0 ? 'despesa' : ''}`} />
          <span className="kpi-nota">Margem operacional: {margem(dre.resultadoOperacional.total)}</span>
        </div>
        <div className={`cartao kpi ${dre.lucroLiquido.total < 0 ? 'alerta-kpi' : ''}`}>
          <div className="kpi-topo"><span className="kpi-icone roxo"><Scale size={18} /></span><span className="kpi-rotulo">Lucro líquido</span></div>
          <Valor v={dre.lucroLiquido.total} sinal className={`kpi-valor ${dre.lucroLiquido.total < 0 ? 'despesa' : ''}`} />
          <span className="kpi-nota">Margem líquida: {margem(dre.lucroLiquido.total)}</span>
        </div>
      </section>

      <section className="cartao">
        <div className="cartao-cab">
          <h3>Demonstração do resultado</h3>
          <span className="kpi-nota">{rotuloPeriodo(periodo)} · {regime === 'competencia' ? 'regime de competência' : 'regime de caixa'}</span>
        </div>
        {movs.length === 0 ? (
          <p className="vazio">Nenhum lançamento no período com esses filtros.</p>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela dre">
              <thead>
                <tr>
                  <th>Descrição</th>
                  {mostrarColunas && colunas.lista.map((c) => <th key={c.chave} className="num">{c.rotulo}</th>)}
                  <th className="num">Total</th>
                  <th className="num av" title="Análise vertical: percentual sobre a receita líquida">%</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const total = valorExibido(l, l.linha.total)
                  return (
                    <tr key={l.id} className={`l-${l.tipo}`}>
                      <th scope="row">
                        {l.tipo === 'categoria' ? (
                          <span className="dre-cat"><IconeCategoria cat={l.cat} tamanho={22} /> {l.rotulo}</span>
                        ) : l.rotulo}
                      </th>
                      {mostrarColunas && l.linha.valores.map((v, i) => {
                        const x = valorExibido(l, v)
                        return <td key={i} className={`num ${x < 0 ? 'neg' : ''}`}>{Math.abs(x) < 0.005 ? '–' : fmt(x)}</td>
                      })}
                      <td className={`num ${total < 0 ? 'neg' : ''}`}>{fmt(total)}</td>
                      <td className="num av">{pct(total, base)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="kpi-nota nota-dre">
          <Info size={12} /> {regime === 'competencia'
            ? 'Competência: cada lançamento entra no mês do vencimento, pago ou não.'
            : 'Caixa: entra na data em que foi pago ou recebido. Compras no cartão entram na data da compra.'}{' '}
          Transferências entre suas contas não entram. O percentual é sobre a receita líquida.
        </p>
      </section>

      {mostrarColunas && colunas.nivel === 'mes' && movs.length > 0 && (
        <section className="cartao">
          <div className="cartao-cab">
            <h3>Receita líquida e lucro por mês</h3>
            <div className="legenda-inline">
              <span><i style={{ background: 'var(--primaria)' }} /> Receita líquida</span>
              <span><i style={{ background: 'var(--verde)' }} /> Lucro líquido</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={grafico} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--grade)" />
              <XAxis dataKey="rotulo" tick={corEixo} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} {...eixoValor} />
              <Tooltip content={<DicaGrafico />} cursor={{ fill: 'var(--hover)' }} />
              <Bar dataKey="Receita líquida" fill="var(--primaria)" fillOpacity={0.8} radius={[5, 5, 0, 0]} maxBarSize={34} />
              <Line dataKey="Lucro líquido" stroke="var(--verde)" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>
      )}

      <details className="cartao nao-imprimir classificacao-dre">
        <summary><SlidersHorizontal size={17} /> Em que linha da DRE entra cada categoria</summary>
        <p className="ajuda">
          Ajuste uma vez e a DRE se monta sozinha. Use <strong>Fora do resultado</strong> para retiradas de lucro, aporte de sócio,
          empréstimos e compra de equipamentos: eles mexem no caixa, mas não são receita nem despesa.
        </p>
        <div className="grade-2">
          {[['Despesas', despesasCats], ['Receitas', receitasCats]].map(([titulo, cats]) => (
            <div key={titulo as string}>
              <h4 className="subtitulo-lista">{titulo as string}</h4>
              <ul className="lista-classificacao">
                {(cats as Categoria[]).map((c) => (
                  <li key={c.id}>
                    <IconeCategoria cat={c} tamanho={30} />
                    <span>{c.nome}</span>
                    <SeletorGrupoDre cat={c} onChange={(gr) => definirGrupo(c.id, gr)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
