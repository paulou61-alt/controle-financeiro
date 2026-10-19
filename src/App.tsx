import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Cloud, CloudOff, Eye, EyeOff, HandCoins,
  Landmark, LayoutDashboard, List, Loader2, LogOut, Menu, Moon, Plus, Receipt, Settings, Sparkles, Sun, Tags, Target,
  Trash2, Undo2, X,
  type LucideIcon,
} from 'lucide-react'
import type { Backup, Categoria, ContaFinanceira, Lancamento, Orcamentos, Tipo, Transferencia } from './types'
import { useLocalStorage } from './useLocalStorage'
import { contaPrincipal, normalizarDados, type Dados, type StatusNuvem } from './useDadosNuvem'
import { CATEGORIAS_PADRAO, hojeISO, mesAtual, rotuloMes, saudacao, somarMes, uid } from './utils'
import { gerarExemplo } from './exemplo'
import { periodoDoPreset, rotuloPeriodo, saldoConta, temHistorico, type Periodo } from './financas'
import { PrivacidadeContext } from './ui'
import Dashboard from './components/Dashboard'
import Lancamentos from './components/Lancamentos'
import ContasPagarReceber from './components/ContasPagarReceber'
import ContasFinanceiras from './components/ContasFinanceiras'
import OrcamentosView from './components/Orcamentos'
import CategoriasView from './components/Categorias'
import Ajustes from './components/Ajustes'
import FormLancamento from './components/FormLancamento'
import FormTransferencia from './components/FormTransferencia'
import FormConta from './components/FormConta'

export type Aba = 'painel' | 'lancamentos' | 'pagar' | 'receber' | 'contas' | 'orcamentos' | 'categorias' | 'ajustes'
export type Tema = 'sistema' | 'claro' | 'escuro'

const ABAS: { id: Aba; rotulo: string; curto: string; icone: LucideIcon }[] = [
  { id: 'painel', rotulo: 'Dashboard', curto: 'Início', icone: LayoutDashboard },
  { id: 'lancamentos', rotulo: 'Lançamentos', curto: 'Lançam.', icone: List },
  { id: 'pagar', rotulo: 'Contas a pagar', curto: 'Pagar', icone: Receipt },
  { id: 'receber', rotulo: 'Contas a receber', curto: 'Receber', icone: HandCoins },
  { id: 'contas', rotulo: 'Contas financeiras', curto: 'Contas', icone: Landmark },
  { id: 'orcamentos', rotulo: 'Orçamentos', curto: 'Metas', icone: Target },
  { id: 'categorias', rotulo: 'Categorias', curto: 'Categ.', icone: Tags },
  { id: 'ajustes', rotulo: 'Configurações', curto: 'Ajustes', icone: Settings },
]
const NO_MENU_INFERIOR: Aba[] = ['painel', 'lancamentos', 'pagar', 'receber']

