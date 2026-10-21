import { useEffect, useState } from 'react'
import {
  ArrowRight, BadgeCheck, BarChart3, Bell, CalendarClock, Check, ChevronDown, CreditCard, Eye, FileSpreadsheet, FileUp, Flag,
  KeyRound, Landmark, Lock, Menu, Moon, Repeat, ShieldCheck, Smartphone, Target, TrendingUp, Upload, Users, X,
} from 'lucide-react'
import { PLANOS } from '../acesso'
import './landing.css'

interface Props {
  onCadastrar: () => void
  onEntrar: () => void
}

const DORES = [
  'Chega o fim do mês e você não sabe para onde foi o dinheiro.',
  'Você fatura, mas não sabe se a empresa dá lucro de verdade.',
  'A fatura do cartão sempre vem maior do que você esperava.',
  'Já pagou juros por esquecer um boleto, e a planilha ficou abandonada.',
]

const RECURSOS: { icone: typeof Bell; titulo: string; texto: string }[] = [
  { icone: CreditCard, titulo: 'Cartões com fatura automática', texto: 'Limite, fechamento e vencimento. As compras caem na fatura certa, inclusive as parceladas.' },
  { icone: Repeat, titulo: 'Parcelas e contas fixas', texto: 'Aluguel, assinaturas e compras em 10x são lançados uma vez e se repetem sozinhos.' },
  { icone: CalendarClock, titulo: 'Previsão de saldo em 30 dias', texto: 'Veja hoje se vai faltar dinheiro daqui a duas semanas, e se antecipe.' },
  { icone: Users, titulo: 'Clientes e fornecedores', texto: 'Cadastro com CPF ou CNPJ e o total recebido, pago e em aberto de cada um.' },
  { icone: Target, titulo: 'Orçamento por categoria', texto: 'Defina um limite para mercado, lazer ou marketing e acompanhe quanto ainda pode gastar.' },
  { icone: FileUp, titulo: 'Exporta para Excel e PDF', texto: 'Relatórios e DRE prontos para imprimir ou mandar para o contador.' },
  { icone: Eye, titulo: 'Modo privacidade', texto: 'Esconda os valores com um toque quando estiver em público.' },
  { icone: Smartphone, titulo: 'No celular e no computador', texto: 'Tudo salvo na nuvem: lance no celular e analise no computador.' },
]

const DUVIDAS: [string, string][] = [
  ['Preciso conectar minha conta do banco?', 'Não. Você mesmo preenche: lança cada receita e despesa em segundos ou importa o extrato (OFX ou CSV) que baixa no site do seu banco. Não pedimos senha bancária e não temos acesso à sua conta.'],
  ['Então meus dados bancários ficam expostos?', 'Não. O arquivo do extrato é lido no seu próprio navegador para criar os lançamentos. O sistema não movimenta dinheiro, não faz pagamentos e não acessa banco nenhum. Cada pessoa só enxerga os próprios dados, protegidos por login e senha.'],
  ['Como funciona o teste grátis?', 'Crie sua conta e use tudo por 7 dias, sem cadastrar cartão. No fim do teste, escolha um plano para continuar. Se não assinar, nada é cobrado e seus lançamentos continuam guardados caso você volte.'],
  ['Serve para empresa ou só para pessoa física?', 'Para os dois. Pessoa física controla contas, cartões e metas. Quem tem empresa, MEI ou trabalha por conta própria ganha também a DRE, o cadastro de clientes e fornecedores com CNPJ e os relatórios por período.'],
  ['Posso cancelar quando quiser?', 'Pode. Você cancela sozinho, pelo portal de assinatura, sem precisar falar com ninguém. O acesso continua até o fim do período que já foi pago.'],
  ['E se eu me arrepender da compra?', 'Você tem 7 dias após a compra para pedir o reembolso, como garante o Código de Defesa do Consumidor para compras pela internet.'],
  ['Funciona no celular?', 'Sim. Abra no navegador do celular e use normalmente. O layout se adapta à tela e os dados são os mesmos do computador.'],
]

const porMes = (preco: string, meses: number) => (Number(preco.replace(',', '.')) / meses).toFixed(2).replace('.', ',')
const MESES: Record<string, number> = { mensal: 1, semestral: 6, anual: 12 }

