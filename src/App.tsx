import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, BarChart3, ChevronLeft, ChevronRight, Cloud, CloudOff, Eye, EyeOff, FileSpreadsheet, Flag, HandCoins,
  Landmark, CreditCard, LayoutDashboard, Lightbulb, List, Loader2, LogOut, Menu, Moon, Plus, Receipt, Settings, Sparkles, Sun, Tags, Target, Users,
  Trash2, Undo2, UserCheck, X,
  type LucideIcon,
} from 'lucide-react'
import type { Backup, Categoria, ContaFinanceira, Contato, Lancamento, Meta, Orcamentos, Perfil, Tipo, TipoConta, Transferencia } from './types'
import { useLocalStorage } from './useLocalStorage'
import { contaPrincipal, normalizarDados, type Dados, type StatusNuvem } from './useDadosNuvem'
import { CATEGORIAS_PADRAO, formatData, hojeISO, mesAtual, rotuloMes, saudacao, somarMes, uid } from './utils'
import { gerarExemplo } from './exemplo'
import { ehCartao, faturasDoCartao, periodoDoPreset, resumoCartao, rotuloPeriodo, saldoConta, temHistorico, type Fatura, type Periodo } from './financas'
import { ajustarParaConta, aplicarEdicao, aplicarExclusao, criarLancamentos, estenderSeries, type Escopo, type Repeticao } from './series'
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
import FormPagarFatura from './components/FormPagarFatura'
import CartoesCredito from './components/CartoesCredito'
import ImportarExtrato from './components/ImportarExtrato'
import { EscolhaEscopo } from './components/comuns'
import ContatosView from './components/Contatos'
import FormContato from './components/FormContato'
import Relatorios from './components/Relatorios'
import DreView from './components/Dre'
import MetasView from './components/Metas'
import type { Regime } from './analise'
import { diasDeTeste, gerenciarAssinatura, type Acesso } from './acesso'
import Planos from './components/Planos'
import Sugestoes, { EMAIL_DONO } from './components/Sugestoes'
import UsuariosView from './components/Usuarios'
import { supabase } from './supabase'

export type Aba =
  | 'painel' | 'lancamentos' | 'pagar' | 'receber' | 'contas' | 'cartoes' | 'relatorios' | 'dre' | 'metas' | 'orcamentos'
  | 'contatos' | 'categorias' | 'planos' | 'sugestoes' | 'usuarios' | 'ajustes'
export type Tema = 'sistema' | 'claro' | 'escuro'

type Secao = 'Financeiro' | 'Análise' | 'Organização'
const ABAS: { id: Aba; rotulo: string; curto: string; icone: LucideIcon; secao: Secao }[] = [
  { id: 'painel', rotulo: 'Dashboard', curto: 'Início', icone: LayoutDashboard, secao: 'Financeiro' },
  { id: 'lancamentos', rotulo: 'Lançamentos', curto: 'Lançam.', icone: List, secao: 'Financeiro' },
  { id: 'pagar', rotulo: 'Contas a pagar', curto: 'Pagar', icone: Receipt, secao: 'Financeiro' },
  { id: 'receber', rotulo: 'Contas a receber', curto: 'Receber', icone: HandCoins, secao: 'Financeiro' },
  { id: 'contas', rotulo: 'Contas financeiras', curto: 'Contas', icone: Landmark, secao: 'Financeiro' },
  { id: 'cartoes', rotulo: 'Cartões de crédito', curto: 'Cartões', icone: CreditCard, secao: 'Financeiro' },
  { id: 'relatorios', rotulo: 'Relatórios', curto: 'Relatórios', icone: BarChart3, secao: 'Análise' },
  { id: 'dre', rotulo: 'DRE', curto: 'DRE', icone: FileSpreadsheet, secao: 'Análise' },
  { id: 'metas', rotulo: 'Metas', curto: 'Metas', icone: Flag, secao: 'Análise' },
  { id: 'orcamentos', rotulo: 'Orçamentos', curto: 'Orçam.', icone: Target, secao: 'Análise' },
  { id: 'contatos', rotulo: 'Clientes e fornecedores', curto: 'Contatos', icone: Users, secao: 'Organização' },
  { id: 'categorias', rotulo: 'Categorias', curto: 'Categ.', icone: Tags, secao: 'Organização' },
  { id: 'planos', rotulo: 'Planos', curto: 'Planos', icone: Sparkles, secao: 'Organização' },
  { id: 'sugestoes', rotulo: 'Sugestões', curto: 'Sugestões', icone: Lightbulb, secao: 'Organização' },
  // só aparece para o dono (veja abasVisiveis)
  { id: 'usuarios', rotulo: 'Usuários ativos', curto: 'Usuários', icone: UserCheck, secao: 'Organização' },
  { id: 'ajustes', rotulo: 'Configurações', curto: 'Ajustes', icone: Settings, secao: 'Organização' },
]
const SECOES: Secao[] = ['Financeiro', 'Análise', 'Organização']
const NO_MENU_INFERIOR: Aba[] = ['painel', 'lancamentos', 'pagar', 'receber']

