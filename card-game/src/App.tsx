import { useState } from 'react';
import { Board } from './components/Board';
import { Lobby } from './components/Lobby';
import { SpeedBoard } from './components/SpeedBoard';
import { solitaireConfig } from './games/solitaire';
import { GameRoom } from './multiplayer/peer-room';

type Screen =
  | { name: 'home' }
  | { name: 'solitaire' }
  | { name: 'speed-lobby' }
  | { name: 'speed-game'; room: GameRoom; playerIndex: 0 | 1 };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  function leaveGame() {
    if (screen.name === 'speed-game') screen.room.destroy();
    setScreen({ name: 'home' });
  }

  if (screen.name === 'solitaire') return (
    <div>
      <button className="nav-back" onClick={leaveGame}>← Menu</button>
      <Board config={solitaireConfig} />
    </div>
  );

  if (screen.name === 'speed-lobby') return (
    <Lobby
      onBack={() => setScreen({ name: 'home' })}
      onStart={(room, playerIndex) => setScreen({ name: 'speed-game', room, playerIndex })}
    />
  );

  if (screen.name === 'speed-game') return (
    <div>
      <button className="nav-back" onClick={leaveGame}>← Menu</button>
      <SpeedBoard room={screen.room} playerIndex={screen.playerIndex} />
    </div>
  );

  return (
    <div className="home">
      <h1 className="home-title">Card Games</h1>
      <div className="home-games">
        <button className="game-card" onClick={() => setScreen({ name: 'solitaire' })}>
          <span className="game-card__icon">🃏</span>
          <span className="game-card__name">Solitaire</span>
          <span className="game-card__desc">Classic Klondike, 1 player</span>
        </button>
        <button className="game-card" onClick={() => setScreen({ name: 'speed-lobby' })}>
          <span className="game-card__icon">⚡</span>
          <span className="game-card__name">Speed</span>
          <span className="game-card__desc">Real-time, 2 players</span>
        </button>
      </div>
    </div>
  );
}
