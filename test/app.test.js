// Teste de ponta a ponta da API: sobe o servidor numa porta livre e faz requisições de verdade.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { criarApp } from '../src/app.js';

let servidor;
let base;

before(async () => {
  servidor = createServer(criarApp({ agora: () => new Date('2026-12-01T08:00:00-03:00') }));
  await new Promise((ok) => servidor.listen(0, ok));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => servidor.close());

test('GET /salas lista as salas', async () => {
  const resp = await fetch(`${base}/salas`);
  assert.equal(resp.status, 200);
  const salas = await resp.json();
  assert.ok(salas.length >= 1);
});

test('POST /reservas cria e GET /reservas mostra a reserva', async () => {
  const criar = await fetch(`${base}/reservas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sala: 'auditorio', inicio: '2026-12-02T09:00:00-03:00', fim: '2026-12-02T11:00:00-03:00', responsavel: 'prof.bruno' }),
  });
  assert.equal(criar.status, 201);
  const lista = await (await fetch(`${base}/reservas`)).json();
  assert.ok(lista.some((r) => r.responsavel === 'prof.bruno'));
});

test('CA-2: POST /reservas devolve 409 para horário sobreposto na mesma sala', async () => {
  const reservar = (pedido) => fetch(`${base}/reservas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(pedido),
  });
  const existente = {
    sala: 'lab-1',
    inicio: '2026-12-01T14:00:00-03:00',
    fim: '2026-12-01T16:00:00-03:00',
    responsavel: 'prof.ana',
  };

  assert.equal((await reservar(existente)).status, 201);

  const conflito = await reservar({
    ...existente,
    inicio: '2026-12-01T15:00:00-03:00',
    fim: '2026-12-01T17:00:00-03:00',
    responsavel: 'prof.beatriz',
  });
  assert.equal(conflito.status, 409);
  assert.match((await conflito.json()).erro, /conflito/i);

  const encostada = await reservar({
    ...existente,
    inicio: '2026-12-01T16:00:00-03:00',
    fim: '2026-12-01T18:00:00-03:00',
    responsavel: 'prof.carlos',
  });
  assert.equal(encostada.status, 201);

  const outraSala = await reservar({
    ...existente,
    sala: 'lab-2',
    inicio: '2026-12-01T15:00:00-03:00',
    fim: '2026-12-01T17:00:00-03:00',
    responsavel: 'prof.daniela',
  });
  assert.equal(outraSala.status, 201);
});

test('JSON inválido devolve 400', async () => {
  const resp = await fetch(`${base}/reservas`, { method: 'POST', body: '{isso não é json' });
  assert.equal(resp.status, 400);
});