const SUBTITULOS: Record<Aba, string> = {
  painel: '',
  lancamentos: 'Receitas e despesas: cadastre, consulte, dê baixa e edite',
  pagar: 'Despesas pendentes, vencidas e pagas',
  receber: 'Receitas pendentes, em atraso e recebidas',
  contas: 'Bancos, caixa e carteiras digitais, com saldo e transferências',
  cartoes: 'Faturas, limite e compras parceladas no cartão',
  contatos: 'Cadastro com CPF ou CNPJ, e-mail e telefone',
  relatorios: 'Mês a mês, por categoria, por cliente e fornecedor e por conta',
  dre: 'Demonstração do resultado: receita, custos, despesas e lucro',
  metas: 'Aonde você quer chegar, e quanto falta',
  orcamentos: 'Limites mensais por categoria para manter os gastos sob controle',
  categorias: 'Organize suas receitas e despesas do seu jeito',
  planos: 'Escolha o melhor período para você',
  sugestoes: 'Sentiu falta de algo? Conte para a gente',
  usuarios: 'Quem tem acesso ao Lucro Real e quando usou pela última vez',
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
  /** null = cobrança ainda não ligada */
  acesso?: Acesso | null
}

/** Contas criadas pelo gerador de exemplo (versões anteriores gravavam o exemplo na conta) */
const ehContaExemplo = (c: ContaFinanceira) => c.id.endsWith('-exemplo')

type EdicaoLancamento = { inicial: Lancamento | null; tipo: Tipo; conta?: string }
type AcaoSerie =
  | { acao: 'editar'; original: Lancamento; editado: Lancamento }
  | { acao: 'excluir'; alvo: Lancamento }

