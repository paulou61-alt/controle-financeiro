import type { Categoria, Lancamento, Orcamentos as Orc } from '../types'
import { formatBRL, mesDe } from '../utils'

interface Props {
  mes: string
  lancamentos: Lancamento[]
  categorias: Categoria[]
  orcamentos: Orc
  setOrcamentos: (f: (o: Orc) => Orc) => void
}

export default function Orcamentos({ mes, lancamentos, categorias, orcamentos, setOrcamentos }: Props) {
  const despesas = categorias.filter((c) => c.tipo === 'despesa')
  const gastoPor = (id: string) =>
    lancamentos
      .filter((l) => l.tipo === 'despesa' && l.categoriaId === id && mesDe(l.data) === mes)
      .reduce((s, l) => s + l.valor, 0)

  const definir = (id: string, texto: string) => {
    const t = texto.trim()
    const num = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
    setOrcamentos((o) => {
      const novo = { ...o }
      if (!texto.trim() || !Number.isFinite(num) || num <= 0) delete novo[id]
      else novo[id] = num
      return novo
    })
  }

  const totalLimite = despesas.reduce((s, c) => s + (orcamentos[c.id] ?? 0), 0)
  const totalGasto = despesas.filter((c) => orcamentos[c.id]).reduce((s, c) => s + gastoPor(c.id), 0)

  return (
    <div className="bloco">
      <p className="ajuda">Defina um limite mensal para cada categoria de despesa. O limite vale para todos os meses.</p>
      {totalLimite > 0 && (
        <p className="resumo-orc">
          Total orçado: <strong>{formatBRL(totalLimite)}</strong> · Gasto nessas categorias: <strong>{formatBRL(totalGasto)}</strong>
        </p>
      )}
      <ul className="lista-orc">
        {despesas.map((c) => {
          const limite = orcamentos[c.id] ?? 0
          const gasto = gastoPor(c.id)
          const pct = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0
          const estado = limite === 0 ? '' : gasto > limite ? 'estourado' : gasto / limite >= 0.8 ? 'atencao' : 'ok'
          return (
            <li key={c.id}>
              <div className="orc-topo">
                <span className="tag"><span className="bolinha" style={{ background: c.cor }} />{c.nome}</span>
                <label className="orc-input">
                  Limite R$
                  <input
                    inputMode="decimal"
                    defaultValue={limite ? limite.toFixed(2).replace('.', ',') : ''}
                    key={`${c.id}-${limite}`}
                    placeholder="sem limite"
                    onBlur={(e) => definir(c.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </label>
              </div>
              {limite > 0 ? (
                <>
                  <div className={`barra ${estado}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="orc-info">
                    <span>{formatBRL(gasto)} de {formatBRL(limite)}</span>
                    <span>{gasto > limite ? `Excedeu ${formatBRL(gasto - limite)}` : `Restam ${formatBRL(limite - gasto)}`}</span>
                  </div>
                </>
              ) : (
                <div className="orc-info"><span>Gasto no mês: {formatBRL(gasto)}</span></div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
