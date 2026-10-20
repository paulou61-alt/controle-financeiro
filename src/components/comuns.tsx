import { useEffect } from 'react'
import {
  AlertTriangle, Banknote, CalendarRange, CheckCircle2, Clock, CreditCard, Landmark, Pencil, Repeat, Smartphone, Trash2,
  Undo2, Wallet, X, type LucideIcon,
} from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Perfil, TipoConta } from '../types'
import { PRESETS, faturaDaCompra, periodoDoPreset, rotuloPeriodo, situacao, type Fatura, type Periodo, type PresetPeriodo } from '../financas'
import type { Regime } from '../analise'
import { formatarDocumento } from '../formatos'
import type { Escopo } from '../series'
import { formatData, hojeISO, rotuloMes } from '../utils'
import { IconeCategoria, useFmt } from '../ui'

/* ---------- Contas financeiras ---------- */

export const TIPOS_CONTA: { id: TipoConta; rotulo: string; icone: LucideIcon; cor: string }[] = [
  { id: 'banco', rotulo: 'Conta bancária', icone: Landmark, cor: '#059669' },
  { id: 'caixa', rotulo: 'Caixa', icone: Banknote, cor: '#12b76a' },
  { id: 'carteira', rotulo: 'Carteira digital', icone: Smartphone, cor: '#0ea5e9' },
  { id: 'cartao', rotulo: 'Cartão de crédito', icone: CreditCard, cor: '#f97316' },
]

export function IconeConta({ tipo, tamanho = 38 }: { tipo?: TipoConta; tamanho?: number }) {
  const t = TIPOS_CONTA.find((x) => x.id === tipo)
  const Icone = t?.icone ?? Wallet
  const cor = t?.cor ?? '#94a3b8'
  return (
    <span className="icone-cat" style={{ width: tamanho, height: tamanho, color: cor, background: `color-mix(in srgb, ${cor} 15%, transparent)` }}>
      <Icone size={Math.round(tamanho * 0.47)} strokeWidth={2.2} />
    </span>
  )
}

/* ---------- Filtros ---------- */

export function FiltroPeriodo({ periodo, onChange, rotulo = 'Período' }: { periodo: Periodo; onChange: (p: Periodo) => void; rotulo?: string }) {
  return (
    <div className="filtro-periodo">
      <label className="select-icone" title={rotulo}>
        <CalendarRange size={16} />
        <select value={periodo.preset} onChange={(e) => onChange(periodoDoPreset(e.target.value as PresetPeriodo, periodo))} aria-label={rotulo}>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
        </select>
      </label>
      {periodo.preset === 'personalizado' && (
        <span className="intervalo">
          <input type="date" value={periodo.de} max={periodo.ate} onChange={(e) => e.target.value && onChange({ ...periodo, de: e.target.value })} aria-label="Data inicial" />
          <span>até</span>
          <input type="date" value={periodo.ate} min={periodo.de} onChange={(e) => e.target.value && onChange({ ...periodo, ate: e.target.value })} aria-label="Data final" />
        </span>
      )}
    </div>
  )
}

export function FiltroConta({ contas, valor, onChange }: { contas: ContaFinanceira[]; valor: string; onChange: (id: string) => void }) {
  return (
    <label className="select-icone">
      <Wallet size={16} />
      <select value={valor} onChange={(e) => onChange(e.target.value)} aria-label="Conta">
        <option value="">Todas as contas</option>
        {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.arquivada ? ' (arquivada)' : ''}</option>)}
      </select>
    </label>
  )
}

export function SeletorRegime({ valor, onChange }: { valor: Regime; onChange: (r: Regime) => void }) {
  return (
    <div className="segmentado" role="group" aria-label="Regime">
      <button className={valor === 'competencia' ? 'ativo' : ''} onClick={() => onChange('competencia')} title="Pelo vencimento, pago ou não">Competência</button>
      <button className={valor === 'caixa' ? 'ativo' : ''} onClick={() => onChange('caixa')} title="Pela data em que foi pago ou recebido">Caixa</button>
    </div>
  )
}

