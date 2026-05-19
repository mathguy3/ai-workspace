import { useEffect, useState } from 'react';
import { SpeedState, getRankLabel, getSuitSymbol, getCardColor } from '../games/speed';
import { GameRoom } from '../multiplayer/peer-room';

function SpeedCard({ cardId, faceUp, selected, onClick }: {
  cardId: string; faceUp: boolean; selected?: boolean; onClick?: () => void;
}) {
  if (!faceUp) return <div className="card card--face-down card--small" onClick={onClick} />;
  const color = getCardColor(cardId);
  return (
    <div className={`card card--face-up card--small ${selected ? 'card--selected' : ''}`} onClick={onClick}>
      <span className={`card__corner card__corner--tl card__color--${color}`}>
        <span className="card__rank">{getRankLabel(cardId)}</span>
        <span className="card__suit-small">{getSuitSymbol(cardId)}</span>
      </span>
      <span className={`card__center card__color--${color}`}>{getSuitSymbol(cardId)}</span>
      <span className={`card__corner card__corner--br card__color--${color}`}>
        <span className="card__rank">{getRankLabel(cardId)}</span>
        <span className="card__suit-small">{getSuitSymbol(cardId)}</span>
      </span>
    </div>
  );
}

interface Props {
  room: GameRoom;
  playerIndex: 0 | 1;
}

export function SpeedBoard({ room, playerIndex }: Props) {
  const [state, setState] = useState<SpeedState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const me = playerIndex;
  const opp = (1 - playerIndex) as 0 | 1;

  useEffect(() => {
    return room.subscribe(setState);
  }, [room]);

  function handleCardClick(cardId: string) {
    setSelected(prev => prev === cardId ? null : cardId);
  }

  function handlePileClick(pile: 0 | 1) {
    if (!selected || !state) return;
    room.sendMove(selected, pile);
    setSelected(null);
  }

  function handleSpeed() {
    room.voteSpeed();
  }

  if (!state) return (
    <div className="lobby">
      <p style={{ color: 'rgba(255,255,255,0.7)' }}>Connecting…</p>
    </div>
  );

  if (state.status === 'finished') {
    const iWon = state.winner === me;
    return (
      <div className="speed-result">
        <div className="speed-result__emoji">{iWon ? '🏆' : '😅'}</div>
        <div className="speed-result__text">{iWon ? 'You win!' : 'Opponent wins!'}</div>
      </div>
    );
  }

  const myHand = state.hands[me];
  const oppHand = state.hands[opp];
  const myVote = state.speedVotes[me];
  const oppVote = state.speedVotes[opp];

  return (
    <div className="speed-board">
      {/* Opponent */}
      <div className="speed-player speed-player--opp">
        <div className="speed-stock">
          <div className="card card--face-down card--small" />
          <span className="speed-count">{state.stocks[opp].length}</span>
        </div>
        <div className="speed-hand">
          {oppHand.map((id, i) => <SpeedCard key={i} cardId={id} faceUp={false} />)}
          {Array.from({ length: 5 - oppHand.length }).map((_, i) => <div key={i} className="card-placeholder" />)}
        </div>
        {oppVote && <div className="speed-vote-indicator">SPEED!</div>}
      </div>

      {/* Center piles */}
      <div className="speed-center">
        {([0, 1] as const).map(pile => {
          const top = state.center[pile].at(-1);
          return (
            <div key={pile} className={`speed-pile ${selected ? 'speed-pile--active' : ''}`}
              onClick={() => handlePileClick(pile)}>
              {top
                ? <SpeedCard cardId={top} faceUp />
                : <div className="zone__empty-slot" style={{ width: 72, height: 100 }} />}
            </div>
          );
        })}
      </div>

      {/* Speed button */}
      <div className="speed-actions">
        <button className={`speed-btn ${myVote ? 'speed-btn--voted' : ''}`} onClick={handleSpeed}>
          {myVote ? 'Waiting…' : 'SPEED!'}
        </button>
      </div>

      {/* My hand */}
      <div className="speed-player speed-player--me">
        <div className="speed-stock">
          <div className="card card--face-down card--small" />
          <span className="speed-count">{state.stocks[me].length}</span>
        </div>
        <div className="speed-hand">
          {myHand.map(id => (
            <SpeedCard key={id} cardId={id} faceUp selected={selected === id} onClick={() => handleCardClick(id)} />
          ))}
          {Array.from({ length: 5 - myHand.length }).map((_, i) => <div key={i} className="card-placeholder" />)}
        </div>
      </div>

      {selected && (
        <div className="speed-hint">
          Tap a center pile to play {getRankLabel(selected)}{getSuitSymbol(selected)}
        </div>
      )}
    </div>
  );
}
