import { doc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { SpeedState, createInitialState, applyPlayCard, applySpeedFlip } from '../games/speed';

export function getPlayerId(): string {
  let id = localStorage.getItem('speedPlayerId');
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    localStorage.setItem('speedPlayerId', id);
  }
  return id;
}

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function createRoom(roomCode: string, hostId: string): Promise<void> {
  await setDoc(doc(db, 'rooms', roomCode), {
    hostId,
    status: 'waiting',
    playerIds: [hostId, null],
    gameState: null,
  });
}

export async function joinRoom(roomCode: string, guestId: string): Promise<void> {
  await runTransaction(db, async tx => {
    const ref = doc(db, 'rooms', roomCode);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found');
    const data = snap.data();
    if (data.status !== 'waiting') throw new Error('Game already in progress');
    if (data.playerIds[1] !== null) throw new Error('Room is full');
    const gameState = createInitialState(data.playerIds[0], guestId);
    tx.update(ref, { status: 'playing', playerIds: [data.playerIds[0], guestId], gameState });
  });
}

export function subscribeRoom(
  roomCode: string,
  cb: (data: { status: string; playerIds: [string, string | null]; gameState: SpeedState | null }) => void
) {
  return onSnapshot(doc(db, 'rooms', roomCode), snap => {
    if (!snap.exists()) return;
    const d = snap.data();
    cb({ status: d.status, playerIds: d.playerIds, gameState: d.gameState ?? null });
  });
}

export async function playCard(
  roomCode: string,
  playerId: string,
  cardId: string,
  centerPile: 0 | 1
): Promise<void> {
  await runTransaction(db, async tx => {
    const ref = doc(db, 'rooms', roomCode);
    const snap = await tx.get(ref);
    const state = snap.data()!.gameState as SpeedState;
    const idxRaw = state.playerIds.indexOf(playerId);
    if (idxRaw === -1) return;
    const idx = idxRaw as 0 | 1;
    const next = applyPlayCard(state, idx, cardId, centerPile);
    if (!next) throw new Error('Invalid move');
    tx.update(ref, { gameState: next });
  });
}

export async function voteSpeed(roomCode: string, playerId: string): Promise<void> {
  await runTransaction(db, async tx => {
    const ref = doc(db, 'rooms', roomCode);
    const snap = await tx.get(ref);
    const state = snap.data()!.gameState as SpeedState;
    const idxRaw = state.playerIds.indexOf(playerId);
    if (idxRaw === -1) return;
    const idx = idxRaw as 0 | 1;

    const votes: [boolean, boolean] = [state.speedVotes[0], state.speedVotes[1]];
    votes[idx] = true;
    const next = votes[0] && votes[1]
      ? applySpeedFlip({ ...state, speedVotes: votes })
      : { ...state, speedVotes: votes };
    tx.update(ref, { gameState: next });
  });
}