/** Aparece só na impressão / PDF */
export function CabecalhoImpressao({ titulo, periodo, perfil, nome }: { titulo: string; periodo?: Periodo; perfil: Perfil; nome: string }) {
  const titular = perfil.nomeCompleto?.trim() || nome.trim()
  const doc = perfil.documento ? formatarDocumento(perfil.documento, perfil.pessoa) : ''
  return (
    <header className="so-impressao cab-impressao">
      <h2>{titulo}</h2>
      <p>{[titular, doc].filter(Boolean).join(' · ')}</p>
      <p>{periodo ? `Período: ${rotuloPeriodo(periodo)} · ` : ''}Emitido em {formatData(hojeISO())}</p>
    </header>
  )
}

/* ---------- Situação ---------- */

export function PilulaSituacao({ l }: { l: Lancamento }) {
  const s = situacao(l)
  if (s === 'realizado')
    return (
      <span className="pilula-status pago" title={l.dataPagamento ? `Em ${formatData(l.dataPagamento)}` : undefined}>
        <CheckCircle2 size={14} /> {l.tipo === 'despesa' ? 'Pago' : 'Recebido'}{l.dataPagamento ? ` ${formatData(l.dataPagamento).slice(0, 5)}` : ''}
      </span>
    )
  if (s === 'atrasado') return <span className="pilula-status atrasado"><AlertTriangle size={14} /> Atrasado</span>
  return <span className="pilula-status aberto"><Clock size={14} /> {l.data === hojeISO() ? 'Vence hoje' : 'Pendente'}</span>
}

/* ---------- Linha de lançamento ---------- */

interface LinhaProps {
  l: Lancamento
  cat?: Categoria
  conta?: ContaFinanceira
  mostrarData?: boolean
  onBaixa: (id: string) => void
  onReverter: (id: string) => void
  onEditar: (l: Lancamento) => void
  onExcluir?: (id: string) => void
}

export function SeloSerie({ l }: { l: Lancamento }) {
  if (l.parcela) return <em className="selo" title="Parcela">{l.parcela.numero}/{l.parcela.total}</em>
  if (l.serieId) return <em className="selo" title="Recorrente"><Repeat size={11} /></em>
  return null
}