export default function Landing({ onCadastrar, onEntrar }: Props) {
  const [menu, setMenu] = useState(false)
  const [aberta, setAberta] = useState<number | null>(0)

  // Links externos (como a /bio) chegam com #planos ou #seguranca: rola até a seção depois que a página monta.
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])
  const cta = (texto = 'Começar meus 7 dias grátis') => (
    <button className="lp-btn lp-btn-primario" onClick={onCadastrar}>{texto} <ArrowRight size={18} /></button>
  )

  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="lp-container lp-nav-dentro">
          <a className="lp-marca" href="#topo" onClick={() => setMenu(false)}>
            <img src="/favicon.svg" alt="" width={34} height={34} />
            <span>Lucro Real</span>
          </a>
          <nav className={`lp-links ${menu ? 'aberto' : ''}`} aria-label="Navegação">
            <a href="#seguranca" onClick={() => setMenu(false)}>Segurança</a>
            <a href="#recursos" onClick={() => setMenu(false)}>Recursos</a>
            <a href="#planos" onClick={() => setMenu(false)}>Planos</a>
            <a href="#duvidas" onClick={() => setMenu(false)}>Dúvidas</a>
            <button className="lp-link-botao" onClick={onEntrar}>Entrar</button>
          </nav>
          <div className="lp-nav-acoes">
            <button className="lp-btn lp-btn-primario lp-btn-pequeno" onClick={onCadastrar}>Testar grátis</button>
            <button className="lp-menu" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main id="topo">
        {/* Herói */}
        <section className="lp-heroi">
          <div className="lp-brilho" aria-hidden="true" />
          <div className="lp-container lp-heroi-dentro">
            <div className="lp-heroi-texto">
              <span className="lp-selo"><BadgeCheck size={16} /> 7 dias grátis · sem cartão de crédito</span>
              <h1>Pare de adivinhar. <em>Saiba quanto sobra de verdade</em> no fim do mês.</h1>
              <p className="lp-sub">
                Contas a pagar e receber, cartões, DRE e metas em um painel só. Sem conectar seu banco: você preenche do seu jeito e
                nenhuma senha bancária passa por aqui.
              </p>
              <div className="lp-heroi-acoes">
                {cta()}
                <a className="lp-btn lp-btn-fantasma" href="#seguranca">Por que é sem risco</a>
              </div>
              <ul className="lp-garantias">
                <li><Check size={16} /> Sem cartão para testar</li>
                <li><Check size={16} /> Cancele quando quiser</li>
                <li><Check size={16} /> Celular e computador</li>
              </ul>
            </div>
            <div className="lp-heroi-imagem">
              <div className="lp-janela">
                <div className="lp-janela-barra" aria-hidden="true"><i /><i /><i /></div>
                <img src="/landing/painel.jpg" alt="Painel do Lucro Real com saldo atual, previsão de 30 dias, saldo por conta e contas vencidas" width={1440} height={900} />
              </div>
              <img className="lp-celular" src="/landing/celular.jpg" alt="O mesmo painel aberto no celular" width={390} height={844} />
            </div>
          </div>
        </section>

        {/* Faixa de confiança */}
        <section className="lp-confianca" aria-label="Destaques">
          <div className="lp-container lp-confianca-dentro">
            <span><KeyRound size={18} /> Nenhuma senha de banco</span>
            <span><Lock size={18} /> Seus dados só para você</span>
            <span><Upload size={18} /> Importa extrato OFX e CSV</span>
            <span><Moon size={18} /> Tema claro e escuro</span>
          </div>
        </section>

        {/* Dor */}
        <section className="lp-secao">
          <div className="lp-container lp-estreito">
            <h2 className="lp-titulo">Você se reconhece em alguma destas?</h2>
            <ul className="lp-dores">
              {DORES.map((d) => <li key={d}><X size={18} /> {d}</li>)}
            </ul>
            <p className="lp-virada">
              O problema quase nunca é falta de dinheiro. <strong>É falta de enxergar o dinheiro.</strong> Quando você vê o que entra, o que sai e o que
              vence, as decisões ficam óbvias.
            </p>
          </div>
        </section>

        {/* Segurança */}
        <section className="lp-secao lp-seguranca" id="seguranca">
          <div className="lp-container lp-seguranca-dentro">
            <div>
              <span className="lp-sobretitulo"><ShieldCheck size={16} /> Sem risco para a sua conta</span>
              <h2 className="lp-titulo esquerda">Seu banco fica de fora. <em>Quem preenche é você.</em></h2>
              <p className="lp-texto">
                Muitos aplicativos pedem acesso à sua conta bancária. Aqui, não. Você lança cada valor em segundos ou importa o extrato que você mesmo
                baixa do banco, e o arquivo é lido no seu próprio navegador.
              </p>
              <p className="lp-texto">Você ganha a visão completa das finanças sem entregar a chave do cofre para ninguém.</p>
            </div>
            <ul className="lp-cartoes-seguranca">
              <li><KeyRound size={22} /><div><strong>Nenhuma senha bancária</strong><span>Não pedimos e não guardamos acesso a banco nenhum.</span></div></li>
              <li><Landmark size={22} /><div><strong>Nenhuma movimentação</strong><span>O sistema não paga, não transfere e não mexe no seu dinheiro.</span></div></li>
              <li><Lock size={22} /><div><strong>Só você vê seus dados</strong><span>Cada conta enxerga apenas os próprios lançamentos, protegidos por login e senha.</span></div></li>
              <li><FileUp size={22} /><div><strong>Seus dados são seus</strong><span>Baixe um backup ou exporte para Excel quando quiser.</span></div></li>
            </ul>
          </div>
        </section>

        {/* Recursos principais */}
        <section className="lp-secao" id="recursos">
          <div className="lp-container">
            <h2 className="lp-titulo">Tudo o que você precisa para tomar decisão com número, não com palpite</h2>

            <div className="lp-destaque">
              <div className="lp-destaque-texto">
                <span className="lp-sobretitulo"><FileSpreadsheet size={16} /> DRE automática</span>
                <h3>Descubra seu lucro real, não só o saldo da conta</h3>
                <p>
                  Receita, impostos, custos, despesas e lucro líquido, mês a mês, com a margem de cada linha. A DRE se monta sozinha a partir dos seus
                  lançamentos, por competência ou por caixa.
                </p>
                <ul className="lp-lista"><li><Check size={16} /> Margem bruta, operacional e líquida</li><li><Check size={16} /> Retiradas e empréstimos separados do resultado</li><li><Check size={16} /> Pronta para imprimir ou enviar ao contador</li></ul>
              </div>
              <img className="lp-print" src="/landing/dre.jpg" alt="DRE mês a mês com receita bruta, deduções, custos, despesas e lucro líquido" loading="lazy" />
            </div>

            <div className="lp-destaque invertido">
              <div className="lp-destaque-texto">
                <span className="lp-sobretitulo"><Bell size={16} /> Contas a pagar e a receber</span>
                <h3>Nunca mais pague juros por esquecimento</h3>
                <p>Vencidas, que vencem hoje e próximas, separadas e somadas. Dê baixa com um clique e veja quem está devendo para você.</p>
                <ul className="lp-lista"><li><Check size={16} /> Alerta de contas vencidas no menu</li><li><Check size={16} /> Recebimentos em atraso destacados</li><li><Check size={16} /> Filtros por período, conta e categoria</li></ul>
              </div>
              <img className="lp-print" src="/landing/pagar.jpg" alt="Tela de contas a pagar com vencidas, próximos vencimentos e botão de pagar" loading="lazy" />
            </div>

            <div className="lp-destaque">
              <div className="lp-destaque-texto">
                <span className="lp-sobretitulo"><Flag size={16} /> Metas</span>
                <h3>Metas que dizem quanto guardar por mês</h3>
                <p>Reserva de emergência, faturamento mínimo, lucro mensal ou teto de gastos. Você define o alvo e o app mostra o caminho e o histórico.</p>
                <ul className="lp-lista"><li><Check size={16} /> Quanto falta e quanto guardar por mês</li><li><Check size={16} /> Bateu ou não bateu, mês a mês</li><li><Check size={16} /> Metas no painel inicial</li></ul>
              </div>
              <img className="lp-print" src="/landing/metas.jpg" alt="Cartões de metas com reserva de emergência, faturamento mensal e teto de gastos" loading="lazy" />
            </div>

            <div className="lp-destaque invertido">
              <div className="lp-destaque-texto">
                <span className="lp-sobretitulo"><BarChart3 size={16} /> Relatórios</span>
                <h3>Entenda para onde vai cada real</h3>
                <p>Mês a mês, por categoria, por cliente e fornecedor e por conta, comparando com o período anterior.</p>
                <ul className="lp-lista"><li><Check size={16} /> Gráficos de receitas, despesas e acumulado</li><li><Check size={16} /> Maiores gastos e maiores clientes</li><li><Check size={16} /> Exporta CSV e PDF</li></ul>
              </div>
              <img className="lp-print" src="/landing/relatorio.jpg" alt="Gráfico mês a mês de receitas, despesas e resultado acumulado" loading="lazy" />
            </div>

            <ul className="lp-grade-recursos">
              {RECURSOS.map((r) => {
                const Icone = r.icone
                return (
                  <li key={r.titulo}>
                    <span className="lp-icone"><Icone size={20} /></span>
                    <strong>{r.titulo}</strong>
                    <span>{r.texto}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* Como funciona */}
        <section className="lp-secao lp-passos-secao">
          <div className="lp-container">
            <h2 className="lp-titulo">Em 5 minutos você já enxerga suas finanças</h2>
            <ol className="lp-passos">
              <li><span>1</span><strong>Crie sua conta grátis</strong><p>Só nome, e-mail e senha. Sem cartão de crédito.</p></li>
              <li><span>2</span><strong>Lance ou importe</strong><p>Cadastre suas contas e lance os gastos, ou importe o extrato do banco.</p></li>
              <li><span>3</span><strong>Decida com clareza</strong><p>Veja saldo, vencimentos, lucro e metas atualizados na hora.</p></li>
            </ol>
            <div className="lp-centro">{cta('Quero começar agora')}</div>
          </div>
        </section>

        {/* Planos */}
        <section className="lp-secao" id="planos">
          <div className="lp-container">
            <h2 className="lp-titulo">Comece grátis. Depois, escolha o seu plano.</h2>
            <p className="lp-subtitulo">Todos os planos têm acesso completo. Os 7 primeiros dias são por nossa conta.</p>
            <ul className="lp-planos">
              {PLANOS.map((p) => (
                <li key={p.id} className={p.destaque ? 'destaque' : ''}>
                  <span className="lp-plano-selo">{p.selo}</span>
                  <h3>{p.nome}</h3>
                  <p className="lp-plano-frase">{p.frase}</p>
                  <div className="lp-preco"><small>R$</small><strong>{p.preco}</strong></div>
                  <span className="lp-unidade">{p.unidade}</span>
                  <span className="lp-equivale">
                    {MESES[p.id] && MESES[p.id] > 1 ? `Equivale a R$ ${porMes(p.preco, MESES[p.id])} por mês` : p.id === 'vitalicio' ? 'Sem mensalidade, para sempre' : 'Sem fidelidade'}
                  </span>
                  <button className={`lp-btn ${p.destaque ? 'lp-btn-primario' : 'lp-btn-contorno'}`} onClick={onCadastrar}>Testar 7 dias grátis</button>
                </li>
              ))}
            </ul>
            <ul className="lp-selos-compra">
              <li><ShieldCheck size={18} /> Pagamento seguro pelo Stripe</li>
              <li><Repeat size={18} /> Cancele sozinho, a qualquer momento</li>
              <li><BadgeCheck size={18} /> 7 dias de arrependimento após a compra</li>
            </ul>
          </div>
        </section>

        {/* Dúvidas */}
        <section className="lp-secao" id="duvidas">
          <div className="lp-container lp-estreito">
            <h2 className="lp-titulo">Perguntas frequentes</h2>
            <div className="lp-faq">
              {DUVIDAS.map(([q, r], i) => (
                <div key={q} className={`lp-faq-item ${aberta === i ? 'aberta' : ''}`}>
                  <button onClick={() => setAberta(aberta === i ? null : i)} aria-expanded={aberta === i}>
                    {q} <ChevronDown size={20} />
                  </button>
                  {aberta === i && <p>{r}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chamada final */}
        <section className="lp-final">
          <div className="lp-container lp-final-dentro">
            <TrendingUp size={34} />
            <h2>Daqui a 30 dias, você vai saber exatamente quanto lucrou.</h2>
            <p>Ou vai continuar adivinhando. O teste é grátis, sem cartão e sem conectar seu banco.</p>
            {cta()}
          </div>
        </section>
      </main>

      <footer className="lp-rodape">
        <div className="lp-container lp-rodape-dentro">
          <span className="lp-marca pequena"><img src="/favicon.svg" alt="" width={24} height={24} /> Lucro Real</span>
          <span>© {new Date().getFullYear()} Lucro Real · Controle financeiro</span>
          <span className="lp-rodape-links"><a href="/termos">Termos de Uso</a> · <a href="/privacidade">Privacidade</a> · <a href="https://instagram.com/lucroreeal.br" target="_blank" rel="noopener">Contato</a></span>
          <button className="lp-link-botao" onClick={onEntrar}>Já tenho conta</button>
        </div>
      </footer>
    </div>
  )
}
