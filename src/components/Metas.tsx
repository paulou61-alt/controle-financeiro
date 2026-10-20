import { useMemo, useState } from 'react'
import { CheckCircle2, Flag, MinusCircle, Pencil, PiggyBank, Plus, PlusCircle, Scale, ShieldCheck, Trash2, TrendingUp, XCircle, type LucideIcon } from 'lucide-react'
import type { Aporte, Categoria, ContaFinanceira, Lancamento, Meta, TipoMeta, Transferencia } from '../types'
import { TIPOS_META, progressoMeta, type Progresso } from '../analise'
import { ehCartao } from '../financas'
import { formatData, hojeISO, mesAtual, rotuloMes, uid } from '../utils'
import { Anel, Valor, useFmt } from '../ui'
import { InputMoeda } from './campos'
import { Modal } from './comuns'

export const ICONES_META: Record<TipoMeta, LucideIcon> = { juntar: PiggyBank, receita: TrendingUp, resultado: Scale, gastos: ShieldCheck }
const CORES = ['#059669', '#12b76a', '#0ea5e9', '#f59e0b', '#ec4899', '#f97316', '#14b8a6', '#64748b']

interface Props {
  metas: Meta[]
  setMetas: (f: (m: Meta[]) => Meta[]) => void
  mes: string
  lancamentos: Lancamento[]
  catPorId: Map<string, Categoria>
  contas: ContaFinanceira[]
  transferencias: Transferencia[]
}

/** Cor do progresso: verde quando bateu, vermelho quando falhou num mês já encerrado ou estourou o teto */
export function estadoMeta(m: Meta, pr: Progresso, mes: string) {
  if (m.tipo === 'gastos') return pr.pct > 100 ? 'estourado' : pr.pct >= 80 ? 'atencao' : 'ok'
  if (pr.atingida) return 'ok'
  if (m.tipo !== 'juntar' && mes < mesAtual()) return 'estourado'
  if (m.tipo === 'juntar' && m.prazo && m.prazo < hojeISO()) return 'estourado'
  return 'andamento'
}

const COR_ESTADO: Record<string, string> = { ok: 'var(--verde)', atencao: 'var(--amarelo)', estourado: 'var(--vermelho)', andamento: 'var(--primaria)' }

export function textoStatus(m: Meta, pr: Progresso, fmt: (v: number) => string) {
  if (m.tipo === 'gastos') return pr.atual > m.valor ? `Passou ${fmt(pr.atual - m.valor)} do teto` : `Ainda pode gastar ${fmt(m.valor - pr.atual)}`
  if (pr.atingida) return pr.atual > m.valor ? `Meta batida! ${fmt(pr.atual - m.valor)} acima` : 'Meta batida!'
  return `Faltam ${fmt(m.valor - pr.atual)}`
}

/* ---------- Formulário ---------- */

