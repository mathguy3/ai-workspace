import { CardInstance, ZoneConfig, GameConfig, GameState } from '../engine/types';
import { CardView } from './CardView';

const CARD_W = 72;
const CARD_H = 100;
const CASCADE_OFFSET_DOWN = 28;   // face-down card offset
const CASCADE_OFFSET_UP = 20;     // face-up card offset (slightly more to show rank)
const SPREAD_OVERLAP = 30;        // horizontal spread overlap

interface Props {
  config: ZoneConfig;
  cards: CardInstance[];
  gameConfig: GameConfig;
  state: GameState;
  dragInstanceIds: Set<string>;
  isDropTarget: boolean;
  onStartDrag: (cards: CardInstance[], fromZoneId: string, fromIndex: number, e: React.PointerEvent) => void;
  onZoneClick: (zoneId: string) => void;
  zoneRef: (el: HTMLDivElement | null) => void;
}

export function ZoneView({
  config, cards, gameConfig, dragInstanceIds,
  isDropTarget, onStartDrag, onZoneClick, zoneRef,
}: Props) {
  const { layout } = config;

  function getVisual(inst: CardInstance) {
    if (!inst.faceUp) return null;
    return gameConfig.getCardVisual(gameConfig.cardDefs[inst.defId]);
  }

  function handleCardPointerDown(e: React.PointerEvent, index: number) {
    e.stopPropagation();
    const canDrag = config.canDrag ?? (() => true);
    if (!canDrag(cards[index], index, cards)) return;
    const toDrag = cards.slice(index);
    onStartDrag(toDrag, config.id, index, e);
  }

  const isEmpty = cards.length === 0;

  if (layout === 'stack') {
    const topCard = cards[cards.length - 1];
    const isGhost = topCard && dragInstanceIds.has(topCard.instanceId);

    return (
      <div
        ref={zoneRef}
        className={`zone zone--stack ${isDropTarget ? 'zone--drop-target' : ''} ${isEmpty ? 'zone--empty' : ''}`}
        style={{ width: CARD_W, height: CARD_H }}
        onClick={() => onZoneClick(config.id)}
      >
        {config.label && isEmpty && (
          <span className="zone__label">{config.label}</span>
        )}
        {topCard && (
          <CardView
            instance={topCard}
            visual={getVisual(topCard)}
            isGhost={isGhost}
            onPointerDown={e => handleCardPointerDown(e, cards.length - 1)}
          />
        )}
      </div>
    );
  }

  if (layout === 'cascade') {
    // Calculate total height needed
    let totalHeight = CARD_H;
    for (let i = 0; i < cards.length - 1; i++) {
      totalHeight += cards[i].faceUp ? CASCADE_OFFSET_UP : CASCADE_OFFSET_DOWN;
    }

    return (
      <div
        ref={zoneRef}
        className={`zone zone--cascade ${isDropTarget ? 'zone--drop-target' : ''} ${isEmpty ? 'zone--empty' : ''}`}
        style={{ width: CARD_W, height: Math.max(CARD_H, totalHeight), position: 'relative' }}
      >
        {isEmpty && <div className="zone__empty-slot" style={{ width: CARD_W, height: CARD_H }} />}
        {cards.map((inst, i) => {
          let yOffset = 0;
          for (let j = 0; j < i; j++) {
            yOffset += cards[j].faceUp ? CASCADE_OFFSET_UP : CASCADE_OFFSET_DOWN;
          }
          const isGhost = dragInstanceIds.has(inst.instanceId);
          return (
            <CardView
              key={inst.instanceId}
              instance={inst}
              visual={getVisual(inst)}
              isGhost={isGhost}
              style={{ position: 'absolute', top: yOffset, left: 0, zIndex: i }}
              onPointerDown={e => handleCardPointerDown(e, i)}
            />
          );
        })}
      </div>
    );
  }

  if (layout === 'spread') {
    const totalWidth = isEmpty ? CARD_W : CARD_W + (cards.length - 1) * (CARD_W - SPREAD_OVERLAP);

    return (
      <div
        ref={zoneRef}
        className={`zone zone--spread ${isDropTarget ? 'zone--drop-target' : ''} ${isEmpty ? 'zone--empty' : ''}`}
        style={{ width: Math.max(CARD_W, totalWidth), height: CARD_H, position: 'relative' }}
      >
        {isEmpty && <div className="zone__empty-slot" style={{ width: CARD_W, height: CARD_H }} />}
        {cards.map((inst, i) => {
          const isGhost = dragInstanceIds.has(inst.instanceId);
          return (
            <CardView
              key={inst.instanceId}
              instance={inst}
              visual={getVisual(inst)}
              isGhost={isGhost}
              style={{ position: 'absolute', left: i * (CARD_W - SPREAD_OVERLAP), top: 0, zIndex: i }}
              onPointerDown={e => handleCardPointerDown(e, i)}
            />
          );
        })}
      </div>
    );
  }

  if (layout === 'hand') {
    // Full-width spread, centered, displayed at the bottom
    const overlapFactor = Math.max(20, CARD_W - Math.floor(600 / Math.max(cards.length, 1)));
    const totalWidth = isEmpty ? CARD_W : CARD_W + (cards.length - 1) * (CARD_W - overlapFactor);

    return (
      <div
        ref={zoneRef}
        className={`zone zone--hand ${isDropTarget ? 'zone--drop-target' : ''}`}
        style={{ position: 'relative', height: CARD_H, width: '100%' }}
      >
        <div style={{ position: 'relative', width: totalWidth, height: CARD_H, margin: '0 auto' }}>
          {cards.map((inst, i) => {
            const isGhost = dragInstanceIds.has(inst.instanceId);
            return (
              <CardView
                key={inst.instanceId}
                instance={inst}
                visual={getVisual(inst)}
                isGhost={isGhost}
                style={{ position: 'absolute', left: i * (CARD_W - overlapFactor), top: 0, zIndex: i }}
                onPointerDown={e => handleCardPointerDown(e, i)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
