import { useEffect, useState } from 'react'
import type { Categoria, Lancamento, Tipo } from '../types'
import { hojeISO, mesAtual, uid } from '../utils'

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
    const texto = valor.trim()
    // aceita "1.234,56", "1234,56" e "1234.56"
    const normal = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto
    const num = Number(normal)
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!Number.isFinite(num) || num <= 0) return setErro('Informe um valor maior que zero.')
    if (!data) return setErro('Informe a data.')
    if (!categoriaId) return setErro('Escolha uma categoria.')
    onSalvar(
      { id: inicial?.id ?? uid(), tipo, descricao: descricao.trim(), valor: Math.round(num * 100) / 100, data, categoriaId, pago },
      repetir,
    )
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h2>{inicial ? 'Editar lançamento' : 'Novo lançamento'}</h2>

        <div className="alternador" role="group" aria-label="Tipo">
          <button type="button" className={tipo === 'despesa' ? 'ativo despesa' : ''} onClick={() => setTipo('despesa')}>Despesa</button>
          <button type="button" className={tipo === 'receita' ? 'ativo receita' : ''} onClick={() => setTipo('receita')}>Receita</button>
        </div>

        <label>Descrição
          <input autoFocus value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Aluguel, mercado, salário" />
        </label>

        <div className="linha">
          <label>Valor (R$)
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </label>
          <label>Data
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
        </div>

        <label>Categoria
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>

        <div className="linha">
          <label className="check">
            <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
            {tipo === 'despesa' ? 'Já foi paga' : 'Já foi recebida'}
          </label>
          {!inicial && (
            <label>Repetir por
              <select value={repetir} onChange={(e) => setRepetir(Number(e.target.value))}>
                <option value={1}>Somente este mês</option>
                {[2, 3, 6, 12, 24].map((n) => <option key={n} value={n}>{n} meses</option>)}
              </select>
            </label>
          )}
        </div>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <div className="acoes">
          <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn primario">Salvar</button>
        </div>
      </form>
    </div>
  )
}
