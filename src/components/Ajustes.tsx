import { useRef, useState } from 'react'
import { Download, Monitor, Moon, Palette, Sparkles, Sun, Trash2, Upload, User } from 'lucide-react'
import type { Backup, Categoria, Lancamento, Orcamentos } from '../types'
import type { Tema } from '../App'
import { baixarArquivo, CATEGORIAS_PADRAO, hojeISO } from '../utils'

interface Props {
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
  setCategorias: (c: Categoria[]) => void
  setLancamentos: (l: Lancamento[]) => void
  setOrcamentos: (o: Orcamentos) => void
  nome: string
  setNome: (n: string) => void
  tema: Tema
  setTema: (t: Tema) => void
  onCarregarExemplo: () => void
}

export default function Ajustes(p: Props) {
  const arquivo = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const exportar = () => {
    const dados: Backup = { versao: 1, categorias: p.categorias, lancamentos: p.lancamentos, orcamentos: p.orcamentos }
    baixarArquivo(`controle-financeiro-backup-${hojeISO()}.json`, JSON.stringify(dados, null, 2), 'application/json')
    setMsg('Backup baixado.')
  }

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const dados = JSON.parse(await f.text()) as Partial<Backup>
      if (!Array.isArray(dados.categorias) || !Array.isArray(dados.lancamentos)) throw new Error('formato')
      if (!confirm(`Importar ${dados.lancamentos.length} lançamento(s)? Os dados atuais serão substituídos.`)) return
      p.setCategorias(dados.categorias)
      p.setLancamentos(dados.lancamentos)
      p.setOrcamentos(dados.orcamentos ?? {})
      setMsg('Backup restaurado com sucesso.')
    } catch {
      setMsg('Arquivo inválido. Use um backup gerado por este sistema.')
    }
  }

  const apagarTudo = () => {
    if (!confirm('Apagar TODOS os lançamentos, categorias e orçamentos? Isso não pode ser desfeito.')) return
    p.setLancamentos([])
    p.setCategorias(CATEGORIAS_PADRAO)
    p.setOrcamentos({})
    setMsg('Dados apagados.')
  }

  const temas: { id: Tema; rotulo: string; icone: typeof Sun }[] = [
    { id: 'claro', rotulo: 'Claro', icone: Sun },
    { id: 'escuro', rotulo: 'Escuro', icone: Moon },
    { id: 'sistema', rotulo: 'Automático', icone: Monitor },
  ]

  return (
    <div className="pagina grade-2">
      <section className="cartao">
        <h3><User size={18} /> Perfil</h3>
        <label className="campo">
          <span>Como você quer ser chamado?</span>
          <input value={p.nome} onChange={(e) => p.setNome(e.target.value)} placeholder="Seu nome" maxLength={40} />
        </label>
      </section>

      <section className="cartao">
        <h3><Palette size={18} /> Aparência</h3>
        <div className="opcoes-tema">
          {temas.map((t) => {
            const Icone = t.icone
            return (
              <button key={t.id} className={p.tema === t.id ? 'ativo' : ''} onClick={() => p.setTema(t.id)}>
                <Icone size={20} /> {t.rotulo}
              </button>
            )
          })}
        </div>
      </section>

      <section className="cartao">
        <h3><Download size={18} /> Backup</h3>
        <p className="ajuda">
          Seus dados ficam guardados apenas neste navegador. Baixe um backup com frequência e use-o para levar
          seus dados para outro computador ou celular.
        </p>
        <p className="ajuda">{p.lancamentos.length} lançamento(s) · {p.categorias.length} categoria(s)</p>
        <div className="acoes-esq">
          <button className="btn primario" onClick={exportar}><Download size={16} /> Baixar backup</button>
          <button className="btn" onClick={() => arquivo.current?.click()}><Upload size={16} /> Restaurar backup</button>
          <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={importar} />
        </div>
        {msg && <p className="msg" role="status">{msg}</p>}
      </section>

      <section className="cartao">
        <h3><Sparkles size={18} /> Dados de exemplo</h3>
        <p className="ajuda">Preenche o sistema com 6 meses de movimentações fictícias para você conhecer todos os recursos.</p>
        <button className="btn" onClick={p.onCarregarExemplo}><Sparkles size={16} /> Carregar exemplo</button>
        <hr />
        <h3 className="perigo-titulo"><Trash2 size={18} /> Zona de perigo</h3>
        <p className="ajuda">Remove todos os dados deste navegador e volta às categorias padrão.</p>
        <button className="btn perigo" onClick={apagarTudo}><Trash2 size={16} /> Apagar todos os dados</button>
      </section>
    </div>
  )
}