export function LinhaLancamento({ l, cat, conta, mostrarData, onBaixa, onReverter, onEditar, onExcluir }: LinhaProps) {
  const fmt = useFmt()
  const cartao = conta?.tipo === 'cartao'
  const detalhes = [cat?.nome ?? 'Sem categoria', conta?.nome, l.contato].filter(Boolean).join(' · ')
  const prefixo = mostrarData ? (cartao ? `Compra ${formatData(l.data)} · ` : `Vence ${formatData(l.data)} · `) : ''
  return (
    <li className={cartao ? 'situacao-cartao' : `situacao-${situacao(l)}`}>
      <IconeCategoria cat={cat} tamanho={40} />
      <button className="mov-info" onClick={() => onEditar(l)}>
        <strong>{l.descricao} <SeloSerie l={l} /></strong>
        <span>{prefixo}{detalhes}</span>
      </button>
      {cartao ? (
        <span className="pilula-status cartao" title="Compra no cartão de crédito">
          <CreditCard size={14} /> Fatura {rotuloMes(faturaDaCompra(conta, l.data).chave)}
        </span>
      ) : (
        <PilulaSituacao l={l} />
      )}
      <span className={`num mov-valor ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}</span>
      <span className="mov-acoes">
        {cartao ? null : l.pago ? (
          <button className="btn-icone pequeno" onClick={() => onReverter(l.id)} aria-label="Reverter baixa" title="Reverter baixa"><Undo2 size={15} /></button>
        ) : (
          <button className="btn baixa" onClick={() => onBaixa(l.id)} title={l.tipo === 'despesa' ? 'Marcar como pago' : 'Marcar como recebido'}>
            <CheckCircle2 size={15} /> {l.tipo === 'despesa' ? 'Pagar' : 'Receber'}
          </button>
        )}
        <button className="btn-icone pequeno" onClick={() => onEditar(l)} aria-label="Editar" title="Editar"><Pencil size={15} /></button>
        {onExcluir && <button className="btn-icone pequeno perigo" onClick={() => onExcluir(l.id)} aria-label="Excluir" title="Excluir"><Trash2 size={15} /></button>}
      </span>
    </li>
  )
}

/* ---------- Fatura de cartão ---------- */

const ROTULO_FATURA: Record<Fatura['status'], string> = {
  aberta: 'Aberta', fechada: 'Fechada', vencida: 'Vencida', paga: 'Paga', futura: 'Futura',
}

export function PilulaFatura({ f }: { f: Fatura }) {
  const classe = f.status === 'paga' ? 'pago' : f.status === 'vencida' ? 'atrasado' : f.status === 'fechada' ? 'aberto' : 'cartao'
  return <span className={`pilula-status ${classe}`}><CreditCard size={14} /> {ROTULO_FATURA[f.status]}</span>
}

export function LinhaFatura({ f, onPagar, onAbrir }: { f: Fatura; onPagar: (f: Fatura) => void; onAbrir: (f: Fatura) => void }) {
  const fmt = useFmt()
  return (
    <li className={f.status === 'vencida' ? 'situacao-atrasado' : ''}>
      <IconeConta tipo="cartao" tamanho={40} />
      <button className="mov-info" onClick={() => onAbrir(f)}>
        <strong>Fatura {f.cartao.nome} · {rotuloMes(f.chave)}</strong>
        <span>Vence {formatData(f.vencimento)} · {f.compras.length} compra(s){f.pago > 0 ? ` · pago ${fmt(f.pago)}` : ''}</span>
      </button>
      <PilulaFatura f={f} />
      <span className="num mov-valor despesa">−{fmt(f.restante > 0 ? f.restante : f.total)}</span>
      <span className="mov-acoes">
        {f.restante > 0 && f.status !== 'futura' && (
          <button className="btn baixa" onClick={() => onPagar(f)}><CheckCircle2 size={15} /> Pagar fatura</button>
        )}
      </span>
    </li>
  )
}

/* ---------- Escopo de edição em série ---------- */

export function EscolhaEscopo({ acao, parcelado, onEscolher, onFechar }: {
  acao: 'editar' | 'excluir'
  parcelado: boolean
  onEscolher: (e: Escopo) => void
  onFechar: () => void
}) {
  const item = parcelado ? 'parcela' : 'ocorrência'
  const opcoes: { id: Escopo; titulo: string; texto: string }[] = [
    { id: 'este', titulo: `Somente esta ${item}`, texto: 'As demais ficam como estão.' },
    { id: 'proximos', titulo: `Esta e as próximas`, texto: parcelado ? 'Aplica às parcelas seguintes.' : 'Aplica daqui para frente.' },
    { id: 'todos', titulo: parcelado ? 'Todas as parcelas' : 'Todas as ocorrências', texto: 'Inclui as anteriores.' },
  ]
  return (
    <Modal titulo={acao === 'editar' ? 'Aplicar alteração em…' : 'Excluir…'} onFechar={onFechar} onSubmit={(e) => e.preventDefault()}>
      <p className="ajuda">Este lançamento faz parte de {parcelado ? 'um parcelamento' : 'uma recorrência'}.</p>
      <div className="opcoes-escopo">
        {opcoes.map((o) => (
          <button type="button" key={o.id} className={acao === 'excluir' && o.id !== 'este' ? 'perigo' : ''} onClick={() => onEscolher(o.id)}>
            <strong>{o.titulo}</strong>
            <span>{o.texto}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

/* ---------- Modal ---------- */

export function Modal({ titulo, onFechar, children, onSubmit, className = '' }: {
  titulo: string
  onFechar: () => void
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  className?: string
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <form className={`modal ${className}`} onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} aria-label={titulo} noValidate>
        <div className="modal-cab">
          <h2>{titulo}</h2>
          <button type="button" className="btn-icone pequeno" onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </form>
    </div>
  )
}
