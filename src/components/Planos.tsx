import { useState } from 'react'
import { Check, ExternalLink, Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { DIAS_TESTE, NOME_PLANO, PLANOS, acessoAtivo, assinar, gerenciarAssinatura, type Acesso, type PlanoVenda } from '../acesso'
import { formatData } from '../utils'

const dataCurta = (iso: string) => formatData(iso.slice(0, 10))

/** Explica por que o acesso não está liberado */
function motivo(a: Acesso | null): { tom: 'info' | 'ruim'; texto: string } | null {
  if (!a) return null
  if (acessoAtivo(a) && a.plano !== 'teste') {
    const ate = a.valido_ate ? ` · válido até ${dataCurta(a.valido_ate)}` : ''
    if (a.plano === 'vitalicio' || a.plano === 'cortesia') return { tom: 'info', texto: `Seu plano atual é ${NOME_PLANO[a.plano]}: o acesso não tem data de fim.` }
    if (a.status === 'atrasado') return { tom: 'ruim', texto: `Não conseguimos cobrar a renovação do plano ${NOME_PLANO[a.plano]}${ate}. Atualize o pagamento para não perder o acesso.` }
    return { tom: 'info', texto: `Você assina o plano ${NOME_PLANO[a.plano]}${ate}. Para trocar de plano ou cancelar, use "Gerenciar assinatura".` }
  }
  if (a.plano === 'teste' && a.status === 'cancelado')
    return { tom: 'info', texto: 'O teste grátis já foi usado por este e-mail (ou o e-mail é temporário). Escolha um plano para começar.' }
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

export default function Planos({ email, acesso, confirmando, onSair, embutido = false, emDemo = false }: {
  email: string; acesso: Acesso | null; confirmando: boolean; onSair: () => void
  /** Aba Planos dentro do app (sem o cabeçalho próprio da tela de bloqueio) */
  embutido?: boolean
  emDemo?: boolean
}) {
  const [abrindo, setAbrindo] = useState<PlanoVenda | 'portal' | null>(null)
  const [erro, setErro] = useState('')
  const aviso = motivo(acesso)
  const cancelou = new URLSearchParams(location.search).get('assinatura') === 'cancelada'
  const assinante = acessoAtivo(acesso) && !!acesso?.stripe_customer_id && acesso.plano !== 'teste'
  const podeAtualizarCartao = !!acesso?.stripe_customer_id && (acesso.status === 'atrasado' || assinante)
  const semFim = acessoAtivo(acesso) && (acesso?.plano === 'vitalicio' || acesso?.plano === 'cortesia')

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

  const conteudo = confirmando ? (
    <div className="cartao planos-confirmando" role="status">
      <Loader2 size={28} className="girar" />
      <h1>Confirmando seu pagamento…</h1>
      <p>Isso leva só alguns segundos. A página libera sozinha assim que o Stripe confirmar.</p>
    </div>
  ) : (
    <>
      {!embutido && (
        <div className="planos-titulo">
          <h1>Escolha seu plano</h1>
          <p>Saldo, contas a pagar e receber, cartões, relatórios, DRE e metas. Tudo salvo na nuvem.</p>
        </div>
      )}
      {emDemo && <p className="planos-aviso info" role="status">Você está no modo demonstração. Volte para seus dados para contratar um plano.</p>}
      {cancelou && !aviso && <p className="planos-aviso info">Pagamento não concluído. Você pode escolher um plano quando quiser.</p>}
      {aviso && <p className={`planos-aviso ${aviso.tom}`}>{aviso.texto}</p>}
      {podeAtualizarCartao && !emDemo && (
        <div className="acoes-centro">
          <button className="btn primario grande" onClick={() => ir('portal')} disabled={!!abrindo}>
            {abrindo === 'portal' ? <Loader2 size={17} className="girar" /> : <ShieldCheck size={17} />}{' '}
            {acesso?.status === 'atrasado' ? 'Atualizar forma de pagamento' : 'Gerenciar assinatura'}
          </button>
        </div>
      )}
      {erro && <p className="planos-aviso ruim" role="alert">{erro}</p>}

      <ul className="grade-planos">
        {PLANOS.map((p) => {
          const atual = acessoAtivo(acesso) && acesso?.plano === p.id
          // assinante troca de plano pelo portal; quem tem vitalício não precisa comprar nada
          const bloqueado = emDemo || semFim || (assinante && p.id !== 'vitalicio')
          return (
            <li key={p.id} className={`cartao plano ${p.destaque ? 'destaque' : ''}`}>
              <span className="plano-selo">{atual ? 'Seu plano' : p.selo}</span>
              <h2>{p.nome}</h2>
              <p className="plano-frase">{p.frase}</p>
              <div className="plano-preco"><em>R$</em><strong>{p.preco}</strong></div>
              <span className="plano-unidade">{p.unidade}</span>
              <p className="plano-detalhe">{p.detalhe}</p>
              <ul className="plano-itens">
                <li><Check size={15} /> {p.id === 'vitalicio' ? 'Sem cobrança recorrente' : 'Cancele quando quiser'}</li>
                <li><ShieldCheck size={15} /> Pagamento seguro pelo Stripe</li>
              </ul>
              <button className={`btn grande ${p.destaque ? 'primario' : ''}`} onClick={() => ir(p.id)} disabled={!!abrindo || bloqueado}>
                {abrindo === p.id ? <Loader2 size={17} className="girar" /> : null}
                {emDemo ? 'Indisponível na demonstração' : atual ? 'Plano atual' : <>Escolher {p.nome.toLowerCase()} <ExternalLink size={15} /></>}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="planos-rodape">
        O pagamento é feito na página segura do Stripe, com o e-mail desta conta ({email}). Pedidos de reembolso encerram o acesso.
      </p>
    </>
  )

  if (embutido) return <div className="planos-conteudo embutido">{conteudo}</div>

  return (
    <div className="tela-planos">
      <header className="planos-topo">
        <div className="marca">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <div><strong>Finanças</strong><span>Controle Financeiro</span></div>
        </div>
        <div className="planos-usuario">
          <span>{email}</span>
          <button className="btn pequeno" onClick={onSair}><LogOut size={15} /> Sair</button>
        </div>
      </header>

      <main className="planos-conteudo">{conteudo}</main>
    </div>
  )
}
