import { Check, CreditCard, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react'
import './planos.css'

const planos = [
  { id: 'mensal', nome: 'Mensal', valor: '14,90', periodo: '/ mês', descricao: 'Flexibilidade para começar.', cobranca: 'Cobrança recorrente de R$ 14,90 a cada mês.', link: import.meta.env.VITE_STRIPE_LINK_MENSAL },
  { id: 'semestral', nome: 'Semestral', valor: '69,90', periodo: '/ semestre', descricao: 'Seis meses para cuidar das suas finanças.', cobranca: 'Cobrança recorrente de R$ 69,90 a cada 6 meses.', link: import.meta.env.VITE_STRIPE_LINK_SEMESTRAL },
  { id: 'anual', nome: 'Anual', valor: '99,90', periodo: '/ ano', descricao: 'Um ano de organização financeira.', cobranca: 'Cobrança recorrente de R$ 99,90 a cada ano.', destaque: 'Melhor equilíbrio', link: import.meta.env.VITE_STRIPE_LINK_ANUAL },
  { id: 'vitalicio', nome: 'Vitalício', valor: '149,90', periodo: 'pagamento único', descricao: 'Pague uma vez, sem renovação.', cobranca: 'Pagamento único de R$ 149,90.', destaque: 'Pague uma vez', link: import.meta.env.VITE_STRIPE_LINK_VITALICIO },
]

// Aceita somente páginas de pagamento hospedadas pelo Stripe.
function linkStripe(valor?: string): string | undefined {
  if (!valor?.trim()) return undefined
  try {
    const url = new URL(valor.trim())
    if (url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password && !url.port && url.pathname !== '/') return url.href
  } catch { /* configuração ausente ou inválida */ }
  return undefined
}

export default function Planos({ emDemo }: { emDemo: boolean }) {
  return (
    <section className="planos" aria-label="Planos disponíveis">
      <div className="planos-intro">
        <span className="planos-selo"><Sparkles size={16} /> Seu próximo passo</span>
        <h2>Mais organização. Mais tranquilidade.</h2>
        <p>Escolha o período que combina com você. Compare os valores e veja como funciona cada cobrança.</p>
      </div>
      {emDemo && <p className="planos-aviso" role="status">Você está no modo demonstração. Volte para seus dados para contratar um plano.</p>}
      <div className="planos-grade">
        {planos.map((plano) => {
          const link = linkStripe(plano.link)
          return (
            <article className={`plano-card ${plano.id === 'anual' ? 'recomendado' : ''}`} key={plano.id} aria-labelledby={`plano-${plano.id}`}>
              <div className="plano-etiqueta">{plano.destaque || 'Assinatura'}</div>
              <h3 id={`plano-${plano.id}`}>{plano.nome}</h3>
              <p className="plano-descricao">{plano.descricao}</p>
              <div className="plano-preco"><span>R$</span> <strong>{plano.valor}</strong></div>
              <span className="plano-periodo">{plano.periodo}</span>
              <p className="plano-cobranca">{plano.cobranca}</p>
              <ul className="plano-detalhes">
                <li><Check size={16} /> {plano.id === 'vitalicio' ? 'Sem cobrança recorrente' : 'Pagamento por período'}</li>
                <li><ShieldCheck size={16} /> Pagamento pelo Stripe</li>
              </ul>
              {link && !emDemo ? (
                <a className={`btn ${plano.id === 'anual' ? 'primario' : ''} plano-botao`} href={link} target="_blank" rel="noopener noreferrer" aria-label={`Escolher plano ${plano.nome}, abre o Stripe em nova aba`}>
                  Escolher {plano.nome.toLowerCase()} <ExternalLink size={15} />
                </a>
              ) : (
                <button className="btn plano-botao" disabled>{emDemo ? 'Indisponível na demonstração' : 'Em breve'}</button>
              )}
            </article>
          )
        })}
      </div>
      <p className="planos-rodape"><CreditCard size={18} /> Ao escolher um plano disponível, você será direcionado ao Stripe para conferir os detalhes e concluir o pagamento.</p>
    </section>
  )
}
