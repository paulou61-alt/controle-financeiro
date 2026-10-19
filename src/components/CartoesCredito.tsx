import { useEffect, useMemo, useState } from 'react'
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, CreditCard, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Transferencia } from '../types'
import { resumoCartao, temHistorico, type Fatura } from '../financas'
import { formatData, rotuloMes } from '../utils'
import { useFmt } from '../ui'
import { LinhaLancamento, PilulaFatura } from './comuns'

interface Props {
  contas: ContaFinanceira[]
  lancamentos: Lancamento[]
  transferencias: Transferencia[]
  catPorId: Map<string, Categoria>
  contaPorId: Map<string, ContaFinanceira>
  cartaoInicial?: string
  faturaInicial?: string
  onNovoCartao: () => void
  onEditarCartao: (c: ContaFinanceira) => void
  onArquivar: (c: ContaFinanceira) => void
  onExcluir: (c: ContaFinanceira) => void
  onNovaCompra: (cartaoId: string) => void
  onPagar: (f: Fatura) => void
  onImportar: (cartaoId: string) => void
  onEditar: (l: Lancamento) => void
  onExcluirLancamento: (id: string) => void
  onExcluirPagamento: (id: string) => void
}

export default function CartoesCredito(p: Props) {
  const fmt = useFmt()
  const cartoes = p.contas.filter((c) => c.tipo === 'cartao' && !c.arquivada)
  const arquivados = p.contas.filter((c) => c.tipo === 'cartao' && c.arquivada)
  const [selecionado, setSelecionado] = useState(p.cartaoInicial && p.contas.some((c) => c.id === p.cartaoInicial) ? p.cartaoInicial : cartoes[0]?.id ?? '')
  const cartao = p.contas.find((c) => c.id === selecionado)
  const resumo = useMemo(() => (cartao ? resumoCartao(cartao, p.lancamentos, p.transferencias) : null), [cartao, p.lancamentos, p.transferencias])
  const [chave, setChave] = useState(p.faturaInicial ?? '')

  useEffect(() => {
    if (!selecionado && cartoes[0]) setSelecionado(cartoes[0].id)
  }, [cartoes, selecionado])
  useEffect(() => {
    if (resumo && !resumo.faturas.some((f) => f.chave === chave)) setChave(resumo.atual.chave)
  }, [resumo, chave])

  if (cartoes.length === 0 && arquivados.length === 0) {
    return (
      <div className="boas-vindas">
        <span className="bv-icone"><CreditCard size={30} /></span>
        <h2>Controle seus cartões de crédito</h2>
        <p>Cadastre o cartão com limite, fechamento e vencimento. As compras (inclusive parceladas) vão para a fatura certa automaticamente.</p>
        <div className="bv-acoes"><button className="btn primario grande" onClick={p.onNovoCartao}><Plus size={18} /> Cadastrar cartão</button></div>
      </div>
    )
  }

  const idx = resumo ? resumo.faturas.findIndex((f) => f.chave === chave) : -1
  const fatura = resumo && idx >= 0 ? resumo.faturas[idx] : resumo?.atual
  const pagamentos = cartao ? p.transferencias.filter((t) => t.destinoId === cartao.id).sort((a, b) => b.data.localeCompare(a.data)) : []
  const pagamentosDaFatura = fatura ? pagamentos.filter((t) => t.fatura?.chave === fatura.chave) : []

  return (
    <div className="pagina">
      <div className="faixa-cartoes">
        {cartoes.map((c) => {
          const r = resumoCartao(c, p.lancamentos, p.transferencias)
          const pct = r.limite > 0 ? Math.min(100, (r.usado / r.limite) * 100) : 0
          return (
            <button key={c.id} className={`cartao-visual ${selecionado === c.id ? 'ativo' : ''}`} onClick={() => setSelecionado(c.id)}>
              <span className="cv-topo"><CreditCard size={20} /> {c.nome}</span>
              <span className="cv-rot">Fatura atual · {rotuloMes(r.atual.chave)}</span>
              <strong className="num">{fmt(r.atual.total)}</strong>
              <span className="cv-barra"><i style={{ width: `${pct}%` }} /></span>
              <span className="cv-rodape">
                <span>Disponível {fmt(r.disponivel)}</span>
                <span>Fecha dia {c.diaFechamento} · vence dia {c.diaVencimento}</span>
              </span>
            </button>
          )
        })}
        <button className="cartao-visual novo" onClick={p.onNovoCartao}><Plus size={22} /> Novo cartão</button>
      </div>

      {cartao && resumo && fatura && (
        <section className="cartao">
          <div className="cartao-cab">
            <div className="nav-fatura">
              <button className="btn-icone pequeno" onClick={() => idx > 0 && setChave(resumo.faturas[idx - 1].chave)} disabled={idx <= 0} aria-label="Fatura anterior"><ChevronLeft size={18} /></button>
              <h3>Fatura de {rotuloMes(fatura.chave, true)}</h3>
              <button className="btn-icone pequeno" onClick={() => idx < resumo.faturas.length - 1 && setChave(resumo.faturas[idx + 1].chave)} disabled={idx >= resumo.faturas.length - 1} aria-label="Próxima fatura"><ChevronRight size={18} /></button>
              <PilulaFatura f={fatura} />
            </div>
            <div className="acoes-esq">
              <button className="btn" onClick={() => p.onImportar(cartao.id)}><Upload size={16} /> Importar fatura</button>
              <button className="btn acao-despesa" onClick={() => p.onNovaCompra(cartao.id)}><Plus size={16} /> Nova compra</button>
              {fatura.restante > 0 && fatura.status !== 'futura' && (
                <button className="btn primario" onClick={() => p.onPagar(fatura)}>Pagar fatura</button>
              )}
            </div>
          </div>

          <div className="resumo-fatura">
            <div><span>Fechamento</span><strong>{formatData(fatura.fechamento)}</strong></div>
            <div><span>Vencimento</span><strong>{formatData(fatura.vencimento)}</strong></div>
            <div><span>Total</span><strong className="num">{fmt(fatura.total)}</strong></div>
            <div><span>Pago</span><strong className="num receita">{fmt(fatura.pago)}</strong></div>
            <div><span>Em aberto</span><strong className="num despesa">{fmt(Math.max(0, fatura.restante))}</strong></div>
            <div><span>Limite usado</span><strong className="num">{fmt(resumo.usado)} de {fmt(resumo.limite)}</strong></div>
          </div>

          {fatura.compras.length === 0 ? (
            <p className="vazio">Nenhuma compra nesta fatura.</p>
          ) : (
            <ul className="lista-mov">
              {fatura.compras.map((l) => (
                <LinhaLancamento key={l.id} l={l} cat={p.catPorId.get(l.categoriaId)} conta={p.contaPorId.get(l.contaId)} mostrarData
                  onBaixa={() => {}} onReverter={() => {}} onEditar={p.onEditar} onExcluir={p.onExcluirLancamento} />
              ))}
            </ul>
          )}

          {pagamentosDaFatura.length > 0 && (
            <>
              <h4 className="subtitulo-lista">Pagamentos desta fatura</h4>
              <ul className="lista-mov">
                {pagamentosDaFatura.map((t) => (
                  <li key={t.id}>
                    <span className="kpi-icone verde"><CreditCard size={17} /></span>
                    <div className="mov-info">
                      <strong>Pagamento · {p.contaPorId.get(t.origemId)?.nome ?? 'Conta'}</strong>
                      <span>{formatData(t.data)}</span>
                    </div>
                    <span className="num mov-valor receita">{fmt(t.valor)}</span>
                    <span className="mov-acoes">
                      <button className="btn-icone pequeno perigo" onClick={() => p.onExcluirPagamento(t.id)} aria-label="Desfazer pagamento" title="Desfazer pagamento"><Trash2 size={15} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="conta-acoes rodape-cartao">
            <span className="kpi-nota">Fatura paga por {p.contaPorId.get(cartao.contaPagamentoId ?? '')?.nome ?? '—'}</span>
            <button className="btn-icone pequeno" onClick={() => p.onEditarCartao(cartao)} aria-label="Editar cartão" title="Editar cartão"><Pencil size={15} /></button>
            {temHistorico(cartao.id, p.lancamentos, p.transferencias) ? (
              <button className="btn-icone pequeno" onClick={() => p.onArquivar(cartao)} aria-label="Arquivar cartão" title="Arquivar (preserva o histórico)"><Archive size={15} /></button>
            ) : (
              <button className="btn-icone pequeno perigo" onClick={() => p.onExcluir(cartao)} aria-label="Excluir cartão" title="Excluir"><Trash2 size={15} /></button>
            )}
          </div>
        </section>
      )}

      {arquivados.length > 0 && (
        <section className="cartao">
          <h3><Archive size={16} /> Cartões arquivados</h3>
          <ul className="lista-mov">
            {arquivados.map((c) => (
              <li key={c.id}>
                <span className="kpi-icone amarelo"><CreditCard size={17} /></span>
                <div className="mov-info"><strong>{c.nome}</strong><span>Arquivado · histórico preservado</span></div>
                <span className="mov-acoes">
                  <button className="btn-icone pequeno" onClick={() => p.onArquivar(c)} aria-label="Reativar cartão" title="Reativar"><ArchiveRestore size={15} /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