function FormMeta({ inicial, tipoInicial, contas, onSalvar, onFechar }: {
  inicial: Meta | null; tipoInicial?: TipoMeta; contas: ContaFinanceira[]; onSalvar: (m: Meta) => void; onFechar: () => void
}) {
  const [tipo, setTipo] = useState<TipoMeta>(inicial?.tipo ?? tipoInicial ?? 'juntar')
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [valor, setValor] = useState<number | null>(inicial?.valor ?? null)
  const [cor, setCor] = useState(inicial?.cor ?? CORES[0])
  const [prazo, setPrazo] = useState(inicial?.prazo ?? '')
  const [contaId, setContaId] = useState(inicial?.contaId ?? '')
  const [jaGuardado, setJaGuardado] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const contasCaixa = contas.filter((c) => !ehCartao(c) && (!c.arquivada || c.id === inicial?.contaId))
  const info = TIPOS_META.find((t) => t.id === tipo)!

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valor || valor <= 0) return setErro(tipo === 'gastos' ? 'Informe o teto mensal.' : 'Informe o valor da meta.')
    const juntar = tipo === 'juntar'
    const aportes = inicial?.aportes ?? []
    onSalvar({
      id: inicial?.id ?? uid(),
      nome: nome.trim() || info.rotulo,
      tipo, valor, cor,
      criadaEm: inicial?.criadaEm ?? hojeISO(),
      prazo: juntar && prazo ? prazo : undefined,
      contaId: juntar && contaId ? contaId : undefined,
      aportes: juntar && !contaId ? (jaGuardado && jaGuardado > 0 ? [...aportes, { id: uid(), data: hojeISO(), valor: jaGuardado }] : aportes) : undefined,
    })
  }

  return (
    <Modal titulo={inicial ? 'Editar meta' : 'Nova meta'} onFechar={onFechar} onSubmit={enviar}>
      <div className="opcoes-meta" role="radiogroup" aria-label="Tipo de meta">
        {TIPOS_META.map((t) => {
          const Icone = ICONES_META[t.id]
          return (
            <button type="button" key={t.id} role="radio" aria-checked={tipo === t.id} className={tipo === t.id ? 'ativo' : ''} onClick={() => setTipo(t.id)}>
              <Icone size={20} />
              <strong>{t.rotulo}</strong>
              <span>{t.descricao}</span>
            </button>
          )
        })}
      </div>
      <label className="campo">
        <span>Nome <em className="opcional">(opcional)</em></span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder={tipo === 'juntar' ? 'Ex.: Reserva de emergência' : info.rotulo} aria-label="Nome da meta" />
      </label>
      <div className="linha">
        <label className="campo">
          <span>{tipo === 'juntar' ? 'Quanto quer juntar' : tipo === 'gastos' ? 'Teto por mês' : 'Valor mínimo por mês'}</span>
          <span className="campo-moeda">
            <em>R$</em>
            <InputMoeda valor={valor} onChange={setValor} autoFocus={!inicial} aria-label="Valor da meta" />
          </span>
        </label>
        {tipo === 'juntar' && (
          <label className="campo">
            <span>Prazo <em className="opcional">(opcional)</em></span>
            <input type="date" value={prazo} min={hojeISO()} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo" />
          </label>
        )}
      </div>
      {tipo === 'juntar' && (
        <>
          <label className="campo">
            <span>Como medir o progresso</span>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} aria-label="Como medir o progresso">
              <option value="">Registrando cada valor guardado</option>
              {contasCaixa.map((c) => <option key={c.id} value={c.id}>Pelo saldo da conta {c.nome}</option>)}
            </select>
            <small>{contaId ? 'O progresso acompanha o saldo dessa conta automaticamente.' : 'Você registra cada valor guardado ou retirado na própria meta.'}</small>
          </label>
          {!contaId && (
            <label className="campo">
              <span>Já tenho guardado <em className="opcional">(opcional)</em></span>
              <span className="campo-moeda">
                <em>R$</em>
                <InputMoeda valor={jaGuardado} onChange={setJaGuardado} aria-label="Valor já guardado" />
              </span>
            </label>
          )}
        </>
      )}
      {tipo !== 'juntar' && (
        <p className="ajuda">
          {tipo === 'receita' && 'Soma as receitas operacionais de cada mês, pelo vencimento (como na DRE).'}
          {tipo === 'resultado' && 'Usa o lucro líquido da DRE de cada mês, por competência.'}
          {tipo === 'gastos' && 'Soma todas as despesas do mês, menos as que estão fora do resultado (retiradas, investimentos).'}
        </p>
      )}
      <div className="campo">
        <span>Cor</span>
        <div className="paleta" role="radiogroup" aria-label="Cor">
          {CORES.map((c) => (
            <button type="button" key={c} role="radio" aria-checked={cor === c} aria-label={c} className={cor === c ? 'ativo' : ''} style={{ background: c }} onClick={() => setCor(c)} />
          ))}
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">{inicial ? 'Salvar alterações' : 'Criar meta'}</button>
      </div>
    </Modal>
  )
}

function FormAporte({ meta, retirar, onSalvar, onFechar }: { meta: Meta; retirar: boolean; onSalvar: (a: Aporte) => void; onFechar: () => void }) {
  const [valor, setValor] = useState<number | null>(null)
  const [data, setData] = useState(hojeISO())
  const [erro, setErro] = useState('')
  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valor || valor <= 0) return setErro('Informe o valor.')
    onSalvar({ id: uid(), data, valor: retirar ? -valor : valor })
  }
  return (
    <Modal titulo={`${retirar ? 'Retirar de' : 'Guardar em'} "${meta.nome}"`} onFechar={onFechar} onSubmit={enviar}>
      <div className="linha">
        <label className="campo">
          <span>Valor</span>
          <span className="campo-moeda"><em>R$</em><InputMoeda valor={valor} onChange={setValor} autoFocus aria-label="Valor" /></span>
        </label>
        <label className="campo">
          <span>Data</span>
          <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} aria-label="Data" />
        </label>
      </div>
      <p className="ajuda">Isto só registra o progresso da meta. Não cria lançamento nem mexe no saldo das contas.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
        <button type="submit" className="btn primario">{retirar ? 'Registrar retirada' : 'Registrar valor guardado'}</button>
      </div>
    </Modal>
  )
}

