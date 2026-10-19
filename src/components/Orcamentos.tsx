import { Target } from 'lucide-react'
import type { Categoria, Lancamento, Orcamentos as Orc } from '../types'
import { mesDe, parseValor } from '../utils'
import { Anel, IconeCategoria, Valor, useFmt } from '../ui'

interface Props {
  mes: string
  lancamentos: Lancamento[]
  categorias: Categoria[]
  orcamentos: Orc
  setOrcamentos: (f: (o: Orc) => Orc) => void
}

export default function Orcamentos({ mes, lancamentos, categorias, orcamentos, setOrcamentos }: Props) {
  const fmt = useFmt()
  const despesas = categorias.filter((c) => c.tipo === 'despesa')
  const gastoPor = (id: string) =>
    lancamentos
      .filter((l) => l.tipo === 'despesa' && l.categoriaId === id && mesDe(l.data) === mes)
      .reduce((s, l) => s + l.valor, 0)

  const definir = (id: string, texto: string) => {
    const num = parseValor(texto)
    setOrcamentos((o) => {
      const novo = { ...o }
      if (!texto.trim() || !Number.isFinite(num) || num <= 0) delete novo[id]
      else novo[id] = num
      return novo
    })
  }

  const comLimite = despesas.filter((c) => orcamentos[c.id])
  const totalLimite = comLimite.reduce((s, c) => s + orcamentos[c.id], 0)
  const totalGasto = comLimite.reduce((s, c) => s + gastoPor(c.id), 0)
  const pctTotal = totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0

  return (
    <div className="pagina">
      <section className="cartao resumo-orc">
        <Anel pct={pctTotal} tamanho={96} espessura={10}
          cor={pctTotal > 100 ? 'var(--vermelho)' : pctTotal >= 80 ? 'var(--amarelo)' : 'var(--verde)'} />
        <div className="resumo-orc-texto">
          <span className="kpi-rotulo"><Target size={15} /> Orçamento do mês</span>
          {totalLimite > 0 ? (
            <>
              <strong className="mini-valor"><Valor v={totalGasto} /> <span className="de">de {fmt(totalLimite)}</span></strong>
              <span className="kpi-nota">
                {totalGasto > totalLimite
                  ? `Você ultrapassou o orçamento em ${fmt(totalGasto - totalLimite)}`
                  : `Ainda restam ${fmt(totalLimite - totalGasto)} para gastar · ${pctTotal.toFixed(0)}% usado`}
              </span>
            </>
          ) : (
            <span className="kpi-nota">Defina um limite mensal nas categorias abaixo. O limite vale para todos os meses.</span>
          )}
        </div>
      </section>

      <ul className="grade-orc">
        {despesas.map((c) => {
          const limite = orcamentos[c.id] ?? 0
          const gasto = gastoPor(c.id)
          const pct = limite > 0 ? (gasto / limite) * 100 : 0
          const estado = limite === 0 ? '' : pct > 100 ? 'estourado' : pct >= 80 ? 'atencao' : 'ok'
          return (
            <li key={c.id} className="cartao orc-item">
              <div className="orc-topo">
                <IconeCategoria cat={c} tamanho={40} />
                <div className="orc-nome">
                  <strong>{c.nome}</strong>
                  <span className="num">{fmt(gasto)} gasto</span>
                </div>
                {limite > 0 && <span className={`meta-pct ${estado}`}>{pct.toFixed(0)}%</span>}
              </div>
              <div className={`barra ${estado}`}><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
              <label className="orc-input">
                <span>Limite mensal</span>
                <span className="campo-moeda">
                  <em>R$</em>
                  <input
                    inputMode="decimal"
                    defaultValue={limite ? limite.toFixed(2).replace('.', ',') : ''}
                    key={`${c.id}-${limite}`}
                    placeholder="sem limite"
                    onBlur={(e) => definir(c.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </span>
              </label>
              {limite > 0 && (
                <span className={`orc-status ${estado}`}>
                  {gasto > limite ? `Excedeu ${fmt(gasto - limite)}` : `Restam ${fmt(limite - gasto)}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
