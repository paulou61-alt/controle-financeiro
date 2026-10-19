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

A aba **Planos** está disponível no menu lateral e em **Mais** no celular.

| Plano | Valor em BRL | Tipo de preço no Stripe |
| --- | --- | --- |
| Mensal | R$ 14,90 | Recorrente, a cada 1 mês |
| Semestral | R$ 69,90 | Recorrente, a cada 6 meses |
| Anual — Melhor equilíbrio | R$ 99,90 | Recorrente, a cada 1 ano |
| Vitalício — Pague uma vez | R$ 149,90 | Pagamento único |

Crie os quatro preços e seus Payment Links no painel do Stripe seguindo
https://docs.stripe.com/payment-links. Configure os links públicos nas variáveis
`VITE_STRIPE_LINK_MENSAL`, `VITE_STRIPE_LINK_SEMESTRAL`, `VITE_STRIPE_LINK_ANUAL`
e `VITE_STRIPE_LINK_VITALICIO` na Vercel (ou `.env.local`) e gere um novo build.
Os valores exibidos são os totais cobrados por período, não parcelas mensais.
Confirme que cada link usa o preço, moeda e recorrência correspondentes à tabela.

Os quatro links de teste fornecidos estão configurados como padrão no componente.
Cada cartão sinaliza o modo de teste, que não realiza cobrança real. Para ativar
pagamentos reais, configure as variáveis acima com Payment Links de produção.
Uma variável definida como vazia desabilita o respectivo plano; remova a variável
para usar o link de teste padrão. Sem um link válido de `https://buy.stripe.com/...`, o plano mostra **Em breve**.
No modo demonstração, todos os botões de contratação ficam desabilitados.
Os links abrem o checkout hospedado pelo Stripe em outra aba. Nenhuma chave
secreta deve ser colocada em variáveis `VITE_*`, pois elas são públicas.

Esta etapa oferece a vitrine e o direcionamento ao pagamento. Ela não bloqueia
recursos nem libera acesso automaticamente após a compra. Para vincular pagamentos
à conta autenticada e controlar permissões, será necessária uma integração de
backend com Checkout autenticado e webhooks Stripe verificados; nunca use o
redirecionamento de sucesso ou dados do navegador como prova de pagamento.
