// Testes das regras de reserva. Cada teste cita o critério de aceite (CA) da SPEC que ele prova.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cancelarReserva,
  conflitoDeHorario,
  criarReserva,
  temConflitoDeHorario,
} from '../src/reservas.js';

const AGORA = new Date('2026-12-01T08:00:00-03:00');
const pedido = (extra = {}) => ({
  sala: 'lab-1',
  inicio: '2026-12-01T14:00:00-03:00',
  fim: '2026-12-01T16:00:00-03:00',
  responsavel: 'prof.ana',
  ...extra,
});

test('CA-1: sala livre é reservada', () => {
  const r = criarReserva([], pedido(), AGORA);
  assert.equal(r.status, 201);
  assert.equal(r.reserva.sala, 'lab-1');
  assert.equal(r.reserva.responsavel, 'prof.ana');
});

test('CA-1: reserva nova nasce ativa', () => {
  const r = criarReserva([], pedido(), AGORA);
  assert.equal(r.status, 201);
  assert.equal(r.reserva.status, 'ativa');
  assert.equal(r.reserva.justificativa, null);
});

test('CA-2: cancelar conforme horário e justificativa', () => {
  const reservaAtiva = () => criarReserva([], pedido(), AGORA).reserva;
  const casos = [
    ['2026-12-01T13:59:00-03:00', undefined, 204, null, null],
    ['2026-12-01T13:59:00-03:00', '  Aula cancelada  ', 204, 'Aula cancelada', null],
    ['2026-12-01T13:59:00-03:00', '   ', 204, null, null],
    ['2026-12-01T14:00:00-03:00', undefined, 400, null, /justificativa/i],
    ['2026-12-01T14:00:00-03:00', '   ', 400, null, /justificativa/i],
    ['2026-12-01T14:00:00-03:00', 'Aula cancelada', 204, 'Aula cancelada', null],
    ['2026-12-01T15:59:00-03:00', undefined, 400, null, /justificativa/i],
    ['2026-12-01T15:59:00-03:00', 'Aula cancelada', 204, 'Aula cancelada', null],
    ['2026-12-01T16:00:00-03:00', 'Aula cancelada', 409, null, /terminou/i],
    ['2026-12-01T16:00:00-03:00', undefined, 409, null, /terminou/i],
  ];

  for (const [momento, justificativa, status, justificativaEsperada, erroEsperado] of casos) {
    const reserva = reservaAtiva();
    const resultado = cancelarReserva([reserva], reserva.id, justificativa, new Date(momento));
    assert.equal(resultado.status, status);
    if (erroEsperado) assert.match(resultado.erro, erroEsperado);
    assert.equal(reserva.status, status === 204 ? 'cancelada' : 'ativa');
    assert.equal(reserva.justificativa, justificativaEsperada);
  }
});

test('campo obrigatório ausente devolve 400 dizendo qual falta', () => {
  const r = criarReserva([], pedido({ responsavel: '' }), AGORA);
  assert.equal(r.status, 400);
  assert.match(r.erro, /responsavel/);
});

test('sala inexistente devolve 404', () => {
  const r = criarReserva([], pedido({ sala: 'sala-que-nao-existe' }), AGORA);
  assert.equal(r.status, 404);
});

test('fim antes do início devolve 400', () => {
  const r = criarReserva([], pedido({ fim: '2026-12-01T13:00:00-03:00' }), AGORA);
  assert.equal(r.status, 400);
});

test('CA-3: início no passado devolve 400', () => {
  const r = criarReserva(
    [],
    pedido({ inicio: '2026-10-01T14:00:00-03:00', fim: '2026-10-01T16:00:00-03:00' }),
    AGORA,
  );
  assert.equal(r.status, 400);

  const noAgora = criarReserva(
    [],
    pedido({ inicio: '2026-12-01T08:00:00-03:00', fim: '2026-12-01T09:00:00-03:00' }),
    AGORA,
  );
  assert.equal(noAgora.status, 201);
});

test('CA-2: conflito na mesma sala devolve 409; horários encostados e outra sala não conflitam', () => {
  const existentes = [
    criarReserva(
      [],
      pedido(),
      AGORA,
    ).reserva,
  ];

  const sobreposto = criarReserva(
    existentes,
    pedido({
      inicio: '2026-12-01T15:00:00-03:00',
      fim: '2026-12-01T17:00:00-03:00',
      responsavel: 'prof.beatriz',
    }),
    AGORA,
  );
  assert.equal(sobreposto.status, 409);
  assert.match(sobreposto.erro, /conflito/i);

  const encostado = criarReserva(
    existentes,
    pedido({
      inicio: '2026-12-01T16:00:00-03:00',
      fim: '2026-12-01T18:00:00-03:00',
      responsavel: 'prof.beatriz',
    }),
    AGORA,
  );
  assert.equal(encostado.status, 201);

  const outraSala = criarReserva(
    existentes,
    pedido({
      sala: 'lab-2',
      responsavel: 'prof.beatriz',
    }),
    AGORA,
  );
  assert.equal(outraSala.status, 201);
});

test('conflitoDeHorario: sem conflitos devolve lista vazia', () => {
  const existentes = [pedido()];
  const conflitantes = conflitoDeHorario(pedido({
    inicio: '2026-12-01T16:00:00-03:00',
    fim: '2026-12-01T18:00:00-03:00',
  }), existentes);

  assert.deepEqual(conflitantes, []);
});

test('conflitoDeHorario: lista no máximo cinco conflitos por padrão', () => {
  const existentes = Array.from({ length: 7 }, (_, indice) => ({
    sala: 'lab-1',
    inicio: `2026-12-01T${String(14 + indice).padStart(2, '0')}:00:00-03:00`,
    fim: `2026-12-01T${String(15 + indice).padStart(2, '0')}:00:00-03:00`,
  }));

  const conflitantes = conflitoDeHorario(pedido({
    inicio: '2026-12-01T14:00:00-03:00',
    fim: '2026-12-01T22:00:00-03:00',
  }), existentes);

  assert.equal(conflitantes.length, 5);
});

test('conflitoDeHorario: aceita máximo parametrizável', () => {
  const existentes = [
    pedido(),
    pedido({
      inicio: '2026-12-01T14:30:00-03:00',
      fim: '2026-12-01T15:30:00-03:00',
    }),
  ];

  assert.equal(conflitoDeHorario(pedido({
    inicio: '2026-12-01T14:15:00-03:00',
    fim: '2026-12-01T15:45:00-03:00',
  }), existentes, 1).length, 1);
});

test('temConflitoDeHorario: devolve booleano', () => {
  const existentes = [pedido()];

  assert.equal(temConflitoDeHorario(pedido({
    inicio: '2026-12-01T15:00:00-03:00',
    fim: '2026-12-01T17:00:00-03:00',
  }), existentes), true);
  assert.equal(temConflitoDeHorario(pedido({
    inicio: '2026-12-01T16:00:00-03:00',
    fim: '2026-12-01T18:00:00-03:00',
  }), existentes), false);
});
