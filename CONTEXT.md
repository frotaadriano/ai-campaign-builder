# CONTEXT - AI Campaign Builder

## Resumo curto
Aplicacao local-first para criar campanhas de RPG em um canvas visual. O usuario monta a historia com Story Blocks conectados. O AI regenera apenas os trechos afetados pelo grafo.

## Decisoes atuais
- Estrutura narrativa como grafo (blocos + arestas)
- Regeneracao parcial baseada em subgrafo afetado
- Prompt deterministico e pequeno
- Processo: RPI (Research, Plan, Implement)

## Modelos minimos
- StoryBlock: id, type, title, content, inputs, meta, position
- Campaign: id, title, blocks, edges, settings, updated_at

## Prompting e contexto
- Usar apenas N-hop upstream do bloco alvo
- Preferir sumarios cacheados
- Ordenacao fixa por tipo e topologia
- Budget de tokens com corte por prioridade

## Stack alvo
- Frontend: React + React Flow + Zustand + Tailwind
- Backend: FastAPI + SQLite
- AI: adaptador plugavel (mock e real)

## Estrutura de repo (planejada)
- README.md: visao publica
- PLAN.md: plano mestre
- CONTEXT.md: resumo tecnico
- docs/: fases e diretrizes de UX
- apps/: web e api (quando iniciar o codigo)

## Status
- Planejamento inicial concluido, sem codigo implementado
