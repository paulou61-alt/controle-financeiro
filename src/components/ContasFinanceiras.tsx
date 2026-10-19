import { useState } from 'react'
import { Archive, ArchiveRestore, ArrowLeftRight, ArrowRight, ChevronDown, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import type { ContaFinanceira, Lancamento, Transferencia } from '../types'
import { saldoConta, temHistorico } from '../financas'
import { formatData } from '../utils'
import { Valor, useFmt } from '../ui'
import { IconeConta, TIPOS_CONTA } from './comuns'

interface Props {
  contas: ContaFinanceira[]
  lancamentos: Lancamento[]
  transferencias: Transferencia[]
  onNovaConta: () => void
  onEditarConta: (c: ContaFinanceira) => void
  onArquivar: (c: ContaFinanceira) => void
  onExcluirConta: (c: ContaFinanceira) => void
  onTransferir: (origemId?: string) => void
  onExcluirTransferencia: (id: string) => void
}

export default function ContasFinanceiras(p: Props) {
  const { contas, lancamentos, transferencias } = p
  const fmt = useFmt()
  const [verArquivadas, setVerArquivadas] = useState(false)
  const [limite, setLimite] = useState(15)

  const ativas = contas.filter((c) => !c.arquivada)
  const arquivadas = contas.filter((c) => c.arquivada)
  const saldo = (c: ContaFinanceira) => saldoConta(c, lancamentos, transferencias)
  const total = contas.reduce((s, c) => s + saldo(c), 0)
  const nome = (id: string) => contas.find((c) => c.id === id)?.nome ?? 'Conta removida'
  const movs = (id: string) => lancamentos.filter((l) => l.contaId === id).length + transferencias.filter((t) => t.origemId === id || t.destinoId === id).length
  const listaTransf = [...transferencias].sort((a, b) => b.data.localeCompare(a.data))

  const cartaoConta = (c: ContaFinanceira) => {
    const historico = temHistorico(c.id, lancamentos, transferencias)
    const s = saldo(c)
    return (
      <li key={c.id} className={`cartao conta-item ${c.arquivada ? 'arquivada' : ''}`}>
        <div className="orc-topo">
          <IconeConta tipo={c.tipo} tamanho={44} />
          <div className="orc-nome">
            <strong>{c.nome}</strong>
            <span>{TIPOS_CONTA.find((t) => t.id === c.tipo)?.rotulo}{c.arquivada ? ' · arquivada' : ''}</span>
          </div>
        </div>
        <div>
          <span className="kpi-rotulo">Saldo atual</span>
          <Valor v={s} className={`conta-saldo ${s < 0 ? 'despesa' : ''}`} />
        </div>
        <span className="kpi-nota">
          Saldo inicial {fmt(c.saldoInicial)} em {formatData(c.dataSaldoInicial)} · {movs(c.id)} movimentação(ões)
        </span>
        <div className="conta-acoes">
          {!c.arquivada && <button className="btn pequeno" onClick={() => p.onTransferir(c.id)}><ArrowLeftRight size={14} /> Transferir</button>}
          <button className="btn-icone pequeno" onClick={() => p.onEditarConta(c)} aria-label={`Editar ${c.nome}`} title="Editar"><Pencil size={15} /></button>
          {historico || c.arquivada ? (
            <button className="btn-icone pequeno" onClick={() => p.onArquivar(c)} aria-label={c.arquivada ? 'Reativar conta' : 'Arquivar conta'} title={c.arquivada ? 'Reativar' : 'Arquivar (preserva o histórico)'}>
              {c.arquivada ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            </button>
          ) : null}
          {!historico && (
            <button className="btn-icone pequeno perigo" onClick={() => p.onExcluirConta(c)} aria-label={`Excluir ${c.nome}`} title="Excluir"><Trash2 size={15} /></button>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="pagina">
      <section className="cartao resumo-orc">
        <span className="kpi-icone roxo grande"><Wallet size={26} /></span>
        <div className="resumo-orc-texto">
          <span className="kpi-rotulo">Saldo total das contas</span>
          <Valor v={total} className={`mini-valor ${total < 0 ? 'despesa' : ''}`} />
          <span className="kpi-nota">{ativas.length} conta(s) ativa(s){arquivadas.length ? ` · ${arquivadas.length} arquivada(s)` : ''}</span>
        </div>
        <div className="acoes-esq empurrar">
          <button className="btn" onClick={() => p.onTransferir()} disabled={ativas.length < 2}><ArrowLeftRight size={16} /> Transferir</button>
          <button className="btn primario" onClick={p.onNovaConta}><Plus size={16} /> Nova conta</button>
        </div>
      </section>

      <ul className="grade-orc">{ativas.map(cartaoConta)}</ul>

      {arquivadas.length > 0 && (
        <section className="cartao">
          <button className="cab-recolher" onClick={() => setVerArquivadas(!verArquivadas)} aria-expanded={verArquivadas}>
            <span><Archive size={16} /> Contas arquivadas ({arquivadas.length})</span>
            <ChevronDown size={18} className={verArquivadas ? 'girado' : ''} />
          </button>
          {verArquivadas && <ul className="grade-orc espaco-topo">{arquivadas.map(cartaoConta)}</ul>}
        </section>
      )}

      <section className="cartao">
        <h3><ArrowLeftRight size={18} /> Transferências entre contas</h3>
        <p className="cartao-sub">Transferências movimentam as duas contas e não entram como receita nem despesa.</p>
        {listaTransf.length === 0 ? (
          <p className="vazio">Nenhuma transferência registrada.</p>
        ) : (
          <>
            <ul className="lista-mov">
              {listaTransf.slice(0, limite).map((t) => (
                <li key={t.id}>
                  <span className="kpi-icone roxo"><ArrowLeftRight size={17} /></span>
                  <div className="mov-info">
                    <strong>{nome(t.origemId)} <ArrowRight size={13} className="seta-inline" /> {nome(t.destinoId)}</strong>
                    <span>{formatData(t.data)}{t.descricao ? ` · ${t.descricao}` : ''}</span>
                  </div>
                  <span className="num mov-valor">{fmt(t.valor)}</span>
                  <span className="mov-acoes">
                    <button className="btn-icone pequeno perigo" onClick={() => p.onExcluirTransferencia(t.id)} aria-label="Excluir transferência" title="Excluir"><Trash2 size={15} /></button>
                  </span>
                </li>
              ))}
            </ul>
            {listaTransf.length > limite && (
              <button className="btn link mostrar-mais" onClick={() => setLimite(limite + 20)}>Mostrar mais</button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
