# Hevy Insights

Dashboard pessoal de acompanhamento de treinos, construído sobre a [API do Hevy](https://api.hevyapp.com/docs/#/). Next.js (App Router) com interface web responsiva (desktop e mobile) e rotas de API em Node.js que fazem proxy seguro para a API do Hevy — a API key nunca é exposta ao navegador.

## Funcionalidades

- **Painel**: total de treinos, treinos da semana, sequência de semanas ativas, duração média, volume semanal (gráfico) e exercícios mais frequentes.
- **Treinos**: histórico paginado e detalhe completo de cada treino (exercícios, séries, peso, reps, RPE).
- **Exercícios**: busca de exercícios e página de evolução com gráfico de carga máxima por sessão, recordes pessoais (PRs) e histórico de sessões.
- **Rotinas**: rotinas salvas agrupadas por pasta, com exercícios e séries.
- **Medidas**: peso corporal e demais medidas ao longo do tempo, com gráfico e tabela.
- Alternância de unidade **kg / lb** persistida localmente.

## Rodando localmente

1. Copie `.env.example` para `.env.local` e defina sua chave (Hevy Pro → `hevy.com/settings?developer`):

   ```bash
   HEVY_API_KEY=sua-chave-uuid
   ```

2. Instale as dependências e rode o servidor de desenvolvimento:

   ```bash
   npm install
   npm run dev
   ```

3. Abra [http://localhost:3000](http://localhost:3000).

## Deploy na Vercel

1. Importe este repositório na [Vercel](https://vercel.com/new).
2. Em **Environment Variables**, adicione `HEVY_API_KEY` com sua chave da API do Hevy.
3. Deploy. As rotas em `src/app/api/*` rodam como funções serverless e são as únicas com acesso à chave.

## Stack

- Next.js 16 (App Router, Route Handlers)
- TypeScript
- Tailwind CSS v4
- Recharts (gráficos)
- SWR (data fetching no cliente)
