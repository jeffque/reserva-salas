// Regras de reserva de salas (SPEC-001).
// Funções puras: recebem os dados e devolvem um resultado { status, reserva | erro }.
// Não leem relógio nem banco por conta própria, por isso são fáceis de testar.
import { salaExiste } from './salas.js';

const CAMPOS_OBRIGATORIOS = ['sala', 'inicio', 'fim', 'responsavel'];

export function conflitoDeHorario(pedido, reservas, maximo = 5) {
  const limite = Number.isInteger(maximo) && maximo >= 0 ? maximo : 5;
  const inicio = new Date(pedido.inicio);
  const fim = new Date(pedido.fim);

  return reservas
    .filter((reserva) => reserva.sala === pedido.sala)
    .filter((reserva) => reserva.status !== 'cancelada')
    .filter((reserva) => {
      const reservaInicio = new Date(reserva.inicio);
      const reservaFim = new Date(reserva.fim);
      return inicio < reservaFim && fim > reservaInicio;
    })
    .slice(0, limite);
}

export function temConflitoDeHorario(pedido, reservas) {
  return conflitoDeHorario(pedido, reservas, 1).length > 0;
}

export function cancelarReserva(reservas, id, justificativa, agora = new Date()) {
  if (typeof justificativa !== 'undefined' && justificativa !== null && typeof justificativa !== 'string') {
    return { status: 400, erro: 'Justificativa precisa ser texto' };
  }

  const reserva = reservas.find((item) => item.id === id);
  if (!reserva) return { status: 404, erro: 'Reserva não encontrada' };
  if (reserva.status === 'cancelada') {
    return { status: 409, erro: 'Reserva já está cancelada' };
  }
  if (agora >= new Date(reserva.fim)) {
    return { status: 409, erro: 'Reserva já terminou; não é possível cancelar' };
  }

  let texto = null;
  if (typeof justificativa === 'string') {
    const limpa = justificativa.trim();
    if (limpa) texto = limpa;
  }

  if (agora >= new Date(reserva.inicio) && texto === null) {
    return { status: 400, erro: 'Justificativa é obrigatória depois do início da reserva' };
  }

  reserva.status = 'cancelada';
  reserva.justificativa = texto;
  return { status: 204, reserva };
}

/**
 * Tenta criar uma reserva.
 * @param {Array} reservas  reservas que já existem
 * @param {object} pedido   { sala, inicio, fim, responsavel } com datas em ISO 8601
 * @param {Date} agora      momento atual (injetado para o teste controlar o tempo)
 */
export function criarReserva(reservas, pedido, agora = new Date()) {
  const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !pedido?.[campo]);
  if (faltando.length) return { status: 400, erro: `Campos obrigatórios: ${faltando.join(', ')}` };

  if (!salaExiste(pedido.sala)) return { status: 404, erro: `Sala não encontrada: ${pedido.sala}` };

  const inicio = new Date(pedido.inicio);
  const fim = new Date(pedido.fim);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return { status: 400, erro: 'Datas inválidas: use ISO 8601, ex.: 2026-12-01T14:00:00-03:00' };
  }
  if (fim <= inicio) return { status: 400, erro: 'O fim precisa ser depois do início' };
  if (inicio < agora) return { status: 400, erro: 'O início da reserva não pode estar no passado' };

  if (temConflitoDeHorario(pedido, reservas)) {
    return { status: 409, erro: 'Conflito de horário na sala' };
  }

  const reserva = {
    id: reservas.length + 1,
    sala: pedido.sala,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    responsavel: pedido.responsavel,
    status: 'ativa',
    justificativa: null,
  };
  return { status: 201, reserva };
}
