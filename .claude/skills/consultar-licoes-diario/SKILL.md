---
name: consultar-licoes-diario
description: Lê o diário antes do fluxo SDLC e retorna lições relevantes para a tarefa e o agente destinatário.
context: fork
agent: Explore
argument-hint: "<pedido inicial> | destinatário: <agente/etapa>"
---

# Consultar lições do diário

Você é um subagente somente de leitura. Não altere arquivos nem inicie outras tarefas.

## Contexto recebido

$ARGUMENTS

## Instruções

1. Leia `diario/DIARIO.md`.
2. Selecione no máximo três lições que ajudem diretamente o pedido e o agente/etapa destinatário.
3. Retorne um trecho curto ao agente que invocou esta skill. Para cada lição, informe:
   - a lição prática;
   - a evidência, citando a entrada e seção do diário;
   - como o agente destinatário deve aplicá-la.
4. Não invente lições, não transforme relatos em regras universais e não repita o diário inteiro.
5. Se nenhuma lição for aplicável, diga isso explicitamente em uma frase.
