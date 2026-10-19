import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Plus, Search, type LucideIcon } from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Tipo } from '../types'
import { noPeriodo, rotuloPeriodo, type Periodo } from '../financas'
import { hojeISO } from '../utils'
import { useFmt } from '../ui'
import { FiltroConta, FiltroPeriodo, LinhaLancamento } from './comuns'

interface Props {
  tipo: Tipo
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

interface Grupo {
  id: string
  titulo: string
  icone: LucideIcon
  tom: string
  itens: Lancamento[]
  vazio: string
}

export default function ContasPagarReceber(p: Props) {
  const { tipo, lancamentos, categorias, contas, catPorId, contaPorId, periodo, contaFiltro } = p
  const fmt = useFmt()
  const hoje = hojeISO()
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const pagar = tipo === 'despesa'

  const base = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return lancamentos
      .filter((l) => l.tipo === tipo)
      .filter((l) => !contaFiltro || l.contaId === contaFiltro)
      .filter((l) => !categoria || l.categoriaId === categoria)
      .filter((l) => !q || l.descricao.toLowerCase().includes(q) || (l.contato ?? '').toLowerCase().includes(q))
  }, [lancamentos, tipo, contaFiltro, categoria, busca])

  const porData = (a: Lancamento, b: Lancamento) => a.data.localeCompare(b.data)
  const grupos: Grupo[] = [
    {
      id: 'vencidas', titulo: 'Vencidas', icone: AlertTriangle, tom: 'ruim',
      itens: base.filter((l) => !l.pago && l.data < hoje).sort(porData),
      vazio: 'Nenhuma conta vencida.',
    },
    {
      id: 'hoje', titulo: 'Vencem hoje', icone: CalendarClock, tom: 'atencao',
      itens: base.filter((l) => !l.pago && l.data === hoje),
      vazio: 'Nada vence hoje.',
    },
    {
      id: 'proximas', titulo: 'Próximos vencimentos', icone: Clock, tom: 'neutro',
      itens: base.filter((l) => !l.pago && l.data > hoje && noPeriodo(l.data, periodo)).sort(porData),
      vazio: 'Nenhum vencimento futuro no período.',
    },
    {
      id: 'realizadas', titulo: pagar ? 'Pagas' : 'Recebidas', icone: CheckCircle2, tom: 'bom',
      itens: base.filter((l) => l.pago && noPeriodo(l.dataPagamento, periodo)).sort((a, b) => (b.dataPagamento ?? '').localeCompare(a.dataPagamento ?? '')),
      vazio: pagar ? 'Nenhum pagamento no período.' : 'Nenhum recebimento no período.',
    },
  ]
  const total = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)
  const emAberto = grupos.slice(0, 3).flatMap((g) => g.itens)

  return (
    <div className="pagina">
      <section className="resumo-4">
        {grupos.map((g) => {
          const Icone = g.icone
          return (
            <a key={g.id} href={`#grupo-${g.id}`} className={`cartao mini resumo-${g.tom}`}>
              <span className={`kpi-icone ${g.tom === 'ruim' ? 'vermelho' : g.tom === 'atencao' ? 'amarelo' : g.tom === 'bom' ? 'verde' : 'roxo'}`}><Icone size={18} /></span>
              <div>
                <span className="kpi-rotulo">{g.titulo}</span>
                <strong className="mini-valor num">{fmt(total(g.itens))}</strong>
                <span className="kpi-nota">{g.itens.length} lançamento(s)</span>
              </div>
            </a>
          )
        })}
      </section>

      <section className="cartao">
        <div className="cartao-cab">
          <h3>Total em aberto: <span className={`num ${pagar ? 'despesa' : 'receita'}`}>{fmt(total(emAberto))}</span></h3>
          <button className={`btn ${pagar ? 'acao-despesa' : 'acao-receita'}`} onClick={() => p.onNovo(tipo)}>
            <Plus size={16} /> {pagar ? 'Nova despesa' : 'Nova receita'}
          </button>
        </div>
        <div className="filtros">
          <label className="busca">
            <Search size={17} />
            <input type="search" placeholder={`Buscar por descrição ou ${pagar ? 'fornecedor' : 'cliente'}…`} value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
          </label>
          <FiltroPeriodo periodo={periodo} onChange={p.setPeriodo} />
          <FiltroConta contas={contas} valor={contaFiltro} onChange={p.setContaFiltro} />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categorias.filter((c) => c.tipo === tipo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <p className="kpi-nota nota-filtro">
          Vencidas aparecem sempre, independentemente do período. Próximos vencimentos e {pagar ? 'pagas' : 'recebidas'} seguem o período: {rotuloPeriodo(periodo)}.
        </p>

        <div className="grupos">
          {grupos.map((g) => {
            const Icone = g.icone
            return (
              <div key={g.id} id={`grupo-${g.id}`} className={`grupo grupo-${g.tom}`}>
                <div className="grupo-cab destaque">
                  <span><Icone size={15} /> {g.titulo} ({g.itens.length})</span>
                  <span className="num">{fmt(total(g.itens))}</span>
                </div>
                {g.itens.length === 0 ? (
                  <p className="vazio">{g.vazio}</p>
                ) : (
                  <ul className="lista-mov">
                    {g.itens.map((l) => (
                      <LinhaLancamento key={l.id} l={l} cat={catPorId.get(l.categoriaId)} conta={contaPorId.get(l.contaId)} mostrarData
                        onBaixa={p.onBaixa} onReverter={p.onReverter} onEditar={p.onEditar} onExcluir={p.onExcluir} />
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
