import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, BadgeCheck, Clock, Loader2, RefreshCw, Search, UserCheck, Users } from 'lucide-react'
import { supabase } from '../supabase'

interface Usuario {
  user_id: string
  email: string
  nome: string | null
  criado_em: string
  ultimo_login: string | null
  ultima_atividade: string | null
  email_confirmado: boolean
  plano: string | null
  status: string | null
  valido_ate: string | null
}

type Grupo = 'pagante' | 'teste' | 'cortesia' | 'sem-acesso'
type Filtro = 'ativos' | Grupo | 'todos'

const PLANOS: Record<string, string> = {
  teste: 'Teste grátis', mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual', vitalicio: 'Vitalício', cortesia: 'Cortesia',
}
const ROTULO_GRUPO: Record<Grupo, string> = { pagante: 'Pagante', teste: 'Em teste', cortesia: 'Cortesia', 'sem-acesso': 'Sem acesso' }
const CLASSE_GRUPO: Record<Grupo, string> = { pagante: 'pago', teste: 'aberto', cortesia: 'cartao', 'sem-acesso': 'atrasado' }

const DIA = 86_400_000

/** Mesma regra do banco (tem_acesso): ativo ou atrasado, dentro da validade */
function grupoDe(u: Usuario, agora: number): Grupo {
  const valido = (u.status === 'ativo' || u.status === 'atrasado') && (!u.valido_ate || new Date(u.valido_ate).getTime() > agora)
  if (!valido) return 'sem-acesso'
  if (u.plano === 'teste') return 'teste'
  if (u.plano === 'cortesia') return 'cortesia'
  return 'pagante'
}

const ultimoAcesso = (u: Usuario) => {
  const datas = [u.ultimo_login, u.ultima_atividade].filter((d): d is string => !!d)
  return datas.length ? datas.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : null
}

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

function haQuanto(iso: string | null, agora: number) {
  if (!iso) return 'Nunca'
  const dias = Math.floor((agora - new Date(iso).getTime()) / DIA)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 30) return `Há ${dias} dias`
  return data(iso)
}

