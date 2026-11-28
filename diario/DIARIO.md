# Diário de bordo do grupo

Uma entrada por aula. Vale 20% da nota e é avaliado pela **honestidade**, não pela ausência de erro.
Quem não registra o erro, repete o erro.

- **Grupo:** <nomes>
- **Tema do projeto:** reserva-salas
- **Ferramenta(s):**
  - Claude Code (extensão no VS Code)
  - GitHub Copilot no VS Code de um GitHub Codespace

---

## Entrada 1 · Aula 1 (roteiro conferido) e Lab 2 (SPEC-002) · <data>

**Ferramenta usada:** Claude Code (extensão no VS Code)

**O que pedimos ao agente (os 3 prompts mais importantes, copiados):**
1. `quero que me ajude a construir uma boa spec de cancelamento de reserva, me oriente com posso fazer passo a passo`
2. `/revisar-spec docs/specs/SPEC-002-cancelar-reserva.md` (rodado quatro vezes, até a nota parar de subir)
3. `uma duvida preciso ser tão detalhado nessa especificação?`

**3 acertos do agente:**
- **A revisão independente achou critérios que passariam sem código.** O CA de "reserva inexistente" ficaria verde só com o
  404 genérico do `app.js` ("Rota não encontrada"). O CA de "cancelada libera o horário" daria 400 se o teste usasse `agora`
  depois das 14:00, por causa do CA-3 da SPEC-001. Os dois foram corrigidos antes de existir qualquer teste.
- **Achou que o hook de pre-commit nunca rodava.** No commit `fc954f0`, o git avisou que o `.githooks/pre-commit` estava sem
  permissão de execução (modo `100644`). O agente rodou as checagens à mão, corrigiu numa branch (`ceda7a5`) e provou que o
  hook funciona: com o CA-3 quebrado de propósito, o commit foi bloqueado ("Testes falhando: commit bloqueado.").
- **Provou o teste vermelho do CA-3, que o histórico não provava.** O commit `324dddd` trouxe o teste e o código juntos. O
  agente tirou a linha do `if` (o teste falhou com `expected 400, actual 201`) e trocou `<` por `<=` (o teste de borda falhou
  com `expected 201, actual 400`). Depois restaurou o arquivo.

**Erros do agente (pelo menos 1, com evidência):**
- **Inflou a SPEC-002 acatando toda sugestão da revisão.** Ela foi de 9 para 21 critérios e 187 linhas. Cada rodada do
  `/revisar-spec` achava mais casos raros (`:id` igual a `abc`, corpo `[]`, justificativa `123`…), e o agente acrescentava
  todos. Só enxugou (para 6 critérios, 87 linhas, com uma tabela no CA-2) quando nós perguntamos se precisava de tanto
  detalhe. A nota ficou igual (8) com menos da metade do texto. → [decidir: vira a lição `docs/licoes/L-01-…md`?]
- **Ao enxugar a SPEC, perdeu duas regras que nós já tínhamos decidido:** a justificativa só com espaços vira `null`, e a
  regra de horário em texto (`agora >= inicio` exige justificativa). Foi a revisão seguinte que encontrou.
- **Escreveu na SPEC uma decisão que ninguém tomou:** "A coordenação aceita esse risco até existir a camada de login." O
  próprio agente percebeu e trocou por "a coordenação precisa confirmar".
- **Confundiu o comando `/revisar-spec` com o subagente `revisor`.** Pedimos "passar o revisor na primeira spec" e ele rodou
  o subagente que revisa código. Tivemos que dizer "era o commands!".
- **Explicou o passo a passo da SPEC de forma abstrata demais** (uma tabela de 8 passos com perguntas soltas). Respondemos
  "não entendi como posso seguir". Só funcionou quando passou a fazer uma pergunta por vez, com opções A/B.
- **Os subagentes repetiram um achado falso:** "o CLAUDE.md cita a skill `mensagem-de-erro`, que não existe". Na branch
  revisada, o CLAUDE.md não citava a skill; eles leram uma cópia antiga do contexto. O agente principal conferiu e descartou.

