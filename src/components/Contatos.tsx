import { useMemo, useState } from 'react'
import { Building2, Mail, Pencil, Phone, Plus, Search, Trash2, User, Users } from 'lucide-react'
import type { Contato, Lancamento } from '../types'
import { formatarDocumento, mascaraTelefone, rotuloDocumento } from '../formatos'
import { useFmt } from '../ui'

interface Props {
  contatos: Contato[]
  lancamentos: Lancamento[]
  onNovo: () => void
  onEditar: (c: Contato) => void
  onExcluir: (c: Contato) => void
}

const ROTULO_PAPEL = { cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Cliente e fornecedor' }

export default function Contatos({ contatos, lancamentos, onNovo, onEditar, onExcluir }: Props) {
  const fmt = useFmt()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'cliente' | 'fornecedor'>('todos')

  const totais = useMemo(() => {
    const m = new Map<string, { recebido: number; pago: number; aberto: number; qtd: number }>()
    for (const l of lancamentos) {
      if (!l.contatoId) continue
      const t = m.get(l.contatoId) ?? { recebido: 0, pago: 0, aberto: 0, qtd: 0 }
      t.qtd++
      if (!l.pago) t.aberto += l.tipo === 'receita' ? l.valor : -l.valor
      else if (l.tipo === 'receita') t.recebido += l.valor
      else t.pago += l.valor
      m.set(l.contatoId, t)
    }
    return m
  }, [lancamentos])

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const qDig = q.replace(/[^0-9a-z]/g, '')
    return contatos
      .filter((c) => filtro === 'todos' || c.papel === filtro || c.papel === 'ambos')
      .filter((c) => !q || c.nome.toLowerCase().includes(q) || (qDig.length >= 3 && (c.documento ?? '').toLowerCase().includes(qDig)) || (c.email ?? '').includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [contatos, busca, filtro])

  if (contatos.length === 0) {
    return (
      <div className="boas-vindas">
        <span className="bv-icone"><Users size={30} /></span>
        <h2>Cadastre seus clientes e fornecedores</h2>
        <p>Guarde CPF ou CNPJ, e-mail e telefone e veja quanto cada um já pagou, recebeu ou tem em aberto.</p>
        <div className="bv-acoes"><button className="btn primario grande" onClick={onNovo}><Plus size={18} /> Novo cadastro</button></div>
      </div>
    )
  }

  return (
    <div className="pagina">
      <section className="cartao">
        <div className="filtros">
          <label className="busca">
            <Search size={17} />
            <input type="search" placeholder="Buscar por nome, CPF, CNPJ ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
          </label>
          <div className="segmentado" role="group" aria-label="Filtro">
            {(['todos', 'cliente', 'fornecedor'] as const).map((f) => (
              <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
                {f === 'todos' ? 'Todos' : f === 'cliente' ? 'Clientes' : 'Fornecedores'}
              </button>
            ))}
          </div>
          <button className="btn primario" onClick={onNovo}><Plus size={16} /> Novo cadastro</button>
        </div>

        {lista.length === 0 ? (
          <p className="vazio">Nenhum cadastro encontrado.</p>
        ) : (
          <ul className="grade-contatos">
            {lista.map((c) => {
              const t = totais.get(c.id)
              const Icone = c.pessoa === 'juridica' ? Building2 : User
              return (
                <li key={c.id} className="contato-item">
                  <div className="orc-topo">
                    <span className={`kpi-icone ${c.pessoa === 'juridica' ? 'ciano' : 'roxo'}`}><Icone size={18} /></span>
                    <div className="orc-nome">
                      <strong>{c.nome}</strong>
                      <span>{ROTULO_PAPEL[c.papel]} · {c.pessoa === 'juridica' ? 'Pessoa jurídica' : 'Pessoa física'}</span>
                    </div>
                    <span className="mov-acoes">
                      <button className="btn-icone pequeno" onClick={() => onEditar(c)} aria-label={`Editar ${c.nome}`} title="Editar"><Pencil size={15} /></button>
                      <button className="btn-icone pequeno perigo" onClick={() => onExcluir(c)} aria-label={`Excluir ${c.nome}`} title="Excluir"><Trash2 size={15} /></button>
                    </span>
                  </div>
                  <dl className="dados-contato">
                    <div><dt>{rotuloDocumento(c.pessoa)}</dt><dd className="num">{formatarDocumento(c.documento, c.pessoa) || '—'}</dd></div>
                    {c.email && <div><dt><Mail size={12} /></dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>}
                    {c.telefone && <div><dt><Phone size={12} /></dt><dd><a href={`tel:+55${c.telefone}`}>{mascaraTelefone(c.telefone)}</a></dd></div>}
                  </dl>
                  {t && (
                    <div className="totais-contato">
                      {t.recebido > 0 && <span>Recebido <strong className="num receita">{fmt(t.recebido)}</strong></span>}
                      {t.pago > 0 && <span>Pago <strong className="num despesa">{fmt(t.pago)}</strong></span>}
                      {t.aberto !== 0 && <span>Em aberto <strong className="num">{fmt(Math.abs(t.aberto))}</strong></span>}
                      <span className="kpi-nota">{t.qtd} lançamento(s)</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