export default function UsuariosView() {
  const [lista, setLista] = useState<Usuario[] | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const [busca, setBusca] = useState('')
  const [agora, setAgora] = useState(Date.now)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setAgora(Date.now())
    const { data: linhas, error } = await supabase.rpc('admin_usuarios')
    setCarregando(false)
    if (error) return setErro('Não foi possível carregar os usuários. Confira se o SQL de usuários (supabase/usuarios.sql) foi executado no Supabase.')
    setErro('')
    setLista(linhas as Usuario[])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const comGrupo = useMemo(() => (lista ?? []).map((u) => ({ ...u, grupo: grupoDe(u, agora), acesso: ultimoAcesso(u) })), [lista, agora])
  const conta = (g: Grupo) => comGrupo.filter((u) => u.grupo === g).length
  const ativos = comGrupo.filter((u) => u.grupo !== 'sem-acesso').length
  const usaram7 = comGrupo.filter((u) => u.acesso && agora - new Date(u.acesso).getTime() < 7 * DIA).length

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return comGrupo.filter((u) =>
      (filtro === 'todos' || (filtro === 'ativos' ? u.grupo !== 'sem-acesso' : u.grupo === filtro)) &&
      (!q || u.email.includes(q) || (u.nome ?? '').toLowerCase().includes(q)))
  }, [comGrupo, filtro, busca])

  const FILTROS: { id: Filtro; rotulo: string; n: number }[] = [
    { id: 'ativos', rotulo: 'Ativos', n: ativos },
    { id: 'pagante', rotulo: 'Pagantes', n: conta('pagante') },
    { id: 'teste', rotulo: 'Em teste', n: conta('teste') },
    { id: 'cortesia', rotulo: 'Cortesia', n: conta('cortesia') },
    { id: 'sem-acesso', rotulo: 'Sem acesso', n: conta('sem-acesso') },
    { id: 'todos', rotulo: 'Todos', n: comGrupo.length },
  ]

  return (
    <div className="pagina">
      <section className="kpis-4">
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone verde"><UserCheck size={18} /></span><span className="kpi-rotulo">Usuários ativos</span></div>
          <span className="kpi-valor">{lista ? ativos : '…'}</span>
          <span className="kpi-nota">de {comGrupo.length} contas criadas</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone roxo"><BadgeCheck size={18} /></span><span className="kpi-rotulo">Pagantes</span></div>
          <span className="kpi-valor">{lista ? conta('pagante') : '…'}</span>
          <span className="kpi-nota">com assinatura ou vitalício válido</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone amarelo"><Clock size={18} /></span><span className="kpi-rotulo">Em teste grátis</span></div>
          <span className="kpi-valor">{lista ? conta('teste') : '…'}</span>
          <span className="kpi-nota">dentro dos 7 dias</span>
        </div>
        <div className="cartao kpi">
          <div className="kpi-topo"><span className="kpi-icone ciano"><Activity size={18} /></span><span className="kpi-rotulo">Usaram na semana</span></div>
          <span className="kpi-valor">{lista ? usaram7 : '…'}</span>
          <span className="kpi-nota">entraram ou salvaram nos últimos 7 dias</span>
        </div>
      </section>

      <section className="cartao">
        <div className="cartao-cab">
          <h3><Users size={18} /> Usuários</h3>
          <button className="btn pequeno" onClick={carregar} disabled={carregando}>
            {carregando ? <Loader2 size={15} className="girar" /> : <RefreshCw size={15} />} Atualizar
          </button>
        </div>
        <p className="cartao-sub">Só você vê esta tela.</p>
        <div className="filtros">
          <label className="busca">
            <Search size={17} />
            <input type="search" placeholder="Buscar por nome ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
          </label>
        </div>
        <div className="sug-filtro usu-filtro">
          {FILTROS.map((f) => (
            <button key={f.id} className={filtro === f.id ? 'ativo' : ''} onClick={() => setFiltro(f.id)}>{f.rotulo} ({f.n})</button>
          ))}
        </div>

        {erro && <p className="erro">{erro}</p>}
        {!lista && !erro && <p className="vazio"><Loader2 size={16} className="girar" /> Carregando…</p>}
        {lista && visiveis.length === 0 && <p className="vazio">Nenhum usuário com esse filtro.</p>}
        {visiveis.length > 0 && (
          <div className="tabela-rolagem">
            <table className="tabela usu-tabela">
              <thead>
                <tr><th>Usuário</th><th>Plano</th><th>Situação</th><th>Válido até</th><th>Último acesso</th><th>Conta criada</th></tr>
              </thead>
              <tbody>
                {visiveis.map((u) => (
                  <tr key={u.user_id}>
                    <th>
                      <span className="usu-nome">{u.nome ?? '—'}</span>
                      <a className="usu-email" href={`mailto:${u.email}`}>{u.email}</a>
                      {!u.email_confirmado && <span className="selo">e-mail não confirmado</span>}
                    </th>
                    <td>{u.plano ? PLANOS[u.plano] ?? u.plano : '—'}</td>
                    <td>
                      <span className={`pilula-status ${CLASSE_GRUPO[u.grupo]}`}>{ROTULO_GRUPO[u.grupo]}</span>
                      {u.status === 'atrasado' && u.grupo !== 'sem-acesso' && <span className="selo">pagamento atrasado</span>}
                    </td>
                    <td>{u.plano === 'vitalicio' || u.plano === 'cortesia' ? (u.grupo === 'sem-acesso' ? data(u.valido_ate) : 'Sem prazo') : data(u.valido_ate)}</td>
                    <td title={u.acesso ? new Date(u.acesso).toLocaleString('pt-BR') : undefined}>{haQuanto(u.acesso, agora)}</td>
                    <td>{data(u.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
