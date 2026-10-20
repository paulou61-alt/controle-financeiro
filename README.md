# Controle Financeiro

Sistema de controle financeiro pessoal feito com React + Vite + TypeScript, pronto para deploy na Vercel.

## Funcionalidades

- **Dashboard financeiro**: saldo atual das contas, receitas recebidas, despesas pagas, **resultado de caixa** (recebido − pago, não é lucro contábil), totais a pagar e a receber, contas vencidas e **previsão de saldo para 30 dias**. Filtros por período e conta, gráfico de entradas e saídas, despesas por categoria, próximos vencimentos e atalhos para nova receita, nova despesa e transferência.
- **Lançamentos**: receitas e despesas com descrição, valor, categoria, conta, vencimento, situação, data de pagamento/recebimento, cliente ou fornecedor e observações. Busca, filtros (período, tipo, categoria, conta e situação), baixa, reversão de baixa, exclusão com confirmação, recorrência e exportação CSV. "Atrasado" é calculado automaticamente.
- **Contas a pagar e a receber**: telas separadas, organizadas em vencidas, vencem hoje, próximos vencimentos e pagas/recebidas, com totais e baixa direto na lista.
- **Contas financeiras**: conta bancária, caixa e carteira digital, com saldo inicial e data. O saldo soma as movimentações realizadas a partir dessa data. Transferências entre contas próprias (não contam como receita nem despesa). Contas com histórico são arquivadas, preservando as movimentações.
- **Parcelamento e recorrência**: compras em N vezes (valor total ou da parcela), despesas e receitas fixas semanais, quinzenais, mensais ou anuais, com ou sem data de fim (as sem fim são geradas automaticamente 12 meses à frente). Ao editar ou excluir, escolha entre somente esta, esta e as próximas, ou todas.
- **Cartão de crédito**: limite, dia de fechamento e vencimento, faturas calculadas automaticamente, compras parceladas no cartão, pagamento total ou parcial da fatura pela conta escolhida. As compras não alteram o saldo da conta; o pagamento da fatura sim.
- **Importar extrato (OFX/CSV)**: lido no próprio navegador, sem conectar ao banco. Detecta duplicados, sugere categorias pelo histórico e por palavras-chave e concilia com lançamentos pendentes.
- **Clientes e fornecedores**: cadastro com pessoa física (CPF) ou jurídica (CNPJ, inclusive o novo CNPJ alfanumérico), e-mail e telefone, com validação de dígitos verificadores e totais recebidos, pagos e em aberto por cadastro. O nome digitado no lançamento é ligado ao cadastro automaticamente.
- **Dados cadastrais** do titular (pessoa física ou jurídica) em Configurações.
- **Campos com máscara**: valores em reais formatados enquanto digita, CPF, CNPJ e telefone.
- **Relatórios**: mês a mês (receitas, despesas, resultado, margem e acumulado), por categoria com comparação ao período anterior, por cliente e fornecedor (com valores em aberto) e movimentação por conta (saldo inicial, entradas, saídas, transferências e saldo final). Exportação CSV e impressão/PDF.
- **DRE**: receita bruta, deduções, receita líquida, custos, lucro bruto, despesas operacionais, resultado operacional, financeiro, IR/CSLL e lucro líquido, com margens e análise vertical, por mês ou total, em regime de competência ou de caixa. Cada categoria é ligada a uma linha da DRE (em Categorias ou na própria tela); retiradas, aportes e empréstimos ficam "fora do resultado". Exportação CSV e impressão/PDF.
- **Metas**: juntar um valor até um prazo (pelo saldo de uma conta ou registrando o que foi guardado, com o quanto guardar por mês), faturamento mínimo mensal, lucro mínimo mensal (pela DRE) e teto de gastos mensal, com histórico dos últimos 6 meses. As metas também aparecem no Dashboard.
- **Orçamentos** por categoria, **categorias** personalizáveis, tema claro/escuro, modo privacidade e dados de exemplo.
- **Login e senha** com cadastro, confirmação por e-mail, recuperação de senha e troca de senha.
- Dados de cada usuário salvos na nuvem (Supabase) com salvamento automático. Cada pessoa só enxerga os próprios dados.

## Configurar o Supabase (login e banco de dados)

1. Crie uma conta e um projeto em https://supabase.com (plano gratuito).
2. No projeto, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Em **Authentication → URL Configuration**, coloque o endereço do site (ex.: `https://seu-app.vercel.app`) em **Site URL** e também em **Redirect URLs**.
5. Na Vercel, em **Settings → Environment Variables**, crie:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = chave anon public
6. Faça um novo deploy (Deployments → ⋯ → Redeploy).

Para rodar localmente, copie `.env.example` para `.env.local` e preencha os mesmos valores.

## Assinaturas com Stripe

Todo usuário ganha **7 dias de teste grátis** automaticamente, sem cartão e uma vez por e-mail: quem cria a conta ganha na hora, e quem já tinha conta ganha no primeiro acesso depois que a cobrança é ligada. Durante o teste aparece uma faixa com os dias que faltam e o botão "Ver planos". Depois disso, só entra quem tem acesso ativo. Quem não tem vê a tela de planos (Mensal R$ 14,90, Semestral R$ 69,90, Anual R$ 99,90 e Vitalício R$ 149,90). O bloqueio vale no banco de dados, não só na tela.

