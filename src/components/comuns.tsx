import { useEffect } from 'react'
import {
  AlertTriangle, Banknote, CalendarRange, CheckCircle2, Clock, Landmark, Pencil, Smartphone, Trash2, Undo2, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, TipoConta } from '../types'
import { PRESETS, periodoDoPreset, situacao, type Periodo, type PresetPeriodo } from '../financas'
import { formatData, hojeISO } from '../utils'
import { IconeCategoria, useFmt } from '../ui'

/* ---------- Contas financeiras ---------- */

export const TIPOS_CONTA: { id: TipoConta; rotulo: string; icone: LucideIcon; cor: string }[] = [
  { id: 'banco', rotulo: 'Conta bancária', icone: Landmark, cor: '#6d4dff' },
  { id: 'caixa', rotulo: 'Caixa', icone: Banknote, cor: '#12b76a' },
  { id: 'carteira', rotulo: 'Carteira digital', icone: Smartphone, cor: '#0ea5e9' },
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

export function LinhaLancamento({ l, cat, conta, mostrarData, onBaixa, onReverter, onEditar, onExcluir }: LinhaProps) {
  const fmt = useFmt()
  const detalhes = [cat?.nome ?? 'Sem categoria', conta?.nome, l.contato].filter(Boolean).join(' · ')
  return (
    <li className={`situacao-${situacao(l)}`}>
      <IconeCategoria cat={cat} tamanho={40} />
      <button className="mov-info" onClick={() => onEditar(l)}>
        <strong>{l.descricao}</strong>
        <span>{mostrarData ? `Vence ${formatData(l.data)} · ` : ''}{detalhes}</span>
      </button>
      <PilulaSituacao l={l} />
      <span className={`num mov-valor ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}</span>
      <span className="mov-acoes">
        {l.pago ? (
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
