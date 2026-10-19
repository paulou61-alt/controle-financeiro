import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight, ChevronLeft, ChevronRight, Eye, EyeOff, LayoutDashboard, Moon, Plus, Settings,
  ShieldCheck, Sun, Tags, Target, type LucideIcon,
} from 'lucide-react'
import type { Categoria, Lancamento, Orcamentos } from './types'
import { useLocalStorage } from './useLocalStorage'
import {
  CATEGORIAS_PADRAO, gerarExemplo, hojeISO, mesAtual, mesDe, rotuloMes, saudacao, somarMes, uid,
} from './utils'
import { PrivacidadeContext } from './ui'
import Dashboard from './components/Dashboard'
import Lancamentos from './components/Lancamentos'
import OrcamentosView from './components/Orcamentos'
import CategoriasView from './components/Categorias'
import Ajustes from './components/Ajustes'
import FormLancamento from './components/FormLancamento'

export type Aba = 'painel' | 'lancamentos' | 'orcamentos' | 'categorias' | 'ajustes'
export type Tema = 'sistema' | 'claro' | 'escuro'

const ABAS: { id: Aba; rotulo: string; curto: string; icone: LucideIcon }[] = [
  { id: 'painel', rotulo: 'Dashboard', curto: 'Início', icone: LayoutDashboard },
  { id: 'lancamentos', rotulo: 'Lançamentos', curto: 'Lançam.', icone: ArrowLeftRight },
  { id: 'orcamentos', rotulo: 'Orçamentos', curto: 'Metas', icone: Target },
  { id: 'categorias', rotulo: 'Categorias', curto: 'Categ.', icone: Tags },
  { id: 'ajustes', rotulo: 'Configurações', curto: 'Ajustes', icone: Settings },
]

const SUBTITULOS: Record<Aba, string> = {
  painel: '',
  lancamentos: 'Todas as suas entradas e saídas do mês',
  orcamentos: 'Limites mensais para manter os gastos sob controle',
  categorias: 'Organize suas receitas e despesas do seu jeito',
  ajustes: 'Perfil, aparência e backup dos seus dados',
}

function usaTemaEscuro(tema: Tema) {
  const [sistemaEscuro, setSistemaEscuro] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const f = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  const escuro = tema === 'escuro' || (tema === 'sistema' && sistemaEscuro)
  useEffect(() => {
    document.documentElement.dataset.theme = escuro ? 'escuro' : 'claro'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0b0f1c' : '#f3f5fb')
  }, [escuro])
  return escuro
}