export default function App({ dados, setDados, status, emDemo, onEntrarDemo, onSairDemo, onTentarSalvar, email, onSair, acesso = null }: Props) {
  const [aba, setAbaEstado] = useState<Aba>('painel')
  const [mes, setMes] = useState(mesAtual())
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDoPreset('mes'))
  // relatórios e DRE comparam meses, então começam com um intervalo maior
  const [periodoAnalise, setPeriodoAnalise] = useState<Periodo>(() => periodoDoPreset('6m'))
  const [contaFiltro, setContaFiltro] = useState('')
  const [maisAberto, setMaisAberto] = useState(false)
  const [fabAberto, setFabAberto] = useState(false)
  const [editando, setEditando] = useState<EdicaoLancamento | null>(null)
  const [editandoConta, setEditandoConta] = useState<ContaFinanceira | null | 'nova'>(null)
  const [transferindo, setTransferindo] = useState<{ origem?: string } | null>(null)
  const [tipoNovaConta, setTipoNovaConta] = useState<TipoConta | undefined>()
  const [acaoSerie, setAcaoSerie] = useState<AcaoSerie | null>(null)
  const [pagandoFatura, setPagandoFatura] = useState<Fatura | null>(null)
  const [importando, setImportando] = useState<{ conta?: string } | null>(null)
  const [cartaoAberto, setCartaoAberto] = useState<{ cartao?: string; fatura?: string }>({})
  const [editandoContato, setEditandoContato] = useState<Contato | null | 'novo'>(null)
  const [tema, setTema] = useLocalStorage<Tema>('cf:tema', 'sistema')
  const [oculto, setOculto] = useLocalStorage('cf:oculto', false)
  const [regime, setRegime] = useLocalStorage<Regime>('cf:regime', 'competencia')
  const escuro = usaTemaEscuro(tema)

  const { categorias, lancamentos, orcamentos, nome, contas, transferencias, series, contatos: cadastros, perfil, metas } = dados
  const campo = <K extends keyof Dados>(k: K) => (v: Atualizacao<Dados[K]>) =>
    setDados((d) => ({ ...d, [k]: typeof v === 'function' ? (v as (x: Dados[K]) => Dados[K])(d[k]) : v }))
  const setCategorias = campo('categorias') as (v: Atualizacao<Categoria[]>) => void
  const setLancamentos = campo('lancamentos') as (v: Atualizacao<Lancamento[]>) => void
  const setOrcamentos = campo('orcamentos') as (v: Atualizacao<Orcamentos>) => void
  const setContas = campo('contas') as (v: Atualizacao<ContaFinanceira[]>) => void
  const setTransferencias = campo('transferencias') as (v: Atualizacao<Transferencia[]>) => void
  const setNome = campo('nome') as (v: string) => void
  const setContatos = campo('contatos') as (v: Atualizacao<Contato[]>) => void
  const setPerfil = campo('perfil') as (v: Perfil) => void
  const setMetas = campo('metas') as (v: Atualizacao<Meta[]>) => void

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
  const contatos = useMemo(() => cadastros.map((c) => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')), [cadastros])
  const hoje = hojeISO()
  const faturas = useMemo(
    () => contas.filter(ehCartao).flatMap((c) => faturasDoCartao(c, lancamentos, transferencias)),
    [contas, lancamentos, transferencias],
  )
  const faturasVencidas = faturas.filter((f) => f.status === 'vencida').length
  const vencidasPagar = lancamentos.filter((l) => !l.pago && l.tipo === 'despesa' && l.data < hoje).length + faturasVencidas
  const atrasadasReceber = lancamentos.filter((l) => !l.pago && l.tipo === 'receita' && l.data < hoje).length
  // Só o dono recebe as sugestões: conta as não lidas para mostrar no menu
  const souDono = !emDemo && email.toLowerCase() === EMAIL_DONO
  const [sugestoesNovas, setSugestoesNovas] = useState(0)
  useEffect(() => {
    if (!souDono) return
    supabase.from('sugestoes').select('id', { count: 'exact', head: true }).eq('lida', false).then(({ count }) => setSugestoesNovas(count ?? 0))
  }, [souDono])
  const abasVisiveis = souDono ? ABAS : ABAS.filter((a) => a.id !== 'usuarios')
  const badges: Partial<Record<Aba, number>> ={ pagar: vencidasPagar, receber: atrasadasReceber, cartoes: faturasVencidas, sugestoes: sugestoesNovas }

  // mantém as recorrências sem fim sempre ~12 meses à frente
  useEffect(() => {
    const r = estenderSeries(series, lancamentos, contaPorId)
    if (r) setDados((d) => ({ ...d, series: r.series, lancamentos: [...d.lancamentos, ...r.novos] }))
  }, [series, lancamentos, contaPorId, setDados])

  /* ---------- Lançamentos ---------- */

  const novo = (tipo: Tipo, conta?: string) => {
    setFabAberto(false)
    setEditando({ inicial: null, tipo, conta })
  }

  const CAMPOS_SERIE = ['descricao', 'valor', 'categoriaId', 'contaId', 'contato', 'observacoes'] as const

  /** Liga o nome digitado a um cadastro existente ou cria um cadastro novo */
  const vincularContato = (l: Lancamento): Lancamento => {
    const nomeContato = l.contato?.trim()
    if (!nomeContato) return { ...l, contato: undefined, contatoId: undefined }
    const existente = cadastros.find((c) => c.nome.trim().toLowerCase() === nomeContato.toLowerCase())
    if (existente) {
      const outroPapel = (existente.papel === 'cliente' && l.tipo === 'despesa') || (existente.papel === 'fornecedor' && l.tipo === 'receita')
      if (outroPapel) setContatos((cs) => cs.map((c) => (c.id === existente.id ? { ...c, papel: 'ambos' } : c)))
      return { ...l, contato: existente.nome, contatoId: existente.id }
    }
    const novoContato: Contato = { id: uid(), nome: nomeContato, papel: l.tipo === 'receita' ? 'cliente' : 'fornecedor', pessoa: 'juridica' }
    setContatos((cs) => [...cs, novoContato])
    return { ...l, contato: novoContato.nome, contatoId: novoContato.id }
  }

  const salvarLancamento = (lForm: Lancamento, rep: Repeticao) => {
    const l = vincularContato(lForm)
    const original = lancamentos.find((x) => x.id === l.id)
    const editado = ajustarParaConta(l, contaPorId.get(l.contaId))
    if (!original) {
      const r = criarLancamentos(editado, rep, contaPorId.get(l.contaId))
      setDados((d) => ({ ...d, lancamentos: [...d.lancamentos, ...r.lancamentos], series: r.serie ? [...d.series, r.serie] : d.series }))
    } else if (original.serieId && CAMPOS_SERIE.some((k) => original[k] !== editado[k])) {
      setAcaoSerie({ acao: 'editar', original, editado })
    } else {
      setLancamentos((a) => a.map((x) => (x.id === l.id ? editado : x)))
    }
    setEditando(null)
  }

  const excluirLancamento = (id: string) => {
    const l = lancamentos.find((x) => x.id === id)
    if (!l) return
    if (l.serieId && lancamentos.some((x) => x.serieId === l.serieId && x.id !== l.id)) return setAcaoSerie({ acao: 'excluir', alvo: l })
    if (confirm(`Excluir "${l.descricao}"? Essa ação não pode ser desfeita.`)) setLancamentos((a) => a.filter((x) => x.id !== id))
  }

  const aplicarEscopo = (escopo: Escopo) => {
    const a = acaoSerie
    setAcaoSerie(null)
    if (!a) return
    if (a.acao === 'editar') {
      setLancamentos((ls) => aplicarEdicao(ls, a.original, a.editado, escopo, contaPorId))
      return
    }
    setDados((d) => {
      const r = aplicarExclusao(d.lancamentos, d.series, a.alvo, escopo)
      return { ...d, lancamentos: r.lancamentos, series: r.series }
    })
  }

  const concluirImportacao = (novos: Lancamento[], baixas: { id: string; data: string; importId: string }[]) => {
    const porId = new Map(baixas.map((b) => [b.id, b]))
    setLancamentos((ls) => [
      ...ls.map((l) => {
        const b = porId.get(l.id)
        return b ? { ...l, pago: true, dataPagamento: b.data, importId: b.importId } : l
      }),
      ...novos.map((l) => ajustarParaConta(l, contaPorId.get(l.contaId))),
    ])
    setImportando(null)
    alert(`Importação concluída: ${novos.length} lançamento(s) criado(s) e ${baixas.length} conciliado(s).`)
  }

  const abrirFatura = (f: Fatura) => {
    setCartaoAberto({ cartao: f.cartao.id, fatura: f.chave })
    setAba('cartoes')
  }

  /* ---------- Clientes e fornecedores ---------- */

  const salvarContato = (c: Contato) => {
    setDados((d) => ({
      ...d,
      contatos: d.contatos.some((x) => x.id === c.id) ? d.contatos.map((x) => (x.id === c.id ? c : x)) : [...d.contatos, c],
      // renomear o cadastro atualiza o nome nos lançamentos
      lancamentos: d.lancamentos.map((l) => (l.contatoId === c.id && l.contato !== c.nome ? { ...l, contato: c.nome } : l)),
    }))
    setEditandoContato(null)
  }

  const excluirContato = (c: Contato) => {
    const usos = lancamentos.filter((l) => l.contatoId === c.id).length
    const aviso = usos ? `\n\n${usos} lançamento(s) continuarão mostrando o nome, mas sem vínculo com o cadastro.` : ''
    if (!confirm(`Excluir o cadastro "${c.nome}"?${aviso}`)) return
    setDados((d) => ({
      ...d,
      contatos: d.contatos.filter((x) => x.id !== c.id),
      lancamentos: d.lancamentos.map((l) => (l.contatoId === c.id ? { ...l, contatoId: undefined } : l)),
    }))
  }

  const pagarFatura = (t: Transferencia) => {
    setTransferencias((ts) => [...ts, t])
    setPagandoFatura(null)
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
    if (!ehCartao(c) && contas.filter((x) => !x.arquivada && !ehCartao(x)).length <= 1) return alert('Você precisa manter pelo menos uma conta ativa.')
    const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const saldo = ehCartao(c) ? 0 : saldoConta(c, lancamentos, transferencias)
    const emAberto = ehCartao(c) ? resumoCartao(c, lancamentos, transferencias).usado : 0
    const pendentes = lancamentos.filter((l) => l.contaId === c.id && !l.pago).length
    const avisos = [
      saldo !== 0 ? `ainda tem saldo de ${moeda(saldo)}` : '',
      emAberto > 0 ? `ainda tem ${moeda(emAberto)} em faturas a pagar` : '',
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
    if (!ehCartao(c) && contas.filter((x) => !ehCartao(x)).length <= 1) return alert('Você precisa ter pelo menos uma conta.')
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
    setPeriodoAnalise(periodoDoPreset('6m'))
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
        series: d.series.filter((sr) => d.lancamentos.some((l) => l.serieId === sr.id && !ids.has(l.contaId))),
        // cadastros criados automaticamente só para o exemplo (sem documento) saem junto
        contatos: d.contatos.filter((c) => c.documento || c.email || c.telefone || d.lancamentos.some((l) => l.contatoId === c.id && !ids.has(l.contaId))),
        orcamentos: JSON.stringify(d.orcamentos) === orcExemplo ? {} : d.orcamentos,
      }
    })
    resetarFiltros()
  }

  const importar = (b: Partial<Backup>) => setDados((d) => normalizarDados({ ...b, nome: d.nome }, d.nome))
  const apagarTudo = () => {
    setDados((d) => ({ ...d, categorias: CATEGORIAS_PADRAO, lancamentos: [], orcamentos: {}, contas: [contaPrincipal()], transferencias: [], series: [], contatos: [], metas: [] }))
    setContaFiltro('')
  }

  /* ---------- Layout ---------- */

  const atual = ABAS.find((a) => a.id === aba)!
  const primeiroNome = nome.trim().split(' ')[0]
  const titulo = aba === 'painel' ? `${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''}!` : atual.rotulo
  const subtitulo = aba === 'painel' ? `Visão do caixa · ${rotuloPeriodo(periodo).toLowerCase()}` : SUBTITULOS[aba]
  const propsLista = {
    lancamentos, categorias, contas, catPorId, contaPorId, periodo, setPeriodo, contaFiltro, setContaFiltro, contatos: cadastros,
    onEditar: (l: Lancamento) => setEditando({ inicial: l, tipo: l.tipo }),
    onExcluir: excluirLancamento, onBaixa: darBaixa, onReverter: reverterBaixa, onNovo: (t: Tipo) => novo(t),
    faturas, onPagarFatura: setPagandoFatura, onAbrirFatura: abrirFatura,
  }

  const itemMenu = (a: (typeof ABAS)[number]) => {
    const Icone = a.icone
    const badge = badges[a.id] ?? 0
    return (
      <button key={a.id} className={aba === a.id ? 'menu-item ativo' : 'menu-item'} onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
        <Icone size={20} strokeWidth={2} />
        <span>{a.rotulo}</span>
        {badge > 0 && <em className="badge ruim" title={a.id === 'sugestoes' ? 'Sugestões novas' : 'Vencidas'}>{badge}</em>}
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
              <strong>Lucro Real</strong>
              <span>Controle Financeiro</span>
            </div>
          </div>

          <nav className="menu" aria-label="Menu principal">
            {SECOES.map((s, i) => [
              <span key={s} className={`menu-titulo ${i ? 'espaco' : ''}`}>{s}</span>,
              ...abasVisiveis.filter((a) => a.secao === s).map(itemMenu),
            ])}
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
          {diasDeTeste(acesso) !== null && aba !== 'planos' && (
            <div className="faixa-demo teste" role="status">
              <Sparkles size={18} />
              <span>
                <strong>Teste grátis:</strong>{' '}
                {diasDeTeste(acesso)! <= 1 ? 'termina hoje.' : `faltam ${diasDeTeste(acesso)} dias.`} Assine para continuar sem perder nada.
              </span>
              <button className="btn pequeno claro" onClick={() => setAba('planos')}>Ver planos</button>
            </div>
          )}
          {acesso?.status === 'atrasado' && (
            <div className="faixa-demo erro-pagamento" role="alert">
              <CreditCard size={18} />
              <span>
                <strong>Não conseguimos cobrar sua assinatura.</strong> Atualize o cartão
                {acesso.valido_ate ? ` até ${formatData(acesso.valido_ate.slice(0, 10))}` : ''} para não perder o acesso.
              </span>
              <button className="btn pequeno claro" onClick={() => gerenciarAssinatura().catch((e) => alert(e.message))}>Atualizar pagamento</button>
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
              {(aba === 'orcamentos' || aba === 'metas') && (
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
              {aba !== 'painel' && aba !== 'metas' && aba !== 'planos' && (
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
                onIr={setAba} onCarregarExemplo={carregarExemplo} metas={metas}
                faturas={faturas} onPagarFatura={setPagandoFatura} onAbrirFatura={abrirFatura} />
            )}
            {aba === 'lancamentos' && <Lancamentos {...propsLista} onImportar={() => setImportando({ conta: contaFiltro })} />}
            {aba === 'pagar' && <ContasPagarReceber tipo="despesa" {...propsLista} />}
            {aba === 'receber' && <ContasPagarReceber tipo="receita" {...propsLista} />}
            {aba === 'cartoes' && (
              <CartoesCredito contas={contas} lancamentos={lancamentos} transferencias={transferencias} catPorId={catPorId} contaPorId={contaPorId}
                cartaoInicial={cartaoAberto.cartao} faturaInicial={cartaoAberto.fatura}
                onNovoCartao={() => { setTipoNovaConta('cartao'); setEditandoConta('nova') }} onEditarCartao={setEditandoConta}
                onArquivar={arquivarConta} onExcluir={excluirConta} onNovaCompra={(id) => novo('despesa', id)} onPagar={setPagandoFatura}
                onImportar={(id) => setImportando({ conta: id })} onEditar={propsLista.onEditar} onExcluirLancamento={excluirLancamento}
                onExcluirPagamento={excluirTransferencia} />
            )}
            {aba === 'contatos' && (
              <ContatosView contatos={cadastros} lancamentos={lancamentos} onNovo={() => setEditandoContato('novo')}
                onEditar={setEditandoContato} onExcluir={excluirContato} />
            )}
            {aba === 'contas' && (
              <ContasFinanceiras contas={contas} lancamentos={lancamentos} transferencias={transferencias}
                onNovaConta={() => { setTipoNovaConta(undefined); setEditandoConta('nova') }} onEditarConta={setEditandoConta} onArquivar={arquivarConta}
                onExcluirConta={excluirConta} onTransferir={transferir} onExcluirTransferencia={excluirTransferencia} />
            )}
            {aba === 'relatorios' && (
              <Relatorios lancamentos={lancamentos} transferencias={transferencias} contas={contas} catPorId={catPorId} contatos={cadastros}
                periodo={periodoAnalise} setPeriodo={setPeriodoAnalise} contaFiltro={contaFiltro} setContaFiltro={setContaFiltro}
                regime={regime} setRegime={setRegime} perfil={perfil} nome={nome} />
            )}
            {aba === 'dre' && (
              <DreView lancamentos={lancamentos} categorias={categorias} setCategorias={setCategorias} catPorId={catPorId} contas={contas}
                periodo={periodoAnalise} setPeriodo={setPeriodoAnalise} contaFiltro={contaFiltro} setContaFiltro={setContaFiltro}
                regime={regime} setRegime={setRegime} perfil={perfil} nome={nome} />
            )}
            {aba === 'metas' && (
              <MetasView metas={metas} setMetas={setMetas} mes={mes} lancamentos={lancamentos} catPorId={catPorId} contas={contas} transferencias={transferencias} />
            )}
            {aba === 'orcamentos' && (
              <OrcamentosView mes={mes} lancamentos={lancamentos} categorias={categorias} orcamentos={orcamentos} setOrcamentos={setOrcamentos} />
            )}
            {aba === 'categorias' && <CategoriasView categorias={categorias} setCategorias={setCategorias} lancamentos={lancamentos} />}
            {aba === 'usuarios' && souDono && <UsuariosView />}
            {aba === 'sugestoes' && <Sugestoes email={email} nome={nome} emDemo={emDemo} onNaoLidas={setSugestoesNovas} />}
            {aba === 'planos' && <Planos embutido email={email} acesso={acesso} emDemo={emDemo} confirmando={false} onSair={sair} />}
            {aba === 'ajustes' && (
              <Ajustes categorias={categorias} lancamentos={lancamentos} orcamentos={orcamentos} contas={contas} transferencias={transferencias}
                onImportar={importar} onApagarTudo={apagarTudo}
                nome={nome} setNome={setNome} tema={tema} setTema={setTema} onCarregarExemplo={carregarExemplo}
                email={email} onSair={sair} perfil={perfil} setPerfil={setPerfil} contatos={cadastros} series={series} metas={metas} acesso={acesso} onVerPlanos={() => setAba('planos')} />
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
                {abasVisiveis.filter((a) => !NO_MENU_INFERIOR.includes(a.id)).map((a) => {
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
            contaInicial={editando.conta ?? contaFiltro}
            categorias={categorias}
            contas={contas}
            contatos={contatos}
            onSalvar={salvarLancamento}
            onFechar={() => setEditando(null)}
          />
        )}
        {editandoConta && (
          <FormConta inicial={editandoConta === 'nova' ? null : editandoConta} tipoInicial={tipoNovaConta} contas={contas}
            onSalvar={salvarConta} onFechar={() => setEditandoConta(null)} />
        )}
        {editandoContato && (
          <FormContato inicial={editandoContato === 'novo' ? null : editandoContato} contatos={cadastros}
            onSalvar={salvarContato} onFechar={() => setEditandoContato(null)} />
        )}
        {acaoSerie && (
          <EscolhaEscopo acao={acaoSerie.acao} parcelado={!!(acaoSerie.acao === 'editar' ? acaoSerie.original : acaoSerie.alvo).parcela}
            onEscolher={aplicarEscopo} onFechar={() => setAcaoSerie(null)} />
        )}
        {pagandoFatura && (
          <FormPagarFatura fatura={pagandoFatura} contas={contas} lancamentos={lancamentos} transferencias={transferencias}
            onSalvar={pagarFatura} onFechar={() => setPagandoFatura(null)} />
        )}
        {importando && (
          <ImportarExtrato contas={contas} contaInicial={importando.conta} categorias={categorias} lancamentos={lancamentos}
            onConcluir={concluirImportacao} onFechar={() => setImportando(null)} />
        )}
        {transferindo && (
          <FormTransferencia contas={contas} lancamentos={lancamentos} transferencias={transferencias} origemInicial={transferindo.origem ?? contaFiltro}
            onSalvar={salvarTransferencia} onFechar={() => setTransferindo(null)} />
        )}
      </div>
    </PrivacidadeContext.Provider>
  )
}
