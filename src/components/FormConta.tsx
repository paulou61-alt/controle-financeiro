import { useState } from 'react'
import type { ContaFinanceira, TipoConta } from '../types'
import { hojeISO, parseValor, uid } from '../utils'
import { Modal, TIPOS_CONTA } from './comuns'

interface Props {
  inicial: ContaFinanceira | null
  onSalvar: (c: ContaFinanceira) => void
  onFechar: () => void
}

export default function FormConta({ inicial, onSalvar, onFechar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [tipo, setTipo] = useState<TipoConta>(inicial?.tipo ?? 'banco')
  const [saldo, setSaldo] = useState(inicial ? inicial.saldoInicial.toFixed(2).replace('.', ',') : '')
  const [data, setData] = useState(inicial?.dataSaldoInicial ?? hojeISO())
  const [erro, setErro] = useState('')

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const num = saldo.trim() ? parseValor(saldo) : 0
    if (!nome.trim()) return setErro('Informe o nome da conta.')
    if (!Number.isFinite(num)) return setErro('Saldo inicial inválido.')
    if (!data) return setErro('Informe a data do saldo inicial.')
    onSalvar({ ...inicial, id: inicial?.id ?? uid(), nome: nome.trim(), tipo, saldoInicial: Math.round(num * 100) / 100, dataSaldoInicial: data })
  }

  return (
    <Modal titulo={inicial ? 'Editar conta' : 'Nova conta financeira'} onFechar={onFechar} onSubmit={enviar}>
      <div className="campo">
        <span>Tipo</span>
        <div className="opcoes-tema" role="radiogroup" aria-label="Tipo de conta">
          {TIPOS_CONTA.map((t) => {
            const Icone = t.icone
            return (
              <button type="button" key={t.id} role="radio" aria-checked={tipo === t.id} className={tipo === t.id ? 'ativo' : ''} onClick={() => setTipo(t.id)}>
                <Icone size={20} /> {t.rotulo}
              </button>
            )
          })}
        </div>
      </div>
      <label className="campo">
        <span>Nome</span>
        <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Banco do Brasil, Caixa da loja, Mercado Pago" maxLength={40} />
      </label>
      <div className="linha">
        <label className="campo">
          <span>Saldo inicial (R$)</span>
          <input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} placeholder="0,00" />
        </label>
        <label className="campo">
          <span>Data do saldo inicial</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>
      <p className="ajuda">O saldo da conta é calculado a partir desse valor, somando apenas as movimentações realizadas desta data em diante.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">{inicial ? 'Salvar alterações' : 'Criar conta'}</button>
      </div>
    </Modal>
  )
}