**O que nós decidimos (e o agente não podia decidir):**
- SPEC-002: só o professor cancela; a secretaria fica para depois do login.
- A reserva cancelada continua na lista com `status: "cancelada"` e libera o horário.
- Depois do fim da reserva não dá para cancelar; 409 para erro de estado (já cancelada, já terminou) e 400 para erro de pedido.
- A justificativa fica visível para todos, com o aviso de não escrever informação pessoal.
- Enxugar a SPEC-002 em vez de manter os 21 critérios.
- A SPEC-002 fica "em revisão" até a coordenação confirmar o risco de cancelar sem login.
- Trabalhar sempre em branch e PR, e corrigir o hook para o grupo todo, não só num clone.

**Custo e tempo:** <custo da sessão: rode /cost no Claude Code> · <minutos>

**O que faríamos diferente:**
- Pedir revisão **proporcional** desde a primeira rodada e parar quando a revisão não mudar mais nenhuma decisão.
- Rodar o `/revisar-spec` numa conversa nova: quem ajudou a escrever a SPEC tende a concordar com ela.
- No Passo 0, testar de verdade que o hook bloqueia (um commit com teste vermelho), em vez de só rodar `npm run hooks:git`.
- Pedir ao agente uma pergunta por vez desde o começo.

---

## Entrada 2 · Lab 3 · CA-02: conflito de horário · 28/11/2026

**Ferramenta usada:** GitHub Copilot no VS Code de um GitHub Codespace

**O que pedimos ao agente (os 3 prompts mais importantes, copiados):**
1. `Leia as questões de programação agêntica e .claude/. Estou trabalhando no CA-02 sobre conflito de horário. A última sessão agêntica terminou de modo inesperado, leia o que não está elencado em src/reservas.js e test/reservas.test.js`
2. `Quero que faça um teste para esse caso, em test/app.test.js`
3. `Temporariamente altera o src/reservas.js para não detectar mais conflitos. Então, rode o teste de rota novamente para validar. O restultado esperado é que o teste aponte falha.`

**3 acertos do agente:**
- Recuperou o estado do CA-02 pela SPEC-001 e pelo histórico da sessão anterior. A regra de domínio foi implementada e revisada no PR #6, que foi integrado.
- Acrescentou em `test/app.test.js` um teste HTTP para sobreposição na mesma sala, incluindo a resposta 409 e a mensagem; também verificou horário encostado e outra sala. O PR #7 foi integrado.
- Fez a verificação negativa pedida: ao remover temporariamente a checagem de conflito, o teste HTTP falhou com `201 !== 409`. Restaurou a implementação e o teste passou. A suíte completa terminou com 17 testes passando.

**Erros do agente (pelo menos 1, com evidência):**
- Afirmou inicialmente que `.claude/settings.json` não seria lido pelo Copilot no VS Code. Depois de o usuário questionar, consultou a documentação oficial e corrigiu a informação; o usuário desfez a alteração inicial de configuração. → Antes de recomendar uma configuração paralela, verificar as fontes e o formato de hooks suportados pelo harness ativo.

**O que nós decidimos (e o agente não podia decidir):**
- Seguir o CA-02 da SPEC-001: sobreposição na mesma sala retorna 409; horários encostados e outra sala não conflitam.
- Acrescentar um teste de ponta a ponta da rota, além dos testes de regra de negócio, sem alterar a implementação HTTP.
- Manter `package-lock.json` fora dos commits do Lab 3.

**Custo e tempo:** 11.69 AI credits · 1h 3m 39s

**O que faríamos diferente:**
- Incluir o teste HTTP do 409 no mesmo fluxo de entrega da regra de domínio, em vez de abrir um PR separado depois.
- Fazer a verificação de falha do teste de rota como parte da revisão do critério, para comprovar que ele detecta a ausência da regra.
- Evitar outra linguagem para uma validação simples: o agente recorreu a `ruby -e 'require "yaml"; YAML.load_file(...)'` para validar `docs/fluxo-exemplo.yaml`, embora o projeto use Node. Preferir executar código Node diretamente (`node`/`npm test`) reduz a estrutura necessária, a entropia e o contexto.

---

## Modelo para as próximas entradas

## Entrada N · Aula N · <data>

**O que pedimos ao agente (os 3 prompts mais importantes, copiados):**
1. …

**3 acertos do agente:**
- …

**Erros do agente (pelo menos 1, com evidência):**
- … → virou a lição `docs/licoes/L-NN-….md`

**O que nós decidimos (e o agente não podia decidir):**
- …

**Custo e tempo:** <custo da sessão (/cost no Claude Code, ou o painel da ferramenta)> · <minutos>

**O que faríamos diferente:**
- …
