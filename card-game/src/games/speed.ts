// Card IDs: S1–S13, H1–H13, D1–D13, C1–C13
// Rank 1=Ace, 13=King. Ace connects to both 2 and King.

export interface SpeedState {
  status: 'waiting' | 'playing' | 'finished';
  playerIds: [string, string];
  hands: [string[], string[]];   // up to 5 cards each
  stocks: [string[], string[]];  // draw piles, top = last element
  center: [string[], string[]];  // center piles, top = last element
  speedVotes: [boolean, boolean];
  winner: 0 | 1 | null;
}

function rankOf(cardId: string): number {
  return parseInt(cardId.slice(1));
}

export function isValidPlay(cardId: string, topCardId: string): boolean {
  const diff = Math.abs(rankOf(cardId) - rankOf(topCardId));
  return diff === 1 || diff === 12; // 12 handles A↔K wrap
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createInitialState(p0: string, p1: string): SpeedState {
  const deck = shuffle(
    ['S','H','D','C'].flatMap(s => Array.from({length:13}, (_,i) => `${s}${i+1}`))
  );
  // 20 stock + 5 hand + 20 stock + 5 hand + 1 center + 1 center = 52
  return {
    status: 'playing',
    playerIds: [p0, p1],
    stocks: [deck.slice(0, 20), deck.slice(25, 45)],
    hands:  [deck.slice(20, 25), deck.slice(45, 50)],
    center: [[deck[50]], [deck[51]]],
    speedVotes: [false, false],
    winner: null,
  };
}

export function applyPlayCard(
  state: SpeedState,
  playerIndex: 0 | 1,
  cardId: string,
  centerPile: 0 | 1
): SpeedState | null {
  const topCenter = state.center[centerPile].at(-1);
  if (!topCenter || !isValidPlay(cardId, topCenter)) return null;
  if (!state.hands[playerIndex].includes(cardId)) return null;

  const newHand = state.hands[playerIndex].filter(c => c !== cardId);
  const newStock = [...state.stocks[playerIndex]];

  // Auto-draw to maintain 5 cards
  if (newStock.length > 0 && newHand.length < 5) {
    newHand.push(newStock.pop()!);
  }

  const newHands:  [string[], string[]] = playerIndex === 0 ? [newHand, [...state.hands[1]]]  : [[...state.hands[0]],  newHand];
  const newStocks: [string[], string[]] = playerIndex === 0 ? [newStock, [...state.stocks[1]]] : [[...state.stocks[0]], newStock];
  const newCenter: [string[], string[]] = centerPile === 0
    ? [[...state.center[0], cardId], [...state.center[1]]]
    : [[...state.center[0]], [...state.center[1], cardId]];

  const won = newHand.length === 0 && newStock.length === 0;
  return { ...state, hands: newHands, stocks: newStocks, center: newCenter,
           winner: won ? playerIndex : null, status: won ? 'finished' : 'playing' };
}

export function applySpeedFlip(state: SpeedState): SpeedState {
  const newStocks: [string[], string[]] = [
    state.stocks[0].slice(0, -1),
    state.stocks[1].slice(0, -1),
  ];
  const newCenter: [string[], string[]] = [
    state.stocks[0].length > 0 ? [...state.center[0], state.stocks[0].at(-1)!] : [...state.center[0]],
    state.stocks[1].length > 0 ? [...state.center[1], state.stocks[1].at(-1)!] : [...state.center[1]],
  ];
  return { ...state, stocks: newStocks, center: newCenter, speedVotes: [false, false] };
}

export function getRankLabel(cardId: string): string {
  const labels = ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  return labels[rankOf(cardId)];
}

export function getSuitSymbol(cardId: string): string {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[cardId[0]] ?? '?';
}

export function getCardColor(cardId: string): 'red' | 'black' {
  return cardId[0] === 'H' || cardId[0] === 'D' ? 'red' : 'black';
}