export default function App() {
  const [aba, setAba] = useState<Aba>('painel')
  const [mes, setMes] = useState(mesAtual())
  const [categorias, setCategorias] = useLocalStorage<Categoria[]>('cf:categorias', CATEGORIAS_PADRAO)
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('cf:lancamentos', [])
  const [orcamentos, setOrcamentos] = useLocalStorage<Orcamentos>('cf:orcamentos', {})
  const [nome, setNome] = useLocalStorage('cf:nome', '')
  const [tema, setTema] = useLocalStorage<Tema>('cf:tema', 'sistema')
  const [oculto, setOculto] = useLocalStorage('cf:oculto', false)
  const [editando, setEditando] = useState<Lancamento | null | 'novo'>(null)
  const escuro = usaTemaEscuro(tema)

  const catPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const pendentesMes = lancamentos.filter((l) => !l.pago && mesDe(l.data) === mesAtual()).length
  const vencidas = lancamentos.filter((l) => !l.pago && l.tipo === 'despesa' && l.data < hojeISO()).length

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

  const carregarExemplo = () => {
    if (lancamentos.length && !confirm('Substituir seus dados atuais pelos dados de exemplo?')) return
    const ex = gerarExemplo()
    setCategorias(CATEGORIAS_PADRAO)
    setLancamentos(ex.lancamentos)
    setOrcamentos(ex.orcamentos)
    setMes(mesAtual())
    setAba('painel')
  }

  const mostraMes = aba === 'painel' || aba === 'lancamentos' || aba === 'orcamentos'
  const atual = ABAS.find((a) => a.id === aba)!
  const primeiroNome = nome.trim().split(' ')[0]
  const titulo = aba === 'painel' ? `${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''}!` : atual.rotulo
  const subtitulo = aba === 'painel' ? `Este é o resumo de ${rotuloMes(mes, true).toLowerCase()}` : SUBTITULOS[aba]

  return (
    <PrivacidadeContext.Provider value={oculto}>
      <div className="layout">
        <aside className="lateral">
          <div className="marca">
            <img src="/favicon.svg" alt="" width={36} height={36} />
            <div>
              <strong>Finanças</strong>
              <span>Controle Financeiro</span>
            </div>
          </div>

          <nav className="menu" aria-label="Menu principal">
            <span className="menu-titulo">Menu</span>
            {ABAS.map((a) => {
              const Icone = a.icone
              const badge = a.id === 'lancamentos' && pendentesMes > 0 ? pendentesMes : 0
              return (
                <button key={a.id} className={aba === a.id ? 'menu-item ativo' : 'menu-item'} onClick={() => setAba(a.id)}
                  aria-current={aba === a.id ? 'page' : undefined}>
                  <Icone size={20} strokeWidth={2} />
                  <span>{a.rotulo}</span>
                  {badge > 0 && <em className={vencidas ? 'badge ruim' : 'badge'}>{badge}</em>}
                </button>
              )
            })}
          </nav>

          <div className="lateral-rodape">
            <div className="cartao-seguro">
              <ShieldCheck size={22} />
              <strong>Dados 100% privados</strong>
              <span>Tudo fica salvo apenas no seu navegador.</span>
              <button className="btn pequeno claro" onClick={() => setAba('ajustes')}>Fazer backup</button>
            </div>
            <div className="seletor-tema" role="group" aria-label="Tema">
              <button className={!escuro ? 'ativo' : ''} onClick={() => setTema('claro')}><Sun size={16} /> Claro</button>
              <button className={escuro ? 'ativo' : ''} onClick={() => setTema('escuro')}><Moon size={16} /> Escuro</button>
            </div>
          </div>
        </aside>

        <div className="principal">
          <header className="cabecalho">
            <div className="cab-titulo">
              <h1>{titulo}</h1>
              <p>{subtitulo}</p>
            </div>
            <div className="cab-acoes">
              {mostraMes && (
                <div className="seletor-mes">
                  <button onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
                  <button className="mes-atual" onClick={() => setMes(mesAtual())} title="Voltar ao mês atual">
                    {rotuloMes(mes, true)}
                  </button>
                  <button onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={18} /></button>
                </div>
              )}
              <button className="btn-icone" onClick={() => setOculto(!oculto)} aria-label={oculto ? 'Mostrar valores' : 'Ocultar valores'} title={oculto ? 'Mostrar valores' : 'Ocultar valores'}>
                {oculto ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
              <button className="btn-icone so-celular" onClick={() => setTema(escuro ? 'claro' : 'escuro')} aria-label="Alternar tema">
                {escuro ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <button className="btn primario so-desktop" onClick={() => setEditando('novo')}><Plus size={18} /> Novo lançamento</button>
            </div>
          </header>

          <main className="conteudo" key={aba}>
            {aba === 'painel' && (
              <Dashboard mes={mes} lancamentos={lancamentos} catPorId={catPorId} orcamentos={orcamentos}
                onAlternarPago={alternarPago} onEditar={setEditando} onNovo={() => setEditando('novo')}
                onVerTodos={() => setAba('lancamentos')} onCarregarExemplo={carregarExemplo} />
            )}
            {aba === 'lancamentos' && (
              <Lancamentos mes={mes} lancamentos={lancamentos} categorias={categorias} catPorId={catPorId}
                onEditar={setEditando} onExcluir={excluirLancamento} onAlternarPago={alternarPago} onNovo={() => setEditando('novo')} />
            )}
            {aba === 'orcamentos' && (
              <OrcamentosView mes={mes} lancamentos={lancamentos} categorias={categorias}
                orcamentos={orcamentos} setOrcamentos={setOrcamentos} />
            )}
            {aba === 'categorias' && (
              <CategoriasView categorias={categorias} setCategorias={setCategorias} lancamentos={lancamentos} />
            )}
            {aba === 'ajustes' && (
              <Ajustes categorias={categorias} lancamentos={lancamentos} orcamentos={orcamentos}
                setCategorias={setCategorias} setLancamentos={setLancamentos} setOrcamentos={setOrcamentos}
                nome={nome} setNome={setNome} tema={tema} setTema={setTema} onCarregarExemplo={carregarExemplo} />
            )}
          </main>
        </div>

        <nav className="menu-inferior" aria-label="Menu">
          {ABAS.map((a) => {
            const Icone = a.icone
            return (
              <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
                <Icone size={21} />
                <span>{a.curto}</span>
              </button>
            )
          })}
        </nav>
        <button className="fab" onClick={() => setEditando('novo')} aria-label="Novo lançamento"><Plus size={26} /></button>

        {editando && (
          <FormLancamento
            inicial={editando === 'novo' ? null : editando}
            mesPadrao={mes}
            categorias={categorias}
            onSalvar={salvarLancamento}
            onFechar={() => setEditando(null)}
          />
        )}
      </div>
    </PrivacidadeContext.Provider>
  )
}
