# reserva-salas · instruções para agentes de IA

Este arquivo é o contexto do projeto para qualquer agente (Claude Code, Copilot, Gemini CLI, Codex, Aider…).
Mantenha-o curto, verdadeiro e atualizado: contexto velho ensina o agente a errar.

## O que é
API HTTP para reservar salas da faculdade e acabar com o conflito de horário.
Especificações em `docs/specs/`. **Nenhum código sem SPEC; nenhum critério sem teste.**

## Stack e comandos
- Node.js 20+, JavaScript com ES modules. **Sem dependências externas.**
- Depois de clonar, rode uma vez: `npm run hooks:git` (ativa o hook de pre-commit que bloqueia segredo)
- Testes: `npm test` (usa `node:test`, nativo do Node)
- Rodar: `npm start` e abrir http://localhost:3000/salas
- Procurar segredo nos arquivos: `npm run segredos`

## Estrutura
- `src/reservas.js`: regras de negócio, funções puras (recebem `agora` como parâmetro)
- `src/app.js`: camada HTTP, sem regra de negócio
- `src/salas.js`: dados das salas
- `src/server.js`: só sobe o servidor (porta em `PORT`, padrão 3000)
- `scripts/bloqueia-segredo.js`: detector de segredo usado pelo hook do agente, pelo pre-commit e pelo CI
- `test/`: um arquivo de teste por módulo; cada teste cita o critério (`CA-1: …`)
- `docs/specs/`: SPECs; `docs/licoes/`: lições aprendidas; `diario/`: diário de bordo do grupo

## Como trabalhar
1. Crie uma branch para a tarefa; nada vai direto na `main`. Leia a SPEC. Se algo estiver ambíguo, pergunte antes de codar.
2. Proponha o plano antes de alterar arquivos.
3. Escreva o teste do critério primeiro e mostre que ele **falha**.
4. Implemente o mínimo para passar. Rode `npm test` inteiro.
5. Mostre o diff e explique as decisões em português. A mudança entra na `main` por PR.

## Nunca faça
- Alterar ou apagar um teste para ele passar. Se o teste parece errado, pare e pergunte.
- Instalar dependência sem pedir.
- Gravar segredo, senha ou chave em arquivo. Use variável de ambiente.
- Mexer em `.github/` ou `.claude/settings.json` sem pedir.
- Implementar o que está em "Fora de escopo" na SPEC.
