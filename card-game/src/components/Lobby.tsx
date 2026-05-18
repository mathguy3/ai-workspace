import { useState } from 'react';
import { createRoom, joinRoom, subscribeRoom, generateRoomCode, getPlayerId } from '../multiplayer/room';
import { SpeedState } from '../games/speed';

interface Props {
  onStart: (roomCode: string, playerIndex: 0 | 1, state: SpeedState) => void;
  onBack: () => void;
}

export function Lobby({ onStart, onBack }: Props) {
  const [phase, setPhase] = useState<'home' | 'waiting' | 'joining'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const playerId = getPlayerId();

  async function handleCreate() {
    const code = generateRoomCode();
    setRoomCode(code);
    setPhase('waiting');
    await createRoom(code, playerId);
    subscribeRoom(code, ({ gameState, playerIds }) => {
      if (gameState && playerIds[1]) onStart(code, 0, gameState);
    });
  }

  async function handleJoin() {
    const code = inputCode.trim().toUpperCase();
    if (code.length < 4) return;
    setError('');
    setPhase('joining');
    try {
      await joinRoom(code, playerId);
      subscribeRoom(code, ({ gameState }) => {
        if (gameState) onStart(code, 1, gameState);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join');
      setPhase('home');
    }
  }

  if (phase === 'waiting') return (
    <div className="lobby">
      <h2>Waiting for opponent…</h2>
      <div className="room-code">{roomCode}</div>
      <p className="lobby-hint">Share this code with your friend</p>
    </div>
  );

  return (
    <div className="lobby">
      <button className="lobby-back" onClick={onBack}>← Back</button>
      <h1 className="lobby-title">Speed</h1>
      <button className="lobby-btn lobby-btn--primary" onClick={handleCreate}>
        New Game
      </button>
      <div className="lobby-divider">or join existing</div>
      <div className="lobby-join">
        <input
          value={inputCode}
          onChange={e => setInputCode(e.target.value.toUpperCase())}
          placeholder="Room code"
          maxLength={6}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button className="lobby-btn" onClick={handleJoin} disabled={phase === 'joining'}>
          Join
        </button>
      </div>
      {error && <p className="lobby-error">{error}</p>}
    </div>
  );
}
