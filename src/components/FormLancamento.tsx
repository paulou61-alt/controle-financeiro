import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Tipo } from '../types'
import { hojeISO, parseValor, uid } from '../utils'
import { IconeCategoria } from '../ui'
import { Modal } from './comuns'

interface Props {
  inicial: Lancamento | null
  tipoInicial: Tipo
  contaInicial?: string
  categorias: Categoria[]
  contas: ContaFinanceira[]
  contatos: string[]
  onSalvar: (l: Lancamento, repetirMeses: number) => void
  onFechar: () => void
}

export default function FormLancamento({ inicial, tipoInicial, contaInicial, categorias, contas, contatos, onSalvar, onFechar }: Props) {
  const hoje = hojeISO()
  const ativas = useMemo(() => contas.filter((c) => !c.arquivada || c.id === inicial?.contaId), [contas, inicial])
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? tipoInicial)
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valor, setValor] = useState(inicial ? inicial.valor.toFixed(2).replace('.', ',') : '')
  const [data, setData] = useState(inicial?.data ?? hoje)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [contaId, setContaId] = useState(
    inicial?.contaId ?? (ativas.some((c) => c.id === contaInicial) ? contaInicial! : ativas[0]?.id ?? ''),
  )
  const [pago, setPago] = useState(inicial?.pago ?? false)
  const [dataPagamento, setDataPagamento] = useState(inicial?.dataPagamento ?? hoje)
  const [contato, setContato] = useState(inicial?.contato ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [repetir, setRepetir] = useState(1)
  const [erro, setErro] = useState('')

  const cats = categorias.filter((c) => c.tipo === tipo)
  const despesa = tipo === 'despesa'

  useEffect(() => {
    if (!cats.some((c) => c.id === categoriaId)) setCategoriaId(cats[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseValor(valor)
    if (!Number.isFinite(num) || num <= 0) return setErro('Informe um valor maior que zero.')
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!categoriaId) return setErro('Escolha uma categoria.')
    if (!contaId) return setErro('Cadastre uma conta financeira antes de lançar.')
    if (!data) return setErro('Informe a data de vencimento.')
    if (pago && !dataPagamento) return setErro(`Informe a data do ${despesa ? 'pagamento' : 'recebimento'}.`)
    onSalvar(
      {
        id: inicial?.id ?? uid(),
        tipo,
        descricao: descricao.trim(),
        valor: Math.round(num * 100) / 100,
        data,
        categoriaId,
        contaId,
        pago,
        dataPagamento: pago ? dataPagamento : undefined,
        contato: contato.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      },
      repetir,
    )
  }

  return (
    <Modal titulo={inicial ? 'Editar lançamento' : despesa ? 'Nova despesa' : 'Nova receita'} onFechar={onFechar} onSubmit={enviar} className={`tipo-${tipo}`}>
      <div className="alternador" role="group" aria-label="Tipo">
        <button type="button" className={despesa ? 'ativo despesa' : ''} onClick={() => setTipo('despesa')}><ArrowDownRight size={17} /> Despesa</button>
        <button type="button" className={!despesa ? 'ativo receita' : ''} onClick={() => setTipo('receita')}><ArrowUpRight size={17} /> Receita</button>
      </div>

      <label className="valor-grande">
        <span>Valor</span>
        <div>
          <em>R$</em>
          <input autoFocus inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" aria-label="Valor" />
        </div>
      </label>

      <label className="campo">
        <span>Descrição</span>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={despesa ? 'Ex.: Aluguel, fornecedor, energia' : 'Ex.: Venda, serviço prestado'} />
      </label>

      <div className="campo">
        <span>Categoria</span>
        <div className="chips-cat" role="radiogroup" aria-label="Categoria">
          {cats.map((c) => (
            <button type="button" key={c.id} role="radio" aria-checked={categoriaId === c.id}
              className={categoriaId === c.id ? 'ativo' : ''} onClick={() => setCategoriaId(c.id)}
              style={categoriaId === c.id ? { borderColor: c.cor } : undefined}>
              <IconeCategoria cat={c} tamanho={26} />
              {c.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="linha">
        <label className="campo">
          <span>Conta financeira</span>
          <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
            {ativas.length === 0 && <option value="">Nenhuma conta ativa</option>}
            {ativas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Vencimento</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>

      <div className="campo">
        <span>Situação</span>
        <div className="segmentado largo" role="group" aria-label="Situação">
          <button type="button" className={!pago ? 'ativo' : ''} onClick={() => setPago(false)}>Pendente</button>
          <button type="button" className={pago ? 'ativo' : ''} onClick={() => setPago(true)}>{despesa ? 'Pago' : 'Recebido'}</button>
        </div>
      </div>
      {pago && (
        <label className="campo">
          <span>Data do {despesa ? 'pagamento' : 'recebimento'}</span>
          <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
        </label>
      )}

      <div className="linha">
        <label className="campo">
          <span>{despesa ? 'Fornecedor' : 'Cliente'} <em className="opcional">(opcional)</em></span>
          <input value={contato} onChange={(e) => setContato(e.target.value)} list="lista-contatos" placeholder={despesa ? 'Nome do fornecedor' : 'Nome do cliente'} />
          <datalist id="lista-contatos">{contatos.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        {!inicial && (
          <label className="campo">
            <span>Repetir</span>
            <select value={repetir} onChange={(e) => setRepetir(Number(e.target.value))}>
              <option value={1}>Não repetir</option>
              {[2, 3, 6, 12, 24].map((n) => <option key={n} value={n}>Por {n} meses</option>)}
            </select>
          </label>
        )}
      </div>

      <label className="campo">
        <span>Observações <em className="opcional">(opcional)</em></span>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Anotações sobre este lançamento" />
      </label>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">Salvar lançamento</button>
      </div>
    </Modal>
  )
}
