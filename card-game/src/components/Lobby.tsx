import { useState } from 'react';
import { hostRoom, joinRoom, generateRoomCode, displayCode, getPlayerId, GameRoom } from '../multiplayer/peer-room';

interface Props {
  onStart: (room: GameRoom, playerIndex: 0 | 1) => void;
  onBack: () => void;
}

export function Lobby({ onStart, onBack }: Props) {
  const [phase, setPhase] = useState<'home' | 'waiting' | 'joining'>('home');
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');

  function handleCreate() {
    const fullCode = generateRoomCode();
    setCode(displayCode(fullCode));
    setPhase('waiting');
    setError('');

    // roomRef allows the callback to reference `room` before it's used
    let room: GameRoom;
    room = hostRoom(
      fullCode,
      getPlayerId(),
      () => onStart(room, 0),
      e => { setError(e); setPhase('home'); }
    );
  }

  function handleJoin() {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed.length < 4) return;
    setError('');
    setPhase('joining');

    const fullCode = 'spd-' + trimmed;
    const room = joinRoom(
      fullCode,
      getPlayerId(),
      () => { /* connected — waiting for host to send state */ },
      e => { setError(e); setPhase('home'); }
    );

    // Transition to game on first state received from host
    const unsub = room.subscribe(() => {
      unsub();
      onStart(room, 1);
    });
  }

  if (phase === 'waiting') return (
    <div className="lobby">
      <h2>Waiting for opponent…</h2>
      <div className="room-code">{code}</div>
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
          {phase === 'joining' ? 'Joining…' : 'Join'}
        </button>
      </div>
      {error && <p className="lobby-error">{error}</p>}
    </div>
  );
}
