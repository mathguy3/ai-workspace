import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBIGT25ofJoSX-49gHvYeyXq8fjRs1MD0A",
  authDomain: "multiplayer-99001.firebaseapp.com",
  projectId: "multiplayer-99001",
  storageBucket: "multiplayer-99001.firebasestorage.app",
  messagingSenderId: "725035559278",
  appId: "1:725035559278:web:4adf4a6646fe34f5d7f97f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
