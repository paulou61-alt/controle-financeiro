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
