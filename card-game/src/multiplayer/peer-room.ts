import Peer, { DataConnection } from 'peerjs';
import { SpeedState, createInitialState, applyPlayCard, applySpeedFlip } from '../games/speed';

type Msg =
  | { type: 'hello'; guestId: string }
  | { type: 'state'; state: SpeedState }
  | { type: 'playCard'; cardId: string; centerPile: 0 | 1 }
  | { type: 'speedVote' };

export interface GameRoom {
  sendMove: (cardId: string, pile: 0 | 1) => void;
  voteSpeed: () => void;
  subscribe: (handler: (s: SpeedState) => void) => () => void;
  destroy: () => void;
}

export function getPlayerId(): string {
  let id = localStorage.getItem('speedPlayerId');
  if (!id) { id = Math.random().toString(36).slice(2, 12); localStorage.setItem('speedPlayerId', id); }
  return id;
}

export function generateRoomCode(): string {
  // PeerJS IDs must be URL-safe; prefix to avoid clashing with other Peer users
  return 'spd-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function displayCode(fullCode: string): string {
  return fullCode.replace('spd-', '');
}

export function hostRoom(
  roomCode: string,
  hostId: string,
  onGuestConnected: () => void,
  onError: (e: string) => void
): GameRoom {
  const peer = new Peer(roomCode);
  let conn: DataConnection | null = null;
  let gameState: SpeedState | null = null;
  const listeners = new Set<(s: SpeedState) => void>();

  function notify(s: SpeedState) {
    listeners.forEach(fn => fn(s));
  }

  function broadcast(msg: Msg) {
    conn?.send(msg);
    if (msg.type === 'state') notify(msg.state);
  }

  peer.on('error', e => onError(String(e)));

  peer.on('connection', c => {
    conn = c;
    c.on('data', (raw: unknown) => {
      const msg = raw as Msg;

      if (msg.type === 'hello') {
        gameState = createInitialState(hostId, msg.guestId);
        onGuestConnected();
        broadcast({ type: 'state', state: gameState });

      } else if (msg.type === 'playCard' && gameState) {
        const next = applyPlayCard(gameState, 1, msg.cardId, msg.centerPile);
        if (next) { gameState = next; broadcast({ type: 'state', state: gameState }); }

      } else if (msg.type === 'speedVote' && gameState) {
        const votes: [boolean, boolean] = [gameState.speedVotes[0], true];
        let next: SpeedState = { ...gameState, speedVotes: votes };
        if (votes[0] && votes[1]) next = applySpeedFlip(next);
        gameState = next;
        broadcast({ type: 'state', state: gameState });
      }
    });
  });

  return {
    sendMove(cardId, pile) {
      if (!gameState) return;
      const next = applyPlayCard(gameState, 0, cardId, pile);
      if (next) { gameState = next; broadcast({ type: 'state', state: gameState }); }
    },
    voteSpeed() {
      if (!gameState) return;
      const votes: [boolean, boolean] = [true, gameState.speedVotes[1]];
      let next: SpeedState = { ...gameState, speedVotes: votes };
      if (votes[0] && votes[1]) next = applySpeedFlip(next);
      gameState = next;
      broadcast({ type: 'state', state: gameState });
    },
    subscribe(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    destroy() { peer.destroy(); },
  };
}

export function joinRoom(
  roomCode: string,
  guestId: string,
  onConnected: () => void,
  onError: (e: string) => void
): GameRoom {
  const peer = new Peer();
  const conn = peer.connect(roomCode, { reliable: true });
  const listeners = new Set<(s: SpeedState) => void>();

  conn.on('open', () => {
    onConnected();
    conn.send({ type: 'hello', guestId } satisfies Msg);
  });

  conn.on('data', (raw: unknown) => {
    const msg = raw as Msg;
    if (msg.type === 'state') listeners.forEach(fn => fn(msg.state));
  });

  const handleError = (e: unknown) => onError(String(e));
  conn.on('error', handleError);
  peer.on('error', handleError);

  return {
    sendMove(cardId, pile) {
      conn.send({ type: 'playCard', cardId, centerPile: pile } satisfies Msg);
    },
    voteSpeed() {
      conn.send({ type: 'speedVote' } satisfies Msg);
    },
    subscribe(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    destroy() { peer.destroy(); },
  };
}
