# Controle Financeiro

Sistema de controle financeiro pessoal feito com React + Vite + TypeScript, pronto para deploy na Vercel.

## Funcionalidades

- **Painel**: receitas, despesas, saldo do mês e saldo acumulado; gráfico de despesas por categoria; comparativo dos últimos 6 meses; lista de contas pendentes.
- **Lançamentos**: cadastro, edição e exclusão de receitas e despesas, com filtros (tipo, categoria, situação, busca), marcação de pago/pendente, lançamentos recorrentes (repetir por N meses) e exportação para CSV (abre no Excel).
- **Orçamentos**: limite mensal por categoria com barra de progresso e alerta quando estoura.
- **Categorias**: crie, renomeie, mude a cor ou exclua categorias.
- **Backup**: exporte e restaure todos os dados em um arquivo `.json`.
- Modo escuro automático e layout para celular.

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
