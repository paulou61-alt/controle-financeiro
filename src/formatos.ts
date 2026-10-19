/* Máscaras e validações brasileiras: CPF, CNPJ (inclusive alfanumérico), telefone, e-mail e moeda */

export type TipoPessoa = 'fisica' | 'juridica'

export const somenteDigitos = (s: string) => s.replace(/\D/g, '')

/* ---------- CPF ---------- */

export function mascaraCPF(v: string) {
  const d = somenteDigitos(v).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function validarCPF(v: string) {
  const d = somenteDigitos(v)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (base: string, peso: number) => {
    const soma = [...base].reduce((s, c, i) => s + Number(c) * (peso - i), 0)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10])
}

/* ---------- CNPJ (numérico e alfanumérico, Receita Federal 2026) ---------- */

/** Raiz e ordem podem ter letras (A–Z); os 2 dígitos verificadores são sempre números */
export const limparCNPJ = (v: string) => {
  const s = v.toUpperCase().replace(/[^0-9A-Z]/g, '')
  return (s.slice(0, 12) + s.slice(12).replace(/\D/g, '')).slice(0, 14)
}

export function mascaraCNPJ(v: string) {
  const s = limparCNPJ(v)
  let out = s.slice(0, 2)
  if (s.length > 2) out += '.' + s.slice(2, 5)
  if (s.length > 5) out += '.' + s.slice(5, 8)
  if (s.length > 8) out += '/' + s.slice(8, 12)
  if (s.length > 12) out += '-' + s.slice(12, 14)
  return out
}

export function validarCNPJ(v: string) {
  const s = limparCNPJ(v)
  if (s.length !== 14 || !/^[0-9A-Z]{12}\d{2}$/.test(s) || /^(\d)\1{13}$/.test(s)) return false
  // valor de cada caractere = código ASCII − 48 (0–9 → 0–9, A → 17 … Z → 42)
  const valor = (c: string) => c.charCodeAt(0) - 48
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = [...base].reduce((soma, c, i) => soma + valor(c) * pesos[i], 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(s.slice(0, 12)) === Number(s[12]) && dv(s.slice(0, 13)) === Number(s[13])
}

/* ---------- Documento conforme o tipo de pessoa ---------- */

export const mascaraDocumento = (v: string, p: TipoPessoa) => (p === 'fisica' ? mascaraCPF(v) : mascaraCNPJ(v))
export const validarDocumento = (v: string, p: TipoPessoa) => (p === 'fisica' ? validarCPF(v) : validarCNPJ(v))
export const rotuloDocumento = (p: TipoPessoa) => (p === 'fisica' ? 'CPF' : 'CNPJ')
export const documentoCompleto = (v: string, p: TipoPessoa) =>
  p === 'fisica' ? somenteDigitos(v).length === 11 : limparCNPJ(v).length === 14

/** Formata o documento salvo (sem máscara) para exibição */
export const formatarDocumento = (v: string | undefined, p: TipoPessoa) => (v ? mascaraDocumento(v, p) : '')
/** Normaliza o documento para salvar (sem pontuação) */
export const normalizarDocumento = (v: string, p: TipoPessoa) => (p === 'fisica' ? somenteDigitos(v) : limparCNPJ(v))

/* ---------- Telefone ---------- */

export function mascaraTelefone(v: string) {
  const d = somenteDigitos(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Fixo (10 dígitos) ou celular (11 dígitos começando com 9), com DDD válido */
export function validarTelefone(v: string) {
  const d = somenteDigitos(v)
  if (d.length !== 10 && d.length !== 11) return false
  if (Number(d.slice(0, 2)) < 11 || d[0] === '0') return false
  return d.length === 10 ? /[2-5]/.test(d[2]) : d[2] === '9'
}

/* ---------- E-mail ---------- */

export const validarEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/* ---------- Moeda ---------- */

const fmtNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 1234.5 → "1.234,50" */
export const formatarNumeroBR = (v: number) => fmtNumero.format(v)

/** Converte o que foi digitado em centavos: "1234" → 12,34 (padrão dos apps de banco) */
export function centavosDigitados(texto: string) {
  const d = somenteDigitos(texto).replace(/^0+(?=\d)/, '').slice(0, 13)
  return d ? Number(d) / 100 : null
}
