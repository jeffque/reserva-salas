# SPEC-002 · Cancelar reserva

- **Situação:** rascunho
- **Dono:** coordenação do curso

## Problema
Imprevistos podem acontecer. Tanto quem reservou a sala pode precisar não comparecer (aka, cancelar a reserva) como também podem acontecer sinistros que inviabilizem o uso.

## Quem usa
Professores (fazem a reserva) e secretaria. Cerca de 80 professores, 3 salas.

Secretaria pode fazer um cancelamento por sinistro, o que torna a sala indisponível por uma janela de tempo.

## Critérios de aceite

### CA-1

Dado um professor que fez uma reserva
Quando ele pede um cancelamento da reserva com antecedência sem justificativa
Então a reserva é cancelada e ele recebe 204 (no response)

#### CA-1.1 variação de cancelamento com justificativa

Dado um professor que fez uma reserva
Quando ele pede um cancelamento da reserva com antecedência com justificativa
Então a reserva é cancelada e ele recebe 204 (no response)

### CA-2

Dado um professor
Dado uma sala reservada por outro professor
Quando ele pede um cancelamento da uma reserva que ele não fez
Então a reserva não é alterada e ele recebe 400 (dados inválidos)

OBS: independe da existência de justificativa


### CA-3

Dado um professor que fez uma reserva
Quando ele pede um cancelamento da reserva após o começo da reserva sem justificativa
Então a reserva não é cancelada (http 400) com a mensagem de que reservas após o começo exigem justificativa

### CA-4

Dado um professor que fez uma reserva
Quando ele pede um cancelamento da reserva após o começo da reserva com justificativa
Então a reserva é cancelada e ele recebe 204 (no response)

### CA-5

Dado um agente da secretaria
Quando ele pede um cancelamento por sinistro da reserva com antecedência sem justificativa
Então a reserva não é cancelada (http 400) com a mensagem de que cancelamento por sinistro exigem justificativas

### CA-6

Dado um agente da secretaria
Quando ele pede um cancelamento por sinistro da reserva com antecedência com justificativa
Então a reserva não é cancelada (http 204)

OBS: independe do horário

## Fora de escopo
Enviar alertas.

AAA está implícito.

## Riscos e perguntas
Como identificar a pessoa que fez a reserva?

Como identificar papel do usuário que está interagindo?

---
Conferência antes de aprovar (ou rode `/revisar-spec` no Claude Code):
- [ ] Todo critério vira um teste automático sem interpretação
- [ ] Há pelo menos um caso de erro e um caso de borda
- [ ] "Fora de escopo" tem pelo menos um item
- [ ] Nenhuma pergunta aberta bloqueia o primeiro critério
