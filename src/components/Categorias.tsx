import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Categoria, Lancamento, Tipo } from '../types'
import { uid } from '../utils'
import { IconeCategoria } from '../ui'
import { SeletorGrupoDre } from './Dre'

interface Props {
  categorias: Categoria[]
  setCategorias: (f: (c: Categoria[]) => Categoria[]) => void
  lancamentos: Lancamento[]
}

const CORES = ['#7c5cff', '#22c3dd', '#16a34a', '#f59e0b', '#ef4444', '#ec4899', '#0ea5e9', '#84cc16', '#f97316', '#64748b']

export default function Categorias({ categorias, setCategorias, lancamentos }: Props) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<Tipo>('despesa')
  const [cor, setCor] = useState(CORES[0])

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
    <section className="cartao">
      <h3>{t === 'receita' ? 'Receitas' : 'Despesas'}</h3>
      <ul className="lista-cat">
        {categorias.filter((c) => c.tipo === t).map((c) => (
          <li key={c.id}>
            <label className="trocar-cor" title="Mudar cor">
              <IconeCategoria cat={c} tamanho={40} />
              <input type="color" value={c.cor} onChange={(e) => atualizar(c.id, { cor: e.target.value })} aria-label={`Cor de ${c.nome}`} />
            </label>
            <input className="nome-cat" defaultValue={c.nome} aria-label="Nome"
              onBlur={(e) => e.target.value.trim() && atualizar(c.id, { nome: e.target.value.trim() })} />
            <SeletorGrupoDre cat={c} onChange={(dre) => atualizar(c.id, { dre })} />
            <span className="usos">{usos(c.id)} uso(s)</span>
            <button className="btn-icone pequeno perigo" onClick={() => remover(c)} aria-label={`Excluir ${c.nome}`}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <div className="pagina">
      <form className="cartao" onSubmit={adicionar}>
        <h3>Nova categoria</h3>
        <div className="filtros">
          <input className="crescer" placeholder="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome da categoria" />
          <div className="segmentado" role="group" aria-label="Tipo">
            <button type="button" className={tipo === 'despesa' ? 'ativo' : ''} onClick={() => setTipo('despesa')}>Despesa</button>
            <button type="button" className={tipo === 'receita' ? 'ativo' : ''} onClick={() => setTipo('receita')}>Receita</button>
          </div>
          <div className="paleta" role="radiogroup" aria-label="Cor">
            {CORES.map((c) => (
              <button type="button" key={c} role="radio" aria-checked={cor === c} aria-label={c}
                className={cor === c ? 'ativo' : ''} style={{ background: c }} onClick={() => setCor(c)} />
            ))}
          </div>
          <button className="btn primario" type="submit"><Plus size={16} /> Adicionar</button>
        </div>
        <p className="kpi-nota">Dica: clique no ícone de uma categoria para mudar a cor, e no nome para renomear. A caixa ao lado define em que linha da DRE a categoria entra.</p>
      </form>
      <div className="grade-2">
        {grupo('despesa')}
        {grupo('receita')}
      </div>
    </div>
  )
}
