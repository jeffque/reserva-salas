# SPEC-002 · Cancelar reserva

- **Situação:** em revisão · falta a coordenação confirmar o risco sem login (ver Riscos)
- **Dono:** coordenação do curso

## Problema
Hoje as reservas são feitas por e-mail com a secretaria. Com o sistema de reservas (SPEC-001), cada reserva
passa a bloquear a sala naquele horário, mas não há como desfazê-la. Se o professor desiste da aula, a sala
continua bloqueada e outro professor que precisava dela não consegue reservar.

## Quem usa
Professores que fizeram reservas: cerca de 80 professores, 3 salas.
Nesta entrega o sistema não identifica quem faz o pedido (não há login): qualquer pedido com o número
da reserva pode cancelá-la. Conferir se quem pede é o dono da reserva fica para a futura camada de login.

## Regras de negócio
- **Como cancelar:** `POST /reservas/:id/cancelamento`, com o corpo opcional `{ "justificativa": "..." }`.
  Cancelamento aceito responde 204, sem corpo.
- **Status:** toda reserva tem `status` (`"ativa"` ao ser criada, `"cancelada"` depois do cancelamento) e `justificativa`
  (`null` até existir uma). Cancelar não apaga a reserva: ela continua no `GET /reservas`.
- **Horário liberado:** o conflito de horário (CA-2 da SPEC-001) considera só as reservas com `status: "ativa"`.
- **Horário do pedido:** antes do início, cancela com ou sem justificativa. A partir do início (`agora >= inicio`),
  a justificativa é obrigatória. A partir do fim (`agora >= fim`), não cancela mais → 409.
- **Justificativa:** texto livre, guardado depois do `trim()`. Conta como preenchida se sobrar pelo menos um caractere;
  se não sobrar, fica `null`. Sem corpo, com `{}`, sem o campo ou com `justificativa: null`, o pedido é tratado como sem justificativa.
- **Pedido malformado → 400:** JSON inválido, corpo que não é objeto ou `justificativa` que não é texto.
  Um `:id` que não corresponde a nenhuma reserva (inclusive `abc`) → 404.
- **Pedido recusado não muda nada:** a reserva fica com o mesmo `status` e a mesma `justificativa`.
- **Ordem dos erros:** malformado (400) → inexistente (404) → já cancelada (409) → já terminou (409) → falta justificativa (400).

## Critérios de aceite
Reserva de referência: **lab-1, 2026-12-01, das 14:00 às 16:00 (-03:00)**. O horário do pedido é o `agora` injetado no teste.
O status e a justificativa se conferem no `GET /reservas`. Nos erros, o teste confere só a palavra-chave do `erro`;
o texto completo segue a skill `mensagem-de-erro` (diz o que aconteceu e o que fazer).

- **CA-1 · Reserva nova nasce ativa** · Dado o lab-1 livre, quando às 13:00 reservo a reserva de referência, então a resposta
  é 201 com `status: "ativa"` e `justificativa: null`.
- **CA-2 · Cancelar conforme o horário e a justificativa** · Dado a reserva de referência ativa, quando peço o cancelamento
  como em cada linha, então recebo o resultado da linha ("sem" = pedido sem corpo):

  | Pedido às | Justificativa | Resposta | `erro` contém | Reserva fica |
  |---|---|---|---|---|
  | 13:59 | sem | 204 | | cancelada, `null` |
  | 13:59 | `"  Aula cancelada  "` | 204 | | cancelada, `"Aula cancelada"` |
  | 13:59 | `"   "` | 204 | | cancelada, `null` |
  | 14:00 | sem | 400 | `justificativa` | ativa |
  | 14:00 | `"   "` | 400 | `justificativa` | ativa |
  | 14:00 | `"Aula cancelada"` | 204 | | cancelada, `"Aula cancelada"` |
  | 15:59 | sem | 400 | `justificativa` | ativa |
  | 15:59 | `"Aula cancelada"` | 204 | | cancelada, `"Aula cancelada"` |
  | 16:00 | `"Aula cancelada"` | 409 | `terminou` | ativa |
  | 16:00 | sem | 409 | `terminou` | ativa |

- **CA-3 · Reserva inexistente** · Dado a reserva 1 ativa, quando cancelo a reserva 999, então a resposta é 404
  com `reserva` no `erro` (o 404 genérico do app, "Rota não encontrada", não serve), e o `GET /reservas` não muda.
  O mesmo vale para `POST /reservas/abc/cancelamento`.
- **CA-4 · Reserva já cancelada** · Dado a reserva cancelada às 13:59 sem justificativa, quando peço de novo às 13:59,
  e também às 16:00 com `"Aula cancelada"`, então as duas respostas são 409 com `cancelada` no `erro`, e a reserva
  continua cancelada com `justificativa: null`.
- **CA-5 · Justificativa que não é texto** · Dado a reserva ativa, quando às 13:59 envio `{ "justificativa": 123 }`,
  então a resposta é 400 com `texto` no `erro`, e a reserva continua ativa.
- **CA-6 · Cancelada libera o horário** · *Depende do CA-2 da SPEC-001; até ele existir, os testes ficam marcados com `{ todo }`.*
  Dado a reserva cancelada às 13:59, quando às 13:59 outro professor reserva o lab-1 das 14:00 às 16:00, então a resposta é 201.
  **Controle:** sem cancelar antes, a mesma reserva recebe 409.

## Fora de escopo
- Login e permissões (AAA: autenticação, autorização e accounting): identificar quem pede, o papel dele e se ele é o dono da reserva.
- Regras próprias para a secretaria (ex.: cancelar sem justificativa ou depois do fim).
- Enviar alertas.
- Logs e accounting detalhados de auditoria.
- Desfazer um cancelamento (reativar a reserva).
- Editar ou trocar o horário de uma reserva.
- Filtrar o `GET /reservas` por `status`.
- Cancelar reserva recorrente.
- Limite de tamanho da justificativa.
- Registrar quando a reserva foi cancelada (`canceladaEm`).
- Resposta 405 para outros métodos na rota de cancelamento.

## Riscos e perguntas
- **Dependência:** o CA-6 só pode ser testado depois que o CA-2 da SPEC-001 (conflito de horário) estiver implementado.
  Quem fizer o CA-2 (Lab 3) já deve considerar só as reservas com `status: "ativa"`.
- **Muda o contrato da SPEC-001:** pelo CA-1, o `POST /reservas` e o `GET /reservas` passam a devolver `status` e `justificativa`.
- **Justificativa visível para todos:** sem login, qualquer pessoa lê a justificativa no `GET /reservas`. O grupo aceita isso
  nesta entrega; o professor deve evitar escrever informação pessoal no motivo.
- **Risco sem login:** sem login e com números de reserva sequenciais (1, 2, 3…), qualquer pessoa consegue cancelar
  todas as reservas. A coordenação do curso (dona desta SPEC) precisa confirmar que aceita esse risco até existir a camada de login.
- **Concorrência:** hoje as reservas ficam em memória e o Node atende um pedido por vez, então dois cancelamentos ao mesmo tempo
  não são um risco. Quando houver banco de dados, isso precisa ser revisto.

---
Conferência antes de aprovar (ou rode `/revisar-spec` no Claude Code):
- [x] Todo critério vira um teste automático sem interpretação
- [x] Há pelo menos um caso de erro e um caso de borda
- [x] "Fora de escopo" tem pelo menos um item
- [x] Nenhuma pergunta aberta bloqueia o primeiro critério
