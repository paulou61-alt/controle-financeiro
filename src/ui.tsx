import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  Briefcase, Car, GraduationCap, Gamepad2, HeartPulse, House, Laptop, Package, PiggyBank,
  Receipt, ShoppingCart, Tag, TrendingUp, type LucideIcon,
} from 'lucide-react'
import type { Categoria } from './types'
import { formatBRL } from './utils'

/* ---------- Modo privacidade (ocultar valores) ---------- */

export const PrivacidadeContext = createContext(false)

export function useFmt() {
  const oculto = useContext(PrivacidadeContext)
  return (v: number) => (oculto ? 'R$ ••••••' : formatBRL(v))
}

export function useOculto() {
  return useContext(PrivacidadeContext)
}

/* ---------- Número animado ---------- */

export function useCountUp(alvo: number, ms = 800) {
  const [v, setV] = useState(0)
  const de = useRef(0)
  useEffect(() => {
    const inicio = de.current
    const t0 = performance.now()
    let raf = 0
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      const atual = inicio + (alvo - inicio) * e
      de.current = atual
      setV(atual)
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])
  return v
}

export function Valor({ v, sinal = false, className = '' }: { v: number; sinal?: boolean; className?: string }) {
  const animado = useCountUp(v)
  const fmt = useFmt()
  const oculto = useOculto()
  const prefixo = sinal && !oculto && v > 0 ? '+' : ''
  return <span className={`num ${className}`}>{prefixo}{fmt(Math.round(animado * 100) / 100)}</span>
}

/* ---------- Ícones de categoria ---------- */

const ICONES: Record<string, LucideIcon> = {
  salario: Briefcase,
  freelance: Laptop,
  investimentos: TrendingUp,
  'outras-receitas': PiggyBank,
  moradia: House,
  alimentacao: ShoppingCart,
  transporte: Car,
  saude: HeartPulse,
  educacao: GraduationCap,
  lazer: Gamepad2,
  contas: Receipt,
  'outras-despesas': Package,
}

export function IconeCategoria({ cat, tamanho = 38 }: { cat?: Categoria; tamanho?: number }) {
  const Icone = (cat && ICONES[cat.id]) || Tag
  const cor = cat?.cor ?? '#94a3b8'
  return (
    <span
      className="icone-cat"
      style={{ width: tamanho, height: tamanho, color: cor, background: `color-mix(in srgb, ${cor} 16%, transparent)` }}
    >
      <Icone size={Math.round(tamanho * 0.47)} strokeWidth={2.2} />
    </span>
  )
}

/* ---------- Tooltip dos gráficos ---------- */

interface ItemDica {
  name?: string | number
  value?: number | string | (number | string)[]
  color?: string
  payload?: { cor?: string }
}

export function DicaGrafico({ active, payload, label }: { active?: boolean; payload?: ItemDica[]; label?: string | number }) {
  const fmt = useFmt()
  if (!active || !payload?.length) return null
  return (
    <div className="dica">
      {label !== undefined && label !== '' && <div className="dica-titulo">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="dica-linha">
          <span className="bolinha" style={{ background: p.payload?.cor ?? p.color }} />
          <span>{p.name}</span>
          <strong>{typeof p.value === 'number' ? fmt(p.value) : '—'}</strong>
        </div>
      ))}
    </div>
  )
}

/* ---------- Anel de progresso ---------- */

export function Anel({ pct, cor, tamanho = 64, espessura = 7 }: { pct: number; cor: string; tamanho?: number; espessura?: number }) {
  const r = (tamanho - espessura) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <svg width={tamanho} height={tamanho} className="anel" aria-hidden="true">
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--trilho)" strokeWidth={espessura} />
      <circle
        cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={espessura}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
        transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`} style={{ transition: 'stroke-dashoffset .9s ease' }}
      />
    </svg>
  )
}
