import { CardInstance, CardVisual } from '../engine/types';

interface Props {
  instance: CardInstance;
  visual: CardVisual | null; // null when face-down
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  isDragging?: boolean;
  isGhost?: boolean; // placeholder left behind while dragging
}

export function CardView({ instance, visual, style, onPointerDown, isDragging, isGhost }: Props) {
  const faceUp = instance.faceUp && visual;

  return (
    <div
      className={`card ${faceUp ? 'card--face-up' : 'card--face-down'} ${isDragging ? 'card--dragging' : ''} ${isGhost ? 'card--ghost' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      data-instance-id={instance.instanceId}
    >
      {faceUp ? (
        <>
          <span className={`card__corner card__corner--tl card__color--${visual.color}`}>
            <span className="card__rank">{visual.rankLabel}</span>
            <span className="card__suit-small">{visual.suitSymbol}</span>
          </span>
          <span className={`card__center card__color--${visual.color}`}>{visual.suitSymbol}</span>
          <span className={`card__corner card__corner--br card__color--${visual.color}`}>
            <span className="card__rank">{visual.rankLabel}</span>
            <span className="card__suit-small">{visual.suitSymbol}</span>
          </span>
        </>
      ) : (
        <div className="card__back" />
      )}
    </div>
  );
}
