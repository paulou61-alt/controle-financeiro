import { useRef, useState } from 'react'
import { BadgeCheck, Download, IdCard, KeyRound, Loader2, LogOut, Monitor, Moon, Palette, Sparkles, Sun, Trash2, Upload, User } from 'lucide-react'
import { NOME_PLANO, gerenciarAssinatura, type Acesso } from '../acesso'
import { supabase, traduzirErro } from '../supabase'
import type { Backup, Categoria, ContaFinanceira, Contato, Lancamento, Meta, Orcamentos, Perfil, Serie, Transferencia } from '../types'
import { documentoCompleto, normalizarDocumento, rotuloDocumento, validarDocumento, validarTelefone } from '../formatos'
import { InputDocumento, InputTelefone, SeletorPessoa } from './campos'
import type { Tema } from '../App'
import { baixarArquivo, formatData, hojeISO } from '../utils'

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
  perfil: Perfil
  setPerfil: (p: Perfil) => void
  contatos: Contato[]
  series: Serie[]
  metas: Meta[]
  acesso: Acesso | null
  onVerPlanos?: () => void
}

function MinhaAssinatura({ acesso, onVerPlanos }: { acesso: Acesso; onVerPlanos?: () => void }) {
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState('')
  const semFim = !acesso.valido_ate
  const data = acesso.valido_ate ? formatData(acesso.valido_ate.slice(0, 10)) : ''
  const situacao =
    acesso.plano === 'teste' ? `Grátis até ${data}`
      : acesso.status === 'atrasado' ? `Pagamento recusado · acesso garantido até ${data}`
      : semFim ? 'Acesso liberado, sem data de fim'
      : `Ativa · próxima renovação por volta de ${data}`
  const abrir = async () => {
    setErro('')
    setAbrindo(true)
    try {
      await gerenciarAssinatura()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setAbrindo(false)
    }
  }
  return (
    <section className="cartao">
      <h3><BadgeCheck size={18} /> Minha assinatura</h3>
      <p className="ajuda"><strong>Plano {NOME_PLANO[acesso.plano]}</strong> · {situacao}</p>
      {acesso.stripe_customer_id ? (
        <>
          <p className="ajuda">No portal do Stripe você troca o cartão, muda de plano, baixa os recibos ou cancela.</p>
          <button className="btn" onClick={abrir} disabled={abrindo}>{abrindo && <Loader2 size={16} className="girar" />} Gerenciar assinatura</button>
        </>
      ) : acesso.plano === 'teste' && onVerPlanos ? (
        <button className="btn primario" onClick={onVerPlanos}>Escolher um plano</button>
      ) : null}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </section>
  )
}

function DadosCadastrais({ perfil, onSalvar }: { perfil: Perfil; onSalvar: (p: Perfil) => void }) {
  const [rascunho, setRascunho] = useState<Perfil>(perfil)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const pf = rascunho.pessoa === 'fisica'
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(perfil)

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    const doc = rascunho.documento ?? ''
    if (doc && (!documentoCompleto(doc, rascunho.pessoa) || !validarDocumento(doc, rascunho.pessoa)))
      return setMsg({ ok: false, texto: `${rotuloDocumento(rascunho.pessoa)} inválido.` })
    if (rascunho.telefone && !validarTelefone(rascunho.telefone)) return setMsg({ ok: false, texto: 'Telefone inválido.' })
    onSalvar({ ...rascunho, nomeCompleto: rascunho.nomeCompleto?.trim() || undefined, documento: doc || undefined, telefone: rascunho.telefone || undefined })
    setMsg({ ok: true, texto: 'Dados cadastrais salvos.' })
  }

  return (
    <form className="form-coluna" onSubmit={salvar} noValidate>
      <div className="campo">
        <span>Este controle é de</span>
        <SeletorPessoa valor={rascunho.pessoa} onChange={(pessoa) => setRascunho((r) => ({ ...r, pessoa, documento: r.documento ? normalizarDocumento(r.documento, pessoa) : undefined }))} />
      </div>
      <label className="campo">
        <span>{pf ? 'Nome completo' : 'Razão social'} <em className="opcional">(opcional)</em></span>
        <input value={rascunho.nomeCompleto ?? ''} onChange={(e) => setRascunho((r) => ({ ...r, nomeCompleto: e.target.value }))}
          placeholder={pf ? 'Seu nome completo' : 'Nome da empresa'} maxLength={100} aria-label={pf ? 'Nome completo' : 'Razão social'} />
      </label>
      <div className="linha">
        <InputDocumento pessoa={rascunho.pessoa} valor={rascunho.documento ?? ''} onChange={(documento) => setRascunho((r) => ({ ...r, documento }))} />
        <InputTelefone valor={rascunho.telefone ?? ''} onChange={(telefone) => setRascunho((r) => ({ ...r, telefone }))} />
      </div>
      {msg && <p className={msg.ok ? 'msg' : 'erro'} role="status">{msg.texto}</p>}
      <div className="acoes-esq">
        <button className="btn primario" type="submit" disabled={!alterado}>Salvar dados cadastrais</button>
      </div>
    </form>
  )
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
      contas: p.contas, transferencias: p.transferencias, contatos: p.contatos, perfil: p.perfil, series: p.series, metas: p.metas,
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
    if (!confirm('Apagar TODOS os lançamentos, contas, transferências, categorias, orçamentos e metas? Isso não pode ser desfeito.')) return
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
        <h3><IdCard size={18} /> Dados cadastrais</h3>
        <p className="ajuda">Informe se você usa o sistema como pessoa física ou como empresa.</p>
        <DadosCadastrais perfil={p.perfil} onSalvar={p.setPerfil} />
      </section>

      {p.acesso && <MinhaAssinatura acesso={p.acesso} onVerPlanos={p.onVerPlanos} />}

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
        <h3><Sparkles size={18} /> Demonstração</h3>
        <p className="ajuda">
          Mostra o sistema com 6 meses de movimentações fictícias. Seus dados reais não são alterados e você pode voltar a eles a qualquer momento.
        </p>
        <button className="btn" onClick={p.onCarregarExemplo}><Sparkles size={16} /> Ver demonstração</button>
        <hr />
        <h3 className="perigo-titulo"><Trash2 size={18} /> Zona de perigo</h3>
        <p className="ajuda">Remove todos os lançamentos, contas, transferências, categorias, orçamentos e metas da sua conta.</p>
        <button className="btn perigo" onClick={apagarTudo}><Trash2 size={16} /> Apagar todos os dados</button>
      </section>
    </div>
  )
}
