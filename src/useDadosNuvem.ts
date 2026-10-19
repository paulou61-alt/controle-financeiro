import { useCallback, useEffect, useRef, useState } from 'react'
import type { Categoria, ContaFinanceira, Lancamento, Orcamentos, Transferencia } from './types'
import { supabase } from './supabase'
import { CATEGORIAS_PADRAO, hojeISO } from './utils'

export interface Dados {
  nome: string
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
  contas: ContaFinanceira[]
  transferencias: Transferencia[]
}

export type StatusNuvem = 'carregando' | 'erro-carregar' | 'salvo' | 'salvando' | 'erro-salvar'

export const contaPrincipal = (dataSaldoInicial = hojeISO()): ContaFinanceira => ({
  id: 'principal', nome: 'Conta principal', tipo: 'banco', saldoInicial: 0, dataSaldoInicial,
})

const padrao = (nome: string): Dados => ({
  nome, categorias: CATEGORIAS_PADRAO, lancamentos: [], orcamentos: {}, contas: [contaPrincipal()], transferencias: [],
})

/** Garante o formato atual dos dados, migrando versões antigas (sem contas financeiras) */
export function normalizarDados(d: Partial<Dados>, nome = ''): Dados {
  const brutos: Partial<Lancamento>[] = Array.isArray(d.lancamentos) ? d.lancamentos : []
  let contas: ContaFinanceira[] = Array.isArray(d.contas) ? d.contas : []
  if (contas.length === 0) {
    const datas = brutos.flatMap((l) => [l.data, l.dataPagamento]).filter((x): x is string => !!x).sort()
    contas = [contaPrincipal(datas[0] ?? hojeISO())]
  }
  const ids = new Set(contas.map((c) => c.id))
  const contaPadrao = contas.find((c) => !c.arquivada)?.id ?? contas[0].id

  const lancamentos = brutos.map((l) => {
    const pago = !!l.pago
    return {
      ...l,
      contaId: l.contaId && ids.has(l.contaId) ? l.contaId : contaPadrao,
      pago,
      dataPagamento: pago ? l.dataPagamento ?? l.data : undefined,
    } as Lancamento
  })

  return {
    nome: typeof d.nome === 'string' ? d.nome : nome,
    categorias: Array.isArray(d.categorias) && d.categorias.length ? d.categorias : CATEGORIAS_PADRAO,
    lancamentos,
    orcamentos: d.orcamentos && typeof d.orcamentos === 'object' ? d.orcamentos : {},
    contas,
    transferencias: Array.isArray(d.transferencias) ? d.transferencias.filter((t) => ids.has(t.origemId) && ids.has(t.destinoId)) : [],
  }
}

const normalizar = normalizarDados

/** Dados da versão anterior (sem login), guardados no navegador */
function lerDadosAntigos(): Partial<Dados> | null {
  try {
    const l = JSON.parse(localStorage.getItem('cf:lancamentos') ?? 'null')
    if (!Array.isArray(l) || l.length === 0) return null
    return {
      lancamentos: l,
      categorias: JSON.parse(localStorage.getItem('cf:categorias') ?? 'null') ?? undefined,
      orcamentos: JSON.parse(localStorage.getItem('cf:orcamentos') ?? 'null') ?? undefined,
    }
  } catch {
    return null
  }
}

function apagarDadosAntigos() {
  try {
    ;['cf:lancamentos', 'cf:categorias', 'cf:orcamentos', 'cf:nome'].forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignora */
  }
}

export function useDadosNuvem(userId: string, nomeInicial: string) {
  const [dados, setDadosEstado] = useState<Dados | null>(null)
  const [status, setStatus] = useState<StatusNuvem>('carregando')
  const [tentativa, setTentativa] = useState(0)
  const ultimoSalvo = useRef('')

  const gravar = useCallback(
    (d: Dados) => supabase.from('dados_usuario').upsert({ user_id: userId, dados: d, atualizado_em: new Date().toISOString() }),
    [userId],
  )

  // Carrega do servidor
  useEffect(() => {
    let ativo = true
    setStatus('carregando')
    ;(async () => {
      const { data, error } = await supabase.from('dados_usuario').select('dados').eq('user_id', userId).maybeSingle()
      if (!ativo) return
      if (error) return setStatus('erro-carregar')

      let d: Dados
      let salvoNoServidor: string
      if (data?.dados && Object.keys(data.dados).length) {
        d = normalizar(data.dados as Partial<Dados>, nomeInicial)
        // se a migração alterou algo, o salvamento automático grava a versão nova
        salvoNoServidor = JSON.stringify(data.dados)
      } else {
        const antigos = lerDadosAntigos()
        d = antigos ? normalizar({ ...antigos, nome: nomeInicial }, nomeInicial) : padrao(nomeInicial)
        const { error: e2 } = await gravar(d)
        if (!ativo) return
        if (e2) return setStatus('erro-carregar')
        if (antigos) apagarDadosAntigos()
        salvoNoServidor = JSON.stringify(d)
      }
      ultimoSalvo.current = salvoNoServidor
      setDadosEstado(d)
      setStatus('salvo')
    })()
    return () => {
      ativo = false
    }
  }, [userId, nomeInicial, gravar, tentativa])

  // Salva automaticamente (com pequeno atraso para agrupar alterações)
  useEffect(() => {
    if (!dados) return
    const json = JSON.stringify(dados)
    if (json === ultimoSalvo.current) return
    setStatus('salvando')
    const t = setTimeout(async () => {
      const { error } = await gravar(dados)
      if (error) return setStatus('erro-salvar')
      ultimoSalvo.current = json
      setStatus('salvo')
    }, 700)
    return () => clearTimeout(t)
  }, [dados, gravar])

  // Avisa antes de fechar a aba com alterações não salvas
  useEffect(() => {
    if (status !== 'salvando' && status !== 'erro-salvar') return
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [status])

  const setDados = useCallback((f: (d: Dados) => Dados) => setDadosEstado((d) => (d ? f(d) : d)), [])
  const tentarNovamente = useCallback(() => {
    if (dados) {
      ultimoSalvo.current = ''
      setDadosEstado({ ...dados })
    } else setTentativa((n) => n + 1)
  }, [dados])

  return { dados, setDados, status, tentarNovamente }
}