/* ---------- Tela ---------- */

export default function Metas({ metas, setMetas, mes, lancamentos, catPorId, contas, transferencias }: Props) {
  const fmt = useFmt()
  const [editando, setEditando] = useState<Meta | { nova: TipoMeta } | null>(null)
  const [aporte, setAporte] = useState<{ meta: Meta; retirar: boolean } | null>(null)

  const progresso = useMemo(
    () => new Map(metas.map((m) => [m.id, progressoMeta(m, mes, lancamentos, catPorId, contas, transferencias)])),
    [metas, mes, lancamentos, catPorId, contas, transferencias],
  )

  const salvar = (m: Meta) => {
    setMetas((ms) => (ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? m : x)) : [...ms, m]))
    setEditando(null)
  }
  const excluir = (m: Meta) => {
    if (confirm(`Excluir a meta "${m.nome}"?`)) setMetas((ms) => ms.filter((x) => x.id !== m.id))
  }
  const registrarAporte = (a: Aporte) => {
    const alvo = aporte!.meta
    setMetas((ms) => ms.map((x) => (x.id === alvo.id ? { ...x, aportes: [...(x.aportes ?? []), a] } : x)))
    setAporte(null)
  }
  const removerAporte = (m: Meta, a: Aporte) => {
    if (confirm(`Remover o registro de ${fmt(Math.abs(a.valor))} em ${formatData(a.data)}?`))
      setMetas((ms) => ms.map((x) => (x.id === m.id ? { ...x, aportes: (x.aportes ?? []).filter((y) => y.id !== a.id) } : x)))
  }

  const noCaminho = metas.filter((m) => {
    const e = estadoMeta(m, progresso.get(m.id)!, mes)
    return e === 'ok' || e === 'andamento'
  }).length
  const batidas = metas.filter((m) => progresso.get(m.id)!.atingida && m.tipo !== 'gastos').length

  return (
    <div className="pagina">
      <section className="cartao resumo-orc">
        <Anel pct={metas.length ? (noCaminho / metas.length) * 100 : 0} tamanho={96} espessura={10} cor={noCaminho === metas.length ? 'var(--verde)' : 'var(--amarelo)'} />
        <div className="resumo-orc-texto">
          <span className="kpi-rotulo"><Flag size={15} /> Metas · {rotuloMes(mes, true)}</span>
          {metas.length ? (
            <>
              <strong className="mini-valor">{noCaminho} de {metas.length} no caminho certo</strong>
              <span className="kpi-nota">{batidas ? `${batidas} meta(s) já batida(s). ` : ''}As metas mensais usam o mês escolhido no topo da tela.</span>
            </>
          ) : (
            <span className="kpi-nota">Defina aonde você quer chegar: juntar uma reserva, faturar um valor por mês, lucrar um mínimo ou manter os gastos abaixo de um teto.</span>
          )}
        </div>
        <button className="btn primario" onClick={() => setEditando({ nova: 'juntar' })}><Plus size={17} /> Nova meta</button>
      </section>

      {metas.length === 0 ? (
        <section className="cartao">
          <h3>Sugestões para começar</h3>
          <div className="opcoes-meta sugestoes">
            {TIPOS_META.map((t) => {
              const Icone = ICONES_META[t.id]
              return (
                <button key={t.id} onClick={() => setEditando({ nova: t.id })}>
                  <Icone size={20} /><strong>{t.rotulo}</strong><span>{t.descricao}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <ul className="grade-metas-fin">
          {metas.map((m) => {
            const pr = progresso.get(m.id)!
            const estado = estadoMeta(m, pr, mes)
            const Icone = ICONES_META[m.tipo]
            const conta = m.contaId ? contas.find((c) => c.id === m.contaId) : undefined
            const tipo = TIPOS_META.find((t) => t.id === m.tipo)!
            const aportes = [...(m.aportes ?? [])].sort((a, b) => b.data.localeCompare(a.data))
            return (
              <li key={m.id} className={`cartao meta-card ${estado}`}>
                <div className="meta-topo">
                  <span className="icone-cat" style={{ width: 42, height: 42, color: m.cor, background: `color-mix(in srgb, ${m.cor} 15%, transparent)` }}><Icone size={20} /></span>
                  <div className="meta-titulo">
                    <strong>{m.nome}</strong>
                    <span>{tipo.mensal ? `${tipo.rotulo} · ${rotuloMes(mes)}` : m.prazo ? `Até ${formatData(m.prazo)}` : 'Sem prazo'}</span>
                  </div>
                  <button className="btn-icone pequeno" onClick={() => setEditando(m)} aria-label="Editar meta" title="Editar"><Pencil size={15} /></button>
                  <button className="btn-icone pequeno perigo" onClick={() => excluir(m)} aria-label="Excluir meta" title="Excluir"><Trash2 size={15} /></button>
                </div>

                <div className="meta-corpo">
                  <div className="meta-anel">
                    <Anel pct={pr.pct} tamanho={76} espessura={8} cor={COR_ESTADO[estado]} />
                    <span>{Math.round(pr.pct)}%</span>
                  </div>
                  <div className="meta-valores">
                    <Valor v={pr.atual} className={`mini-valor ${pr.atual < 0 ? 'despesa' : ''}`} />
                    <span className="de">{m.tipo === 'gastos' ? 'de teto ' : 'de '}{fmt(m.valor)}</span>
                    <span className={`orc-status ${estado}`}>{textoStatus(m, pr, fmt)}</span>
                  </div>
                </div>

                {m.tipo === 'juntar' && (
                  <div className="meta-detalhe">
                    {pr.porMes !== null && !pr.atingida && pr.mesesRestantes ? (
                      <p>Guarde <strong className="num">{fmt(pr.porMes)}</strong> por mês nos próximos {pr.mesesRestantes} mês(es) para chegar lá.</p>
                    ) : m.prazo && !pr.atingida && m.prazo < hojeISO() ? (
                      <p>O prazo terminou em {formatData(m.prazo)}. Edite a meta para definir um novo prazo.</p>
                    ) : null}
                    {conta ? (
                      <p className="kpi-nota">Medido pelo saldo da conta {conta.nome}{conta.arquivada ? ' (arquivada)' : ''}.</p>
                    ) : (
                      <>
                        <div className="acoes-esq">
                          <button className="btn pequeno" onClick={() => setAporte({ meta: m, retirar: false })}><PlusCircle size={15} /> Guardar</button>
                          <button className="btn pequeno" onClick={() => setAporte({ meta: m, retirar: true })} disabled={pr.atual <= 0}><MinusCircle size={15} /> Retirar</button>
                        </div>
                        {aportes.length > 0 && (
                          <ul className="lista-aportes">
                            {aportes.slice(0, 4).map((a) => (
                              <li key={a.id}>
                                <span>{formatData(a.data)}</span>
                                <strong className={`num ${a.valor < 0 ? 'despesa' : 'receita'}`}>{a.valor < 0 ? '−' : '+'}{fmt(Math.abs(a.valor))}</strong>
                                <button className="btn-icone pequeno perigo" onClick={() => removerAporte(m, a)} aria-label="Remover registro"><Trash2 size={13} /></button>
                              </li>
                            ))}
                            {aportes.length > 4 && <li className="kpi-nota">e mais {aportes.length - 4} registro(s)</li>}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}

                {m.tipo !== 'juntar' && (
                  <div className="meta-detalhe">
                    {Math.abs(pr.pendente) >= 0.01 && (
                      <p className="kpi-nota">Inclui {fmt(Math.abs(pr.pendente))} ainda {m.tipo === 'gastos' ? 'a pagar' : 'pendente'}.</p>
                    )}
                    <div className="historico-meta" aria-label="Últimos 6 meses">
                      {pr.historico.map((h) => (
                        <span key={h.mes} className={h.ok ? 'ok' : 'falhou'} title={`${rotuloMes(h.mes, true)}: ${fmt(h.valor)}`}>
                          {h.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {rotuloMes(h.mes).split('/')[0]}
                        </span>
                      ))}
                    </div>
                    <p className="kpi-nota">Bateu em {pr.historico.filter((h) => h.ok).length} dos últimos {pr.historico.length} meses.</p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editando && <FormMeta inicial={'nova' in editando ? null : editando} tipoInicial={'nova' in editando ? editando.nova : undefined} contas={contas} onSalvar={salvar} onFechar={() => setEditando(null)} />}
      {aporte && <FormAporte meta={aporte.meta} retirar={aporte.retirar} onSalvar={registrarAporte} onFechar={() => setAporte(null)} />}
    </div>
  )
}
