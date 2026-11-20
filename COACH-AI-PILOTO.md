Guia do piloto de IA
====================

Por padrão, o Coach usa as respostas locais. Para habilitar o piloto em um ambiente autorizado, aplique scripts/coach-ai-pilot.sql e configure as variáveis privadas descritas em .env.example. Use a origem exata do app, o SHA-256 hexadecimal da chave Hevy da conta piloto, o modelo e a chave OpenAI do projeto, a cota cumulativa de chamadas e um horário de corte ISO 8601 com fuso. Confirme a tarifa e o orçamento antes de habilitar COACH_AI_ENABLED. Para desligar, defina COACH_AI_ENABLED=false.

Validação em Node 24: npm run typecheck, npm run build e node --test scripts/coach-ai.test.mjs. Os testes usam respostas simuladas.
