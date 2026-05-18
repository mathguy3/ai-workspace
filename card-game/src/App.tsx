import { Board } from './components/Board';
import { solitaireConfig } from './games/solitaire';

export default function App() {
  return <Board config={solitaireConfig} />;
}
