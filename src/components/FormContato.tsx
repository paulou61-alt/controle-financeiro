import { useState } from 'react'
import type { Contato, PapelContato } from '../types'
import { documentoCompleto, rotuloDocumento, validarDocumento, validarEmail, validarTelefone, normalizarDocumento, type TipoPessoa } from '../formatos'
import { uid } from '../utils'
import { InputDocumento, InputTelefone, SeletorPessoa } from './campos'
import { Modal } from './comuns'

interface Props {
  inicial: Contato | null
  papelInicial?: PapelContato
  contatos: Contato[]
  onSalvar: (c: Contato) => void
  onFechar: () => void
}

const PAPEIS: { id: PapelContato; rotulo: string }[] = [
  { id: 'cliente', rotulo: 'Cliente' },
  { id: 'fornecedor', rotulo: 'Fornecedor' },
  { id: 'ambos', rotulo: 'Cliente e fornecedor' },
]

export default function FormContato({ inicial, papelInicial, contatos, onSalvar, onFechar }: Props) {
  const [papel, setPapel] = useState<PapelContato>(inicial?.papel ?? papelInicial ?? 'cliente')
  const [pessoa, setPessoa] = useState<TipoPessoa>(inicial?.pessoa ?? 'fisica')
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [documento, setDocumento] = useState(inicial?.documento ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [erro, setErro] = useState('')

  const trocarPessoa = (p: TipoPessoa) => {
    setPessoa(p)
    setDocumento((d) => normalizarDocumento(d, p))
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nome.trim()
    if (!n) return setErro(pessoa === 'fisica' ? 'Informe o nome.' : 'Informe a razão social ou nome fantasia.')
    if (contatos.some((c) => c.id !== inicial?.id && c.nome.trim().toLowerCase() === n.toLowerCase()))
      return setErro('Já existe um cadastro com esse nome.')
    if (documento) {
      if (!documentoCompleto(documento, pessoa) || !validarDocumento(documento, pessoa)) return setErro(`${rotuloDocumento(pessoa)} inválido.`)
      const repetido = contatos.find((c) => c.id !== inicial?.id && c.documento === documento)
      if (repetido) return setErro(`Esse ${rotuloDocumento(pessoa)} já está cadastrado para "${repetido.nome}".`)
    }
    if (email.trim() && !validarEmail(email)) return setErro('E-mail inválido.')
    if (telefone && !validarTelefone(telefone)) return setErro('Telefone inválido. Use DDD + número.')
    onSalvar({
      id: inicial?.id ?? uid(), nome: n, papel, pessoa,
      documento: documento || undefined, email: email.trim().toLowerCase() || undefined,
      telefone: telefone || undefined, observacoes: observacoes.trim() || undefined,
    })
  }

  return (
    <Modal titulo={inicial ? 'Editar cadastro' : 'Novo cliente ou fornecedor'} onFechar={onFechar} onSubmit={enviar}>
      <div className="campo">
        <span>Tipo de cadastro</span>
        <div className="segmentado largo" role="radiogroup" aria-label="Papel">
          {PAPEIS.map((p) => (
            <button type="button" key={p.id} role="radio" aria-checked={papel === p.id} className={papel === p.id ? 'ativo' : ''} onClick={() => setPapel(p.id)}>
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <span>Pessoa</span>
        <SeletorPessoa valor={pessoa} onChange={trocarPessoa} />
      </div>
      <label className="campo">
        <span>{pessoa === 'fisica' ? 'Nome completo' : 'Razão social ou nome fantasia'}</span>
        <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80}
          placeholder={pessoa === 'fisica' ? 'Ex.: Maria da Silva' : 'Ex.: Padaria Bom Pão Ltda'} aria-label="Nome" />
      </label>
      <InputDocumento pessoa={pessoa} valor={documento} onChange={setDocumento} />
      <div className="linha">
        <label className="campo">
          <span>E-mail <em className="opcional">(opcional)</em></span>
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" aria-label="E-mail" />
        </label>
        <InputTelefone valor={telefone} onChange={setTelefone} />
      </div>
      <label className="campo">
        <span>Observações <em className="opcional">(opcional)</em></span>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Endereço, condições de pagamento, contato…" />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">{inicial ? 'Salvar alterações' : 'Cadastrar'}</button>
      </div>
    </Modal>
  )
}
