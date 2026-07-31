# Hevy Analytics

Dashboard responsiva para acompanhar treinos do Hevy. A aplicação usa Next.js (interface React + backend Node.js) e mantém a API key exclusivamente no servidor.

## Rodar localmente

1. Instale Node.js 20.9 ou superior.
2. Rode `npm install`.
3. Copie `.env.example` para `.env.local` e defina um segredo aleatório de pelo menos 32 caracteres.
4. Rode `npm run dev` e abra `http://localhost:3000`.

## Variáveis

- `HEVY_SESSION_SECRET`: segredo usado para criptografar os cookies de sessão (obrigatório, mínimo de 32 caracteres).
- `HEVY_MAX_WORKOUT_PAGES`: máximo de páginas de 10 treinos carregadas (padrão: 20; máximo: 100).

## Vercel

Importe o repositório na Vercel e cadastre as mesmas variáveis em Project Settings → Environment Variables. Não use prefixo `NEXT_PUBLIC_` na chave.

## Segurança

A chave é informada na tela de acesso, validada diretamente no Hevy e armazenada somente em cookie de sessão criptografado, `HttpOnly` e `SameSite=Lax`. Ela não fica disponível ao JavaScript. Sair apaga o cookie; as preferências ficam em `sessionStorage` e são removidas no logout.
