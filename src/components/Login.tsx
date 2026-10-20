import { useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BellRing, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, PieChart,
  ShieldCheck, Smartphone, TrendingUp, User,
} from 'lucide-react'
import { supabase, traduzirErro } from '../supabase'
import { CHAVE_CAPTCHA, Captcha, type CaptchaRef } from './Captcha'

export type Modo = 'entrar' | 'cadastrar' | 'recuperar'

function forcaSenha(s: string) {
  let p = 0
  if (s.length >= 6) p++
  if (s.length >= 10) p++
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) p++
  if (/\d/.test(s)) p++
  if (/[^A-Za-z0-9]/.test(s)) p++
  return Math.min(4, p)
}
const NIVEIS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']

function Vitrine() {
  return (
    <div className="vitrine" aria-hidden="true">
      <div className="vt-orbe a" />
      <div className="vt-orbe b" />
      <div className="vt-grade" />

      <div className="vt-conteudo">
        <div className="vt-marca">
          <img src="/favicon.svg" alt="" width={44} height={44} />
          <span>Finanças</span>
        </div>

        <div className="vt-cena">
          <div className="vt-card saldo">
            <span className="vt-rot">Saldo total</span>
            <strong>R$ 19.810,95</strong>
            <span className="vt-up"><TrendingUp size={14} /> +12,4% este mês</span>
            <svg viewBox="0 0 260 70" className="vt-linha">
              <defs>
                <linearGradient id="vtg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity=".45" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 60 C30 58 45 50 70 46 S110 40 130 30 S175 28 195 18 S235 8 260 4 L260 70 L0 70Z" fill="url(#vtg)" />
              <path d="M0 60 C30 58 45 50 70 46 S110 40 130 30 S175 28 195 18 S235 8 260 4" fill="none" stroke="#fff" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="vt-card barras">
            <span className="vt-rot">Fluxo de caixa</span>
            <div className="vt-colunas">
              {[62, 48, 75, 55, 88, 70].map((h, i) => (
                <span key={i}><i style={{ height: `${h}%` }} /><i style={{ height: `${h * 0.62}%` }} /></span>
              ))}
            </div>
          </div>

          <div className="vt-card aviso">
            <span className="vt-ic"><BellRing size={16} /></span>
            <div>
              <strong>Conta de luz vence hoje</strong>
              <span>R$ 154,95 · Contas e serviços</span>
            </div>
          </div>

          <div className="vt-card meta">
            <svg width="46" height="46" viewBox="0 0 46 46">
              <circle cx="23" cy="23" r="19" fill="none" stroke="rgb(255 255 255 / .2)" strokeWidth="5" />
              <circle cx="23" cy="23" r="19" fill="none" stroke="#5ef0b5" strokeWidth="5" strokeLinecap="round"
                strokeDasharray="119.4" strokeDashoffset="40" transform="rotate(-90 23 23)" />
            </svg>
            <div>
              <strong>34% guardado</strong>
              <span>Meta de economia</span>
            </div>
          </div>
        </div>

        <div className="vt-texto">
          <h2>Seu dinheiro sob controle, <em>de um jeito bonito.</em></h2>
          <ul>
            <li><PieChart size={18} /> Dashboard completo com gráficos e insights</li>
            <li><Smartphone size={18} /> Acesse do celular ou do computador</li>
            <li><ShieldCheck size={18} /> Dados protegidos e só seus</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Login({ modoInicial = 'entrar', onVoltar }: { modoInicial?: Modo; onVoltar?: () => void }) {
  const [modo, setModo] = useState<Modo>(modoInicial)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [token, setToken] = useState('')
  const [falhaCaptcha, setFalhaCaptcha] = useState(false)
  const captcha = useRef<CaptchaRef>(null)

  const trocar = (m: Modo) => {
    setModo(m)
    setErro('')
    setSucesso('')
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    const mail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setErro('Digite um e-mail válido.')
    if (modo !== 'recuperar' && senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
    if (modo === 'cadastrar' && !nome.trim()) return setErro('Digite seu nome.')
    if (CHAVE_CAPTCHA && !token)
      return setErro(falhaCaptcha ? 'Não foi possível carregar a verificação de segurança. Recarregue a página.' : 'Marque a verificação de segurança logo acima do botão.')
    const captchaToken = token || undefined

    setCarregando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: senha, options: { captchaToken } })
        if (error) throw error
      } else if (modo === 'cadastrar') {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin, captchaToken },
        })
        if (error) throw error
        if (data.user && data.user.identities?.length === 0) throw new Error('already registered')
        if (!data.session) {
          setSucesso(`Quase lá! Enviamos um link de confirmação para ${mail}. Abra seu e-mail para ativar a conta.`)
          setModo('entrar')
          setSenha('')
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin, captchaToken })
        if (error) throw error
        setSucesso(`Se existir uma conta com ${mail}, você vai receber um link para criar uma nova senha.`)
      }
    } catch (err) {
      setErro(traduzirErro(err))
    } finally {
      setCarregando(false)
      // cada verificação vale para uma tentativa só
      captcha.current?.reiniciar()
    }
  }

  const forca = forcaSenha(senha)
  const titulos: Record<Modo, [string, string]> = {
    entrar: ['Bem-vindo de volta', 'Entre para ver suas finanças.'],
    cadastrar: ['Crie sua conta', 'Teste grátis por 7 dias, sem cartão de crédito.'],
    recuperar: ['Recuperar senha', 'Informe seu e-mail e enviaremos um link para criar uma nova senha.'],
  }

  return (
    <div className="tela-login">
      <Vitrine />

      <div className="login-lado">
        <div className="login-topo-mobile">
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <span>Finanças</span>
        </div>

        {onVoltar && (
          <button type="button" className="voltar voltar-site" onClick={onVoltar}><ArrowLeft size={16} /> Voltar para o site</button>
        )}
        <form className="login-caixa" onSubmit={enviar} noValidate>
          {modo === 'recuperar' ? (
            <button type="button" className="voltar" onClick={() => trocar('entrar')}><ArrowLeft size={16} /> Voltar para o login</button>
          ) : (
            <div className="segmentado login-abas" role="tablist">
              <button type="button" role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'ativo' : ''} onClick={() => trocar('entrar')}>Entrar</button>
              <button type="button" role="tab" aria-selected={modo === 'cadastrar'} className={modo === 'cadastrar' ? 'ativo' : ''} onClick={() => trocar('cadastrar')}>Criar conta</button>
            </div>
          )}

          <div className="login-cab" key={modo}>
            <h1>{titulos[modo][0]}</h1>
            <p>{titulos[modo][1]}</p>
          </div>

          {sucesso && <div className="aviso-ok" role="status"><CheckCircle2 size={18} /> <span>{sucesso}</span></div>}

          {modo === 'cadastrar' && (
            <label className="campo-icone">
              <span>Nome</span>
              <div>
                <User size={18} />
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como você quer ser chamado" autoComplete="name" />
              </div>
            </label>
          )}

          <label className="campo-icone">
            <span>E-mail</span>
            <div>
              <Mail size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" autoFocus />
            </div>
          </label>

          {modo !== 'recuperar' && (
            <label className="campo-icone">
              <span className="rotulo-linha">
                Senha
                {modo === 'entrar' && <button type="button" className="link-mini" onClick={() => trocar('recuperar')}>Esqueci minha senha</button>}
              </span>
              <div>
                <Lock size={18} />
                <input type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder={modo === 'cadastrar' ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                  autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'} />
                <button type="button" className="ver-senha" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
                  {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {modo === 'cadastrar' && senha && (
                <div className={`forca n${forca}`}>
                  <div>{[0, 1, 2, 3].map((i) => <i key={i} className={i < forca ? 'on' : ''} />)}</div>
                  <span>{NIVEIS[forca]}</span>
                </div>
              )}
            </label>
          )}

          {CHAVE_CAPTCHA && <Captcha ref={captcha} onToken={setToken} onFalha={() => setFalhaCaptcha(true)} />}

          {erro && <p className="erro" role="alert">{erro}</p>}

          <button type="submit" className="btn primario grande login-botao" disabled={carregando}>
            {carregando ? <Loader2 size={20} className="girar" /> : null}
            {modo === 'entrar' ? 'Entrar' : modo === 'cadastrar' ? 'Criar minha conta' : 'Enviar link de recuperação'}
            {!carregando && <ArrowRight size={18} />}
          </button>

          {modo !== 'recuperar' && (
            <p className="login-rodape">
              {modo === 'entrar' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
              <button type="button" className="link-mini" onClick={() => trocar(modo === 'entrar' ? 'cadastrar' : 'entrar')}>
                {modo === 'entrar' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          )}
          <p className="login-seguro"><ShieldCheck size={14} /> Conexão segura · seus dados são criptografados</p>
        </form>
      </div>
    </div>
  )
}
