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

Os dados ficam salvos no `localStorage` do navegador: não há servidor nem banco de dados. Use o backup para levar os dados para outro aparelho.

## Rodar localmente

```bash
npm install
npm run dev
```

## Deploy na Vercel

1. Acesse https://vercel.com/new e importe este repositório do GitHub.
2. A Vercel detecta o Vite automaticamente (build `npm run build`, saída `dist`).
3. Clique em **Deploy**. Cada novo `git push` na branch `main` publica uma nova versão.
