import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CreditCard } from 'lucide-react'
import type { Categoria, ContaFinanceira, Frequencia, Lancamento, Tipo } from '../types'
import { ehCartao, faturaDaCompra } from '../financas'
import { FREQUENCIAS, type Repeticao } from '../series'
import { formatBRL, formatData, hojeISO, rotuloMes, uid } from '../utils'
import { IconeCategoria } from '../ui'
import { Modal, SeloSerie } from './comuns'
import { InputMoeda } from './campos'

interface Props {
  inicial: Lancamento | null
  tipoInicial: Tipo
  contaInicial?: string
  categorias: Categoria[]
  contas: ContaFinanceira[]
  contatos: string[]
  onSalvar: (l: Lancamento, rep: Repeticao) => void
  onFechar: () => void
}

type ModoRep = Repeticao['modo']

export default function FormLancamento({ inicial, tipoInicial, contaInicial, categorias, contas, contatos, onSalvar, onFechar }: Props) {
  const hoje = hojeISO()
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? tipoInicial)
  const despesa = tipo === 'despesa'
  // cartão de crédito só recebe despesas
  const disponiveis = useMemo(
    () => contas.filter((c) => (!c.arquivada || c.id === inicial?.contaId) && (despesa || !ehCartao(c))),
    [contas, inicial, despesa],
  )
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valor, setValor] = useState<number | null>(inicial?.valor ?? null)
  const [data, setData] = useState(inicial?.data ?? hoje)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [contaId, setContaId] = useState(
    inicial?.contaId ?? (disponiveis.some((c) => c.id === contaInicial) ? contaInicial! : disponiveis.find((c) => !ehCartao(c))?.id ?? disponiveis[0]?.id ?? ''),
  )
  const [pago, setPago] = useState(inicial?.pago ?? false)
  const [dataPagamento, setDataPagamento] = useState(inicial?.dataPagamento ?? hoje)
  const [contato, setContato] = useState(inicial?.contato ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [modoRep, setModoRep] = useState<ModoRep>('nenhuma')
  const [parcelas, setParcelas] = useState('2')
  const [valorTotal, setValorTotal] = useState(true)
  const [frequencia, setFrequencia] = useState<Frequencia>('mensal')
  const [semFim, setSemFim] = useState(true)
  const [vezes, setVezes] = useState('12')
  const [erro, setErro] = useState('')

  const cats = categorias.filter((c) => c.tipo === tipo)
  const conta = contas.find((c) => c.id === contaId)
  const cartao = ehCartao(conta)
  const fatura = cartao && data ? faturaDaCompra(conta!, data) : null

  useEffect(() => {
    if (!cats.some((c) => c.id === categoriaId)) setCategoriaId(cats[0]?.id ?? '')
    if (!disponiveis.some((c) => c.id === contaId)) setContaId(disponiveis.find((c) => !ehCartao(c))?.id ?? '')
    if (!despesa && modoRep === 'parcelado') setModoRep('nenhuma')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const num = valor ?? NaN
  const nParcelas = Math.round(Number(parcelas))
  const previaParcela = Number.isFinite(num) && num > 0 && nParcelas >= 2
    ? valorTotal ? `${nParcelas}x de ${formatBRL(num / nParcelas)} · total ${formatBRL(num)}` : `${nParcelas}x de ${formatBRL(num)} · total ${formatBRL(num * nParcelas)}`
    : ''

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number.isFinite(num) || num <= 0) return setErro('Informe um valor maior que zero.')
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!categoriaId) return setErro('Escolha uma categoria.')
    if (!contaId) return setErro('Cadastre uma conta financeira antes de lançar.')
    if (!data) return setErro(cartao ? 'Informe a data da compra.' : 'Informe a data de vencimento.')
    if (!cartao && pago && !dataPagamento) return setErro(`Informe a data do ${despesa ? 'pagamento' : 'recebimento'}.`)
    let rep: Repeticao = { modo: 'nenhuma' }
    if (!inicial && modoRep === 'parcelado') {
      if (!(nParcelas >= 2 && nParcelas <= 120)) return setErro('O número de parcelas deve ser entre 2 e 120.')
      rep = { modo: 'parcelado', vezes: nParcelas, valorTotal }
    }
    if (!inicial && modoRep === 'recorrente') {
      const n = Math.round(Number(vezes))
      if (!semFim && !(n >= 2 && n <= 360)) return setErro('Informe entre 2 e 360 repetições.')
      rep = { modo: 'recorrente', frequencia, vezes: semFim ? null : n }
    }
    onSalvar(
      {
        ...inicial,
        id: inicial?.id ?? uid(),
        tipo,
        descricao: descricao.trim(),
        valor: Math.round(num * 100) / 100,
        data,
        categoriaId,
        contaId,
        pago: cartao ? true : pago,
        dataPagamento: cartao ? data : pago ? dataPagamento : undefined,
        contato: contato.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      },
      rep,
    )
  }

  const titulo = inicial ? 'Editar lançamento' : cartao ? 'Nova compra no cartão' : despesa ? 'Nova despesa' : 'Nova receita'
  const caixa = disponiveis.filter((c) => !ehCartao(c))
  const cartoes = disponiveis.filter(ehCartao)

  return (
    <Modal titulo={titulo} onFechar={onFechar} onSubmit={enviar} className={`tipo-${tipo}`}>
      {inicial && (inicial.serieId) && (
        <p className="aviso-serie"><SeloSerie l={inicial} /> Este lançamento faz parte de {inicial.parcela ? 'um parcelamento' : 'uma recorrência'}. Ao salvar, você escolhe onde aplicar.</p>
      )}
      <div className="alternador" role="group" aria-label="Tipo">
        <button type="button" className={despesa ? 'ativo despesa' : ''} onClick={() => setTipo('despesa')}><ArrowDownRight size={17} /> Despesa</button>
        <button type="button" className={!despesa ? 'ativo receita' : ''} onClick={() => setTipo('receita')}><ArrowUpRight size={17} /> Receita</button>
      </div>

      <label className="valor-grande">
        <span>{modoRep === 'parcelado' ? (valorTotal ? 'Valor total da compra' : 'Valor de cada parcela') : 'Valor'}</span>
        <div>
          <em>R$</em>
          <InputMoeda autoFocus valor={valor} onChange={setValor} aria-label="Valor" />
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
          <span>{despesa ? 'Conta ou cartão' : 'Conta financeira'}</span>
          <select value={contaId} onChange={(e) => setContaId(e.target.value)} aria-label="Conta">
            {disponiveis.length === 0 && <option value="">Nenhuma conta ativa</option>}
            {cartoes.length > 0 ? (
              <>
                <optgroup label="Contas">{caixa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
                <optgroup label="Cartões de crédito">{cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
              </>
            ) : caixa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>{cartao ? 'Data da compra' : 'Vencimento'}</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label={cartao ? 'Data da compra' : 'Vencimento'} />
        </label>
      </div>

      {cartao ? (
        fatura && (
          <p className="info-fatura"><CreditCard size={16} /> Entra na fatura de <strong>{rotuloMes(fatura.chave, true)}</strong>, que vence em {formatData(fatura.vencimento)}.</p>
        )
      ) : (
        <>
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
              <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} aria-label="Data do pagamento" />
            </label>
          )}
        </>
      )}

      {!inicial && (
        <div className="campo bloco-repeticao">
          <span>Repetição</span>
          <div className="segmentado largo" role="group" aria-label="Repetição">
            <button type="button" className={modoRep === 'nenhuma' ? 'ativo' : ''} onClick={() => setModoRep('nenhuma')}>Não repete</button>
            {despesa && <button type="button" className={modoRep === 'parcelado' ? 'ativo' : ''} onClick={() => setModoRep('parcelado')}>Parcelado</button>}
            <button type="button" className={modoRep === 'recorrente' ? 'ativo' : ''} onClick={() => setModoRep('recorrente')}>Fixo / recorrente</button>
          </div>
          {modoRep === 'parcelado' && (
            <div className="opcoes-rep">
              <label className="campo">
                <span>Parcelas</span>
                <input type="number" min={2} max={120} value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Número de parcelas" />
              </label>
              <div className="campo">
                <span>O valor informado é</span>
                <div className="segmentado largo" role="group">
                  <button type="button" className={valorTotal ? 'ativo' : ''} onClick={() => setValorTotal(true)}>Total</button>
                  <button type="button" className={!valorTotal ? 'ativo' : ''} onClick={() => setValorTotal(false)}>Da parcela</button>
                </div>
              </div>
              {previaParcela && <p className="previa-rep">{previaParcela}</p>}
            </div>
          )}
          {modoRep === 'recorrente' && (
            <div className="opcoes-rep">
              <label className="campo">
                <span>Frequência</span>
                <select value={frequencia} onChange={(e) => setFrequencia(e.target.value as Frequencia)} aria-label="Frequência">
                  {FREQUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
                </select>
              </label>
              <div className="campo">
                <span>Termina</span>
                <div className="segmentado largo" role="group">
                  <button type="button" className={semFim ? 'ativo' : ''} onClick={() => setSemFim(true)}>Sem data de fim</button>
                  <button type="button" className={!semFim ? 'ativo' : ''} onClick={() => setSemFim(false)}>Após</button>
                </div>
              </div>
              {!semFim && (
                <label className="campo">
                  <span>Quantidade de vezes</span>
                  <input type="number" min={2} max={360} value={vezes} onChange={(e) => setVezes(e.target.value)} aria-label="Quantidade de vezes" />
                </label>
              )}
              <p className="previa-rep">
                {semFim ? 'Os próximos 12 meses são gerados agora e o sistema continua criando automaticamente.' : `Serão criados ${vezes || 0} lançamentos.`}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="linha">
        <label className="campo">
          <span>{despesa ? 'Fornecedor' : 'Cliente'} <em className="opcional">(opcional)</em></span>
          <input value={contato} onChange={(e) => setContato(e.target.value)} list="lista-contatos" placeholder={despesa ? 'Nome do fornecedor' : 'Nome do cliente'} />
          <datalist id="lista-contatos">{contatos.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
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
