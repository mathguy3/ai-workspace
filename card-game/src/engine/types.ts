export interface CardDef {
  id: string;
  [key: string]: unknown;
}

export interface CardInstance {
  instanceId: string;
  defId: string;
  faceUp: boolean;
}

// stack   = pile, only top card visible
// cascade = fanned column, each card offset down, can pick up sequences
// spread  = fanned row (like a hand displayed horizontally)
// hand    = same as spread but pinned to bottom of screen
export type ZoneLayout = 'stack' | 'cascade' | 'spread' | 'hand';

export interface ZoneConfig {
  id: string;
  label?: string;
  layout: ZoneLayout;
  col: number; // 0-indexed grid column
  row: number; // 0-indexed grid row
  colSpan?: number;
  rowSpan?: number;
  // Return true if `dragged` cards may be dropped onto this zone
  canDrop?: (dragged: CardInstance[], onto: CardInstance[], state: GameState) => boolean;
  // Return true if card at `index` (and cards after it) may be picked up
  canDrag?: (card: CardInstance, index: number, zone: CardInstance[]) => boolean;
  // Called when cards arrive; can transform them (e.g. force face-down)
  onReceive?: (incoming: CardInstance[], existing: CardInstance[]) => CardInstance[];
  // Called when cards leave; can transform remaining (e.g. flip new top face-up)
  onRemove?: (removed: CardInstance[], remaining: CardInstance[]) => CardInstance[];
  // Click handler (e.g. stock pile draw). Returns zone updates or null.
  onClick?: (zone: CardInstance[], state: GameState) => Partial<Record<string, CardInstance[]>> | null;
}

export interface GameState {
  zones: Record<string, CardInstance[]>;
}

export interface CardVisual {
  rankLabel: string;
  suitSymbol: string;
  color: 'red' | 'black';
}

export interface GameConfig {
  name: string;
  cols: number;
  rows: number;
  cardDefs: Record<string, CardDef>;
  zones: ZoneConfig[];
  initialState: () => GameState;
  isWon?: (state: GameState) => boolean;
  getCardVisual: (def: CardDef) => CardVisual;
}
