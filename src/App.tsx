import { useMemo, useState } from 'react'
import type { Categoria, Lancamento, Orcamentos } from './types'
import { useLocalStorage } from './useLocalStorage'
import { CATEGORIAS_PADRAO, mesAtual, rotuloMes, somarMes, uid } from './utils'
import Painel from './components/Painel'
import Lancamentos from './components/Lancamentos'
import OrcamentosView from './components/Orcamentos'
import Categorias from './components/Categorias'
import Ajustes from './components/Ajustes'
import FormLancamento from './components/FormLancamento'

type Aba = 'painel' | 'lancamentos' | 'orcamentos' | 'categorias' | 'ajustes'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'painel', rotulo: 'Painel' },
  { id: 'lancamentos', rotulo: 'Lançamentos' },
  { id: 'orcamentos', rotulo: 'Orçamentos' },
  { id: 'categorias', rotulo: 'Categorias' },
  { id: 'ajustes', rotulo: 'Backup' },
]

export default function App() {
  const [aba, setAba] = useState<Aba>('painel')
  const [mes, setMes] = useState(mesAtual())
  const [categorias, setCategorias] = useLocalStorage<Categoria[]>('cf:categorias', CATEGORIAS_PADRAO)
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('cf:lancamentos', [])
  const [orcamentos, setOrcamentos] = useLocalStorage<Orcamentos>('cf:orcamentos', {})
  const [editando, setEditando] = useState<Lancamento | null | 'novo'>(null)

  const catPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])

  const salvarLancamento = (l: Lancamento, repetirMeses: number) => {
    setLancamentos((atual) => {
      const existe = atual.some((x) => x.id === l.id)
      const base = existe ? atual.map((x) => (x.id === l.id ? l : x)) : [...atual, l]
      if (existe || repetirMeses <= 1) return base
      const extras: Lancamento[] = []
      const [a, m, d] = l.data.split('-').map(Number)
      for (let i = 1; i < repetirMeses; i++) {
        const ultimoDia = new Date(a, m + i, 0).getDate()
        const alvo = new Date(a, m - 1 + i, Math.min(d, ultimoDia))
        const data = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`
        extras.push({ ...l, id: uid(), data, pago: false })
      }
      return [...base, ...extras]
    })
    setEditando(null)
  }

  const excluirLancamento = (id: string) => {
    if (confirm('Excluir este lançamento?')) setLancamentos((a) => a.filter((x) => x.id !== id))
  }

  const alternarPago = (id: string) =>
    setLancamentos((a) => a.map((x) => (x.id === id ? { ...x, pago: !x.pago } : x)))

  const mostraMes = aba === 'painel' || aba === 'lancamentos' || aba === 'orcamentos'

  return (
    <div className="app">
      <header className="topo">
        <div className="marca">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>Controle Financeiro</span>
        </div>
        <nav className="abas" aria-label="Seções">
          {ABAS.map((a) => (
            <button key={a.id} className={aba === a.id ? 'aba ativa' : 'aba'} onClick={() => setAba(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </nav>
      </header>

      <main className="conteudo">
        {mostraMes && (
          <div className="barra-mes">
            <div className="seletor-mes">
              <button className="btn icone" onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior">‹</button>
              <strong>{rotuloMes(mes, true)}</strong>
              <button className="btn icone" onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês">›</button>
              {mes !== mesAtual() && (
                <button className="btn link" onClick={() => setMes(mesAtual())}>Hoje</button>
              )}
            </div>
            <button className="btn primario" onClick={() => setEditando('novo')}>+ Novo lançamento</button>
          </div>
        )}

        {aba === 'painel' && (
          <Painel mes={mes} lancamentos={lancamentos} catPorId={catPorId} orcamentos={orcamentos}
            onAlternarPago={alternarPago} onEditar={setEditando} />
        )}
        {aba === 'lancamentos' && (
          <Lancamentos mes={mes} lancamentos={lancamentos} categorias={categorias} catPorId={catPorId}
            onEditar={setEditando} onExcluir={excluirLancamento} onAlternarPago={alternarPago} />
        )}
        {aba === 'orcamentos' && (
          <OrcamentosView mes={mes} lancamentos={lancamentos} categorias={categorias}
            orcamentos={orcamentos} setOrcamentos={setOrcamentos} />
        )}
        {aba === 'categorias' && (
          <Categorias categorias={categorias} setCategorias={setCategorias} lancamentos={lancamentos} />
        )}
        {aba === 'ajustes' && (
          <Ajustes categorias={categorias} lancamentos={lancamentos} orcamentos={orcamentos}
            setCategorias={setCategorias} setLancamentos={setLancamentos} setOrcamentos={setOrcamentos} />
        )}
      </main>

      {editando && (
        <FormLancamento
          inicial={editando === 'novo' ? null : editando}
          mesPadrao={mes}
          categorias={categorias}
          onSalvar={salvarLancamento}
          onFechar={() => setEditando(null)}
        />
      )}

      <footer className="rodape">Seus dados ficam salvos neste navegador. Faça backup na aba “Backup”.</footer>
    </div>
  )
}
