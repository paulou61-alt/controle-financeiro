# Controle Financeiro

Sistema de controle financeiro pessoal feito com React + Vite + TypeScript, pronto para deploy na Vercel.

## Funcionalidades

- **Dashboard de acompanhamento**: saldo total com evolução de 12 meses, insights automáticos do mês, KPIs com variação em relação ao mês anterior, taxa de economia, fluxo de caixa (receitas x despesas x saldo), gastos por categoria, ritmo de gastos dia a dia comparado ao mês anterior, metas de gastos, contas pendentes com alerta de vencimento e ranking das maiores despesas.
- **Lançamentos**: agrupados por dia, com ícones por categoria, filtros, busca, marcação de pago/pendente, recorrência (repetir por N meses) e exportação para CSV (abre no Excel).
- **Orçamentos**: limite mensal por categoria com anel de progresso geral e alertas de 80% e 100%.
- **Categorias**: crie, renomeie e escolha a cor.
- **Configurações**: nome do usuário (saudação personalizada), tema claro/escuro/automático, backup e restauração em `.json` e dados de exemplo para demonstração.
- Modo privacidade (ícone de olho) para ocultar os valores.
- Menu lateral no computador e menu inferior com botão flutuante no celular.

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
