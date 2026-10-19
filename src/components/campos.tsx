import { CheckCircle2, AlertCircle } from 'lucide-react'
import {
  centavosDigitados, documentoCompleto, formatarNumeroBR, mascaraDocumento, mascaraTelefone, normalizarDocumento,
  rotuloDocumento, somenteDigitos, validarDocumento, validarTelefone, type TipoPessoa,
} from '../formatos'
import { parseValor } from '../utils'

/* ---------- Dinheiro ---------- */

interface MoedaProps {
  valor: number | null
  onChange: (v: number | null) => void
  permitirNegativo?: boolean
  placeholder?: string
  autoFocus?: boolean
  onBlur?: () => void
  'aria-label'?: string
  className?: string
}

/** Digite só números: 1 → 0,01 · 12 → 0,12 · 1234 → 12,34 (como nos apps de banco). Colar "1.234,56" também funciona. */
export function InputMoeda({ valor, onChange, permitirNegativo, placeholder = '0,00', autoFocus, onBlur, className, ...aria }: MoedaProps) {
  const negativo = valor !== null && valor < 0
  const texto = valor === null ? '' : `${negativo ? '-' : ''}${formatarNumeroBR(Math.abs(valor))}`

  const mudar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    const n = centavosDigitados(t)
    // "-" alterna o sinal (quando permitido)
    const sinais = (t.match(/-/g) ?? []).length
    const neg = permitirNegativo && sinais % 2 === 1
    onChange(n === null ? null : neg ? -n : n)
  }

  const colar = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const n = parseValor(e.clipboardData.getData('text').replace(/[R$\s]/g, ''))
    if (!Number.isFinite(n)) return
    e.preventDefault()
    onChange(permitirNegativo ? Math.round(n * 100) / 100 : Math.round(Math.abs(n) * 100) / 100)
  }

  return (
    <span className={`campo-moeda-mascara ${className ?? ''}`}>
      <input
        inputMode="numeric"
        value={texto}
        onChange={mudar}
        onPaste={colar}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        {...aria}
        // mantém o cursor no fim, como nos apps de banco
        onFocus={(e) => requestAnimationFrame(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length))}
      />
      {permitirNegativo && (
        <button type="button" className="sinal" onClick={() => valor !== null && valor !== 0 && onChange(-valor)}
          title="Alternar entre positivo e negativo" aria-label="Alternar sinal">±</button>
      )}
    </span>
  )
}

/* ---------- Tipo de pessoa ---------- */

export function SeletorPessoa({ valor, onChange }: { valor: TipoPessoa; onChange: (p: TipoPessoa) => void }) {
  return (
    <div className="segmentado largo" role="radiogroup" aria-label="Tipo de pessoa">
      <button type="button" role="radio" aria-checked={valor === 'fisica'} className={valor === 'fisica' ? 'ativo' : ''} onClick={() => onChange('fisica')}>
        Pessoa física (CPF)
      </button>
      <button type="button" role="radio" aria-checked={valor === 'juridica'} className={valor === 'juridica' ? 'ativo' : ''} onClick={() => onChange('juridica')}>
        Pessoa jurídica (CNPJ)
      </button>
    </div>
  )
}

/* ---------- CPF / CNPJ ---------- */

export function InputDocumento({ pessoa, valor, onChange, rotulo }: { pessoa: TipoPessoa; valor: string; onChange: (v: string) => void; rotulo?: string }) {
  const tipo = rotuloDocumento(pessoa)
  const completo = documentoCompleto(valor, pessoa)
  const valido = completo && validarDocumento(valor, pessoa)
  return (
    <label className="campo">
      <span>{rotulo ?? tipo} <em className="opcional">(opcional)</em></span>
      <span className={`campo-status ${completo ? (valido ? 'ok' : 'ruim') : ''}`}>
        <input
          value={mascaraDocumento(valor, pessoa)}
          onChange={(e) => onChange(normalizarDocumento(e.target.value, pessoa))}
          inputMode={pessoa === 'fisica' ? 'numeric' : 'text'}
          autoCapitalize="characters"
          placeholder={pessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
          aria-label={tipo}
          aria-invalid={completo && !valido}
        />
        {completo && (valido ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />)}
      </span>
      {completo && !valido && <small className="erro-campo">{tipo} inválido. Confira os números.</small>}
      {pessoa === 'juridica' && !completo && <small>Aceita também o novo CNPJ com letras.</small>}
    </label>
  )
}

/* ---------- Telefone ---------- */

export function InputTelefone({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const d = somenteDigitos(valor)
  const completo = d.length >= 10
  const valido = completo && validarTelefone(d)
  return (
    <label className="campo">
      <span>Telefone / WhatsApp <em className="opcional">(opcional)</em></span>
      <span className={`campo-status ${completo ? (valido ? 'ok' : 'ruim') : ''}`}>
        <input value={mascaraTelefone(valor)} onChange={(e) => onChange(somenteDigitos(e.target.value).slice(0, 11))}
          inputMode="tel" placeholder="(00) 00000-0000" aria-label="Telefone" aria-invalid={completo && !valido} />
        {completo && (valido ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />)}
      </span>
      {completo && !valido && <small className="erro-campo">Telefone inválido. Use DDD + número.</small>}
    </label>
  )
}
