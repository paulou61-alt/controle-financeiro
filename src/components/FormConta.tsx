import { useState } from 'react'
import type { ContaFinanceira, TipoConta } from '../types'
import { hojeISO, uid } from '../utils'
import { Modal, TIPOS_CONTA } from './comuns'
import { InputMoeda } from './campos'

interface Props {
  inicial: ContaFinanceira | null
  tipoInicial?: TipoConta
  contas: ContaFinanceira[]
  onSalvar: (c: ContaFinanceira) => void
  onFechar: () => void
}

export default function FormConta({ inicial, tipoInicial, contas, onSalvar, onFechar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [tipo, setTipo] = useState<TipoConta>(inicial?.tipo ?? tipoInicial ?? 'banco')
  const [saldo, setSaldo] = useState<number | null>(inicial ? inicial.saldoInicial : null)
  const [data, setData] = useState(inicial?.dataSaldoInicial ?? hojeISO())
  const pagadoras = contas.filter((c) => c.tipo !== 'cartao' && !c.arquivada)
  const [limite, setLimite] = useState<number | null>(inicial?.limite ?? null)
  const [fechamento, setFechamento] = useState(String(inicial?.diaFechamento ?? 3))
  const [vencimento, setVencimento] = useState(String(inicial?.diaVencimento ?? 10))
  const [contaPagamentoId, setContaPagamentoId] = useState(inicial?.contaPagamentoId ?? pagadoras[0]?.id ?? '')
  const [erro, setErro] = useState('')
  const cartao = tipo === 'cartao'
  // um cartão não vira conta comum (e vice-versa) depois de criado, para não misturar o histórico
  const tipos = inicial ? TIPOS_CONTA.filter((t) => (t.id === 'cartao') === (inicial.tipo === 'cartao')) : TIPOS_CONTA

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return setErro(cartao ? 'Informe o nome do cartão.' : 'Informe o nome da conta.')
    if (cartao) {
      const lim = limite ?? 0
      const df = Math.round(Number(fechamento))
      const dv = Math.round(Number(vencimento))
      if (!Number.isFinite(lim) || lim < 0) return setErro('Limite inválido.')
      if (!(df >= 1 && df <= 31) || !(dv >= 1 && dv <= 31)) return setErro('Os dias de fechamento e vencimento devem ser entre 1 e 31.')
      if (!contaPagamentoId) return setErro('Escolha a conta que paga a fatura.')
      return onSalvar({
        ...inicial, id: inicial?.id ?? uid(), nome: nome.trim(), tipo, saldoInicial: 0, dataSaldoInicial: inicial?.dataSaldoInicial ?? hojeISO(),
        limite: Math.round(lim * 100) / 100, diaFechamento: df, diaVencimento: dv, contaPagamentoId,
      })
    }
    const num = saldo ?? 0
    if (!Number.isFinite(num)) return setErro('Saldo inicial inválido.')
    if (!data) return setErro('Informe a data do saldo inicial.')
    onSalvar({ ...inicial, id: inicial?.id ?? uid(), nome: nome.trim(), tipo, saldoInicial: Math.round(num * 100) / 100, dataSaldoInicial: data })
  }

  return (
    <Modal titulo={inicial ? (cartao ? 'Editar cartão' : 'Editar conta') : cartao ? 'Novo cartão de crédito' : 'Nova conta financeira'} onFechar={onFechar} onSubmit={enviar}>
      {tipos.length > 1 && (
        <div className="campo">
          <span>Tipo</span>
          <div className="opcoes-tema quatro" role="radiogroup" aria-label="Tipo de conta">
            {tipos.map((t) => {
              const Icone = t.icone
              return (
                <button type="button" key={t.id} role="radio" aria-checked={tipo === t.id} className={tipo === t.id ? 'ativo' : ''} onClick={() => setTipo(t.id)}>
                  <Icone size={20} /> {t.rotulo}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <label className="campo">
        <span>Nome</span>
        <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40}
          placeholder={cartao ? 'Ex.: Nubank, Itaú Platinum' : 'Ex.: Banco do Brasil, Caixa da loja, Mercado Pago'} />
      </label>

      {cartao ? (
        <>
          <label className="campo">
            <span>Limite (R$)</span>
            <InputMoeda valor={limite} onChange={setLimite} aria-label="Limite" />
          </label>
          <div className="linha">
            <label className="campo">
              <span>Dia do fechamento</span>
              <input type="number" min={1} max={31} value={fechamento} onChange={(e) => setFechamento(e.target.value)} aria-label="Dia do fechamento" />
            </label>
            <label className="campo">
              <span>Dia do vencimento</span>
              <input type="number" min={1} max={31} value={vencimento} onChange={(e) => setVencimento(e.target.value)} aria-label="Dia do vencimento" />
            </label>
          </div>
          <label className="campo">
            <span>Fatura paga pela conta</span>
            <select value={contaPagamentoId} onChange={(e) => setContaPagamentoId(e.target.value)} aria-label="Conta de pagamento">
              {pagadoras.length === 0 && <option value="">Cadastre uma conta bancária primeiro</option>}
              {pagadoras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <p className="ajuda">Compras feitas a partir do dia do fechamento entram na fatura seguinte. As compras não mexem no saldo da conta: ela só diminui quando você paga a fatura.</p>
        </>
      ) : (
        <>
          <div className="linha">
            <label className="campo">
              <span>Saldo inicial (R$)</span>
              <InputMoeda valor={saldo} onChange={setSaldo} permitirNegativo aria-label="Saldo inicial" />
            </label>
            <label className="campo">
              <span>Data do saldo inicial</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </label>
          </div>
          <p className="ajuda">O saldo da conta é calculado a partir desse valor, somando apenas as movimentações realizadas desta data em diante.</p>
        </>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">{inicial ? 'Salvar alterações' : cartao ? 'Criar cartão' : 'Criar conta'}</button>
      </div>
    </Modal>
  )
}
