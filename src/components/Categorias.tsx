import { useState } from 'react'
import type { Categoria, Lancamento, Tipo } from '../types'
import { uid } from '../utils'

interface Props {
  categorias: Categoria[]
  setCategorias: (f: (c: Categoria[]) => Categoria[]) => void
  lancamentos: Lancamento[]
}

export default function Categorias({ categorias, setCategorias, lancamentos }: Props) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<Tipo>('despesa')
  const [cor, setCor] = useState('#0f766e')

  const adicionar = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nome.trim()
    if (!n) return
    setCategorias((c) => [...c, { id: uid(), nome: n, tipo, cor }])
    setNome('')
  }

  const usos = (id: string) => lancamentos.filter((l) => l.categoriaId === id).length

  const remover = (c: Categoria) => {
    const n = usos(c.id)
    if (n > 0) {
      alert(`A categoria "${c.nome}" está em ${n} lançamento(s). Altere esses lançamentos antes de excluí-la.`)
      return
    }
    if (confirm(`Excluir a categoria "${c.nome}"?`)) setCategorias((cs) => cs.filter((x) => x.id !== c.id))
  }

  const atualizar = (id: string, campos: Partial<Categoria>) =>
    setCategorias((cs) => cs.map((x) => (x.id === id ? { ...x, ...campos } : x)))

  const grupo = (t: Tipo) => (
    <div className="bloco">
      <h3>{t === 'receita' ? 'Receitas' : 'Despesas'}</h3>
      <ul className="lista-cat">
        {categorias.filter((c) => c.tipo === t).map((c) => (
          <li key={c.id}>
            <input type="color" value={c.cor} onChange={(e) => atualizar(c.id, { cor: e.target.value })} aria-label={`Cor de ${c.nome}`} />
            <input className="nome-cat" defaultValue={c.nome} aria-label="Nome"
              onBlur={(e) => e.target.value.trim() && atualizar(c.id, { nome: e.target.value.trim() })} />
            <span className="usos">{usos(c.id)} uso(s)</span>
            <button className="btn pequeno perigo" onClick={() => remover(c)}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="categorias">
      <form className="bloco form-cat" onSubmit={adicionar}>
        <h3>Nova categoria</h3>
        <div className="filtros">
          <input placeholder="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome da categoria" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} aria-label="Tipo">
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Cor" />
          <button className="btn primario" type="submit">Adicionar</button>
        </div>
      </form>
      <div className="grade-2">
        {grupo('despesa')}
        {grupo('receita')}
      </div>
    </div>
  )
}
