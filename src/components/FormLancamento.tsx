import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react'
import type { Categoria, Lancamento, Tipo } from '../types'
import { hojeISO, mesAtual, parseValor, uid } from '../utils'
import { IconeCategoria } from '../ui'

interface Props {
  inicial: Lancamento | null
  mesPadrao: string
  categorias: Categoria[]
  onSalvar: (l: Lancamento, repetirMeses: number) => void
  onFechar: () => void
}

export default function FormLancamento({ inicial, mesPadrao, categorias, onSalvar, onFechar }: Props) {
  const dataPadrao = mesPadrao === mesAtual() ? hojeISO() : `${mesPadrao}-01`
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? 'despesa')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valor, setValor] = useState(inicial ? inicial.valor.toFixed(2).replace('.', ',') : '')
  const [data, setData] = useState(inicial?.data ?? dataPadrao)
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '')
  const [pago, setPago] = useState(inicial?.pago ?? true)
  const [repetir, setRepetir] = useState(1)
  const [erro, setErro] = useState('')

  const cats = categorias.filter((c) => c.tipo === tipo)

  useEffect(() => {
    if (!cats.some((c) => c.id === categoriaId)) setCategoriaId(cats[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseValor(valor)
    if (!Number.isFinite(num) || num <= 0) return setErro('Informe um valor maior que zero.')
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!data) return setErro('Informe a data.')
    if (!categoriaId) return setErro('Escolha uma categoria.')
    onSalvar(
      { id: inicial?.id ?? uid(), tipo, descricao: descricao.trim(), valor: Math.round(num * 100) / 100, data, categoriaId, pago },
      repetir,
    )
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <form className={`modal tipo-${tipo}`} onClick={(e) => e.stopPropagation()} onSubmit={enviar} aria-label="Lançamento">
        <div className="modal-cab">
          <h2>{inicial ? 'Editar lançamento' : 'Novo lançamento'}</h2>
          <button type="button" className="btn-icone pequeno" onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="alternador" role="group" aria-label="Tipo">
          <button type="button" className={tipo === 'despesa' ? 'ativo despesa' : ''} onClick={() => setTipo('despesa')}>
            <ArrowDownRight size={17} /> Despesa
          </button>
          <button type="button" className={tipo === 'receita' ? 'ativo receita' : ''} onClick={() => setTipo('receita')}>
            <ArrowUpRight size={17} /> Receita
          </button>
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
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Aluguel, mercado, salário" />
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
            <span>Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
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

        <label className="interruptor">
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
          <span className="trilho"><span /></span>
          {tipo === 'despesa' ? 'Já foi paga' : 'Já foi recebida'}
        </label>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <div className="acoes">
          <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn primario">Salvar lançamento</button>
        </div>
      </form>
    </div>
  )
}
