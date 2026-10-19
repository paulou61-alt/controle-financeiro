import { useRef, useState } from 'react'
import { Download, KeyRound, Loader2, LogOut, Monitor, Moon, Palette, Sparkles, Sun, Trash2, Upload, User } from 'lucide-react'
import { supabase, traduzirErro } from '../supabase'
import type { Backup, Categoria, ContaFinanceira, Lancamento, Orcamentos, Transferencia } from '../types'
import type { Tema } from '../App'
import { baixarArquivo, hojeISO } from '../utils'

interface Props {
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
  contas: ContaFinanceira[]
  transferencias: Transferencia[]
  onImportar: (b: Partial<Backup>) => void
  onApagarTudo: () => void
  nome: string
  setNome: (n: string) => void
  tema: Tema
  setTema: (t: Tema) => void
  onCarregarExemplo: () => void
  email: string
  onSair: () => void
}

export default function Ajustes(p: Props) {
  const arquivo = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; texto: string } | null>(null)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha.length < 6) return setMsgSenha({ ok: false, texto: 'A senha deve ter pelo menos 6 caracteres.' })
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) return setMsgSenha({ ok: false, texto: traduzirErro(error) })
    setNovaSenha('')
    setMsgSenha({ ok: true, texto: 'Senha alterada com sucesso.' })
  }

  const exportar = () => {
    const dados: Backup = {
      versao: 2, categorias: p.categorias, lancamentos: p.lancamentos, orcamentos: p.orcamentos,
      contas: p.contas, transferencias: p.transferencias,
    }
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
      p.onImportar(dados)
      setMsg('Backup restaurado com sucesso.')
    } catch {
      setMsg('Arquivo inválido. Use um backup gerado por este sistema.')
    }
  }

  const apagarTudo = () => {
    if (!confirm('Apagar TODOS os lançamentos, contas, transferências, categorias e orçamentos? Isso não pode ser desfeito.')) return
    p.onApagarTudo()
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
        <h3><User size={18} /> Minha conta</h3>
        <div className="form-coluna">
          <label className="campo">
            <span>Como você quer ser chamado?</span>
            <input value={p.nome} onChange={(e) => p.setNome(e.target.value)} placeholder="Seu nome" maxLength={40} />
          </label>
          <label className="campo">
            <span>E-mail de acesso</span>
            <input value={p.email} readOnly disabled />
          </label>
        </div>
        <hr />
        <form className="form-coluna" onSubmit={trocarSenha}>
          <label className="campo">
            <span><KeyRound size={14} /> Nova senha</span>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" />
          </label>
          {msgSenha && <p className={msgSenha.ok ? 'msg' : 'erro'} role="status">{msgSenha.texto}</p>}
          <div className="acoes-esq">
            <button className="btn" type="submit" disabled={salvandoSenha || !novaSenha}>
              {salvandoSenha && <Loader2 size={16} className="girar" />} Alterar senha
            </button>
            <button className="btn perigo" type="button" onClick={p.onSair}><LogOut size={16} /> Sair da conta</button>
          </div>
        </form>
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
          Seus dados já são salvos automaticamente na nuvem. Se quiser, baixe uma cópia em arquivo para guardar
          com você ou restaurar depois.
        </p>
        <p className="ajuda">{p.lancamentos.length} lançamento(s) · {p.contas.length} conta(s) · {p.transferencias.length} transferência(s) · {p.categorias.length} categoria(s)</p>
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
        <p className="ajuda">Remove todos os lançamentos, contas, transferências, categorias e orçamentos da sua conta.</p>
        <button className="btn perigo" onClick={apagarTudo}><Trash2 size={16} /> Apagar todos os dados</button>
      </section>
    </div>
  )
}
