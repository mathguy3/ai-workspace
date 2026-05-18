import { useEffect, useState } from 'react';
import { SpeedState, getRankLabel, getSuitSymbol, getCardColor } from '../games/speed';
import { subscribeRoom, playCard, voteSpeed } from '../multiplayer/room';

interface Props {
  roomCode: string;
  playerId: string;
  playerIndex: 0 | 1;
  initialState: SpeedState;
}

function SpeedCard({
  cardId, faceUp, selected, onClick, small,
}: {
  cardId: string; faceUp: boolean; selected?: boolean; onClick?: () => void; small?: boolean;
}) {
  if (!faceUp) return (
    <div className={`card card--face-down ${small ? 'card--small' : ''}`} onClick={onClick} />
  );
  const color = getCardColor(cardId);
  return (
    <div
      className={`card card--face-up ${small ? 'card--small' : ''} ${selected ? 'card--selected' : ''}`}
      onClick={onClick}
    >
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

export function SpeedBoard({ roomCode, playerId, playerIndex, initialState }: Props) {
  const [state, setState] = useState<SpeedState>(initialState);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const opp = (1 - playerIndex) as 0 | 1;
  const me = playerIndex;

  useEffect(() => {
    const unsub = subscribeRoom(roomCode, ({ gameState }) => {
      if (gameState) setState(gameState);
    });
    return unsub;
  }, [roomCode]);

  async function handleCenterClick(pile: 0 | 1) {
    if (!selected || busy || state.status !== 'playing') return;
    setBusy(true);
    try {
      await playCard(roomCode, playerId, selected, pile);
      setSelected(null);
    } catch { /* invalid move, ignore */ }
    setBusy(false);
  }

  async function handleSpeed() {
    if (busy || state.status !== 'playing') return;
    setBusy(true);
    await voteSpeed(roomCode, playerId);
    setBusy(false);
  }

  const myHand = state.hands[me];
  const oppHand = state.hands[opp];
  const myStock = state.stocks[me].length;
  const oppStock = state.stocks[opp].length;
  const myVote = state.speedVotes[me];
  const oppVote = state.speedVotes[opp];

  if (state.status === 'finished') {
    const iWon = state.winner === me;
    return (
      <div className="speed-result">
        <div className="speed-result__emoji">{iWon ? '🏆' : '😅'}</div>
        <div className="speed-result__text">{iWon ? 'You win!' : 'Opponent wins!'}</div>
      </div>
    );
  }

  return (
    <div className="speed-board">
      {/* Opponent area */}
      <div className="speed-player speed-player--opp">
        <div className="speed-stock">
          <div className="card card--face-down card--small" />
          <span className="speed-count">{oppStock}</span>
        </div>
        <div className="speed-hand">
          {oppHand.map((id, i) => (
            <SpeedCard key={i} cardId={id} faceUp={false} small />
          ))}
          {Array.from({ length: 5 - oppHand.length }).map((_, i) => (
            <div key={`empty-${i}`} className="card-placeholder" />
          ))}
        </div>
        {oppVote && <div className="speed-vote-indicator">SPEED!</div>}
      </div>

      {/* Center area */}
      <div className="speed-center">
        {[0, 1].map(pile => {
          const topCard = state.center[pile as 0|1].at(-1);
          return (
            <div
              key={pile}
              className={`speed-pile ${selected ? 'speed-pile--active' : ''}`}
              onClick={() => handleCenterClick(pile as 0|1)}
            >
              {topCard
                ? <SpeedCard cardId={topCard} faceUp />
                : <div className="zone__empty-slot" />}
            </div>
          );
        })}
      </div>

      {/* Speed button */}
      <div className="speed-actions">
        <button
          className={`speed-btn ${myVote ? 'speed-btn--voted' : ''}`}
          onClick={handleSpeed}
          disabled={busy}
        >
          {myVote ? 'Waiting…' : 'SPEED!'}
        </button>
      </div>

      {/* My area */}
      <div className="speed-player speed-player--me">
        <div className="speed-stock">
          <div className="card card--face-down card--small" />
          <span className="speed-count">{myStock}</span>
        </div>
        <div className="speed-hand">
          {myHand.map(id => (
            <SpeedCard
              key={id}
              cardId={id}
              faceUp
              selected={selected === id}
              onClick={() => setSelected(selected === id ? null : id)}
            />
          ))}
          {Array.from({ length: 5 - myHand.length }).map((_, i) => (
            <div key={`empty-${i}`} className="card-placeholder" />
          ))}
        </div>
      </div>

      {selected && (
        <div className="speed-hint">Tap a center pile to play {getRankLabel(selected)}{getSuitSymbol(selected)}</div>
      )}
    </div>
  );
}
