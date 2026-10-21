import { useCallback, useEffect, useState } from 'react'
import { Bug, CheckCheck, Inbox, Lightbulb, Loader2, MessageSquarePlus, Send, Sparkles, Trash2, Wrench } from 'lucide-react'
import { supabase } from '../supabase'

export const EMAIL_DONO = 'paulou61@gmail.com'

type Tipo = 'ideia' | 'melhoria' | 'problema' | 'outro'
interface Sugestao { id: number; email: string; nome: string | null; tipo: Tipo; texto: string; lida: boolean; criado_em: string }

const TIPOS: { id: Tipo; rotulo: string; icone: typeof Lightbulb }[] = [
  { id: 'ideia', rotulo: 'Nova função', icone: Lightbulb },
  { id: 'melhoria', rotulo: 'Melhoria', icone: Wrench },
  { id: 'problema', rotulo: 'Algo não funciona', icone: Bug },
  { id: 'outro', rotulo: 'Outro assunto', icone: MessageSquarePlus },
]
const ROTULO = Object.fromEntries(TIPOS.map((t) => [t.id, t.rotulo])) as Record<Tipo, string>

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Enviar({ nome, emDemo }: { nome: string; emDemo: boolean }) {
  const [tipo, setTipo] = useState<Tipo>('ideia')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (texto.trim().length < 5) return setMsg({ ok: false, texto: 'Conte um pouco mais para entendermos a sua ideia.' })
    setEnviando(true)
    setMsg(null)
    const { error } = await supabase.from('sugestoes').insert({ tipo, texto: texto.trim(), nome: nome.trim() || null })
    setEnviando(false)
    if (error) {
      const limite = /limite/i.test(error.message)
      return setMsg({ ok: false, texto: limite ? 'Você já mandou várias sugestões na última hora. Tente de novo mais tarde.' : 'Não foi possível enviar agora. Tente novamente em instantes.' })
    }
    setTexto('')
    setMsg({ ok: true, texto: 'Recebemos sua sugestão. Obrigado por ajudar a melhorar o Lucro Real!' })
  }

  return (
    <section className="cartao">
      <h3><Sparkles size={18} /> Sentiu falta de algo?</h3>
      <p className="ajuda">
        Conte o que faria o Lucro Real ser mais útil para você: uma função nova, um ajuste ou algo que não está funcionando.
        Lemos todas as mensagens.
      </p>
      <form className="form-coluna" onSubmit={enviar}>
        <div className="sug-tipos" role="radiogroup" aria-label="Tipo de sugestão">
          {TIPOS.map((t) => {
            const Icone = t.icone
            return (
              <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} className={tipo === t.id ? 'ativo' : ''} onClick={() => setTipo(t.id)}>
                <Icone size={18} /> {t.rotulo}
              </button>
            )
          })}
        </div>
        <label className="campo">
          <span>Sua mensagem</span>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} maxLength={2000}
            placeholder="Ex.: queria poder anexar o comprovante em cada lançamento." disabled={emDemo} />
          <small className="sug-contador">{texto.length}/2000</small>
        </label>
        {msg && <p className={msg.ok ? 'msg' : 'erro'} role="status">{msg.texto}</p>}
        <div className="acoes-esq">
          <button className="btn primario" type="submit" disabled={enviando || emDemo || !texto.trim()}>
            {enviando ? <Loader2 size={16} className="girar" /> : <Send size={16} />} {emDemo ? 'Indisponível na demonstração' : 'Enviar sugestão'}
          </button>
        </div>
      </form>
    </section>
  )
}

function CaixaDoDono({ onNaoLidas }: { onNaoLidas: (n: number) => void }) {
  const [lista, setLista] = useState<Sugestao[] | null>(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<'novas' | 'todas'>('novas')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('sugestoes').select('id, email, nome, tipo, texto, lida, criado_em').order('criado_em', { ascending: false }).limit(500)
    if (error) return setErro('Não foi possível carregar as sugestões. Confira se o SQL das sugestões foi executado no Supabase.')
    setErro('')
    setLista(data as Sugestao[])
  }, [])
  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { if (lista) onNaoLidas(lista.filter((s) => !s.lida).length) }, [lista, onNaoLidas])

  const marcar = async (s: Sugestao) => {
    setLista((l) => l?.map((x) => (x.id === s.id ? { ...x, lida: !s.lida } : x)) ?? l)
    const { error } = await supabase.from('sugestoes').update({ lida: !s.lida }).eq('id', s.id)
    if (error) carregar()
  }
  const apagar = async (s: Sugestao) => {
    if (!confirm('Apagar esta sugestão?')) return
    setLista((l) => l?.filter((x) => x.id !== s.id) ?? l)
    const { error } = await supabase.from('sugestoes').delete().eq('id', s.id)
    if (error) carregar()
  }

  const visiveis = (lista ?? []).filter((s) => filtro === 'todas' || !s.lida)
  const novas = (lista ?? []).filter((s) => !s.lida).length

  return (
    <section className="cartao sug-caixa">
      <div className="cartao-cab">
        <h3><Inbox size={18} /> Caixa de sugestões {novas > 0 && <span className="sug-badge">{novas} nova(s)</span>}</h3>
        <div className="sug-filtro">
          <button className={filtro === 'novas' ? 'ativo' : ''} onClick={() => setFiltro('novas')}>Não lidas</button>
          <button className={filtro === 'todas' ? 'ativo' : ''} onClick={() => setFiltro('todas')}>Todas ({lista?.length ?? 0})</button>
        </div>
      </div>
      <p className="cartao-sub">Só você vê esta caixa ({EMAIL_DONO}).</p>
      {erro && <p className="erro">{erro}</p>}
      {!lista && !erro && <p className="vazio"><Loader2 size={16} className="girar" /> Carregando…</p>}
      {lista && visiveis.length === 0 && <p className="vazio">{filtro === 'novas' ? 'Nenhuma sugestão nova.' : 'Nenhuma sugestão ainda.'}</p>}
      <ul className="sug-lista">
        {visiveis.map((s) => (
          <li key={s.id} className={s.lida ? 'lida' : ''}>
            <div className="sug-topo">
              <span className={`sug-tipo ${s.tipo}`}>{ROTULO[s.tipo]}</span>
              <span className="sug-quem">{s.nome ? `${s.nome} · ` : ''}<a href={`mailto:${s.email}`}>{s.email}</a></span>
              <span className="sug-data">{dataHora(s.criado_em)}</span>
            </div>
            <p className="sug-texto">{s.texto}</p>
            <div className="acoes-esq">
              <button className="btn pequeno" onClick={() => marcar(s)}><CheckCheck size={15} /> {s.lida ? 'Marcar como não lida' : 'Marcar como lida'}</button>
              <button className="btn pequeno perigo" onClick={() => apagar(s)}><Trash2 size={15} /> Apagar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Sugestoes({ email, nome, emDemo, onNaoLidas }: { email: string; nome: string; emDemo: boolean; onNaoLidas: (n: number) => void }) {
  const dono = !emDemo && email.toLowerCase() === EMAIL_DONO
  return (
    <div className="pagina sug-pagina">
      {dono && <CaixaDoDono onNaoLidas={onNaoLidas} />}
      <Enviar nome={nome} emDemo={emDemo} />
    </div>
  )
}
