# SPEC-002 · Cancelar reserva

- **Situação:** rascunho
- **Dono:** coordenação do curso

## Problema
Um professor pode precisar cancelar uma reserva que fez.

## Quem usa
Professores que fizeram reservas. Cerca de 80 professores, 3 salas.

A justificativa é um campo de texto livre que pode ser preenchido; ela é obrigatória apenas em algumas situações.

Reservas realizadas podem ser canceladas em horário antes do início. Após iniciar o horário da reserva, é necessário preencher a justificativa do cancelamento.

Esta entrega trata somente do cancelamento da reserva, alterando seu status no banco de dados para cancelada.

Os critérios usam professor e dono da reserva como contexto, mas não incluem a implementação de AAA (autenticação, autorização e accounting). Identificar quem está usando o sistema, autenticar, determinar seu papel e validar permissões ou titularidade serão tratados separadamente. Os critérios que dependem dessas decisões ficam condicionados à futura camada AAA.

## Regras de negócio

Uma justificativa é considerada preenchida quando o valor do campo `justificativa`, após remover os espaços em branco do início e do fim (`trim()`), contém pelo menos um caractere.

Para uma reserva das 14:00 as 16:00, o horário de início é 14:00. Qualquer horário (incluindo 14:00) é considerado após o início.

## Critérios de aceite

### CA-1

Dado um professor que fez uma reserva para hoje das 14:00 às 16:00
Quando ele pede um cancelamento da reserva com antecedência, as 13:59, sem justificativa
Então a reserva é cancelada e ele recebe 204 (no response)

#### CA-1.1 variação de cancelamento com justificativa

Dado um professor que fez uma reserva para hoje das 14:00 às 16:00
Quando ele pede um cancelamento da reserva com antecedência, as 13:59, com a justificativa: "Aula cancelada porque minha vó quebrou o braço no jiu-jistu"
Então a reserva é cancelada e ele recebe 204 (no response)

### CA-2

Dado um professor que fez uma reserva para hoje das 14:00 às 16:00
Quando ele pede um cancelamento da reserva após o início da reserva, as 14:00, sem justificativa
Então a reserva não é cancelada (http 400) com a mensagem de que reservas após o começo exigem justificativa

#### CA-2.1

Dado um professor que fez uma reserva para hoje das 14:00 às 16:00
Quando ele pede o cancelamento às 14:00 com a justificativa vazia (`""`)
Então a reserva não é cancelada e o sistema responde 400

#### CA-2.2

Dado um professor que fez uma reserva para hoje das 14:00 às 16:00
Quando ele pede o cancelamento às 14:00 com uma justificativa formada apenas por espaços (`"   "`)
Então a reserva não é cancelada e o sistema responde 400

### CA-3

Dado um professor que fez uma reserva para hoje das 14:00 às 16:00
Quando ele pede um cancelamento da reserva após o início da reserva, as 14:00, com a justificativa: "Aula cancelada porque minha vó quebrou o braço no jiu-jistu"
Então a reserva é cancelada com sucesso e ele recebe 204 (no response)

### CA-4

Dado um professor sem reserva ativa
Quando ele pede o cancelamento de uma reserva inexistente
Então o sistema responde 404 e não altera nenhuma reserva

### CA-5

Dado um professor cujo cancelamento já foi realizado
Quando ele tenta cancelar a mesma reserva novamente
Então o sistema responde 400 e mantém o estado final da reserva como cancelada

### CA-6

Dado um professor que fez uma reserva ativa para hoje das 14:00 às 16:00 e o horário atual é 13:59
Quando ele envia duas solicitações de cancelamento simultâneas sem justificativa
Então uma solicitação responde 204 e a outra responde 400, e o status final da reserva é cancelada

## Fora de escopo
Enviar alertas.

Logs e accounting detalhados de auditoria.

## Riscos e perguntas
Como identificar a pessoa que fez a reserva?

Como identificar papel do usuário que está interagindo?

---
Conferência antes de aprovar (ou rode `/revisar-spec` no Claude Code):
- [ ] Todo critério vira um teste automático sem interpretação
- [ ] Há pelo menos um caso de erro e um caso de borda
- [ ] "Fora de escopo" tem pelo menos um item
- [ ] Nenhuma pergunta aberta bloqueia o primeiro critério
