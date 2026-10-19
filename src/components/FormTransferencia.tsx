import { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import type { ContaFinanceira, Lancamento, Transferencia } from '../types'
import { saldoConta } from '../financas'
import { hojeISO, uid } from '../utils'
import { useFmt } from '../ui'
import { Modal } from './comuns'
import { InputMoeda } from './campos'

interface Props {
  contas: ContaFinanceira[]
  lancamentos: Lancamento[]
  transferencias: Transferencia[]
  origemInicial?: string
  onSalvar: (t: Transferencia) => void
  onFechar: () => void
}

export default function FormTransferencia({ contas, lancamentos, transferencias, origemInicial, onSalvar, onFechar }: Props) {
  const fmt = useFmt()
  // cartões recebem pagamento pela fatura, não por transferência comum
  const ativas = contas.filter((c) => !c.arquivada && c.tipo !== 'cartao')
  const [origemId, setOrigemId] = useState(ativas.some((c) => c.id === origemInicial) ? origemInicial! : ativas[0]?.id ?? '')
  const [destinoId, setDestinoId] = useState(ativas.find((c) => c.id !== (origemInicial || ativas[0]?.id))?.id ?? '')
  const [valor, setValor] = useState<number | null>(null)
  const [data, setData] = useState(hojeISO())
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')

  const saldo = (id: string) => {
    const c = contas.find((x) => x.id === id)
    return c ? saldoConta(c, lancamentos, transferencias) : 0
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const num = valor ?? NaN
    if (ativas.length < 2) return setErro('Cadastre pelo menos duas contas para transferir.')
    if (!origemId || !destinoId) return setErro('Escolha a conta de origem e a de destino.')
    if (origemId === destinoId) return setErro('A conta de origem e a de destino precisam ser diferentes.')
    if (!Number.isFinite(num) || num <= 0) return setErro('Informe um valor maior que zero.')
    if (!data) return setErro('Informe a data.')
    onSalvar({ id: uid(), origemId, destinoId, valor: Math.round(num * 100) / 100, data, descricao: descricao.trim() || undefined })
  }

  return (
    <Modal titulo="Transferir entre contas" onFechar={onFechar} onSubmit={enviar} className="tipo-transferencia">
      <p className="ajuda">Movimenta dinheiro entre suas próprias contas. Não conta como receita nem como despesa.</p>

      <label className="valor-grande">
        <span>Valor</span>
        <div>
          <em>R$</em>
          <InputMoeda autoFocus valor={valor} onChange={setValor} aria-label="Valor" />
        </div>
      </label>

      <div className="transf-contas">
        <label className="campo">
          <span>De</span>
          <select value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
            {ativas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {origemId && <small>Saldo atual: {fmt(saldo(origemId))}</small>}
        </label>
        <span className="transf-seta" aria-hidden="true"><ArrowDown size={18} /></span>
        <label className="campo">
          <span>Para</span>
          <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
            {ativas.map((c) => <option key={c.id} value={c.id} disabled={c.id === origemId}>{c.nome}</option>)}
          </select>
          {destinoId && <small>Saldo atual: {fmt(saldo(destinoId))}</small>}
        </label>
      </div>

      <div className="linha">
        <label className="campo">
          <span>Data</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="campo">
          <span>Descrição <em className="opcional">(opcional)</em></span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Depósito do caixa" />
        </label>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">Transferir</button>
      </div>
    </Modal>
  )
}
