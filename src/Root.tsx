import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { CheckCircle2, CloudOff, KeyRound, Loader2, Lock, Settings } from 'lucide-react'
import { supabase, supabaseConfigurado, traduzirErro } from './supabase'
import { normalizarDados, useDadosNuvem, type Dados } from './useDadosNuvem'
import { gerarExemplo } from './exemplo'
import { CATEGORIAS_PADRAO } from './utils'
import Login from './components/Login'
import Planos from './components/Planos'
import { acessoAtivo, limparRetornoDoPagamento, useAcesso, type Acesso } from './acesso'
import App from './App'

function Splash({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="splash">
      <img src="/favicon.svg" alt="" width={64} height={64} />
      <span><Loader2 size={16} className="girar" /> {texto}</span>
    </div>
  )
}

function TelaSimples({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="tela-simples">
      <div className="cartao tela-simples-caixa">
        <span className="bv-icone">{icone}</span>
        <h1>{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

function ConfigFaltando() {
  return (
    <TelaSimples icone={<Settings size={28} />} titulo="Falta conectar o Supabase">
      <p>
        Defina as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (no arquivo{' '}
        <code>.env.local</code> ou nas Environment Variables da Vercel) e publique novamente.
      </p>
    </TelaSimples>
  )
}

function NovaSenha({ onConcluir }: { onConcluir: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
    if (senha !== confirmar) return setErro('As senhas não conferem.')
    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)
    if (error) return setErro(traduzirErro(error))
    setOk(true)
  }

  return (
    <TelaSimples icone={ok ? <CheckCircle2 size={28} /> : <KeyRound size={28} />} titulo={ok ? 'Senha alterada!' : 'Crie uma nova senha'}>
      {ok ? (
        <>
          <p>Sua nova senha já está valendo.</p>
          <button className="btn primario grande" onClick={onConcluir}>Ir para o meu painel</button>
        </>
      ) : (
        <form onSubmit={salvar} className="form-coluna">
          <label className="campo-icone">
            <span>Nova senha</span>
            <div><Lock size={18} /><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" autoFocus /></div>
          </label>
          <label className="campo-icone">
            <span>Confirme a nova senha</span>
            <div><Lock size={18} /><input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" /></div>
          </label>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button type="submit" className="btn primario grande" disabled={carregando}>
            {carregando && <Loader2 size={18} className="girar" />} Salvar nova senha
          </button>
        </form>
      )}
    </TelaSimples>
  )
}

function AreaLogada({ user, acesso, onVerPlanos }: { user: User; acesso: Acesso | null; onVerPlanos: () => void }) {
  const nomeInicial = String(user.user_metadata?.nome ?? '')
  const { dados, setDados, status, tentarNovamente } = useDadosNuvem(user.id, nomeInicial)
  // Modo demonstração: dados de exemplo só na memória, nunca gravados na conta
  const [demo, setDemo] = useState<Dados | null>(null)
  const setDemoDados = useCallback((f: (d: Dados) => Dados) => setDemo((d) => (d ? f(d) : d)), [])

  if (status === 'erro-carregar')
    return (
      <TelaSimples icone={<CloudOff size={28} />} titulo="Não foi possível carregar seus dados">
        <p>Verifique sua conexão com a internet e tente novamente.</p>
        <div className="bv-acoes">
          <button className="btn primario grande" onClick={tentarNovamente}>Tentar novamente</button>
          <button className="btn grande" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </TelaSimples>
    )
  if (!dados) return <Splash texto="Carregando suas finanças…" />

  return (
    <App
      dados={demo ?? dados}
      setDados={demo ? setDemoDados : setDados}
      status={demo ? 'salvo' : status}
      emDemo={!!demo}
      onEntrarDemo={() => setDemo(normalizarDados({ ...dados, categorias: CATEGORIAS_PADRAO, contatos: [], ...gerarExemplo() }, dados.nome))}
      onSairDemo={() => setDemo(null)}
      onTentarSalvar={tentarNovamente}
      email={user.email ?? ''}
      onSair={() => supabase.auth.signOut()}
      acesso={acesso}
      onVerPlanos={onVerPlanos}
    />
  )
}

/** Só carrega os dados de quem tem acesso ativo; os demais veem os planos */
function ComAcesso({ user }: { user: User }) {
  const email = user.email ?? ''
  const { estado, confirmando } = useAcesso(email)
  const sair = () => supabase.auth.signOut()
  const liberado = !estado.carregando && (estado.semControle || acessoAtivo(estado.acesso))
  const [verPlanos, setVerPlanos] = useState(false)

  useEffect(() => {
    if (liberado) limparRetornoDoPagamento()
  }, [liberado])

  if (estado.carregando) return <Splash texto="Verificando sua assinatura…" />
  if (estado.erro)
    return (
      <TelaSimples icone={<CloudOff size={28} />} titulo="Não foi possível verificar sua assinatura">
        <p>Verifique sua conexão com a internet e tente novamente.</p>
        <div className="bv-acoes">
          <button className="btn primario grande" onClick={() => location.reload()}>Tentar novamente</button>
          <button className="btn grande" onClick={sair}>Sair</button>
        </div>
      </TelaSimples>
    )
  if (!liberado) return <Planos email={email} acesso={estado.acesso} confirmando={confirmando} onSair={sair} />
  return (
    <>
      {verPlanos && <Planos email={email} acesso={estado.acesso} confirmando={false} onSair={sair} onVoltar={() => setVerPlanos(false)} />}
      {/* o app continua montado por baixo, para não perder o que estava aberto */}
      <div hidden={verPlanos}>
        <AreaLogada user={user} acesso={estado.acesso} onVerPlanos={() => { setVerPlanos(true); window.scrollTo({ top: 0 }) }} />
      </div>
    </>
  )
}

function ComAutenticacao() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      setSessao(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <Splash />
  if (sessao && recuperando) return <NovaSenha onConcluir={() => setRecuperando(false)} />
  if (!sessao) return <Login />
  return <ComAcesso key={sessao.user.id} user={sessao.user} />
}

export default function Root() {
  return supabaseConfigurado ? <ComAutenticacao /> : <ConfigFaltando />
}