const SUBTITULOS: Record<Aba, string> = {
  painel: '',
  lancamentos: 'Receitas e despesas: cadastre, consulte, dê baixa e edite',
  pagar: 'Despesas pendentes, vencidas e pagas',
  receber: 'Receitas pendentes, em atraso e recebidas',
  contas: 'Bancos, caixa e carteiras digitais, com saldo e transferências',
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

type Atualizacao<T> = T | ((v: T) => T)

function IndicadorNuvem({ status, onTentar }: { status: StatusNuvem; onTentar: () => void }) {
  if (status === 'erro-salvar')
    return (
      <button className="nuvem erro" onClick={onTentar} title="Clique para tentar salvar de novo">
        <CloudOff size={15} /> <span>Não salvo · tentar de novo</span>
      </button>
    )
  return (
    <span className={`nuvem ${status === 'salvando' ? 'salvando' : ''}`} title="Seus dados são salvos automaticamente na nuvem">
      {status === 'salvando' ? <Loader2 size={15} className="girar" /> : <Cloud size={15} />}
      <span>{status === 'salvando' ? 'Salvando…' : 'Salvo na nuvem'}</span>
    </span>
  )
}

interface Props {
  dados: Dados
  setDados: (f: (d: Dados) => Dados) => void
  status: StatusNuvem
  emDemo: boolean
  onEntrarDemo: () => void
  onSairDemo: () => void
  onTentarSalvar: () => void
  email: string
  onSair: () => void
}

/** Contas criadas pelo gerador de exemplo (versões anteriores gravavam o exemplo na conta) */
const ehContaExemplo = (c: ContaFinanceira) => c.id.endsWith('-exemplo')

type EdicaoLancamento = { inicial: Lancamento | null; tipo: Tipo }

export default function App({ dados, setDados, status, emDemo, onEntrarDemo, onSairDemo, onTentarSalvar, email, onSair }: Props) {
  const [aba, setAbaEstado] = useState<Aba>('painel')
  const [mes, setMes] = useState(mesAtual())
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDoPreset('mes'))
  const [contaFiltro, setContaFiltro] = useState('')
  const [maisAberto, setMaisAberto] = useState(false)
  const [fabAberto, setFabAberto] = useState(false)
  const [editando, setEditando] = useState<EdicaoLancamento | null>(null)
  const [editandoConta, setEditandoConta] = useState<ContaFinanceira | null | 'nova'>(null)
  const [transferindo, setTransferindo] = useState<{ origem?: string } | null>(null)
  const [tema, setTema] = useLocalStorage<Tema>('cf:tema', 'sistema')
  const [oculto, setOculto] = useLocalStorage('cf:oculto', false)
  const escuro = usaTemaEscuro(tema)

  const { categorias, lancamentos, orcamentos, nome, contas, transferencias } = dados
  const campo = <K extends keyof Dados>(k: K) => (v: Atualizacao<Dados[K]>) =>
    setDados((d) => ({ ...d, [k]: typeof v === 'function' ? (v as (x: Dados[K]) => Dados[K])(d[k]) : v }))
  const setCategorias = campo('categorias') as (v: Atualizacao<Categoria[]>) => void
  const setLancamentos = campo('lancamentos') as (v: Atualizacao<Lancamento[]>) => void
  const setOrcamentos = campo('orcamentos') as (v: Atualizacao<Orcamentos>) => void
  const setContas = campo('contas') as (v: Atualizacao<ContaFinanceira[]>) => void
  const setTransferencias = campo('transferencias') as (v: Atualizacao<Transferencia[]>) => void
  const setNome = campo('nome') as (v: string) => void

  const setAba = (a: Aba) => {
    setAbaEstado(a)
    setMaisAberto(false)
    window.scrollTo({ top: 0 })
  }
  const sair = () => {
    if (status === 'salvando' && !confirm('Ainda estamos salvando suas alterações. Sair mesmo assim?')) return
    onSair()
  }
  const iniciais = (nome.trim() || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')

  const catPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const contaPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas])
  const contatos = useMemo(() => [...new Set(lancamentos.map((l) => l.contato).filter((c): c is string => !!c))].sort(), [lancamentos])
  const hoje = hojeISO()
  const vencidasPagar = lancamentos.filter((l) => !l.pago && l.tipo === 'despesa' && l.data < hoje).length
  const atrasadasReceber = lancamentos.filter((l) => !l.pago && l.tipo === 'receita' && l.data < hoje).length
  const badges: Partial<Record<Aba, number>> = { pagar: vencidasPagar, receber: atrasadasReceber }

  /* ---------- Lançamentos ---------- */

  const novo = (tipo: Tipo) => {
    setFabAberto(false)
    setEditando({ inicial: null, tipo })
  }

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
        extras.push({ ...l, id: uid(), data, pago: false, dataPagamento: undefined })
      }
      return [...base, ...extras]
    })
    setEditando(null)
  }

  const excluirLancamento = (id: string) => {
    const l = lancamentos.find((x) => x.id === id)
    if (l && confirm(`Excluir "${l.descricao}"? Essa ação não pode ser desfeita.`)) setLancamentos((a) => a.filter((x) => x.id !== id))
  }

  const darBaixa = (id: string) =>
    setLancamentos((a) => a.map((x) => (x.id === id ? { ...x, pago: true, dataPagamento: hojeISO() } : x)))

  const reverterBaixa = (id: string) => {
    const l = lancamentos.find((x) => x.id === id)
    if (!l) return
    if (!confirm(`Reverter a baixa de "${l.descricao}"? Ele voltará a ficar pendente.`)) return
    setLancamentos((a) => a.map((x) => (x.id === id ? { ...x, pago: false, dataPagamento: undefined } : x)))
  }

  /* ---------- Contas e transferências ---------- */

  const salvarConta = (c: ContaFinanceira) => {
    setContas((cs) => (cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : [...cs, c]))
    setEditandoConta(null)
  }

  const arquivarConta = (c: ContaFinanceira) => {
    if (c.arquivada) return setContas((cs) => cs.map((x) => (x.id === c.id ? { ...x, arquivada: false } : x)))
    if (contas.filter((x) => !x.arquivada).length <= 1) return alert('Você precisa manter pelo menos uma conta ativa.')
    const saldo = saldoConta(c, lancamentos, transferencias)
    const pendentes = lancamentos.filter((l) => l.contaId === c.id && !l.pago).length
    const avisos = [
      saldo !== 0 ? `ainda tem saldo de ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '',
      pendentes ? `tem ${pendentes} lançamento(s) pendente(s)` : '',
    ].filter(Boolean)
    const msg = `Arquivar "${c.nome}"? O histórico será preservado, mas ela não aparecerá para novos lançamentos.${avisos.length ? `\n\nAtenção: a conta ${avisos.join(' e ')}.` : ''}`
    if (confirm(msg)) {
      setContas((cs) => cs.map((x) => (x.id === c.id ? { ...x, arquivada: true } : x)))
      if (contaFiltro === c.id) setContaFiltro('')
    }
  }

  const excluirConta = (c: ContaFinanceira) => {
    if (temHistorico(c.id, lancamentos, transferencias)) return alert('Esta conta tem movimentações. Arquive-a para preservar o histórico.')
    if (contas.length <= 1) return alert('Você precisa ter pelo menos uma conta.')
    if (confirm(`Excluir a conta "${c.nome}"?`)) {
      setContas((cs) => cs.filter((x) => x.id !== c.id))
      if (contaFiltro === c.id) setContaFiltro('')
    }
  }

  const transferir = (origem?: string) => {
    setFabAberto(false)
    if (contas.filter((c) => !c.arquivada).length < 2) {
      if (confirm('Para transferir, você precisa de pelo menos duas contas ativas. Cadastrar uma nova conta agora?')) setEditandoConta('nova')
      return
    }
    setTransferindo({ origem })
  }

  const salvarTransferencia = (t: Transferencia) => {
    setTransferencias((ts) => [...ts, t])
    setTransferindo(null)
  }

  const excluirTransferencia = (id: string) => {
    if (confirm('Excluir esta transferência? Os saldos das duas contas serão recalculados.')) setTransferencias((ts) => ts.filter((t) => t.id !== id))
  }

  /* ---------- Dados ---------- */

  const resetarFiltros = () => {
    setContaFiltro('')
    setPeriodo(periodoDoPreset('mes'))
    setAba('painel')
  }

  const carregarExemplo = () => {
    onEntrarDemo()
    resetarFiltros()
  }

  const sairDemo = () => {
    onSairDemo()
    resetarFiltros()
  }

  const contasExemplo = emDemo ? [] : contas.filter(ehContaExemplo)
  const removerExemplo = () => {
    const ids = new Set(contasExemplo.map((c) => c.id))
    const qtd = lancamentos.filter((l) => ids.has(l.contaId)).length
    const nomes = contasExemplo.map((c) => `"${c.nome}"`).join(', ')
    if (!confirm(`Remover os dados de exemplo?\n\nSerão apagados ${qtd} lançamento(s), as transferências e as contas ${nomes}. Se você lançou algo seu nessas contas, também será removido.`)) return
    const orcExemplo = JSON.stringify(gerarExemplo().orcamentos)
    setDados((d) => {
      const restantes = d.contas.filter((c) => !ids.has(c.id))
      return {
        ...d,
        contas: restantes.length ? restantes : [contaPrincipal()],
        lancamentos: d.lancamentos.filter((l) => !ids.has(l.contaId)),
        transferencias: d.transferencias.filter((t) => !ids.has(t.origemId) && !ids.has(t.destinoId)),
        orcamentos: JSON.stringify(d.orcamentos) === orcExemplo ? {} : d.orcamentos,
      }
    })
    resetarFiltros()
  }

  const importar = (b: Partial<Backup>) => setDados((d) => normalizarDados({ ...b, nome: d.nome }, d.nome))
  const apagarTudo = () => {
    setDados((d) => ({ ...d, categorias: CATEGORIAS_PADRAO, lancamentos: [], orcamentos: {}, contas: [contaPrincipal()], transferencias: [] }))
    setContaFiltro('')
  }

  /* ---------- Layout ---------- */

  const atual = ABAS.find((a) => a.id === aba)!
  const primeiroNome = nome.trim().split(' ')[0]
  const titulo = aba === 'painel' ? `${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''}!` : atual.rotulo
  const subtitulo = aba === 'painel' ? `Visão do caixa · ${rotuloPeriodo(periodo).toLowerCase()}` : SUBTITULOS[aba]
  const propsLista = {
    lancamentos, categorias, contas, catPorId, contaPorId, periodo, setPeriodo, contaFiltro, setContaFiltro,
    onEditar: (l: Lancamento) => setEditando({ inicial: l, tipo: l.tipo }),
    onExcluir: excluirLancamento, onBaixa: darBaixa, onReverter: reverterBaixa, onNovo: novo,
  }

  const itemMenu = (a: (typeof ABAS)[number]) => {
    const Icone = a.icone
    const badge = badges[a.id] ?? 0
    return (
      <button key={a.id} className={aba === a.id ? 'menu-item ativo' : 'menu-item'} onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
        <Icone size={20} strokeWidth={2} />
        <span>{a.rotulo}</span>
        {badge > 0 && <em className="badge ruim" title="Vencidas">{badge}</em>}
      </button>
    )
  }

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
            <span className="menu-titulo">Financeiro</span>
            {ABAS.slice(0, 5).map(itemMenu)}
            <span className="menu-titulo espaco">Organização</span>
            {ABAS.slice(5).map(itemMenu)}
          </nav>

          <div className="lateral-rodape">
            <div className="seletor-tema" role="group" aria-label="Tema">
              <button className={!escuro ? 'ativo' : ''} onClick={() => setTema('claro')}><Sun size={16} /> Claro</button>
              <button className={escuro ? 'ativo' : ''} onClick={() => setTema('escuro')}><Moon size={16} /> Escuro</button>
            </div>
            <div className="usuario">
              <span className="avatar">{iniciais || '?'}</span>
              <div>
                <strong>{nome.trim() || 'Minha conta'}</strong>
                <span>{email}</span>
              </div>
              <button className="btn-icone pequeno" onClick={sair} aria-label="Sair da conta" title="Sair"><LogOut size={17} /></button>
            </div>
          </div>
        </aside>

        <div className="principal">
          {emDemo && (
            <div className="faixa-demo" role="status">
              <Sparkles size={18} />
              <span><strong>Modo demonstração.</strong> Estes são dados de exemplo e nada aqui é salvo na sua conta.</span>
              <button className="btn pequeno claro" onClick={sairDemo}><Undo2 size={15} /> Voltar para meus dados</button>
            </div>
          )}
          {contasExemplo.length > 0 && (
            <div className="faixa-demo aviso" role="status">
              <Sparkles size={18} />
              <span><strong>Sua conta contém dados de exemplo.</strong> Remova-os para começar com os seus dados reais.</span>
              <button className="btn pequeno claro" onClick={removerExemplo}><Trash2 size={15} /> Remover dados de exemplo</button>
            </div>
          )}
          <header className="cabecalho">
            <div className="cab-titulo">
              <h1>{titulo}</h1>
              <p>{subtitulo}</p>
            </div>
            <div className="cab-acoes">
              <IndicadorNuvem status={status} onTentar={onTentarSalvar} />
              {aba === 'orcamentos' && (
                <div className="seletor-mes">
                  <button onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
                  <button className="mes-atual" onClick={() => setMes(mesAtual())} title="Voltar ao mês atual">{rotuloMes(mes, true)}</button>
                  <button onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={18} /></button>
                </div>
              )}
              <button className="btn-icone" onClick={() => setOculto(!oculto)} aria-label={oculto ? 'Mostrar valores' : 'Ocultar valores'} title={oculto ? 'Mostrar valores' : 'Ocultar valores'}>
                {oculto ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
              <button className="btn-icone so-celular" onClick={() => setTema(escuro ? 'claro' : 'escuro')} aria-label="Alternar tema">
                {escuro ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              {aba !== 'painel' && (
                <button className="btn primario so-desktop" onClick={() => novo(aba === 'receber' ? 'receita' : 'despesa')}>
                  <Plus size={18} /> Novo lançamento
                </button>
              )}
            </div>
          </header>

          <main className="conteudo" key={aba}>
            {aba === 'painel' && (
              <Dashboard lancamentos={lancamentos} transferencias={transferencias} contas={contas} catPorId={catPorId} contaPorId={contaPorId}
                orcamentos={orcamentos} periodo={periodo} setPeriodo={setPeriodo} contaFiltro={contaFiltro} setContaFiltro={setContaFiltro}
                onBaixa={darBaixa} onReverter={reverterBaixa} onEditar={propsLista.onEditar} onNovo={novo} onTransferir={() => transferir()}
                onIr={setAba} onCarregarExemplo={carregarExemplo} />
            )}
            {aba === 'lancamentos' && <Lancamentos {...propsLista} />}
            {aba === 'pagar' && <ContasPagarReceber tipo="despesa" {...propsLista} />}
            {aba === 'receber' && <ContasPagarReceber tipo="receita" {...propsLista} />}
            {aba === 'contas' && (
              <ContasFinanceiras contas={contas} lancamentos={lancamentos} transferencias={transferencias}
                onNovaConta={() => setEditandoConta('nova')} onEditarConta={setEditandoConta} onArquivar={arquivarConta}
                onExcluirConta={excluirConta} onTransferir={transferir} onExcluirTransferencia={excluirTransferencia} />
            )}
            {aba === 'orcamentos' && (
              <OrcamentosView mes={mes} lancamentos={lancamentos} categorias={categorias} orcamentos={orcamentos} setOrcamentos={setOrcamentos} />
            )}
            {aba === 'categorias' && <CategoriasView categorias={categorias} setCategorias={setCategorias} lancamentos={lancamentos} />}
            {aba === 'ajustes' && (
              <Ajustes categorias={categorias} lancamentos={lancamentos} orcamentos={orcamentos} contas={contas} transferencias={transferencias}
                onImportar={importar} onApagarTudo={apagarTudo}
                nome={nome} setNome={setNome} tema={tema} setTema={setTema} onCarregarExemplo={carregarExemplo}
                email={email} onSair={sair} />
            )}
          </main>
        </div>

        {/* Navegação no celular */}
        <nav className="menu-inferior" aria-label="Menu">
          {ABAS.filter((a) => NO_MENU_INFERIOR.includes(a.id)).map((a) => {
            const Icone = a.icone
            const badge = badges[a.id] ?? 0
            return (
              <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
                <span className="mi-icone"><Icone size={21} />{badge > 0 && <i className="ponto" />}</span>
                <span>{a.curto}</span>
              </button>
            )
          })}
          <button className={!NO_MENU_INFERIOR.includes(aba) ? 'ativo' : ''} onClick={() => setMaisAberto(true)}>
            <span className="mi-icone"><Menu size={21} /></span>
            <span>Mais</span>
          </button>
        </nav>

        {maisAberto && (
          <div className="modal-fundo" onClick={() => setMaisAberto(false)}>
            <div className="modal folha-mais" onClick={(e) => e.stopPropagation()}>
              <div className="modal-cab">
                <h2>Menu</h2>
                <button className="btn-icone pequeno" onClick={() => setMaisAberto(false)} aria-label="Fechar"><X size={18} /></button>
              </div>
              <div className="grade-mais">
                {ABAS.filter((a) => !NO_MENU_INFERIOR.includes(a.id)).map((a) => {
                  const Icone = a.icone
                  return (
                    <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>
                      <Icone size={22} /> {a.rotulo}
                    </button>
                  )
                })}
              </div>
              <div className="usuario">
                <span className="avatar">{iniciais || '?'}</span>
                <div><strong>{nome.trim() || 'Minha conta'}</strong><span>{email}</span></div>
                <button className="btn pequeno perigo" onClick={sair}><LogOut size={15} /> Sair</button>
              </div>
            </div>
          </div>
        )}

        {fabAberto && <div className="fab-fundo" onClick={() => setFabAberto(false)} />}
        <div className={`fab-grupo ${fabAberto ? 'aberto' : ''}`}>
          {fabAberto && (
            <div className="fab-opcoes">
              <button onClick={() => novo('receita')}><span className="kpi-icone verde"><ArrowUpRight size={18} /></span> Nova receita</button>
              <button onClick={() => novo('despesa')}><span className="kpi-icone vermelho"><ArrowDownRight size={18} /></span> Nova despesa</button>
              <button onClick={() => transferir()}><span className="kpi-icone roxo"><ArrowLeftRight size={18} /></span> Transferir</button>
            </div>
          )}
          <button className="fab" onClick={() => setFabAberto(!fabAberto)} aria-label={fabAberto ? 'Fechar' : 'Novo lançamento'} aria-expanded={fabAberto}>
            {fabAberto ? <X size={26} /> : <Plus size={26} />}
          </button>
        </div>

        {editando && (
          <FormLancamento
            inicial={editando.inicial}
            tipoInicial={editando.tipo}
            contaInicial={contaFiltro}
            categorias={categorias}
            contas={contas}
            contatos={contatos}
            onSalvar={salvarLancamento}
            onFechar={() => setEditando(null)}
          />
        )}
        {editandoConta && (
          <FormConta inicial={editandoConta === 'nova' ? null : editandoConta} onSalvar={salvarConta} onFechar={() => setEditandoConta(null)} />
        )}
        {transferindo && (
          <FormTransferencia contas={contas} lancamentos={lancamentos} transferencias={transferencias} origemInicial={transferindo.origem ?? contaFiltro}
            onSalvar={salvarTransferencia} onFechar={() => setTransferindo(null)} />
        )}
      </div>
    </PrivacidadeContext.Provider>
  )
}