test('CA-3: reserva inexistente devolve 404 sem mudar a lista', async () => {
  const servidorLocal = createServer(criarApp({
    agora: () => new Date('2026-12-01T13:59:00-03:00'),
  }));
  await new Promise((ok) => servidorLocal.listen(0, ok));
  const baseLocal = `http://localhost:${servidorLocal.address().port}`;

  try {
    const criar = await fetch(`${baseLocal}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sala: 'lab-1',
        inicio: '2026-12-01T14:00:00-03:00',
        fim: '2026-12-01T16:00:00-03:00',
        responsavel: 'prof.ana',
      }),
    });
    assert.equal(criar.status, 201);
    const antes = await (await fetch(`${baseLocal}/reservas`)).json();

    for (const id of ['999', 'abc']) {
      const cancelar = await fetch(`${baseLocal}/reservas/${id}/cancelamento`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(cancelar.status, 404);
      assert.match((await cancelar.json()).erro, /reserva/i);
    }

    const comZeros = await fetch(`${baseLocal}/reservas/001/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(comZeros.status, 204);
    const depois = await (await fetch(`${baseLocal}/reservas`)).json();
    assert.equal(depois.length, antes.length);
  } finally {
    await new Promise((ok) => servidorLocal.close(ok));
  }
});

test('CA-4: reserva já cancelada devolve 409 e mantém o estado', async () => {
  let agora = new Date('2026-12-01T13:59:00-03:00');
  const servidorLocal = createServer(criarApp({
    agora: () => agora,
  }));
  await new Promise((ok) => servidorLocal.listen(0, ok));
  const baseLocal = `http://localhost:${servidorLocal.address().port}`;

  try {
    await fetch(`${baseLocal}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sala: 'lab-1',
        inicio: '2026-12-01T14:00:00-03:00',
        fim: '2026-12-01T16:00:00-03:00',
        responsavel: 'prof.ana',
      }),
    });

    const primeira = await fetch(`${baseLocal}/reservas/1/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(primeira.status, 204);
    assert.equal(await primeira.text(), '');

    agora = new Date('2026-12-01T13:59:00-03:00');
    const segunda = await fetch(`${baseLocal}/reservas/1/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(segunda.status, 409);
    assert.match((await segunda.json()).erro, /cancelada/i);

    agora = new Date('2026-12-01T16:00:00-03:00');
    const terceira = await fetch(`${baseLocal}/reservas/1/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ justificativa: 'Aula cancelada' }),
    });
    assert.equal(terceira.status, 409);
    assert.match((await terceira.json()).erro, /cancelada/i);

    const lista = await (await fetch(`${baseLocal}/reservas`)).json();
    assert.equal(lista[0].status, 'cancelada');
    assert.equal(lista[0].justificativa, null);
  } finally {
    await new Promise((ok) => servidorLocal.close(ok));
  }
});

test('CA-5: justificativa não textual e corpos malformados devolvem 400', async () => {
  const servidorLocal = createServer(criarApp({
    agora: () => new Date('2026-12-01T13:59:00-03:00'),
  }));
  await new Promise((ok) => servidorLocal.listen(0, ok));
  const baseLocal = `http://localhost:${servidorLocal.address().port}`;

  try {
    await fetch(`${baseLocal}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sala: 'lab-1',
        inicio: '2026-12-01T14:00:00-03:00',
        fim: '2026-12-01T16:00:00-03:00',
        responsavel: 'prof.ana',
      }),
    });

    const corpos = [
      JSON.stringify({ justificativa: 123 }),
      'null',
      '[]',
      '123',
      '"texto"',
      '{isso não é json',
    ];
    for (const corpo of corpos) {
      const cancelar = await fetch(`${baseLocal}/reservas/1/cancelamento`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: corpo,
      });
      assert.equal(cancelar.status, 400);
      const textoErro = (await cancelar.json()).erro;
      if (corpo === JSON.stringify({ justificativa: 123 })) assert.match(textoErro, /texto/i);
    }

    const lista = await (await fetch(`${baseLocal}/reservas`)).json();
    assert.equal(lista[0].status, 'ativa');
  } finally {
    await new Promise((ok) => servidorLocal.close(ok));
  }
});

test('CA-6: reserva cancelada libera o horário', async () => {
  let agora = new Date('2026-12-01T13:59:00-03:00');
  const servidorLocal = createServer(criarApp({ agora: () => agora }));
  await new Promise((ok) => servidorLocal.listen(0, ok));
  const baseLocal = `http://localhost:${servidorLocal.address().port}`;

  try {
    const reserva = {
      sala: 'lab-1',
      inicio: '2026-12-01T14:00:00-03:00',
      fim: '2026-12-01T16:00:00-03:00',
      responsavel: 'prof.ana',
    };
    assert.equal((await fetch(`${baseLocal}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(reserva),
    })).status, 201);

    const controle = await fetch(`${baseLocal}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...reserva, responsavel: 'prof.beatriz' }),
    });
    assert.equal(controle.status, 409);

    const cancelar = await fetch(`${baseLocal}/reservas/1/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(cancelar.status, 204);

    const nova = await fetch(`${baseLocal}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...reserva, responsavel: 'prof.beatriz' }),
    });
    assert.equal(nova.status, 201);
  } finally {
    await new Promise((ok) => servidorLocal.close(ok));
  }
});
