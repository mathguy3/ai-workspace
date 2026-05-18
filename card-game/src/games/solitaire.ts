import { GameConfig, CardDef, CardInstance, GameState, CardVisual } from '../engine/types';

interface PlayingCard extends CardDef {
  rank: number; // 1–13
  suit: 'S' | 'H' | 'D' | 'C';
}

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

function cardColor(suit: string): 'red' | 'black' {
  return suit === 'H' || suit === 'D' ? 'red' : 'black';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _nextId = 0;
function newInstance(defId: string, faceUp: boolean): CardInstance {
  return { instanceId: `i${_nextId++}`, defId, faceUp };
}

function createSolitaireConfig(): GameConfig {
  // Build card definitions
  const cardDefs: Record<string, CardDef> = {};
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      const id = `${suit}${rank}`;
      cardDefs[id] = { id, rank, suit } satisfies PlayingCard;
    }
  }

  function def(inst: CardInstance): PlayingCard {
    return cardDefs[inst.defId] as PlayingCard;
  }
  function rank(inst: CardInstance) { return def(inst).rank; }
  function suit(inst: CardInstance) { return def(inst).suit; }
  function color(inst: CardInstance) { return cardColor(def(inst).suit); }
  function top(zone: CardInstance[]) { return zone[zone.length - 1]; }

  // Flip the new top card face-up when cards leave a cascade pile
  function flipNewTop(remaining: CardInstance[]): CardInstance[] {
    if (remaining.length === 0) return remaining;
    const last = remaining[remaining.length - 1];
    if (last.faceUp) return remaining;
    return [...remaining.slice(0, -1), { ...last, faceUp: true }];
  }

  const tableauZones = Array.from({ length: 7 }, (_, i) => ({
    id: `tableau-${i}`,
    label: '',
    layout: 'cascade' as const,
    col: i,
    row: 1,
    rowSpan: 5,
    canDrag: (_card: CardInstance, index: number, zone: CardInstance[]) => {
      // Can drag any face-up card (and the sequence below it)
      return zone[index]?.faceUp ?? false;
    },
    canDrop: (dragged: CardInstance[], onto: CardInstance[]) => {
      const card = dragged[0];
      if (onto.length === 0) return rank(card) === 13; // only Kings on empty
      const target = top(onto);
      if (!target.faceUp) return false;
      return color(card) !== color(target) && rank(card) === rank(target) - 1;
    },
    onRemove: (_removed: CardInstance[], remaining: CardInstance[]) => flipNewTop(remaining),
  }));

  const foundationZones = SUITS.map((s, i) => ({
    id: `foundation-${s}`,
    label: SUIT_SYMBOLS[s],
    layout: 'stack' as const,
    col: 3 + i,
    row: 0,
    canDrag: (_card: CardInstance, index: number, zone: CardInstance[]) => {
      // Can move foundation cards back (helpful for unblocking)
      return index === zone.length - 1;
    },
    canDrop: (dragged: CardInstance[], onto: CardInstance[]) => {
      if (dragged.length !== 1) return false;
      const card = dragged[0];
      if (suit(card) !== s) return false;
      if (onto.length === 0) return rank(card) === 1;
      return rank(card) === rank(top(onto)) + 1;
    },
  }));

  const stockZone = {
    id: 'stock',
    label: '🂠',
    layout: 'stack' as const,
    col: 0,
    row: 0,
    canDrag: () => false, // stock is click-only
    canDrop: () => false,
    onClick: (zone: CardInstance[], state: GameState): Partial<Record<string, CardInstance[]>> | null => {
      const waste = state.zones['waste'] ?? [];
      if (zone.length > 0) {
        // Draw top card to waste, face-up
        const drawn = { ...zone[zone.length - 1], faceUp: true };
        return {
          stock: zone.slice(0, -1),
          waste: [...waste, drawn],
        };
      } else if (waste.length > 0) {
        // Reset: flip waste back to stock, face-down
        return {
          stock: [...waste].reverse().map(c => ({ ...c, faceUp: false })),
          waste: [],
        };
      }
      return null;
    },
  };

  const wasteZone = {
    id: 'waste',
    label: '',
    layout: 'spread' as const,
    col: 1,
    row: 0,
    canDrag: (_card: CardInstance, index: number, zone: CardInstance[]) => {
      return index === zone.length - 1; // only top card
    },
    canDrop: () => false,
    onRemove: (_removed: CardInstance[], remaining: CardInstance[]) => remaining,
  };

  function initialState(): GameState {
    const deck = shuffle(Object.keys(cardDefs));
    let cursor = 0;
    const zones: Record<string, CardInstance[]> = {};

    // Deal tableau
    for (let col = 0; col < 7; col++) {
      const cards: CardInstance[] = [];
      for (let j = 0; j <= col; j++) {
        cards.push(newInstance(deck[cursor++], j === col));
      }
      zones[`tableau-${col}`] = cards;
    }

    // Remaining cards to stock, face-down
    zones['stock'] = deck.slice(cursor).map(id => newInstance(id, false));
    zones['waste'] = [];
    for (const s of SUITS) zones[`foundation-${s}`] = [];

    return { zones };
  }

  function isWon(state: GameState): boolean {
    return SUITS.every(s => (state.zones[`foundation-${s}`]?.length ?? 0) === 13);
  }

  function getCardVisual(cardDef: CardDef): CardVisual {
    const card = cardDef as PlayingCard;
    return {
      rankLabel: RANK_LABELS[card.rank],
      suitSymbol: SUIT_SYMBOLS[card.suit],
      color: cardColor(card.suit),
    };
  }

  return {
    name: 'Solitaire',
    cols: 7,
    rows: 6,
    cardDefs,
    zones: [stockZone, wasteZone, ...foundationZones, ...tableauZones],
    initialState,
    isWon,
    getCardVisual,
  };
}

export const solitaireConfig = createSolitaireConfig();
