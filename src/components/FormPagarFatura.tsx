import { useState } from 'react'
import type { ContaFinanceira, Lancamento, Transferencia } from '../types'
import { saldoConta, type Fatura } from '../financas'
import { formatData, hojeISO, rotuloMes, uid } from '../utils'
import { useFmt } from '../ui'
import { Modal } from './comuns'
import { InputMoeda } from './campos'

interface Props {
  fatura: Fatura
  contas: ContaFinanceira[]
  lancamentos: Lancamento[]
  transferencias: Transferencia[]
  onSalvar: (t: Transferencia) => void
  onFechar: () => void
}

export default function FormPagarFatura({ fatura, contas, lancamentos, transferencias, onSalvar, onFechar }: Props) {
  const fmt = useFmt()
  const pagadoras = contas.filter((c) => c.tipo !== 'cartao' && !c.arquivada)
  const [valor, setValor] = useState<number | null>(fatura.restante)
  const [contaId, setContaId] = useState(pagadoras.some((c) => c.id === fatura.cartao.contaPagamentoId) ? fatura.cartao.contaPagamentoId! : pagadoras[0]?.id ?? '')
  const [data, setData] = useState(hojeISO())
  const [erro, setErro] = useState('')
  const conta = contas.find((c) => c.id === contaId)

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const num = valor ?? NaN
    if (!contaId) return setErro('Escolha a conta que vai pagar a fatura.')
    if (!Number.isFinite(num) || num <= 0) return setErro('Informe um valor maior que zero.')
    if (!data) return setErro('Informe a data do pagamento.')
    onSalvar({
      id: uid(), origemId: contaId, destinoId: fatura.cartao.id, valor: Math.round(num * 100) / 100, data,
      descricao: `Pagamento da fatura ${fatura.cartao.nome} ${rotuloMes(fatura.chave)}`, fatura: { cartaoId: fatura.cartao.id, chave: fatura.chave },
    })
  }

  return (
    <Modal titulo={`Pagar fatura · ${fatura.cartao.nome}`} onFechar={onFechar} onSubmit={enviar} className="tipo-despesa">
      <div className="resumo-fatura">
        <div><span>Fatura</span><strong>{rotuloMes(fatura.chave, true)}</strong></div>
        <div><span>Vencimento</span><strong>{formatData(fatura.vencimento)}</strong></div>
        <div><span>Total</span><strong className="num">{fmt(fatura.total)}</strong></div>
        <div><span>Em aberto</span><strong className="num despesa">{fmt(fatura.restante)}</strong></div>
      </div>
      <label className="valor-grande">
        <span>Valor do pagamento</span>
        <div>
          <em>R$</em>
          <InputMoeda autoFocus valor={valor} onChange={setValor} aria-label="Valor" />
        </div>
      </label>
      <div className="linha">
        <label className="campo">
          <span>Pagar com</span>
          <select value={contaId} onChange={(e) => setContaId(e.target.value)} aria-label="Conta">
            {pagadoras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {conta && <small>Saldo atual: {fmt(saldoConta(conta, lancamentos, transferencias))}</small>}
        </label>
        <label className="campo">
          <span>Data do pagamento</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data do pagamento" />
        </label>
      </div>
      <p className="ajuda">Você pode pagar um valor parcial. O pagamento sai da conta escolhida e não conta como nova despesa, porque as compras já foram lançadas.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">Confirmar pagamento</button>
      </div>
    </Modal>
  )
}
