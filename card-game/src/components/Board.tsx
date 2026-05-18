import { useState, useRef, useEffect, useCallback } from 'react';
import { GameConfig, GameState, CardInstance } from '../engine/types';
import { ZoneView } from './ZoneView';
import { CardView } from './CardView';

interface DragState {
  cards: CardInstance[];
  fromZoneId: string;
  fromIndex: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  cardOffsetX: number;
  cardOffsetY: number;
}

const CARD_W = 72;
const CASCADE_OFFSET_UP = 20;
const CASCADE_OFFSET_DOWN = 28;

interface Props {
  config: GameConfig;
}

export function Board({ config }: Props) {
  const [state, setState] = useState<GameState>(() => config.initialState());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [won, setWon] = useState(false);
  const zoneEls = useRef<Record<string, HTMLDivElement | null>>({});

  const zoneMap = Object.fromEntries(config.zones.map(z => [z.id, z]));

  function getZoneAtPoint(x: number, y: number): string | null {
    for (const [id, el] of Object.entries(zoneEls.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }

  function applyMove(
    currentState: GameState,
    fromZoneId: string,
    fromIndex: number,
    dragged: CardInstance[],
    toZoneId: string
  ): GameState | null {
    const toConfig = zoneMap[toZoneId];
    const fromConfig = zoneMap[fromZoneId];
    const onto = currentState.zones[toZoneId] ?? [];

    if (toZoneId === fromZoneId) return null;
    if (toConfig.canDrop && !toConfig.canDrop(dragged, onto, currentState)) return null;

    const sourceCards = currentState.zones[fromZoneId] ?? [];
    const remaining = sourceCards.slice(0, fromIndex);
    const updatedSource = fromConfig.onRemove
      ? fromConfig.onRemove(dragged, remaining)
      : remaining;

    const incoming = dragged.map(c => ({ ...c, faceUp: true }));
    const updatedTarget = toConfig.onReceive
      ? toConfig.onReceive(incoming, onto)
      : [...onto, ...incoming];

    return {
      zones: {
        ...currentState.zones,
        [fromZoneId]: updatedSource,
        [toZoneId]: updatedTarget,
      },
    };
  }

  const handleStartDrag = useCallback((
    cards: CardInstance[],
    fromZoneId: string,
    fromIndex: number,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const rect = (e.target as Element).getBoundingClientRect();
    setDrag({
      cards,
      fromZoneId,
      fromIndex,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      cardOffsetX: e.clientX - rect.left,
      cardOffsetY: e.clientY - rect.top,
    });
  }, []);

  const handleZoneClick = useCallback((zoneId: string) => {
    if (drag) return;
    const zoneConfig = zoneMap[zoneId];
    if (!zoneConfig.onClick) return;
    const updates = zoneConfig.onClick(state.zones[zoneId] ?? [], state);
    if (!updates) return;
    const newState: GameState = { zones: { ...state.zones, ...(updates as Record<string, CardInstance[]>) } };
    setState(newState);
    if (config.isWon?.(newState)) setWon(true);
  }, [drag, state, zoneMap, config]);

  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      setDrag(d => d ? { ...d, x: e.clientX, y: e.clientY } : null);
    }

    function onUp(e: PointerEvent) {
      setDrag(current => {
        if (!current) return null;
        const targetId = getZoneAtPoint(e.clientX, e.clientY);
        if (targetId) {
          const newState = applyMove(state, current.fromZoneId, current.fromIndex, current.cards, targetId);
          if (newState) {
            setState(newState);
            if (config.isWon?.(newState)) setWon(true);
          }
        }
        return null;
      });
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [drag, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragInstanceIds = new Set(drag?.cards.map(c => c.instanceId) ?? []);

  // Split zones into hand zones (pinned to bottom) and board zones
  const handZones = config.zones.filter(z => z.layout === 'hand');
  const boardZones = config.zones.filter(z => z.layout !== 'hand');

  // Determine drop target highlight
  const dropTargetId = drag ? getZoneAtPoint(drag.x, drag.y) : null;

  function renderDragOverlay() {
    if (!drag) return null;
    const { cards, x, y, cardOffsetX, cardOffsetY } = drag;

    return (
      <div className="drag-overlay" style={{ left: x - cardOffsetX, top: y - cardOffsetY }}>
        {cards.map((inst, i) => {
          const visual = inst.faceUp ? config.getCardVisual(config.cardDefs[inst.defId]) : null;
          let offset = 0;
          for (let j = 0; j < i; j++) {
            offset += cards[j].faceUp ? CASCADE_OFFSET_UP : CASCADE_OFFSET_DOWN;
          }
          return (
            <CardView
              key={inst.instanceId}
              instance={inst}
              visual={visual}
              isDragging
              style={{ position: 'absolute', top: offset, left: 0, zIndex: i }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="board-wrapper">
      {won && (
        <div className="win-banner">
          🎉 You won! <button onClick={() => { setState(config.initialState()); setWon(false); }}>Play again</button>
        </div>
      )}

      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${config.cols}, ${CARD_W}px)`,
        }}
      >
        {boardZones.map(zoneConfig => {
          const cards = state.zones[zoneConfig.id] ?? [];
          return (
            <div
              key={zoneConfig.id}
              style={{
                gridColumn: `${zoneConfig.col + 1} / span ${zoneConfig.colSpan ?? 1}`,
                gridRow: `${zoneConfig.row + 1} / span ${zoneConfig.rowSpan ?? 1}`,
              }}
            >
              <ZoneView
                config={zoneConfig}
                cards={cards}
                gameConfig={config}
                state={state}
                dragInstanceIds={dragInstanceIds}
                isDropTarget={dropTargetId === zoneConfig.id}
                onStartDrag={handleStartDrag}
                onZoneClick={handleZoneClick}
                zoneRef={el => { zoneEls.current[zoneConfig.id] = el; }}
              />
            </div>
          );
        })}
      </div>

      {handZones.length > 0 && (
        <div className="hand-area">
          {handZones.map(zoneConfig => {
            const cards = state.zones[zoneConfig.id] ?? [];
            return (
              <ZoneView
                key={zoneConfig.id}
                config={zoneConfig}
                cards={cards}
                gameConfig={config}
                state={state}
                dragInstanceIds={dragInstanceIds}
                isDropTarget={dropTargetId === zoneConfig.id}
                onStartDrag={handleStartDrag}
                onZoneClick={handleZoneClick}
                zoneRef={el => { zoneEls.current[zoneConfig.id] = el; }}
              />
            );
          })}
        </div>
      )}

      {renderDragOverlay()}
    </div>
  );
}
