import { useState } from 'react'
import { ArrowLeft, Check, ExternalLink, Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { DIAS_TESTE, PLANOS, assinar, gerenciarAssinatura, type Acesso, type PlanoVenda } from '../acesso'
import { formatData } from '../utils'

const dataCurta = (iso: string) => formatData(iso.slice(0, 10))

/** Explica por que o acesso não está liberado */
function motivo(a: Acesso | null): { tom: 'info' | 'ruim'; texto: string } | null {
  if (!a) return null
  if (a.plano === 'teste' && a.status === 'ativo')
    return a.valido_ate && new Date(a.valido_ate) > new Date()
      ? { tom: 'info', texto: `Você está no teste grátis até ${dataCurta(a.valido_ate)}. Assinar agora não perde nada do que já registrou.` }
      : { tom: 'info', texto: `Seu teste grátis de ${DIAS_TESTE} dias terminou. Escolha um plano para continuar: tudo o que você registrou está guardado.` }
  switch (a.status) {
    case 'pendente':
      return { tom: 'info', texto: 'Seu pagamento está em processamento. Assim que for confirmado, o acesso é liberado automaticamente.' }
    case 'reembolsado':
      return { tom: 'ruim', texto: 'Seu acesso foi encerrado porque a compra foi reembolsada. Para voltar, escolha um plano abaixo.' }
    case 'contestado':
      return { tom: 'ruim', texto: 'Seu acesso foi suspenso por causa de uma contestação no cartão. Se foi um engano, fale com o suporte.' }
    case 'atrasado':
      return { tom: 'ruim', texto: 'Não conseguimos cobrar a renovação e o prazo de tolerância terminou. Atualize o pagamento para voltar.' }
    default:
      return { tom: 'info', texto: a.valido_ate ? `Sua assinatura terminou em ${dataCurta(a.valido_ate)}. Seus dados continuam guardados: assine de novo para voltar.` : 'Sua assinatura terminou. Assine de novo para voltar.' }
  }
}

export default function Planos({ email, acesso, confirmando, onSair, onVoltar }: {
  email: string; acesso: Acesso | null; confirmando: boolean; onSair: () => void
  /** Quando a pessoa ainda tem acesso e só veio ver os planos */
  onVoltar?: () => void
}) {
  const [abrindo, setAbrindo] = useState<PlanoVenda | 'portal' | null>(null)
  const [erro, setErro] = useState('')
  const aviso = motivo(acesso)
  const cancelou = new URLSearchParams(location.search).get('assinatura') === 'cancelada'
  const podeAtualizarCartao = acesso?.status === 'atrasado' && !!acesso.stripe_customer_id

  const ir = async (alvo: PlanoVenda | 'portal') => {
    setErro('')
    setAbrindo(alvo)
    try {
      if (alvo === 'portal') await gerenciarAssinatura()
      else await assinar(alvo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setAbrindo(null)
    }
  }

  return (
    <div className="tela-planos">
      <header className="planos-topo">
        <div className="marca">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <div><strong>Finanças</strong><span>Controle Financeiro</span></div>
        </div>
        <div className="planos-usuario">
          <span>{email}</span>
          {onVoltar ? (
            <button className="btn pequeno" onClick={onVoltar}><ArrowLeft size={15} /> Voltar ao app</button>
          ) : (
            <button className="btn pequeno" onClick={onSair}><LogOut size={15} /> Sair</button>
          )}
        </div>
      </header>

      <main className="planos-conteudo">
        {confirmando ? (
          <div className="cartao planos-confirmando" role="status">
            <Loader2 size={28} className="girar" />
            <h1>Confirmando seu pagamento…</h1>
            <p>Isso leva só alguns segundos. A página libera sozinha assim que o Stripe confirmar.</p>
          </div>
        ) : (
          <>
            <div className="planos-titulo">
              <h1>Escolha seu plano</h1>
              <p>Saldo, contas a pagar e receber, cartões, relatórios, DRE e metas. Tudo salvo na nuvem.</p>
            </div>
            {cancelou && !aviso && <p className="planos-aviso info">Pagamento não concluído. Você pode escolher um plano quando quiser.</p>}
            {aviso && <p className={`planos-aviso ${aviso.tom}`}>{aviso.texto}</p>}
            {podeAtualizarCartao && (
              <div className="acoes-centro">
                <button className="btn primario grande" onClick={() => ir('portal')} disabled={!!abrindo}>
                  {abrindo === 'portal' ? <Loader2 size={17} className="girar" /> : <ShieldCheck size={17} />} Atualizar forma de pagamento
                </button>
              </div>
            )}
            {erro && <p className="planos-aviso ruim" role="alert">{erro}</p>}

            <ul className="grade-planos">
              {PLANOS.map((p) => (
                <li key={p.id} className={`cartao plano ${p.destaque ? 'destaque' : ''}`}>
                  <span className="plano-selo">{p.selo}</span>
                  <h2>{p.nome}</h2>
                  <p className="plano-frase">{p.frase}</p>
                  <div className="plano-preco"><em>R$</em><strong>{p.preco}</strong></div>
                  <span className="plano-unidade">{p.unidade}</span>
                  <p className="plano-detalhe">{p.detalhe}</p>
                  <ul className="plano-itens">
                    <li><Check size={15} /> {p.id === 'vitalicio' ? 'Sem cobrança recorrente' : 'Cancele quando quiser'}</li>
                    <li><ShieldCheck size={15} /> Pagamento seguro pelo Stripe</li>
                  </ul>
                  <button className={`btn grande ${p.destaque ? 'primario' : ''}`} onClick={() => ir(p.id)} disabled={!!abrindo}>
                    {abrindo === p.id ? <Loader2 size={17} className="girar" /> : null} Escolher {p.nome.toLowerCase()} <ExternalLink size={15} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="planos-rodape">
              Use no pagamento o mesmo e-mail desta conta ({email}). Pedidos de reembolso encerram o acesso.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