| Situação no Stripe | Acesso |
|---|---|
| Pagamento aprovado | Liberado na hora (assinatura até o fim do período pago; vitalício sem data de fim) |
| Boleto/Pix aguardando | Pendente, não libera |
| Renovação recusada | Continua liberado por 5 dias, com aviso no app para atualizar o cartão |
| Assinatura cancelada | Usa até o fim do período pago |
| Reembolso total ou contestação (chargeback) | Bloqueado na hora, e a assinatura é cancelada no Stripe |
| Reembolso parcial | Não muda nada |

Os dados de quem foi bloqueado continuam guardados. Se a pessoa assinar de novo com o mesmo e-mail, volta tudo como estava.

### Configuração (faça primeiro no modo de teste do Stripe)

1. **Supabase**: rode de novo o [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor. Você também ganha os 7 dias de teste; para não ter prazo, libere o seu e-mail com a linha `insert ... 'cortesia'` que está no fim do arquivo. Mantenha ligada a confirmação de e-mail (Authentication → Providers → Email → Confirm email): é ela que garante que ninguém se cadastra com o e-mail de quem pagou.
2. **Stripe → Catálogo de produtos**: crie o produto "Controle Financeiro" com 4 preços em BRL: R$ 14,90 recorrente mensal, R$ 69,90 recorrente a cada 6 meses, R$ 99,90 recorrente anual e R$ 149,90 avulso. Copie o ID de cada preço (`price_...`).
3. **Stripe → Desenvolvedores → Webhooks → Adicionar destino**: URL `https://SEU-SITE/api/stripe-webhook`, com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded` e `charge.dispute.created`. Copie o segredo de assinatura (`whsec_...`).
4. **Stripe → Configurações → Portal do cliente**: ative o portal e permita atualizar a forma de pagamento, ver as faturas, cancelar e trocar entre os planos Mensal, Semestral e Anual.
5. **Vercel → Settings → Environment Variables**:
   - `STRIPE_SECRET_KEY` = chave secreta (`sk_test_...` no teste, `sk_live_...` em produção)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `STRIPE_PRECO_MENSAL`, `STRIPE_PRECO_SEMESTRAL`, `STRIPE_PRECO_ANUAL`, `STRIPE_PRECO_VITALICIO` = os IDs `price_...`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Project Settings → API → **service_role** (secreta: nunca coloque no código nem em variável `VITE_`)
   - `SITE_URL` = endereço do site (ex.: `https://seu-app.vercel.app`)
6. Faça um novo deploy e teste com o cartão `4242 4242 4242 4242` (qualquer data futura e CVC). Teste também um reembolso pelo painel do Stripe e confira que o acesso é bloqueado.
7. Para vender de verdade, repita os passos 2 a 5 no modo de produção do Stripe, com as chaves `live`.

**Página de vendas**: se você usar Payment Links do Stripe fora do app, a pessoa deve criar a conta com **o mesmo e-mail** usado na compra. O acesso já estará liberado quando ela entrar.

**Liberar ou bloquear manualmente**: veja os exemplos no fim do `schema.sql` (cortesia, bloqueio).

## Rodar localmente

```bash
npm install
npm run dev
```

## Deploy na Vercel

1. Acesse https://vercel.com/new e importe este repositório do GitHub.
2. A Vercel detecta o Vite automaticamente (build `npm run build`, saída `dist`).
3. Adicione as variáveis do Supabase (passo 5 acima) e clique em **Deploy**. Cada novo `git push` na branch `main` publica uma nova versão.

## Planos e Stripe

A aba **Planos** fica no menu lateral (e em **Mais**, no celular) e é a mesma tela que aparece para quem está sem acesso.

| Plano | Valor em BRL | Tipo de preço no Stripe |
| --- | --- | --- |
| Mensal | R$ 14,90 | Recorrente, a cada 1 mês |
| Semestral | R$ 69,90 | Recorrente, a cada 6 meses |
| Anual (Melhor equilíbrio) | R$ 99,90 | Recorrente, a cada 1 ano |
| Vitalício (Pague uma vez) | R$ 149,90 | Pagamento único |

Ao escolher um plano, o app abre o **Checkout do Stripe ligado à conta logada** (`/api/checkout`). Enquanto as chaves do Stripe e do Supabase não estiverem na Vercel, o botão usa os **Payment Links** como reserva, já com o e-mail e o id da conta preenchidos (`prefilled_email` e `client_reference_id`), e o webhook libera o acesso do mesmo jeito.

Os quatro Payment Links de produção estão como padrão em `src/acesso.ts`. As variáveis `VITE_STRIPE_LINK_MENSAL`, `VITE_STRIPE_LINK_SEMESTRAL`, `VITE_STRIPE_LINK_ANUAL` e `VITE_STRIPE_LINK_VITALICIO` substituem esses links; uma variável vazia desativa o plano. Só são aceitos links `https://buy.stripe.com/...`. No modo demonstração, a contratação fica desativada. Em cada Payment Link, configure no Stripe o redirecionamento após o pagamento para `https://SEU-SITE/?assinatura=sucesso`, para o app confirmar o acesso sozinho.

Nenhuma chave secreta deve ir em variáveis `VITE_*`, pois elas são públicas. A liberação do acesso nunca depende do navegador: ela vem só do webhook verificado (veja abaixo).
