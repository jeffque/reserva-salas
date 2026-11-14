---
name: mensagem-de-erro
description: Como escrever mensagem de erro nesta API (diz o que aconteceu e o que fazer). Use sempre que for criar ou alterar um erro devolvido ao cliente.
---
# Escrever mensagem de erro no padrão do projeto

Quem lê a mensagem é quem chama a API: o front-end ou um colega testando no curl. Toda mensagem responde duas perguntas: **o que aconteceu** e **o que fazer agora**.

## Regras
- Formato: `<o que aconteceu>: <valor recebido>. <o que fazer>.` Ex.: `Sala não encontrada: lab-9. Consulte as salas em GET /salas.`
- **O que aconteceu** cita o campo ou o valor que causou o erro, do jeito que veio no pedido (`lab-9`, `responsavel`), para o cliente achar o problema sem adivinhar.
- **O que fazer** é uma ação que o cliente consegue executar: o formato certo com exemplo, o campo que falta enviar, a rota que deve consultar.
- Português, frase curta, falando do pedido do cliente. Detalhe interno (stack, `e.message`, nome de função) fica fora da resposta.
- A mensagem de regra de negócio nasce em `src/reservas.js`, no retorno `{ status, erro }`. `src/app.js` só repassa `{ erro: resultado.erro }`; lá ficam apenas os erros de HTTP (rota inexistente, JSON inválido).
- O status vem da SPEC (400 pedido inválido, 404 não existe, 409 conflito). Quando a SPEC disser o que a mensagem deve conter (ex.: SPEC-002, "reservas após o começo exigem justificativa"), a SPEC manda e estas regras completam.

## Modelo
```js
// src/reservas.js
if (!salaExiste(pedido.sala)) {
  return { status: 404, erro: `Sala não encontrada: ${pedido.sala}. Consulte as salas em GET /salas.` };
}
```

```js
// test/reservas.test.js: teste o status e as duas partes da mensagem, não a frase inteira
test('CA-n: sala inexistente devolve 404', () => {
  const r = criarReserva([], { sala: 'lab-9', inicio: '…', fim: '…', responsavel: 'prof.ana' }, AGORA);
  assert.equal(r.status, 404);
  assert.match(r.erro, /lab-9/);       // o que aconteceu
  assert.match(r.erro, /GET \/salas/); // o que fazer
});
```

## Antes de entregar
1. Em cada mensagem nova ou alterada, aponte as duas partes: o que aconteceu (com o valor) e o que fazer.
2. Cada erro novo tem teste com `assert.match` nas duas partes (siga a skill `escrever-teste`).
3. Se mudar o texto de uma mensagem que já existe quebrar um teste, pare e pergunte: o teste não muda para passar.
4. Rode `npm test` inteiro.
